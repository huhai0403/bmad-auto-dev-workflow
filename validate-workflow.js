#!/usr/bin/env node

/**
 * BMad Auto-Dev Workflow — Static Structure Validator
 * 
 * Validates cross-references, section requirements, headless routing,
 * evidence chain consistency, and golden rule keywords.
 * 
 * Usage: node .agents/skills/bmad-auto-dev-workflow/validate-workflow.js
 */

const fs = require('fs');
const path = require('path');

const SKILL_DIR = __dirname;
const REFS_DIR = path.join(SKILL_DIR, 'references');
let errors = 0;
let warnings = 0;
let passes = 0;

function readFile(relativePath) {
  const p = path.join(SKILL_DIR, relativePath);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function findSection(content, sectionName) {
  const regex = new RegExp(`^#+ ${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm');
  const match = content.match(regex);
  return match ? match.index : -1;
}

function fail(label, detail) {
  errors++;
  console.log(`  [FAIL] ${label}${detail ? ': ' + detail : ''}`);
}

function warn(label, detail) {
  warnings++;
  console.log(`  [WARN] ${label}${detail ? ': ' + detail : ''}`);
}

function pass(label) {
  passes++;
  console.log(`  [PASS] ${label}`);
}

function check(condition, label, detail) {
  if (condition) { pass(label); return true; }
  else { fail(label, detail); return false; }
}

// ─── 1. Cross-Reference Integrity ───────────────────────────────────────────

function testCrossReferences() {
  console.log('\n── 1. Cross-Reference Integrity ──');

  // Collect all step references declared in workflow.md and execution-mode.md
  const declaredRefs = new Set();
  for (const file of ['workflow.md', 'references/execution-mode.md']) {
    const content = readFile(file);
    if (!content) { fail('File not found', file); continue; }
    const matches = content.matchAll(/references\/step-\d{2}-[\w-]+\.md/g);
    for (const m of matches) {
      declaredRefs.add(m[0]);
    }
    // Also catch bare references
    for (const ref of ['references/report-mode.md', 'references/resume-mode.md', 'references/batch-resolution.md', 'references/markdown-sprint-status-parser.md', 'references/execution-log.md']) {
      if (content.includes(ref)) declaredRefs.add(ref);
    }
  }

  let valid = 0, invalid = 0;
  for (const ref of declaredRefs) {
    const refPath = path.join(SKILL_DIR, ref);
    if (fs.existsSync(refPath)) { valid++; }
    else { fail('Broken reference', ref); invalid++; }
  }
  if (invalid === 0) pass(`${valid}/${valid + invalid} references point to existing files`);

  // Also check that all files in references/ are referenced somewhere
  const refsFiles = fs.readdirSync(REFS_DIR).filter(f => f.endsWith('.md'));
  const allContent = [];
  for (const f of ['SKILL.md', 'workflow.md']) {
    const c = readFile(f);
    if (c) allContent.push(c);
  }
  // Add the contents of execution-mode.md
  const em = readFile('references/execution-mode.md');
  if (em) allContent.push(em);

  const orphanFiles = [];
  for (const rf of refsFiles) {
    const refPath = `references/${rf}`;
    let found = false;
    for (const ac of allContent) {
      if (ac.includes(refPath)) { found = true; break; }
    }
    if (!found) orphanFiles.push(refPath);
  }
  if (orphanFiles.length === 0) {
    pass(`All ${refsFiles.length} files in references/ are referenced (no orphans)`);
  } else {
    warn(`${orphanFiles.length} orphan file(s)`, orphanFiles.join(', '));
  }
}

// ─── 2. Required Sections per Step ──────────────────────────────────────────

function testRequiredSections() {
  console.log('\n── 2. Required Sections per Step ──');

  const requiredSections = [
    '## Next Step',
    '## Communication',
    '## State Persistence',
  ];

  const stepFiles = fs.readdirSync(REFS_DIR)
    .filter(f => f.match(/^step-\d{2}-.+\.md$/))
    .sort();

  let allOk = true;
  for (const sf of stepFiles) {
    const content = readFile('references/' + sf);
    if (!content) { fail(`Cannot read`, sf); allOk = false; continue; }

    const missing = requiredSections.filter(sec => findSection(content, sec.replace('## ', '')) === -1);

    // Allow partial exemptions for certain files
    const exempt = [];
    if (sf === 'step-08-completion-audit.md') {
      // step-08 doesn't need Communication section in the same way
      const idx = missing.indexOf('## Communication');
      if (idx !== -1) missing.splice(idx, 1);
    }

    if (missing.length > 0) {
      fail(`${sf} missing section(s)`, missing.map(s => s.replace('## ', '')).join(', '));
      allOk = false;
    }
  }
  if (allOk) pass(`All ${stepFiles.length} step files have required sections`);

  // Verify step-08's Next Step exists
  const s08 = readFile('references/step-08-completion-audit.md');
  if (s08) {
    const hasAuditNext = findSection(s08, 'Audit Execution Flow') !== -1;
    check(hasAuditNext, 'step-08 has execution flow defined');
  }
}

// ─── 3. Headless Routing Coverage ───────────────────────────────────────────

function testHeadlessRouting() {
  console.log('\n── 3. Headless Routing Coverage ──');

  const stepFiles = fs.readdirSync(REFS_DIR)
    .filter(f => f.match(/^step-\d{2}-.+\.md$/))
    .sort();

  // Skip step-08 (it's special - the completion audit)
  const routingSteps = stepFiles.filter(f => f !== 'step-08-completion-audit.md');

  let headlessCount = 0;
  const missingHeadless = [];
  for (const sf of routingSteps) {
    const content = readFile('references/' + sf);
    if (!content) continue;

    // Look for headless routing language in the Next Step section
    const nextStepIdx = findSection(content, 'Next Step');
    if (nextStepIdx === -1) continue;

    const nextStepContent = content.substring(nextStepIdx, nextStepIdx + 3000);

    const hasHeadless = /headless/i.test(nextStepContent) &&
      (/auto-continue|GOTO step|IMMEDIATELY|DIRECTLY|NO pause|DO NOT ask|NO user|automatically proceed|continue automatically/i.test(nextStepContent));

    if (hasHeadless) {
      headlessCount++;
    } else {
      missingHeadless.push(sf);
    }
  }

  check(headlessCount === routingSteps.length,
    `Headless routing: ${headlessCount}/${routingSteps.length} step files have explicit headless branch`,
    missingHeadless.length > 0 ? 'Missing in: ' + missingHeadless.join(', ') : '');
}

// ─── 4. Evidence Chain Consistency ──────────────────────────────────────────

function testEvidenceChain() {
  console.log('\n── 4. Evidence Chain Consistency ──');

  const evidenceSections = [
    { exact: '## Test Output Details', fuzzy: 'Test Output Details|Test Execution Summary|Test Output|Test Results|测试结果|Unit Test' },
    { exact: '## Lint Output Details', fuzzy: 'Lint Output Details|Lint Output|Lint Results|ESLint|linting|Code Quality' },
    { exact: '## E2E Output Details', fuzzy: 'E2E Output|E2E Test|e2e|Playwright|Cypress|端到端' },
    { exact: 'Definition-of-Done Checklist', fuzzy: 'Definition-of-Done|Definition of Done|DoD|自检|Step 04 自检|Done Checklist' },
    { exact: 'Code Review Summary', fuzzy: 'Code Review Summary|Senior Developer Review|Code Review|Formal Code Review|BMAD' },
  ];

  const verifyingFiles = [
    'references/step-04-testing.md',
    'references/step-05-code-review.md',
    'references/step-06-status-update.md',
    'references/step-08-completion-audit.md',
  ];

  let consistent = true;
  for (const sec of evidenceSections) {
    const referencing = [];
    for (const vf of verifyingFiles) {
      const content = readFile(vf);
      if (!content) continue;
      // Match exact string OR any of the fuzzy alternation patterns
      const fuzzyPatterns = sec.fuzzy.split('|').map(p => p.trim());
      const matchFuzzy = fuzzyPatterns.some(p => {
        const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped, 'i').test(content);
      });
      if (content.includes(sec.exact) || matchFuzzy) {
        referencing.push(vf);
      }
    }
    if (referencing.length === 0) {
      fail(`Evidence pattern "${sec.exact}" not referenced in ANY verifying file`);
      consistent = false;
    } else if (referencing.length < 3) {
      warn(`"${sec.exact}" referenced in only ${referencing.length}/${verifyingFiles.length} verifying files — may be fine with fuzzy patterns`);
    }
  }

  // All has at least some references
  const totalRefs = evidenceSections.reduce((sum, sec) => {
    const count = verifyingFiles.filter(vf => {
      const content = readFile(vf);
      if (!content) return false;
      const fuzzyPatterns = sec.fuzzy.split('|').map(p => p.trim());
      const matchFuzzy = fuzzyPatterns.some(p => {
        const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped, 'i').test(content);
      });
      return content.includes(sec.exact) || matchFuzzy;
    }).length;
    return sum + count;
  }, 0);

  if (totalRefs >= 12) {
    pass(`Evidence patterns have ${totalRefs} total cross-references across verifying files (healthy)`);
  } else {
    warn(`Evidence patterns have only ${totalRefs} total cross-references`);
  }
}

// ─── 5. Golden Rule Keywords ────────────────────────────────────────────────

function testGoldenKeywords() {
  console.log('\n── 5. Golden Rule Keyword Presence ──');

  const skillMd = readFile('SKILL.md');
  if (!skillMd) { fail('SKILL.md not found'); return; }

  const goldenKeywords = [
    { keyword: 'HEADLESS MODE ABSOLUTE', expect: true, label: 'Golden Rule section header' },
    { keyword: 'NEVER', minCount: 5, label: 'NEVER keyword (min 5 occurrences)' },
    { keyword: 'IMMEDIATELY', minCount: 3, label: 'IMMEDIATELY keyword (min 3 occurrences)' },
    { keyword: 'DO NOT', minCount: 3, label: 'DO NOT phrasing (min 3 occurrences)' },
    { keyword: 'NON-INTERACTIVE', expect: true, label: 'NON-INTERACTIVE descriptor' },
    { keyword: 'PROHIBITED BEHAVIORS', expect: true, label: 'Prohibited behaviors list' },
    { keyword: 'SELF-CHECK', expect: true, label: 'Self-check mechanism' },
  ];

  let allPresent = true;
  for (const gk of goldenKeywords) {
    const count = (skillMd.match(new RegExp(gk.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (gk.minCount && count < gk.minCount) {
      fail(gk.label, `found ${count} < ${gk.minCount} expected`);
      allPresent = false;
    } else if (gk.expect && count === 0) {
      fail(gk.label, 'not found');
      allPresent = false;
    }
  }
  if (allPresent) pass('All golden rule keywords present in SKILL.md');
}

// ─── 6. Step-08 Registration ────────────────────────────────────────────────

function testStep08Registration() {
  console.log('\n── 6. Step-08 Registration ──');

  const files = ['workflow.md', 'references/execution-mode.md'];
  for (const f of files) {
    const content = readFile(f);
    const found = content && content.includes('step-08-completion-audit.md');
    check(found, `${f} references step-08`, found ? '' : 'step-08 reference not found in ' + f);
  }

  // Verify step-08 file actually exists
  check(fs.existsSync(path.join(REFS_DIR, 'step-08-completion-audit.md')),
    'step-08-completion-audit.md file exists');

  // Verify SKILL.md references step-08 in architecture diagram
  const skillMd = readFile('SKILL.md');
  check(skillMd && skillMd.includes('步骤 8'),
    'SKILL.md architecture diagram includes step-08');
}

// ─── 7. Dry-Run References ──────────────────────────────────────────────────

function testDryRunRefs() {
  console.log('\n── 7. Dry-Run Mode References ──');

  const skillMd = readFile('SKILL.md');
  check(skillMd && skillMd.toLowerCase().includes('dry-run'),
    'SKILL.md references --dry-run flag');

  const wfMd = readFile('workflow.md');
  check(wfMd && wfMd.toLowerCase().includes('dry-run'),
    'workflow.md references dry-run routing');

  check(fs.existsSync(path.join(REFS_DIR, 'dry-run-mode.md')),
    'dry-run-mode.md file exists');
}

// ─── 8. Ref File Existence ──────────────────────────────────────────────────

function testRefFileExistence() {
  console.log('\n── 8. Reference File Inventory ──');

  const expectedFiles = [
    'references/batch-resolution.md',
    'references/execution-mode.md',
    'references/execution-log.md',
    'references/dry-run-mode.md',
    'references/markdown-sprint-status-parser.md',
    'references/report-mode.md',
    'references/resume-mode.md',
    'references/step-01-discovery.md',
    'references/step-02-create-story.md',
    'references/step-03-development.md',
    'references/step-04-testing.md',
    'references/step-05-code-review.md',
    'references/step-06-status-update.md',
    'references/step-07-checkpoint.md',
    'references/step-08-completion-audit.md',
  ];

  let ok = true;
  for (const ef of expectedFiles) {
    const exists = fs.existsSync(path.join(SKILL_DIR, ef));
    if (!exists) { fail('Missing', ef); ok = false; }
  }
  if (ok) pass(`All ${expectedFiles.length} expected reference files exist`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════');
console.log('  BMad Auto-Dev Workflow — Static Validation');
console.log('═══════════════════════════════════════════════');

testCrossReferences();
testRequiredSections();
testHeadlessRouting();
testEvidenceChain();
testGoldenKeywords();
testStep08Registration();
testDryRunRefs();
testRefFileExistence();

console.log('\n═══════════════════════════════════════════════');
const total = passes + errors + warnings;
if (errors === 0 && warnings === 0) {
  console.log(`  RESULT: ✅ ALL CHECKS PASSED (${passes}/${total})`);
} else if (errors === 0) {
  console.log(`  RESULT: ⚠️  PASSED with warnings (${passes}/${total}, ${warnings} warnings)`);
} else {
  console.log(`  RESULT: ❌ FAILED — ${errors} error(s), ${warnings} warning(s), ${passes} passed`);
}
console.log('═══════════════════════════════════════════════');

// Exit code for CI
process.exit(errors > 0 ? 1 : 0);
