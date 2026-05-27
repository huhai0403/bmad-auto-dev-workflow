---
step: execution-log
name: execution-log
description: 流程记录文档模板和使用说明
---

# 执行流程记录文档模板

## ⛔ CRITICAL: APPEND-ONLY POLICY (MUST READ)

The execution log file at `{execution_log_path}` is an **APPEND-ONLY** document:

1. **NEVER overwrite** — Under no circumstances should the file be re-created, truncated, or overwritten
2. **ALWAYS append** — New entries go at the END of existing content
3. **NO re-generation** — Do not regenerate the summary section; update it in-place
4. **Resume = Continue** — When resuming, add a resume marker then continue appending after it
5. **Multi-run preservation** — A new file is only created when starting a fresh execution with a new `execution_id`. Within the same `execution_id`, NEVER rewrite

### Correct Behavior (APPEND)
```
File state before step: [existing N lines of prior logs]
After step appends:     [existing N lines] + [new step entry]
```

### WRONG Behavior (MUST AVOID — Overwrite)
```
File state before step: [existing N lines of prior logs]
After step writes:      [new step entry ONLY — everything else GONE]
```

---

## 概述

本文档记录 `bmad-auto-dev-workflow` 的完整执行过程，包括每一步的操作、结果、时间戳、任务耗时和 Token 消耗等信息。

## 文档结构

### 头部信息

```yaml
Execution Log: {execution_id}
============================
Start Time: {start_time}
End Time: {end_time}
Duration: {total_elapsed}
Execution Mode: {headless / semi-automated}
Selected Batch: {batch_name}
Estimated Token Usage: {total_tokens} (approximate — run calculate-tokens.js for exact count)
```

### 执行摘要

```markdown
## 执行摘要

### 总体统计
- 总故事数: {total_stories}
- 已完成: {completed_count}
- 已阻塞: {blocked_count}
- 已跳过: {skipped_count}
- 成功率: {success_rate}%

### 时间统计
- 工作流总耗时: {total_elapsed}
- 故事平均耗时: {avg_story_duration}
- 最长故事耗时: {max_story_duration} ({story_key})
- 最短故事耗时: {min_story_duration} ({story_key})

### Token 消耗估算
- 估算总 Token: ~{estimated_total_tokens}
- 平均每故事 Token: ~{avg_story_tokens}
- 精确 Token: (运行 `node references/calculate-tokens.js <log-path>` 后填充)

### 任务统计
- 总开发任务数: {total_tasks}
- 已完成任务数: {completed_tasks}
- 任务完成率: {task_completion_rate}%

### 状态分布
- done: {count}
- blocked: {count}
- review: {count}
- in-progress: {count}
- ready-for-dev: {count}
- backlog: {count}
```

### 故事执行详情

```markdown
## 故事执行详情

### {story_key}
--------------
开始时间: {story_start_time}
结束时间: {story_end_time}
持续时间: {story_duration}
最终状态: {final_status}
已完成任务数: {completed_tasks}/{total_tasks}
估算 Token: ~{story_estimated_tokens}

#### 执行步骤时间线
| 步骤 | 开始时间 | 结束时间 | 耗时 |
|------|---------|---------|------|
| 1. 发现 (Discovery) | {step_start} | {step_end} | {step_duration} |
| 2. 创建故事 (Create Story) | {step_start} | {step_end} | {step_duration} (如适用) |
| 3. 开发 (Development) | {step_start} | {step_end} | {step_duration} |
| 4. 测试 (Testing) | {step_start} | {step_end} | {step_duration} |
| 5. 代码审查 (Code Review) | {step_start} | {step_end} | {step_duration} |
| 6. 状态更新 (Status Update) | {step_start} | {step_end} | {step_duration} |
| **故事总计** | | | **{total_story_duration}** |

#### 开发任务明细
| # | 任务名称 | 开始时间 | 结束时间 | 耗时 | 状态 |
|---|---------|---------|---------|------|------|
| 1 | {task_1_description} | {t1_start} | {t1_end} | {t1_duration} | ✅/❌ |
| 2 | {task_2_description} | {t2_start} | {t2_end} | {t2_duration} | ✅/❌ |
| ... | ... | ... | ... | ... | ... |

#### 关键事件
- {event_1}
- {event_2}

#### 测试结果
- 单元测试: {passed}/{total} 个通过
- E2E测试: {passed}/{total} 个通过 (如适用)
- Linting: {errors} 个错误, {warnings} 个警告

#### 代码审查结果
- Review 1: {outcome} - {high}H, {med}M, {low}L
- Review 2: {outcome} - {high}H, {med}M, {low}L
- 审查模式: {single_model / multi_model}
- 审查一致: {yes/no}

#### 阻塞点 (如有)
- 原因: {reason}
- 步骤: {step}
- 重试次数: {count}
```

### 阻塞点汇总

```markdown
## 阻塞点汇总

### {story_key}
- 时间: {timestamp}
- 步骤: {step}
- 原因: {reason}
- 状态: {resolved / blocked}
- 解决方案: {resolution}
```

### 最终报告

```markdown
## 最终报告

### 成功完成的故事
{list_of_stories}

### 阻塞的故事
{list_of_stories}

### 跳过的故事
{list_of_stories}

### 建议的后续步骤
1. {suggestion_1}
2. {suggestion_2}
```

## 使用说明

### 记录流程记录的时机

每次执行以下步骤时，都要更新流程记录：

1. **开始执行时：创建/更新头部信息
2. **每个步骤完成时：记录步骤完成时间
3. **每个故事完成时：记录故事详情
4. **遇到阻塞点时：记录阻塞点详情
5. **全部完成时：生成最终报告

### 在各步骤中的集成

**ALL steps MUST use APPEND mode — never overwrite the log file.**

#### Step 01 (Discovery):
- **记录步骤开始/结束时间、耗时**
- 记录故事选择
- 更新 `current_story` 字段

#### Step 02 (Create Story):
- **记录步骤开始/结束时间、耗时**
- 记录故事创建结果
- 记录故事文件路径

#### Step 03 (Development):
- **记录步骤开始/结束时间、耗时**
- **记录每个任务的开始时间、结束时间、耗时、状态**
- 记录开发任务进度和完成数
- 记录修改的文件列表
- 记录测试创建情况
- **记录本步骤 Token 估算**

#### Step 04 (Testing):
- **记录步骤开始/结束时间、耗时**
- 记录测试执行结果
- 记录测试通过率
- 记录失败的测试详情

#### Step 05 (Code Review):
- **记录步骤开始/结束时间、耗时**
- 记录 Review 1 结果
- 记录 Review 2 结果
- 记录审查一致性

#### Step 06 (Status Update):
- **记录步骤开始/结束时间、耗时**
- 记录故事最终状态
- 记录状态更新时间

#### Step 07 (Checkpoint):
- **记录步骤开始/结束时间、耗时**
- 记录检查点决策
- 记录用户选择

#### Step 08 (Completion Audit):
- 记录每个已完成故事的审计结果
- 记录哪些故事缺少证据
- 记录重新排队的操作
- 记录最终审计结论（通过/失败）
- **更新执行摘要中的时间统计和任务统计**
- **如需要，运行 `node references/calculate-tokens.js` 获取精确 Token 统计**

## 示例记录函数

### 初始化执行日志

```yaml
Action: Initialize Execution Log
- Path: {execution_log_path}

CRITICAL — Check if file already exists:
  If file exists:
    - DO NOT overwrite. DO NOT re-create.
    - The file preserves ALL prior execution history
    - Add a resume marker section if resuming:
      ---
      ## Resumed Execution — {current_datetime}
      **Resume Reason**: {from checkpoint / from blocking point}
      **Context**: current_story={story}, current_step={step}
      ---
    - Continue appending below existing content
  If file does NOT exist:
    - Create with header section with execution_id, start_time, mode, batch_name
    - Initialize time tracking: workflow_start_time = {current_timestamp}
    - Initialize token tracking: estimated_total_tokens = 0
```

### 记录步骤完成

```yaml
Action: APPEND Step Completion to Execution Log (NEVER overwrite)
- Story: {story_key}
- Step: {step_name}
- Step Start Time: {step_start_time}
- Step End Time: {step_end_time}
- Step Duration: {step_duration}
- Status: {success / failed}
- Details: {brief_description}
- APPEND to log file — DO NOT rewrite
```

### 记录开发任务完成 (Step 03 only)

```yaml
Action: APPEND Task Completion to Execution Log (NEVER overwrite)
- Story: {story_key}
- Task: {task_description}
- Task Start Time: {task_start_time}
- Task End Time: {task_end_time}
- Task Duration: {task_duration}
- Task Status: {success / failed}
- APPEND to log file task breakdown table
```

### 记录阻塞点

```yaml
Action: APPEND Blocking Point to Execution Log (NEVER overwrite)
- Story: {story_key}
- Step: {step_name}
- Reason: {reason}
- Timestamp: {current_time}
- Retry Count: {count}
- APPEND to log file
```

### 记录故事完成

```yaml
Action: APPEND Story Completion to Execution Log (NEVER overwrite)
- Story: {story_key}
- Final Status: {done / blocked / skipped}
- Story Start Time: {story_start_time}
- Story End Time: {story_end_time}
- Story Duration: {story_duration}
- Completed Tasks: {completed_count}/{total_count}
- Test Results: {summary}
- Review Results: {summary}
- Estimated Tokens: ~{story_token_estimate}
- APPEND to log file
```

### 记录审计结果 (Step 08)

```yaml
Action: APPEND Audit Results to Execution Log (NEVER overwrite)
- Stories audited: {count}
- Passed: {list of story keys}
- Failed: {list with failure reasons}
- Audit timestamp: {timestamp}
- Action taken: {re-queued / final report generated}
- APPEND to log file
```

### 生成最终报告

```yaml
Action: Update Execution Log with Final Report (APPEND mode)
- Update summary statistics:
  - Fill {end_time} and {total_elapsed} in header
  - Fill time statistics: avg/max/min story duration
  - Fill task statistics: total/completed/completion rate
  - Update token estimates
- List completed/blocked/skipped stories
- Add recommendations
- APPEND to log file (update summary and append final report section)

Action: (Optional) Run token post-process script for exact counts:
  - Execute: node references/calculate-tokens.js {execution_log_path}
  - This replaces estimates with tiktoken-calculated exact counts
  - Requires: npm install tiktoken (one-time setup in project)
```
