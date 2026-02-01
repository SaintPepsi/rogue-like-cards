# Economy Rebalance & Deferred Level-Up UX — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Flatten the early XP curve, defer all upgrade modals to a player-controlled button, rebalance gold economy, and build a simulation tool with Chart.js graph output to validate balance.

**Architecture:** The XP curve and gold economy are pure functions in `src/lib/engine/waves.ts` and `src/lib/engine/shop.ts` — simple constant changes. The deferred upgrade queue replaces the auto-show modal pattern with a FIFO queue in `leveling.svelte.ts`, a new badge component in the level bar, and updated game state flow in `gameState.svelte.ts`. The simulation is a standalone test file that generates an HTML report.

**Tech Stack:** Svelte 5 (runes), TypeScript, Vitest, Chart.js (CDN in generated HTML), Bun

---

### Task 1: Economy Simulation — Failing Tests

**Files:**

- Create: `src/lib/engine/economy-sim.test.ts`

**Step 1: Write the simulation test file with initial assertions**

This test will simulate a playthrough and assert basic sanity checks. It imports the real game functions and runs through stages 1–30, tracking XP, gold, and level-ups.

```ts
import { describe, test, expect } from 'vitest';
import { writeFileSync } from 'fs';
import {
	getXpToNextLevel,
	getXpReward,
	getEnemyHealth,
	getBossHealth,
	getChestGoldReward,
	getEnemyGoldReward,
	getBossGoldReward,
	KILLS_PER_WAVE,
	BOSS_XP_MULTIPLIER
} from './waves';
import { getCardPrice } from './shop';

// --- Simulation config ---
type EconomyConfig = {
	label: string;
	xpBase: number;
	goldDropChance: number;
	rarityPrices: Record<string, number>;
};

const CURRENT: EconomyConfig = {
	label: 'Current',
	xpBase: 10,
	goldDropChance: 0.15,
	rarityPrices: { common: 10, uncommon: 20, rare: 35, epic: 60, legendary: 100 }
};

const PROPOSED: EconomyConfig = {
	label: 'Proposed',
	xpBase: 25,
	goldDropChance: 0.1,
	rarityPrices: { common: 25, uncommon: 50, rare: 100, epic: 175, legendary: 300 }
};

const MAX_STAGE = 30;

// Custom getXpToNextLevel using configurable base
function xpToNextLevel(level: number, base: number): number {
	const SOFT_CAP_LEVEL = 100;
	if (level <= SOFT_CAP_LEVEL) {
		return Math.floor(base * Math.pow(1.5, level - 1));
	}
	const baseMult = Math.pow(1.5, SOFT_CAP_LEVEL - 1);
	const beyond = level - SOFT_CAP_LEVEL;
	return Math.floor(base * baseMult * Math.pow(1 + beyond * 0.1, 3));
}

type StageResult = {
	stage: number;
	levelUps: number;
	cumulativeLevelUps: number;
	goldEarned: number;
	cumulativeGold: number;
	xpToNext: number;
	level: number;
};

function simulatePlaythrough(config: EconomyConfig): StageResult[] {
	const results: StageResult[] = [];
	let level = 1;
	let xp = 0;
	let cumulativeGold = 0;
	let cumulativeLevelUps = 0;

	for (let stage = 1; stage <= MAX_STAGE; stage++) {
		let stageLevelUps = 0;
		let stageGold = 0;

		// Kill KILLS_PER_WAVE regular enemies
		for (let kill = 0; kill < KILLS_PER_WAVE; kill++) {
			const hp = getEnemyHealth(stage, 0);
			const xpGain = getXpReward(hp, stage, 1);
			xp += xpGain;

			// Gold drop (use expected value = reward * dropChance)
			const goldReward = getEnemyGoldReward(stage, 0, 1);
			stageGold += goldReward * config.goldDropChance;

			// Check level-ups
			for (let i = 0; i < 100 && xp >= xpToNextLevel(level, config.xpBase); i++) {
				xp -= xpToNextLevel(level, config.xpBase);
				level++;
				stageLevelUps++;
			}
		}

		// Kill boss
		const bossHp = getBossHealth(stage, 0);
		const bossXp = getXpReward(bossHp, stage, 1, BOSS_XP_MULTIPLIER);
		xp += bossXp;

		const bossGold = getBossGoldReward(stage, 0, 1);
		stageGold += bossGold * config.goldDropChance;

		// Check level-ups after boss
		for (let i = 0; i < 100 && xp >= xpToNextLevel(level, config.xpBase); i++) {
			xp -= xpToNextLevel(level, config.xpBase);
			level++;
			stageLevelUps++;
		}

		cumulativeGold += stageGold;
		cumulativeLevelUps += stageLevelUps;

		results.push({
			stage,
			levelUps: stageLevelUps,
			cumulativeLevelUps,
			goldEarned: Math.round(stageGold),
			cumulativeGold: Math.round(cumulativeGold),
			xpToNext: xpToNextLevel(level, config.xpBase),
			level
		});
	}
	return results;
}

function generateHtml(
	current: StageResult[],
	proposed: StageResult[],
	configs: { current: EconomyConfig; proposed: EconomyConfig }
): string {
	const stages = current.map((r) => r.stage);
	const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

	// Cards affordable at each stage for each config
	const cardsAffordable = (results: StageResult[], prices: Record<string, number>) =>
		rarities.map((r) => results.map((s) => Math.floor(s.cumulativeGold / prices[r])));

	const currentCards = cardsAffordable(current, configs.current.rarityPrices);
	const proposedCards = cardsAffordable(proposed, configs.proposed.rarityPrices);

	return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Economy Simulation</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>body{font-family:system-ui;background:#1a1a2e;color:white;padding:24px;margin:0}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:1400px;margin:0 auto}
canvas{background:rgba(0,0,0,0.3);border-radius:8px;padding:12px}
h1{text-align:center}h2{margin:8px 0}</style></head><body>
<h1>Economy Simulation: Current vs Proposed</h1>
<p style="text-align:center;opacity:0.7">Stages 1-${MAX_STAGE} | ${KILLS_PER_WAVE} enemies + 1 boss per stage | No greed, no XP multiplier</p>
<div class="grid">
<div><h2>1. XP to Next Level (Levels 1-30)</h2><canvas id="c1"></canvas></div>
<div><h2>2. Level-Ups Per Stage</h2><canvas id="c2"></canvas></div>
<div><h2>3. Cumulative Gold Earned</h2><canvas id="c3"></canvas></div>
<div><h2>4. Cumulative Level (Progression)</h2><canvas id="c4"></canvas></div>
<div><h2>5. Cards Affordable (Current Economy)</h2><canvas id="c5"></canvas></div>
<div><h2>6. Cards Affordable (Proposed Economy)</h2><canvas id="c6"></canvas></div>
</div>
<script>
const stages = ${JSON.stringify(stages)};
const cur = ${JSON.stringify(current)};
const prop = ${JSON.stringify(proposed)};
const colors = {current:'#8b5cf6',proposed:'#22d3ee'};
const rarityColors = ['#9ca3af','#22c55e','#3b82f6','#a855f7','#f59e0b'];
const rarityNames = ${JSON.stringify([...rarities])};

function mkChart(id,cfg){new Chart(document.getElementById(id),cfg)}
function line(id,datasets,labels=stages){mkChart(id,{type:'line',data:{labels,datasets},options:{responsive:true,plugins:{legend:{labels:{color:'white'}}},scales:{x:{ticks:{color:'white'},grid:{color:'rgba(255,255,255,0.1)'}},y:{ticks:{color:'white'},grid:{color:'rgba(255,255,255,0.1)'}}}}})}

// Chart 1: XP to next level
const xpLevels = Array.from({length:30},(_,i)=>i+1);
line('c1',[
  {label:'Current (base 10)',data:xpLevels.map(l=>Math.floor(10*Math.pow(1.5,l-1))),borderColor:colors.current,fill:false},
  {label:'Proposed (base 25)',data:xpLevels.map(l=>Math.floor(25*Math.pow(1.5,l-1))),borderColor:colors.proposed,fill:false}
],xpLevels);

// Chart 2: Level-ups per stage
line('c2',[
  {label:'Current',data:cur.map(r=>r.levelUps),borderColor:colors.current,fill:false},
  {label:'Proposed',data:prop.map(r=>r.levelUps),borderColor:colors.proposed,fill:false}
]);

// Chart 3: Cumulative gold
line('c3',[
  {label:'Current (15% drop)',data:cur.map(r=>r.cumulativeGold),borderColor:colors.current,fill:false},
  {label:'Proposed (10% drop)',data:prop.map(r=>r.cumulativeGold),borderColor:colors.proposed,fill:false}
]);

// Chart 4: Cumulative level
line('c4',[
  {label:'Current',data:cur.map(r=>r.level),borderColor:colors.current,fill:false},
  {label:'Proposed',data:prop.map(r=>r.level),borderColor:colors.proposed,fill:false}
]);

// Chart 5: Cards affordable (current economy)
const curCards = ${JSON.stringify(currentCards)};
line('c5',rarityNames.map((name,i)=>({label:name,data:curCards[i],borderColor:rarityColors[i],fill:false})));

// Chart 6: Cards affordable (proposed economy)
const propCards = ${JSON.stringify(proposedCards)};
line('c6',rarityNames.map((name,i)=>({label:name,data:propCards[i],borderColor:rarityColors[i],fill:false})));
</script></body></html>`;
}

describe('economy simulation', () => {
	const current = simulatePlaythrough(CURRENT);
	const proposed = simulatePlaythrough(PROPOSED);

	test('proposed: stage 1 yields approximately 2 level-ups', () => {
		expect(proposed[0].levelUps).toBeGreaterThanOrEqual(1);
		expect(proposed[0].levelUps).toBeLessThanOrEqual(3);
	});

	test('proposed: fewer level-ups than current at stage 1', () => {
		expect(proposed[0].levelUps).toBeLessThan(current[0].levelUps);
	});

	test('proposed: cumulative gold is less than current', () => {
		const lastCurrent = current[current.length - 1];
		const lastProposed = proposed[proposed.length - 1];
		expect(lastProposed.cumulativeGold).toBeLessThan(lastCurrent.cumulativeGold);
	});

	test('proposed: common cards are more expensive relative to income', () => {
		const stage10Current = current[9];
		const stage10Proposed = proposed[9];
		const currentAffordable = stage10Current.cumulativeGold / CURRENT.rarityPrices.common;
		const proposedAffordable = stage10Proposed.cumulativeGold / PROPOSED.rarityPrices.common;
		expect(proposedAffordable).toBeLessThan(currentAffordable);
	});

	test('generates HTML simulation report', () => {
		const html = generateHtml(current, proposed, { current: CURRENT, proposed: PROPOSED });
		const outputPath = 'economy-simulation.html';
		writeFileSync(outputPath, html);
		console.log(`\n📊 Economy simulation report written to: ${outputPath}`);
		console.log('Open in browser to view interactive charts.\n');

		// Sanity: HTML was generated
		expect(html).toContain('Chart.js');
		expect(html).toContain('Economy Simulation');
	});

	test('prints summary table', () => {
		console.log('\n--- ECONOMY SIMULATION SUMMARY ---\n');
		console.log('Stage | Cur LvlUps | Prop LvlUps | Cur Gold | Prop Gold | Cur Lvl | Prop Lvl');
		console.log('------|------------|-------------|----------|-----------|---------|--------');
		for (let i = 0; i < current.length; i++) {
			const c = current[i];
			const p = proposed[i];
			console.log(
				`${String(c.stage).padStart(5)} | ${String(c.levelUps).padStart(10)} | ${String(p.levelUps).padStart(11)} | ${String(c.cumulativeGold).padStart(8)} | ${String(p.cumulativeGold).padStart(9)} | ${String(c.level).padStart(7)} | ${String(p.level).padStart(6)}`
			);
		}
		console.log('');
	});
});
```

**Step 2: Run test to verify it passes**

Run: `cd /Users/hogers/Documents/repos/rogue-like-cards && bun run test -- src/lib/engine/economy-sim.test.ts`

Expected: PASS — all assertions pass, HTML file generated, summary table printed to console.

**Step 3: Open the HTML report and review the graphs**

Run: `open economy-simulation.html`

Review the 6 charts and confirm the proposed values look reasonable. Report findings before proceeding to implementation.

**Step 4: Commit**

```bash
git add src/lib/engine/economy-sim.test.ts
git commit -m "test: add economy simulation with Chart.js report output"
```

---

### Task 2: XP Curve — Update Base Constant

**Files:**

- Modify: `src/lib/engine/waves.ts:78-87` — `getXpToNextLevel()`
- Modify: `src/lib/engine/waves.test.ts:316-365` — update test expectations

**Step 1: Update existing tests to expect new base value of 25**

In `src/lib/engine/waves.test.ts`, update the `getXpToNextLevel` describe block:

Change test at line 317-319:

```ts
// OLD: test('level 1 needs 10 xp', () => { expect(getXpToNextLevel(1)).toBe(10); });
// NEW:
test('level 1 needs 25 xp', () => {
	expect(getXpToNextLevel(1)).toBe(25);
});
```

Change test at line 321-323:

```ts
// OLD: test('level 2 needs 15 xp', () => { expect(getXpToNextLevel(2)).toBe(15); });
// NEW:
test('level 2 needs 37 xp', () => {
	expect(getXpToNextLevel(2)).toBe(37);
});
```

Change test at line 325-327:

```ts
// OLD: test('level 3 needs 22 xp', () => { expect(getXpToNextLevel(3)).toBe(22); });
// NEW:
test('level 3 needs 56 xp', () => {
	expect(getXpToNextLevel(3)).toBe(56);
});
```

Change test at line 329-333:

```ts
// OLD: for (const lvl of ...) { expect(getXpToNextLevel(lvl)).toBe(Math.floor(10 * ...)); }
// NEW:
test('levels 1-100 match pure exponential with base 25', () => {
	for (const lvl of [1, 10, 25, 50, 75, 100]) {
		expect(getXpToNextLevel(lvl)).toBe(Math.floor(25 * Math.pow(1.5, lvl - 1)));
	}
});
```

Change test at line 341 (soft cap assertion):

```ts
const pureExponential = Math.floor(25 * Math.pow(1.5, 100));
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/hogers/Documents/repos/rogue-like-cards && bun run test -- src/lib/engine/waves.test.ts`

Expected: FAIL — `getXpToNextLevel` tests fail because code still uses base 10.

**Step 3: Update the implementation**

In `src/lib/engine/waves.ts`, line 82:

```ts
// OLD: return Math.floor(10 * Math.pow(1.5, level - 1));
// NEW:
return Math.floor(25 * Math.pow(1.5, level - 1));
```

Line 86:

```ts
// OLD: return Math.floor(10 * base * Math.pow(1 + beyond * 0.1, 3));
// NEW:
return Math.floor(25 * base * Math.pow(1 + beyond * 0.1, 3));
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/hogers/Documents/repos/rogue-like-cards && bun run test -- src/lib/engine/waves.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/engine/waves.ts src/lib/engine/waves.test.ts
git commit -m "feat: raise XP curve base from 10 to 25 for gradual early progression"
```

---

### Task 3: Gold Economy — Update Prices and Drop Chance

**Files:**

- Modify: `src/lib/engine/shop.ts:3-9` — rarity prices
- Modify: `src/lib/engine/stats.ts:24` — default gold drop chance
- Modify: `src/lib/engine/shop.test.ts` — update price expectations

**Step 1: Update shop test expectations**

In `src/lib/engine/shop.test.ts`, update all base price tests:

```ts
test('common base price with 0 purchases', () => {
	expect(getCardPrice('common', 0)).toBe(25);
});

test('uncommon base price with 0 purchases', () => {
	expect(getCardPrice('uncommon', 0)).toBe(50);
});

test('rare base price with 0 purchases', () => {
	expect(getCardPrice('rare', 0)).toBe(100);
});

test('epic base price with 0 purchases', () => {
	expect(getCardPrice('epic', 0)).toBe(175);
});

test('legendary base price with 0 purchases', () => {
	expect(getCardPrice('legendary', 0)).toBe(300);
});

test('price scales with purchase count using 1.5x multiplier', () => {
	// common: 25 * 1.5^1 = 37.5 -> 38
	expect(getCardPrice('common', 1)).toBe(38);
	// common: 25 * 1.5^2 = 56.25 -> 56
	expect(getCardPrice('common', 2)).toBe(56);
	// common: 25 * 1.5^3 = 84.375 -> 84
	expect(getCardPrice('common', 3)).toBe(84);
});

test('higher rarity scales more steeply', () => {
	// epic: 175 * 1.5^1 = 262.5 -> 263
	expect(getCardPrice('epic', 1)).toBe(263);
	// epic: 175 * 1.5^2 = 393.75 -> 394
	expect(getCardPrice('epic', 2)).toBe(394);
	// legendary: 300 * 1.5^1 = 450
	expect(getCardPrice('legendary', 1)).toBe(450);
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/hogers/Documents/repos/rogue-like-cards && bun run test -- src/lib/engine/shop.test.ts`

Expected: FAIL — prices still use old values.

**Step 3: Update shop prices**

In `src/lib/engine/shop.ts`, lines 3-9:

```ts
const RARITY_BASE_PRICES: Record<Rarity, number> = {
	common: 25,
	uncommon: 50,
	rare: 100,
	epic: 175,
	legendary: 300
};
```

**Step 4: Update gold drop chance**

In `src/lib/engine/stats.ts`, line 24:

```ts
// OLD: goldDropChance: 0.15,
// NEW:
goldDropChance: 0.10,
```

**Step 5: Run all tests to verify they pass**

Run: `cd /Users/hogers/Documents/repos/rogue-like-cards && bun run test`

Expected: PASS — shop tests pass with new prices, all other tests unaffected.

**Step 6: Commit**

```bash
git add src/lib/engine/shop.ts src/lib/engine/stats.ts src/lib/engine/shop.test.ts
git commit -m "feat: rebalance gold economy — higher card prices, lower drop rate"
```

---

### Task 4: Re-run Economy Simulation

**Step 1: Update simulation config to match actual values**

The simulation in Task 1 already has the proposed values hardcoded. After Tasks 2-3, the "current" config in the simulation will be outdated. Update `CURRENT` in `economy-sim.test.ts` to reflect the new live values (which are now the "proposed" ones), and rename the old values to `LEGACY`:

```ts
const LEGACY: EconomyConfig = {
	label: 'Legacy (pre-rebalance)',
	xpBase: 10,
	goldDropChance: 0.15,
	rarityPrices: { common: 10, uncommon: 20, rare: 35, epic: 60, legendary: 100 }
};

const CURRENT: EconomyConfig = {
	label: 'Current',
	xpBase: 25,
	goldDropChance: 0.1,
	rarityPrices: { common: 25, uncommon: 50, rare: 100, epic: 175, legendary: 300 }
};
```

Remove `PROPOSED` references — `CURRENT` is now the live config. Update `generateHtml` and tests to compare `LEGACY` vs `CURRENT`.

**Step 2: Run simulation**

Run: `cd /Users/hogers/Documents/repos/rogue-like-cards && bun run test -- src/lib/engine/economy-sim.test.ts`

Expected: PASS — verify the summary table and open `economy-simulation.html` to confirm graphs look correct with the new values.

**Step 3: Commit**

```bash
git add src/lib/engine/economy-sim.test.ts
git commit -m "test: update economy sim to compare legacy vs current rebalanced values"
```

---

### Task 5: Deferred Upgrade Queue — Leveling Store

**Files:**

- Modify: `src/lib/stores/leveling.svelte.ts`

**Step 1: Define the UpgradeEvent type and refactor the leveling store**

Replace the `pendingLevelUps` counter, `showLevelUp` boolean, and `showChestLoot` concept with a unified FIFO queue.

In `src/lib/stores/leveling.svelte.ts`, the full refactored file:

```ts
import type { Upgrade } from '$lib/types';
import { getRandomUpgrades, getRandomLegendaryUpgrades } from '$lib/data/upgrades';
import { getXpToNextLevel } from '$lib/engine/waves';

export interface UpgradeContext {
	luckyChance: number;
	executeChance: number;
	executeCap: number;
	poison: number;
}

export type UpgradeEventType = 'levelup' | 'chest';

export interface UpgradeEvent {
	type: UpgradeEventType;
	choices: Upgrade[];
	gold?: number;
}

export function createLeveling() {
	let xp = $state(0);
	let level = $state(1);
	let upgradeQueue = $state<UpgradeEvent[]>([]);
	let activeEvent = $state<UpgradeEvent | null>(null);
	let upgradeChoices = $state<Upgrade[]>([]);

	let xpToNextLevel = $derived(getXpToNextLevel(level));

	function addXp(amount: number) {
		xp += amount;
	}

	/**
	 * Consume all available level-ups from current XP.
	 * Pushes events to the queue instead of auto-showing a modal.
	 * Returns the number of level-ups earned.
	 */
	function checkLevelUp(ctx: UpgradeContext): number {
		const MAX_LEVELUPS = 100;
		let leveled = 0;
		for (let i = 0; i < MAX_LEVELUPS && xp >= getXpToNextLevel(level); i++) {
			xp -= getXpToNextLevel(level);
			level++;
			leveled++;
			const choices = getRandomUpgrades(
				3,
				ctx.luckyChance,
				ctx.executeChance,
				ctx.executeCap,
				ctx.poison
			);
			upgradeQueue = [...upgradeQueue, { type: 'levelup', choices }];
		}
		return leveled;
	}

	/**
	 * Queue a chest loot event.
	 */
	function queueChestLoot(wasBossChest: boolean, ctx: UpgradeContext, gold: number) {
		let choices: Upgrade[];
		if (wasBossChest) {
			choices = getRandomLegendaryUpgrades(3);
		} else {
			choices = getRandomUpgrades(
				3,
				ctx.luckyChance + 0.5,
				ctx.executeChance,
				ctx.executeCap,
				ctx.poison,
				'uncommon'
			);
		}
		upgradeQueue = [...upgradeQueue, { type: 'chest', choices, gold }];
	}

	/**
	 * Open the next upgrade event from the queue.
	 * Returns the event if one was available, null otherwise.
	 */
	function openNextUpgrade(): UpgradeEvent | null {
		if (upgradeQueue.length === 0) return null;
		const [next, ...rest] = upgradeQueue;
		upgradeQueue = rest;
		activeEvent = next;
		upgradeChoices = next.choices;
		return next;
	}

	/**
	 * Close the active upgrade event after selection.
	 * Returns true if queue is now empty.
	 */
	function closeActiveEvent(): boolean {
		activeEvent = null;
		upgradeChoices = [];
		return upgradeQueue.length === 0;
	}

	function reset() {
		xp = 0;
		level = 1;
		upgradeQueue = [];
		activeEvent = null;
		upgradeChoices = [];
	}

	function restore(data: { xp: number; level: number }) {
		xp = data.xp;
		level = data.level;
	}

	return {
		get xp() {
			return xp;
		},
		get level() {
			return level;
		},
		get xpToNextLevel() {
			return xpToNextLevel;
		},
		get pendingUpgrades() {
			return upgradeQueue.length;
		},
		get activeEvent() {
			return activeEvent;
		},
		get upgradeChoices() {
			return upgradeChoices;
		},
		get hasActiveEvent() {
			return activeEvent !== null;
		},
		get upgradeQueue() {
			return upgradeQueue;
		},
		addXp,
		checkLevelUp,
		queueChestLoot,
		openNextUpgrade,
		closeActiveEvent,
		reset,
		restore
	};
}
```

**Step 2: Run tests (expect compilation errors from gameState)**

Run: `cd /Users/hogers/Documents/repos/rogue-like-cards && bun run test`

Expected: FAIL — `gameState.svelte.ts` references removed properties (`showLevelUp`, `pendingLevelUps`, `consumeLevelUp`, `setChoicesForChest`). This is expected — we fix it in Task 6.

**Step 3: Commit (partial — will fix consumers in next tasks)**

```bash
git add src/lib/stores/leveling.svelte.ts
git commit -m "refactor: replace level-up modal auto-show with unified upgrade queue"
```

---

### Task 6: Deferred Upgrade Queue — Game State Integration

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts`

**Step 1: Update gameState to use the new leveling API**

Key changes in `gameState.svelte.ts`:

1. **Remove** `showChestLoot` and `chestGold` state variables (lines 36-37).
2. **Update `killEnemy()`** (lines 149-219):
   - Chest path: Instead of `showChestLoot = true` + pause timers, call `leveling.queueChestLoot()` and continue.
   - Level-up path: Instead of checking `leveling.checkLevelUp()` return value to pause, just call it (it queues events silently).
   - Remove all timer pause/stop calls from `killEnemy()` — pausing moves to `openNextUpgrade()`.
3. **Update `selectUpgrade()`** (lines 221-276):
   - Remove the `showChestLoot` branch — unified flow now.
   - After applying upgrade, call `leveling.closeActiveEvent()`. If queue is empty, resume timers.
4. **Add `openNextUpgrade()` action**:
   - Calls `leveling.openNextUpgrade()`.
   - If an event was opened, pause timers.
5. **Update `isModalOpen()`** to check `leveling.hasActiveEvent` instead of `showLevelUp || showChestLoot`.
6. **Update getters**: Remove `showLevelUp`, `showChestLoot`, `chestGold`, `pendingLevelUps`. Add `pendingUpgrades`, `activeEvent`, `hasActiveEvent`.
7. **Update `resetGame()`**: Remove `showChestLoot = false; chestGold = 0;`.
8. **Update `saveGame()`**: No changes needed (queue state is transient — not persisted).

The full updated `killEnemy()`:

```ts
function killEnemy() {
	if (killingEnemy) return;
	killingEnemy = true;

	try {
		enemy.recordKill();
		poisonStacks = [];

		if (enemy.isChest) {
			const goldReward = getChestGoldReward(enemy.stage, playerStats.goldMultiplier);
			gold += goldReward;
			const wasBossChest = enemy.isBossChest;
			enemy.clearChestFlags();

			leveling.queueChestLoot(wasBossChest, upgradeContext(), goldReward);
			enemy.spawnNextTarget(playerStats);
			saveGame();
			return;
		}

		enemy.advanceWave();

		const effectiveGoldPerKill = playerStats.goldPerKill + shop.getGoldPerKillBonus();
		if (shouldDropGold(playerStats.goldDropChance, Math.random)) {
			const goldReward = enemy.isBoss
				? getBossGoldReward(enemy.stage, effectiveGoldPerKill, playerStats.goldMultiplier)
				: getEnemyGoldReward(enemy.stage, effectiveGoldPerKill, playerStats.goldMultiplier);
			gold += goldReward;
			ui.addGoldDrop(goldReward);
		}

		const enemyXpMultiplier = enemy.isBoss
			? BOSS_XP_MULTIPLIER
			: enemy.isChest
				? CHEST_XP_MULTIPLIER
				: 1;
		const greedMult = getGreedMultiplier(playerStats.greed);
		const xpGain = getXpReward(
			enemy.enemyMaxHealth,
			enemy.stage,
			playerStats.xpMultiplier,
			enemyXpMultiplier,
			greedMult
		);
		leveling.addXp(xpGain);

		if (enemy.isBoss) {
			timers.stopBossTimer();
			enemy.advanceStage();
		}

		leveling.checkLevelUp(upgradeContext());

		if (!enemy.isBoss && enemy.isWaveComplete()) {
			if (enemy.shouldSpawnBossChestTarget(playerStats)) {
				enemy.spawnBossChest(playerStats.greed);
			} else {
				enemy.spawnBoss(playerStats.greed);
				timers.startBossTimer(bossTimerMax, handleBossExpired);
			}
		} else {
			enemy.spawnNextTarget(playerStats);
		}

		saveGame();
	} finally {
		killingEnemy = false;
	}
}
```

The new `openNextUpgrade()`:

```ts
function openNextUpgrade() {
	const event = leveling.openNextUpgrade();
	if (event) {
		timers.stopPoisonTick();
		timers.pauseBossTimer();
	}
}
```

The updated `selectUpgrade()`:

```ts
function selectUpgrade(upgrade: Upgrade) {
	upgrade.apply(playerStats);

	// Track unlocked upgrades for collection
	unlockedUpgrades = new Set([...unlockedUpgrades, upgrade.id]);

	// Track special effects
	const hasSpecialEffect = upgrade.stats.some(
		(s) =>
			s.label.includes('Crit') ||
			s.label.includes('XP') ||
			s.label.includes('Poison') ||
			s.label.includes('Stacks') ||
			s.label.includes('Duration') ||
			s.label.includes('Multi') ||
			s.label.includes('Execute') ||
			s.label.includes('Overkill') ||
			s.label.includes('Timer') ||
			s.label.includes('Lucky') ||
			s.label.includes('Chest') ||
			s.label.includes('Boss Chest') ||
			s.label.includes('Gold')
	);

	if (hasSpecialEffect) {
		const effectName = upgrade.title;
		if (!effects.find((e) => e.name === effectName)) {
			effects.push({
				name: effectName,
				description: upgrade.stats.map((s) => `${s.label} ${s.value}`).join(', ')
			});
		}
	}

	const allConsumed = leveling.closeActiveEvent();
	if (allConsumed) {
		// All upgrades consumed — resume game
		timers.startPoisonTick(applyPoison);
		timers.resumeBossTimer(handleBossExpired);
	}
	saveGame();
}
```

The updated `isModalOpen()`:

```ts
function isModalOpen() {
	return showGameOver || leveling.hasActiveEvent;
}
```

The updated return object — remove old getters, add new ones:

```ts
// REMOVE these getters:
// get showLevelUp()
// get showChestLoot()
// get chestGold()
// get pendingLevelUps()

// ADD these getters:
get pendingUpgrades() { return leveling.pendingUpgrades; },
get activeEvent() { return leveling.activeEvent; },
get hasActiveEvent() { return leveling.hasActiveEvent; },

// ADD action:
openNextUpgrade,
```

**Step 2: Run tests**

Run: `cd /Users/hogers/Documents/repos/rogue-like-cards && bun run test`

Expected: Engine tests PASS. App may have compilation warnings from `+page.svelte` referencing old props — that's fixed in Task 7.

**Step 3: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "refactor: integrate unified upgrade queue into game state"
```

---

### Task 7: Deferred Upgrade Queue — UI (Badge + Modal Updates)

**Files:**

- Create: `src/lib/components/UpgradeBadge.svelte`
- Modify: `src/routes/+page.svelte`

**Step 1: Create the UpgradeBadge component**

```svelte
<script lang="ts">
	type Props = {
		count: number;
		onclick: () => void;
	};

	let { count, onclick }: Props = $props();
</script>

{#if count > 0}
	<button class="upgrade-badge" {onclick}>
		<span class="badge-icon">⬆</span>
		<span class="badge-text">{count}</span>
	</button>
{/if}

<style>
	.upgrade-badge {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 12px;
		background: linear-gradient(135deg, #8b5cf6, #a78bfa);
		border: 2px solid #a78bfa;
		border-radius: 20px;
		color: white;
		font-weight: bold;
		font-size: 0.9rem;
		cursor: pointer;
		animation: pulse-badge 1s ease-in-out infinite;
		transition:
			transform 0.15s,
			box-shadow 0.15s;
		box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
	}

	.upgrade-badge:hover {
		transform: scale(1.08);
		box-shadow: 0 0 20px rgba(139, 92, 246, 0.7);
	}

	.upgrade-badge:active {
		transform: scale(0.95);
	}

	.badge-icon {
		font-size: 0.85rem;
	}

	@keyframes pulse-badge {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.05);
		}
	}
</style>
```

**Step 2: Update +page.svelte**

Key changes:

1. Import `UpgradeBadge`
2. Add badge in the level bar area
3. Replace `LevelUpModal` and `ChestLootModal` with a single conditional block driven by `gameState.activeEvent`

Replace imports (add UpgradeBadge, keep both modals since they have different styling):

```svelte
import UpgradeBadge from '$lib/components/UpgradeBadge.svelte';
```

In the level bar section (around line 61), add the badge after the XP text:

```svelte
<!-- Level Bar - Full Width -->
<div class="level-bar">
	<span class="level-label">Level {gameState.level}</span>
	{#key gameState.level}
		<div class="xp-bar">
			<div class="xp-fill" style:width="{(gameState.xp / gameState.xpToNextLevel) * 100}%"></div>
		</div>
	{/key}
	<span class="xp-text"
		>{formatNumber(gameState.xp)}/{formatNumber(gameState.xpToNextLevel)} XP</span
	>
	<UpgradeBadge count={gameState.pendingUpgrades} onclick={gameState.openNextUpgrade} />
</div>
```

Replace the old `LevelUpModal` and `ChestLootModal` blocks (lines 90-125) with:

```svelte
{#if gameState.activeEvent?.type === 'levelup'}
	<LevelUpModal
		show={true}
		choices={gameState.upgradeChoices}
		pendingCount={gameState.pendingUpgrades + 1}
		onSelect={gameState.selectUpgrade}
	/>
{:else if gameState.activeEvent?.type === 'chest'}
	<ChestLootModal
		show={true}
		gold={gameState.activeEvent.gold ?? 0}
		choices={gameState.upgradeChoices}
		onSelect={gameState.selectUpgrade}
	/>
{/if}
```

**Step 3: Verify in browser**

Run: `cd /Users/hogers/Documents/repos/rogue-like-cards && bun run dev`

Test manually:

- Kill enemies — badge appears with count when level-up earned
- Badge shows correct count, clicking it opens the level-up modal
- Game pauses only when modal opens
- Kill a chest — badge increments, clicking shows chest loot modal
- After picking all upgrades, game resumes

**Step 4: Commit**

```bash
git add src/lib/components/UpgradeBadge.svelte src/routes/+page.svelte
git commit -m "feat: add deferred upgrade badge — player controls when to level up"
```

---

### Task 8: Bug Fix — Chest Icon

**Files:**

- Modify: `src/lib/components/BattleArea.svelte:5`

**Step 1: Update chest sprite import**

In `src/lib/components/BattleArea.svelte`, line 5:

```ts
// OLD: import chestSprite from '$lib/assets/images/chest.png';
// NEW:
import chestSprite from '$lib/assets/images/chest-closed.png';
```

**Step 2: Verify in browser**

Run: `cd /Users/hogers/Documents/repos/rogue-like-cards && bun run dev`

Verify: When a chest spawns, it shows the closed chest image.

**Step 3: Commit**

```bash
git add src/lib/components/BattleArea.svelte
git commit -m "fix: show closed chest sprite during combat instead of open chest"
```

---

### Task 9: Changelog Entry

**Files:**

- Modify: `src/lib/changelog.ts:14-25`

**Step 1: Add new changelog entry**

Add a new entry at the top of the `CHANGELOG` array (before the existing `0.24.0` entry). Use `0.25.0` as the version:

```ts
{
    version: '0.25.0',
    date: '2026-01-30',
    changes: [
        { category: 'changed', description: 'Rebalanced early XP curve to provide more gradual progression in early stages' },
        { category: 'new', description: 'Added deferred upgrade system — level-ups and chest loot queue as a badge instead of auto-opening' },
        { category: 'changed', description: 'Rebalanced gold economy with higher card prices and adjusted drop rates' },
        { category: 'fixed', description: 'Fixed chest enemy showing open chest image instead of closed' }
    ]
},
```

**Step 2: Commit**

```bash
git add src/lib/changelog.ts
git commit -m "docs: add changelog entries for economy rebalance and deferred upgrades"
```

---

### Task 10: Final Verification

**Step 1: Run all tests**

Run: `cd /Users/hogers/Documents/repos/rogue-like-cards && bun run test`

Expected: ALL PASS

**Step 2: Run the economy simulation and open the report**

Run: `cd /Users/hogers/Documents/repos/rogue-like-cards && bun run test -- src/lib/engine/economy-sim.test.ts && open economy-simulation.html`

Review graphs one final time.

**Step 3: Manual playtest in browser**

Run: `cd /Users/hogers/Documents/repos/rogue-like-cards && bun run dev`

Verify:

- Stage 1 gives ~2 level-ups (not 5+)
- Badge appears and counts pending upgrades
- Clicking badge opens modal and pauses game
- Chest shows closed image, clicking chest badge shows loot modal
- Gold feels more scarce, shop prices are meaningful
- Game resumes after all upgrades picked
