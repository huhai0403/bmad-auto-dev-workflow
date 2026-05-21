# bmad-auto-dev-workflow

A fully automated, end-to-end development pipeline skill for [BMad](https://github.com/bmad-code-org/BMAD-METHOD) — the AI-powered software development framework. This skill orchestrates the complete software development lifecycle from story creation through implementation, testing, multi-model code review, and completion auditing.

## Overview

This is a **workflow orchestrator** skill that chains together multiple BMad sub-skills into a single seamless pipeline:

```
Story Creation → Development → Testing → Multi-Model Code Review → Status Update → Completion Audit
```

### Key capabilities

- **Dual execution modes**: fully automated (headless, zero user interaction) or semi-automated (with human checkpoints)
- **Multi-model code review**: two separate AI reviews for enhanced quality
- **Failure handling**: automatic retry (up to 2 attempts) with detailed blocking point tracking
- **Completion audit**: auto-verifies all completed stories have required evidence artifacts (test output, lint output, code review)
- **Dry-run mode**: validates routing logic without executing real dev/test/review
- **Resume support**: pick up from where you left off
- **Multi-batch support**: handles multiple requirement batches with fuzzy matching for naming variations

## Directory structure

```
bmad-auto-dev-workflow/
├── SKILL.md              # Skill entry point and configuration
├── workflow.md           # Detailed workflow definition
├── validate-workflow.js  # Static validator for workflow files
├── references/
│   ├── batch-resolution.md
│   ├── dry-run-mode.md
│   ├── execution-log.md
│   ├── execution-mode.md
│   ├── markdown-sprint-status-parser.md
│   ├── report-mode.md
│   ├── resume-mode.md
│   ├── step-01-discovery.md
│   ├── step-02-create-story.md
│   ├── step-03-development.md
│   ├── step-04-testing.md
│   ├── step-05-code-review.md
│   ├── step-06-status-update.md
│   ├── step-07-checkpoint.md
│   └── step-08-completion-audit.md
├── LICENSE
└── README.md
```

## Dependencies

This skill acts as an orchestrator and requires the following BMad skills to be installed:

| Skill | Purpose |
|-------|---------|
| `bmad-create-story` | Creates story context files from backlog |
| `bmad-dev-story` | Executes development implementation |
| `bmad-code-review` | Performs adversarial code review |
| `bmad-create-prd` | Generates PRD documents (planning phase) |
| `bmad-create-architecture` | Creates architecture solution designs |
| `bmad-create-epics-and-stories` | Breaks requirements into epics and stories |
| `bmad-sprint-planning` | Generates sprint status tracking |

### Project-level conventions expected

This skill assumes a BMad project structure with:

- `_bmad/bmm/config.yaml` — main BMad configuration
- `_bmad-output/planning-artifacts/` — planning artifacts (PRD, epics, architecture)
- `_bmad-output/implementation-artifacts/` — implementation artifacts (sprint-status, story files)
- `project-context.md` — project context documentation

### External tools

The testing phase expects these npm scripts to be available:

- `npm run test:unit` — unit tests (Jest)
- `npm run test:e2e` — E2E tests (Playwright)
- `npm run lint` — code quality (ESLint)

## Usage

### Start fresh

```bash
# Fully automated (headless)
bmad-auto-dev-workflow --headless

# Semi-automated with checkpoints
bmad-auto-dev-workflow --semi

# Target a specific batch
bmad-auto-dev-workflow --headless --batch "v1.3.13-editor-update"

# Start from a specific story
bmad-auto-dev-workflow --headless --story "1-3-editor-update-plaintext-edit"

# Process a specific epic
bmad-auto-dev-workflow --headless --epic 1

# Dry-run (validate routing without real execution)
bmad-auto-dev-workflow --dry-run --batch "v1.3.13-editor-update"
```

### Resume

```bash
bmad-auto-dev-workflow --resume
```

### Report only

```bash
bmad-auto-dev-workflow --report-only --batch "v1.3.13-editor-update"
```

## Validation

Run the static validator to check workflow file integrity:

```bash
node validate-workflow.js
```

## Communication style

- **Headless mode**: machine executor — single-line progress indicators only, no questions, no menus
- **Semi-automated mode**: conversational, explains decisions, asks for confirmation at checkpoints

## License

MIT — see [LICENSE](LICENSE) for details.
