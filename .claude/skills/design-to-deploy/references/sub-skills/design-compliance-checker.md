# Design Compliance Checker Agent Instructions

## Purpose

Verify that implemented code fulfills all requirements and acceptance criteria from the original design document.

## Input

- Design document: `docs/designs/*.md`
- Implemented code (all modified and created files)
- Feature implementation report
- Test results from test-verifier

## Process

1. **Read Design Doc Completely**:
   - Extract all requirements
   - Extract all acceptance criteria
   - Extract any technical constraints or decisions
   - Note scope declaration

2. **Map Requirements to Implementation**:
   - For each requirement, identify corresponding code
   - For each acceptance criterion, verify test exists and passes
   - Check technical decisions are actually reflected in code

3. **Verify Acceptance Criteria**:
   - Every AC must have a passing test
   - Test results must show this is working
   - No untested acceptance criteria

4. **Check Constraints**:
   - Architecture decisions followed?
   - Technology choices respected?
   - Performance targets met?
   - Security considerations addressed?

5. **Document Deviations**:
   - Any requirement not met?
   - Any acceptance criterion not satisfied?
   - Any changes made that weren't in design?
   - Explain each deviation: intentional or unintended?

## Output

Create compliance report at:

```
docs/compliance-reports/compliance-report.md
```

## Required Report Format

```markdown
## Design Compliance Report

- Design doc reviewed: {file path}
- Implementation reviewed: {files checked}
- Review date: {date}

## Requirements Compliance

### Requirement: {requirement from design}

- [✓ MET / ✗ NOT MET / ⚠ PARTIAL]
- Implementation: {where in code this is satisfied}
- Supporting evidence: {test name if applicable}
- Status detail: {any notes}

### Requirement: {requirement from design}

- [✓ MET / ✗ NOT MET / ⚠ PARTIAL]
- Implementation: {where in code}
- Supporting evidence: {test results}

... (repeat for all major requirements)

## Acceptance Criteria Compliance

### User Story: {story title}

- **AC 1**: {acceptance criterion}
  - Status: [✓ MET / ✗ NOT MET]
  - Test covering this: {test name}
  - Test result: [PASS / FAIL]

- **AC 2**: {acceptance criterion}
  - Status: [✓ MET / ✗ NOT MET]
  - Test covering this: {test name}
  - Test result: [PASS / FAIL]

... (repeat for all acceptance criteria)

## Technical Constraints Review

- Constraint: {from design doc}
  - Status: [✓ MET / ✗ NOT MET]
  - How verified: {how we know this is true}

... (repeat for all constraints)

## Deviations from Design

### Intentional Changes

- {Change}: {Reason why this was better}
- {Change}: {Reason}

### Unintentional Gaps

- {Gap}: {What was supposed to be there}
- {Gap}: {Impact}

### Additional Functionality

- {Feature added}: {Was this in scope? Why added?}

## Completeness Summary

- Total requirements: {count}
- Met: {count}
- Partial: {count}
- Not met: {count}

- Total acceptance criteria: {count}
- Tests passing: {count}
- Tests failing: {count}
- No test coverage: {count}

## Risk Assessment

- [ ] All critical requirements met
- [ ] All acceptance criteria have passing tests
- [ ] No critical gaps or deviations
- [ ] Architecture matches design intent
- Concerns: {if any}

## Final Status

[COMPLIANT / NON-COMPLIANT WITH NOTES / DEVIATIONS]

- Summary: {one sentence conclusion}
- Recommendation: {merge / address gaps / review}
```

## Guidelines

- Be thorough—check every AC in design doc
- Distinguish between "not implemented" and "implemented differently"
- Deviations aren't necessarily bad—but they must be intentional and documented
- Use test results as primary evidence
- Note any ambiguities in the original design
- Flag any untested acceptance criteria as risks
