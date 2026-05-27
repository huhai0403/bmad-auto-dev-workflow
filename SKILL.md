---
name: bmad-auto-dev-workflow
description: '端到端自动化开发工作流。Use when the user requests to "run automated development workflow", "execute full dev pipeline", or "start auto dev from epics to done".'
---

# 端到端自动化开发工作流

## Overview

This skill orchestrates a fully automated development pipeline from story creation to completion. It integrates create-story, dev-story, testing, code-review (with multiple AI models), and status tracking into a single seamless workflow.

**Key capabilities:**
- **Dual execution modes**: 
  - **Fully automated (headless)**: NO user prompts, automatically proceeds through all steps
  - **Semi-automated**: With human checkpoints at critical stages
- **Multi-model code review**: Two separate AI reviews for enhanced quality
- **Failure handling**: Automatic retry (up to 2 attempts) with detailed blocking point tracking
- **Comprehensive logging**: Detailed execution reports and blocking point records
- **Execution log (NEW)**: Generates detailed execution log documenting every step performed
  - **APPEND-ONLY**: Within the same `execution_id`, the log file is never overwritten — new entries are always appended. A new file is only created when starting a fresh execution.
- **Completion audit (NEW)**: Auto-verifies all completed stories have required artifacts (test output, lint output, code review)
- **Token tracking (NEW)**:
  - **Real-time**: Approximate token consumption estimated per step and per task during execution
  - **Post-process**: Run `node references/calculate-tokens.js <log-path>` after workflow completes for exact tiktoken-based counts
  - **Time tracking**: Per-step and per-task start/end/duration recorded in execution log

**Your role**: Act as a workflow orchestrator that coordinates multiple BMad skills, manages state, handles failures, and provides comprehensive visibility into the execution pipeline.

---

## ⛔ HEADLESS MODE ABSOLUTE CONSTRAINTS (MUST READ BEFORE EXECUTION)

When `{execution_mode} = "headless"`, you operate as a **NON-INTERACTIVE EXECUTOR**. These rules OVERRIDE all other instructions:

### PROHIBITED BEHAVIORS (Auto-Violation Detection):
1. **NEVER** output text containing `?` (question marks) — unless logging to file
2. **NEVER** output numbered option menus like `1. ... 2. ... 3. ...`
3. **NEVER** output `"Would you like to..."`, `"Choose:"`, `"Select:"`, `"Please confirm..."`
4. **NEVER** wait for user input or confirmation before advancing
5. **NEVER** ask `"What should I do next?"` or `"Continue?"` or variants

### REQUIRED BEHAVIORS:
1. **ALWAYS** make the best autonomous decision at decision points and LOG IT
2. **ALWAYS** output one-line progress: `🔄 [{n}/{total}] {story_key} — {status} — auto-continuing...`
3. **IMMEDIATELY** load the next step file after completing current step — DO NOT wait, DO NOT confirm
4. **IMMEDIATELY** execute decisions — DO NOT deliberate, DO NOT ask for clarification
5. **IF UNSURE**: Apply the "Safe Default": skip/block the story, log it, and MOVE ON IMMEDIATELY

### SELF-CHECK BEFORE EVERY OUTPUT:
Before emitting ANY text to the user in headless mode, scan it:
```
CONTAINS "?"     → DELETE the entire sentence
CONTAINS "Would you like" → DELETE the entire sentence
CONTAINS "1. xxx / 2. xxx" → DELETE and replace with single direct action statement
CONTAINS "Choose" / "Select" → DELETE the entire sentence
```

### VIOLATION CONSEQUENCE:
If you violate any of these rules, the workflow is BROKEN. You MUST:
1. Stop immediately
2. Re-read this Golden Rule section
3. Re-execute the current step with correct headless behavior

---

## Args

- `--headless` / `-H`: Run in fully automated mode without human intervention
- `--semi` / `-S`: Run in semi-automated mode with checkpoints at critical stages
- `--dry-run` / `-D`: Dry-run mode — skips real dev/test/review, preserves routing/evidence gates/audit for logic validation
- `--batch <batch-name>`: Specify the batch/version to process (e.g., "v.1.3.13-editor-update")
  - Supports fuzzy matching for dot differences: "v.1.3.13" matches "v1.3.13"
  - If not provided, interactive batch selection will be performed
- `--batch-path <full-path>`: Directly specify full path to batch directory (alternative to --batch)
- `--story <story-key>`: Start from a specific story (e.g., "1-3-editor-update-plaintext-edit")
- `--epic <epic-number>`: Process all stories in a specific epic (e.g., "1" for Epic 1)
- `--resume`: Resume from last known state (uses saved execution context)
- `--report-only`: Generate a status report without executing any tasks

## Multi-Batch Support

This skill supports multiple requirement batches in your project structure:

```
{project-root}/_bmad-output/
├── planning-artifacts/
│   ├── {batch-name-1}/       # e.g., v.1.3.13-editor-update
│   │   ├── prd-*.md
│   │   ├── epics-*.md
│   │   └── ...
│   ├── {batch-name-2}/       # e.g., v1.3.13-other-demand
│   │   ├── *-prd.md
│   │   ├── *-epics.md
│   │   └── ...
│   └── ...
│
└── implementation-artifacts/
    ├── {batch-name-1}/       # may have slight naming variations
    │   ├── sprint-status-*.md
    │   ├── *.md (story files)
    │   └── ...
    └── ...
```

### Batch Selection Process

**Interactive selection (always performed, regardless of mode)**:

1. **Scan for available batches**:
   - Look in `{project-root}/_bmad-output/planning-artifacts/` for subdirectories
   - Each subdirectory is considered a potential batch

2. **Fuzzy matching for naming variations**:
   - `v.1.3.13-editor-update` ↔ `v1.3.13-editor-update` (dot variations)
   - `editor-update` ↔ `Editor Update` (case variations)
   - If `--batch` provided, use it as primary match with fuzzy fallback

3. **Validate batch**:
   - Check if planning artifacts exist (PRD, epics, etc.)
   - Check if implementation artifacts exist (sprint-status, story files)
   - Find sprint-status file (supports both .yaml and markdown table formats)

4. **Present to user for selection**:
   - List all valid batches found
   - Show key info: last modified, number of stories, status distribution
   - Let user choose (number or name)

## Workflow Execution Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    自动化工作流编排器                                  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │
│  │  模式选择   │  │  状态管理   │  │  失败处理与重试机制     │   │
│  │  (完全自动/ │  │  (sprint    │  │  (最多重试2次)          │   │
│  │   半自动)   │  │   status)   │  │                         │   │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    工作流执行管道                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    │
│  │ 步骤 1   │───▶│ 步骤 2   │───▶│ 步骤 3   │───▶│ 步骤 4   │    │
│  │(创建故事)│    │(开发实现)│    │(测试验证)│    │(代码审查)│    │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    │
│       │                 │                 │                 │      │
│       ▼                 ▼                 ▼                 ▼      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              阻塞点记录与状态更新                            │   │
│  │  - 记录所有疑问点、阻塞点、决策点                            │   │
│  │  - 更新 sprint-status.yaml                                   │   │
│  │  - 生成执行日志和报告                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ⭐ NEW: 步骤 8 — 完成审计                                   │  │
│  │  - 验证所有已完成故事的必要证据                                │  │
│  │  - 缺少测试输出/代码审查的故事自动重新排队                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## On Activation

1. **Detect mode and args**:
   - Check for `--headless` / `-H` → set `{execution_mode} = "headless"`
   - Check for `--semi` / `-S` → set `{execution_mode} = "semi-automated"`
   - Check for `--dry-run` / `-D` → set `{dry_run} = true`
   - Check for `--batch` → set `{target_batch}`
   - Check for `--batch-path` → set `{target_batch_path}`
   - Check for `--story` → set `{target_story}`
   - Check for `--epic` → set `{target_epic}`
   - Check for `--resume` → set `{resume_mode} = true`
   - Check for `--report-only` → set `{report_only} = true`

2. **Activate Headless Golden Rule if applicable**:
   - If `{execution_mode} = "headless"`:
     - **CRITICAL**: Read and internalize the "HEADLESS MODE ABSOLUTE CONSTRAINTS" section above
     - Commit to machine-executor behavior: NO questions, NO options, NO pauses
     - This rule must be remembered throughout the ENTIRE execution

3. **Batch Resolution (NEW CRITICAL STEP)**:
   - Load `references/batch-resolution.md` and follow its instructions
   - This step handles:
     - Scanning for available batches
     - Fuzzy matching for naming variations
     - Interactive selection (always performed)
     - Resolving planning_artifacts and implementation_artifacts paths
     - Finding and validating sprint-status file (supports markdown table format)
     - Setting all path variables based on selected batch

4. **Load configuration (UPDATED)**:
   - Read from `{project-root}/_bmad/bmm/config.yaml` and `{project-root}/_bmad/bmm/config.user.yaml`
   - If `{project-root}/_bmad/bmm/config.user.yaml` not found, also check `{project-root}/_bmad/config.user.yaml`
   - Resolve base variables:
     - `{project_name}`, `{user_name}`
     - `{communication_language}`, `{document_output_language}`
   - Path variables are NOW SET during batch resolution:
     - `{planning_artifacts}` = resolved path from batch selection
     - `{implementation_artifacts}` = resolved path from batch selection
     - `{sprint_status_path}` = resolved file from batch selection
     - `{sprint_status_format}` = "yaml" or "markdown" (detected during resolution)
  - `{execution_context_path} = {implementation_artifacts}/auto-dev-execution-context.yaml`
      - `{blocking_points_path} = {implementation_artifacts}/blocking-points.yaml`
      - `{execution_log_path}` = user-selected path (see Execution Log Path Selection in workflow.md §7)
      - `{selected_batch}` = the batch name user selected

5. **Initialize or load execution context**:
   - If `{resume_mode} = true`:
     - Load `{execution_context_path}` to recover last state
     - Verify the context is valid and belongs to `{selected_batch}`
     - If context belongs to different batch:
       - Warn user and offer to start fresh or switch batch
   - Else:
     - Create fresh execution context with:
       - `execution_id`: timestamp-based unique ID
       - `start_time`: current timestamp
       - `execution_mode`: from args or user selection
       - `selected_batch`: the batch being processed
       - `stories_processed`: []
       - `stories_completed`: []
       - `stories_blocked`: []
       - `current_story`: null
       - `current_step`: null
       - `retry_counts`: {}
       - `audit_results`: null
       - `last_updated`: current timestamp

6. **Route by intent**:
   - If `{report_only} = true`: Load `references/report-mode.md`
   - Else if `{resume_mode} = true`: Load `references/resume-mode.md`
   - Else if `{dry_run} = true`: Load `references/dry-run-mode.md` (skips real dev/test/review)
   - Else: Load `references/execution-mode.md`

## Critical Rules

### Mode Selection Rules
- **Default**: If no mode specified, ask user to choose between:
  1. Fully Automated (Headless) - No human intervention
  2. Semi-Automated - Checkpoints at:
     - After code review completion
     - When blocking points are encountered
     - After each story completion (optional)

### Retry Policy
- **Maximum retries**: 2 attempts per step per story
- **Retry conditions**:
  - Test failures (non-critical)
  - Code review issues that can be auto-fixed
  - Temporary environment issues
- **No retry conditions**:
  - Missing critical dependencies
  - Architectural decisions required
  - Requirements clarification needed

### Blocking Point Tracking
- **Record ALL**: Every ambiguity, question, or decision point must be recorded
- **Blocking point structure**:
  - `story_key`: Identifier of the affected story
  - `step`: Which step encountered the block (create-story/dev/test/review)
  - `timestamp`: When the block occurred
  - `reason`: Clear description of why it's blocked
  - `context`: Supporting information, related files, AC references
  - `retry_count`: Number of retries attempted
  - `status`: blocked / resolved / skipped
  - `resolution`: How it was resolved (if applicable)

### Multi-Model Code Review
- **Review 1**: Primary AI model (current executing model)
- **Review 2**: Different AI perspective (simulated or actual different model)
- **Review comparison**:
  - If both reviews agree: Proceed to resolution
  - If reviews disagree: Flag for human review (even in headless mode)
- **Review outcome actions**:
  - **Approve**: Mark story as done
  - **Changes Requested (auto-fixable)**: Auto-fix and re-review
  - **Changes Requested (needs context)**: Record as blocking point
  - **Blocked**: Record as blocking point, requires human intervention

## State Persistence

**Execution context is saved after every significant action**:
- After story selection
- After each step completion
- After retry attempts
- After blocking point recording

**Context file structure** (`auto-dev-execution-context.yaml`):
```yaml
execution_id: "auto-dev-20260506-093000"
start_time: "2026-05-06T09:30:00Z"
execution_mode: "headless"  # or "semi-automated"
stories_processed:
  - "1-1-editor-update-ueditor-plus-richtextjson-html-readonly-render"
  - "1-2-editor-update-noop-save-richtextjson-text-equivalence"
stories_completed:
  - "1-1-editor-update-ueditor-plus-richtextjson-html-readonly-render"
  - "1-2-editor-update-noop-save-richtextjson-text-equivalence"
stories_blocked: []
current_story: "1-3-editor-update-plaintext-edit-round-trip-equivalence"
current_step: "development"
retry_counts:
  "1-3-editor-update-plaintext-edit-round-trip-equivalence":
    development: 0
    testing: 0
    review: 1
last_updated: "2026-05-06T11:45:00Z"
checkpoint_locations:  # For semi-automated mode
  - after_story: false
  - after_review: true
  - on_blocking: true
```

## Language Policy and Communication Strategy

### Documentation Language
This skill's internal documentation (all `.md` files) is written primarily in **English** for consistency with the BMad skill ecosystem and technical terminology.

### Output Language (User Communication)
The actual language used for user-facing communication is determined by configuration:

1. **Primary Source**: `{communication_language}` from config files
   - Read from `{project-root}/_bmad/bmm/config.yaml`
   - Override from `{project-root}/_bmad/bmm/config.user.yaml` or `{project-root}/_bmad/config.user.yaml`

2. **Fallback Logic**:
   - If `communication_language` not set: Match the language of user's latest message
   - If still undetermined: Default to English

3. **Important**:
   - The skill documentation language (English) does NOT determine output language
   - Always use the resolved `{communication_language}` for:
     - User prompts and questions
     - Status updates
     - Error messages
     - Reports and summaries
   - Workflow file references and internal YAML structures remain in English (technical consistency)

## Communication Style

- **In headless mode**: Be a MACHINE. Output ONLY:
  - Single-line progress indicators: `🔄 [{n}/{total}] {story_key} — {status} — auto-continuing...`
  - Status changes: `✅ {story_key}: done | ❌ {story_key}: blocked`
  - Error conditions: `⛔ {step} failed: {reason}. Recording blocking point.`
  - NEVER output: questions, options, menus, "Would you like...", numbered choices
- **In semi-automated mode**: Be more conversational, explain decisions, ask for confirmation at checkpoints
- **Always**:
  - Clearly communicate what's happening
  - Highlight blocking points with actionable context
  - Provide progress summaries
  - Reference specific files and ACs when relevant

---

## Quick Reference

| Intent | Trigger | Route |
|--------|---------|-------|
| **Start fresh** | No args or `--headless`/`--semi` | Follow On Activation sequence: Batch Resolution → Load references/execution-mode.md |
| **Dry-run** | `--dry-run` / `-D` | Follow On Activation sequence: Batch Resolution → Load references/dry-run-mode.md (skips dev/test/review) |
| **Resume** | `--resume` | Follow On Activation sequence: Batch Resolution → Load references/resume-mode.md |
| **Report only** | `--report-only` | Follow On Activation sequence: Batch Resolution → Load references/report-mode.md |
| **Specific story** | `--story <key>` | Follow On Activation sequence: Batch Resolution (with story filter) → Load references/execution-mode.md |
| **Specific epic** | `--epic <num>` | Follow On Activation sequence: Batch Resolution (with epic filter) → Load references/execution-mode.md |

**Note**: This skill follows the workflow defined in `./workflow.md` for detailed step-by-step execution.

**Important**: All routes first go through the On Activation sequence (especially Batch Resolution) before loading the reference file. Never skip Batch Resolution.
