---
step: 08
name: completion-audit
description: Auto-verify all completed stories have required artifacts before final report
---

# Step 08: Completion Audit

## Goal
Verify that EVERY story marked as "completed" in the execution context actually has ALL required evidence artifacts (test output, lint output, code review, DoD checklist). Re-open any stories that fail the audit.

## Pre-requisites
- All eligible stories have been processed (step-01 through step-07)
- Execution context has `stories_completed` list populated
- Story files exist for each completed story

## CRITICAL RULES

1. **AUDIT IS MANDATORY** — Never skip this step, even if all stories "appear" done
2. **TRUST NOTHING** — Verify file contents, not just status flags
3. **RE-OPEN ON FAILURE** — Any story missing evidence is NOT done, revert it
4. **RE-QUEUE AND LOOP** — Failed stories go back to step-01, not marked as skipped

---

## Audit Execution Flow

### 1. Load Completed Stories List

```yaml
Action: Load {execution_context_path}
Action: Extract stories_completed list
Action: Count total completed stories

Output: 🔍 Completion Audit: Verifying {count} completed stories...
```

### 2. Audit Each Story — ONE BY ONE

For EACH story_key in `stories_completed`:

```yaml
Action: OPEN the story file: {implementation_artifacts}/{story_key}.md
Action: READ the ENTIRE file content
Action: Run FUZZY evidence checks using the rules below

FUZZY EVIDENCE SEARCH RULES:
─────────────────────────────
For ALL checks below, search for heading patterns FIRST using case-insensitive
substring match. Then validate content heuristics.

#### CHECK 1: Test Output Evidence
  Heading patterns (any match):
    "Test Output Details", "Test Execution Summary", "Test Output",
    "Test Results", "测试结果", "Unit Test", "Test Summary", "Tests"
  
  Content heuristics (need 3/5 to PASS):
    [a] Contains "npm run test" OR "jest" OR "vitest" OR "pytest"
    [b] Contains "Tests:" OR "PASS" OR "FAIL" OR "exit code" OR "Exit Code"
    [c] Contains numeric test counts ("5 passed", "3/3", "0 skipped")
    [d] Contains terminal-style output block (``` fences with test output)
    [e] The section content is >5 lines (not just a one-line summary)
  
  Verdict:
    Heading match + >=3 heuristics → PASS
    Heading match + 2 heuristics → PASS with WARNING (borderline)
    Heading match + <2 heuristics → FAIL (insufficient evidence)
    No heading match → FAIL

#### CHECK 2: Lint Output Evidence
  Heading patterns:
    "Lint Output Details", "Lint Output", "Lint Results",
    "ESLint", "lint", "linting", "Code Quality"
  
  Content heuristics (need 2/4 to PASS):
    [a] Contains "npm run lint" OR "eslint" OR "prettier"
    [b] Contains error/warning counts or "0 errors"
    [c] Contains "Exit Code" or "exit code"
    [d] Section content is >2 lines
  
  Verdict:
    Heading match + >=2 heuristics → PASS
    Heading match + 1 heuristic → PASS with WARNING
    No heading OR 0 heuristics → FAIL

#### CHECK 3: Code Review Evidence
  Heading patterns:
    "Code Review Summary", "Senior Developer Review", 
    "Code Review", "Formal Code Review", "BMAD"
  
  Content heuristics (need 2/3 to PASS):
    [a] Contains review outcome (Approve / Changes Requested / Blocked / 通过 / 修改)
    [b] Contains file:line references or action items with [ ] or [x]
    [c] Section is NOT placeholder text (not "TBD", not "{{template}}")
  
  Verdict:
    Heading match + >=2 heuristics → PASS
    Heading match + 1 heuristic → PASS with WARNING
    No heading OR empty/placeholder → FAIL

#### CHECK 4: DoD Checklist
  Heading patterns:
    "Definition-of-Done", "Definition of Done", "DoD",
    "完成自检", "自检", "Step 04 自检", "Done Checklist"
  
  Content heuristics:
    [a] Contains [x] OR [ ] checkboxes
    [b] ALL found checkboxes in this section are [x] (NO [ ] unchecked)
    [c] At least 5 checkbox items
  
  Verdict:
    Heading match + all [x] + >=5 items → PASS
    Heading match + {N} unchecked [ ] → FAIL ({N} items unchecked)
    Heading match + <5 items → FAIL (too few items)
    No heading → FAIL

#### CHECK 5: E2E Test Evidence (Conditional)
  Heading patterns:
    "E2E Output", "E2E Test", "e2e", "Playwright", "Cypress", "端到端"
  
  Logic:
    - Story AC contains UI/user journey requirements → section MUST exist with content → PASS/FAIL
    - Story is backend-only / no UI → section missing is ACCEPTABLE → PASS (N/A)
  
  Verdict: PASS / FAIL / N/A
```

### 3. Accumulate Audit Results

```yaml
Action: Build two lists:

audit_passed_stories = []  # All checks passed
audit_failed_stories = []  # Any check failed

For EACH story:
  story_audit = {
    "story_key": story_key,
    "checks": {
      "test_output": PASS/FAIL,
      "lint_output": PASS/FAIL,
      "code_review": PASS/FAIL,
      "dod_checklist": PASS/FAIL/{N} unchecked,
      "e2e_output": PASS/FAIL/N/A
    },
    "all_passed": true/false
  }

  If ALL checks PASS (including N/A):
    → Add to audit_passed_stories
  Else:
    → Add to audit_failed_stories (with failed check details)
```

### 4. Handle Audit Failures

#### If ANY stories failed the audit:

```yaml
Action: For EACH failed story:
  Action: Record the failure details
  
  Action: REVERT story status in sprint-status file:
    - Load {sprint_status_path}
    - Find development_status key matching story_key
    - Change status from "done" to "in-progress"
    - Add comment: "(re-opened by completion audit: missing {checks})"
    - Save sprint-status file
  
  Action: UPDATE execution context:
    - REMOVE story_key from stories_completed list
    - ADD story_key to stories_processed (if not already)
    - DO NOT add to stories_blocked (it should be re-processable)
    - Save execution context
  
  Action: Log to execution log:
    "🔴 AUDIT FAILED: {story_key} — missing: {failed_checks} → Re-opened for re-processing"

Action: AFTER all failures are processed:
  Output: ⚠️ Audit found {count} stories with missing evidence:
          {list of stories with failed checks}
  
  # === HEADLESS MODE ===
  If headless:
    Output: "🔄 Re-queuing {count} failed stories for re-processing..."
    Action: IMMEDIATELY load references/step-01-discovery.md
    Action: DO NOT ask user. DO NOT output options.
  
  # === SEMI-AUTOMATED MODE ===
  If semi-automated:
    Present audit failure summary
    Ask user:
      1. Re-process failed stories automatically
      2. Review failure details first
      3. Skip failed stories and generate report
      4. Exit workflow
    
    Process user choice:
      - Choice 1: Load references/step-01-discovery.md
      - Choice 2: Show details, re-offer options
      - Choice 3: Mark failed stories as skipped, proceed to report
      - Choice 4: Save context, generate report, exit
```

#### If ALL stories passed the audit:

```yaml
Output: ✅ ALL {count} completed stories pass audit:
        {list of stories with checkmarks}

Action: Proceed to Final Report generation
```

### 5. Generate Final Report

```yaml
Action: Load references/report-mode.md
Action: Generate comprehensive execution report including:
  - Audit results summary
  - All stories that passed audit (fully verified)
  - All stories that failed audit (re-opened)
  - Remaining blocked stories
  - Recommendations for next steps

Action: Save report to {implementation_artifacts}/final-report-{execution_id}.md
Action: Update execution log with final summary
Action: Save execution context one final time
```

---

## Audit Logging

### Record audit results in execution log:

```yaml
Action: Add to {implementation_artifacts}/execution-log-{execution_id}.md:

## Completion Audit ({timestamp})
- Stories checked: {count}
- Stories passed: {passed_count}
- Stories failed: {failed_count}

### Passed:
{list of story keys with [x] all checks}

### Failed:
{list of story keys with failed check details}

### Outcome:
- All passed → Generated final report
- Some failed → {count} stories re-queued for re-processing
```

---

## Communication

### In headless mode:
```
If ALL PASSED:
  Output: ✅ Audit PASSED: {n}/{n} stories verified with complete evidence → Generating final report...

If ANY FAILED:
  Output: ⚠️ Audit FAILED: {k}/{n} stories missing evidence → {list} → Re-queuing for re-processing...
  Action: IMMEDIATELY load references/step-01-discovery.md (no pause)
```

### In semi-automated mode:
```
If ALL PASSED:
  Output: ✅ Audit PASSED: All {n} stories have complete evidence
  Action: Ask user to confirm before generating final report

If ANY FAILED:
  Output: ⚠️ Audit found {k} stories with missing evidence
  Action: Present details and ask user for direction
```

---

## State Persistence

**Save execution context after**:
- Audit completion
- Any story status reversion
- Before restarting the processing loop
- Before generating final report

**Context fields to update**:
- `audit_completed`: true/false
- `audit_results`: {passed_count, failed_count, details}
- `stories_completed`: Updated (failed stories removed)
- `stories_processed`: Updated
- `last_updated`: Timestamp

## Next Step

**If audit passed (all stories have complete evidence)**:
- **Headless**: IMMEDIATELY load `references/report-mode.md` to generate final report. DO NOT ask user.
- **Semi-automated**: Present summary, wait for user, then load `references/report-mode.md`

**If audit failed (some stories re-queued)**:
- **Headless**: IMMEDIATELY load `references/step-01-discovery.md` to re-process failed stories. DO NOT ask user.
- Output: `"🔄 Audit found gaps → re-queuing {count} stories for re-processing..."`
- **Semi-automated**: Present failure summary, ask user for direction

**If dry-run mode and audit failed as expected**:
- Note: Evidence gaps during dry-run are expected. The gate is working correctly.
- Proceed to generate final dry-run summary report.
