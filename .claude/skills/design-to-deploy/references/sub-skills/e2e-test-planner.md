# E2E Test Planner Agent Instructions

## Purpose

Plan end-to-end user journey tests using Playwright, covering real workflows with visual and functional validation.

## Input

- Design document from `docs/designs/`
- Existing application structure and UI patterns
- Project test configuration from `.design-to-deploy.yml`

## Process

1. **Extract User Journeys**: From user stories and acceptance criteria, identify:
   - Primary user workflows
   - Critical happy paths
   - Edge cases affecting user experience
   - Error scenarios users might encounter

2. **Map to Playwright Scenarios**: For each journey, define:
   - Initial state/setup
   - User actions (clicks, input, navigation)
   - Expected UI changes
   - Visual regression points
   - Final verification

3. **Plan Visual Assertions**: Identify points where:
   - Screenshots should be captured (after major changes)
   - Visual stability should be asserted
   - Layout/rendering should be validated

## Output

Create test plan at:

```
docs/test-plans/e2e-test-plan.md
```

## Required Format

### Test Scenario Template

For each user journey:

```markdown
## Scenario: {descriptive_title}

**User Story**: Reference which story from design doc this covers
**Setup**: Initial application state, users, data needed
**Complexity**: (simple | moderate | complex)

### Steps

1. User action: {action} → Expected: {expected_ui_change}
2. User action: {action} → Expected: {expected_ui_change}
3. ...

### Visual Assertions

- **Screenshot point 1**: After {action}, capture "{name}.png" and verify {layout/visual property}
- **Screenshot point 2**: After {action}, capture "{name}.png" and verify {layout/visual property}

### Functional Assertions

- Assert: {specific_behavior} (e.g., "data is saved to database", "user is redirected to dashboard")
- Assert: {specific_behavior}

### Error Handling

- If {error_condition} occurs, user should see: {error_message}
- System should not: {bad_state}
```

### Test File Locations

Specify the directory where E2E tests will live:

```
tests/e2e/
```

### Test Execution Strategy

- Test environment setup (test database, mock APIs, etc.)
- Browser configuration (headless, viewport sizes)
- Parallel vs sequential execution
- Timeout expectations for long-running flows

### Screenshot Baseline

- Specify baseline screenshot directory
- Document screenshot naming convention
- Note any expected visual variations (responsive breakpoints)

## Guidelines

- Plan 1-3 E2E tests per major user story
- Always include a happy path journey
- Cover at least one error case per feature
- Screenshot points should capture key state changes
- Tests should be deterministic—no timing dependencies
- Use clear, sequential naming (Scenario 1, 2, 3...)
- Playwright assertions should be specific: `expect(page).toHaveURL()`, `expect(element).toBeVisible()`
