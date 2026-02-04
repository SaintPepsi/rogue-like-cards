# Legendary Selection Persistence Design

**Date:** 2026-02-03
**Status:** Approved

## Overview

Fix the exploit where users can refresh the page to reroll their starting legendary choices. Legendary choices should persist through page refresh and only be shown once per player (one-time opportunity).

## The Problem

**Current behavior:**

- Legendary choices are generated fresh every time `startNewRun()` is called
- On page refresh, `startNewRun()` runs again and generates new random choices
- This allows players to refresh the page repeatedly to "reroll" for better legendaries

**Root cause:**
Legendary choices and selection state live only in memory (`legendaryChoices` and `showLegendarySelection` are component state, not persisted).

## Solution Design

Treat legendary selection with split persistence:

- **Session data** for the specific 3 card choices (clears on game over)
- **Persistent data** for the one-time selection flag (never clears)

### User Flow

1. On a new run, generate 3 legendary choices (stored in session)
2. If user refreshes during the run, they see the same 3 choices (session persists through refresh)
3. When user picks or skips, set a permanent flag that they've made their legendary choice
4. On game over, session clears (including the specific 3 cards)
5. When starting the next run, **don't show legendary selection at all** because they already picked once

**Key insight:** Users only get ONE legendary selection opportunity ever. Once they pick or skip, they never see the legendary modal again, even on future runs.

## Data Structure Changes

### SessionSaveData (persistence.svelte.ts)

```ts
export interface SessionSaveData {
	effects: Effect[];
	unlockedUpgradeIds: string[];
	xp: number;
	level: number;
	gold: number;
	stage: number;
	waveKills: number;
	enemiesKilled: number;
	enemyHealth: number;
	enemyMaxHealth: number;
	isBoss: boolean;
	isChest: boolean;
	isBossChest: boolean;
	upgradeQueue?: SavedUpgradeEvent[];
	activeEvent?: SavedUpgradeEvent | null;
	timestamp: number;
	bossTimeRemaining?: number;
	legendaryChoiceIds?: string[]; // NEW: The 3 card IDs for current run
}
```

### PersistentSaveData (persistence.svelte.ts)

```ts
export interface PersistentSaveData {
	gold: number;
	purchasedUpgradeCounts: Record<string, number>;
	executeCapBonus: number;
	shopChoiceIds?: string[];
	rerollCost?: number;
	hasCompletedFirstRun: boolean;
	hasSelectedStartingLegendary?: boolean; // NEW: True once user picks/skips (never resets)
}
```

**Why split the data?**

- `legendaryChoiceIds` in session → clears on game over (new cards each run if needed)
- `hasSelectedStartingLegendary` in persistent → never clears (one-time opportunity)

## State Management Logic

### New State Variable (gameState.svelte.ts)

```ts
let hasSelectedStartingLegendary = $state(false);
```

### Modified startNewRun() Logic

**Location:** gameState.svelte.ts:507-513

**Current code** generates legendaries if `hasCompletedFirstRun` is true.

**New logic:**

```ts
function startNewRun() {
	// ... existing reset logic ...

	// Only show legendary selection if:
	// 1. User has completed first run (unlocked feature)
	// 2. User has NOT already made their one-time selection
	// 3. No legendary choices already exist in session (fresh run)

	if (hasCompletedFirstRun && !hasSelectedStartingLegendary) {
		legendaryChoices = getRandomLegendaryUpgrades(3);
		if (legendaryChoices.length > 0) {
			showLegendarySelection = true;
		}
	}
}
```

### Modified selectLegendary() Logic

**Location:** gameState.svelte.ts:371-387

**Current code** just closes the modal.

**New logic:**

```ts
function selectLegendary(upgrade: Upgrade | null) {
	showLegendarySelection = false;
	legendaryChoices = [];

	if (upgrade) {
		effects = [...effects, { ...upgrade, count: 1 }];
	}

	// NEW: Mark that user has made their one-time selection
	hasSelectedStartingLegendary = true;

	// Save persistent data to persist the flag
	persistence.savePersistent({
		gold: shop.persistentGold,
		purchasedUpgradeCounts: shop.purchasedCounts,
		executeCapBonus: pipeline.getExecuteCapBonus(),
		shopChoiceIds: shop.currentChoiceIds,
		rerollCost: shop.rerollCost,
		hasCompletedFirstRun: true,
		hasSelectedStartingLegendary: true // NEW
	});
}
```

## Persistence - Save & Load

### Session Save

**Location:** gameState.svelte.ts ~line 222

Add `legendaryChoiceIds` to the session save data:

```ts
persistence.saveSession({
	effects,
	unlockedUpgradeIds: Array.from(unlockedUpgrades),
	xp: leveling.xp,
	level: leveling.level,
	gold,
	stage: enemy.stage,
	waveKills: enemy.waveKills,
	enemiesKilled: enemy.enemiesKilled,
	enemyHealth: enemy.health,
	enemyMaxHealth: enemy.maxHealth,
	isBoss: enemy.isBoss,
	isChest: enemy.isChest,
	isBossChest: enemy.isBossChest,
	upgradeQueue: leveling.upgradeQueue,
	activeEvent: leveling.activeEvent,
	timestamp: Date.now(),
	bossTimeRemaining: enemy.bossTimeRemaining,
	legendaryChoiceIds: legendaryChoices.map((u) => u.id) // NEW
});
```

### Session Load

**Location:** gameState.svelte.ts ~line 545

Restore legendary choices from saved IDs:

```ts
const savedData = persistence.loadSession();
if (savedData) {
	// ... existing restoration logic ...

	// NEW: Restore legendary choices if they exist
	if (savedData.legendaryChoiceIds && savedData.legendaryChoiceIds.length > 0) {
		// Import allUpgrades from upgrades data
		legendaryChoices = savedData.legendaryChoiceIds
			.map((id) => allUpgrades.find((u) => u.id === id))
			.filter(Boolean) as Upgrade[];

		if (legendaryChoices.length > 0) {
			showLegendarySelection = true;
		}
	}
}
```

### Persistent Load

**Location:** gameState.svelte.ts ~line 538

```ts
const persistentData = persistence.loadPersistent();
if (persistentData) {
	hasCompletedFirstRun = persistentData.hasCompletedFirstRun;
	hasSelectedStartingLegendary = persistentData.hasSelectedStartingLegendary ?? false; // NEW
}
```

### Persistent Save Updates

All existing calls to `persistence.savePersistent()` must include the new field:

```ts
hasSelectedStartingLegendary: hasSelectedStartingLegendary;
```

**Locations to update:**

- gameState.svelte.ts:133 (game over)
- shop.svelte.ts (shop purchases, if saving persistent data there)

## Public API

### Expose New State

**Location:** gameState.svelte.ts ~line 606

```ts
return {
	// ... existing getters ...
	get hasSelectedStartingLegendary() {
		return hasSelectedStartingLegendary;
	}
};
```

## Edge Cases

### 1. Legacy saves without `hasSelectedStartingLegendary`

**Handling:**

- Already handled in `loadPersistent()` with `?? false` default
- Old players will see legendary selection on their next run

### 2. Corrupted legendaryChoiceIds in session

**Handling:**

- If saved IDs don't match any upgrade in `allUpgrades`, filter returns empty array
- Modal won't show (safe failure mode)

### 3. User clears browser data mid-run

**Handling:**

- Session lost → legendary choices regenerate on next run
- Persistent flag lost → user gets another opportunity (acceptable, rare edge case)

### 4. getRandomLegendaryUpgrades() returns fewer than 3 cards

**Handling:**

- Already handled: `if (legendaryChoices.length > 0)` check
- Modal only shows if at least 1 card available

### 5. Skip button behavior

**Handling:**

- `selectLegendary(null)` already handles skip
- Sets `hasSelectedStartingLegendary = true` even when skipping
- User who skips never sees modal again (intended behavior)

## Implementation Checklist

- [ ] Add `legendaryChoiceIds?: string[]` to `SessionSaveData` interface
- [ ] Add `hasSelectedStartingLegendary?: boolean` to `PersistentSaveData` interface
- [ ] Add `hasSelectedStartingLegendary` state variable to gameState.svelte.ts
- [ ] Update `loadPersistent()` to load `hasSelectedStartingLegendary`
- [ ] Update `startNewRun()` to check `!hasSelectedStartingLegendary` before showing modal
- [ ] Update `selectLegendary()` to set flag and save persistent data
- [ ] Update session save to include `legendaryChoiceIds`
- [ ] Update session load to restore `legendaryChoices` from IDs
- [ ] Import `allUpgrades` in gameState.svelte.ts for ID lookup
- [ ] Add getter for `hasSelectedStartingLegendary` in public API
- [ ] Update all `savePersistent()` calls to include new field
- [ ] Test: Refresh during legendary selection shows same choices
- [ ] Test: Pick legendary, refresh, modal doesn't show
- [ ] Test: Skip legendary, refresh, modal doesn't show
- [ ] Test: Die without selecting, start new run, no modal (already picked)
- [ ] Test: Legacy save migration works correctly
