---
step: 06
name: status-update
description: Update sprint status and execution context after story completion
---

# Step 06: Status Update and Context Finalization

## Goal
Update all status tracking files and execution context after story completion or blocking.

## Pre-requisites
- `{current_story}` has been processed through development, testing, and review
- Story outcome determined (completed, blocked, or skipped)
- Execution context available

## Status Update Flow

### 1. Determine Story Outcome

#### PRE-STATUS EVIDENCE CHECK (MANDATORY — DO NOT MARK DONE WITHOUT THIS)

Before updating any story status to "done", verify evidence exists in the story file using FUZZY matching rules:

```yaml
Action: OPEN the story file for {current_story}
Action: READ the ENTIRE file

Action: IF marking as "completed"/"done":
  Action: RUN FUZZY EVIDENCE CHECK — same rules as step-04 POST-CONDITION GATE:

  EVIDENCE FUZZY CHECK:
  ─────────────────────
  1. TEST OUTPUT:
     Search for: "Test Output Details", "Test Execution Summary", "Test Output",
       "Test Results", "测试结果", "Unit Test", "Tests"
     Content: >=3 heuristics (test cmd, PASS/FAIL, numeric counts, terminal output, >5 lines)
     Result: PASS / FAIL

  2. LINT OUTPUT:
     Search for: "Lint Output Details", "Lint Output", "Lint Results",
       "ESLint", "linting", "Code Quality"
     Content: >=2 heuristics (lint cmd, error/warning counts, exit code, >2 lines)
     Result: PASS / FAIL

  3. DOD CHECKLIST:  
     Search for: "Definition-of-Done", "Definition of Done", "DoD",
       "完成自检", "自检", "Step 04 自检", "Done Checklist"
     Content: ALL [x], >=5 items
     Result: PASS / FAIL (with unchecked count)

  4. CODE REVIEW:
     Search for: "Code Review Summary", "Senior Developer Review", 
       "Code Review", "Formal Code Review", "BMAD"
     Content: review outcome text (Approve/Changes Requested/Blocked), not empty
     Result: PASS / FAIL

  5. E2E OUTPUT (Conditional):
     Search for: "E2E Output", "E2E Test", "e2e", "Playwright", "Cypress", "端到端"
     If story has UI AC and no evidence → FAIL
     If story has no UI AC → PASS (N/A)
     Result: PASS / FAIL / N/A

  FINAL VERDICT:
  If ALL mandatory checks PASS (1, 2, 3, 4 all PASS; 5 PASS or N/A):
    → Proceed to mark as "completed" below
  If ANY mandatory check FAILS:
    → Story is NOT "done". Mark as "blocked" instead.
    → Record blocking point: step: "status-update", reason: "Missing required evidence: {failed_items}"
    → Output: "⛔ Cannot mark done: missing evidence — {failed_items}. Story blocked."
    → Set story_outcome = "blocked"
```

#### Based on previous step:
```yaml
If code review approved:
  Action: Set story_outcome = "completed"
  
If code review requested changes (non-auto-fixable):
  Action: Set story_outcome = "blocked"
  
If code review blocked:
  Action: Set story_outcome = "blocked"
  
If critical error during any step:
  Action: Set story_outcome = "blocked"
  
If user chose to skip:
  Action: Set story_outcome = "skipped"
```

### 2. Update Sprint Status File

#### For Completed Stories:
```yaml
Action: Load {sprint_status_path}
Action: Find development_status key matching {current_story}
Action: Update status to "done"
Action: Update last_updated field to current date
Action: Save file, preserving all structure and comments

Action: Verify update was successful
Action: Confirm story shows as "done" in sprint status
```

#### For Blocked Stories:
```yaml
Action: Load {sprint_status_path}
Action: Find development_status key matching {current_story}
Action: Update status to "blocked" (if not already)
Action: Add comment about blocking reason if possible
Action: Update last_updated field to current date
Action: Save file
```

#### For Skipped Stories:
```yaml
Action: Load {sprint_status_path}
Action: Find development_status key matching {current_story}
Action: Ensure status remains unchanged (or mark as "skipped" if supported)
Action: Save file
```

### 3. Check Epic Status

#### After Story Update:
```yaml
Action: Extract epic number from story key (e.g., "1" from "1-3-editor-update-...")
Action: Find epic key in sprint_status: "epic-{epic_num}"
Action: Check all stories in this epic

Epic Completion Check:
1. Count all stories in the epic
2. Count stories marked as "done"
3. Count stories marked as "blocked"
4. Count stories marked as "in-progress", "review", "ready-for-dev", "backlog"

If ALL stories in epic are "done":
  Action: Update epic status to "done"
  Action: Output: 🎉 Epic {epic_num} completed!
  
If some stories done and others blocked:
  Action: Keep epic status as "in-progress"
  Action: Output: ⚠️ Epic {epic_num} has {blocked_count} blocked stories

If some stories done and others in progress:
  Action: Keep epic status as "in-progress"
```

### 4. Update Execution Context

#### Update Context Fields:
```yaml
Action: Load {execution_context_path}

Update fields:
- stories_processed: Ensure {current_story} is included
- stories_completed: Add {current_story} if outcome is "completed"
- stories_blocked: Add {current_story} if outcome is "blocked"
- stories_skipped: Add {current_story} if outcome is "skipped"
- current_story: Set to null (ready for next story)
- current_step: Set to "status-update-complete"
- last_updated: Set to current timestamp

Action: Save execution context
```

### 5. Update Blocking Points File (if blocked)

#### If Story Blocked:
```yaml
Action: Load {blocking_points_path}

Action: Ensure blocking point for {current_story} is recorded with:
  - story_key: {current_story}
  - step: {step_where_blocked}  # create-story / development / testing / review
  - timestamp: {current_datetime}
  - reason: {clear description}
  - context: {supporting information}
  - retry_count: {number of retries attempted}
  - status: "blocked"
  - resolution: null

Action: Update last_updated in blocking points file
Action: Save blocking points file
```

### 6. Update Story File Status

#### Final Story File Update:
```yaml
Action: Load story file: {implementation_artifacts}/{current_story}*.md

Update Status section:
- If completed: "Status: done"
- If blocked: "Status: blocked" + add blocking reason
- If skipped: "Status: skipped"

Add Execution Summary section:
  Execution Summary:
  - Processed by: bmad-auto-dev-workflow
  - Execution ID: {execution_id}
  - Start Time: {story_start_time}
  - End Time: {current_datetime}
  - Outcome: {completed / blocked / skipped}
  - Retries Attempted: {retry_count}
  - Steps Completed: {list of steps}
  - Tests Passed: {count} / {total}
  - Review Outcome: {approved / changes requested / blocked}

Action: Save story file
```

## Communication

### In semi-automated mode:
```yaml
Output: 📊 Story {current_story} - Status Update Complete

Story Outcome: {outcome}
Status in Sprint: {new_status}

Execution Summary:
- Duration: {duration}
- Steps completed: {steps}
- Tests: {passed}/{total}
- Review: {review_outcome}

{if blocked}:
Blocking Reason: {reason}
Suggested Next Steps: {suggestions}

{if completed}:
🎉 Story completed successfully!

Next:
- Processing next story
- OR
- Generating execution report
```

### In headless mode:
```yaml
Output: ✅ {current_story}: {outcome} → {new_status} (自动继续)
        OR
        ❌ {current_story}: blocked - {reason} (自动继续)
```

## 流程记录 (Execution Log)

### 记录状态更新步骤
```yaml
Action: APPEND to Execution Log (NEVER overwrite existing content)
- Log Path: {execution_log_path}
- Story: {current_story}
- Step: Status Update
- Step Start Time: {step_start_time}
- Step End Time: {step_end_time}
- Step Duration: {step_duration}
- Status: {success / failed}
- Details:
  - Story Outcome: {outcome}
  - New Status: {new_status}
  - Duration: {duration}
- APPEND to execution log — DO NOT rewrite the file
```

## Next Step

### Determine Next Action:
```yaml
Action: Check if there are more eligible stories to process

If more stories available:
  Action: Load {execution_context_path}
  Action: Check execution mode:
    - If execution_mode == "headless":
      - Output: "🔄 [{n}/{total}] Auto-continuing to next story..."
      - DIRECTLY load references/step-01-discovery.md (NO checkpoint, NO ask)
    - If execution_mode == "semi-automated":
      - Check checkpoint_settings.after_story
      - If true: Load references/step-07-checkpoint.md
      - If false: Load references/step-01-discovery.md

If no more stories available:
  - **Headless mode**: DIRECTLY load references/step-08-completion-audit.md
    - Output: "📊 All stories processed. Running completion audit..."
    - NO user prompts. NO questions.
  - **Semi-automated mode**: Ask user, then load references/step-08-completion-audit.md

**IMPORTANT**: Headless mode MUST NOT ask any questions - always proceed automatically!
```

## State Persistence

**Always save after status update**:
- Execution context
- Blocking points file (if blocked)
- Story file
- Sprint status file

**Context fields to verify**:
- `current_story` is null
- `current_step` is "status-update-complete"
- `stories_completed`, `stories_blocked`, `stories_skipped` are updated
- `last_updated` is current
