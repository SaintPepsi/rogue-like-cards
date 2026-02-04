# Reset Versioning E2E Test Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a comprehensive E2E test that verifies the reset versioning flow clears all game data when `lastResetVersion` is outdated, including visual verification through screenshot comparisons.

**Architecture:** Follow TDD approach by writing tests first, then adding missing test infrastructure (test helpers and data-testid attributes). Test uses localStorage manipulation to trigger reset conditions and verifies results through UI elements and screenshot comparisons.

**Tech Stack:** Playwright, TypeScript, Svelte 5 runes

---

## Task 1: Create Test File Structure

**Files:**

- Create: `src/routes/_reset-versioning.spec.ts`

**Step 1: Write the test file skeleton**

Create the test file with imports, describe block, and setupGame helper function following the pattern from `_legendary-selection.spec.ts`:

```typescript
import { expect, test } from '@playwright/test';
import { VERSION, RESET_VERSION } from '$lib/version';

test.describe('Reset Versioning', () => {
	async function setupGame(page: any) {
		await page.goto('/');
		await page.evaluate((version: string) => {
			localStorage.clear();
			localStorage.setItem('changelog_last_seen_version', version);
		}, VERSION);
		await page.reload();
		await page.locator('.enemy').waitFor({ state: 'visible' });
		await page.waitForTimeout(500);
	}

	// Tests will be added in subsequent tasks
});
```

**Step 2: Commit skeleton**

```bash
git add src/routes/_reset-versioning.spec.ts
git commit -m "test: add reset versioning e2e test skeleton"
```

---

## Task 2: Write Main Reset Test (No Screenshot)

**Files:**

- Modify: `src/routes/_reset-versioning.spec.ts`

**Step 1: Add the main reset test (without screenshot checks)**

Add the test case inside the describe block. This test will fail because test helpers and data-testid attributes don't exist yet:

```typescript
test('resets all game data when lastResetVersion is outdated', async ({ page }) => {
	// Phase 1: Establish comprehensive game state
	await setupGame(page);

	await page.evaluate(() => {
		window.gameState?.__test__.addGold(20);
		window.gameState?.__test__.setLevel(5);
	});

	// Verify state was established
	await expect(page.locator('[data-testid="gold-counter"]')).toContainText('20');
	await expect(page.locator('[data-testid="level-counter"]')).toContainText('5');

	// Phase 2: Trigger reset condition
	await page.evaluate(() => {
		localStorage.setItem('roguelike-cards-reset-version', '0.10.0');
	});
	await page.reload();
	await page.locator('.enemy').waitFor({ state: 'visible' });
	await page.waitForTimeout(500);

	// Phase 3: Verify clean slate
	await expect(page.locator('[data-testid="gold-counter"]')).toContainText('0');
	await expect(page.locator('[data-testid="level-counter"]')).toContainText('1');

	// Verify lastResetVersion was updated
	const newResetVersion = await page.evaluate(() => {
		return localStorage.getItem('roguelike-cards-reset-version');
	});
	expect(newResetVersion).toBe(RESET_VERSION);
});
```

**Step 2: Run test to verify it fails**

Run the test to confirm it fails due to missing test helpers and data-testid attributes:

```bash
npx playwright test src/routes/_reset-versioning.spec.ts
```

Expected: Test fails with errors about `addGold` and `setLevel` not being defined, and data-testid selectors not found.

**Step 3: Commit failing test**

```bash
git add src/routes/_reset-versioning.spec.ts
git commit -m "test: add failing reset versioning e2e test"
```

---

## Task 3: Add Test Helpers to gameState

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:776-781`

**Step 1: Add addGold and setLevel test helpers**

Locate the `__test__` object (around line 776) and add the new helpers:

```typescript
		// Test-only methods
		__test__: {
			triggerBossExpired: (isNaturalDeath: boolean = true) => handleBossExpired(isNaturalDeath),
			addGold: (amount: number) => {
				gold = amount;
			},
			setLevel: (newLevel: number) => {
				leveling.level = newLevel;
			},
			get bossTimerMax() {
				return bossTimerMax;
			}
		}
```

**Step 2: Verify leveling module supports level assignment**

Check that `leveling.level` is assignable. If the leveling module uses a private state variable, we may need to add a setter method to the leveling module instead. Read the leveling module to confirm:

```bash
# This is a verification step - read the file to understand the structure
```

If `leveling` is created by `createLeveling()` and doesn't expose a writable `level` property, we'll need to modify the leveling module to add a test-only setter. Otherwise, proceed.

**Step 3: Run test to verify gold helper works**

```bash
npx playwright test src/routes/_reset-versioning.spec.ts
```

Expected: Test still fails but error should now be only about missing data-testid attributes, not about missing `addGold` or `setLevel` helpers.

**Step 4: Commit test helpers**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: add addGold and setLevel test helpers to gameState"
```

---

## Task 4: Add data-testid to Gold Display

**Files:**

- Modify: `src/lib/components/BattleArea.svelte:92-93`

**Step 1: Add data-testid attribute to gold paragraph**

Find the gold display paragraph (line 92) and add the data-testid attribute:

```svelte
<p class="gold" data-testid="gold-counter">
	Gold: {formatNumber(gold)}
	{#each goldDrops as drop (drop.id)}
		<span class="gold-drop-popup">+{drop.amount}g</span>
	{/each}
</p>
```

**Step 2: Run test to verify gold counter is found**

```bash
npx playwright test src/routes/_reset-versioning.spec.ts
```

Expected: Test should now find the gold counter but still fail on the level counter selector.

**Step 3: Commit gold data-testid**

```bash
git add src/lib/components/BattleArea.svelte
git commit -m "feat: add data-testid to gold counter for testing"
```

---

## Task 5: Add data-testid to Level Display

**Files:**

- Modify: `src/routes/+page.svelte:216`

**Step 1: Add data-testid attribute to level label**

Find the level label span (line 216) and add the data-testid attribute:

```svelte
<span class="level-label" data-testid="level-counter">Level {gameState.level}</span>
```

**Step 2: Run test to verify level counter is found**

```bash
npx playwright test src/routes/_reset-versioning.spec.ts
```

Expected: Test should now find both gold and level counters. If the leveling module issue from Task 3 wasn't resolved, the test will fail when trying to set the level. Otherwise, test should pass.

**Step 3: Commit level data-testid**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add data-testid to level counter for testing"
```

---

## Task 6: Verify Leveling Module Level Assignment

**Files:**

- Read: `src/lib/modules/leveling.ts` (or wherever createLeveling is defined)
- Potentially Modify: leveling module file

**Step 1: Read the leveling module**

Locate and read the leveling module to understand how `level` is managed:

```bash
# Use Read tool to examine the leveling module structure
```

**Step 2: If level is not directly assignable, add a test helper**

If the level is managed through private state and not directly assignable, add a test-only method to the leveling module:

```typescript
// In the leveling module's return object
return {
	// ... existing properties
	level: /* existing level getter/value */,
	__test__setLevel: (newLevel: number) => {
		level = newLevel; // or however level state is managed internally
	}
};
```

Then update gameState's `setLevel` helper to use this:

```typescript
			setLevel: (newLevel: number) => {
				if ('__test__setLevel' in leveling) {
					leveling.__test__setLevel(newLevel);
				} else {
					leveling.level = newLevel;
				}
			},
```

**Step 3: Run test to verify all functionality works**

```bash
npx playwright test src/routes/_reset-versioning.spec.ts
```

Expected: Test should now pass completely (without screenshots).

**Step 4: Commit leveling module changes if needed**

```bash
# Only if changes were made:
git add src/lib/modules/leveling.ts src/lib/stores/gameState.svelte.ts
git commit -m "feat: add test helper for setting level in leveling module"
```

---

## Task 7: Add Screenshot Verification for Pre-Reset State

**Files:**

- Modify: `src/routes/_reset-versioning.spec.ts`

**Step 1: Add screenshot capture after state establishment**

Add a screenshot capture at the end of Phase 1 to verify the game state before reset:

```typescript
// Verify state was established
await expect(page.locator('[data-testid="gold-counter"]')).toContainText('20');
await expect(page.locator('[data-testid="level-counter"]')).toContainText('5');

// Visual verification: capture pre-reset state with gold and level
await expect(page).toHaveScreenshot('reset-versioning-before-reset.png', {
	fullPage: true
});
```

**Step 2: Run test to generate baseline screenshot**

```bash
npx playwright test src/routes/_reset-versioning.spec.ts
```

Expected: Test runs and generates baseline screenshot showing level 5 and 20 gold.

**Step 3: Commit screenshot baseline**

```bash
git add src/routes/_reset-versioning.spec.ts src/routes/_reset-versioning.spec.ts-snapshots/
git commit -m "test: add pre-reset screenshot verification"
```

---

## Task 8: Add Screenshot Verification for Post-Reset State

**Files:**

- Modify: `src/routes/_reset-versioning.spec.ts`

**Step 1: Add screenshot capture after reset verification**

Add a screenshot capture at the end of Phase 3 to verify the clean slate:

```typescript
// Phase 3: Verify clean slate
await expect(page.locator('[data-testid="gold-counter"]')).toContainText('0');
await expect(page.locator('[data-testid="level-counter"]')).toContainText('1');

// Verify lastResetVersion was updated
const newResetVersion = await page.evaluate(() => {
	return localStorage.getItem('roguelike-cards-reset-version');
});
expect(newResetVersion).toBe(RESET_VERSION);

// Visual verification: capture post-reset state showing clean slate
await expect(page).toHaveScreenshot('reset-versioning-after-reset.png', {
	fullPage: true
});
```

**Step 2: Run test to generate baseline screenshot**

```bash
npx playwright test src/routes/_reset-versioning.spec.ts
```

Expected: Test runs and generates baseline screenshot showing level 1 and 0 gold.

**Step 3: Commit screenshot baseline**

```bash
git add src/routes/_reset-versioning.spec.ts src/routes/_reset-versioning.spec.ts-snapshots/
git commit -m "test: add post-reset screenshot verification"
```

---

## Task 9: Add Optional Test for First-Time Player

**Files:**

- Modify: `src/routes/_reset-versioning.spec.ts`

**Step 1: Add test case for first-time player**

Add a new test case to verify that first-time players (with no `lastResetVersion` in localStorage) don't trigger a reset:

```typescript
test('first-time player does not trigger reset', async ({ page }) => {
	// Setup game with clean localStorage (no lastResetVersion)
	await setupGame(page);

	// Grant some gold to establish non-zero state
	await page.evaluate(() => {
		window.gameState?.__test__.addGold(15);
	});

	await expect(page.locator('[data-testid="gold-counter"]')).toContainText('15');

	// Reload without setting lastResetVersion
	await page.reload();
	await page.locator('.enemy').waitFor({ state: 'visible' });
	await page.waitForTimeout(500);

	// Verify no reset occurred - gold should still be 15
	await expect(page.locator('[data-testid="gold-counter"]')).toContainText('15');

	// Verify lastResetVersion was set to current RESET_VERSION
	const resetVersion = await page.evaluate(() => {
		return localStorage.getItem('roguelike-cards-reset-version');
	});
	expect(resetVersion).toBe(RESET_VERSION);
});
```

**Step 2: Run test to verify first-time player behavior**

```bash
npx playwright test src/routes/_reset-versioning.spec.ts
```

Expected: Both tests pass.

**Step 3: Commit first-time player test**

```bash
git add src/routes/_reset-versioning.spec.ts
git commit -m "test: add first-time player reset behavior test"
```

---

## Task 10: Add Optional Test for Already-Reset Player

**Files:**

- Modify: `src/routes/_reset-versioning.spec.ts`

**Step 1: Add test case for already-reset player**

Add a test case to verify that players who already have the current `RESET_VERSION` don't trigger a duplicate reset:

```typescript
test('already-reset player does not trigger duplicate reset', async ({ page }) => {
	// Setup game
	await setupGame(page);

	// Set lastResetVersion to current RESET_VERSION
	await page.evaluate((resetVersion: string) => {
		localStorage.setItem('roguelike-cards-reset-version', resetVersion);
	}, RESET_VERSION);

	// Grant some gold
	await page.evaluate(() => {
		window.gameState?.__test__.addGold(25);
	});

	await expect(page.locator('[data-testid="gold-counter"]')).toContainText('25');

	// Reload
	await page.reload();
	await page.locator('.enemy').waitFor({ state: 'visible' });
	await page.waitForTimeout(500);

	// Verify no reset occurred - gold should still be 25
	await expect(page.locator('[data-testid="gold-counter"]')).toContainText('25');

	// Verify lastResetVersion unchanged
	const resetVersion = await page.evaluate(() => {
		return localStorage.getItem('roguelike-cards-reset-version');
	});
	expect(resetVersion).toBe(RESET_VERSION);
});
```

**Step 2: Run all tests to verify complete behavior**

```bash
npx playwright test src/routes/_reset-versioning.spec.ts
```

Expected: All three tests pass.

**Step 3: Commit already-reset player test**

```bash
git add src/routes/_reset-versioning.spec.ts
git commit -m "test: add already-reset player test"
```

---

## Task 11: Run Full Test Suite and Verify

**Files:**

- None (verification only)

**Step 1: Run complete test suite**

Run all E2E tests to ensure the new tests don't break existing functionality:

```bash
npx playwright test
```

Expected: All tests pass, including the new reset versioning tests.

**Step 2: Verify screenshot baselines are correct**

Manually inspect the generated screenshots in `src/routes/_reset-versioning.spec.ts-snapshots/` to ensure they capture the correct states:

- `reset-versioning-before-reset.png` should show level 5 and 20 gold
- `reset-versioning-after-reset.png` should show level 1 and 0 gold

**Step 3: Document test coverage**

No commit needed - verification step only.

---

## Success Criteria

- All tests pass consistently
- Test helpers (`addGold`, `setLevel`) work correctly via `window.gameState.__test__`
- Data-testid attributes enable reliable UI element selection
- Screenshot baselines capture meaningful visual states
- Optional tests cover edge cases (first-time player, already-reset)
- No regressions in existing test suite

## Notes

- **DRY:** Reuse `setupGame` helper from legendary selection tests
- **YAGNI:** Only add test helpers that are needed for this test
- **TDD:** Write failing tests first, then implement infrastructure
- **Frequent commits:** Each task has clear commit points
- **Screenshot timing:** Wait for animations to settle before capturing screenshots (`waitForTimeout(500)`)
