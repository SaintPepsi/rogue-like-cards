# Legendary Start Selection Design

## Overview

Add a feature where players can choose 1 of 3 legendary upgrades at the start of each run (after dying/giving up at least once). The legendary applies only to the current run and resets on death. Players can skip the selection to start without a legendary.

## Requirements

- **Timing**: Legendary selection happens at the start of a new run, after `resetGame()` or `init()` (when no saved session exists)
- **Persistence**: Legendary only applies to current run, not permanent (like level-up upgrades)
- **Skip option**: Player can close modal without selecting to start with no legendary
- **Selection algorithm**: Pure random - pick 3 random legendaries using `getRandomLegendaryUpgrades(3)`
- **First run**: Only show legendary selection after player has died/given up at least once (not on very first game load)

## State & Data Model

### New state in gameState.svelte.ts

```ts
// Persistent flag: has player ever completed (died/gave up) a run?
let hasCompletedFirstRun = $state(false);

// Modal state
let showLegendarySelection = $state(false);
let legendaryChoices = $state<Upgrade[]>([]);
```

### Persistence

`hasCompletedFirstRun` is stored in **persistent storage** (same location as shop data), not session storage. This tracks meta-progression: "has the player unlocked legendary selection?"

### Flow

1. **First ever load**: `init()` → `hasCompletedFirstRun=false` → no legendary, spawn enemies
2. **Player dies/gives up**: `handleBossExpired()` or `giveUp()` → sets `hasCompletedFirstRun=true`, saves to persistent storage
3. **Player clicks restart**: `resetGame()` → checks `hasCompletedFirstRun=true` → shows legendary selection modal
4. **Player refreshes after death**: `init()` with no saved session + `hasCompletedFirstRun=true` → shows legendary selection modal

Both `init()` (when starting fresh with no save) and `resetGame()` check: "Am I starting a new run AND has the player completed their first run?" → show legendary selection.

## Modal Behavior & Game Loop Integration

### Modal state management

The legendary selection modal behaves like level-up/chest modals:

- When `showLegendarySelection = true`, game loop is paused
- Update `isModalOpen()`: `return showGameOver || leveling.hasActiveEvent || showLegendarySelection`
- Prevents auto-attacks and system ticks while modal is open

### Selection flow

New function in gameState:

```ts
function selectLegendaryUpgrade(upgrade: Upgrade | null) {
	if (upgrade !== null) {
		statPipeline.acquireUpgrade(upgrade.id);
		unlockedUpgrades = new Set([...unlockedUpgrades, upgrade.id]);

		// Track effect for UI (same pattern as selectUpgrade)
		if (upgrade.modifiers.length > 0) {
			// ... add to effects array for display
		}
	}

	showLegendarySelection = false;
	legendaryChoices = [];
	gameLoop.resume(); // Start the game
}
```

### Skip behavior

Player can close modal without picking:

- Call `selectLegendaryUpgrade(null)`
- Modal closes, game starts with no legendary applied

### Integration points

Both `init()` (when no save + `hasCompletedFirstRun=true`) and `resetGame()` call shared helper:

```ts
function startNewRunWithLegendary() {
	if (hasCompletedFirstRun) {
		legendaryChoices = getRandomLegendaryUpgrades(3);
		showLegendarySelection = true;
		gameLoop.pause(); // Keep paused until selection
	} else {
		// First run ever: spawn enemies immediately
		enemy.spawnEnemy(statPipeline.get('greed'));
	}
}
```

Call this helper at the end of `resetGame()` and in `init()` when no save exists.

## UI Component

### Component: LegendarySelectionModal.svelte

Similar structure to upgrade selection modals, with distinct styling:

- **Title**: "Choose Your Starting Legendary"
- **Cards**: Display 3 legendary upgrade cards using existing `UpgradeCard.svelte` component
- **Card details**: Show title, rarity, modifiers using existing formatters
- **Skip button**: Closes modal without selecting
- **Click card**: Calls `gameState.selectLegendaryUpgrade(upgrade)`
- **Click skip**: Calls `gameState.selectLegendaryUpgrade(null)`

### Visual distinction

- Different background color/styling to emphasize run-start choice
- Larger cards or special frame for legendary emphasis
- No "Level Up!" text

### Component location

`src/lib/components/LegendarySelectionModal.svelte`

### Integration in main layout

In main game component (wherever `showGameOver` modal is rendered):

```svelte
{#if gameState.showLegendarySelection}
	<LegendarySelectionModal
		choices={gameState.legendaryChoices}
		onSelect={gameState.selectLegendaryUpgrade}
	/>
{/if}
```

## Edge Cases & Error Handling

### Filter dependency-locked legendaries

Some legendaries require base stats:

- "Toxic Apocalypse" needs poison
- "Assassin's Creed" synergizes with crit
- Poison-dependent and crit-dependent legendaries exist

**Solution**: After `applyShopUpgrades()` runs, check `statPipeline.get('poison')` and `statPipeline.get('critChance')`. Filter legendary pool using existing dependency logic from `getRandomUpgrades()`.

### No legendaries available after filtering

If all legendaries are filtered out:

- Don't show modal
- Skip directly to spawning enemies
- Rare but possible with strict filtering

### Player refreshes during legendary selection

`showLegendarySelection` is not saved to storage.

On refresh:

- Session cleared, `init()` runs with no save
- `hasCompletedFirstRun=true` (persisted) → shows new legendary selection
- Player gets fresh 3 legendaries (old choices lost)
- **Acceptable behavior**: refresh = new run

### Error recovery

If `getRandomLegendaryUpgrades()` returns <3 cards:

- Show whatever legendaries are available (1-2 cards)
- Skip button still works
- Shouldn't happen in practice

## Implementation Checklist

- [ ] Add state to `gameState.svelte.ts`: `hasCompletedFirstRun`, `showLegendarySelection`, `legendaryChoices`
- [ ] Update `persistence.svelte.ts` to save/load `hasCompletedFirstRun` in persistent storage
- [ ] Add `selectLegendaryUpgrade()` function to `gameState.svelte.ts`
- [ ] Add `startNewRunWithLegendary()` helper function
- [ ] Update `handleBossExpired()` and `giveUp()` to set `hasCompletedFirstRun = true`
- [ ] Update `isModalOpen()` to include `showLegendarySelection`
- [ ] Update `resetGame()` to call `startNewRunWithLegendary()` instead of spawning enemies directly
- [ ] Update `init()` to call `startNewRunWithLegendary()` when starting fresh (no save)
- [ ] Implement dependency filtering for legendaries (poison, crit checks)
- [ ] Create `LegendarySelectionModal.svelte` component
- [ ] Integrate modal in main game layout
- [ ] Add getters to gameState for `showLegendarySelection` and `legendaryChoices`
- [ ] Test flow: first run → die → restart → legendary selection → skip
- [ ] Test flow: refresh during legendary selection
- [ ] Test edge case: all legendaries filtered out
