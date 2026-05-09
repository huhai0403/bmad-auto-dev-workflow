---
mode: resume
description: Resume execution from last known state
---

# Resume Mode

## Goal
Resume workflow execution from the last known state using saved execution context.

## Activation
- When user passes `--resume` argument
- When execution was paused and user wants to continue

## Resume Flow

### 1. Load Execution Context

```yaml
Action: Check if {execution_context_path} exists
Action: If not exists:
  Output: ❌ No saved execution context found
          
          To start a new execution:
          - bmad-auto-dev-workflow --headless
          - bmad-auto-dev-workflow --semi
          
          Or provide a specific story:
          - bmad-auto-dev-workflow --story {story-key}
  
  Action: Exit or ask user to start fresh

Action: If exists:
  Output: 📂 Found saved execution context
          
          Loading resume state...
  
  Action: Load {execution_context_path}
  Action: Validate context structure
  Action: If context is corrupted or invalid:
    Output: ⚠️ Execution context appears corrupted
            Attempting to recover from partial data...
    
    Action: Try to recover from:
      - Sprint status file
      - Blocking points file
      - Story files
    
    Action: If recovery fails:
      Output: ❌ Cannot recover execution context
              Starting fresh is recommended
      Action: Ask user to start fresh or exit
```

### 2. Validate Resume State

#### Check Context Fields:
```yaml
Validate:
- execution_id: Present and valid
- start_time: Present
- execution_mode: Valid (headless or semi-automated)
- checkpoint_settings: Present if semi-automated
- last_updated: Present

Optional fields to check:
- current_story: May be null (between stories)
- current_step: May be null
- pause_time: If paused
- paused_by: If paused
- pause_reason: If paused
```

#### NEW: Batch Validation (CRITICAL):
```yaml
Action: Check if context has "selected_batch" field

If context has selected_batch:
  Action: Compare with {selected_batch} from current batch selection
  
  If MATCH:
    - Context belongs to the same batch - OK to resume
    - Continue with normal validation
  
  If DOES NOT MATCH:
    Output: ⚠️ Batch Mismatch Detected
            
            Current Execution Context belongs to:
            - Batch: {context.selected_batch}
            
            But you selected:
            - Batch: {selected_batch}
            
            This means:
            - The saved state is from a DIFFERENT requirement batch
            - Resuming would process the wrong batch's stories
            
            What would you like to do?
            1. Switch to context's batch: {context.selected_batch}
            2. Start fresh in current batch: {selected_batch} (discard saved state)
            3. Choose different batch
            4. Exit
    
    Action: In semi-automated mode:
      - Wait for user choice
      - Process accordingly:
        - Choice 1: Switch batches - reload batch-resolution for context's batch
        - Choice 2: Start fresh - ignore context, proceed as new execution
        - Choice 3: Go back to batch selection
        - Choice 4: Exit
    
    Action: In headless mode:
      - This is an error - headless cannot ask user
      - Output: ❌ Error: Batch mismatch in headless mode
                Context batch: {context.selected_batch}
                Current batch: {selected_batch}
                Please use semi-automated mode to resolve, or specify correct batch
      - Exit with error

If context does NOT have selected_batch:
  - This is an older context (from before batch support was added)
  - Output: ⚠️ Execution context has no batch information
          
          This context was created before batch selection was implemented.
          It may belong to any batch.
          
          Options:
          1. Try to match with current batch: {selected_batch}
          2. Start fresh (discard context)
          3. Exit
  
  Action: Process user choice (semi-automated) or error (headless)
```

### 3. Present Resume Summary

#### If Paused State Detected:
```yaml
Output: ⏸️ Resuming from paused state

Resume Summary:
- Execution ID: {execution_id}
- Start Time: {start_time}
- Paused At: {pause_time}
- Paused By: {paused_by}
- Pause Reason: {pause_reason}

Current State:
- Stories Processed: {stories_processed_count}
- Stories Completed: {stories_completed_count}
- Stories Blocked: {stories_blocked_count}
- Current Story: {current_story or "None (between stories)"}
- Current Step: {current_step or "None"}
```

#### If Between Stories:
```yaml
Output: 📋 Resuming between stories

Execution State:
- Execution ID: {execution_id}
- Start Time: {start_time}
- Last Updated: {last_updated}
- Execution Mode: {execution_mode}

Progress:
- Processed: {stories_processed_count}
- Completed: {stories_completed_count}
- Blocked: {stories_blocked_count}
- Skipped: {stories_skipped_count}

Next:
- Will discover next eligible story automatically
```

#### If Mid-Story:
```yaml
Output: 🔄 Resuming mid-story execution

Story: {current_story}
Step: {current_step}
Execution Mode: {execution_mode}

Progress on this story:
- Steps completed so far: {steps_completed}
- Retry counts: {retry_counts_for_story}
- Status before pause: {status}

Will resume from: {current_step}
```

### 4. Resume Options

#### In Semi-Automated Mode:
```yaml
Ask User:
  How would you like to resume?
  
  1. Resume from current state ({current_story} - {current_step})
  2. Skip current story and go to next
  3. Review execution context
  4. Review blocking points
  5. Start fresh (discard saved state)
  6. Exit

Process User Choice:
  - Choice 1: Continue from current step
  - Choice 2: Mark current as skipped, go to discovery
  - Choice 3: Show context details, re-offer options
  - Choice 4: Load blocking points, show details
  - Choice 5: Confirm, then start fresh
  - Choice 6: Exit
```

#### In Headless Mode:
```yaml
Output: ⏯️ Auto-resuming in headless mode

Resume State:
- Current Story: {current_story or "None"}
- Current Step: {current_step or "discovery"}

Resuming automatically...

If current_story set and current_step set:
  Action: Goto corresponding step file
  Action: E.g., if current_step == "development":
            Load references/step-03-development.md

Else:
  Action: Load references/step-01-discovery.md
  Action: Find next eligible story
```

### 5. Handle Mid-Story Resume

#### If Resuming Mid-Story:
```yaml
Action: Load story file for {current_story}
Action: Review story state:
  - What was the last action taken?
  - What tasks were completed?
  - What tests were run?
  - What review was done?

Action: Determine safe resume point:
  - If in development:
    - Check if tasks were partially completed
    - Resume from first incomplete task
    - Or restart development if unclear
  
  - If in testing:
    - Check test results
    - Re-run failed tests
    - Or continue from where left
  
  - If in review:
    - Load existing review findings
    - Continue from comparison phase
    - Or re-run review if incomplete

Action: Update execution context if needed
Action: Save context before continuing
```

### 6. Recovery from Partial State

#### If Context is Partial:
```yaml
Action: Attempt to reconstruct state from other files:

1. From Sprint Status:
   - Find stories with status "in-progress" or "review"
   - These are likely the current story
   
2. From Story Files:
   - Check story files for "Status: in-progress"
   - Look for incomplete tasks
   - Look for partial test results

3. From Blocking Points:
   - Check for recent blocking points
   - These may indicate where execution stopped

Action: Present reconstructed state to user (in semi-automated mode)
Action: Ask for confirmation before resuming

In headless mode:
  Action: Use most likely reconstruction
  Action: Proceed with caution
  Action: Record assumption in execution context
```

### 7. Resume Execution

#### After Confirmation:
```yaml
Action: Update execution context:
  - Remove pause_time if present
  - Remove paused_by if present
  - Remove pause_reason if present
  - Update last_updated to current time

Action: Save execution context

Action: Proceed to appropriate step:
  - If current_story and current_step:
    → Goto current_step's step file
  - Else:
    → Goto step-01-discovery.md
```

## Special Resume Scenarios

### Scenario 1: Resuming After Blocking Point
```yaml
If last state was blocking point:
  Action: Load blocking point details
  Action: In semi-automated mode:
    Present blocking point
    Ask user how to proceed:
    1. Skip this story
    2. Provide context to resolve
    3. Retry (if retries remaining)
    4. Exit
  
  Action: In headless mode:
    Mark as blocked
    Continue to next story
    Record in report
```

### Scenario 2: Resuming After Failed Retry
```yaml
If last step had retry_count == 2:
  Action: Check if story is marked as blocked
  Action: If not blocked yet:
    Mark as blocked
    Record blocking point
    Update status
  
  Action: In semi-automated mode:
    Inform user of max retries reached
    Present options:
    1. Skip to next story
    2. Manual intervention, then retry
    3. Exit
  
  Action: In headless mode:
    Continue to next story
```

### Scenario 3: Resuming After User Pause
```yaml
If pause_reason == "checkpoint" or "user":
  Action: Load checkpoint settings
  Action: In semi-automated mode:
    Present checkpoint options (same as step-07-checkpoint.md)
  
  Action: In headless mode:
    Auto-continue to next story or step
```

## State Persistence During Resume

**Save context at these points**:
- After loading and validating context
- After user confirms resume action
- Before proceeding to first step
- After handling mid-story recovery

**Key fields to update**:
- `last_updated`: Current timestamp
- Remove pause-related fields if resuming
- Add `resumed_at` timestamp
- Add `resume_count` (increment if resumed multiple times)

## Communication

### Resume Message Style:
```yaml
In semi-automated mode:
- Friendly and informative
- Clear about what was saved
- Clear about what will happen next
- Offer options and control

In headless mode:
- Concise but informative
- Confirm resume is happening
- Indicate next action
- Note any assumptions made
```

## Next Step After Resume

### Determined by:
1. **current_story** and **current_step** in execution context
2. **Story status** in sprint status file
3. **Last action** recorded in story file
4. **User choice** in semi-automated mode

### Common Next Steps:
```yaml
If current_story set:
  current_step == "create-story" → step-02-create-story.md
  current_step == "development" → step-03-development.md
  current_step == "testing" → step-04-testing.md
  current_step == "review" → step-05-code-review.md
  current_step == "status-update" → step-06-status-update.md
  current_step == "checkpoint" → step-07-checkpoint.md

If no current_story:
  → step-01-discovery.md
```
