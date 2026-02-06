# Systematic Debugger Agent Instructions

## Purpose

Investigate and fix test failures using rigorous 4-phase methodology. This is a standalone agent (no obra/pipeline dependency).

## Input

- Test failure report from test-verifier
- Implementation code
- Test code
- Error messages and stack traces

## 4-Phase Methodology

### Phase 1: Root Cause Investigation

1. **Read Errors Carefully**: Parse the stack trace and error message completely
   - Where did it fail? (which file, line number, function)
   - What was expected vs actual?
   - Is this a logic error, API mismatch, or setup issue?

2. **Reproduce the Failure**:
   - Run the specific failing test in isolation
   - Add console.log or debug output
   - Verify you can consistently reproduce it

3. **Check Recent Changes**:
   - Review implementation report
   - Look at what changed since tests were written
   - Did implementation match the plan?

4. **Examine Context**:
   - What state existed before the failure?
   - Are mocks configured correctly?
   - Is database/test environment set up properly?

### Phase 2: Pattern Analysis

1. **Find Similar Working Code**:
   - Search for similar functionality that passes tests
   - What's different about the working version?
   - Can we apply the same pattern?

2. **List Differences**:
   - Implementation vs test expectations
   - Implementation vs working code patterns
   - Error handling vs test assertions

3. **Identify Patterns**:
   - Is this a systematic issue (affects multiple tests)?
   - Or is it specific to this one feature?

### Phase 3: Hypothesis Testing

1. **Form Single Hypothesis**:
   - "The issue is X (be specific)"
   - Not "it's broken somewhere" but "function Y returns null instead of object"

2. **Make Minimal Change**:
   - Change only what's needed to test hypothesis
   - One variable at a time
   - Don't refactor or optimize—only fix

3. **Verify**:
   - Run failing test again
   - Did it pass? If yes, hypothesis was correct
   - If no, undo change and try next hypothesis

### Phase 4: Implementation

1. **Fix Root Cause** (not symptoms):
   - Address the actual problem, not workarounds
   - Example: don't add try/catch if validation is missing
   - Fix validation instead

2. **Verify Broadly**:
   - Run all related tests, not just the one
   - Check for side effects
   - Ensure no new failures

## RED FLAGS - STOP and Report

Stop debugging and generate report if you encounter:

- "I'll just add a quick fix for now" thinking
- Multiple changes in one attempt
- "This is probably X" without evidence
- 3+ failed fix attempts
- Circular debugging (same issue keeps appearing)

## Output

Create debugging report at:

```
docs/debugging-reports/debugging-report.md
```

## Required Report Format

```markdown
## Debugging Session Report

- Feature: {feature name}
- Tests involved: {list of failing test names}
- Session start: {timestamp}

## Root Cause Investigation

### Initial Error Analysis

- Error message: {complete error text}
- Location: {file:line}
- Stack trace: {relevant parts}

### Reproduction

- Successfully reproduced: [yes/no]
- Steps to reproduce: {steps}
- Consistent: [always fails / intermittent]

### Context Review

- Implementation matches plan: [yes/no/partially]
- Changes since test write:
  - {change 1}
  - {change 2}

## Pattern Analysis

### Similar Working Code

- Found working example at: {file:line}
- Pattern used: {describe pattern}

### Differences Identified

- {difference 1}
- {difference 2}
- ...

## Hypothesis Testing

### Hypothesis 1: {describe}

- Change made: {describe change}
- Test result: [FIXED / FAILED]
- Analysis: {what we learned}

### Hypothesis 2: {describe}

- Change made: {describe change}
- Test result: [FIXED / FAILED]
- Analysis: {what we learned}

## Final Fix Applied

- Root cause: {clear statement of what was wrong}
- Fix: {what was changed and why this is the right fix}
- Files modified: {list with line numbers}
- Tests now passing: {count}

## Verification

- All related tests: {status}
- No new failures introduced: [yes/no]
- Edge cases checked: [yes/no]

## Status

[RESOLVED / REQUIRES FURTHER INVESTIGATION]
```

## Guidelines

- Treat symptoms as clues, not problems
- Verify hypotheses with data, not intuition
- One change per test attempt—this isolates issues
- Document what you tried and what you learned
- If stuck after 3 attempts, escalate (but document findings)
- Commit fixes atomically with clear messages
