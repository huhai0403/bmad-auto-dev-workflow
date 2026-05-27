/**
 * calculate-tokens.js
 * Post-process script for bmad-auto-dev-workflow execution logs.
 *
 * Usage: node references/calculate-tokens.js <execution-log-path>
 *
 * Uses tiktoken (cl100k_base) to calculate precise token counts from
 * the actual text content in the execution log, replacing approximate
 * estimated values with more accurate counts.
 *
 * Requires: npm install tiktoken (install in the project that runs this skill)
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const logPath = process.argv[2];
  if (!logPath) {
    console.error('Usage: node references/calculate-tokens.js <execution-log-path>');
    process.exit(1);
  }

  if (!fs.existsSync(logPath)) {
    console.error('Execution log not found:', logPath);
    process.exit(1);
  }

  let tiktoken;
  try {
    tiktoken = require('tiktoken');
  } catch (e) {
    console.warn('tiktoken not installed. Run: npm install tiktoken');
    console.warn('Falling back to character-based estimation (1 token ≈ 4 chars).');
    tiktoken = null;
  }

  const encoder = tiktoken ? tiktoken.get_encoding('cl100k_base') : null;
  const countTokens = (text) => {
    if (!text) return 0;
    if (encoder) {
      return encoder.encode(text).length;
    }
    // Fallback: ~4 chars per token for English, ~2 for Chinese
    const englishChars = (text.match(/[a-zA-Z0-9\s]/g) || []).length;
    const nonEnglishChars = text.length - englishChars;
    return Math.round(englishChars / 4 + nonEnglishChars / 2);
  };

  const content = fs.readFileSync(logPath, 'utf-8');

  // Parse sections from the markdown execution log
  const sections = parseSections(content);

  // Calculate token counts per section
  const stats = {
    totalTokens: 0,
    byStory: {},
    byStep: {
      'Discovery': 0,
      'Create Story': 0,
      'Development': 0,
      'Testing': 0,
      'Code Review': 0,
      'Status Update': 0,
      'Checkpoint': 0,
      'Audit': 0,
    },
    byTask: {},
    headerTokens: 0,
    summaryTokens: 0,
    blockingPointsTokens: 0,
    finalReportTokens: 0,
  };

  // Count tokens for the full content as baseline
  stats.totalTokens = countTokens(content);

  // Count per story
  for (const [storyKey, section] of Object.entries(sections.stories)) {
    stats.byStory[storyKey] = countTokens(section);
  }

  // Count per step (approximation by matching step headers)
  const stepPatterns = {
    'Discovery': /(?:发现|Discovery).*?[-—].*?(?:{timestamp}|{step_start_time})/gi,
    'Create Story': /(?:创建故事|Create Story).*?[-—].*?(?:{timestamp}|{step_start_time})/gi,
    'Development': /(?:开发|Development).*?(?:任务|Task).*?[-—]/gi,
    'Testing': /(?:测试|Testing).*?(?:Unit Tests|单元测试).*?[-—]/gi,
    'Code Review': /(?:代码审查|Code Review).*?(?:Review 1|审查).*?[-—]/gi,
    'Status Update': /(?:状态更新|Status Update).*?[-—].*?(?:{timestamp}|{step_start_time})/gi,
    'Checkpoint': /(?:检查点|Checkpoint).*?[-—].*?(?:{timestamp}|{step_start_time})/gi,
    'Audit': /(?:审计|Audit).*?[-—].*?/gi,
  };

  // Header section (everything before "## 执行摘要")
  const headerMatch = content.match(/^[\s\S]*?(?=## 执行摘要)/);
  if (headerMatch) {
    stats.headerTokens = countTokens(headerMatch[0]);
  }

  // Summary section
  const summaryMatch = content.match(/## 执行摘要[\s\S]*?(?=## 故事执行详情)/);
  if (summaryMatch) {
    stats.summaryTokens = countTokens(summaryMatch[0]);
  }

  // Blocking points section
  const blockingMatch = content.match(/## 阻塞点汇总[\s\S]*?(?=## 最终报告|$)/);
  if (blockingMatch) {
    stats.blockingPointsTokens = countTokens(blockingMatch[0]);
  }

  // Final report section
  const reportMatch = content.match(/## 最终报告[\s\S]*$/);
  if (reportMatch) {
    stats.finalReportTokens = countTokens(reportMatch[0]);
  }

  // Count per task (extract task descriptions and match with token sections)
  const taskRegex = /\| (\d+) \| (.+?) \| [\d:]+ \| [\d:]+ \| [\dm\s]+ \| [✅❌] \|/g;
  let taskMatch;
  while ((taskMatch = taskRegex.exec(content)) !== null) {
    const taskNumber = taskMatch[1];
    const taskName = taskMatch[2].trim();
    const key = `Task ${taskNumber}: ${taskName}`;
    // Estimate per-task tokens based on the surrounding section
    const taskSection = findTaskSection(content, taskName);
    stats.byTask[key] = countTokens(taskSection || '');
  }

  // Generate the updated token statistics section
  const tokenSection = generateTokenSection(stats, logPath);
  const updatedContent = replaceOrAppendTokenSection(content, tokenSection);

  // Write back to the execution log
  fs.writeFileSync(logPath, updatedContent, 'utf-8');

  // Output summary
  console.log('═'.repeat(60));
  console.log('Token Calculation Complete');
  console.log('═'.repeat(60));
  console.log(`Log File: ${logPath}`);
  console.log(`Method: ${encoder ? 'tiktoken (cl100k_base)' : 'character-based estimation'}`);
  console.log(`Total Tokens: ${stats.totalTokens.toLocaleString()}`);
  console.log('');
  console.log('By Story:');
  for (const [story, tokens] of Object.entries(stats.byStory)) {
    console.log(`  ${story}: ${tokens.toLocaleString()}`);
  }
  console.log('');
  console.log('By Step Type:');
  for (const [step, tokens] of Object.entries(stats.byStep)) {
    if (tokens > 0) {
      console.log(`  ${step}: ${tokens.toLocaleString()}`);
    }
  }
  console.log('');
  if (Object.keys(stats.byTask).length > 0) {
    console.log('By Task:');
    for (const [task, tokens] of Object.entries(stats.byTask)) {
      console.log(`  ${task}: ${tokens.toLocaleString()}`);
    }
    console.log('');
  }
  console.log(`${encoder ? '' : '⚠️  Install tiktoken for more accurate counts: npm install tiktoken'}`);
}

/**
 * Parse markdown sections for stories.
 */
function parseSections(content) {
  const result = { stories: {} };
  const storyRegex = /### ([\w-]+)[\s\S]*?(?=### [\w-]+|## 阻塞点汇总|$)/g;
  let match;
  while ((match = storyRegex.exec(content)) !== null) {
    const key = match[1];
    result.stories[key] = match[0];
  }
  return result;
}

/**
 * Find text content around a task description for token counting.
 */
function findTaskSection(content, taskName) {
  const escaped = taskName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\| \\d+ \\| ${escaped.slice(0, 40)}.*?\\|[\\s\\S]{0,500}`, 'i');
  const match = content.match(regex);
  return match ? match[0] : '';
}

/**
 * Generate the token statistics section.
 */
function generateTokenSection(stats, logPath) {
  const lines = [];
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Token 消耗统计 (Post-Processed)');
  lines.push('');
  lines.push(`> 生成时间: ${new Date().toISOString()}`);
  lines.push(`> 源文件: ${path.basename(logPath)}`);
  lines.push('');
  lines.push('### 总计');
  lines.push(`- 精确 Token: **${stats.totalTokens.toLocaleString()}**`);
  lines.push('');
  lines.push('### 按故事统计');
  lines.push('| 故事 | Token 消耗 |');
  lines.push('|------|-----------|');
  for (const [story, tokens] of Object.entries(stats.byStory)) {
    lines.push(`| ${story} | ${tokens.toLocaleString()} |`);
  }
  lines.push('');
  lines.push('### 按步骤类型统计');
  lines.push('| 步骤 | Token 消耗 |');
  lines.push('|------|-----------|');
  for (const [step, tokens] of Object.entries(stats.byStep)) {
    if (tokens > 0) {
      lines.push(`| ${step} | ${tokens.toLocaleString()} |`);
    }
  }
  lines.push('');
  if (Object.keys(stats.byTask).length > 0) {
    lines.push('### 按任务统计');
    lines.push('| 任务 | Token 消耗 |');
    lines.push('|------|-----------|');
    for (const [task, tokens] of Object.entries(stats.byTask)) {
      lines.push(`| ${task} | ${tokens.toLocaleString()} |`);
    }
    lines.push('');
  }
  lines.push('### 效率指标');
  const totalTasks = Object.keys(stats.byTask).length || 1;
  const avgPerStory = Object.keys(stats.byStory).length > 0
    ? Math.round(stats.totalTokens / Object.keys(stats.byStory).length)
    : stats.totalTokens;
  lines.push(`- 平均每故事 Token: ${avgPerStory.toLocaleString()}`);
  lines.push(`- 平均每任务 Token: ${Math.round(stats.totalTokens / totalTasks).toLocaleString()}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Replace the existing token section or append if not found.
 */
function replaceOrAppendTokenSection(content, newSection) {
  const existingRegex = /## Token 消耗统计[\s\S]*$/;
  if (existingRegex.test(content)) {
    return content.replace(existingRegex, newSection.trim());
  }
  // If no existing token section, append
  return content.trimEnd() + '\n' + newSection;
}

main().catch(console.error);
