---
step: 07
name: checkpoint
description: Checkpoint for semi-automated mode and loop control
---

# Step 07: Checkpoint and Loop Control

## Goal
Provide checkpoints for semi-automated mode and control the execution loop between stories.

## Pre-requisites
- `{current_story}` has been processed (completed or blocked)
- Status update completed (step 06)
- Execution context available with checkpoint settings

## Checkpoint Logic

### 1. Determine if Checkpoint Needed

#### Based on Execution Mode:
```yaml
If execution_mode == "headless":
  Action: NO checkpoints. NO menus. NO user interaction. Period.
  Action: Output ONE LINE summary: "🎯 {current_story}: {outcome} — auto-continuing..."
  Action: DIRECTLY and IMMEDIATELY proceed to next action (NEVER ask):
    - IF more stories available → GOTO step-01-discovery.md immediately
    - IF no more stories → GOTO step-08-completion-audit.md immediately
  Action: DELETE any text that looks like an option menu or question

If execution_mode == "semi-automated":
  Action: Check checkpoint_settings from execution context:
    - checkpoint_settings.after_story: Check after each story
    - checkpoint_settings.after_review: Check after code review
    - checkpoint_settings.on_blocking: Check when blocking point encountered
```

### 2. Checkpoint Scenarios

#### Scenario A: After Story Completion
```yaml
If execution_mode == "headless":
  - NO menu, NO user prompts
  - Just output brief summary: "🎯 {current_story} processed - {outcome}"
  - Directly goto step 01 (discovery) for next story
  - Continue automatically

If execution_mode == "semi-automated" and checkpoint_settings.after_story == true:
  Output: 🎯 Story {current_story} processing complete!
  
  Present Story Summary:
  - Outcome: {completed / blocked / skipped}
  - Duration: {time_taken}
  - Tests: {passed}/{total}
  - Review: {review_outcome}
  - Files Modified: {file_count}
  
  If outcome == "blocked":
    Output: ⚠️ Blocking Points:
            - {blocking_reason}
            - Suggested action: {suggestion}
  
  Ask User:
    What would you like to do?
    1. Continue to next story
    2. Review current story details
    3. Review blocking points (if any)
    4. Generate execution report
    5. Pause execution
    6. Exit workflow
  
  Process User Choice:
    - Choice 1: Goto step 01 (discovery) for next story
    - Choice 2: Show detailed story summary, then re-offer options
    - Choice 3: Load blocking points file and show details
    - Choice 4: Load references/report-mode.md
    - Choice 5: Save context, wait for user resume
    - Choice 6: Generate final report, exit
```

#### Scenario B: After Code Review
```yaml
If execution_mode == "headless":
  - NO menu, NO user prompts
  - Continue automatically based on review outcome

If execution_mode == "semi-automated" and checkpoint_settings.after_review == true:
  Output: 🔍 Code Review Complete for {current_story}
  
  Present Review Summary:
  - Review 1 Outcome: {outcome}
  - Review 2 Outcome: {outcome}
  - Reviewers Agreed: {yes/no}
  - Issues Found: {count}
  - Auto-fixable: {count}
  - Needs Human: {count}
  
  If reviews disagreed OR critical issues:
    Output: ⚠️ Attention Required:
            - Reviews disagree OR critical issues found
            - Human review recommended
  
  Ask User:
    What would you like to do?
    1. Apply auto-fixes and continue (if applicable)
    2. Review detailed findings
    3. Mark as approved despite concerns
    4. Request changes and rework
    5. Block this story for manual review
    6. Pause execution
  
  Process User Choice:
    - Choice 1: Attempt auto-fix, re-run review
    - Choice 2: Show detailed review findings
    - Choice 3: Mark as approved, continue to status update
    - Choice 4: Mark as changes-requested, goto development
    - Choice 5: Record as blocking point, goto status update
    - Choice 6: Save context, wait for user resume
```

#### Scenario C: On Blocking Point
```yaml
If execution_mode == "headless":
  - Record blocking point
  - Output brief message: "🚫 Blocked: {current_story} - {reason}"
  - NO user prompts
  - Directly goto status update and next story
  - Continue automatically

If execution_mode == "semi-automated" and (checkpoint_settings.on_blocking == true OR critical_blocking):
  Output: 🚫 Blocking Point Encountered: {current_story}
  
  Present Blocking Details:
  - Step: {create-story / development / testing / review}
  - Reason: {clear_description}
  - Context:
    - Error messages: {list}
    - Related files: {list}
    - Retries attempted: {count}
    - AC affected: {list}
  
  Suggested Actions:
  - {action1}: {description}
  - {action2}: {description}
  - {action3}: {description}
  
  If semi-automated mode:
    Ask User:
      How would you like to handle this?
      1. Skip this story and continue
      2. Provide additional context to resolve
      3. Review related files and AC
      4. Pause for manual investigation
      5. Exit workflow
    
    Process User Choice:
      - Choice 1: Mark as skipped, goto status update
      - Choice 2: Ask clarifying questions, then retry
      - Choice 3: Show relevant files and AC, re-offer options
      - Choice 4: Save context, wait for user resume
      - Choice 5: Generate report, exit
  
  If headless mode:
    Action: Record blocking point with all details
    Action: Mark story as blocked
    Action: Goto status update
    Action: Continue to next story (if any)
    Action: Note: Human intervention required for blocked stories
```

## Loop Control

### Determine Next Story:
```yaml
Action: Load execution context
Action: Check if more stories available:
  - Stories not in stories_processed
  - Stories not in stories_blocked (unless resuming)
  - Stories not in stories_skipped (unless user requests)
  - Stories with status not "done"

If more stories available:
  Action: Determine next story based on:
    - Epic order (Epic 1 before Epic 2)
    - Story order within epic (1.1 before 1.2)
    - Status priority (in-progress > review > ready-for-dev > backlog)
  
  Action: If checkpoint not needed:
    - Goto step 01 (discovery) with next story
  
  Action: If checkpoint needed:
    - Present checkpoint options

If NO more stories available:
  Action: Load references/step-08-completion-audit.md
  Action: Run audit on ALL completed stories
  Action: Generate final execution report if audit passes
  Action: Present summary and exit
```

## Pause and Resume

### Pause Execution:
```yaml
If user chooses to pause:
  Output: ⏸️ Pausing execution...
  
  Action: Save execution context with:
    - pause_time: {current_datetime}
    - paused_by: "user"
    - pause_reason: {user_provided or "checkpoint"}
    - next_story_candidate: {story_key if known}
  
  Action: Save all artifacts:
    - Execution context
    - Blocking points file
    - Any modified story files
  
  Output: ✅ Execution paused successfully!
          
          Resume by running:
          - bmad-auto-dev-workflow --resume
          
          Current State:
          - Stories Processed: {count}
          - Stories Completed: {count}
          - Stories Blocked: {count}
          - Current Story (if any): {story_key}
          - Paused At: {timestamp}
  
  Action: Wait for user input or exit
```

### Exit Workflow:
```yaml
If user chooses to exit:
  Output: 👋 Exiting workflow...
  
  Action: Generate final report (if not already done)
  Action: Save all artifacts
  Action: Present summary:
    - Execution ID: {id}
    - Duration: {start to end}
    - Stories Processed: {count}
    - Stories Completed: {count}
    - Stories Blocked: {count}
    - Stories Skipped: {count}
    - Report Location: {path}
  
  Action: Exit gracefully
```

## Communication

### Checkpoint Presentation Style:
```yaml
In semi-automated mode:
- Use emojis for visual cues
- Present clear, numbered options
- Include relevant context and metrics
- Ask for specific input rather than open-ended questions

In headless mode:
- Be concise but informative
- Focus on key outcomes
- Indicate what was recorded
- Suggest next steps for human intervention
```

## Next Step References

### From Checkpoint:
```yaml
# === HEADLESS ROUTING (NO OPTIONS, NO QUESTIONS) ===
If headless:
  → GOTO step-01-discovery.md IMMEDIATELY (if more stories remain)
  → GOTO step-08-completion-audit.md IMMEDIATELY (if no more stories)
  → NEVER output options. NEVER ask "continue?".
  → Output: "🔄 Auto-continuing to next story... / 📊 All stories processed, running completion audit..."

# === SEMI-AUTOMATED ROUTING ===
If continuing to next story:
  - Load references/step-01-discovery.md
  
If generating report:
  - Load references/report-mode.md

If pausing:
  - Save context and wait

If exiting:
  - Generate report and exit
```

## 流程记录 (Execution Log)

### 记录检查点步骤
```yaml
Action: APPEND to Execution Log (NEVER overwrite existing content)
- Log Path: {execution_log_path}
- Story: {current_story}
- Step: Checkpoint
- Step Start Time: {step_start_time}
- Step End Time: {step_end_time}
- Step Duration: {step_duration}
- Status: {success / failed}
- Details:
  - Checkpoint Type: {after_story / after_review / on_blocking}
  - Outcome: {continued / paused / exited}
- APPEND to execution log — DO NOT rewrite the file
```

## State Persistence

**Save context at checkpoint**:
- Before presenting options
- After user makes choice
- Before pausing
- Before exiting

**Key fields to update**:
- `last_updated`: Timestamp
- `pause_time`: If pausing
- `next_story_candidate`: If known
