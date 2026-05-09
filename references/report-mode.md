---
mode: report
description: Generate execution report without running tasks
---

# Report Mode

## Goal
Generate comprehensive execution reports showing current status, progress, blocking points, and recommendations.

## Pre-requisites (MUST BE COMPLETED BEFORE LOADING THIS FILE)
**IMPORTANT**: This file assumes Batch Resolution has ALREADY been completed.
The following variables MUST be set before loading this file:
- `{selected_batch}` - Name of the selected batch
- `{planning_artifacts}` - Full path to planning artifacts directory
- `{implementation_artifacts}` - Full path to implementation artifacts directory
- `{sprint_status_path}` - Full path to sprint-status file
- `{sprint_status_format}` - "yaml" or "markdown"
- `{execution_context_path}` - Path for execution context
- `{blocking_points_path}` - Path for blocking points

If these variables are not set, first run Batch Resolution by loading `references/batch-resolution.md`.

## Activation
- When user passes `--report-only` argument
- When no more stories available for processing
- When user explicitly requests report at checkpoint

## Report Generation Flow

### 1. Load All Context Files

```yaml
Action: Load {execution_context_path}
Action: Load {sprint_status_path}
Action: Load {blocking_points_path}
Action: Load any story files for completed/blocked stories
```

### 2. Calculate Execution Metrics

#### From Execution Context:
```yaml
Calculate:
- execution_id: {value}
- start_time: {value}
- end_time: {current_datetime if completed}
- duration: {end_time - start_time}
- execution_mode: {headless / semi-automated}
- stories_processed: {count}
- stories_completed: {count}
- stories_blocked: {count}
- stories_skipped: {count}
- current_story: {value or null}
- current_step: {value or null}
- last_updated: {value}
```

#### From Sprint Status:
```yaml
Calculate for each epic:
- Total stories
- Stories done
- Stories in progress
- Stories in review
- Stories ready-for-dev
- Stories backlog
- Stories blocked
- Epic completion percentage

Calculate overall:
- Total stories in sprint
- Total completed
- Total in progress
- Total blocked
- Overall progress percentage
```

#### From Blocking Points:
```yaml
Calculate:
- Total blocking points recorded
- Blocking points by step:
  - create-story: {count}
  - development: {count}
  - testing: {count}
  - review: {count}
- Blocking points by severity (if available):
  - High: {count}
  - Medium: {count}
  - Low: {count}
- Blocking points with human_review_required: {count}
- Resolved blocking points: {count}
```

### 3. Generate Report Structure

#### Report Header:
```yaml
# 自动化工作流执行报告

## 执行概览
- **执行 ID**: {execution_id}
- **批次**: {selected_batch}
- **开始时间**: {start_time}
- **结束时间**: {end_time or "In Progress"}
- **执行时长**: {duration}
- **执行模式**: {execution_mode}
- **项目**: {project_name}

## 批次信息
- **批次名称**: {selected_batch}
- **规划产物路径**: {planning_artifacts}
- **实现产物路径**: {implementation_artifacts}
- **Sprint 状态文件**: {sprint_status_path}
- **状态格式**: {sprint_status_format} (yaml 或 markdown)

## 进度统计
| 指标 | 数量 |
|------|------|
| 已处理故事 | {stories_processed} |
| 已完成故事 | {stories_completed} |
| 阻塞中故事 | {stories_blocked} |
| 已跳过故事 | {stories_skipped} |
| 整体进度 | {percentage}% |
```

#### Epic Progress Section:
```yaml
## Epic 进度

### Epic 1: {epic_1_name}
- **状态**: {epic_1_status}
- **进度**: {completed}/{total} ({percentage}%)
- **故事详情**:
  - ✅ {story_key}: done
  - 🔄 {story_key}: in-progress
  - ⏳ {story_key}: review
  - 📋 {story_key}: ready-for-dev
  - 🚫 {story_key}: blocked

### Epic 2: {epic_2_name}
... (repeat for all epics)
```

#### Blocking Points Section:
```yaml
## 阻塞点详情

### 阻塞点统计
- **总阻塞点数**: {total}
- **开发阶段**: {development_count}
- **测试阶段**: {testing_count}
- **审查阶段**: {review_count}
- **需要人工审查**: {human_review_count}

### 阻塞点列表

#### {story_key} - {step}
- **时间**: {timestamp}
- **原因**: {reason}
- **重试次数**: {retry_count}
- **状态**: {blocked / resolved / skipped}
- **上下文**:
  - 相关文件: {files}
  - 错误信息: {errors}
  - 相关 AC: {acceptance_criteria}
- **建议操作**: {suggested_actions}

... (repeat for all blocking points)
```

#### Completed Stories Section (Updated):
```yaml
## 已完成故事详情

### {story_key}
- **开始时间**: {start_time}
- **完成时间**: {end_time}
- **执行时长**: {duration}
- **执行步骤**: {steps_completed}
- **测试结果**: {passed}/{total} 通过
- **代码审查**: {review_outcome}
- **审查模式**: {review_mode} (单模型/多模型/仅一次)
- **修改文件**: {file_count} 个文件
- **重试次数**: {retry_count}
- **关键实现**:
  - {implementation_note_1}
  - {implementation_note_2}

... (repeat for all completed stories)
```

#### Recommendations Section:
```yaml
## 建议的下一步操作

### 高优先级
1. **解决阻塞点**:
   - {blocking_point_1}: {suggestion}
   - {blocking_point_2}: {suggestion}

2. **人工审查**:
   - {stories_needing_human_review}

### 中优先级
1. **继续执行**:
   - 下一个待处理故事: {next_story_candidate}
   - 运行 `bmad-auto-dev-workflow --resume` 继续

2. **补充测试**:
   - {stories_with_insufficient_tests}

### 低优先级
1. **代码优化**:
   - {refactoring_suggestions}

2. **文档完善**:
   - {documentation_gaps}
```

#### Technical Details Section:
```yaml
## 技术详情

### 执行配置
- **执行模式**: {execution_mode}
- **检查点设置**:
  - after_story: {true/false}
  - after_review: {true/false}
  - on_blocking: {true/false}
- **最大重试次数**: 2 次/步骤

### 文件位置
- **执行上下文**: {execution_context_path}
- **阻塞点记录**: {blocking_points_path}
- **Sprint 状态**: {sprint_status_path}
- **故事文件**: {implementation_artifacts}/
```

### 4. Save and Present Report

#### Save Report:
```yaml
Action: Generate report in markdown format
Action: Save report to: {implementation_artifacts}/auto-dev-execution-report-{timestamp}.md
Action: Also save as latest: {implementation_artifacts}/auto-dev-execution-report-latest.md
```

#### Present to User:
```yaml
In semi-automated mode:
  Output: 📊 Execution Report Generated!
          
          Report saved to:
          - {report_path}
          - {latest_report_path}
          
          Key Highlights:
          - ✅ {stories_completed} stories completed
          - 🚫 {stories_blocked} stories blocked
          - 📈 {percentage}% overall progress
          
          See full report for:
          - Detailed blocking points
          - Story execution details
          - Recommendations for next steps
          
          Would you like to:
          1. View full report
          2. Resolve specific blocking point
          3. Resume execution
          4. Exit

In headless mode:
  Output: 📊 Report generated: {report_path}
          
          Summary:
          - Completed: {stories_completed}
          - Blocked: {stories_blocked}
          - Progress: {percentage}%
          
          Next: Review blocking points at {blocking_points_path}
```

## Report Mode Without Execution

### When `--report-only` is passed:
```yaml
Action: Skip all execution steps
Action: Load all context files
Action: Generate report based on current state
Action: Present report to user
Action: Do not modify any status or context
Action: Exit after report generation
```

## Next Steps from Report Mode

### In Semi-Automated Mode:
```yaml
After presenting report, ask user:
  What would you like to do?
  1. Review specific blocking point
  2. Resume execution (--resume)
  3. Start fresh execution
  4. Exit
```

### In Headless Mode:
```yaml
After report generation:
  - Save report
  - Output summary
  - Exit gracefully
```

## State Persistence

**In report mode**:
- Do NOT modify execution context
- Do NOT modify sprint status
- Do NOT modify blocking points file
- Only READ these files for report generation
- Save report as new file (does not overwrite existing data)
