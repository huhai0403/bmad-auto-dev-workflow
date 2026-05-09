---
step: execution
name: main-execution
description: Orchestrates the main execution pipeline sequentially through all steps
---

# Main Execution Orchestrator

## Goal
Coordinate the sequential execution of all workflow steps from story discovery through completion, ensuring proper state management and step routing.

## Pre-requisites
- Initialization complete (batch selected, paths resolved, context created)
- Not in report-only mode or resume mode
- Batch resolution successful

## Execution Loop
This is the main sequential orchestrator that loads each step file in order.

### LOOP: Process Story [N+1 / Total_Pending]

CRITICAL — This is an explicit, machine-executable loop. Do not break out of it until all stories are processed.

```
┌──────────────────────────────────────────────────────────────────┐
│                      MAIN EXECUTION LOOP                         │
│                                                                  │
│  WHILE (eligible_stories_remain):                                │
│    1. COUNT remaining stories from sprint status                 │
│    2. OUTPUT: "🔄 [{n}/{total}] Processing: {story_key}"        │
│    3. EXECUTE steps 01-07 for current story                      │
│    4. IN HEADLESS: GOTO step 1 IMMEDIATELY. NO pause. NO question│
│    5. IN SEMI: Present checkpoint, then GOTO step 1 or exit      │
│                                                                  │
│  AFTER LOOP (no more stories):                                   │
│    6. GOTO step-08 (completion-audit)                            │
└──────────────────────────────────────────────────────────────────┘
```

**HEADLESS ANTI-STOP RULE**: 

After each story completes (step-06 done), if there are more eligible stories:
→ Output: `"🔄 [{N}/{total}] Auto-continuing to next story..."`
→ IMMEDIATELY load `references/step-01-discovery.md`
→ DO NOT STOP. DO NOT ASK. DO NOT OUTPUT OPTIONS.

Only stop when `eligible_stories_remaining == 0`, then auto-load `references/step-08-completion-audit.md`.

---

## Step 1: Discovery
### Load and execute:
```yaml
Action: Load `references/step-01-discovery.md`
Action: Read the ENTIRE file completely
Action: Follow the instructions IN ORDER to select next story
Action: Wait for step-01 to complete (story selected)

After step-01 completion:
  - Verify `{current_story}` is set in execution context
  - Verify `{current_step}` = "discovery-complete"
  - Proceed to Step 2 (Create Story if needed)
```

---

## Step 2: Create Story (Conditional)
### Check story status and decide:
```yaml
Action: Check story status from sprint-status file
Action: Check if story needs context creation

If status == "backlog":
  Action: Load `references/step-02-create-story.md`
  Action: Read ENTIRE file
  Action: Execute step-02 to create story context
  Action: Verify status updates to "ready-for-dev"
  Action: Save execution context

Elif status == "ready-for-dev" OR status == "in-progress" OR status == "review":
  Action: Skip step-02 (no need to create story context)
  Action: Proceed directly to Step 3

Else:
  Action: Record as blocking point
  Action: Proceed to checkpoint
```

---

## Step 3: Development
### Load and execute:
```yaml
Action: Load `references/step-03-development.md`
Action: Read ENTIRE file completely
Action: Execute step-03 to implement the story
Action: Wait for step-03 completion (all tasks done)
Action: Verify step-03 properly routes to testing

After step-03 completion:
  - Verify step-03's Next Step instructions followed
  - Verify status updates to "review" in story file
  - Proceed to Step 4
```

---

## Step 4: Testing
### Load and execute:
```yaml
Action: Load `references/step-04-testing.md`
Action: Read ENTIRE file completely
Action: Execute step-04 to run all tests
Action: Wait for step-04 completion
Action: Verify test results recorded

After step-04 completion:
  - Check Next Step section in step-04
  - If all tests pass: Proceed to Step 5 (Code Review)
  - If tests failed: Handle according to retry/blocking logic
```

---

## Step 5: Code Review
### Load and execute:
```yaml
Action: Load `references/step-05-code-review.md`
Action: Read ENTIRE file completely
Action: Execute step-05 for multi-model code review
Action: Handle review 1 → checkpoint → review 2 → comparison

After step-05 completion:
  - Check review outcome
  - Proceed to Step 6 (Status Update)
```

---

## Step 6: Status Update
### Load and execute:
```yaml
Action: Load `references/step-06-status-update.md`
Action: Read ENTIRE file completely
Action: Update sprint-status file
Action: Update execution context
Action: Mark story as completed or blocked

After step-06 completion:
  - Proceed to Step 7 (Checkpoint)
```

---

## Step 7: Checkpoint and Loop Control
### Load and execute:
```yaml
Action: Load `references/step-07-checkpoint.md`
Action: Read ENTIRE file completely
Action: Present checkpoint (if semi-automated mode)
Action: Decide next action:
  - Continue to next story
  - Review blocking points
  - Pause/Exit
  - Generate report

After step-07 decision:
  - If continue: Go back to Step 1 (Discovery) for next story (via the MAIN LOOP)
  - If pause/exit: Save all state and halt
  - If report: Load `references/report-mode.md` and exit
```

---

## Step 8: Completion Audit (NEW — AUTO-EXECUTED AFTER ALL STORIES)
### Load and execute:
```yaml
Action: Load `references/step-08-completion-audit.md`
Action: Read ENTIRE file completely
Action: For EACH story in stories_completed:
  - Open story file
  - Verify test output exists
  - Verify lint output exists
  - Verify code review exists
  - Verify DoD checklist is complete
Action: If any story fails audit:
  - Revert to "in-progress" in sprint status
  - Re-queue for re-processing
  - GO BACK to step-01-discovery.md
Action: If all stories pass audit:
  - Generate final execution report
  - Exit workflow
```

---

## Error Handling During Execution
### If any step fails:
```yaml
Action: Check if step file has built-in error handling
Action: If step file handles errors: Follow its instructions
Action: If step file doesn't handle:
  - Record as blocking point
  - Save execution context
  - Proceed to checkpoint (step-07)
```

---

## Execution Complete Conditions
### Stop execution when:
1. All stories processed (no more stories available)
2. User chooses to exit at checkpoint
3. Critical error that cannot be recovered from

### Final Actions When Complete:
```yaml
Action: Load `references/report-mode.md`
Action: Generate final execution report
Action: Save all state one last time
Action: Communicate results to user
```
