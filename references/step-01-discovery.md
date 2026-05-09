---
step: 01
name: story-discovery
description: Discover and select the next story to process
---

# Step 01: Story Discovery and Selection

## Goal
Identify the next story to process based on status, filters, and execution context.

## Pre-requisites
- Execution context loaded from `{execution_context_path}`
- `{selected_batch}` is set from batch resolution
- `{sprint_status_path}` is set from batch resolution
- `{sprint_status_format}` is set: "yaml" or "markdown"
- Blocking points file loaded from `{blocking_points_path}`

## Execution Flow

### 1. Load and Parse Sprint Status

**Critical**: MUST read COMPLETE `{sprint_status_path}` file from start to end to preserve order.

#### Branch by Format:

```yaml
If {sprint_status_format} == "yaml":
  Action: Load the FULL file: {sprint_status_path}
  Action: Read ALL lines from beginning to end - do not skip any content
  Action: Parse the development_status section completely as YAML
  Action: development_status = parsed_yaml["development_status"]

If {sprint_status_format} == "markdown":
  Action: Load `references/markdown-sprint-status-parser.md` and follow its instructions
  Action: Load the FULL file: {sprint_status_path}
  Action: Parse using markdown table rules:
    1. Find "## Development Status" section
    2. Find all "### Epic X: ..." subsections
    3. For each epic, parse the markdown table
    4. Extract: Key, Story, Status, Sprint, Priority columns
    5. Filter out epic keys (epic-1, epic-2, etc.)
    6. Create file_pattern for each story (key + "-*")
  Action: development_status = parsed_markdown_data (in compatible format)
  Action: Also store:
    - parsed_stories: full parsed data with file_patterns
    - epics_info: epic-level data for reference
```

#### After Parsing (Both Formats):

```yaml
Action: Ensure development_status is in a consistent format:

Format expectation (compatible with both YAML and Markdown):
development_status = {
  "1-1-editor-update-ueditor-plus-...": "done",
  "1-2-editor-update-noop-save-...": "done",
  "1-3-editor-update-plaintext-edit-...": "blocked",
  "1-4-editor-update-formatting-undo-...": "blocked",
  "2-1-editor-update-image-insert-...": "backlog"
}

For Markdown format:
- The full story key may need to be resolved by finding the actual file
- Use file_pattern (e.g., "1-1-*") to glob for the actual file
- If multiple files match, use the one with the latest modification time
- If no files found (story still in backlog), use a placeholder key
```

### 2. Resolve Full Story Keys (Markdown Format Only)

```yaml
If {sprint_status_format} == "markdown":
  Action: For each story in parsed_stories:
    - key = story["key"]  # e.g., "1-1"
    - file_pattern = story["file_pattern"]  # e.g., "1-1-*"
    
    Action: Glob in {implementation_artifacts} for file_pattern + ".md"
    Action: If matches found:
      - full_key = filename without .md extension
      - Update development_status: replace placeholder with full_key
    Action: If no matches found (story is in backlog, not created yet):
      - Use placeholder: key + "-" + sanitized_title
      - OR, note that create-story will be needed first
      - Keep in backlog status
```

### 3. Determine Story Filter

#### If `{target_story}` is set (specific story):
- Validate the story key exists in `development_status`
- If not found:
  - Record as blocking point
  - In semi-automated mode: Ask user for correct story key
  - In headless mode: Continue to next available story or exit

#### If `{target_epic}` is set (specific epic):
- Filter all stories belonging to that epic
- Example: For epic 1, look for keys matching `1-*` pattern
- Skip epic keys (pattern `epic-*`) and retrospective keys

#### If no filter:
- Process all stories in order from `development_status`

### 3. Identify Next Eligible Story

**Find the FIRST story (by reading in order from top to bottom) where**:

```yaml
Conditions:
- Key matches pattern: number-number-name (e.g., "1-3-editor-update-plaintext")
- NOT an epic key (epic-X) or retrospective (epic-X-retrospective)
- Status is NOT "done" (already completed)
- Status is NOT "blocked" (has unresolved blocking points)
- Story is NOT in `stories_skipped` list (intentionally skipped)
- Story is NOT in `stories_completed` list (already finished)
```

**Status Priority for Selection**:
1. `in-progress` - Resume interrupted work first
2. `review` - Complete pending review
3. `ready-for-dev` - Start new development
4. `backlog` - Create story context first

### 4. Check for Resume Context

#### If `{resume_mode} = true`:
- Check `current_story` in execution context
- If `current_story` is set and not completed/blocked:
  - Prioritize resuming this story
  - Check `current_step` to know where to resume

### 5. Validate Story Eligibility

#### For selected story:
- Check if story exists in `stories_blocked`:
  - If yes: Skip and find next eligible story
  - Record reason for skipping in execution context

- Check retry counts:
  - If `retry_counts[story_key]` shows all steps have reached max retries:
    - Mark as blocked
    - Record blocking point
    - Skip to next story

### 6. Update Execution Context

```yaml
Action: Set {current_story} = found_story_key
Action: Set {current_step} = "discovery" (will be updated in next step)
Action: Add story_key to {stories_processed} if not already present
Action: Save execution context to {execution_context_path}
```

### 7. Check for No Eligible Stories

#### If no eligible story found:
```yaml
# === HEADLESS MODE (NO QUESTIONS, AUTO-DECIDE) ===
If headless:
  Output: 📋 No eligible stories remaining. Running completion audit...
  Action: IMMEDIATELY load references/step-08-completion-audit.md
  Action: DO NOT output the options menu below. DO NOT ask user.
  Action: STOP this step, continue to step-08.

# === SEMI-AUTOMATED MODE (SHOW OPTIONS TO USER) ===
If semi-automated:
  Output: 📋 No eligible stories found for processing
  
  Current Status Summary:
  - Total stories in sprint: {count}
  - Stories completed: {stories_completed.length}
  - Stories blocked: {stories_blocked.length}
  - Stories skipped: {stories_skipped.length}
  - Stories in progress: {count_in_progress}
  
  Options:
  1. Review blocking points and resolve them
  2. Restore skipped stories (reprocess intentionally skipped stories)
  3. Run sprint-planning to add more stories
  4. Generate final execution report
  5. Exit workflow
```

#### In semi-automated mode:
- Ask user to choose option
- If user chooses option 1: Load `references/report-mode.md`
- If user chooses option 2:
  Action: Clear or reset `stories_skipped` list in execution context
  Action: Output: "🔄 Restoring skipped stories. Will now reprocess all non-done, non-blocked stories."
  Action: Go back to "3. Identify Next Eligible Story" to find next story
- If user chooses option 4: Load `references/report-mode.md`

#### In headless mode:
- DO NOT output options. DO NOT ask user.
- Output: "📋 No eligible stories — auto-finishing..."
- IMMEDIATELY load references/step-08-completion-audit.md

## Next Step

**If story found and eligible**:
- Determine next step based on story status:
  - `backlog` → Load `references/step-02-create-story.md`
  - `ready-for-dev` → Load `references/step-03-development.md`
  - `in-progress` → Check `current_step` and load corresponding step file
  - `review` → Load `references/step-05-code-review.md`

**If no eligible story**:
- **Headless**: IMMEDIATELY load `references/step-08-completion-audit.md`. DO NOT ask user.
- **Semi-automated**: Load `references/report-mode.md` to generate final report (ask user first)

## State Persistence

**Save execution context after this step**:
- Update `current_story`
- Update `current_step` to "discovery-complete"
- Update `last_updated` timestamp
- Save to `{execution_context_path}`

## Communication

**In semi-automated mode**:
```
Output: 🎯 Selected story for processing: {story_key}

Story Details:
- Current Status: {status}
- Epic: {epic_number}
- Retry Counts: {retry_counts[story_key] || "None"}

Would you like to:
1. Proceed with this story
2. Skip this story
3. View more details
4. Pause execution
```

**In headless mode**:
```
Output: 🎯 Processing: {story_key} (Status: {status})
```

## Blocking Points to Record

During this step, record blocking points if:

1. **Sprint status file not found**:
   - Reason: "Cannot find sprint-status file at expected path"
   - Context: 
     - Include expected path: {sprint_status_path}
     - Include format expected: {sprint_status_format}
     - Include batch name: {selected_batch}

2. **Cannot parse sprint-status file**:
   - Reason: "Failed to parse sprint-status file"
   - Context:
     - File path: {sprint_status_path}
     - Format: {sprint_status_format}
     - Error details: {parse_error}
   - If markdown format:
     - Reference: Check `references/markdown-sprint-status-parser.md` for expected format
     - Common issues: Missing "## Development Status" header, invalid table structure

3. **Story filter doesn't match any story**:
   - Reason: "Specified story/epic filter doesn't match any valid story"
   - Context:
     - Filter type: {story or epic}
     - Filter value: {target_story or target_epic}
     - Available stories: {list_of_story_keys}
     - Available epics: {list_of_epic_numbers}
   - If markdown format:
     - Note: Story keys in markdown use short format like "1-1", not full file names
     - Use file_pattern "1-1-*" to find actual story files

4. **All stories exhausted**:
   - Reason: "No eligible stories remaining to process"
   - Context:
     - Batch: {selected_batch}
     - Total stories: {total_count}
     - Completed: {stories_completed.length}
     - Blocked: {stories_blocked.length}
     - Skipped: {stories_skipped.length}
     - In progress: {count_in_progress}
   - Suggestions:
     - Review blocking points and resolve them
     - Run sprint-planning to add more stories
     - Switch to a different batch

5. **Cannot resolve full story key (markdown format only)**:
   - Reason: "Cannot find actual story file for short key"
   - Context:
     - Short key: {key} (e.g., "1-1")
     - File pattern tried: {file_pattern} (e.g., "1-1-*.md")
     - Search directory: {implementation_artifacts}
   - Note: This may be normal for backlog stories (create-story needed)
   - Action: If status is "backlog", proceed to create-story step
            If status is NOT "backlog", record as blocking point

## Next Step (Defensive Routing for Edge Cases)

### IMPORTANT:
Under normal circumstances, the story selected by step-01 will have status:
- `backlog`, `ready-for-dev`, `in-progress`, or `review`

The conditions below (`done`, `blocked`) are DEFENSIVE routing logic for edge cases
where the selection logic might have failed (e.g., concurrent state changes,
inconsistent data between sprint-status and execution context).

### After story selection and validation:
```yaml
Action: Check story status and determine next step

If status == "backlog":
  Action: Load `references/step-02-create-story.md`
  Action: Read ENTIRE file completely
  Action: Proceed with story context creation

Elif status == "ready-for-dev" OR status == "in-progress" OR status == "review":
  Action: Load `references/step-03-development.md`
  Action: Read ENTIRE file completely
  Action: Proceed with development implementation

Elif status == "done":
  Action: This is unexpected - story should not have been selected
  Action: Add to `stories_completed` in execution context (if not already there)
  Action: Output: "⚠️ Story {current_story} was already done. Skipping."
  Action: Return to "3. Identify Next Eligible Story" for next story

Elif status == "blocked":
  Action: This is unexpected - story should not have been selected
  Action: Add to `stories_blocked` in execution context (if not already there)
  Action: Output: "⚠️ Story {current_story} was already blocked. Skipping."
  Action: Return to "3. Identify Next Eligible Story" for next story
```

### Note:
In normal execution, the `done` and `blocked` branches should NEVER be reached
because step-01's selection logic explicitly excludes:
- Status is NOT "done"
- Status is NOT "blocked"
- Story is NOT in `stories_completed` list

These branches exist only as a safety net for edge cases.

## State Persistence

**Save execution context after**:
- Story selection complete
- After blocking point recording
- Before moving to next step

**Context fields to update**:
- `current_story`: Set to the selected story key
- `current_step`: "discovery" (during) or "discovery-complete" (after)
- `last_updated`: Timestamp
