---
main_config: '{project-root}/_bmad/bmm/config.yaml'
---

# 端到端自动化开发工作流

**Goal**: Orchestrate a fully automated development pipeline from story creation to completion, with comprehensive state management, failure handling, and multi-model code review.

**Your Role**: You are a workflow orchestrator that coordinates multiple BMad skills, manages execution state, handles failures gracefully, and provides complete visibility into the development pipeline.

## WORKFLOW ARCHITECTURE

This workflow uses **step-file architecture** for disciplined execution:
- **Micro-file Design**: Each major phase has its own reference file
- **Just-In-Time Loading**: Only load the current step file
- **Sequential Enforcement**: Complete steps in order
- **State Tracking**: Persist progress via execution context file
- **Append-Only Building**: Build artifacts incrementally

### Step Processing Rules
1. **READ COMPLETELY**: Read the entire step file before acting
2. **FOLLOW SEQUENCE**: Execute sections in order
3. **WAIT FOR INPUT**: Halt at checkpoints in semi-automated mode
4. **LOAD NEXT**: When directed, read fully and follow the next step file

### Critical Rules (NO EXCEPTIONS)
- **NEVER** load multiple step files simultaneously
- **ALWAYS** read entire step file before execution
- **NEVER** skip steps or optimize the sequence
- **ALWAYS** follow the exact instructions in the step file
- **ALWAYS** save execution context after significant actions
- **HEADLESS**: NEVER ask questions. NEVER output option menus. NEVER pause.

### ANTI-SKIP GUARDRAIL (APPLIES TO ALL STORIES, ALL MODES)

CRITICAL: No story change is "too small to test." Every story MUST pass all steps.

Minimum evidence bar for EVERY completed story:
| Evidence | Required | Verified By |
|----------|----------|-------------|
| `npm run test:unit` executed, output in story file | YES | step-04 post-condition, step-05 pre-flight, step-06 pre-status, step-08 audit |
| `npm run lint` executed, output in story file | YES | step-04 post-condition, step-05 pre-flight, step-06 pre-status, step-08 audit |
| `npm run test:e2e` executed (if applicable) | CONDITIONAL | step-04 post-condition, step-08 audit |
| DoD checklist ALL [x] | YES | step-04 post-condition, step-05 pre-flight, step-06 pre-status, step-08 audit |
| Code Review Summary section exists | YES | step-06 pre-status, step-08 audit |

If a story misses ANY of the above, it is NOT DONE. Period.
These checks are enforced at 4 independent checkpoints — impossible to bypass all of them.

---

## INITIALIZATION SEQUENCE

### 1. Base Configuration Loading

Load and read full config from `{main_config}` and `{user_config}`:
- Primary user config: `{project-root}/_bmad/bmm/config.user.yaml`
- Fallback user config: `{project-root}/_bmad/config.user.yaml`

Resolve these variables:
- `project_name`, `user_name`
- `communication_language`, `document_output_language`, `user_skill_level`
- `date` as system-generated current datetime
- `project_context` = `**/project-context.md` (load if exists)

**Note**: Path variables like `planning_artifacts`, `implementation_artifacts`, `sprint_status_path` will be resolved DURING batch resolution (next step).

YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`.

### 2. Mode Detection

#### If `--headless` or `-H` in args:
- Set `{execution_mode} = "headless"`
- Set checkpoints: `after_story=false`, `after_review=false`, `on_blocking=false`
- No user interaction unless critical blocking points encountered

#### If `--semi` or `-S` in args:
- Set `{execution_mode} = "semi-automated"`
- Set checkpoints: `after_story=true`, `after_review=true`, `on_blocking=true`
- Wait for user confirmation at checkpoints

#### If `--dry-run` or `-D` in args:
- Set `{dry_run} = true`
- Note: Can be combined with `--headless` or `--semi`
- If no mode specified with `--dry-run`, default to headless

#### If no mode specified:
- Ask user to choose:
  1. **Fully Automated (Headless)** - No human intervention, auto-skip blocking points
  2. **Semi-Automated** - Checkpoints at critical stages

#### If `--resume` in args:
- Set `{resume_mode} = true`

#### If `--report-only` in args:
- Set `{report_only} = true`

### 3. Batch Resolution (NEW CRITICAL STEP)

**This step MUST be completed before proceeding. It sets all path variables.**

#### Load and follow `references/batch-resolution.md`

This step handles:

1. **Argument Detection**:
   - Check for `--batch` → set `{target_batch}`
   - Check for `--batch-path` → set `{target_batch_path}`
   - Check for `--story` → set `{target_story}`
   - Check for `--epic` → set `{target_epic}`

2. **Scan for Available Batches**:
   - Look in `{project-root}/_bmad-output/planning-artifacts/`
   - Each subdirectory is a candidate batch
   - Validate: must contain planning artifacts (PRD, epics, etc.)

3. **Interactive Batch Selection** (ALWAYS performed):
   - List all valid batches found
   - Show key information:
     - Batch name
     - Planning artifacts present
     - Implementation artifacts present
     - Sprint-status file format (yaml or markdown)
   - If `--batch` provided, highlight it as the primary match
   - Let user select (number or name)

4. **Fuzzy Matching for Naming Variations**:
   - Handle dot variations: `v.1.3.13` ↔ `v1.3.13`
   - Handle case variations: `editor-update` ↔ `Editor Update`
   - Handle implementation artifacts path variations

5. **Resolve All Paths** (based on selected batch):
   - `{selected_batch}` = name of selected batch
   - `{planning_artifacts}` = path to planning-artifacts/{batch-name}/
   - `{implementation_artifacts}` = path to implementation-artifacts/{batch-name-variant}/
   - `{sprint_status_path}` = path to sprint-status file
   - `{sprint_status_format}` = "yaml" or "markdown" (detected)
   - `{execution_context_path} = {implementation_artifacts}/auto-dev-execution-context.yaml`
   - `{blocking_points_path} = {implementation_artifacts}/blocking-points.yaml`

6. **Validate Sprint-Status File**:
   - If format is `markdown`: Load `references/markdown-sprint-status-parser.md` for parsing rules
   - If format is `yaml`: Parse as standard YAML
   - Verify it contains `development_status` section

7. **Special Case: Resume Mode**:
   - If `{resume_mode} = true`:
     - Check if execution context exists in selected batch
     - If exists and matches batch: Proceed to resume
     - If exists but different batch: Warn user, offer to switch
     - If not exists: Start fresh with warning

### 4. Target Filtering

#### If `--story <story-key>` in args:
- Extract `{target_story}` from args
- Validate the story exists in `{sprint_status_path}` (use appropriate parser based on format)
- If not found, record as blocking point and ask user

#### If `--epic <epic-number>` in args:
- Extract `{target_epic}` from args (e.g., "1" for Epic 1)
- Filter all stories in that epic for processing

### 5. Execution Context Setup

#### Create or load execution context:

```yaml
execution_id: "auto-dev-{timestamp}"
start_time: "{current_datetime}"
execution_mode: "{headless|semi-automated}"
selected_batch: "{selected_batch}"
target_story: "{story_key|null}"
target_epic: "{epic_number|null}"
stories_processed: []
stories_completed: []
stories_blocked: []
stories_skipped: []
current_story: null
current_step: null
retry_counts: {}
last_updated: "{current_datetime}"
checkpoint_settings:
  after_story: {true|false}
  after_review: {true|false}
  on_blocking: {true|false}
```

#### If `{resume_mode} = true`:
- Load existing context from `{execution_context_path}`
- Verify `selected_batch` matches context's batch
- If mismatch: Ask user to resolve
- If match: Use loaded context

#### Else:
- Create fresh context as above
- Save to `{execution_context_path}`

### 6. Blocking Points File Setup

#### Create or load blocking points file:

```yaml
blocking_points: []
resolved_points: []
last_updated: "{current_datetime}"
selected_batch: "{selected_batch}"
```

#### Save to `{blocking_points_path}`

### 7. Execution Log File Setup (NEW)

#### Initialize execution log document:
```yaml
Action: Create or load execution log
- Path: {implementation_artifacts}/execution-log-{execution_id}.md
- Content (if new file):
  # Execution Log: {execution_id}
  ====================================
  Start Time: {start_time}
  End Time: (in progress)
  Execution Mode: {execution_mode}
  Selected Batch: {selected_batch}

  ## Execution Summary
  - Total Stories: TBD
  - Completed: 0
  - Blocked: 0
  - Skipped: 0
  - Success Rate: TBD%

  ## Story Details
  (to be filled in as stories are processed)

  ## Blocking Points
  (to be filled in as blocking points occur)

  ## Final Report
  (to be filled in at completion)

- If resuming: Load existing log and continue appending
```

---

## ROUTING AFTER INITIALIZATION

### Check intent and route:

1. **If `{report_only} = true`**:
   - Load `references/report-mode.md`
   - Generate report based on selected batch
   - Do NOT execute any development tasks

2. **Else if `{resume_mode} = true`**:
   - Load `references/resume-mode.md`
   - Resume from last known state in selected batch

3. **Else if `{dry_run} = true`**:
   - Load `references/dry-run-mode.md`
   - Execute dry-run pipeline (skips real dev/test/review, preserves routing/evidence gates/audit)

4. **Else**:
   - Load `references/execution-mode.md`
   - Proceed to main execution pipeline

---

## MAIN EXECUTION PIPELINE

Read fully and follow `references/step-01-discovery.md` to begin the main execution loop.

**Important note for step-01-discovery.md**:
- Use `{sprint_status_format}` to determine how to parse sprint-status
- If format is `markdown`, use `references/markdown-sprint-status-parser.md` rules

---

## EXECUTION PHASES

### Phase 1: Story Discovery and Selection
- Read `{sprint_status_path}`
- Identify next story based on status and filters
- Skip already completed or blocked stories (unless resuming)
- Update `{current_story}` in execution context

### Phase 2: Story Context Creation (if needed)
- Check if story status is `backlog`
- If yes: Run `create-story` skill
- Update status to `ready-for-dev`
- Save execution context

### Phase 3: Development Implementation
- Check if story status is `ready-for-dev` or `in-progress`
- Run `dev-story` skill
- Track implementation progress
- Handle failures with retry logic
- Update status to `review` when complete

### Phase 4: Testing Validation
- Run unit tests (`npm run test:unit`)
- Run E2E tests if applicable (`npm run test:e2e`)
- Run linting (`npm run lint`)
- Verify all tests pass
- Record test results in story file
- Handle test failures with retry

### Phase 5: Multi-Model Code Review
- **Review 1**: Primary AI review (current model)
  - Use `code-review` skill
  - Record findings in story file
  
- **Review 2**: Alternative AI perspective
  - Simulate different model by reviewing from different angle
  - Focus on: security, performance, edge cases
  - Compare with Review 1 findings

- **Review Comparison**:
  - If both agree on outcome: Proceed
  - If disagree: Record as critical blocking point
  - If changes requested: Determine if auto-fixable

- **Review Outcome Handling**:
  - **Approve**: Mark story as `done`
  - **Auto-fixable changes**: Apply fixes and re-review
  - **Non-auto-fixable**: Record as blocking point

### Phase 6: Status Update and Reporting
- Update `{sprint_status_path}` with new status
- Update execution context:
  - Add to `stories_completed` or `stories_blocked`
  - Add to `stories_processed`
  - Clear `current_story`
  - Increment retry counts if applicable

### Phase 7: Checkpoint (Semi-Automated Mode Only)
- If `checkpoint_settings.after_story = true`:
  - Present summary to user
  - Ask for confirmation to continue
  - Allow user to:
    - Continue to next story
    - Review blocking points
    - Pause execution
    - Exit workflow

### Phase 8: Completion Audit (ALL Modes — NEW)
- After all stories processed, automatically run audit
- For EACH story in `stories_completed`:
  - Verify test output exists in story file
  - Verify lint output exists in story file
  - Verify code review summary exists
  - Verify DoD checklist is all [x]
- If any story fails: revert to in-progress, re-queue, GO BACK to step-01
- If all pass: generate final report and exit

---

## FAILURE HANDLING FRAMEWORK

### Retry Policy Implementation

#### Maximum Retries: 2 per step per story

#### When to Retry:
1. **Test Failures**:
   - Non-critical test failures
   - Flaky tests
   - Environment-related test issues
   
2. **Development Issues**:
   - Minor implementation bugs
   - Missing imports
   - Simple syntax errors
   
3. **Code Review Auto-Fixable**:
   - Naming convention issues
   - Code formatting
   - Missing documentation
   - Simple refactoring needs

#### When NOT to Retry:
1. **Missing Dependencies**:
   - Required libraries not installed
   - Configuration files missing
   - Environment variables not set

2. **Architectural Decisions**:
   - Need to choose between approaches
   - Design pattern selection
   - API design questions

3. **Requirements Clarification**:
   - Ambiguous acceptance criteria
   - Missing business context
   - Conflicting requirements

4. **External Service Issues**:
   - API endpoints unavailable
   - Authentication failures
   - Third-party service downtime

### Retry Execution Flow

```
Step Failure Detected
        │
        ▼
┌───────────────┐
│ Get Retry     │
│ Count for     │
│ Story+Step    │
└───────┬───────┘
        │
        ▼
    retries < 2?
        │
   ┌────┴────┐
   │         │
  Yes        No
   │         │
   ▼         ▼
Increment   Record
Retry       as
Count       Blocking
   │         Point
   ▼         │
Attempt    Mark
Auto-Fix   Story
   │         as
   ▼         Blocked
Re-run    │
Step      │
   │       ▼
   │    Save
   │    Context
   │       │
   ▼       ▼
Success?  Halt
   │       │
 ┌─┴─┐    User
Yes  No   Intervention
 │    │
 │    ▼
 │  More
 │  retries?
 │    │
 └────┘
```

### Blocking Point Recording

#### When a blocking point is encountered:

1. **Record immediately** to `{blocking_points_path}`:
```yaml
- story_key: "{current_story}"
  step: "{current_step}"  # create-story | development | testing | review
  timestamp: "{current_datetime}"
  reason: "{clear description of why blocked}"
  context:
    - acceptance_criteria: ["AC1", "AC2"]
    - related_files: ["file1.js", "file2.vue"]
    - error_messages: ["error1", "error2"]
    - suggested_actions: ["action1", "action2"]
  retry_count: {number}
  status: "blocked"  # blocked | resolved | skipped
  resolution: null  # filled when resolved
```

2. **Update execution context**:
   - Add to `stories_blocked` if not already there
   - Set `retry_counts[current_story][current_step]`
   - Save `{execution_context_path}`

3. **In semi-automated mode**:
   - Present blocking point to user
   - Ask for:
     - Resolution information
     - Skip this story
     - Pause execution
     - Exit workflow

4. **In headless mode**:
   - Continue to next available story
   - Mark current story as blocked
   - Record for later resolution

---

## STATE PERSISTENCE

### When to Save Execution Context:
- After story selection
- After each step completion
- After retry attempts
- After blocking point recording
- At checkpoints
- Before exiting workflow

### Execution Log Location:
- Execution log is maintained at `{implementation_artifacts}/execution-log-{execution_id}.md`
- Logging rules defined in `references/execution-log.md`

### Execution Context Fields to Update:
- `current_story`: Current story being processed
- `current_step`: Current phase (create-story/development/testing/review)
- `stories_processed`: All stories that have been attempted
- `stories_completed`: Stories successfully finished
- `stories_blocked`: Stories with unresolved blocking points
- `stories_skipped`: Stories intentionally skipped
- `retry_counts`: Nested object tracking retries per story per step
- `last_updated`: Timestamp of last save

---

## FINALIZATION

### When All Stories Processed:

1. **Run Completion Audit**:
   - Load `references/step-08-completion-audit.md`
   - Verify ALL completed stories have required evidence (test output, lint output, code review, DoD)
   - Re-open any stories that fail the audit
   - If re-opened: GO BACK to step-01-discovery.md for re-processing

2. **Generate Final Report** (only if audit passes with no re-opened stories):
   - Load `references/report-mode.md`
   - Create comprehensive execution summary
   - Include:
     - Total stories processed
     - Stories completed (audit-verified)
     - Stories blocked
     - Stories skipped
     - Blocking points list
     - Execution duration
     - Audit results
     - Recommendations for next steps

3. **Save All Artifacts**:
   - Final execution context
   - Final blocking points file
   - Execution report

4. **Communicate Results**:
   - Summary of what was accomplished
   - Blocking points requiring attention
   - Suggested next actions
   - How to resume if needed

---

## WORKFLOW STEP FILES

The main execution is divided into these step files (loaded sequentially):

1. `references/step-01-discovery.md` - Story discovery and selection
2. `references/step-02-create-story.md` - Create story context if needed
3. `references/step-03-development.md` - Development implementation
4. `references/step-04-testing.md` - Test execution and validation (with evidence gate)
5. `references/step-05-code-review.md` - Multi-model code review (with pre-flight test check)
6. `references/step-06-status-update.md` - Update status and context (with pre-done evidence check)
7. `references/step-07-checkpoint.md` - Checkpoint and loop control
8. `references/step-08-completion-audit.md` - Final audit of all completed stories (NEW)

Each step file handles its own error conditions, retry logic, and state updates.
