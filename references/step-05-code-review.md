---
step: 05
name: multi-perspective-code-review
description: Execute code review using two AI perspectives for enhanced quality
---

# Step 05: Multi-Perspective Code Review

## Goal
Execute comprehensive code review using two different AI perspectives to ensure quality, then handle review outcomes appropriately.

## Pre-requisites
- `{current_story}` is set
- Story status is `review`
- Story file has implementation notes and test results
- Modified files are listed in File List section

## Review Strategy

### Dual Perspectives Concept:
- **Review 1 (Functional Perspective)**: Comprehensive review focusing on:
  - Acceptance criteria satisfaction
  - Functional correctness
  - Code quality and readability
  - Architecture compliance
  
- **Review 2 (Critical Perspective)**: Adversarial/critical review focusing on:
  - Security vulnerabilities
  - Performance implications
  - Edge cases and boundary conditions
  - Design patterns and maintainability

### Review Comparison:
- If both reviews agree: Proceed to outcome handling
- If reviews disagree: Flag for human review (even in headless mode)

## Review Execution

### Phase 0: PRE-FLIGHT TEST EVIDENCE CHECK (MANDATORY — BLOCK IF FAILS)

**CRITICAL: Do NOT proceed to code review if testing evidence is missing.**

```yaml
Action: OPEN the story file for {current_story}
Action: SEARCH for mandatory testing evidence sections:

CHECKPOINT A — Test Output:
  IF "## Test Output Details" section is MISSING OR EMPTY OR contains only placeholder text:
    → BLOCK. DO NOT continue code review.
    → Output: "⛔ PRE-FLIGHT FAILED: No test output found in story file. Code review cannot proceed."
    → Action: Record as blocking point — step: "review", reason: "Missing test evidence"
    → Action: RETURN to references/step-04-testing.md
    → STOP HERE. Do not proceed past this point.

CHECKPOINT B — Lint Output:
  IF "## Lint Output Details" section is MISSING OR EMPTY OR contains only placeholder text:
    → BLOCK. DO NOT continue code review.
    → Output: "⛔ PRE-FLIGHT FAILED: No lint output found in story file. Code review cannot proceed."
    → Action: Record as blocking point — step: "review", reason: "Missing lint evidence"
    → Action: RETURN to references/step-04-testing.md
    → STOP HERE. Do not proceed past this point.

CHECKPOINT C — DoD Checklist:
  IF "Definition-of-Done Checklist" has ANY `[ ]` (unchecked items):
    → BLOCK. DO NOT continue code review.
    → Output: "⛔ PRE-FLIGHT FAILED: DoD checklist incomplete ({count} items unchecked)."
    → Action: Record as blocking point — step: "review", reason: "Incomplete DoD checklist"
    → Action: RETURN to references/step-04-testing.md
    → STOP HERE. Do not proceed past this point.

IF ALL CHECKPOINTS PASS:
  → Output: "✅ Pre-flight test evidence verified. Proceeding to code review..."
  → Continue to Phase 1 below.
```

### Phase 1: Prepare for Review

#### 1. Gather Context
```yaml
Action: Read COMPLETE story file
Action: Extract from story file:
  - Dev Agent Record: Implementation details
  - File List: All modified/new/deleted files
  - Change Log: Summary of changes
  - Acceptance Criteria: Requirements to verify
  - Test Results: Test execution summary

Action: Load project-context.md for coding standards
Action: Load architecture.md if available for design patterns
```

#### 2. Identify Files to Review
```yaml
Action: Extract all files from File List section
Action: For each file:
  - Determine if it's new, modified, or deleted
  - Identify file type (.js, .vue, .scss, etc.)
  - Prioritize files based on:
    - Business logic > UI components > styles
    - New files > modified files
    - Core modules > utility modules
```

### Phase 2: Review 1 - Functional Perspective

#### Execute Review:
```yaml
Action: Perform comprehensive functional review:

Focus Areas for Review 1:
1. **Acceptance Criteria Verification**:
   - Does implementation satisfy ALL acceptance criteria?
   - Are there any gaps between requirements and implementation?
   - Any AC partially implemented?

2. **Functional Correctness**:
   - Does the code work as intended?
   - Are there any obvious bugs?
   - Is error handling complete?

3. **Code Quality**:
   - Is the code readable and maintainable?
   - Are naming conventions followed?
   - Is there unnecessary complexity?
   - Any code duplication?

4. **Architecture Compliance**:
   - Does the code follow project architecture patterns?
   - Are there any violations of architectural constraints?
   - Integration points correctly handled?
```

#### Record Review 1 Findings:
```yaml
Action: Add "Senior Developer Review (AI) - Review 1 (Functional Perspective)" section to story file:

Senior Developer Review (AI) - Review 1 (Functional Perspective):
  - Review Date: {current_datetime}
  - Review Focus: Functional correctness, AC satisfaction, code quality, architecture
  - Review Outcome: [Approve / Changes Requested / Blocked]
  
  Action Items:
    - [ ] [High] {description} - {file:line}
    - [ ] [Medium] {description} - {file:line}
    - [ ] [Low] {description} - {file:line}
    
  Severity Breakdown:
    - High: {count}
    - Medium: {count}
    - Low: {count}
    
  Review Summary:
    - Overall assessment
    - Key concerns
    - Recommendations

Action: Save review 1 findings to execution context:
  - review1_outcome: {outcome}
  - review1_findings: [list of action items]
  - review1_summary: {summary}

Action: Save current state to {execution_context_path}
```

### Phase 3: Review 2 - Critical Perspective

#### Execute Review:
```yaml
Action: Perform adversarial/critical review from a different mindset:

Focus Areas for Review 2:
1. **Security Focus**:
   - Input validation and sanitization
   - Authentication/authorization checks
   - XSS and injection prevention
   - Data exposure risks
   - Any hardcoded secrets or credentials?

2. **Performance Focus**:
   - Algorithm efficiency (O(n) vs O(n²))
   - DOM manipulation optimization
   - API call batching and caching
   - Memory usage patterns and leaks
   - Unnecessary computations

3. **Edge Case Focus**:
   - Null/undefined handling
   - Boundary conditions (min/max values)
   - Error states and recovery
   - Race conditions and concurrency
   - Empty/zero scenarios

4. **Design and Maintainability Focus**:
   - Code organization and structure
   - Reusability of components
   - Future maintainability
   - Consistency with existing patterns
   - Technical debt introduced

Review Approach (Critical Perspective):
- Take a skeptical/adversarial stance
- Ask: "What could go wrong?"
- Challenge assumptions in the code
- Look for "clever" code that might be problematic
- Ask: "Would I want to maintain this code in 6 months?"
```

#### Record Review 2 Findings:
```yaml
Action: Add "Senior Developer Review (AI) - Review 2 (Critical Perspective)" section to story file:

Senior Developer Review (AI) - Review 2 (Critical Perspective):
  - Review Date: {current_datetime}
  - Review Focus: Security, Performance, Edge Cases, Design Patterns
  - Review Stance: Adversarial/Critical
  - Review Outcome: [Approve / Changes Requested / Blocked]
  
  Action Items:
    - [ ] [High] {description} - {file:line}
    - [ ] [Medium] {description} - {file:line}
    - [ ] [Low] {description} - {file:line}
    
  Key Differences from Review 1:
    - Items found only in this review
    - Different severity assessments
    - Contrasting recommendations
    - Security/Performance/Edge-Case specific items

Action: Save review 2 findings to execution context:
  - review2_outcome: {outcome}
  - review2_findings: [list of action items]
  - review2_summary: {summary}
  - review2_disagreements: [items where severity differs from review1]

Action: Save current state to {execution_context_path}
```

### Phase 4: Review Comparison and Resolution

#### Compare Both Reviews:
```yaml
Action: Compare findings from Review 1 and Review 2

Comparison Criteria:
1. **Outcome Agreement**:
   - Both Approve → Proceed as Approve
   - Both Request Changes → Proceed as Request Changes
   - Both Block → Proceed as Block
   - Disagreement → Flag for human review

2. **Findings Comparison**:
   - Common findings: Appear in both reviews
   - Review 1 only: Unique to functional perspective
   - Review 2 only: Unique to critical perspective
   - Severity differences: Same finding, different severity

3. **Action Item Aggregation**:
   - Combine all action items
   - Resolve severity conflicts (take higher severity)
   - Remove duplicates
```

#### Handle Disagreement:
```yaml
If reviews disagree on outcome OR have significant differences:
  Action: Record blocking point:
    - story_key: {current_story}
    - step: "review"
    - reason: "Two perspectives disagree on review outcome - needs human review"
    - context:
      - review1_outcome: {outcome}
      - review2_outcome: {outcome}
      - key_differences: [list]
      - review1_only_findings: [items]
      - review2_only_findings: [items]
    - status: "blocked"
    - needs_human_review: true

  Action: In semi-automated mode:
    - Present both reviews to user
    - Highlight disagreements
    - Ask for decision:
      1. Approve despite differences
      2. Request changes based on combined findings
      3. Block and investigate further
      4. Pause for manual review

  Action: In headless mode:
    - ALWAYS block and flag for human review
    - Mark as blocked
    - Record all findings
    - Continue to next story or checkpoint
    - Note: Human review required before proceeding
```

### Phase 5: Review Outcome Handling

#### Outcome: APPROVE (Both reviews approve)
```yaml
Action: Update story file:
  - Mark all action items as resolved (if none)
  - Add to Dev Agent Record: "✅ Code Review: Approved by both AI perspectives"

Action: Update sprint status:
  - Load {sprint_status_path}
  - Update development_status[{current_story}] = "done"
  - Update last_updated

Action: Update execution context:
  - Add to stories_completed
  - Remove from stories_blocked if present
  - Set current_story = null
  - Save context

Output: ✅ Code Review: Approved - {current_story} → done
```

#### Outcome: CHANGES REQUESTED
```yaml
Action: Analyze action items to determine if auto-fixable:

Auto-fixable issues:
- Naming convention violations
- Code formatting (if auto-fix tools available)
- Missing semicolons/commas
- Simple import organization
- Obvious variable renaming
- Comment additions

Non-auto-fixable issues:
- Logic errors requiring design changes
- Architectural issues
- Security vulnerabilities requiring rework
- Performance issues requiring algorithm changes
- Missing functionality that requires new code

If ALL action items are auto-fixable:
  Action: Increment retry count for review step
  Action: If retry_count < 2:
    - Attempt auto-fix based on review findings
    - Update File List with fixed files
    - Add to Change Log: "Fixed code review issues"
    - Re-run tests to verify no regression
    - Re-run code review (Review 1 only for confirmation)
    - If approved: Mark as done
    - If still issues: Record as blocking point
  Action: Else:
    - Record as blocking point
    - Mark for human review

If SOME issues are non-auto-fixable:
  Action: Record as blocking point
  Action: Mark status as "changes-requested"
  Action: Add "Review Follow-ups (AI)" section to story file tasks
  Action: Update sprint status to "in-progress" for rework
  Action: In semi-automated mode: Ask user if they want to:
    1. Auto-fix what's possible and review remaining
    2. Review all changes manually
    3. Pause for later
```

#### Outcome: BLOCKED
```yaml
Action: Record blocking point:
  - story_key: {current_story}
  - step: "review"
  - reason: "Code review blocked - critical issues found"
  - context:
    - review_outcome: "Blocked"
    - critical_issues: [list]
    - recommendations: [list]
  - status: "blocked"

Action: Update story file with clear block reasons
Action: Update sprint status to "blocked"
Action: Add to stories_blocked in execution context
Action: Save all artifacts

In semi-automated mode:
  Output: 🚫 Code Review: Blocked - {current_story}
          
          Critical Issues Found:
          - {issue1}
          - {issue2}
          
          Options:
          1. Review and address issues
          2. Skip this story
          3. Pause execution
          
  Ask user for decision

In headless mode:
  Output: 🚫 Code Review: Blocked - {current_story} - Recording blocking point
  Action: Continue to next story or checkpoint
```

## Update Story File

### Final Review Summary:
```yaml
Action: Add "Code Review Summary" section to story file:

Code Review Summary:
  - Review Mode: Dual Perspectives (Functional + Critical)
  - Review 1 Outcome: {outcome}
  - Review 2 Outcome: {outcome}
  - Final Outcome: {outcome}
  - Total Issues Found: {count}
  - Issues Resolved: {count}
  - Issues Remaining: {count}
  - Reviewers Agreed: {yes/no}
  
  Notes:
    - Review 1 focused on: Functional correctness, AC satisfaction, code quality
    - Review 2 focused on: Security, Performance, Edge Cases, Design

Action: Save review_mode to execution context
Action: Save final state to {execution_context_path}
```

## Communication

### In semi-automated mode:
```
Output: 🔍 Code Review Complete: {current_story}

Review Summary:
- Review 1 (Functional): {outcome} - {high}H, {med}M, {low}L
- Review 2 (Critical): {outcome} - {high}H, {med}M, {low}L
- Perspectives Agreed: {yes/no}
- Final Outcome: {outcome}

Would you like to:
1. Review detailed findings
2. {action based on outcome}
3. Pause execution
```

### In headless mode:
```
Output: ✅ Review Approved: {current_story} → done (自动继续)
        OR
        🔄 Review: Changes Requested - Attempting auto-fix (自动继续)
        OR
        🚫 Review: Blocked - Recording for human review (自动继续)
```

## 流程记录 (Execution Log)

### 记录代码审查步骤
```yaml
Action: Record Code Review in Execution Log
- Log Path: {implementation_artifacts}/execution-log-{execution_id}.md
- Story: {current_story}
- Step: Code Review
- Timestamp: {current_datetime}
- Status: {success / failed}
- Details:
  - Review Mode: Dual Perspectives
  - Review 1: {outcome} - {high}H, {med}M, {low}L
  - Review 2: {outcome} - {high}H, {med}M, {low}L
  - Perspectives Agreed: {yes/no}
  - Final Outcome: {outcome}
- Save to execution log
```

## Next Step

**If approved**:
- **Headless mode**: Directly load `references/step-06-status-update.md`
- **Semi-automated mode**: Ask user, then load `references/step-06-status-update.md`

**If changes requested and auto-fixable**:
- **Headless mode**: Directly goto step 03 (development) with review context
- **Semi-automated mode**: Ask user, then goto step 03

**If changes requested and not auto-fixable**:
- Record as blocking point
- **Headless mode**: Directly load `references/step-07-checkpoint.md`
- **Semi-automated mode**: Ask user, then load `references/step-07-checkpoint.md`

**If blocked**:
- Record as blocking point
- **Headless mode**: Directly load `references/step-07-checkpoint.md`
- **Semi-automated mode**: Ask user, then load `references/step-07-checkpoint.md`

**If reviews disagree**:
- Record as critical blocking point
- **Headless mode**: Directly continue to checkpoint
- **Semi-automated mode**: Ask user, then continue

**IMPORTANT**: Headless mode MUST NOT ask any questions - always proceed automatically!

## State Persistence

**Save execution context after**:
- Each review completion
- Review comparison
- Outcome determination
- Blocking point recording

**Context fields to update**:
- `current_step`: "review" (during) or "review-complete" (after)
- `retry_counts`: Update if retries occurred
- `last_updated`: Timestamp
- `stories_completed` or `stories_blocked`: Update as appropriate
