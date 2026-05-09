---
step: execution-log
name: execution-log
description: 流程记录文档模板和使用说明
---

# 执行流程记录文档模板

## 概述

本文档记录 `bmad-auto-dev-workflow` 的完整执行过程，包括每一步的操作、结果、时间戳等信息。

## 文档结构

### 头部信息

```yaml
Execution Log: {execution_id}
============================
Start Time: {start_time}
End Time: {end_time}
Duration: {duration}
Execution Mode: {headless / semi-automated}
Selected Batch: {batch_name}
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
开始时间: {start_time}
结束时间: {end_time}
持续时间: {duration}
最终状态: {final_status}

#### 执行步骤
1. ✅ 发现 (Discovery) - {timestamp}
2. ✅ 创建故事 (Create Story) - {timestamp} (如适用)
3. ✅ 开发 (Development) - {timestamp}
4. ✅ 测试 (Testing) - {timestamp}
5. ✅ 代码审查 (Code Review) - {timestamp}
6. ✅ 状态更新 (Status Update) - {timestamp}

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

#### Step 01 (Discovery):
- 记录故事选择
- 更新 `current_story` 字段

#### Step 02 (Create Story):
- 记录故事创建结果
- 记录故事文件路径

#### Step 03 (Development):
- 记录开发任务进度
- 记录修改的文件列表
- 记录测试创建情况

#### Step 04 (Testing):
- 记录测试执行结果
- 记录测试通过率
- 记录失败的测试详情

#### Step 05 (Code Review):
- 记录 Review 1 结果
- 记录 Review 2 结果
- 记录审查一致性

#### Step 06 (Status Update):
- 记录故事最终状态
- 记录状态更新时间

#### Step 07 (Checkpoint):
- 记录检查点决策
- 记录用户选择

#### Step 08 (Completion Audit):
- 记录每个已完成故事的审计结果
- 记录哪些故事缺少证据
- 记录重新排队的操作
- 记录最终审计结论（通过/失败）

## 示例记录函数

### 初始化执行日志

```yaml
Action: Initialize Execution Log
- Path: {implementation_artifacts}/execution-log-{execution_id}.md
- Create with header section with execution_id, start_time, mode, batch_name
```

### 记录步骤完成

```yaml
Action: Log Step Completion
- Story: {story_key}
- Step: {step_name}
- Timestamp: {current_time}
- Status: {success / failed}
- Details: {brief_description}
```

### 记录阻塞点

```yaml
Action: Log Blocking Point
- Story: {story_key}
- Step: {step_name}
- Reason: {reason}
- Timestamp: {current_time}
- Retry Count: {count}
```

### 记录故事完成

```yaml
Action: Log Story Completion
- Story: {story_key}
- Final Status: {done / blocked / skipped}
- Start Time: {start_time}
- End Time: {end_time}
- Duration: {duration}
- Test Results: {summary}
- Review Results: {summary}
```

### 记录审计结果 (Step 08)

```yaml
Action: Log Audit Results
- Stories audited: {count}
- Passed: {list of story keys}
- Failed: {list with failure reasons}
- Audit timestamp: {timestamp}
- Action taken: {re-queued / final report generated}
```

### 生成最终报告

```yaml
Action: Generate Final Report
- Update summary statistics
- List completed/blocked/skipped stories
- Add recommendations
- Save to execution log
```
