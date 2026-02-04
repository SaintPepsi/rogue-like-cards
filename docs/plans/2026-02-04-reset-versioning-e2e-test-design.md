# Reset Versioning E2E Test Design

**Date:** 2026-02-04
**Status:** Design

## Overview

Create an end-to-end test that verifies the full reset flow: when a player loads the game with an outdated `lastResetVersion`, all game data (session + persistent) gets cleared and they start fresh.

## Test Location

`src/routes/_reset-versioning.spec.ts` - Dedicated file for reset logic tests, following the pattern of `_legendary-selection.spec.ts`.

## Test Structure

### Phase 1: Establish Comprehensive Game State

Start with a fresh game and build up meaningful state:

- Clear localStorage and initialize clean game
- Use `window.gameState.__test__` helpers to establish state:
  - Grant gold: 20 gold to prove non-zero state
  - Level up player: Set player level to 5
- Verify state was established via UI elements

### Phase 2: Trigger Reset Condition

Manipulate localStorage to simulate an outdated reset version:

- Set `roguelike-cards-reset-version` to `'0.10.0'` (old version)
- Reload the page
- Game's `init()` detects: `currentVersion (0.47.0) >= resetVersion (0.42.0) AND lastResetVersion (0.10.0) < resetVersion (0.42.0)`
- Reset triggers automatically

### Phase 3: Verify Clean Slate

Check visual indicators to confirm reset:

- Gold counter displays `0`
- Player level shows `1`
- Battle area shows initial clean state (enemy visible, game initialized)
- Verify `lastResetVersion` in localStorage updated to `'0.42.0'` (current `RESET_VERSION`)

## Implementation

### Test Code Structure

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

	test('resets all game data when lastResetVersion is outdated', async ({ page }) => {
		// Phase 1: Establish comprehensive game state
		await setupGame(page);

		await page.evaluate(() => {
			window.gameState?.__test__.addGold(20);
			window.gameState?.__test__.setPlayerLevel(5);
		});

		// Verify state was established
		await expect(page.locator('[data-testid="gold-counter"]')).toContainText('20');
		await expect(page.locator('[data-testid="player-level"]')).toContainText('5');

		// Phase 2: Trigger reset condition
		await page.evaluate(() => {
			localStorage.setItem('roguelike-cards-reset-version', '0.10.0');
		});
		await page.reload();
		await page.locator('.enemy').waitFor({ state: 'visible' });
		await page.waitForTimeout(500);

		// Phase 3: Verify clean slate
		await expect(page.locator('[data-testid="gold-counter"]')).toContainText('0');
		await expect(page.locator('[data-testid="player-level"]')).toContainText('1');

		// Verify lastResetVersion was updated
		const newResetVersion = await page.evaluate(() => {
			return localStorage.getItem('roguelike-cards-reset-version');
		});
		expect(newResetVersion).toBe(RESET_VERSION);
	});
});
```

### Supporting Infrastructure

**Test helpers to add** (if not already present):

In `gameState.svelte.ts` `__test__` object:

```typescript
__test__: {
  addGold: (amount: number) => { gold = amount; },
  setPlayerLevel: (level: number) => { playerLevel = level; },
  // ... existing helpers like triggerBossExpired
}
```

**Data-testid attributes to add:**

UI components need test IDs for reliable selection:

- Gold display component: `data-testid="gold-counter"`
- Player level display: `data-testid="player-level"`

These should be added wherever gold and level are rendered (likely in a HUD or status bar component).

### Additional Test Scenarios (Optional)

While the main test covers the critical path, consider these additional scenarios:

- **First-time player:** Verify no reset occurs when `lastResetVersion` is `null`
- **Already reset:** Verify no duplicate reset when `lastResetVersion` already matches `RESET_VERSION`

These could be separate test cases in the same describe block if needed.

## Success Criteria

Test passes when:

1. Game state can be established (gold and level set via test helpers)
2. Setting outdated `lastResetVersion` + reload triggers the reset
3. Visual indicators show clean slate (gold = 0, level = 1)
4. `lastResetVersion` in localStorage updated to current `RESET_VERSION`
5. Test is deterministic and passes consistently

## Why This Design

- **Visual verification:** Tests user-facing behavior rather than internal implementation
- **localStorage manipulation:** Simple, deterministic way to trigger reset without version.ts injection
- **Test helpers:** Fast state setup without relying on gameplay RNG
- **Dedicated file:** Keeps reset tests isolated and maintainable
- **Follows existing patterns:** Reuses `setupGame` pattern from `_legendary-selection.spec.ts`
