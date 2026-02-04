# Legendary Selection E2E Tests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Playwright e2e tests to prevent regressions in legendary selection modal behavior based on game-over triggers.

**Architecture:** Two test cases verify that the legendary selection modal appears only after first completion and only for boss timeout (not give up). Tests use direct state manipulation via `page.evaluate()` for precise control over game state.

**Tech Stack:** Playwright, TypeScript, Svelte 5 runes

---

## Task 1: Expose gameState for testing

**Files:**

- Modify: `src/routes/+page.svelte`

**Step 1: Add test mode window property**

In `src/routes/+page.svelte`, add after gameState initialization (around line where gameState is created):

```typescript
if (typeof window !== 'undefined' && import.meta.env.MODE === 'test') {
	window.gameState = gameState;
}
```

**Step 2: Add TypeScript declaration**

Create or modify the appropriate `.d.ts` file to declare the window property. If `src/app.d.ts` exists, add:

```typescript
interface Window {
	gameState?: typeof import('$lib/stores/gameState.svelte').gameState;
}
```

If `src/app.d.ts` doesn't exist, check for other declaration files or create it with:

```typescript
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	interface Window {
		gameState?: typeof import('$lib/stores/gameState.svelte').gameState;
	}
}

export {};
```

**Step 3: Verify no runtime errors**

Run: `npm run dev`

Expected: Dev server starts successfully, no TypeScript errors

**Step 4: Commit**

```bash
git add src/routes/+page.svelte src/app.d.ts
git commit -m "feat: expose gameState for e2e testing"
```

---

## Task 2: Add test ID to legendary modal

**Files:**

- Modify: Find and modify the LegendarySelectionModal component

**Step 1: Locate the LegendarySelectionModal component**

Run: `find src -name "*egendary*" -type f`

Expected: Find the component file (likely `src/lib/components/LegendarySelectionModal.svelte` or similar)

**Step 2: Add data-testid attribute**

In the LegendarySelectionModal component, add `data-testid="legendary-selection-modal"` to the outermost `<div>` of the modal overlay/container.

Example:

```svelte
<div data-testid="legendary-selection-modal" class="modal-overlay">
	<!-- existing modal content -->
</div>
```

**Step 3: Verify component still renders**

Run: `npm run dev`

Navigate to the game and trigger legendary selection (if possible) to verify the modal still works.

**Step 4: Commit**

```bash
git add src/lib/components/LegendarySelectionModal.svelte
git commit -m "feat: add test ID to legendary selection modal"
```

---

## Task 3: Create test file structure

**Files:**

- Create: `src/routes/_legendary-selection.spec.ts`

**Step 1: Create test file with imports**

```typescript
import { expect, test } from '@playwright/test';
import { VERSION } from '$lib/changelog';

test.describe('Legendary Selection Modal', () => {
	// Tests will go here
});
```

**Step 2: Verify test file is discovered**

Run: `npm run test:e2e -- --list`

Expected: See `_legendary-selection.spec.ts` in the list of test files

**Step 3: Commit**

```bash
git add src/routes/_legendary-selection.spec.ts
git commit -m "test: create legendary selection e2e test structure"
```

---

## Task 4: Add shared setup helper

**Files:**

- Modify: `src/routes/_legendary-selection.spec.ts`

**Step 1: Add setup helper function**

Add inside the `test.describe` block:

```typescript
test.describe('Legendary Selection Modal', () => {
	async function setupGame(page: any) {
		await page.goto('/');
		await page.evaluate((version: string) => {
			localStorage.clear();
			localStorage.setItem('changelog_last_seen_version', version);
		}, VERSION);
		await page.reload();
		await page.locator('.enemy').waitFor({ state: 'visible' });
	}

	async function completeFirstRun(page: any) {
		// Force boss timer to expire (natural death)
		await page.evaluate(() => {
			const gameState = window.gameState;
			gameState.gameLoop.bossTimer = gameState.gameLoop.bossTimerMax + 1;
			gameState.handleBossExpired(true);
		});

		// Close game over modal
		await page.locator('.modal-overlay').waitFor({ state: 'visible' });
		await page.locator('button:has-text("Play Again")').click();
		await page.locator('.modal-overlay').waitFor({ state: 'hidden' });
	}

	// Tests will go here
});
```

**Step 2: Verify TypeScript compiles**

Run: `npm run check`

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/routes/_legendary-selection.spec.ts
git commit -m "test: add shared setup helpers for legendary selection tests"
```

---

## Task 5: Implement give up test

**Files:**

- Modify: `src/routes/_legendary-selection.spec.ts`

**Step 1: Add give up test case**

Add inside the `test.describe` block, after the helper functions:

```typescript
test('give up does not show legendary selection modal', async ({ page }) => {
	// Setup and complete first run
	await setupGame(page);
	await completeFirstRun(page);

	// Start second run
	await page.locator('.enemy').waitFor({ state: 'visible' });

	// Give up
	await page.locator('button:has-text("Give Up")').click();

	// Verify legendary modal does NOT appear
	const legendaryModal = page.locator('[data-testid="legendary-selection-modal"]');
	await expect(legendaryModal).not.toBeVisible();
});
```

**Step 2: Run the test to verify behavior**

Run: `npm run test:e2e -- _legendary-selection.spec.ts -g "give up"`

Expected: Test should pass (verifying the bug is fixed)

**Step 3: Commit**

```bash
git add src/routes/_legendary-selection.spec.ts
git commit -m "test: add e2e test for give up not showing legendary modal"
```

---

## Task 6: Implement boss timeout test

**Files:**

- Modify: `src/routes/_legendary-selection.spec.ts`

**Step 1: Add boss timeout test case**

Add inside the `test.describe` block, after the give up test:

```typescript
test('boss timeout shows legendary selection modal after first completion', async ({ page }) => {
	// Setup and complete first run
	await setupGame(page);
	await completeFirstRun(page);

	// Start second run
	await page.locator('.enemy').waitFor({ state: 'visible' });

	// Force boss timeout again
	await page.evaluate(() => {
		const gameState = window.gameState;
		gameState.gameLoop.bossTimer = gameState.gameLoop.bossTimerMax + 1;
		gameState.handleBossExpired(true);
	});

	// Verify legendary modal DOES appear
	const legendaryModal = page.locator('[data-testid="legendary-selection-modal"]');
	await expect(legendaryModal).toBeVisible();
});
```

**Step 2: Run the test to verify behavior**

Run: `npm run test:e2e -- _legendary-selection.spec.ts -g "boss timeout"`

Expected: Test should pass (verifying legendary modal appears on boss timeout after first completion)

**Step 3: Commit**

```bash
git add src/routes/_legendary-selection.spec.ts
git commit -m "test: add e2e test for boss timeout showing legendary modal"
```

---

## Task 7: Run full test suite

**Files:**

- None (verification step)

**Step 1: Run all legendary selection tests**

Run: `npm run test:e2e -- _legendary-selection.spec.ts`

Expected: Both tests pass

**Step 2: Run full e2e suite to check for regressions**

Run: `npm run test:e2e`

Expected: All tests pass (no new failures introduced)

**Step 3: Review test output**

Verify:

- Both tests execute successfully
- No flaky behavior (re-run if needed)
- Test names clearly describe what they verify

---

## Task 8: Final documentation

**Files:**

- Create: `docs/plans/completed/2026-02-04-legendary-selection-e2e-tests.md`

**Step 1: Move design doc to completed**

```bash
mv docs/plans/2026-02-04-legendary-selection-e2e-tests-design.md docs/plans/completed/2026-02-04-legendary-selection-e2e-tests.md
```

**Step 2: Add implementation notes**

Append to the moved file:

```markdown
## Implementation Notes

**Completed:** 2026-02-04

**Files Modified:**

- `src/routes/+page.svelte` - Exposed gameState for testing
- `src/app.d.ts` - Added Window interface for gameState
- `src/lib/components/LegendarySelectionModal.svelte` - Added test ID
- `src/routes/_legendary-selection.spec.ts` - Created e2e tests

**Test Results:**

- ✅ Give up does not show legendary modal
- ✅ Boss timeout shows legendary modal after first completion

**Verification:** All e2e tests passing
```

**Step 3: Commit**

```bash
git add docs/plans/completed/2026-02-04-legendary-selection-e2e-tests.md
git commit -m "docs: move legendary selection tests plan to completed"
```

---

## Task 9: Create pull request or merge

**Files:**

- None (git operations)

**Step 1: Review all changes**

Run: `git log --oneline feature/game-over-stats-comparison..HEAD`

Expected: See all commits from this implementation

**Step 2: Push branch**

```bash
git push -u origin HEAD
```

**Step 3: Create PR or merge to master**

If using PRs:

```bash
gh pr create --title "feat: add legendary selection e2e regression tests" --body "Adds Playwright e2e tests to prevent regressions in legendary selection modal behavior.

Tests verify:
- Give up does not show legendary modal
- Boss timeout shows legendary modal after first completion

Closes #[issue-number if applicable]"
```

If merging directly to master (verify with user first):

```bash
git checkout master
git merge --no-ff feature/game-over-stats-comparison
git push origin master
```

**Step 4: Clean up branch (if merged)**

```bash
git branch -d feature/game-over-stats-comparison
git push origin --delete feature/game-over-stats-comparison
```

---

## Testing Strategy

### Manual Verification

Before considering complete, manually verify:

1. **Dev server runs:** `npm run dev` starts without errors
2. **TypeScript checks pass:** `npm run check` reports no errors
3. **E2E tests pass:** `npm run test:e2e` all green
4. **No regressions:** Existing tests still pass

### Test Isolation

Each test:

- Clears localStorage
- Sets changelog version to suppress modal
- Completes first run independently
- Verifies expected behavior

### Debugging Failed Tests

If tests fail:

1. **Run with headed browser:** `npm run test:e2e -- _legendary-selection.spec.ts --headed`
2. **Use debug mode:** `npm run test:e2e -- _legendary-selection.spec.ts --debug`
3. **Check screenshots:** Playwright captures on failure
4. **Verify game state exposure:** Check browser console for `window.gameState`

---

## Related Skills

- **@superpowers:verification-before-completion** - Use before claiming tests are passing
- **@superpowers:systematic-debugging** - Use if tests fail unexpectedly
- **@superpowers:test-driven-development** - Follow TDD principles for any additional test coverage
