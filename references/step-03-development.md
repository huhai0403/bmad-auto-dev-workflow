---
step: 03
name: development
description: Execute story implementation following dev-story workflow
---

# Step 03: Development Implementation

## Goal
Execute the story implementation following the dev-story workflow, with proper error handling and retry logic.

## Pre-requisites
- `{current_story}` is set
- Story status is `ready-for-dev` or `in-progress`
- Story file exists at `{implementation_artifacts}/{story_key}.md`
- Execution context available

## Load Story Context

### 1. Find and Load Story File
```yaml
Action: Find story file matching pattern: {implementation_artifacts}/{current_story}*.md
Action: Read COMPLETE story file from discovered path
Action: Parse sections: Story, Acceptance Criteria, Tasks/Subtasks, Dev Notes, Dev Agent Record, File List, Change Log, Status
Action: Load comprehensive context from story file's Dev Notes section
Action: Extract developer guidance from Dev Notes: architecture requirements, previous learnings, technical specifications
```

### 2. Check for Review Continuation
```yaml
Action: Check if "Senior Developer Review (AI)" section exists in the story file
Action: Check if "Review Follow-ups (AI)" subsection exists under Tasks/Subtasks

If Senior Developer Review section exists:
  Action: Set review_continuation = true
  Action: Extract from "Senior Developer Review (AI)" section:
    - Review outcome (Approve/Changes Requested/Blocked)
    - Review date
    - Total action items with checkboxes
    - Severity breakdown (High/Med/Low counts)
  Action: Count unchecked [ ] review follow-up tasks
  Action: Store list of unchecked review items as pending_review_items
Else:
  Action: Set review_continuation = false
  Action: Set pending_review_items = empty
```

### 3. Identify First Incomplete Task
```yaml
Action: Identify first incomplete task (unchecked [ ]) in Tasks/Subtasks
Action: If review_continuation is true: prioritize review follow-up tasks first

If no incomplete tasks:
  Action: Goto step 04 (testing)
```

## Update Status to In-Progress

### 1. Update Sprint Status
```yaml
Action: Load {sprint_status_path}
Action: Find development_status key matching {current_story}
Action: Get current status value

If current status == "ready-for-dev" OR review_continuation == true:
  Action: Update the story in sprint status to = "in-progress"
  Action: Update last_updated field to current date
  Output: 🚀 Starting work on story {current_story}
          Status updated: {previous_status} → in-progress
Elif current status == "in-progress":
  Output: ⏯️ Resuming work on story {current_story}
          Story is already marked in-progress
Else:
  Output: ⚠️ Unexpected story status: {current_status}
          Expected ready-for-dev or in-progress. Continuing anyway...
```

### 2. Update Execution Context
```yaml
Action: Set {current_step} = "development"
Action: Save execution context
```

## Development Implementation

### 1. Plan Implementation
```yaml
Action: Review the current task/subtask from the story file
Action: Plan implementation following red-green-refactor cycle

Implementation Plan:
- RED PHASE: Write FAILING tests first
- GREEN PHASE: Implement MINIMAL code to make tests pass
- REFACTOR PHASE: Improve code structure while keeping tests green

Action: Document technical approach and decisions in Dev Agent Record → Implementation Plan
```

### 2. Execute Implementation

#### RED Phase (Write Failing Tests First)
```yaml
Action: Record task start time: {task_start_time}
Action: Identify test requirements from acceptance criteria
Action: Determine test framework from project structure:
  - Unit tests: Jest (npm run test:unit)
  - E2E tests: Playwright (npm run test:e2e)

Action: Write failing tests for the task/subtask functionality:
  - Unit tests: Create tests in tests/unit/ directory
  - Follow existing patterns (e.g., tests/unit/htmlToJSON.spec.js)
  - Test naming: describe blocks, test functions with clear descriptions
  - Include: expected behavior, edge cases, error conditions

Action: Confirm tests fail before implementation - this validates test correctness
```

#### GREEN Phase (Implement Minimal Code)
```yaml
Action: Implement MINIMAL code to make tests pass
Action: Follow project patterns and conventions:
  - Use project-context.md guidelines
  - Use $httpWithMsg for API calls
  - Follow component naming conventions
  - Use existing utility functions and patterns

Action: Handle error conditions and edge cases as specified in task/subtask
Action: Run tests to confirm they now pass
```

#### REFACTOR Phase (Improve Code Structure)
```yaml
Action: Improve code structure while keeping tests green
Action: Ensure code follows architecture patterns and coding standards from Dev Notes
Action: Apply refactoring best practices:
  - DRY (Don't Repeat Yourself)
  - Clean naming
  - Proper abstraction levels
  - Consistent formatting
```

### 3. Handle Implementation Issues

#### Retry Logic:
```yaml
If implementation fails:
  Action: Get current retry count for {current_story}.development from execution_context
  Action: Increment retry count by 1
  
  If retry_count < 2:
    Action: Analyze failure reason
    Action: Attempt auto-fix:
      - Check for missing imports
      - Check for syntax errors
      - Check for incorrect API usage
      - Reference similar working code in project
    Action: Save retry count to execution context
    Action: Retry implementation
  Else:
    Action: Record as blocking point
    Action: Mark story as blocked
    Action: Proceed to checkpoint or next story
```

#### Task Time Tracking:
```yaml
For EACH task executed, record timing:
  Action: Before starting task → Record {task_start_time}
  Action: After completing task → Record {task_end_time}
  Action: Calculate {task_duration} = {task_end_time} - {task_start_time}
  Action: APPEND to execution log task breakdown table:
    | {task_index} | {task_description} | {task_start_time} | {task_end_time} | {task_duration} | {status} |
  Action: Track cumulative task times for per-story duration calculation
```

#### Blocking Point Recording:
```yaml
If unable to implement after 2 retries:
  Action: Record blocking point:
    - story_key: {current_story}
    - step: "development"
    - reason: "Implementation failed after 2 retries"
    - context:
      - error_messages: [list of errors]
      - task_description: [current task]
      - attempted_fixes: [what was tried]
    - retry_count: 2
    - status: "blocked"
  
  Action: Update execution context:
    - Add to stories_blocked
    - Set current_story = null
    - Save context
  
  Action: Goto step 07 (checkpoint)
```

## Update Story File

### After Task Completion:
```yaml
Action: Verify ALL tests for this task/subtask ACTUALLY EXIST and PASS 100%
Action: Confirm implementation matches EXACTLY what the task/subtask specifies
Action: Validate that ALL acceptance criteria related to this task are satisfied
Action: Run full test suite to ensure NO regressions introduced

If review_continuation is true and task is review follow-up:
  Action: Mark task checkbox [x] in "Tasks/Subtasks → Review Follow-ups (AI)" section
  Action: Find matching action item in "Senior Developer Review (AI) → Action Items" section
  Action: Mark that action item checkbox [x] as resolved
  Action: Add to Dev Agent Record → Completion Notes: "✅ Resolved review finding [{{severity}}]: {{description}}"

If ALL validation passes:
  Action: Mark the task (and subtasks) checkbox with [x]
  Action: Update File List section with ALL new, modified, or deleted files
  Action: Add completion notes to Dev Agent Record summarizing what was implemented and tested
  Action: Save the story file
```

## Check for More Tasks

### After Task Completion:
```yaml
Action: Determine if more incomplete tasks remain

If more tasks remain:
  Action: Identify next incomplete task
  Action: Goto implementation phase for next task
Else:
  Action: Goto step 04 (testing)
```

## Communication

### In semi-automated mode:
```
Output: 🔧 Implementing: {current_story}

Current Task: {task_description}

Progress:
- Tasks completed: {completed_count} / {total_count}
- Tests written: {test_count}
- Files modified: {file_list}

Would you like to:
1. Continue to next task
2. Review current changes
3. Pause execution
```

### In headless mode:
```
Output: 🔧 Developing: {current_story} - Task {current_task_num}/{total_tasks}
```

## Next Step

**After all tasks completed**:
- **Headless**: IMMEDIATELY load `references/step-04-testing.md`. DO NOT ask user. DO NOT pause.
- **Semi-automated**: Present summary, then load `references/step-04-testing.md`
- **DO NOT skip step-04 UNLESS the story file's "## Test Output Details" section already contains actual command output.** Even if you wrote tests during development, you MUST execute step-04 to run the full test suite and capture output.

**If blocked**:
- Load `references/step-07-checkpoint.md` to decide next action

**If user pauses**:
- Save execution context
- Generate pause report
- Wait for user input

## 流程记录 (Execution Log)

### 记录开发实现步骤
```yaml
Action: APPEND to Execution Log (NEVER overwrite existing content)
- Log Path: {execution_log_path}
- Story: {current_story}
- Step: Development
- Step Start Time: {step_start_time}
- Step End Time: {step_end_time}
- Step Duration: {step_duration}
- Status: {success / failed}
- Details:
  - Tasks Completed: {completed_count}/{total_count}
  - Per-Task Breakdown:
    | Task | Start Time | End Time | Duration | Status |
    | {task_1} | {t1_start} | {t1_end} | {t1_duration} | ✅/❌ |
    | {task_2} | {t2_start} | {t2_end} | {t2_duration} | ✅/❌ |
  - Review Continuation: {yes/no}
  - Files Modified: {file_list}
  - Retry Count: {retry_count}
  - Estimated Tokens This Step: ~{tokens_estimate} (approximate)
- APPEND to execution log
```

---

## State Persistence

**Save execution context after**:
- Each task completion
- Each retry attempt
- Blocking point recording
- Before moving to next step

**Context fields to update**:
- `current_step`: "development" (during) or "development-complete" (after)
- `retry_counts`: Update if retries occurred
- `last_updated`: Timestamp
