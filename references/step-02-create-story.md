---
step: 02
name: create-story-context
description: Create comprehensive story context file if story is in backlog
---

# Step 02: Story Context Creation

## Goal
Create a comprehensive story file with all context needed for development, if the story is still in `backlog` status.

## Pre-requisites
- `{current_story}` is set from discovery step
- Sprint status loaded with story status
- Execution context available

## Check if Creation Needed

### First, check story status:
```yaml
Action: Get current status of {current_story} from sprint-status.yaml
```

### Status Decision:
- **If status == "backlog"**: Proceed with story creation
- **If status == "ready-for-dev"**: Skip to step 03 (development)
- **If status == "in-progress"**: Skip to step 03 (resume development)
- **If status == "review"**: Skip to step 05 (code review)
- **If status == "done"**: Mark as completed and go to next story
- **If status == "blocked"**: Record and skip to next story

## Story Creation Execution

### If creation needed:

#### 1. Load Create-Story Skill Context
```yaml
Action: Set {current_step} = "create-story"
Action: Save execution context
```

#### 2. Prepare Story Creation Parameters
- Extract epic number from story key (e.g., "1" from "1-3-editor-update-...")
- Extract story number from story key (e.g., "3" from "1-3-editor-update-...")
- Prepare story identifier format: "{epic_num}-{story_num}"

#### 3. Execute Create-Story Workflow

**Follow the `create-story` skill workflow**:

##### Phase A: Initialization
- Load config from `{project-root}/_bmad/bmm/config.yaml`
- Resolve paths:
  - `epics_file` = `{planning_artifacts}/epics*.md`
  - `prd_file` = `{planning_artifacts}/*prd*.md`
  - `architecture_file` = `{planning_artifacts}/*architecture*.md`
  - `ux_file` = `{planning_artifacts}/*ux*.md`
  - `default_output_file` = `{implementation_artifacts}/{story_key}.md`

##### Phase B: Load and Analyze Artifacts

**Critical**: EXHAUSTIVE ARTIFACT ANALYSIS - This prevents future developer mistakes!

```yaml
Action: Read fully and follow create-story's discover-inputs.md to load all input files
Action: Analyze epics file for story foundation

Epic Analysis for Epic {epic_num}:
- Epic objectives and business value
- ALL stories in this epic for cross-story context
- Our specific story's requirements, user story statement
- Technical requirements and constraints
- Dependencies on other stories/epics
- Source hints pointing to original documents

Story Foundation for {current_story}:
- User story statement (As a, I want, so that)
- Detailed acceptance criteria (BDD formatted)
- Technical requirements specific to this story
- Business context and value
- Success criteria
```

##### Phase C: Previous Story Analysis (if applicable)

```yaml
Check if story_num > 1:
  Action: Find previous_story_num: scan {implementation_artifacts} for the story file in epic {epic_num} with highest story number less than {story_num}
  Action: Load previous story file: {implementation_artifacts}/{epic_num}-{previous_story_num}-*.md
  
  Previous Story Intelligence:
  - Dev notes and learnings from previous story
  - Review feedback and corrections needed
  - Files that were created/modified and their patterns
  - Testing approaches that worked/didn't work
  - Problems encountered and solutions found
  - Code patterns established
  
  Action: Extract all learnings that could impact current story implementation
```

##### Phase D: Architecture Analysis

```yaml
Action: Systematically analyze architecture content for story-relevant requirements

Architecture Extraction:
- Technical Stack: Languages, frameworks, libraries with versions
- Code Structure: Folder organization, naming conventions, file patterns
- API Patterns: Service structure, endpoint patterns, data contracts
- Database Schemas: Tables, relationships, constraints relevant to story
- Security Requirements: Authentication patterns, authorization rules
- Performance Requirements: Caching strategies, optimization patterns
- Testing Standards: Testing frameworks, coverage expectations, test patterns
- Deployment Patterns: Environment configurations, build processes
- Integration Patterns: External service integrations, data flows

Action: Extract any story-specific requirements that the developer MUST follow
Action: Identify any architectural decisions that override previous patterns
```

##### Phase E: Create Comprehensive Story File

```yaml
Action: Initialize from create-story's template.md
Action: Create story file at {default_output_file}

Story File Structure:
1. Story Header
   - Story ID, title, status
   - References to PRD, epics, architecture

2. Story Requirements
   - User story statement
   - Detailed acceptance criteria (AC1, AC2, ...)
   - Scope and non-goals

3. Developer Context Section (MOST IMPORTANT)
   - Technical requirements
   - Architecture compliance rules
   - Library/framework requirements
   - File structure requirements
   - Testing requirements

4. Previous Story Intelligence (if applicable)
   - Learnings from related stories
   - Patterns established
   - Pitfalls to avoid

5. Project Context Reference
   - Link to project-context.md
   - Key coding standards
   - API conventions

6. Tasks/Subtasks
   - Breakdown of AC into actionable tasks
   - Checkboxes for tracking

7. Dev Agent Record
   - Debug Log (for implementation notes)
   - Completion Notes
   - File List (to be filled)
   - Change Log (to be filled)

8. Status
   - Current status: ready-for-dev
```

##### Phase F: Validate Story File

```yaml
Action: Validate the newly created story file against create-story's checklist.md
Action: Apply any required fixes before finalizing
Action: Save story document unconditionally
```

## Update Status and Context

### After successful story creation:

#### 1. Update Sprint Status
```yaml
Action: Load {sprint_status_path}
Action: Find development_status key matching {current_story}
Action: Verify current status is "backlog" (expected previous state)
Action: Update development_status[{current_story}] = "ready-for-dev"
Action: Update last_updated field to current date
Action: Save file, preserving ALL comments and structure including STATUS DEFINITIONS
```

#### 2. Update Execution Context
```yaml
Action: Set {current_step} = "create-story-complete"
Action: Update retry_counts if any retries occurred
Action: Update last_updated timestamp
Action: Save execution context to {execution_context_path}
```

## Failure Handling

### During Story Creation:

#### Retry Conditions:
1. **Missing artifact files**:
   - These require context, cannot be auto-retried
   - Action: Record as blocking point immediately
   - Context: List missing files and their expected paths

2. **Story not found in epics**:
   - These require context, cannot be auto-retried
   - Action: Record as blocking point immediately
   - Context: Include story key and epic number

3. **Template or reference files missing**:
   - Can be auto-recovered
   - Action: Try to create minimal story file without template
   - If fails after max retries: Record as blocking point

#### Maximum Retries: 2 attempts per step per story (consistent with all other steps)
- This means: 1 initial attempt + up to 2 retries = 3 total attempts
- Example:
  - Attempt 1: Initial try (fails)
  - Attempt 2: Retry #1 (fails)
  - Attempt 3: Retry #2 (fails) → Now mark as blocked

#### Retry Eligibility:
Only retry if:
- Issue is potentially auto-fixable (e.g., template missing)
- Not missing critical dependencies (e.g., epics file, PRD)
- Retry count for this step is less than 2

#### No Retry Conditions:
- Missing critical artifacts (epics, PRD, architecture)
- Story not found in epics
- Requirements clarification needed

## Blocking Points During This Step

### Record blocking point if:
```yaml
- story_key: {current_story}
- step: "create-story"
- timestamp: {current_datetime}
- reason: {clear description}
- context:
  - missing_files: [list]
  - epic_analysis: "Failed to extract story from epic"
  - error_messages: [list]
- retry_count: {number}
- status: "blocked"
```

## Communication

### In semi-automated mode:
```
Output: 📝 Story context created: {story_key}

Story File: {default_output_file}
Status: backlog → ready-for-dev

Key Context Included:
- User story and acceptance criteria
- Technical requirements from architecture
- Previous story learnings (if applicable)
- Testing guidelines

Next step: Development implementation

Would you like to:
1. Review the story file
2. Proceed to development
3. Pause execution
```

### In headless mode:
```
Output: ✅ Story created: {story_key} → ready-for-dev (自动继续)
Action: IMMEDIATELY load references/step-03-development.md. NO pause.
```

## Next Step

**After successful creation**:
- **Headless**: IMMEDIATELY load `references/step-03-development.md`. DO NOT ask user. DO NOT pause.
- **Semi-automated**: Present summary, wait for user, then load `references/step-03-development.md`

**If blocked**:
- Update execution context
- Save blocking points file
- Load `references/step-07-checkpoint.md` to decide next action

**If story was already ready-for-dev**:
- **Headless**: IMMEDIATELY load `references/step-03-development.md` directly
- **Semi-automated**: Present summary, then load `references/step-03-development.md`

## State Persistence

**Save execution context after**:
- Story file creation complete
- Status update to ready-for-dev
- Blocking point recording
- Before moving to next step

**Context fields to update**:
- `current_step`: "create-story" (during) or "create-story-complete" (after)
- `retry_counts`: Update if retries occurred
- `last_updated`: Timestamp

**Story file location**:
- Track at: `{implementation_artifacts}/{story_key}.md`
- Record in execution context if needed
