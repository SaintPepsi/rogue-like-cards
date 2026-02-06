# Review Compiler Agent Instructions

## Purpose

Synthesize all artifacts and results into a final review document with summary, verification checklist, and handoff guidance for human review.

## Input

- Design document: `docs/designs/*.md`
- Feature plan: `docs/implementation-plans/feature-plan.md`
- Test plans: `docs/test-plans/unit-test-plan.md` and `e2e-test-plan.md`
- All reports:
  - `docs/test-reports/test-implementation-report.md`
  - `docs/test-reports/test-verification-report.md`
  - `docs/implementation-reports/feature-implementation-report.md`
  - `docs/cross-check-report.md`
  - `docs/compliance-reports/compliance-report.md`
  - `docs/debugging-reports/debugging-report.md` (if present)
- Test results (pass/fail status)
- Git commit log for this feature

## Process

1. **Compile Summary**: Extract key facts from all reports
   - What was built?
   - How many tests? How many pass?
   - Are all design requirements met?
   - Any issues or gaps?

2. **Assess Quality**:
   - Test coverage adequate?
   - Implementation follows patterns?
   - Code quality acceptable?
   - Edge cases handled?

3. **List Manual Verification Steps**: What should human reviewer test?
   - Critical user journeys
   - Error scenarios
   - Performance or edge cases not easily testable

4. **Identify Concerns**: Flag anything that needs attention:
   - Untested code paths
   - Complex areas that might have bugs
   - Performance considerations
   - Security implications

5. **Determine Status**: Is this ready to merge?
   - All tests passing?
   - Design compliance verified?
   - Code quality acceptable?
   - Documentation complete?

## Output

Create review notes at:

```
docs/review-notes.md
```

## Required Format

```markdown
# Code Review Notes

## Overview

- Feature: {feature name}
- Branch/Commits: {commit hashes or range}
- Review date: {date}
- Status: [READY TO MERGE / NEEDS REVIEW / NEEDS FIXES]

## What Changed

### Summary

{1-2 sentence summary of what was implemented}

### Scope

- Files created: {count}
- Files modified: {count}
- Lines added: {count}
- Lines removed: {count}

### Key Changes

- {component/file}: {what changed}
- {component/file}: {what changed}
- ...

## Test Results Summary

### Unit Tests

- Total: {count}
- Passing: {count}
- Failing: {count}
- Coverage: {areas covered}

### E2E Tests

- Total: {count}
- Passing: {count}
- Failing: {count}
- Scenarios covered: {list key scenarios}

### Test Quality

- [✓/✗] Tests are specific and meaningful
- [✓/✗] Edge cases covered
- [✓/✗] Error cases tested
- [✓/✗] Test names are clear and descriptive

## Design Compliance

### Requirements Met

- [✓/✗] All acceptance criteria satisfied
- [✓/✗] All requirements implemented
- [✓/✗] Scope declaration honored (type, complexity, splits)

### Deviations

- {deviation 1}: {brief explanation}
- {deviation 2}: {brief explanation}
- (or "None" if fully compliant)

## Code Quality Assessment

### Strengths

- {positive observation}
- {positive observation}

### Areas for Manual Verification

- [ ] {behavior to manually test}
- [ ] {behavior to manually test}
- [ ] {behavior to manually test}

### Edge Cases & Concerns

- **Concern**: {describe potential issue}
  - Severity: [low / medium / high]
  - Suggested manual test: {what to try}

- **Concern**: {describe potential issue}
  - Severity: [low / medium / high]
  - Suggested manual test: {what to try}

## Implementation Quality

### Code Organization

- [✓/✗] Files are well-organized
- [✓/✗] Naming is clear and consistent
- [✓/✗] No dead code or debug statements
- [✓/✗] Comments explain non-obvious logic

### Architecture Adherence

- [✓/✗] Follows project conventions
- [✓/✗] Integrates cleanly with existing code
- [✓/✗] No breaking changes to public APIs
- Notes: {any architecture concerns}

## What a Human Reviewer Should Check

### Critical (Must Verify Before Merge)

1. {specific behavior to manually test}
   - How to test: {steps}
   - Expected result: {what should happen}

2. {specific behavior to manually test}
   - How to test: {steps}
   - Expected result: {what should happen}

### Important (Should Verify When Possible)

1. {behavior}
   - How to test: {steps}

2. {behavior}
   - How to test: {steps}

### Nice to Verify (If Time Permits)

1. {edge case or scenario}
2. {edge case or scenario}

## Overall Assessment

### Ready for Merge?

[YES / NO / WITH RESERVATIONS]

### Summary

{2-3 sentence assessment of implementation quality and readiness}

### Recommendations

- {action item if any}
- {action item if any}

## Artifacts for Reference

- Design: `docs/designs/{design-file}`
- Feature Plan: `docs/implementation-plans/feature-plan.md`
- Test Plans: `docs/test-plans/{unit,e2e}-test-plan.md`
- Implementation Report: `docs/implementation-reports/feature-implementation-report.md`
- Test Results: `docs/test-reports/test-verification-report.md`
- Compliance: `docs/compliance-reports/compliance-report.md`
```

## Guidelines

- Be honest: flag real concerns
- Distinguish between "needs fixing" and "worth noting"
- Manual verification checklist should be actionable
- Severity levels help prioritize what to check first
- Provide specific steps for manual testing
- Keep summary concise—details go in reports
