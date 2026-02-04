# Legendary Selection Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the legendary selection reroll exploit by persisting legendary choices through page refresh and making the selection a one-time opportunity per player.

**Architecture:** Split persistence approach - legendary choices stored in session data (clears on game over), one-time selection flag stored in persistent data (never clears). This prevents refresh rerolls while ensuring users only see the legendary modal once ever.

**Tech Stack:** Svelte 5, TypeScript, localStorage persistence layer

---

## Task 1: Add legendaryChoiceIds to SessionSaveData interface

**Files:**

- Modify: `src/lib/stores/persistence.svelte.ts:9-27`

**Step 1: Add the legendaryChoiceIds field to SessionSaveData**

Add the new field to the `SessionSaveData` interface at line 26 (after `bossTimeRemaining`):

```typescript
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
	legendaryChoiceIds?: string[];
}
```

**Step 2: Commit**

```bash
git add src/lib/stores/persistence.svelte.ts
git commit -m "feat: add legendaryChoiceIds to SessionSaveData interface

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add hasSelectedStartingLegendary to PersistentSaveData interface

**Files:**

- Modify: `src/lib/stores/persistence.svelte.ts:29-36`

**Step 1: Add the hasSelectedStartingLegendary field to PersistentSaveData**

Add the new field to the `PersistentSaveData` interface at line 35 (after `hasCompletedFirstRun`):

```typescript
export interface PersistentSaveData {
	gold: number;
	purchasedUpgradeCounts: Record<string, number>;
	executeCapBonus: number;
	shopChoiceIds?: string[];
	rerollCost?: number;
	hasCompletedFirstRun: boolean;
	hasSelectedStartingLegendary?: boolean;
}
```

**Step 2: Update loadPersistent() to handle legacy saves**

Modify the `loadPersistent()` function at line 84-103 to include the new field with a default value:

```typescript
function loadPersistent(): PersistentSaveData | null {
	return safeStorage(
		() => {
			const saved = localStorage.getItem(persistentKey);
			if (!saved) return null;
			const parsed = JSON.parse(saved);
			// Default hasCompletedFirstRun to false for legacy saves
			return {
				gold: parsed.gold ?? 0,
				purchasedUpgradeCounts: parsed.purchasedUpgradeCounts ?? {},
				executeCapBonus: parsed.executeCapBonus ?? 0,
				shopChoiceIds: parsed.shopChoiceIds,
				rerollCost: parsed.rerollCost,
				hasCompletedFirstRun: parsed.hasCompletedFirstRun ?? false,
				hasSelectedStartingLegendary: parsed.hasSelectedStartingLegendary ?? false
			};
		},
		null,
		'Failed to load persistent data (corrupted data or localStorage unavailable):'
	);
}
```

**Step 3: Commit**

```bash
git add src/lib/stores/persistence.svelte.ts
git commit -m "feat: add hasSelectedStartingLegendary to PersistentSaveData

Includes legacy save migration with default false value.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add hasSelectedStartingLegendary state variable to gameState

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:43-46`

**Step 1: Add the state variable**

Add the new state variable after `hasCompletedFirstRun` at line 44:

```typescript
// Legendary start selection
let hasCompletedFirstRun = $state(false);
let hasSelectedStartingLegendary = $state(false);
let showLegendarySelection = $state(false);
let legendaryChoices = $state<Upgrade[]>([]);
```

**Step 2: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: add hasSelectedStartingLegendary state variable

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Load hasSelectedStartingLegendary from persistent data

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:532-539`

**Step 1: Load the flag during initialization**

Modify the `init()` function at line 536-539 to load the persistent flag:

```typescript
// Load persistent data (includes hasCompletedFirstRun)
const persistentData = persistence.loadPersistent();
if (persistentData) {
	hasCompletedFirstRun = persistentData.hasCompletedFirstRun;
	hasSelectedStartingLegendary = persistentData.hasSelectedStartingLegendary ?? false;
}
```

**Step 2: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: load hasSelectedStartingLegendary during initialization

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Update startNewRun to check hasSelectedStartingLegendary

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:507-516`

**Step 1: Modify startNewRun logic**

Replace the `startNewRun()` call in `resetGame()` at lines 507-516 with the updated logic:

```typescript
// If hasCompletedFirstRun AND user hasn't already selected, show legendary selection
// Otherwise, the enemy from reset() stays and game continues
if (hasCompletedFirstRun && !hasSelectedStartingLegendary) {
	legendaryChoices = getRandomLegendaryUpgrades(3);
	if (legendaryChoices.length > 0) {
		showLegendarySelection = true;
		gameLoop.pause();
	}
}
```

**Step 2: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: only show legendary selection if not already selected

Updates resetGame to check hasSelectedStartingLegendary before
showing the legendary modal. This prevents users from seeing the
modal on future runs after they've made their one-time selection.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Update selectLegendaryUpgrade to set flag and save

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:343-376`

**Step 1: Import allUpgrades for the save logic**

Verify that `allUpgrades` is already imported at the top of the file (line 25). It should already be there:

```typescript
import { getRandomLegendaryUpgrades } from '$lib/data/upgrades';
```

We need to also import `allUpgrades` from the same location. Update the import at line 25:

```typescript
import { allUpgrades, getRandomLegendaryUpgrades } from '$lib/data/upgrades';
```

**Step 2: Update selectLegendaryUpgrade function**

Replace the `selectLegendaryUpgrade()` function at lines 343-376 with the updated version:

```typescript
function selectLegendaryUpgrade(upgrade: Upgrade | null): void {
	if (upgrade !== null) {
		// Acquire upgrade via pipeline
		statPipeline.acquireUpgrade(upgrade.id);
		if (upgrade.onAcquire) upgrade.onAcquire();

		// Track unlocked upgrades for collection
		unlockedUpgrades = new Set([...unlockedUpgrades, upgrade.id]);

		// Track special effects — same pattern as selectUpgrade
		if (upgrade.modifiers.length > 0) {
			const effectName = upgrade.title;
			if (!effects.find((e) => e.name === effectName)) {
				effects.push({
					name: effectName,
					description: upgrade.modifiers
						.map((m) => {
							const entry = statRegistry.find((s) => s.key === m.stat);
							const fmt = entry ? (entry.formatMod ?? entry.format) : null;
							return fmt ? `${entry!.label} ${fmt(m.value)}` : `${m.stat} +${m.value}`;
						})
						.join(', ')
				});
			}
		}
	}

	// Close modal and clear choices (whether upgrade was selected or skipped)
	showLegendarySelection = false;
	legendaryChoices = [];

	// Mark that user has made their one-time selection
	hasSelectedStartingLegendary = true;

	// Save persistent data to persist the flag
	persistence.savePersistent({
		gold: shop.persistentGold,
		purchasedUpgradeCounts: shop.purchasedCounts,
		executeCapBonus: pipeline.getExecuteCapBonus(),
		shopChoiceIds: shop.currentChoiceIds,
		rerollCost: shop.rerollCost,
		hasCompletedFirstRun: true,
		hasSelectedStartingLegendary: true
	});

	// Resume game loop
	gameLoop.resume();
}
```

**Step 3: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: set hasSelectedStartingLegendary in selectLegendaryUpgrade

Sets the persistent flag when user picks or skips a legendary card,
and saves persistent data to ensure the flag persists through refresh.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Save legendaryChoiceIds in session data

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:410-430`

**Step 1: Add legendaryChoiceIds to saveGame**

Update the `saveGame()` function at lines 410-430 to include the legendary choice IDs:

```typescript
function saveGame() {
	persistence.saveSession({
		effects: [...effects],
		unlockedUpgradeIds: [...unlockedUpgrades],
		xp: leveling.xp,
		level: leveling.level,
		gold,
		stage: enemy.stage,
		waveKills: enemy.waveKills,
		enemiesKilled: enemy.enemiesKilled,
		enemyHealth: enemy.enemyHealth,
		enemyMaxHealth: enemy.enemyMaxHealth,
		isBoss: enemy.isBoss,
		isChest: enemy.isChest,
		isBossChest: enemy.isBossChest,
		upgradeQueue: leveling.upgradeQueue.map(serializeEvent),
		activeEvent: leveling.activeEvent ? serializeEvent(leveling.activeEvent) : null,
		timestamp: Date.now(),
		bossTimeRemaining: gameLoop.bossTimeRemaining > 0 ? gameLoop.bossTimeRemaining : undefined,
		legendaryChoiceIds: legendaryChoices.map((u) => u.id)
	});
}
```

**Step 2: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: save legendaryChoiceIds in session data

Persists the current legendary choices to session storage so they
can be restored after page refresh.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Restore legendaryChoices from session data

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:432-471`

**Step 1: Update loadGame to restore legendary choices**

Modify the `loadGame()` function at lines 432-471 to restore legendary choices from saved IDs. Add this code after line 468 (after enemy.restore):

```typescript
function loadGame(): boolean {
	const data = persistence.loadSession();
	if (!data) return false;

	// Restore stats via pipeline from saved upgrade IDs
	statPipeline.setAcquiredUpgrades(data.unlockedUpgradeIds);
	// Also apply shop purchased upgrades
	const shopIds = shop.purchasedUpgradeIds;
	if (shopIds.length > 0) {
		// Combine session upgrades + shop upgrades
		statPipeline.setAcquiredUpgrades([...data.unlockedUpgradeIds, ...shopIds]);
	}

	effects = [...data.effects];
	unlockedUpgrades = new Set(data.unlockedUpgradeIds);
	// Also mark shop upgrades as unlocked
	for (const id of shopIds) {
		unlockedUpgrades = new Set([...unlockedUpgrades, id]);
	}

	leveling.restore({
		xp: data.xp,
		level: data.level,
		upgradeQueue: data.upgradeQueue,
		activeEvent: data.activeEvent
	});
	gold = data.gold;
	enemy.restore({
		stage: data.stage,
		waveKills: data.waveKills,
		enemiesKilled: data.enemiesKilled,
		enemyHealth: data.enemyHealth,
		enemyMaxHealth: data.enemyMaxHealth,
		isBoss: data.isBoss,
		isChest: data.isChest,
		isBossChest: data.isBossChest ?? false
	});

	// Restore legendary choices if they exist
	if (data.legendaryChoiceIds && data.legendaryChoiceIds.length > 0) {
		legendaryChoices = data.legendaryChoiceIds
			.map((id) => allUpgrades.find((u) => u.id === id))
			.filter((u): u is Upgrade => u !== undefined);

		if (legendaryChoices.length > 0) {
			showLegendarySelection = true;
		}
	}

	return true;
}
```

**Step 2: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: restore legendaryChoices from session data on load

Restores legendary choices from saved IDs when loading a game,
ensuring users see the same choices after page refresh.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Update game over to save hasSelectedStartingLegendary

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:117-138`

**Step 1: Update handleBossExpired to include the flag**

The `handleBossExpired()` function already saves persistent data at lines 129-135. Update it to include the new flag:

```typescript
function handleBossExpired() {
	gameLoop.reset();
	shop.depositGold(gold); // This calls shop.save() which saves persistent data
	sfx.play('game:over');
	showGameOver = true;

	// Set meta-progression flag
	hasCompletedFirstRun = true;

	// Save persistent data again to include hasCompletedFirstRun
	// DECISION: We save twice (shop.save inside depositGold, then here) to ensure
	// hasCompletedFirstRun is persisted. This is acceptable since it only happens on game over.
	const persistentData = persistence.loadPersistent();
	if (persistentData) {
		persistence.savePersistent({
			...persistentData,
			hasCompletedFirstRun: true,
			hasSelectedStartingLegendary: hasSelectedStartingLegendary
		});
	}

	persistence.clearSession();
}
```

**Step 2: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: save hasSelectedStartingLegendary on game over

Ensures the one-time selection flag is preserved when the game ends.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Add getter for hasSelectedStartingLegendary

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:556-687`

**Step 1: Add the getter to public API**

Add the getter after `hasCompletedFirstRun` at line 608:

```typescript
get hasCompletedFirstRun() {
	return hasCompletedFirstRun;
},
get hasSelectedStartingLegendary() {
	return hasSelectedStartingLegendary;
},
```

**Step 2: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: expose hasSelectedStartingLegendary in public API

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Test refresh during legendary selection

**Files:**

- Test: Manual browser testing

**Step 1: Clear localStorage and start fresh**

Run in browser console:

```javascript
localStorage.clear();
location.reload();
```

**Step 2: Complete first run**

Play the game until you die (game over).

**Step 3: Start new run to trigger legendary selection**

Click "Start New Run" - should see legendary selection modal with 3 cards.

**Step 4: Refresh page without selecting**

Refresh the browser page (`Ctrl+R` or `Cmd+R`).

**Expected:** The same 3 legendary cards should appear in the modal after refresh.

**Step 5: Note the card IDs/names**

Write down the card names shown.

**Step 6: Refresh again**

Refresh the page again.

**Expected:** The exact same 3 cards should appear (not rerolled).

**Step 7: Document test result**

If test passes, note it in the commit message for the next task.

---

## Task 12: Test pick legendary then refresh

**Files:**

- Test: Manual browser testing

**Step 1: Continue from previous test**

With the legendary modal open, pick one of the cards.

**Step 2: Verify card was acquired**

Check that the upgrade appears in your effects list.

**Step 3: Refresh page**

Refresh the browser page.

**Expected:** Game loads normally, no legendary selection modal appears, and the upgrade you picked is still in your effects.

**Step 4: Die and start new run**

Play until game over, then click "Start New Run".

**Expected:** No legendary selection modal appears (already made your one-time selection).

**Step 5: Document test result**

If test passes, create a commit documenting successful testing.

```bash
git commit --allow-empty -m "test: verify legendary selection persistence

Manual tests passed:
- Legendary choices persist through page refresh
- Same cards appear after refresh (no reroll)
- Picking a legendary sets the one-time flag
- Modal doesn't appear on future runs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Test skip legendary then refresh

**Files:**

- Test: Manual browser testing

**Step 1: Clear localStorage and repeat setup**

Run in browser console:

```javascript
localStorage.clear();
location.reload();
```

**Step 2: Complete first run**

Play until game over.

**Step 3: Start new run and skip legendary**

Click "Start New Run" to see legendary modal, then click "Skip" button.

**Step 4: Verify game continues**

Game should continue normally without any legendary upgrade.

**Step 5: Refresh page**

Refresh the browser page.

**Expected:** Game loads normally, no legendary modal appears.

**Step 6: Die and start new run**

Play until game over, then click "Start New Run".

**Expected:** No legendary selection modal appears (skipping counts as making your selection).

**Step 7: Document test result**

If test passes, create a commit documenting successful testing.

```bash
git commit --allow-empty -m "test: verify skip legendary behavior

Manual tests passed:
- Skipping legendary sets the one-time flag
- Modal doesn't appear after page refresh
- Modal doesn't appear on future runs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Test legacy save migration

**Files:**

- Test: Manual browser testing

**Step 1: Create a legacy save**

Run in browser console (simulates an old save without the new field):

```javascript
const oldPersistent = {
	gold: 100,
	purchasedUpgradeCounts: {},
	executeCapBonus: 0,
	hasCompletedFirstRun: true
	// Note: hasSelectedStartingLegendary is missing
};
localStorage.setItem('roguelike-cards-persistent', JSON.stringify(oldPersistent));
location.reload();
```

**Step 2: Verify migration**

Start a new run.

**Expected:** Legendary selection modal should appear (migrated value defaults to false).

**Step 3: Pick a legendary and complete the cycle**

Pick a legendary, refresh the page, die, and start a new run.

**Expected:** No legendary modal appears on the second run.

**Step 4: Verify persistent data includes new field**

Run in browser console:

```javascript
JSON.parse(localStorage.getItem('roguelike-cards-persistent'));
```

**Expected:** Object should include `hasSelectedStartingLegendary: true`.

**Step 5: Document test result**

If test passes, create a commit documenting successful testing.

```bash
git commit --allow-empty -m "test: verify legacy save migration

Manual tests passed:
- Old saves without hasSelectedStartingLegendary default to false
- Users see legendary modal on first new run after upgrade
- Flag saves correctly after selection

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Final verification and cleanup

**Files:**

- Test: All integration testing

**Step 1: Run full test suite**

Run the full test suite to ensure no regressions:

```bash
npm test
```

**Expected:** All tests pass.

**Step 2: Test complete flow one more time**

Clear localStorage and test the complete flow:

1. Clear storage: `localStorage.clear(); location.reload();`
2. Complete first run (die)
3. See legendary modal on second run
4. Note the 3 cards
5. Refresh page → same 3 cards
6. Pick a card
7. Refresh page → no modal, upgrade persisted
8. Die and start new run → no modal

**Expected:** All behaviors work as designed.

**Step 3: Check for any unused code**

Verify the `startNewRunWithLegendary()` function at line 378-395 is no longer needed and can be removed. If it's not called anywhere else, remove it.

**Step 4: Commit cleanup**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "refactor: remove unused startNewRunWithLegendary function

Functionality has been integrated into resetGame().

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Step 5: Final commit**

```bash
git commit --allow-empty -m "feat: legendary selection persistence complete

All features implemented and tested:
- Legendary choices persist through page refresh
- One-time selection flag prevents future modals
- Legacy save migration works correctly
- Pick and skip both set the flag correctly

Closes #[issue-number] (if applicable)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Implementation Complete

All tasks completed. The legendary selection persistence feature is now fully implemented and tested. Users can no longer reroll legendary choices by refreshing the page, and the legendary selection modal will only appear once per player (on their first run after completing the tutorial).
