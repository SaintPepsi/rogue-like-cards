# Legendary Selection E2E Tests Design

**Date:** 2026-02-04
**Status:** Approved

## Overview

Add Playwright e2e tests to prevent regressions in legendary selection modal behavior based on game-over triggers.

## Problem

Two critical scenarios need regression protection:

1. Give up → legendary selection modal should NOT appear
2. Boss timeout → legendary selection modal SHOULD appear (after first completion)

## Solution

### Test File Structure

Create `src/routes/_legendary-selection.spec.ts` with two test cases:

- `give up does not show legendary selection modal`
- `boss timeout shows legendary selection modal after first completion`

### Test Pattern

Both tests follow this flow:

1. Navigate to game and suppress changelog modal
2. Complete first run (sets `hasCompletedFirstRun = true`)
3. Start second run
4. Trigger game-over event (give up vs boss timeout)
5. Assert legendary modal visibility

### Implementation Mechanics

**Shared Setup:**

```typescript
await page.goto('/');
await page.evaluate((version) => {
	localStorage.clear();
	localStorage.setItem('changelog_last_seen_version', version);
}, VERSION);
await page.reload();
await page.locator('.enemy').waitFor({ state: 'visible' });
```

**First Run Completion:**

```typescript
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
```

**Test 1: Give Up Path**

```typescript
await page.locator('button:has-text("Give Up")').click();
const legendaryModal = page.locator('[data-testid="legendary-selection-modal"]');
await expect(legendaryModal).not.toBeVisible();
```

**Test 2: Boss Timeout Path**

```typescript
await page.evaluate(() => {
	const gameState = window.gameState;
	gameState.gameLoop.bossTimer = gameState.gameLoop.bossTimerMax + 1;
	gameState.handleBossExpired(true);
});

const legendaryModal = page.locator('[data-testid="legendary-selection-modal"]');
await expect(legendaryModal).toBeVisible();
```

### Required Setup

**1. Expose gameState for testing** (`src/routes/+page.svelte`):

```typescript
if (typeof window !== 'undefined' && import.meta.env.MODE === 'test') {
	window.gameState = gameState;
}
```

**2. Add test ID to legendary modal** (LegendarySelectionModal component):

```svelte
<div data-testid="legendary-selection-modal" ...>
```

## Why This Approach

- **Playwright over Vitest:** Catches UI integration bugs, follows existing pattern
- **Mock timer over real gameplay:** Fast, deterministic, no waiting for actual timers
- **Visibility-only assertions:** Directly tests the bug we want to prevent
- **Direct state manipulation:** Precise control over game state via `page.evaluate()`

## Testing Strategy

Uses `page.evaluate()` to manipulate boss timer because:

- Game uses `requestAnimationFrame` + custom timer registry
- Playwright's `page.clock.install()` doesn't work with rAF
- Direct manipulation is faster and more reliable than simulating full gameplay

## Implementation Notes

**Completed:** 2026-02-04

**Files Modified:**

- `src/routes/+page.svelte` - Exposed gameState for testing (using DEV mode check)
- `src/app.d.ts` - Added Window interface for gameState
- `src/lib/components/LegendarySelectionModal.svelte` - Added test ID
- `src/lib/components/CardSelectionModal.svelte` - Added testId prop support
- `src/lib/stores/gameState.svelte.ts` - Added **test** namespace with triggerBossExpired method
- `src/routes/_legendary-selection.spec.ts` - Created e2e tests

**Test Results:**

- ✅ Give up does not show legendary modal
- ✅ Boss timeout shows legendary modal after first completion

**Verification:** All e2e tests passing (3/3 tests pass in full suite)
