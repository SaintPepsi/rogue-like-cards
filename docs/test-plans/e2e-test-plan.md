# E2E Test Plan: Attack Category Counter

## Overview

This test plan covers end-to-end testing for the Attack Category Counter feature using Playwright. Tests verify that attack counters are visible, increment correctly, persist across page refreshes, reset on new runs, and display on the Game Over screen.

## Test Infrastructure

### Test File Location

```
src/routes/_attack-category-counter.spec.ts
```

Following the existing pattern, test files are colocated in `src/routes/` with the `_` prefix and `.spec.ts` suffix.

### Dependencies

- `@playwright/test` (already configured)
- `src/routes/_test-helpers.ts` - Existing helper for `seedRandom()`
- `$lib/version` - For changelog version mocking

### Test Configuration

Uses existing `playwright.config.ts`:

- Test directory: `src`
- Test match: `**/*.spec.ts`
- Base URL: `http://localhost:5173`
- Browser: Chromium (Desktop Chrome)
- Timeout: 60 seconds

### Screenshot Baselines

Screenshots stored in:

```
src/routes/_attack-category-counter.spec.ts-snapshots/
```

---

## Test Scenarios

### Scenario 1: Attack Counters Visible in Battle-Stats Area

**User Story Reference:** Story 1 - View Attack Breakdown During Run

**Setup:**

1. Seed random number generator for deterministic behavior
2. Navigate to game
3. Clear localStorage, set changelog version
4. Reload and wait for game initialization

**Steps:**

| Step | Action                                    | Expected UI Change                                  |
| ---- | ----------------------------------------- | --------------------------------------------------- |
| 1    | Wait for `.enemy` to be visible           | Enemy sprite rendered                               |
| 2    | Attack enemy once (pointerdown/pointerup) | Hit lands on enemy                                  |
| 3    | Wait for attack counter UI to appear      | `.attack-counts` section visible in `.battle-stats` |
| 4    | Verify attack counter element exists      | At least one `.attack-count` element present        |

**Visual Assertions:**

- Screenshot: `attack-counters-visible.png`
- Capture `.battle-stats` section after first attack

**Functional Assertions:**

```typescript
await expect(page.locator('.attack-counts')).toBeVisible();
await expect(page.locator('.attack-count').first()).toBeVisible();
```

---

### Scenario 2: Normal Attack Increments "Normal" Counter

**User Story Reference:** Story 1 - View Attack Breakdown During Run

**Setup:**

1. Same as Scenario 1
2. Use deterministic seed where normal attacks occur (no crits)

**Steps:**

| Step | Action                                              | Expected UI Change  |
| ---- | --------------------------------------------------- | ------------------- |
| 1    | Read initial normal hit count (or 0 if not present) | -                   |
| 2    | Attack enemy 5 times with pointerdown/pointerup     | Hits land on enemy  |
| 3    | Wait for UI to update after each attack             | Hit numbers animate |
| 4    | Read final normal hit count                         | Counter incremented |

**Visual Assertions:**

- Screenshot: `normal-attack-counter.png`
- Capture after 5 attacks showing counter value

**Functional Assertions:**

```typescript
// Verify "Normal Hits" counter exists and shows a count
const normalCounter = page.locator('.attack-count.normal');
await expect(normalCounter).toContainText('Normal Hits');
const countText = await normalCounter.textContent();
const count = parseInt(countText?.replace(/\D/g, '') || '0', 10);
expect(count).toBeGreaterThanOrEqual(5);
```

---

### Scenario 3: Critical Hit Increments "Critical" Counter

**User Story Reference:** Story 1 - View Attack Breakdown During Run

**Setup:**

1. Same base setup as Scenario 1
2. Configure game state to guarantee critical hits OR attack many times to ensure crits occur

**Steps:**

| Step | Action                                 | Expected UI Change                         |
| ---- | -------------------------------------- | ------------------------------------------ |
| 1    | Force high crit chance via test helper | -                                          |
| 2    | Attack enemy multiple times            | Critical hits land (visual crit indicator) |
| 3    | Read crit counter value                | `.attack-count.crit` shows count > 0       |

**Note:** This test may require exposing a test helper to temporarily boost crit chance, or attacking enough times with deterministic RNG to guarantee crits.

**Alternative approach using existing test harness:**

```typescript
// Attack 50 times - with base crit chance, some should be crits
for (let i = 0; i < 50; i++) {
	await enemy.dispatchEvent('pointerdown');
	await page.waitForTimeout(30);
	await enemy.dispatchEvent('pointerup');
	await page.waitForTimeout(50);
	// Handle modals if needed
}
```

**Visual Assertions:**

- Screenshot: `crit-attack-counter.png`
- Capture showing Critical Hits counter with non-zero value

**Functional Assertions:**

```typescript
const critCounter = page.locator('.attack-count.crit');
await expect(critCounter).toBeVisible();
await expect(critCounter).toContainText('Critical Hits');
```

---

### Scenario 4: Counters Reset on New Run

**User Story Reference:** Story 2 - Attack Stats Persist Across Page Refresh (reset behavior)

**Setup:**

1. Complete a run with some attacks landed
2. Start new run

**Steps:**

| Step | Action                                                | Expected UI Change                               |
| ---- | ----------------------------------------------------- | ------------------------------------------------ |
| 1    | Complete a run (trigger boss timeout via test helper) | Game Over modal appears                          |
| 2    | Note attack counter values on Game Over screen        | Counters show totals                             |
| 3    | Click "Play Again" to start new run                   | New game starts                                  |
| 4    | Skip legendary modal if shown                         | Game begins fresh                                |
| 5    | Attack enemy once                                     | New counter starts from fresh state              |
| 6    | Verify counters show fresh values (not cumulative)    | Counter shows value close to 1, not previous + 1 |

**Visual Assertions:**

- Screenshot: `counters-after-reset.png`
- Capture battle-stats after first attack of new run

**Functional Assertions:**

```typescript
// After new run starts and first attack
const normalCounter = page.locator('.attack-count.normal');
const countText = await normalCounter.textContent();
const count = parseInt(countText?.replace(/\D/g, '') || '0', 10);
// Should be small (just started new run), not accumulated from previous
expect(count).toBeLessThan(10);
```

---

### Scenario 5: Multiple Attack Types Tracked Simultaneously

**User Story Reference:** Story 1 - View Attack Breakdown During Run

**Setup:**

1. Configure game state with poison active (requires poison cards/upgrades)
2. Or attack enough times to trigger various hit types

**Steps:**

| Step | Action                                                 | Expected UI Change                |
| ---- | ------------------------------------------------------ | --------------------------------- |
| 1    | Play extended session with attacks                     | Various hit types occur           |
| 2    | Allow poison ticks to occur (if poison stacks applied) | Poison damage ticks               |
| 3    | Verify multiple counter types visible                  | Multiple `.attack-count` elements |

**Visual Assertions:**

- Screenshot: `multiple-attack-types.png`
- Capture showing 2+ different attack type counters

**Functional Assertions:**

```typescript
// Verify at least normal attacks are tracked
const attackCounts = page.locator('.attack-count');
const count = await attackCounts.count();
expect(count).toBeGreaterThanOrEqual(1);

// Verify each visible counter has a type class
const counters = await attackCounts.all();
for (const counter of counters) {
	const classList = await counter.getAttribute('class');
	expect(classList).toMatch(/(normal|crit|execute|poison)/);
}
```

---

### Scenario 6: Attack Stats Persist Across Page Refresh

**User Story Reference:** Story 2 - Attack Stats Persist Across Page Refresh

**Setup:**

1. Standard game setup
2. Attack enemy multiple times to accumulate counts

**Steps:**

| Step | Action                                  | Expected UI Change               |
| ---- | --------------------------------------- | -------------------------------- |
| 1    | Attack enemy 10 times                   | Counters accumulate              |
| 2    | Note current counter values             | -                                |
| 3    | Refresh the page                        | Page reloads                     |
| 4    | Wait for game to restore                | Enemy visible, game state loaded |
| 5    | Verify counter values match pre-refresh | Counters show same values        |

**Visual Assertions:**

- Screenshot: `counters-after-refresh.png`
- Capture showing preserved counter values

**Functional Assertions:**

```typescript
// Before refresh
const beforeCount = await getCounterValue(page, 'normal');

// Refresh
await page.reload();
await page.locator('.enemy').waitFor({ state: 'visible' });
await page.waitForTimeout(500);

// After refresh
const afterCount = await getCounterValue(page, 'normal');
expect(afterCount).toEqual(beforeCount);
```

---

### Scenario 7: Attack Stats Display on Game Over

**User Story Reference:** Story 3 - View Attack Stats on Game Over

**Setup:**

1. Play a run with various attacks
2. Trigger game over

**Steps:**

| Step | Action                                                       | Expected UI Change                        |
| ---- | ------------------------------------------------------------ | ----------------------------------------- |
| 1    | Attack enemy multiple times                                  | Counters accumulate                       |
| 2    | Trigger boss timeout via `__test__.triggerBossExpired(true)` | Game Over modal appears                   |
| 3    | Verify attack breakdown visible in modal                     | Attack counts shown in `.game-over-stats` |

**Visual Assertions:**

- Screenshot: `game-over-attack-stats.png`
- Capture full Game Over modal showing attack breakdown

**Functional Assertions:**

```typescript
const gameOverModal = page.locator('.modal.game-over');
await expect(gameOverModal).toBeVisible();

// Verify attack stats are shown (implementation-dependent selector)
const attackStatsInModal = gameOverModal.locator(
	'.attack-counts, [data-testid="attack-breakdown"]'
);
await expect(attackStatsInModal).toBeVisible();
```

---

## Test Helpers Required

### Existing Helpers (reuse)

- `seedRandom(page, seed)` - Deterministic RNG
- `__test__.triggerBossExpired(isNaturalDeath)` - Force game over

### New Helpers (optional)

Consider exposing on `window.gameState.__test__`:

```typescript
__test__: {
  // Existing
  triggerBossExpired: (isNaturalDeath: boolean) => void;

  // New for attack counter testing (OPTIONAL - can verify via UI selectors instead)
  getAttackCounts: () => Record<string, number>;
  setAttackCounts: (counts: Record<string, number>) => void;
  forceNextAttackType: (type: HitType) => void; // Optional: for deterministic type testing
}
```

**Note:** These helpers are optional. Attack counts can be verified through UI selectors (`.attack-count.{type}`) since the feature displays counts in the DOM. Direct state access is only needed for edge case testing where UI verification is insufficient.

### Helper Function for Tests

```typescript
async function getCounterValue(page: Page, type: string): Promise<number> {
	const counter = page.locator(`.attack-count.${type}`);
	if (!(await counter.isVisible().catch(() => false))) {
		return 0;
	}
	const text = await counter.textContent();
	return parseInt(text?.replace(/\D/g, '') || '0', 10);
}
```

---

## Execution Strategy

### Local Development

```bash
bun run test:e2e
# or
npx playwright test src/routes/_attack-category-counter.spec.ts
```

### CI Pipeline

Tests run on Chromium in headless mode. Screenshots are compared against baselines.

### Screenshot Update

```bash
npx playwright test --update-snapshots
```

### Test Order

Tests should be independent but run in this order for logical progression:

1. Visibility test (Scenario 1) - basic rendering
2. Normal attack test (Scenario 2) - primary counter
3. Crit attack test (Scenario 3) - secondary counter
4. Multiple types test (Scenario 5) - all counters
5. Persistence test (Scenario 6) - save/load
6. Reset test (Scenario 4) - new run behavior
7. Game Over test (Scenario 7) - end state display

---

## CSS Selectors Reference

| Element                | Selector                | Description                    |
| ---------------------- | ----------------------- | ------------------------------ |
| Battle stats container | `.battle-stats`         | Parent container for all stats |
| Attack counts section  | `.attack-counts`        | Container for attack breakdown |
| Individual counter     | `.attack-count`         | Each attack type counter       |
| Normal counter         | `.attack-count.normal`  | Normal hits counter            |
| Crit counter           | `.attack-count.crit`    | Critical hits counter          |
| Execute counter        | `.attack-count.execute` | Execute counter                |
| Poison counter         | `.attack-count.poison`  | Poison ticks counter           |
| Game Over modal        | `.modal.game-over`      | Game over modal                |
| Game over stats        | `.game-over-stats`      | Stats section in modal         |
| Enemy target           | `.enemy`                | Clickable enemy element        |

---

## Risk Mitigation

### Flaky Test Prevention

1. Use `seedRandom()` for all tests to ensure deterministic RNG
2. Wait for UI elements before assertions
3. Use `waitForTimeout()` after attacks to allow game loop processing
4. Handle modal interruptions (level up, chest, shop)

### Screenshot Stability

1. Seed RNG to ensure consistent hit types
2. Wait for animations to complete before capture
3. Use `fullPage: false` for focused component screenshots when possible

### Attack Type Determinism

- With seeded RNG, attack types should be deterministic
- If crit testing is unreliable, consider adding `forceNextAttackType()` test helper
- Alternative: Accept probabilistic testing with enough samples (50+ attacks)
