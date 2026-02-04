# Game Over Stats Comparison - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Capture and display before/after stat comparison on Game Over screen, showing only changed stats, and enforce one-way navigation flow from Game → Game Over → Shop → New Run.

**Architecture:** Track starting stats (base + shop upgrades) at run start and ending stats (base + shop + run upgrades) at run end. Store in session persistence. Display comparison in GameOverModal using statRegistry for formatting. Remove Shop back button to enforce one-way flow.

**Tech Stack:** Svelte 5 runes ($state), TypeScript, localStorage persistence

---

## Task 1: Add Stats Tracking to Persistence Types

**Files:**

- Modify: `src/lib/stores/persistence.svelte.ts:9-29`

**Step 1: Update SessionSaveData interface**

Add `startingStats` and `endingStats` fields to the `SessionSaveData` interface:

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
	startingStats?: PlayerStats;
	endingStats?: PlayerStats;
}
```

**Step 2: Add PlayerStats import**

At the top of the file (after the Effect import), add:

```typescript
import type { Effect, PlayerStats } from '$lib/types';
```

Update the first import line from:

```typescript
import type { Effect } from '$lib/types';
```

to:

```typescript
import type { Effect, PlayerStats } from '$lib/types';
```

**Step 3: Commit**

```bash
git add src/lib/stores/persistence.svelte.ts
git commit -m "feat: add stats tracking fields to SessionSaveData"
```

---

## Task 2: Add State Variables for Stats Tracking

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:36-52`

**Step 1: Add state variables**

After the line `let gold = $state(0);` (around line 38), add:

```typescript
// Stats comparison tracking
let startingStats = $state<PlayerStats | null>(null);
let endingStats = $state<PlayerStats | null>(null);
```

**Step 2: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: add state variables for stats comparison tracking"
```

---

## Task 3: Capture Starting Stats in resetGame

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:516-550`

**Step 1: Capture starting stats after applyShopUpgrades**

In the `resetGame` function, after the line `applyShopUpgrades();` (around line 533), add:

```typescript
// Capture starting baseline (base + shop upgrades only)
startingStats = getEffectiveStats();
```

**Step 2: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: capture starting stats at run start after shop upgrades"
```

---

## Task 4: Capture Ending Stats in handleBossExpired

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:118-142`

**Step 1: Capture ending stats at the start of handleBossExpired**

In the `handleBossExpired` function, add the capture right at the beginning (before `gameLoop.reset()`):

```typescript
	function handleBossExpired(isNaturalDeath: boolean = true) {
		// Capture final stats BEFORE any state changes
		endingStats = getEffectiveStats();

		gameLoop.reset();
		shop.depositGold(gold); // This calls shop.save() which saves persistent data
```

**Step 2: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: capture ending stats when run ends"
```

---

## Task 5: Persist Stats in saveGame

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:421-443`

**Step 1: Add stats to saveGame persistence**

In the `saveGame` function, add `startingStats` and `endingStats` to the persistence object (after `hasSelectedStartingLegendary`):

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

**Step 2: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: persist starting and ending stats in saveGame"
```

---

## Task 6: Restore Stats in loadGame

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:445-502`

**Step 1: Restore stats from session data**

In the `loadGame` function, find where `hasSelectedStartingLegendary` is restored (should be near the end, before `return true;`). Add the stats restoration:

```typescript
// Restore stats comparison data
startingStats = data.startingStats ?? null;
endingStats = data.endingStats ?? null;

return true;
```

**Step 2: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: restore stats comparison data in loadGame"
```

---

## Task 7: Expose Stats Getters

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:590-724`

**Step 1: Add getters for stats**

In the return statement of `createGameState`, add getters after `get frenzyStacks` (around line 700):

```typescript
		get frenzyStacks() {
			return frenzy.count;
		},
		get startingStats() {
			return startingStats;
		},
		get endingStats() {
			return endingStats;
		},
```

**Step 2: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: expose startingStats and endingStats getters"
```

---

## Task 8: Update GameOverModal Props

**Files:**

- Modify: `src/lib/components/GameOverModal.svelte:1-18`

**Step 1: Add imports**

Update the script imports to include `statRegistry` and `PlayerStats`:

```svelte
<script lang="ts">
	import { Button } from 'bits-ui';
	import { formatNumber } from '$lib/format';
	import { statRegistry } from '$lib/engine/stats';
	import type { PlayerStats } from '$lib/types';
```

**Step 2: Update Props type**

Update the Props type definition:

```typescript
type Props = {
	show: boolean;
	stage: number;
	level: number;
	enemiesKilled: number;
	goldEarned: number;
	totalGold: number;
	startingStats: PlayerStats | null;
	endingStats: PlayerStats | null;
	onReset: () => void;
	onOpenShop: () => void;
};
```

**Step 3: Update props destructuring**

Update the props destructuring:

```typescript
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

**Step 4: Commit**

```bash
git add src/lib/components/GameOverModal.svelte
git commit -m "feat: add stats comparison props to GameOverModal"
```

---

## Task 9: Add Stats Comparison Helper Function

**Files:**

- Modify: `src/lib/components/GameOverModal.svelte:18`

**Step 1: Add getChangedStats helper**

After the props destructuring, add the helper function:

```typescript
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

**Step 2: Commit**

```bash
git add src/lib/components/GameOverModal.svelte
git commit -m "feat: add getChangedStats helper to calculate stat differences"
```

---

## Task 10: Add Stats Comparison UI

**Files:**

- Modify: `src/lib/components/GameOverModal.svelte:20-46`

**Step 1: Add stats comparison section**

In the template, add the stats comparison section after the `.game-over-stats` div and before the `.gold-display` paragraph:

```svelte
<div class="game-over-stats">
	<p>Stage Reached: <strong>{stage}</strong></p>
	<p>Level: <strong>{level}</strong></p>
	<p>Enemies Killed: <strong>{formatNumber(enemiesKilled)}</strong></p>
	<p>Gold Earned: <strong class="gold-amount">{formatNumber(goldEarned)}</strong></p>
</div>

<!-- Stats progression section -->
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
```

**Step 2: Commit**

```bash
git add src/lib/components/GameOverModal.svelte
git commit -m "feat: add stats comparison UI to GameOverModal template"
```

---

## Task 11: Add Stats Comparison Styles

**Files:**

- Modify: `src/lib/components/GameOverModal.svelte:48-111`

**Step 1: Add CSS styles**

Add the following styles before the closing `</style>` tag:

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

**Step 2: Commit**

```bash
git add src/lib/components/GameOverModal.svelte
git commit -m "feat: add styles for stats comparison display"
```

---

## Task 12: Remove Shop Back Button

**Files:**

- Modify: `src/lib/components/ShopModal.svelte:113-134`

**Step 1: Remove Back button from footer snippet**

In the `{#snippet footer()}` section, remove the Back button and update the button-row to center a single button:

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
		<Button.Root
			class="py-3 px-8 bg-linear-to-r from-[#22c55e] to-[#16a34a] border-none rounded-lg text-white text-base font-bold cursor-pointer transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-[0_4px_20px_rgba(34,197,94,0.4)]"
			onclick={onPlayAgain}>Play Again</Button.Root
		>
	</div>
{/snippet}
```

**Step 2: Remove onBack from props**

Update the Props type (around line 9):

```typescript
type Props = {
	show: boolean;
	gold: number;
	choices: Upgrade[];
	getUpgradeLevel: (upgrade: Upgrade) => number;
	rerollCost: number;
	getPrice: (upgrade: Upgrade) => number;
	onBuy: (upgrade: Upgrade) => boolean;
	onReroll: () => void;
	onPlayAgain: () => void;
	currentStats?: Partial<PlayerStats>;
};
```

**Step 3: Remove onBack from props destructuring**

Update the props destructuring (around line 23):

```typescript
let {
	show,
	gold,
	choices,
	getUpgradeLevel,
	rerollCost,
	getPrice,
	onBuy,
	onReroll,
	onPlayAgain,
	currentStats
}: Props = $props();
```

**Step 4: Update button-row styles**

Update the `.button-row` style to center a single button (around line 209):

```css
.button-row {
	display: flex;
	justify-content: center;
}
```

**Step 5: Commit**

```bash
git add src/lib/components/ShopModal.svelte
git commit -m "feat: remove Back button from shop to enforce one-way flow"
```

---

## Task 13: Hide Game Over Modal When Shop Opens

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:718`

**Step 1: Update openShop to hide game over**

Find the `openShop` line in the return statement (around line 718) and update it:

```typescript
		openShop: () => {
			showGameOver = false;
			shop.open(getEffectiveStats());
		},
```

**Step 2: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: hide game over modal when shop opens for one-way flow"
```

---

## Task 14: Update Game Component to Pass Stats Props

**Files:**

- Modify: `src/routes/+page.svelte` (find GameOverModal usage)

**Step 1: Find GameOverModal usage**

Run: `grep -n "GameOverModal" src/routes/+page.svelte`

**Step 2: Add stats props to GameOverModal**

Update the GameOverModal component call to include `startingStats` and `endingStats`:

```svelte
<GameOverModal
	show={gameState.showGameOver}
	stage={gameState.stage}
	level={gameState.level}
	enemiesKilled={gameState.enemiesKilled}
	goldEarned={gameState.gold}
	totalGold={gameState.persistentGold}
	startingStats={gameState.startingStats}
	endingStats={gameState.endingStats}
	onReset={gameState.resetGame}
	onOpenShop={gameState.openShop}
/>
```

**Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: pass stats comparison props to GameOverModal"
```

---

## Task 15: Update Shop Component to Remove onBack Prop

**Files:**

- Modify: `src/routes/+page.svelte` (find ShopModal usage)

**Step 1: Find ShopModal usage**

Run: `grep -n "ShopModal" src/routes/+page.svelte`

**Step 2: Remove onBack prop from ShopModal**

Update the ShopModal component call to remove the `onBack` prop:

```svelte
<ShopModal
	show={gameState.showShop}
	gold={gameState.persistentGold}
	choices={gameState.shopChoices}
	getUpgradeLevel={gameState.getUpgradeLevel}
	rerollCost={gameState.rerollCost}
	getPrice={gameState.getCardPrice}
	onBuy={gameState.buyUpgrade}
	onReroll={gameState.rerollShop}
	onPlayAgain={gameState.resetGame}
	currentStats={gameState.playerStats}
/>
```

**Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: remove onBack prop from ShopModal usage"
```

---

## Task 16: Manual Testing

**Step 1: Start development server**

Run: `npm run dev`

**Step 2: Test stats capture flow**

1. Start a new game (or continue if already playing)
2. Play until boss timer expires (or use give up)
3. Verify Game Over modal shows with stats comparison section
4. Verify only stats that changed during the run are displayed
5. Verify format matches design (icon, label, start → end values)

**Step 3: Test persistence**

1. Start a new run
2. Gain some upgrades (level up a few times)
3. Refresh the page mid-run
4. Let the boss expire
5. Verify stats comparison still shows correctly after refresh

**Step 4: Test one-way flow**

1. Let boss expire to show Game Over modal
2. Click "Buy Cards" button
3. Verify shop modal opens and Game Over modal disappears
4. Verify there is NO "Back" button in shop
5. Verify only "Play Again" button exists
6. Click "Play Again"
7. Verify new run starts with stats captured at new baseline

**Step 5: Test edge cases**

1. First run ever (no shop upgrades) → Verify stats comparison works
2. Run with no stat changes (skip all upgrades) → Verify empty state or no section shown
3. Give up vs natural death → Verify both capture ending stats correctly

**Step 6: Document any issues**

If issues found, create follow-up tasks. Otherwise, proceed to final commit.

---

## Task 17: Final Verification and Commit

**Step 1: Verify all changes**

Run: `git status`

Expected: All modified files should be committed

**Step 2: Run build**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 3: Create final commit (if needed)**

If any small fixes were needed during testing:

```bash
git add .
git commit -m "fix: final adjustments after manual testing"
```

**Step 4: Verify git log**

Run: `git log --oneline -20`

Expected: See all commits from this implementation in order

---

## Testing Strategy

**Unit-level verification:**

- Stats captured at correct times (run start, run end)
- Stats persisted and restored correctly from localStorage
- Stats comparison only shows changed stats
- Formatting matches statRegistry definitions

**Integration verification:**

- Full flow: Game → Game Over → Shop → New Run
- No way to navigate back to Game Over once shop opens
- Stats survive page refresh during active run
- Stats cleared on new run start

**Edge cases:**

- First run ever (null starting stats initially)
- No stats changed during run (empty comparison)
- Give up vs natural death (both capture correctly)
- Page refresh during run (persistence works)

---

## Notes

- **DRY:** Reusing `statRegistry` for formatting ensures consistency
- **YAGNI:** Only showing changed stats (user preference), not all stats
- **TDD:** Manual testing at end validates full feature flow
- **Frequent commits:** Each task is one logical change with its own commit
