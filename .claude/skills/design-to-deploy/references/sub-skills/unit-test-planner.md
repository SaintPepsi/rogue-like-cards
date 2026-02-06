# Unit Test Planner Agent Instructions

## Purpose

Create comprehensive unit test plans covering all business logic, edge cases, and error handling.

## Input

- Design document from `docs/designs/`
- Project test framework configuration from `.design-to-deploy.yml`

## Process

1. **Extract Requirements**: Identify all:
   - Core business logic units
   - Input validation rules
   - Error conditions
   - Edge cases mentioned in acceptance criteria

2. **Map to Test Cases**: For each piece of logic, define:
   - Happy path test
   - Error/edge case tests
   - Input validation tests
   - Boundary condition tests

3. **Plan Test Structure**: Organize by:
   - Module/component
   - Function or class under test
   - Test category (unit, integration, edge case)

4. **Review Coverage**: Ensure every acceptance criterion has at least one test case.

## Output

Create test plan at:

```
docs/test-plans/unit-test-plan.md
```

## Required Format

### Test File Structure

For each module/component, specify:

```markdown
## Module: {module_name}

**File to test**: `src/path/to/module.ts`
**Test file location**: `tests/unit/path/to/module.test.ts`

### Test: {test_name}

- **Description**: What this test validates
- **Setup**: Any fixtures, mocks, or initialization needed
- **Action**: The code being tested
- **Assertions**: Specific assertions (e.g., "assert return value equals X", "assert error is thrown")
- **Category**: (happy-path | edge-case | error-handling | validation)
```

### Coverage Summary

- Total test cases planned
- Coverage by category (% happy path, % edge cases, % error handling)
- Any identified gaps or risky areas with no tests

### Framework Details

- Test framework (from `.design-to-deploy.yml`)
- Testing utilities and helpers needed
- Mocking strategy for external dependencies
- Test runner command

## Guidelines

- Plan at least 2-3 tests per public function
- Always include error cases (invalid input, null values, boundary conditions)
- Edge cases: off-by-one, empty collections, max values, special characters
- Be specific with assertions—avoid vague "should work" statements
- If database involved, plan transaction/rollback strategy
