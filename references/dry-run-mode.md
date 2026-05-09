---
step: dry-run
name: dry-run-execution
description: Low-token dry-run mode — skips real dev/test/review but preserves routing, evidence gates, and audit
---

# Dry-Run Execution Mode

## Goal
Execute the complete workflow pipeline without making real changes, running test commands, or performing development. Verifies routing logic, headless auto-continuation, evidence gates, and loop control with minimal token usage.

## Pre-requisites
- Initialization complete (batch selected, paths resolved, context created)
- `{execution_mode}` is set
- Execution context loaded

---

## DRY-RUN BEHAVIOR PER STEP

| Step | Dry-Run Action | Real? | Gate Executed? |
|------|---------------|-------|---------------|
| step-01 Discovery | **FULL** — read sprint-status, select next story | YES | N/A |
| step-02 Create Story | Skip if story exists; create skeleton if backlog | COND | N/A |
| step-03 Development | **SKIP** dev-story. Mark tasks as `[x] mock-dry-run`. | NO | N/A |
| step-04 Testing | **SKIP** npm commands. **EXECUTE** evidence gate. | PARTIAL | **YES** |
| step-05 Code Review | **SKIP** review. Add dry-run placeholder. | NO | N/A |
| step-06 Status Update | **FULL** — evidence check, sprint-status update | YES | **YES** |
| step-07 Checkpoint | **FULL** — headless auto-continue, semi options | YES | N/A |
| step-08 Audit | **FULL** — verify all completed stories | YES | **YES** |
| Loop Control | **FULL** — auto-continue to next story | YES | N/A |

---

## Main Execution Loop (Dry-Run)

```
┌──────────────────────────────────────────────────────────────────┐
│                   DRY-RUN EXECUTION LOOP                          │
│                                                                  │
│  WHILE (eligible_stories_remain):                                │
│    1. COUNT remaining stories from sprint-status                 │
│    2. OUTPUT: "🔄 [DRY-RUN] [{n}/{total}] {story_key}"          │
│    3. EXECUTE dry-run steps 01-07 for current story              │
│    4. IN HEADLESS: GOTO step 1 IMMEDIATELY. NO pause.            │
│    5. IN SEMI: Present checkpoint, then GOTO step 1 or exit      │
│                                                                  │
│  AFTER LOOP: GOTO step-08 (completion-audit)                     │
└──────────────────────────────────────────────────────────────────┘
```

**HEADLESS ANTI-STOP RULE** (applies in dry-run too):

After each story completes, if more eligible stories remain:
→ Output: `"🔄 [DRY-RUN] [{N}/{total}] Auto-continuing to next story..."`
→ IMMEDIATELY load `references/step-01-discovery.md`
→ DO NOT STOP. DO NOT ASK. DO NOT OUTPUT OPTIONS.

---

## Step 1: Discovery (FULL — DRY-RUN)
### Load and execute:
```yaml
Action: Load `references/step-01-discovery.md`
Action: Read ENTIRE file completely
Action: Follow instructions to select next story
Action: THIS IS IDENTICAL TO NORMAL EXECUTION — no changes needed
```

---

## Step 2: Create Story (CONDITIONAL — DRY-RUN)
### Check story status:
```yaml
If status == "backlog":
  Action: Check if story file already exists in {implementation_artifacts}
  
  If story file DOES NOT exist:
    Action: Create a minimal skeleton story file (NOT using create-story skill)
    Action: Include ONLY:
      - Story Header (key, title, status: ready-for-dev)
      - Placeholder AC section: "AC: (dry-run — not yet defined)"
      - Placeholder Tasks section: "[x] task-1 (dry-run placeholder)"
      - Dev Agent Record: "Dry-run execution — {timestamp}"
    Action: Update sprint-status: backlog → ready-for-dev
    Action: Save story file
  
  If story file ALREADY exists:
    Action: Skip creation, verify status is ready-for-dev

If status != "backlog":
  Action: Skip step-02 entirely
  Action: Proceed to step-03
```

---

## Step 3: Development (SKIP — DRY-RUN)
### Skip real development:
```yaml
Action: DO NOT load dev-story skill. DO NOT write any implementation code.
Action: DO NOT write test files.
Action: OPEN the story file for {current_story}
Action: UPDATE the Tasks/Subtasks section:
  - Mark ALL unchecked [ ] tasks as [x] (dry-run)
  - Add note: "*(dry-run: task assumed complete)*"
Action: UPDATE Dev Agent Record:
  - Add: "## Implementation Notes (Dry-Run)"
  - Add: "- Date: {current_datetime}"
  - Add: "- Skipped actual development in dry-run mode"
Action: UPDATE sprint-status: {current_story} → "in-progress"
Action: SAVE story file
Action: Output: "🔧 [DRY-RUN] {current_story}: development skipped → tasks marked done"

After completion:
  - **Headless**: IMMEDIATELY load `references/step-04-testing.md`. DO NOT pause.
  - **Semi-automated**: Present summary, then load `references/step-04-testing.md`
```

---

## Step 4: Testing (PARTIAL — DRY-RUN)
### Skip commands but EXECUTE evidence gate:

```yaml
Action: Load `references/step-04-testing.md`
Action: Read ENTIRE file
Action: FOLLOW THESE DRY-RUN RULES:

# 1. SKIP command execution
Action: DO NOT run: npm run test:unit, npm run test:e2e, npm run lint
Action: DO NOT execute any shell commands

# 2. Record dry-run placeholder in story file
Action: OPEN story file for {current_story}
Action: UPDATE "## Test Output Details" section:
  If EMPTY or placeholder, ADD:
    ```
    (dry-run: npm run test:unit was NOT executed)
    (dry-run: npm run lint was NOT executed)
    ```
Action: SAVE story file

# 3. EXECUTE the evidence gate (this is what we're actually testing!)
Action: EXECUTE the "POST-CONDITION EVIDENCE GATE" from step-04-testing.md
Action: The gate WILL FAIL if the story has no prior real test output
Action: This is EXPECTED — it proves the gate works
Action: Record the gate failure result

# 4. Output dry-run result
If evidence gate FAILS (expected in dry-run):
  - **Headless mode**: 
    Output: "🧪 [DRY-RUN] {current_story}: Evidence gate intentionally FAILED (no real test output). Recording as blocked."
    Action: Record blocking point
    Action: GOTO step-07-checkpoint to decide next action

If evidence gate PASSES (story had real test output from prior run):
  - **Headless mode**:
    Output: "🧪 [DRY-RUN] {current_story}: Evidence gate PASSED (existing test output found)"
    Action: Proceed to step-05

  - **Semi-automated mode**: Present results, wait for user, then proceed
```

**IMPORTANT**: The evidence gate intentionally fails on dry-run for stories without real test output. This is NOT a bug — it validates that the gate is functioning correctly.

---

## Step 5: Code Review (SKIP — DRY-RUN)
### Skip real review:
```yaml
Action: Load `references/step-05-code-review.md`
Action: Read ENTIRE file

# 1. EXECUTE the pre-flight test evidence check (Phase 0)
Action: OPEN story file for {current_story}
Action: Check for "## Test Output Details" section

If pre-flight check FAILS (no test evidence):
  Action: Follow step-05's instructions: RETURN to step-04
  Action: Output: "⛔ [DRY-RUN] Pre-flight test evidence check FAILED → back to step-04"

If pre-flight check PASSES (existing test evidence in file):
  Action: Proceed

# 2. SKIP actual code review
Action: DO NOT perform code review analysis
Action: UPDATE story file:
  - Add "Code Review Summary":
    ```
    Code Review Summary (Dry-Run):
      - Review Mode: Skipped
      - Review 1 Outcome: (dry-run — skipped)
      - Review 2 Outcome: (dry-run — skipped)
      - Final Outcome: Approved (dry-run)
      - Notes: Code review skipped in dry-run mode
    ```
Action: SAVE story file
Action: Output: "🔍 [DRY-RUN] {current_story}: code review skipped → marked approved"

# 3. Route to next step
- **Headless**: IMMEDIATELY load `references/step-06-status-update.md`
- **Semi-automated**: Present results, wait, then load step-06
```

---

## Step 6: Status Update (FULL — DRY-RUN)
### Execute normally (evidence gate is what we're testing):
```yaml
Action: Load `references/step-06-status-update.md`
Action: Read ENTIRE file
Action: Execute status update normally
Action: EXECUTE the PRE-STATUS EVIDENCE CHECK
Action: Updates to sprint-status file and execution context are REAL
Action: Output: "📊 [DRY-RUN] {current_story}: status update → {outcome}"

If more stories available:
  - Headless: "🔄 [DRY-RUN] [{N}/{total}] Auto-continuing..." → load step-01
  - Semi-automated: Follow checkpoint settings

If no more stories:
  - Headless: "📊 [DRY-RUN] All stories processed. Running audit..." → load step-08
  - Semi-automated: Ask user, then load step-08
```

---

## Step 7: Checkpoint (FULL — DRY-RUN)
### Execute normally:
```yaml
Action: Load `references/step-07-checkpoint.md`
Action: Read ENTIRE file
Action: In headless: auto-continue. In semi: present options.
Action: Route to step-01 (next story) or step-08 (audit)
```

---

## Step 8: Completion Audit (FULL — DRY-RUN)
### Execute normally — this is the key validation point:
```yaml
Action: Load `references/step-08-completion-audit.md`
Action: Read ENTIRE file
Action: Execute audit on ALL stories in stories_completed
Action: For EACH story:
  - Check: test output evidence (will FAIL for dry-run stories usually)
  - Check: lint output evidence (will FAIL for dry-run stories usually)
  - Check: code review evidence (dry-run placeholder counts)
  - Check: DoD checklist
Action: Report audit results

If audit finds missing evidence:
  - Report which stories have gaps
  - Report which gaps were found
  - In headless: auto re-queue for re-processing
  - In semi: present results

Output: "🔍 [DRY-RUN] Audit complete: {passed}/{total} stories have complete evidence"
```

---

## Dry-Run Output Format

All dry-run step outputs are prefixed with `[DRY-RUN]` to distinguish from real execution.

### Headless mode output per story:
```
🔄 [DRY-RUN] [1/5] 1-1-editor-update-... — processing...
🔧 [DRY-RUN] step-03: development skipped
🧪 [DRY-RUN] step-04: evidence gate EXECUTED — gate FAILED (no real test output)
🔍 [DRY-RUN] step-05: pre-flight check failed → back to step-04
📊 [DRY-RUN] step-06: story outcome = blocked
🔄 [DRY-RUN] [2/5] Auto-continuing to next story...
```

### Semi-automated mode: Same but with checkpoint pauses.

---

## Communication

### In headless mode:
- Use `[DRY-RUN]` prefix on all output lines
- Be concise: one line per step
- NEVER ask questions — same golden rule applies
- NEVER output option menus

### In semi-automated mode:
- Same `[DRY-RUN]` prefix
- Include checkpoints per normal semi mode
- Allow user to choose actions at checkpoints

---

## Error Handling

### Expected failures in dry-run:
1. **Evidence gates failing**: Expected behavior for stories without real test output. Proves gates work.
2. **Pre-flight checks failing**: Normal in dry-run. Proves step-05's Phase 0 works.
3. **Audit re-opening stories**: Expected for stories with missing evidence.

### Unexpected failures:
1. **File not found errors**: Indicates broken cross-references → fix references
2. **Status update write errors**: Indicates sprint-status file issues
3. **Infinite loop**: If the same story keeps getting re-queued, abort after 3 re-process attempts

### Dry-Run Abort Conditions:
```yaml
Action: Track re-process count per story in execution context:
  dry_run_reprocess_count: {}

If dry_run_reprocess_count[story_key] >= 3:
  Action: Stop re-queueing this story
  Action: Mark as blocked with note: "Dry-run: re-queue limit reached"
  Action: Continue to next story
```

---

## Completion

After dry-run inspection audit completes:
```yaml
Action: Output dry-run summary:
  📊 Dry-Run Complete:
  - Stories processed: {count}
  - Stories with evidence PASS: {count}
  - Stories with evidence FAIL: {count}
  - Audit passed: {yes/no}
  - Routes verified: discovery → dev → test → review → status → audit
  - Loop control: auto-continued between {count} stories

Action: Note: Evidence gate failures are EXPECTED in dry-run.
  These prove the gates are working correctly.
  To verify with real data, run the workflow without --dry-run.
```
