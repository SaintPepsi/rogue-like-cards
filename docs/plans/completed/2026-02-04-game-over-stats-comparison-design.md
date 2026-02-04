# Game Over Stats Comparison - Design

## Overview

Show before → after stat comparison on the Game Over screen, displaying only stats that changed during the run. Enforce one-way flow from Game → Game Over → Shop → New Run, preventing navigation back to Game Over once the shop is opened.

## Current State

- **Stats**: Calculated via `getEffectiveStats()` from stat pipeline (base + all acquired upgrades)
- **Run data**: Session storage tracks gold, kills, level, stage, upgrades
- **Shop**: Persistent upgrades survive across runs, applied via `applyShopUpgrades()`
- **Game Over flow**: Shows basic stats (stage, level, kills, gold) with "Buy Cards" and "Play Again" buttons

## Goals

1. Capture starting stats (base + shop upgrades) at run start
2. Capture ending stats (base + shop + run upgrades) when run ends
3. Display before → after comparison for changed stats only on Game Over screen
4. Reset captured stats when shop opens or new run starts
5. Remove ability to navigate back to Game Over once shop is opened

## Data Model & State Management

### New State Variables

Add to `gameState.svelte.ts`:

```typescript
// Captured at start of each run (in resetGame())
let startingStats = $state<PlayerStats | null>(null);

// Captured when run ends (in handleBossExpired())
let endingStats = $state<PlayerStats | null>(null);
```

### Capture Strategy

**Starting stats** - in `resetGame()`:

```typescript
function resetGame() {
	gameLoop.reset();
	frenzy.reset();
	statPipeline.reset();
	pipeline.reset();

	effects = [];
	unlockedUpgrades = new Set();
	gold = 0;
	hasSelectedStartingLegendary = false;
	ui.reset();
	leveling.reset();
	showGameOver = false;
	shop.resetShopUI();
	persistence.clearSession();

	applyShopUpgrades(); // Apply shop upgrades to pipeline

	// Capture starting baseline (base + shop upgrades only)
	startingStats = getEffectiveStats();

	// Reset enemy state (spawns initial enemy)
	enemy.reset(statPipeline.get('greed'));

	gameLoop.start(buildGameLoopCallbacks());

	// Legendary selection happens AFTER baseline capture
	if (hasCompletedFirstRun && !hasSelectedStartingLegendary) {
		legendaryChoices = getRandomLegendaryUpgrades(3);
		if (legendaryChoices.length > 0) {
			showLegendarySelection = true;
			gameLoop.pause();
			saveGame();
		}
	}
}
```

**Ending stats** - in `handleBossExpired()`:

```typescript
function handleBossExpired(isNaturalDeath: boolean = true) {
	// Capture final stats BEFORE any state changes
	endingStats = getEffectiveStats();

	gameLoop.reset();
	shop.depositGold(gold);
	sfx.play('game:over');
	showGameOver = true;

	if (isNaturalDeath) {
		hasCompletedFirstRun = true;
	}

	const persistentData = persistence.loadPersistent();
	if (persistentData) {
		persistence.savePersistent({
			...persistentData,
			hasCompletedFirstRun: isNaturalDeath ? true : (persistentData.hasCompletedFirstRun ?? false)
		});
	}

	persistence.clearSession();
}
```

### Persistence Updates

Add to `SessionSaveData` interface in `persistence.svelte.ts`:

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
	hasSelectedStartingLegendary?: boolean;

	// NEW: Stats comparison
	startingStats?: PlayerStats;
	endingStats?: PlayerStats;
}
```

**Update `saveGame()` to persist stats:**

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
		legendaryChoiceIds: legendaryChoices.map((u) => u.id),
		hasSelectedStartingLegendary,
		startingStats,
		endingStats
	});
}
```

**Update `loadGame()` to restore stats:**

```typescript
function loadGame(): boolean {
	const data = persistence.loadSession();
	if (!data) return false;

	// ... existing restore logic

	// Restore stats comparison data
	startingStats = data.startingStats ?? null;
	endingStats = data.endingStats ?? null;

	return true;
}
```

**Expose stats in gameState return:**

```typescript
return {
	// ... existing getters
	get startingStats() {
		return startingStats;
	},
	get endingStats() {
		return endingStats;
	}
	// ... rest of interface
};
```

### Why This Approach

- **Timing**: Starting stats captured after shop upgrades applied but before legendary selection
- **Completeness**: `getEffectiveStats()` includes all modifiers from the stat pipeline
- **Persistence**: Stats survive page refresh during active runs
- **Cleanup**: Stats cleared when session is cleared (on game over)

## Game Over UI - Stats Comparison Display

### Component Props Update

Update `GameOverModal.svelte` props:

```typescript
type Props = {
	show: boolean;
	stage: number;
	level: number;
	enemiesKilled: number;
	goldEarned: number;
	totalGold: number;
	startingStats: PlayerStats | null; // NEW
	endingStats: PlayerStats | null; // NEW
	onReset: () => void;
	onOpenShop: () => void;
};

let {
	show,
	stage,
	level,
	enemiesKilled,
	goldEarned,
	totalGold,
	startingStats,
	endingStats,
	onReset,
	onOpenShop
}: Props = $props();
```

### Stats Comparison Section

Add new section to `GameOverModal.svelte` template:

```svelte
{#if show}
	<div class="modal-overlay">
		<div class="modal game-over">
			<h2>Game Over</h2>
			<p>The boss defeated you!</p>

			<div class="game-over-stats">
				<p>Stage Reached: <strong>{stage}</strong></p>
				<p>Level: <strong>{level}</strong></p>
				<p>Enemies Killed: <strong>{formatNumber(enemiesKilled)}</strong></p>
				<p>Gold Earned: <strong class="gold-amount">{formatNumber(goldEarned)}</strong></p>
			</div>

			<!-- NEW: Stats progression section -->
			{#if startingStats && endingStats}
				{@const changedStats = getChangedStats(startingStats, endingStats)}
				{#if changedStats.length > 0}
					<div class="stats-comparison">
						<h3>Run Progression</h3>
						{#each changedStats as stat}
							<div class="stat-row">
								<span class="stat-icon">{stat.icon}</span>
								<span class="stat-label">{stat.label}</span>
								<span class="stat-change">
									{stat.formatStart} → {stat.formatEnd}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			{/if}

			<p class="gold-display">
				Total Gold: <span class="gold-amount">{formatNumber(totalGold)}</span>
			</p>

			<div class="button-row">
				<Button.Root onclick={onOpenShop}>Buy Cards</Button.Root>
				<Button.Root onclick={onReset}>Play Again</Button.Root>
			</div>
		</div>
	</div>
{/if}
```

### Helper Function

Add to `GameOverModal.svelte` script:

```typescript
import { statRegistry } from '$lib/engine/stats';
import type { PlayerStats } from '$lib/types';

function getChangedStats(start: PlayerStats, end: PlayerStats) {
	return statRegistry
		.filter((entry) => {
			const startVal = start[entry.key];
			const endVal = end[entry.key];
			return startVal !== endVal;
		})
		.map((entry) => ({
			...entry,
			formatStart: entry.format(start[entry.key]),
			formatEnd: entry.format(end[entry.key])
		}));
}
```

### Styling

Add to `GameOverModal.svelte` styles:

```css
.stats-comparison {
	background: rgba(0, 0, 0, 0.3);
	padding: 16px;
	border-radius: 8px;
	margin: 16px 0;
	max-height: 300px;
	overflow-y: auto;
}

.stats-comparison h3 {
	color: #a78bfa;
	margin: 0 0 12px;
	font-size: 1.2rem;
	text-align: center;
}

.stat-row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 0;
	color: rgba(255, 255, 255, 0.8);
}

.stat-icon {
	font-size: 1.1rem;
	width: 24px;
}

.stat-label {
	flex: 1;
	font-weight: 500;
}

.stat-change {
	color: #fbbf24;
	font-weight: bold;
	font-family: monospace;
}
```

### Design Decisions

- **Filter to changed stats**: Only show stats where `start !== end` (user's preference)
- **Use existing registry**: Leverage `statRegistry` for consistent icon/label/formatting
- **Graceful fallback**: If `startingStats` or `endingStats` is null, section doesn't render
- **Scrollable**: Max height with overflow for runs with many stat changes

## Flow Changes - One-Way Navigation

### Remove Shop "Back" Button

Update `ShopModal.svelte` footer snippet to remove "Back" button:

```svelte
{#snippet footer()}
	<div class="reroll-row">
		<Button.Root
			class="reroll-btn {gold >= rerollCost ? 'reroll-affordable' : 'reroll-disabled'}"
			disabled={gold < rerollCost || rerolling}
			onclick={handleReroll}
		>
			Reroll ({formatNumber(rerollCost)}g)
		</Button.Root>
	</div>

	<div class="button-row">
		<!-- Removed: Back button -->
		<Button.Root
			class="py-3 px-8 bg-linear-to-r from-[#22c55e] to-[#16a34a] border-none rounded-lg text-white text-base font-bold cursor-pointer transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-[0_4px_20px_rgba(34,197,94,0.4)]"
			onclick={onPlayAgain}>Play Again</Button.Root
		>
	</div>
{/snippet}
```

Update styles to center single button:

```css
.button-row {
	display: flex;
	justify-content: center;
	/* gap: 16px; */ /* Remove gap since there's only one button */
}
```

### Hide Game Over When Shop Opens

Update `openShop()` in `gameState.svelte.ts`:

```typescript
function openShop() {
	showGameOver = false; // Hide game over modal
	shop.open(getEffectiveStats());
}
```

### Flow Enforcement

**Complete flow:**

```
Game → Boss timeout/Give up
  ↓
Game Over Modal (shows run stats)
  ↓ [Buy Cards or Play Again]
  ↓
Shop (can browse/buy/reroll)
  ↓ [Play Again only]
  ↓
New Run starts (resetGame() captures new baseline)
```

**Key constraints:**

- Game Over has two exits: "Buy Cards" or "Play Again"
- Opening shop hides Game Over (`showGameOver = false`)
- Shop has one exit: "Play Again"
- No way to return to Game Over once shop is opened
- New run clears session data including saved stats

## Implementation Order

1. **Data model** - Add state variables and persistence fields
2. **Capture logic** - Update `resetGame()` and `handleBossExpired()`
3. **Save/load** - Update `saveGame()` and `loadGame()`
4. **UI - Game Over** - Add stats comparison section with helper function
5. **UI - Shop** - Remove "Back" button, center "Play Again"
6. **Flow** - Update `openShop()` to hide Game Over modal
7. **Testing** - Verify stats captured correctly, flow enforced, persistence works

## Edge Cases

- **First run ever**: `startingStats` will be null until first `resetGame()` - comparison section won't render
- **Page refresh during run**: Stats restored from session storage
- **Give up vs natural death**: Both capture ending stats identically
- **No stats changed**: Empty `changedStats` array - section renders but shows nothing (could add "No stats changed" message)
- **Shop upgrades only**: If user only has shop upgrades and no run upgrades, starting/ending stats might be identical (edge case, but handled)
