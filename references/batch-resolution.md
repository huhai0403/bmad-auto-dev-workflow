---
step: batch-resolution
description: Resolve batch/version paths and select which batch to process
---

# Batch Resolution

## Goal
Discover available batches, handle naming variations, let user select a batch, and resolve all path variables.

## Pre-requisites
- `{project-root}` is known
- Base config is loaded (project_name, communication_language, etc.)
- Execution mode is determined (headless or semi-automated)
- Optional: `{target_batch}` from `--batch` arg
- Optional: `{target_batch_path}` from `--batch-path` arg

## Step 1: Determine Planning Artifacts Root

### Default Path
```yaml
{planning_artifacts_root} = "{project-root}/_bmad-output/planning-artifacts/"
```

### Validate Existence
```yaml
Action: Check if {planning_artifacts_root} directory exists

If NOT exists:
  Output: ❌ Error: Planning artifacts directory not found
          
          Expected path: {planning_artifacts_root}
          
          Possible solutions:
          1. Run BMad planning skills first (create-prd, create-architecture, create-epics-and-stories, sprint-planning)
          2. Check if _bmad-output directory exists in a different location
          3. Use --batch-path to specify directly
  
  Action: Record as critical blocking point
  Action: Ask user what to do (if interactive)
  Action: Exit if no valid path provided
```

## Step 2: Scan for Available Batches

### Find Subdirectories
```yaml
Action: List all subdirectories in {planning_artifacts_root}

For each subdirectory:
  Action: Validate it's a valid batch:
    1. Must contain at least one planning artifact:
       - *prd*.md
       - *epics*.md
       - *architecture*.md
    
    2. Check if corresponding implementation artifacts exist:
       - Look in {project-root}/_bmad-output/implementation-artifacts/
       - Try exact name match first
       - Try fuzzy variations (see Step 3)

  Action: Collect all valid batches into {available_batches} list
```

### Batch Validation Rules
```yaml
A valid batch directory MUST have:
✅ At least one of:
   - *prd*.md or *PRD*.md
   - *epics*.md or *Epics*.md

A batch is "fully ready" if it ALSO has:
✅ Implementation artifacts directory exists
✅ Sprint-status file exists (yaml or markdown format)
```

## Step 3: Fuzzy Matching for Naming Variations

### Generate Variations
For each batch name found in planning-artifacts:

```yaml
Original batch name: "v.1.3.13-editor-update"

Generate variations for implementation-artifacts matching:

1. Exact match:
   "v.1.3.13-editor-update"

2. Remove dots:
   "v1.3.13-editor-update" → "v1313-editor-update"
   (Also try: "v1313-editorupdate", "v1313EditorUpdate")

3. Replace dots with hyphens:
   "v-1-3-13-editor-update"

4. Case variations:
   "V.1.3.13-Editor-Update"
   "v.1.3.13-EDITOR-UPDATE"
   "v.1.3.13-editor-update" (original)

5. Partial matches (prefix-based):
   "v.1.3.13*"
   "*editor-update*"

6. Common suffix variations:
   "v.1.3.13-editor-update-bmad"
   "v.1.3.13-editor-update-workflow"
```

### Matching Algorithm
```yaml
For each batch in planning-artifacts:
  For each variation generated:
    Check if directory exists in implementation-artifacts/
    
    If found:
      Record the mapping:
        planning_batch: "v.1.3.13-editor-update"
        implementation_batch: "v1.3.13-editor-update" (or whatever matched)
      Mark as "matched"
      Break out of variation loop
    
    If not found after all variations:
      Record as "unmatched"
      Mark as "needs attention"
```

## Step 4: Interactive Batch Selection (ALWAYS Performed)

### Prepare Batch List
```yaml
For each {available_batches} entry:
  Collect information:
  
  1. Basic info:
     - batch_name: directory name
     - planning_path: full path to planning-artifacts/{batch_name}/
     - implementation_path: matched path (or "Not found")
     - is_matched: true/false
  
  2. Planning artifacts present:
     - PRD: Yes/No, filename
     - Epics: Yes/No, filename
     - Architecture: Yes/No, filename
     - UX: Yes/No, filename (if applicable)
  
  3. Implementation status:
     - Sprint-status exists: Yes/No
     - Sprint-status format: "yaml" / "markdown" / "unknown" / "N/A"
     - Story files count: number of *.md files (excluding sprint-status)
     - Execution context exists: Yes/No (auto-dev-execution-context.yaml)
  
  4. Quick status summary (if sprint-status exists):
     - Total stories: X
     - Done: X
     - In-progress: X
     - Review: X
     - Ready-for-dev: X
     - Backlog: X
     - Blocked: X
```

### Present to User
```yaml
Output: 📂 Found {count} available batches:

        Please select which batch to process:

        ┌─────────────────────────────────────────────────────────────────┐
        │ 1. v.1.3.13-editor-update                                      │
        │    ├─ Planning: ✅ PRD, Epics, Architecture present          │
        │    ├─ Implementation: ✅ Matched as "v1.3.13-editor-update" │
        │    ├─ Sprint-status: ✅ markdown format (4 stories)         │
        │    │   ├─ Done: 2, In-progress: 0, Review: 0              │
        │    │   ├─ Ready: 0, Backlog: 0, Blocked: 2                │
        │    └─ Note: Has existing execution context                  │
        ├─────────────────────────────────────────────────────────────────┤
        │ 2. v1.3.13-other-demand                                       │
        │    ├─ Planning: ✅ PRD, Epics, Architecture present          │
        │    ├─ Implementation: ❌ Not found                            │
        │    ├─ Sprint-status: ❌ N/A                                  │
        │    └─ Note: Planning complete, no implementation yet         │
        ├─────────────────────────────────────────────────────────────────┤
        │ 3. v1.3.13-template-update                                    │
        │    ├─ Planning: ✅ PRD, Epics, Architecture present          │
        │    ├─ Implementation: ❌ Not found                            │
        │    ├─ Sprint-status: ❌ N/A                                  │
        │    └─ Note: Planning complete, no implementation yet         │
        └─────────────────────────────────────────────────────────────────┘

        Options:
        1. v.1.3.13-editor-update (Recommended - has implementation)
        2. v1.3.13-other-demand
        3. v1.3.13-template-update
        4. Manually specify batch path
        5. Refresh / Rescan
        6. Exit

        {If --batch was provided}:
        Note: You specified --batch "{target_batch}". Matching entry highlighted above.
```

### Handle User Selection
```yaml
If user selects a batch number (1-3):
  Action: Set {selected_batch} = corresponding batch_name
  Action: Set {planning_artifacts} = planning_path
  Action: Set {implementation_artifacts} = implementation_path (or ask if not matched)
  Action: Proceed to Step 5

If user selects "4. Manually specify batch path":
  Action: Ask user to provide full path to planning artifacts
  Action: Validate the path
  Action: If valid, set variables
  Action: Proceed to Step 5

If user selects "5. Refresh / Rescan":
  Action: Go back to Step 2 and rescan
  Action: Re-present the list

If user selects "6. Exit":
  Action: Save any partial state
  Action: Exit gracefully
  Action: Tell user how to restart
```

### Special Case: No Matched Implementation Artifacts
```yaml
If user selects a batch with no matched implementation artifacts:
  
  Output: ⚠️ Batch "{batch_name}" has planning artifacts but no implementation artifacts found.
          
          This means:
          - Planning phase is complete (PRD, Epics, etc. exist)
          - But sprint-planning hasn't been run yet
          - No sprint-status file exists
          - No story files exist
          
          Options:
          1. Run sprint-planning first to create implementation artifacts
          2. Specify implementation path manually
          3. Choose a different batch
          4. Exit

  Action: Process user choice
```

## Step 5: Resolve All Path Variables

### Based on Selected Batch
```yaml
{selected_batch} = user-selected batch name

# Planning artifacts (always known from selection)
{planning_artifacts} = full path to planning-artifacts/{batch_name}/

# Implementation artifacts (may need confirmation if fuzzy matched)
{implementation_artifacts} = full path to matched implementation directory

# Verify implementation path
Action: Check if {implementation_artifacts} exists and is a directory

If NOT exists:
  Output: ⚠️ Implementation artifacts path not found: {implementation_artifacts}
          
          Please provide the correct path or run sprint-planning first.
  Action: Ask user for correct path
  Action: If user provides, validate and use
  Action: If user declines, go back to batch selection
```

### Find Sprint-Status File
```yaml
Action: Search in {implementation_artifacts} for sprint-status file

Search patterns (in order of priority):
1. Exact: "sprint-status.yaml"
2. Exact: "sprint-status.yml"
3. Pattern: "sprint-status*.yaml"
4. Pattern: "sprint-status*.yml"
5. Exact: "sprint-status.md"
6. Pattern: "sprint-status*.md"
7. Pattern: "*status*.md" (broader)

For each file found:
  Action: Check format:
    - If extension is .yaml or .yml: format = "yaml"
    - If extension is .md: 
      - Read first few lines
      - Look for "## Development Status" or similar header
      - Look for markdown table with "Key", "Story", "Status" columns
      - If found: format = "markdown"
      - Else: format = "unknown"

Action: Select the most likely candidate:
  - Prefer "yaml" format if found
  - Else prefer "markdown" format with Development Status table
  - Else ask user to specify

Set variables:
  {sprint_status_path} = full path to selected file
  {sprint_status_format} = "yaml" or "markdown"
```

### Validate Sprint-Status
```yaml
If {sprint_status_format} == "yaml":
  Action: Parse YAML
  Action: Verify it has "development_status" section
  Action: If not valid, try other files or ask user

If {sprint_status_format} == "markdown":
  Action: Load `references/markdown-sprint-status-parser.md`
  Action: Verify the file structure matches expected format
  Action: Check for "## Development Status" section
  Action: Check for markdown tables with story status
  Action: If not valid, try other files or ask user
```

### Find Other Key Files
```yaml
In {planning_artifacts}:
  Action: Find PRD file:
    - Pattern: "*prd*.md" (case insensitive)
    - If multiple, prefer:
      - Contains batch name
      - Has "PRD" or "Product Requirements" in title
  Set {prd_file} = found path

  Action: Find Epics file:
    - Pattern: "*epics*.md" (case insensitive)
    - If multiple, prefer contains batch name
  Set {epics_file} = found path

  Action: Find Architecture file:
    - Pattern: "*architecture*.md" (case insensitive)
  Set {architecture_file} = found path

In {implementation_artifacts}:
  Action: Find existing execution context:
    - "auto-dev-execution-context.yaml"
  Set {existing_execution_context} = true/false

  Action: Find blocking points file:
    - "blocking-points.yaml"
  Set {existing_blocking_points} = true/false
```

## Step 6: Confirm Selection and Set Variables

### Final Summary
```yaml
Output: ✅ Batch selected: {selected_batch}
        
        Configuration Summary:
        ┌────────────────────────────────────────────────────┐
        │ Batch Name:      {selected_batch}                  │
        │ Planning Path:   {planning_artifacts}             │
        │ Implementation:  {implementation_artifacts}        │
        │ Sprint-Status:   {sprint_status_path}             │
        │ Format:          {sprint_status_format}           │
        │ PRD File:        {prd_file}                       │
        │ Epics File:      {epics_file}                     │
        │ Existing Context:{existing_execution_context}     │
        └────────────────────────────────────────────────────┘
        
        Would you like to proceed with this configuration?
        1. Yes, proceed
        2. No, choose different batch
        3. Review batch details
        4. Exit
```

### Set Final Variables
```yaml
If user confirms (choice 1):
  Action: Set all final variables:
    {selected_batch} = confirmed
    {planning_artifacts} = confirmed path
    {implementation_artifacts} = confirmed path
    {sprint_status_path} = confirmed path
    {sprint_status_format} = "yaml" or "markdown"
    {execution_context_path} = "{implementation_artifacts}/auto-dev-execution-context.yaml"
    {blocking_points_path} = "{implementation_artifacts}/blocking-points.yaml"
    {prd_file} = found PRD path
    {epics_file} = found epics path
    {architecture_file} = found architecture path
  
  Action: Save batch selection info to a temporary location (for reference)
  Action: Proceed to next step in workflow

If user chooses other options:
  Action: Go back to appropriate step
  Action: Re-select or re-configure
```

## Special Cases

### Case A: User Provided --batch-path
```yaml
If {target_batch_path} is set:
  Action: Validate the path exists
  Action: Check if it contains planning artifacts
  Action: If valid:
    - Treat as manually specified batch
    - Skip scanning step
    - Go directly to path resolution and validation
  Action: If invalid:
    - Tell user path is invalid
    - Offer to scan for available batches
```

### Case B: User Provided --batch (Name Hint)
```yaml
If {target_batch} is set:
  Action: During scanning, look for exact and fuzzy matches
  Action: If match found:
    - Highlight it in the selection list
    - Make it the default/recommended option
  Action: If no match found:
    - Tell user no batch matched "{target_batch}"
    - Show available batches
    - Ask user to select or provide correct name
```

### Case C: Resume Mode
```yaml
If {resume_mode} = true:
  Action: After batch selection, check for existing execution context:
    - Path: {implementation_artifacts}/auto-dev-execution-context.yaml
  
  If exists:
    Action: Load the context
    Action: Verify context's "selected_batch" matches current {selected_batch}
    
    If matches:
      Output: ✅ Found existing execution context from previous run.
              
              Context Info:
              - Execution ID: {context.execution_id}
              - Start Time: {context.start_time}
              - Last Updated: {context.last_updated}
              - Stories Processed: {context.stories_processed.length}
              - Current Story: {context.current_story or "None"}
              - Current Step: {context.current_step or "None"}
              
              Would you like to:
              1. Resume from this context
              2. Start fresh (ignore existing context)
              3. Review context details
              4. Exit
    
    If does NOT match:
      Output: ⚠️ Existing execution context belongs to different batch:
              
              Current batch: {selected_batch}
              Context batch: {context.selected_batch}
              
              Options:
              1. Switch to context's batch: {context.selected_batch}
              2. Start fresh in current batch (ignore context)
              3. Choose different batch
              4. Exit
  
  If NOT exists:
    Output: ⚠️ No existing execution context found for batch "{selected_batch}".
            Starting fresh.
    Action: Set {resume_mode} = false internally
    Action: Proceed with fresh execution
```

---

## Output Variables

After this step completes, the following variables MUST be set:

| Variable | Description |
|----------|-------------|
| `{selected_batch}` | Name of the selected batch |
| `{planning_artifacts}` | Full path to planning artifacts directory |
| `{implementation_artifacts}` | Full path to implementation artifacts directory |
| `{sprint_status_path}` | Full path to sprint-status file |
| `{sprint_status_format}` | "yaml" or "markdown" |
| `{execution_context_path}` | Path for execution context (new or existing) |
| `{blocking_points_path}` | Path for blocking points (new or existing) |
| `{prd_file}` | Path to PRD file (optional but recommended) |
| `{epics_file}` | Path to epics file (optional but recommended) |
| `{architecture_file}` | Path to architecture file (optional) |

## Next Step

After batch resolution is complete and user confirms:

- If `{report_only} = true`: Load `references/report-mode.md`
- Else if `{resume_mode} = true` and context exists: Load `references/resume-mode.md`
- Else: Proceed to target filtering and context setup (as defined in workflow.md)
