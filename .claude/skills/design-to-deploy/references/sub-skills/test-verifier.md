# Test Verifier Agent Instructions

## Purpose

Run all tests and verify they pass now that feature is implemented. Handle test failures with targeted fixes or escalation.

## Input

- Implemented feature code
- Unit test files: `tests/unit/`
- E2E test files: `tests/e2e/`
- Feature implementation report: `docs/implementation-reports/feature-implementation-report.md`

## Process

1. **Run Unit Tests**:
   - Use test command from `.design-to-deploy.yml`
   - Capture full output and test results
   - Count passes and failures

2. **Run E2E Tests**:
   - Use test command from `.design-to-deploy.yml`
   - Verify browser sessions work
   - Capture screenshots and results

3. **Analyze Failures** (if any):
   - Read error messages carefully
   - Identify root cause: logic error? API mismatch? setup issue?
   - Make targeted fix (single issue per attempt)
   - Rerun only failed tests

4. **Attempt Fixes** (Max 2 in this context):
   - **Attempt 1**: Fix most obvious issue, rerun tests
   - **Attempt 2**: Fix next issue, rerun tests
   - If still failing after 2 attempts → escalate

5. **Escalate After 2 Failures**:
   - Generate debugging report
   - Hand off to systematic-debugger agent
   - Do NOT continue attempting fixes

## Output

### Test Results

Create file at:

```
docs/test-reports/test-verification-report.md
```

## Required Report Format

```markdown
## Test Execution Summary

- Date: {date}
- Test command (unit): {command used}
- Test command (E2E): {command used}

## Unit Test Results

- **Status**: [ALL PASS / SOME FAILED]
- Total tests: {count}
- Passed: {count}
- Failed: {count}

### Test Results Detail

- {test name}: PASS
- {test name}: PASS
- {test name}: FAIL - {error message}
  - Error context: {relevant output}
- ...

## E2E Test Results

- **Status**: [ALL PASS / SOME FAILED]
- Total tests: {count}
- Passed: {count}
- Failed: {count}

### Test Results Detail

- {test name}: PASS - screenshot captured at {location}
- {test name}: FAIL - {error message}
  - Failed at action: {what the test was doing}
  - Error context: {relevant output}
- ...

## Failure Analysis

### Attempt 1

- Issue identified: {what was wrong}
- Fix applied: {what changed}
- Command: {fix command/change}
- Result: [FIXED / STILL FAILING]

### Attempt 2 (if needed)

- Issue identified: {what was wrong}
- Fix applied: {what changed}
- Result: [FIXED / ESCALATED]

## Final Status

- [READY TO MERGE / ESCALATED TO DEBUGGING]
- Summary: {one sentence}

## If Escalated

- Failures summary: {list of still-failing tests}
- Root causes identified but not fixed: {list}
- Passed to: systematic-debugger agent
```

## Guidelines

- Read error messages completely before fixing
- Check for patterns: are multiple tests failing with same error?
- Targeted fixes are better than broad changes
- Run specific test files, not entire suite when debugging
- E2E screenshot failures might indicate visual regressions—check diffs
- After 2 failed attempts, step back and let debugger investigate
