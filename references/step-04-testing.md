---
step: 04
name: testing
description: Execute comprehensive test suite and validate implementation
---

# Step 04: Testing Validation

## Goal
Execute comprehensive tests to validate the implementation, including unit tests, E2E tests, and code quality checks. **NO SKIPPING - TESTS MUST BE RUN**.

## Pre-requisites
- `{current_story}` is set
- Story status is `in-progress` (just finished development)
- Story file exists with implementation notes
- Development tasks marked as complete

## PRE-CONDITION CHECK (MANDATORY — DO NOT SKIP)

Before executing any test commands, verify the story file state:

```yaml
Action: OPEN the story file for {current_story}
Action: CHECK for "## Test Execution Summary" section

If "## Test Execution Summary" already contains ACTUAL command output (not placeholder):
  Action: Log: "Tests already executed for this story. Skipping re-execution."
  Action: Proceed to "Update Status to Review" section below
  Action: DO NOT re-run tests unnecessarily

If "## Test Execution Summary" is EMPTY, MISSING, or contains placeholder text like "(to be filled)":
  Action: Proceed with test execution below
```

## POST-CONDITION EVIDENCE GATE (MANDATORY — BLOCK IF FAILS)

After ALL tests are executed, verify evidence exists in the story file BEFORE proceeding:

```yaml
Action: OPEN the story file for {current_story}
Action: VERIFY EVERY item — if ANY fails, STAY in step-04:

  [ ] "## Test Output Details" section EXISTS
  [ ] "## Test Output Details" contains ACTUAL `npm run test:unit` command output (not placeholder)
  [ ] "## Test Output Details" contains exit codes (0 or non-0)
  [ ] "## Lint Output Details" section EXISTS
  [ ] "## Lint Output Details" contains ACTUAL `npm run lint` command output (not placeholder)
  [ ] "## Lint Output Details" contains exit code and error/warning counts
  [ ] "## E2E Output Details" section EXISTS (if E2E tests were applicable)
  [ ] "Definition-of-Done Checklist" ALL items are `[x]`

If ANY checkbox is UNCHECKED:
  → STAY in step-04. DO NOT advance to step-05.
  → Output: "⛔ POST-CONDITION FAILED: missing evidence for {item}. Re-running tests..."
  → Re-execute the missing test type

If ALL checkboxes are CHECKED:
  → Proceed to "Update Status to Review" section
```

## ⛔ ANTI-SKIP GUARDRAIL — READ FIRST

**There is NO SUCH THING as a change too small to test.** Even comment-only or CSS-only changes require linting at minimum.

Minimum bar for EVERY story before this step is considered complete:
| Requirement | Evidence Location |
|-------------|-------------------|
| `npm run lint` was executed and recorded | Story file: `## Lint Output Details` |
| `npm run test:unit` was executed and recorded | Story file: `## Test Output Details` |
| `npm run test:e2e` was executed (if applicable) and recorded | Story file: `## E2E Output Details` |
| DoD checklist has ALL `[x]` | Story file: `Definition-of-Done Checklist` |

**If a story misses ANY of the above, it is NOT DONE. Period.**

## CRITICAL RULES - MUST FOLLOW

1. **NEVER SKIP TESTS** - All tests must be executed for every story
2. **MUST RUN ACTUAL TEST COMMANDS** - Do not just "talk about" running tests. Run the actual shell commands.
3. **CAPTURE FULL OUTPUT** - Record complete command output (copy-paste), not just summaries
4. **STRICT DoD VALIDATION** - If DoD fails, story is blocked
5. **NO FALSIFYING RESULTS** - All test results must be truthfully recorded
6. **EVIDENCE MANDATORY** - DoD checklist items #3, #4, #5, #6, #7 require ACTUAL COMMAND OUTPUT in the story file

---

## Test Strategy

### Based on project structure:
- **Unit tests**: Jest (`npm run test:unit`)
- **E2E tests**: Playwright (`npm run test:e2e`)
- **Code quality**: ESLint (`npm run lint`)

---

## Test Execution Flow - MUST EXECUTE IN ORDER

### 1. Determine Test Scope

#### From Story Acceptance Criteria:
```yaml
Action: Review story acceptance criteria
Action: Identify which tests are required:
  - Unit tests for business logic
  - Integration tests for component interactions
  - E2E tests for critical user flows
  - Edge case tests from AC

Action: Check existing test patterns in project:
  - tests/unit/ for unit tests
  - tests/e2e/ for E2E tests
  - tests/fixtures/ for test data
```

---

### 2. Run Unit Tests - MANDATORY

#### CRITICAL: MUST ACTUALLY EXECUTE THE TESTS
```yaml
Action: RUN THIS EXACT COMMAND NOW: npm run test:unit
Action: DO NOT PROCEED UNTIL COMMAND HAS FINISHED
Action: CAPTURE THE FULL, COMPLETE OUTPUT OF THE COMMAND
```

#### Capture Detailed Output:
```yaml
Action: Record EVERYTHING from the test output:
  - Full command executed: "npm run test:unit"
  - Exit code (0 = pass, non-0 = fail)
  - Complete console output (all lines)
  - Number of tests total
  - Number of tests passed
  - Number of tests failed
  - Number of tests skipped
  - Any error messages, stack traces
  - Code coverage summary (if available)
  - Time taken to run tests
```

#### Analyze Results - NO SHORTCUTS
```yaml
If exit code = 0 AND ALL tests pass (no failures):
  Action: Record success in story file with FULL DETAILS
  Action: Proceed to E2E tests

If exit code != 0 OR ANY tests fail:
  Action: RECORD EVERY FAILURE DETAIL
  Action: Analyze each failure reason
  Action: Check if failures are related to current story changes
  Action: Determine if auto-fixable
  
  If auto-fixable (syntax errors, simple bugs):
    Action: Increment retry count for testing step
    If retry_count < 2:
      Action: Attempt auto-fix based on error messages
      Action: RE-RUN npm run test:unit AGAIN
      Action: Verify fixes worked
    Else:
      Action: Record as blocking point
      Action: Mark for review continuation
      
  If not auto-fixable (logic errors, missing dependencies):
    Action: Record as blocking point
    Action: Mark story for review with changes requested
    Action: DO NOT PROCEED PAST THIS STEP UNTIL RESOLVED
```

---

### 3. Run E2E Tests - IF APPLICABLE

#### Determine if E2E tests needed:
```yaml
Action: Check if story has user journey acceptance criteria
Action: Check if E2E tests exist for this feature area
Action: Check if Playwright is configured (playwright.config.js exists)
```

#### If E2E tests applicable - MUST EXECUTE
```yaml
Action: RUN THIS EXACT COMMAND: npm run test:e2e
Action: DO NOT PROCEED UNTIL COMMAND HAS FINISHED
Action: CAPTURE FULL OUTPUT

Capture:
  - Full command executed
  - Exit code
  - Complete console output
  - Test results (passed/failed/skipped)
  - Screenshots/videos of failures (if generated)
  - Network logs if applicable

Analyze E2E Results:
  - Same strict rules as unit tests
  - Any failure = must fix or block
  - Apply retry logic up to 2 times
```

---

### 4. Run Code Quality Checks - MANDATORY

#### Execute Linting - MUST RUN
```yaml
Action: RUN THIS EXACT COMMAND: npm run lint
Action: DO NOT PROCEED UNTIL COMMAND HAS FINISHED
Action: CAPTURE FULL OUTPUT

Capture:
  - Full command executed
  - Exit code
  - Complete console output
  - Number of errors
  - Number of warnings
  - Specific lint issues with file paths and line numbers
```

#### Analyze Lint Results - ZERO TOLERANCE FOR ERRORS
```yaml
If lint errors exist (exit code != 0):
  Action: Check if npm run lint:fix exists
  Action: If exists, RUN: npm run lint:fix
  Action: Then RE-RUN: npm run lint to verify fixes
  
  If errors STILL remain after fix:
    Action: Analyze each error
    Action: Determine if critical or stylistic
    
    If critical (security, bugs, syntax):
      Action: RECORD AS BLOCKING POINT
      Action: MUST FIX BEFORE PROCEEDING
      Action: DO NOT CONTINUE PAST THIS STEP
      
    If stylistic (formatting, naming):
      Action: Document if intentional deviation
      Action: Still record in story file
```

---

### 5. Validate Acceptance Criteria - MANDATORY

#### Review Each AC - ONE BY ONE
```yaml
Action: For EVERY acceptance criterion in story file:
  Action: VERIFY implementation satisfies the AC
  Action: CHECK if tests cover the AC
  Action: CHECK if edge cases are handled
  
  RECORD validation for EACH AC:
    - AC ID and description
    - Status: satisfied / partially satisfied / not satisfied
    - Evidence: specific test names, code references, or verification steps
```

#### Definition of Done Validation - MANDATORY CHECKLIST
```yaml
Action: GO THROUGH THIS CHECKLIST ONE BY ONE
Action: MARK EACH ITEM AS [x] COMPLETED OR [ ] INCOMPLETE
Action: NO SKIPPING

Definition-of-Done Checklist:
  1. [ ] All tasks/subtasks marked complete with [x] in story file
  2. [ ] Implementation satisfies EVERY Acceptance Criterion
  3. [ ] Unit tests for core functionality added/updated AND PASSED
  4. [ ] Integration tests for component interactions added when required AND PASSED
  5. [ ] End-to-end tests for critical flows added when story demands them AND PASSED
  6. [ ] ALL tests pass (no regressions, new tests successful) - VERIFIED BY ACTUAL TEST RUN
  7. [ ] Code quality checks pass (linting) - VERIFIED BY ACTUAL LINT RUN
  8. [ ] File List includes EVERY new/modified/deleted file
  9. [ ] Dev Agent Record contains implementation notes
  10. [ ] Change Log includes summary of changes
  11. [ ] Only permitted story sections were modified

Action: IF ANY ITEM IS MARKED [ ] INCOMPLETE:
  - Story is BLOCKED
  - Record as blocking point
  - DO NOT PROCEED TO CODE REVIEW
  - Fix the issue before continuing
```

---

## Update Story File - MANDATORY

### Record COMPLETE Test Results
```yaml
Action: UPDATE story file with FULL test results - NO SUMMARIES ONLY

Add to Dev Agent Record section:
  ## Test Execution Summary
  - Date/Time: {current_datetime}
  - Unit Tests:
    - Command: npm run test:unit
    - Exit Code: {0 or non-0}
    - Total: {X}
    - Passed: {X}
    - Failed: {X}
    - Skipped: {X}
    - Coverage: {summary if available}
  - E2E Tests (if applicable):
    - Command: npm run test:e2e
    - Exit Code: {0 or non-0}
    - Total: {X}
    - Passed: {X}
    - Failed: {X}
    - Skipped: {X}
  - Linting:
    - Command: npm run lint
    - Exit Code: {0 or non-0}
    - Errors: {X}
    - Warnings: {X}
  - DoD Checklist:
    - [Copy the full checklist with [x]/[ ] marks]

  ## Test Output Details
  ```
  {PASTE FULL UNIT TEST OUTPUT HERE}
  ```

  ## Lint Output Details
  ```
  {PASTE FULL LINT OUTPUT HERE}
  ```

  ## E2E Output Details (if applicable)
  ```
  {PASTE FULL E2E OUTPUT HERE}
  ```

  ## Failed Tests Details (if any)
  - Test name: {name}
    - Error message: {message}
    - File: {file}
    - Line: {line}
    - Root cause analysis: {analysis}
    - Fix applied (if any): {fix}

Action: Update File List with ANY test files created/modified
Action: Update Change Log with test-related changes
Action: SAVE STORY FILE NOW
```

---

## Failure Handling - NO COMPROMISE

### Retry Policy for Testing:
```yaml
Maximum retries: 2 per test type per story

Retry conditions:
- Simple test failures (syntax errors, missing imports)
- Flaky tests (intermittent failures)
- Environment issues (test setup problems)

NO retry conditions:
- Logic errors requiring design changes
- Missing test dependencies
- Test infrastructure issues
```

### Blocking Point Recording - IF TESTS FAIL
```yaml
If tests fail after 2 retries OR DoD validation fails:
  Action: RECORD BLOCKING POINT WITH FULL DETAILS
  Action: Story status REMAINS in-progress
  Action: DO NOT UPDATE TO "review"
  Action: Record in blocking points file:
    - story_key: {current_story}
    - step: "testing"
    - reason: "Tests failed or DoD not satisfied after maximum retries"
    - context:
      - test_type: "unit" / "e2e" / "lint" / "dod"
      - failed_tests: [complete list]
      - error_messages: [full error messages]
      - dod_items_failed: [checklist items that failed]
      - attempted_fixes: [what was tried]
    - retry_count: {number}
    - status: "blocked"
  
  Action: Update execution context
  Action: Decide next step based on mode:
    - Headless: Record blocking point and proceed to next story
    - Semi-automated: Show user full details, ask for guidance
```

---

## Update Status to Review - ONLY IF ALL TESTS PASS

### After ALL Tests PASS AND DoD VALIDATES:
```yaml
Action: CONFIRM:
  - All unit tests passed (exit code 0)
  - All E2E tests passed (if applicable)
  - Linting passed (exit code 0, or only stylistic warnings)
  - DoD checklist 100% complete with all [x]

IF ALL CONFIRMED YES:
  Action: Update story Status to: "review"
  Action: Load {sprint_status_path}
  Action: Find development_status key matching {current_story}
  Action: Verify current status is "in-progress"
  Action: Update development_status[{current_story}] = "review"
  Action: Update last_updated field to current date
  Action: SAVE sprint status file

IF ANYTHING FAILED:
  Action: DO NOT UPDATE STATUS
  Action: STAY IN "in-progress" OR MARK AS "blocked"
  Action: RECORD BLOCKING POINT
```

---

## Communication

### In semi-automated mode:
```
Output: 🧪 Testing complete: {current_story}

Test Results:
- Unit Tests: {passed}/{total} passed (Exit code: {exit_code})
- E2E Tests: {passed}/{total} passed (if applicable)
- Linting: {errors} errors, {warnings} warnings

DoD Validation: {PASSED / FAILED}
- Checklist completion: {X}/11 items

Would you like to:
1. Review detailed test output
2. Proceed to code review (ONLY IF ALL TESTS PASSED)
3. Pause execution
```

### In headless mode:
```
If ALL PASSED:
  Output: ✅ Tests PASSED: {current_story} → review (自动继续)
  Output:    - Unit: {passed}/{total}
  Output:    - Lint: {errors} errors
  Output:    - DoD: {X}/11 complete

If ANY FAILED:
  Output: ❌ Tests FAILED: {current_story} - Recording blocking point (自动继续)
  Output:    - Failed: {X} tests, {Y} lint errors
  Output:    - Blocked and moving to next story
```

---

## 流程记录 (Execution Log)

### 记录测试步骤 - MUST INCLUDE FULL DETAILS
```yaml
Action: Record Testing in Execution Log
- Log Path: {implementation_artifacts}/execution-log-{execution_id}.md
- Story: {current_story}
- Step: Testing
- Timestamp: {current_datetime}
- Status: {success / failed}
- Details:
  - Unit Tests: {passed}/{total} passed (Exit: {exit_code})
  - E2E Tests: {passed}/{total} passed (if applicable)
  - Linting: {errors} errors, {warnings} warnings
  - DoD: {X}/11 items complete
- Save to execution log
```

---

## Next Step

### STRICT RULES FOR PROCEEDING
```yaml
**ONLY IF POST-CONDITION EVIDENCE GATE PASSES (ALL CHECKBOXES [x])**:
  - **Headless mode**: GOTO step-05 DIRECTLY. DO NOT pause. DO NOT ask. Output single line:
    "✅ Tests: {passed}/{total} unit, {errors} lint errors → auto-continuing to code review..."
  - **Semi-automated mode**: Present results summary, wait for user choice, then load `references/step-05-code-review.md`

**IF POST-CONDITION EVIDENCE GATE FAILS (ANY CHECKBOX [ ])**:
  - STAY in step-04. DO NOT proceed to step-05. DO NOT proceed to step-06.
  - Re-execute the missing/failed test type
  - If retries exhausted (2 attempts):
    - **Headless mode**: Record blocking point, then GOTO step-07 directly
    - **Semi-automated mode**: Show user full details, then load `references/step-07-checkpoint.md`

**UNDER NO CIRCUMSTANCES skip to code review with failed/missing tests or missing evidence.**
```

**IMPORTANT — HEADLESS MODE MUST NOT output option menus or ask any questions.**

**IMPORTANT — DO NOT advance past this step unless the POST-CONDITION EVIDENCE GATE has ALL checkboxes [x].**

---

## State Persistence

**Save execution context after**:
- EVERY test command execution
- EVERY retry attempt
- Blocking point recording
- Status update (ONLY IF ALL TESTS PASSED)

**Context fields to update**:
- `current_step`: "testing" (during) or "testing-complete" (after)
- `retry_counts`: Update if retries occurred
- `last_updated`: Timestamp
- `test_results`: Store full test results summary
