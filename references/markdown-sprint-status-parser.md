---
purpose: markdown-sprint-status-parser
description: Rules and methods for parsing markdown table format sprint-status files
---

# Markdown Sprint-Status Parser

## Purpose
Your project uses **markdown table format** for sprint-status, not YAML. This document defines how to parse this format correctly.

## Example from Your Project

Your `sprint-status-v1.3.13-editor-update.md` looks like this:

```markdown
## Development Status

### Epic 1: Editor Update - Rich Text JSON/HTML Round-trip Equivalence

| Key | Story | Status | Sprint | Priority |
|-----|-------|--------|--------|----------|
| 1-1 | Editor Update - ueditor-plus RichTextJSON ↔ HTML (readonly render) | done | 1 | High |
| 1-2 | Editor Update - noop-save RichTextJSON ↔ Text equivalence | done | 1 | High |
| 1-3 | Editor Update - plaintext-edit round-trip equivalence | blocked | 1 | High |
| 1-4 | Editor Update - formatting + undo/redo round-trip | blocked | 1 | High |
| epic-1 | Epic 1: Editor Update - Rich Text JSON/HTML Round-trip Equivalence | in-progress | 1 | High |

### Epic 2: Editor Update - Image/File Insertion Fidelity

| Key | Story | Status | Sprint | Priority |
|-----|-------|--------|--------|----------|
| 2-1 | Editor Update - image-insert width/height fidelity | backlog | 1 | High |
| epic-2 | Epic 2: Editor Update - Image/File Insertion Fidelity | not-started | 1 | High |

... (more epics)
```

## Parsing Rules

### Rule 1: Identify Sections

#### Section Headers to Look For:
```markdown
## Development Status    <-- Main section (CRITICAL)
### Epic X: ...          <-- Epic subsections
```

**Action**:
1. Find the `## Development Status` section
2. Within it, find all `### Epic X: ...` subsections
3. Each epic subsection contains stories for that epic

### Rule 2: Parse Markdown Tables

#### Table Structure:
```markdown
| Key | Story | Status | Sprint | Priority |
|-----|-------|--------|--------|----------|
| 1-1 | Story Title | done | 1 | High |
```

**Columns** (in order):
1. **Key** = Story identifier (e.g., "1-1", "epic-1")
2. **Story** = Story title/description
3. **Status** = Current status (`done`, `blocked`, `in-progress`, `review`, `ready-for-dev`, `backlog`, `not-started`)
4. **Sprint** = Sprint number
5. **Priority** = `High`, `Medium`, `Low`

**Action**:
1. Find the header row: `| Key | Story | Status | Sprint | Priority |`
2. Find the separator row: `|-----|-------|--------|--------|----------|`
3. Parse all data rows after the separator
4. For each row, extract the 5 columns

### Rule 3: Distinguish Stories from Epics

#### Key Pattern Matching:
```yaml
Story keys (individual tasks):
- Pattern: ^\d+-\d+.*$  (number-number, e.g., "1-1", "2-10")
- Examples:
  - "1-1" → Story 1.1
  - "1-2" → Story 1.2
  - "2-1" → Story 2.1
  - "10-5" → Story 10.5

Epic keys (aggregate status):
- Pattern: ^epic-\d+$  (epic-number, e.g., "epic-1", "epic-2")
- Examples:
  - "epic-1" → Epic 1
  - "epic-2" → Epic 2

Action:
- For each row, check if Key matches story pattern or epic pattern
- Stories: Process as individual tasks
- Epics: Use for aggregate status only, skip in story discovery
```

### Rule 4: Status Values

#### Valid Status Values (from your project):
```yaml
# Final/completed states
"done" → Story is complete

# Blocked states
"blocked" → Story is blocked (needs attention)

# Active/in-progress states
"in-progress" → Story being worked on
"review" → Story is in code review
"ready-for-dev" → Story is ready to start development

# Waiting states
"backlog" → Story is in backlog (needs create-story first)
"not-started" → Epic not started yet (epic-level only)
```

**Action**:
1. Map these status values to internal workflow states
2. Use the same values as YAML format for consistency

### Rule 5: Extract Story Key for Reference

#### From the "Key" Column:
```yaml
Key: "1-1" → story_key = "1-1"

But for file matching and reference, you need the FULL story key:

From "Story" column: "Editor Update - ueditor-plus RichTextJSON ↔ HTML (readonly render)"

Create a sanitized story key pattern:
- Take the Key column value: "1-1"
- Create a pattern for file matching: "1-1-*" (glob pattern)

Because actual story files are named like:
"1-1-editor-update-ueditor-plus-richtextjson-html-readonly-render.md"
```

**Action**:
1. Store both:
   - `key`: The short key from Key column ("1-1")
   - `story_title`: Full title from Story column
   - `file_pattern`: Glob pattern for finding story file ("1-1-*")
2. When looking for story files, use `file_pattern`

## Parsing Algorithm

### Step-by-Step Parsing Process:

```yaml
1. LOAD the full markdown file
   Action: Read complete content of {sprint_status_path}

2. FIND the Development Status section
   Action: Search for "## Development Status" header
   If not found: Error - invalid sprint-status format

3. FIND all epic subsections
   Action: Find all "### Epic X: ..." headers after Development Status
   For each epic:
     a. Extract epic number (e.g., "1" from "Epic 1: ...")
     b. Extract epic title
     c. Find the markdown table under this epic
     d. Parse the table (see below)

4. PARSE each markdown table
   For each table found:
     a. Find header row: | Key | Story | Status | Sprint | Priority |
     b. Find separator row: |-----|-------|...
     c. For each data row after separator:
        i. Split by "|" to get columns
        ii. Trim whitespace from each column
        iii. Extract:
             - key = columns[0].trim()
             - story = columns[1].trim()
             - status = columns[2].trim()
             - sprint = columns[3].trim()
             - priority = columns[4].trim()
        iv. Determine type:
             - If key matches ^\d+-\d+: it's a STORY
             - If key matches ^epic-\d+: it's an EPIC (aggregate, skip)
        v. If STORY:
             - Create file_pattern: key + "-*" (e.g., "1-1-*")
             - Add to parsed_stories list

5. AGGREGATE results
   Action: Combine all stories from all epics
   Action: Create a structured data object:

   parsed_data = {
     "development_status": {
       "1-1-editor-update-...": {
         "key": "1-1",
         "title": "Editor Update - ...",
         "status": "done",
         "sprint": "1",
         "priority": "High",
         "file_pattern": "1-1-*",
         "epic": "1"
       },
       "1-2-editor-update-...": { ... },
       ...
     },
     "epics": {
       "1": {
         "title": "Editor Update - Rich Text JSON/HTML Round-trip Equivalence",
         "status": "in-progress",
         "stories": ["1-1", "1-2", "1-3", "1-4"]
       },
       ...
     },
     "format": "markdown",
     "source_file": "{sprint_status_path}"
   }
```

## Data Structure Equivalence

### To maintain compatibility with YAML format expectations:

#### Original YAML format expectation:
```yaml
development_status:
  "1-1-editor-update-ueditor-plus-richtextjson-html-readonly-render": "done"
  "1-2-editor-update-noop-save-richtextjson-text-equivalence": "done"
  "1-3-editor-update-plaintext-edit-round-trip-equivalence": "blocked"
  ...
  "epic-1": "in-progress"
```

#### Markdown parsed equivalent:
```yaml
# After parsing, create a compatible structure:
development_status_compat: {
  "1-1-editor-update-ueditor-plus-richtextjson-html-readonly-render": "done",
  "1-2-editor-update-noop-save-richtextjson-text-equivalence": "done",
  "1-3-editor-update-plaintext-edit-round-trip-equivalence": "blocked",
  ...
}
```

**Important**: For the full story key in this structure, you need to either:
1. Find the actual story file and use its full name
2. Or, use the Key + sanitized Story title pattern

**Action**:
- When you need to access a story file, use the `file_pattern` to find it
- Example: `glob("1-1-*.md")` in the implementation artifacts directory

## Finding Story Files

### Using the File Pattern:
```yaml
For a story with key "1-1":
  file_pattern = "1-1-*"
  
Search in {implementation_artifacts} directory:
  Action: Glob for "1-1-*.md"
  
Expected match:
  "1-1-editor-update-ueditor-plus-richtextjson-html-readonly-render.md"

If multiple matches (unlikely but possible):
  Action: Pick the one that best matches the story title
  Action: Or ask user if ambiguous
```

## Updating Sprint-Status (Markdown Format)

### Challenge:
Markdown tables are harder to update programmatically than YAML.

### Strategy:
```yaml
When you need to update a story's status:

1. READ the full markdown file
2. FIND the specific table row for the story
3. PARSE that row to get current columns
4. MODIFY the Status column value
5. REBUILD the row with updated values
6. WRITE the entire file back

OR (safer approach for AI):

1. READ the full markdown file
2. CREATE a mapping of Key → Current Status
3. MAKE changes to the mapping
4. When presenting to user or generating reports, use the updated mapping
5. For actual file modification:
   - Be EXTREMELY careful with markdown table formatting
   - Validate the table structure after any edit
   - If unsure, don't modify the file - instead:
     a. Record the change in execution context
     b. Generate a "proposed update" report
     c. Ask user to verify or make the change
```

### Safe Update Procedure (Recommended):
```yaml
When you determine a story's status should change:

1. RECORD the change in execution context:
   {
     "status_changes": [
       {
         "story_key": "1-3",
         "full_key": "1-3-editor-update-plaintext-edit-round-trip-equivalence",
         "old_status": "blocked",
         "new_status": "in-progress",
         "reason": "User resolved cursor API question",
         "timestamp": "2026-05-06T15:30:00Z"
       }
     ]
   }

2. SAVE execution context to {execution_context_path}

3. OPTIONAL: Attempt safe markdown update only if:
   a. The table structure is simple and clear
   b. The row is easy to identify
   c. You're confident in the edit

4. ALWAYS: When generating reports or summaries, use the COMBINED data:
   - Base status from markdown file
   - Override with status_changes from execution context
   - This gives a consistent view without risky file edits
```

## Status Priority for Discovery

### When finding the next story to process:

```yaml
Priority order (highest to lowest):
1. "in-progress" → Resume interrupted work FIRST
2. "review" → Complete pending review
3. "ready-for-dev" → Start new development
4. "backlog" → Needs create-story first

Statuses to SKIP:
- "done" → Already completed
- "blocked" → Needs attention (unless user says to retry)
- "not-started" → Epic-level only, no stories yet

Epic keys (epic-1, epic-2, etc.):
- ALWAYS SKIP these in story discovery
- They are aggregate status indicators only
```

## Example Parsing Output

### For your project's sprint-status file:

```yaml
After parsing, your data would look like:

parsed_stories = [
  {
    "key": "1-1",
    "title": "Editor Update - ueditor-plus RichTextJSON ↔ HTML (readonly render)",
    "status": "done",
    "sprint": "1",
    "priority": "High",
    "file_pattern": "1-1-*",
    "epic": "1",
    "full_key": null  # To be filled by finding actual file
  },
  {
    "key": "1-2",
    "title": "Editor Update - noop-save RichTextJSON ↔ Text equivalence",
    "status": "done",
    "sprint": "1",
    "priority": "High",
    "file_pattern": "1-2-*",
    "epic": "1"
  },
  {
    "key": "1-3",
    "title": "Editor Update - plaintext-edit round-trip equivalence",
    "status": "blocked",
    "sprint": "1",
    "priority": "High",
    "file_pattern": "1-3-*",
    "epic": "1"
  },
  {
    "key": "1-4",
    "title": "Editor Update - formatting + undo/redo round-trip",
    "status": "blocked",
    "sprint": "1",
    "priority": "High",
    "file_pattern": "1-4-*",
    "epic": "1"
  },
  {
    "key": "2-1",
    "title": "Editor Update - image-insert width/height fidelity",
    "status": "backlog",
    "sprint": "1",
    "priority": "High",
    "file_pattern": "2-1-*",
    "epic": "2"
  }
]

epics = {
  "1": {
    "title": "Editor Update - Rich Text JSON/HTML Round-trip Equivalence",
    "status": "in-progress",
    "story_keys": ["1-1", "1-2", "1-3", "1-4"]
  },
  "2": {
    "title": "Editor Update - Image/File Insertion Fidelity",
    "status": "not-started",
    "story_keys": ["2-1"]
  }
}

# Next story to process (based on priority):
# First, check for "in-progress" stories: none
# Next, check for "review" stories: none
# Next, check for "ready-for-dev" stories: none
# Next, check for "backlog" stories: "2-1"
# But "1-3" and "1-4" are "blocked" - should we retry?
# Decision: If --resume and user confirms, retry blocked
#           Otherwise, skip blocked and go to "2-1" (backlog → needs create-story)
```

## Summary of Key Differences from YAML

| Aspect | YAML Format | Markdown Table Format |
|--------|-------------|----------------------|
| **Structure** | Hierarchical YAML | Markdown sections + tables |
| **Story Keys** | Full keys used directly | Short keys + file pattern needed |
| **Epic Keys** | Mixed with stories | Must filter out epic-* patterns |
| **Parsing** | Native YAML parser | Custom table parsing logic |
| **Updating** | Safe and easy | Risky - prefer tracking changes separately |
| **Status Values** | Same values | Same values (good for compatibility) |

**Most Important**: The `status` values are the SAME in both formats. This means your workflow logic for determining what to do next doesn't need to change - only the parsing and update logic.
