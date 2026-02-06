# Feature Implementer Agent Instructions

## Purpose

Implement the actual feature code by following the feature plan step-by-step. This is where the design becomes reality.

## Input

- Design document: `docs/designs/*.md`
- Feature plan: `docs/implementation-plans/feature-plan.md`
- Existing test files (already written by test-implementer)

## Process

1. **Read Feature Plan** completely. Understand architecture, file structure, and step sequence.

2. **Follow Steps Sequentially**:
   - Create files in order specified (usually bottom-up: utilities → business logic → integration)
   - For each file creation: follow code patterns shown in plan
   - For each file modification: make changes in specified line ranges
   - Verify each step before moving to next

3. **Match Test Expectations**:
   - Implement function signatures exactly as test plan specifies
   - Error handling must match test assertions
   - Return types must match test expectations
   - Database schema must match test data expectations

4. **Code Quality**:
   - Follow existing project conventions
   - Include comments for non-obvious logic
   - Use consistent naming with rest of codebase
   - No dead code or debug statements

5. **Verify Implementation**:
   - After completing a logical section, run tests
   - Verify tests pass (or at least get further)
   - Fix issues immediately if tests fail

## Output

### Implementation Changes

Modify and create files as specified in feature plan. Commit changes to git.

### Implementation Report

Create file at:

```
docs/implementation-reports/feature-implementation-report.md
```

## Required Report Format

```markdown
## Implementation Summary

- Design doc: {reference}
- Feature plan: {reference}
- Total files created: {count}
- Total files modified: {count}

## Files Created

- {file_path}: {brief description}
- {file_path}: {brief description}
- ...

## Files Modified

- {file_path}: {lines changed, what changed}
- {file_path}: {lines changed, what changed}
- ...

## Implementation Steps Completed

1. {step name}: Status [✓ Complete | ⚠ Partial | ✗ Failed]
2. {step name}: Status [✓ Complete | ⚠ Partial | ✗ Failed]
3. ...

## Code Quality Checks

- [x] Follows project conventions
- [x] No debug code or console.log statements
- [x] Comments added for non-obvious logic
- [x] Error handling implemented
- [x] Function signatures match test expectations
- [ ] Issues found:
  - {describe issue if any}

## Test Results During Implementation

- After step 1: {test status}
- After step 5: {test status}
- After all steps: {test status}

## Git Commit

- Commit hash: {hash}
- Commit message: {message}

## Known Limitations or Deviations

- {any deviations from plan, and why}

## Status

[COMPLETE / NEEDS FIXES]: {one sentence summary}
```

## Guidelines

- Code as if tests are watching (because they are)
- Don't skip steps—follow the plan order
- If a step doesn't work, debug before moving to next
- Commit atomically: logical groups of changes per commit
- Keep implementation focused on the design—no scope creep
- Document any deviations from the plan and why
