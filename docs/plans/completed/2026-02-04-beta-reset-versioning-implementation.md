# Beta Reset Versioning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement automatic player data reset on version changes for beta testing new game flows.

**Architecture:** Add reset version tracking to localStorage, integrate reset check into game initialization before any data loads, use existing version comparison utilities for semantic versioning.

**Tech Stack:** TypeScript, Svelte 5, Vitest (unit tests), localStorage API

---

## Task 1: Create Reset Version Storage Module

**Files:**

- Create: `src/lib/utils/resetVersionStorage.ts`
- Test: `src/lib/utils/resetVersionStorage.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { getLastResetVersion, setLastResetVersion, RESET_STORAGE_KEY } from './resetVersionStorage';

describe('resetVersionStorage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	test('getLastResetVersion returns null when no version is stored', () => {
		expect(getLastResetVersion()).toBe(null);
	});

	test('setLastResetVersion stores version in localStorage', () => {
		setLastResetVersion('0.42.0');
		expect(localStorage.getItem(RESET_STORAGE_KEY)).toBe('0.42.0');
	});

	test('getLastResetVersion returns stored version', () => {
		localStorage.setItem(RESET_STORAGE_KEY, '0.50.0');
		expect(getLastResetVersion()).toBe('0.50.0');
	});

	test('setLastResetVersion overwrites existing version', () => {
		setLastResetVersion('0.42.0');
		setLastResetVersion('0.50.0');
		expect(getLastResetVersion()).toBe('0.50.0');
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/utils/resetVersionStorage.test.ts`
Expected: FAIL with "Cannot find module './resetVersionStorage'"

**Step 3: Write minimal implementation**

```typescript
export const RESET_STORAGE_KEY = 'roguelike-cards-reset-version';

export function getLastResetVersion(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(RESET_STORAGE_KEY);
}

export function setLastResetVersion(version: string): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(RESET_STORAGE_KEY, version);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/utils/resetVersionStorage.test.ts`
Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add src/lib/utils/resetVersionStorage.ts src/lib/utils/resetVersionStorage.test.ts
git commit -m "feat: add reset version storage module

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add RESET_VERSION to Version Module

**Files:**

- Modify: `src/lib/version.ts:1-2`

**Step 1: Add RESET_VERSION export**

In `src/lib/version.ts`, add the new export:

```typescript
export const VERSION = '0.42.0';
export const RESET_VERSION = '0.42.0'; // Update this when reset is needed
```

**Step 2: Verify no build errors**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/lib/version.ts
git commit -m "feat: add RESET_VERSION constant for beta resets

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add Reset Check Function to Version Comparison

**Files:**

- Modify: `src/lib/utils/versionComparison.ts`
- Modify: `src/lib/utils/versionComparison.test.ts`

**Step 1: Write the failing tests**

Add these tests to `src/lib/utils/versionComparison.test.ts`:

```typescript
describe('shouldTriggerReset', () => {
	test('returns false for first-time players (no lastResetVersion)', () => {
		expect(shouldTriggerReset('0.67.0', '0.5.0', null)).toBe(false);
	});

	test('returns true when current >= reset AND last reset < reset version', () => {
		expect(shouldTriggerReset('0.67.0', '0.5.0', '0.23.0')).toBe(true);
	});

	test('returns false when last reset already matches reset version', () => {
		expect(shouldTriggerReset('0.67.0', '0.5.0', '0.5.0')).toBe(false);
	});

	test('returns false when last reset is beyond reset version', () => {
		expect(shouldTriggerReset('0.67.0', '0.5.0', '0.10.0')).toBe(false);
	});

	test('returns false when current version is below reset version', () => {
		expect(shouldTriggerReset('0.4.0', '0.5.0', '0.3.0')).toBe(false);
	});

	test('handles exact version match for current and reset', () => {
		expect(shouldTriggerReset('0.5.0', '0.5.0', '0.3.0')).toBe(true);
	});
});
```

Update the import at the top of the file:

```typescript
import {
	isVersionGreaterThan,
	getNewChangelogEntries,
	getPreviousMinorVersion,
	shouldTriggerReset
} from './versionComparison';
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/utils/versionComparison.test.ts`
Expected: FAIL with "shouldTriggerReset is not a function"

**Step 3: Write minimal implementation**

Add this function to `src/lib/utils/versionComparison.ts`:

```typescript
/**
 * Determines if a reset should be triggered based on version comparisons.
 *
 * Reset logic:
 * - First-time players (no lastResetVersion): DON'T reset, establish baseline
 * - Returning players: Reset if they haven't experienced this reset version yet
 *
 * @param currentVersion - The current game version
 * @param resetVersion - The version that should trigger a reset
 * @param lastResetVersion - The last reset version the player experienced (null for first-time)
 * @returns true if reset should be triggered, false otherwise
 */
export function shouldTriggerReset(
	currentVersion: string,
	resetVersion: string,
	lastResetVersion: string | null
): boolean {
	// First time player (no lastResetVersion stored)
	if (!lastResetVersion) {
		return false; // New player, don't reset
	}

	// Current game version must be >= reset version
	const isCurrentAtOrBeyondReset =
		currentVersion === resetVersion || isVersionGreaterThan(currentVersion, resetVersion);

	// Last reset must be before the target reset version
	const lastResetBeforeTarget = isVersionGreaterThan(resetVersion, lastResetVersion);

	return isCurrentAtOrBeyondReset && lastResetBeforeTarget;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/utils/versionComparison.test.ts`
Expected: PASS (all tests including new shouldTriggerReset tests)

**Step 5: Commit**

```bash
git add src/lib/utils/versionComparison.ts src/lib/utils/versionComparison.test.ts
git commit -m "feat: add shouldTriggerReset function with comprehensive tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Integrate Reset Check Into Game Initialization

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:565-585` (the `init()` function)

**Step 1: Add imports at the top of the file**

Add these imports to the existing import section:

```typescript
import { VERSION, RESET_VERSION } from '$lib/version';
import { shouldTriggerReset } from '$lib/utils/versionComparison';
import { getLastResetVersion, setLastResetVersion } from '$lib/utils/resetVersionStorage';
```

**Step 2: Modify the init() function**

Replace the current `init()` function (lines 565-585) with:

```typescript
function init() {
	// Check if we need to reset due to version change
	const lastResetVersion = getLastResetVersion();
	if (shouldTriggerReset(VERSION, RESET_VERSION, lastResetVersion)) {
		persistence.clearSession();
		persistence.clearPersistent();
		setLastResetVersion(RESET_VERSION);
	}

	// Save reset version for first-time players
	if (!lastResetVersion) {
		setLastResetVersion(RESET_VERSION);
	}

	// Continue with normal initialization
	shop.load();

	// Load persistent data (includes hasCompletedFirstRun)
	const persistentData = persistence.loadPersistent();
	if (persistentData) {
		hasCompletedFirstRun = persistentData.hasCompletedFirstRun;
	}

	if (!loadGame()) {
		applyShopUpgrades();
		// Start new run with legendary selection (or spawn enemy immediately)
		startNewRunWithLegendary();
	} else {
		pipeline.refreshSystems(getEffectiveStats());
		if (enemy.isBoss) {
			const data = persistence.loadSession();
			gameLoop.startBossTimer(data?.bossTimeRemaining ?? bossTimerMax);
		}
	}
}
```

**Step 3: Verify no build errors**

Run: `npm run check`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: integrate reset version check into game initialization

Reset logic runs before any data loads. First-time players establish
baseline, returning players reset if they haven't experienced the
current RESET_VERSION yet.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Add Integration Tests for Reset Behavior

**Files:**

- Modify: `src/lib/stores/gameState.test.ts`

**Step 1: Write failing integration tests**

Add these tests to `src/lib/stores/gameState.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameState } from './gameState.svelte';
import * as resetVersionStorage from '$lib/utils/resetVersionStorage';

describe('gameState - reset version behavior', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	it('sets lastResetVersion for first-time players without triggering reset', () => {
		const setLastResetVersionSpy = vi.spyOn(resetVersionStorage, 'setLastResetVersion');

		// Simulate first-time player (no localStorage data)
		localStorage.clear();

		// Initialize game
		gameState.init();

		// Should establish baseline without resetting
		expect(setLastResetVersionSpy).toHaveBeenCalledOnce();
	});

	it('triggers reset when lastResetVersion is behind RESET_VERSION', () => {
		// Set old reset version (player who hasn't experienced the reset)
		localStorage.setItem('roguelike-cards-reset-version', '0.23.0');

		// Set up some existing save data
		localStorage.setItem(
			'roguelike-cards-save',
			JSON.stringify({
				gold: 1000,
				level: 10,
				effects: []
			})
		);
		localStorage.setItem(
			'roguelike-cards-persistent',
			JSON.stringify({
				gold: 5000,
				purchasedUpgradeCounts: { 'upgrade-1': 2 }
			})
		);

		// Initialize game (with RESET_VERSION > 0.23.0)
		gameState.init();

		// Both save keys should be cleared
		expect(localStorage.getItem('roguelike-cards-save')).toBeNull();
		expect(localStorage.getItem('roguelike-cards-persistent')).toBeNull();

		// lastResetVersion should be updated
		expect(localStorage.getItem('roguelike-cards-reset-version')).toBeTruthy();
	});

	it('does not trigger reset when lastResetVersion matches RESET_VERSION', () => {
		// Set current RESET_VERSION (player already experienced the reset)
		const currentResetVersion = '0.42.0'; // Matches RESET_VERSION in version.ts
		localStorage.setItem('roguelike-cards-reset-version', currentResetVersion);

		// Set up existing save data
		const saveData = JSON.stringify({ gold: 1000, level: 10 });
		localStorage.setItem('roguelike-cards-save', saveData);

		// Initialize game
		gameState.init();

		// Save data should NOT be cleared
		expect(localStorage.getItem('roguelike-cards-save')).toBe(saveData);
	});
});
```

**Step 2: Run tests to verify they fail or pass**

Run: `npm test -- src/lib/stores/gameState.test.ts`
Expected: Tests may fail due to gameState module structure (needs adjustment based on actual implementation)

**Step 3: Adjust tests based on actual gameState API**

If `gameState.init()` is not exposed or needs different access pattern, adjust the tests accordingly. The tests should verify:

1. First-time player behavior (establish baseline, no reset)
2. Reset trigger behavior (clears data when lastResetVersion < RESET_VERSION)
3. No-reset behavior (preserves data when lastResetVersion >= RESET_VERSION)

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/stores/gameState.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/lib/stores/gameState.test.ts
git commit -m "test: add integration tests for reset version behavior

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Run Full Test Suite

**Files:**

- None (verification step)

**Step 1: Run all unit tests**

Run: `npm test`
Expected: PASS (all tests across the codebase)

**Step 2: Run TypeScript check**

Run: `npm run check`
Expected: No errors

**Step 3: Run linter**

Run: `npm run lint`
Expected: No errors

**Step 4: Commit if any fixes were needed**

If any fixes were required, commit them:

```bash
git add .
git commit -m "fix: address test/lint issues from reset version feature

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Manual Testing Verification

**Files:**

- None (manual verification)

**Step 1: Test first-time player flow**

1. Clear all localStorage: `localStorage.clear()` in browser console
2. Start dev server: `npm run dev`
3. Open game in browser
4. Check localStorage: `localStorage.getItem('roguelike-cards-reset-version')`
5. Expected: Should equal current RESET_VERSION ('0.42.0'), no data cleared

**Step 2: Test reset trigger flow**

1. Set old reset version: `localStorage.setItem('roguelike-cards-reset-version', '0.23.0')`
2. Add dummy save data:
   ```javascript
   localStorage.setItem('roguelike-cards-save', JSON.stringify({ gold: 1000 }));
   localStorage.setItem('roguelike-cards-persistent', JSON.stringify({ gold: 5000 }));
   ```
3. Reload page
4. Check localStorage: Both save keys should be null, reset version updated to '0.42.0'

**Step 3: Test no-reset flow**

1. Set current reset version: `localStorage.setItem('roguelike-cards-reset-version', '0.42.0')`
2. Add save data (step 2 commands above)
3. Reload page
4. Expected: Save data should still exist, not cleared

**Step 4: Test game functionality after reset**

1. Trigger a reset (step 2)
2. Play game for a few minutes
3. Verify: gold accumulation, leveling, upgrades all work
4. Reload page
5. Verify: game state persists, no second reset

**Step 5: Document results**

Create verification notes in this plan or as a comment documenting:

- Each scenario tested ✓
- Any issues found
- Any edge cases discovered

---

## Task 8: Update Design Document Status

**Files:**

- Modify: `docs/plans/2026-02-04-beta-reset-versioning-design.md:4`

**Step 1: Update status to Implemented**

Change line 4 from:

```markdown
**Status:** Approved
```

To:

```markdown
**Status:** Implemented
```

**Step 2: Commit**

```bash
git add docs/plans/2026-02-04-beta-reset-versioning-design.md
git commit -m "docs: mark reset versioning design as implemented

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Summary

**Total tasks:** 8
**Estimated commits:** 8-9
**Testing:** Unit tests (vitest), Integration tests, Manual verification
**Key principles:** TDD (tests first), DRY (reuse existing version utils), YAGNI (minimal implementation), frequent commits

**Usage after implementation:**
To trigger a reset for all players, simply update `RESET_VERSION` in `src/lib/version.ts` to a higher version number and deploy.
