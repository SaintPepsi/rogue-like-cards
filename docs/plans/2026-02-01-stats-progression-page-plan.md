# Stats Progression Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use coca-wits:executing-plans to implement this plan task-by-task.

**Goal:** Build a dev-only `/stats` page for visualizing game balance through stat progression charts, with Live Run recording and a Balance Simulator.

**Architecture:** Engine-first approach — new derived-value functions (`computeEffectiveDps`, `computePoisonDps`) live in the engine, called by both game UI and stats page. A `runHistory` store records snapshots during gameplay. The simulator drives a loop over real engine functions with zero formulas of its own. Chart.js renders all visualizations using the same dark theme as the existing economy-simulation page.

**Tech Stack:** SvelteKit (Svelte 5 runes), Chart.js 4.x (already installed), TypeScript

---

## Task 1: Add `computeEffectiveDps` and `computePoisonDps` to the engine

**Depends on:** None

**Files:**

- Create: `src/lib/engine/dps.ts`
- Create: `src/lib/engine/dps.test.ts`

These are new engine functions the game itself can also use for tooltips/UI. They must be the single source of truth for DPS calculations — the stats page and simulator call these, never roll their own math.

**Step 1: Write the failing tests**

```ts
// src/lib/engine/dps.test.ts
import { describe, it, expect } from 'vitest';
import { computeEffectiveDps, computePoisonDps } from './dps';
import { createDefaultStats } from './stats';
import type { PlayerStats } from '$lib/types';

describe('computeEffectiveDps', () => {
	it('returns base DPS with default stats', () => {
		const stats = createDefaultStats();
		// damage(1) × attackSpeed(0.8) × critExpected(1 + 0×(1.5-1)) × (1 + multiStrike(0)) × damageMultiplier(1)
		// = 1 × 0.8 × 1 × 1 × 1 = 0.8
		expect(computeEffectiveDps(stats)).toBeCloseTo(0.8);
	});

	it('accounts for crit chance and multiplier', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			damage: 10,
			critChance: 0.5,
			critMultiplier: 2.0,
			attackSpeed: 1.0
		};
		// 10 × 1.0 × (1 + 0.5 × (2.0 - 1)) × 1 × 1 = 10 × 1.5 = 15
		expect(computeEffectiveDps(stats)).toBeCloseTo(15);
	});

	it('accounts for multiStrike', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			damage: 10,
			attackSpeed: 1.0,
			multiStrike: 2
		};
		// 10 × 1.0 × 1 × (1 + 2) × 1 = 30
		expect(computeEffectiveDps(stats)).toBeCloseTo(30);
	});

	it('accounts for damageMultiplier', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			damage: 10,
			attackSpeed: 1.0,
			damageMultiplier: 1.5
		};
		// 10 × 1.0 × 1 × 1 × 1.5 = 15
		expect(computeEffectiveDps(stats)).toBeCloseTo(15);
	});
});

describe('computePoisonDps', () => {
	it('returns 0 with no poison', () => {
		const stats = createDefaultStats();
		expect(computePoisonDps(stats)).toBe(0);
	});

	it('computes poison × maxStacks assuming full stacks', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			poison: 5,
			poisonMaxStacks: 10
		};
		// 5 × 10 = 50
		expect(computePoisonDps(stats)).toBe(50);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/engine/dps.test.ts`
Expected: FAIL — module `./dps` does not exist

**Step 3: Write minimal implementation**

```ts
// src/lib/engine/dps.ts
import type { PlayerStats } from '$lib/types';

// DECISION: Effective DPS = damage × attackSpeed × critExpectedValue × (1 + multiStrike) × damageMultiplier
// Why: This is the expected damage per second assuming uniform crit distribution.
// The game's actual combat uses the pipeline (systemPipeline.ts) which rolls crits per-hit,
// but for balance visualization we want the statistical expectation.
export function computeEffectiveDps(stats: PlayerStats): number {
	const critExpectedValue = 1 + stats.critChance * (stats.critMultiplier - 1);
	return (
		stats.damage *
		stats.attackSpeed *
		critExpectedValue *
		(1 + stats.multiStrike) *
		stats.damageMultiplier
	);
}

// DECISION: Poison DPS = poison per stack × max stacks (assumes full stacks applied).
// Why: Worst-case sustained poison damage — useful for balance charts.
// Actual poison damage depends on attack timing and stack application rate,
// but full-stacks is the relevant equilibrium for balance analysis.
export function computePoisonDps(stats: PlayerStats): number {
	return stats.poison * stats.poisonMaxStacks;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/engine/dps.test.ts`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/lib/engine/dps.ts src/lib/engine/dps.test.ts
git commit -m "feat: add computeEffectiveDps and computePoisonDps engine functions"
```

---

## Task 2: Create the `runHistory` snapshot store

**Depends on:** Task 1

**Files:**

- Create: `src/lib/stores/runHistory.svelte.ts`
- Create: `src/lib/stores/runHistory.svelte.test.ts`

This store records stat snapshots during gameplay. It resets on new runs and exposes a `snapshots` array for chart consumption. All derived fields (DPS, enemy HP, etc.) are computed by calling real engine functions — no formulas in the store.

**Step 1: Write the failing tests**

```ts
// src/lib/stores/runHistory.svelte.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createRunHistory } from './runHistory.svelte';
import { createDefaultStats } from '$lib/engine/stats';

describe('runHistory', () => {
	let history: ReturnType<typeof createRunHistory>;

	beforeEach(() => {
		history = createRunHistory();
	});

	it('starts with empty snapshots', () => {
		expect(history.snapshots).toEqual([]);
	});

	it('adds a stage_transition snapshot with derived fields', () => {
		const stats = createDefaultStats();
		history.addSnapshot({
			event: 'stage_transition',
			stats,
			stage: 1,
			level: 1,
			upgradesPicked: []
		});
		expect(history.snapshots).toHaveLength(1);
		const snap = history.snapshots[0];
		expect(snap.event).toBe('stage_transition');
		expect(snap.stage).toBe(1);
		expect(snap.level).toBe(1);
		expect(snap.computedDps).toBeCloseTo(0.8); // default DPS
		expect(snap.poisonDps).toBe(0);
		expect(snap.enemyHp).toBeGreaterThan(0);
		expect(snap.bossHp).toBeGreaterThan(0);
		expect(snap.xpToNextLevel).toBeGreaterThan(0);
		expect(snap.timeToKill).toBeGreaterThan(0);
	});

	it('adds a level_up snapshot', () => {
		const stats = { ...createDefaultStats(), damage: 5 };
		history.addSnapshot({
			event: 'level_up',
			stats,
			stage: 2,
			level: 3,
			upgradesPicked: ['damage_1']
		});
		expect(history.snapshots).toHaveLength(1);
		expect(history.snapshots[0].event).toBe('level_up');
		expect(history.snapshots[0].upgradesPicked).toEqual(['damage_1']);
	});

	it('resets snapshots', () => {
		const stats = createDefaultStats();
		history.addSnapshot({
			event: 'stage_transition',
			stats,
			stage: 1,
			level: 1,
			upgradesPicked: []
		});
		expect(history.snapshots).toHaveLength(1);
		history.reset();
		expect(history.snapshots).toEqual([]);
	});

	it('records timestamp relative to run start', () => {
		const stats = createDefaultStats();
		history.addSnapshot({
			event: 'stage_transition',
			stats,
			stage: 1,
			level: 1,
			upgradesPicked: []
		});
		expect(history.snapshots[0].timestamp).toBeGreaterThanOrEqual(0);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/stores/runHistory.svelte.test.ts`
Expected: FAIL — module does not exist

**Step 3: Write the implementation**

```ts
// src/lib/stores/runHistory.svelte.ts
import type { PlayerStats } from '$lib/types';
import { computeEffectiveDps, computePoisonDps } from '$lib/engine/dps';
import { getEnemyHealth, getBossHealth, getXpToNextLevel } from '$lib/engine/waves';

export type SnapshotEvent = 'stage_transition' | 'level_up';

export type StatSnapshot = {
	event: SnapshotEvent;
	stage: number;
	level: number;
	stats: PlayerStats;
	computedDps: number;
	poisonDps: number;
	timeToKill: number;
	enemyHp: number;
	bossHp: number;
	xpToNextLevel: number;
	upgradesPicked: string[];
	timestamp: number;
};

type AddSnapshotParams = {
	event: SnapshotEvent;
	stats: PlayerStats;
	stage: number;
	level: number;
	upgradesPicked: string[];
};

export function createRunHistory() {
	let snapshots = $state<StatSnapshot[]>([]);
	let runStartTime = $state(Date.now());

	function addSnapshot(params: AddSnapshotParams): void {
		const { event, stats, stage, level, upgradesPicked } = params;

		// All derived values computed from real engine functions — no formulas here
		const dps = computeEffectiveDps(stats);
		const poisonDps = computePoisonDps(stats);
		const enemyHp = getEnemyHealth(stage, stats.greed);
		const bossHp = getBossHealth(stage, stats.greed);
		const xpToNext = getXpToNextLevel(level);
		const timeToKill = dps > 0 ? enemyHp / dps : Infinity;

		snapshots = [
			...snapshots,
			{
				event,
				stage,
				level,
				stats: { ...stats },
				computedDps: dps,
				poisonDps,
				timeToKill,
				enemyHp,
				bossHp,
				xpToNextLevel: xpToNext,
				upgradesPicked: [...upgradesPicked],
				timestamp: Date.now() - runStartTime
			}
		];
	}

	function reset(): void {
		snapshots = [];
		runStartTime = Date.now();
	}

	return {
		get snapshots() {
			return snapshots;
		},
		addSnapshot,
		reset
	};
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/stores/runHistory.svelte.test.ts`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/lib/stores/runHistory.svelte.ts src/lib/stores/runHistory.svelte.test.ts
git commit -m "feat: add runHistory snapshot store for stats progression tracking"
```

---

## Task 3: Integrate snapshot recording into gameState

**Depends on:** Task 2

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts`

Wire `runHistory.addSnapshot()` calls at the two trigger points: stage transitions (line 265) and upgrade selection (line 288). Reset history on new run. All snapshot recording is gated behind `import.meta.env.DEV` so it's tree-shaken from production builds.

**Step 1: Add the runHistory import and instantiation**

At the top of `gameState.svelte.ts`, add the import alongside other store imports (near line 23):

```ts
import { createRunHistory } from './runHistory.svelte';
```

Inside `createGameState()`, after the existing store creations (after line 60, near the leveling creation). Create the store only in dev — use a no-op stub in production so call sites don't need conditionals:

```ts
const runHistory = import.meta.env.DEV
	? createRunHistory()
	: { snapshots: [] as StatSnapshot[], addSnapshot() {}, reset() {} };
```

You'll need the type import too — add near the top with other imports:

```ts
import type { StatSnapshot } from './runHistory.svelte';
```

**Step 2: Add snapshot on stage transition**

In the enemy kill handler, after `enemy.advanceStage()` (line 265), add:

```ts
enemy.advanceStage();
runHistory.addSnapshot({
	event: 'stage_transition',
	stats: getEffectiveStats(),
	stage: enemy.stage,
	level: leveling.level,
	upgradesPicked: [...statPipeline.acquiredUpgradeIds]
});
```

Because `runHistory` is a no-op stub in production, Vite's dead-code elimination removes the `createRunHistory` import and the snapshot store entirely from the production bundle. The `addSnapshot()` calls remain as empty function calls which the JS engine will inline away.

**Step 3: Add snapshot on upgrade selection**

In `selectUpgrade()`, after `statPipeline.acquireUpgrade(upgrade.id)` (line 288), add:

```ts
statPipeline.acquireUpgrade(upgrade.id);
runHistory.addSnapshot({
	event: 'level_up',
	stats: getEffectiveStats(),
	stage: enemy.stage,
	level: leveling.level,
	upgradesPicked: [...statPipeline.acquiredUpgradeIds]
});
```

**Step 4: Reset history on new run**

In `resetGame()` (find it in the file — it resets enemy, leveling, etc.), add `runHistory.reset()` alongside the other resets.

**Step 5: Expose runHistory on the return object**

In the return statement (near line 460), add:

```ts
		get runSnapshots() {
			return runHistory.snapshots;
		},
		resetRunHistory: () => runHistory.reset(),
```

**Step 6: Verify the game still runs**

Run: `npm run dev` — load the game, start a run, kill enemies, advance a stage, pick an upgrade. No errors in console.

**Step 7: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: integrate runHistory snapshot recording into gameState"
```

---

## Task 4: Build the simulator engine

**Depends on:** Task 1

**Files:**

- Create: `src/lib/engine/simulator.ts`
- Create: `src/lib/engine/simulator.test.ts`

A thin loop that drives real engine functions — zero formulas of its own. The design doc pseudocode references `applyUpgrade()` but the real codebase applies upgrades via `statPipeline.acquireUpgrade()` which uses internal Svelte state. For the simulator (which runs outside a component context), we need a pure function that applies upgrade modifiers to a plain `PlayerStats` object.

**Step 1: Write the failing tests**

```ts
// src/lib/engine/simulator.test.ts
import { describe, it, expect } from 'vitest';
import { simulateBuild, applyUpgradeToStats, type BuildStep } from './simulator';
import { createDefaultStats, BASE_STATS } from './stats';
import { createStatPipeline } from '$lib/stores/statPipeline.svelte';
import { allUpgrades } from '$lib/data/upgrades';

describe('applyUpgradeToStats drift detection', () => {
	// DECISION: This test catches drift between the simulator's pure applyUpgradeToStats
	// and the real statPipeline.acquireUpgrade(). If statPipeline gains new modifier types
	// (multiply, conditional, etc.) that applyUpgradeToStats doesn't handle, this fails.
	it('matches statPipeline output for same upgrades', () => {
		// Test a representative sample of upgrades across different stat types
		const testUpgradeIds = allUpgrades
			.filter((u) => u.modifiers.length > 0)
			.slice(0, 15)
			.map((u) => u.id);

		// Apply via simulator's pure function
		let simulatorStats = createDefaultStats();
		for (const id of testUpgradeIds) {
			simulatorStats = applyUpgradeToStats(simulatorStats, id);
		}

		// Apply via real statPipeline
		const pipeline = createStatPipeline();
		for (const id of testUpgradeIds) {
			pipeline.acquireUpgrade(id);
		}

		// Compare every numeric stat
		for (const key of Object.keys(BASE_STATS) as (keyof typeof BASE_STATS)[]) {
			const pipelineValue = pipeline.get(key);
			const simulatorValue = simulatorStats[key];
			if (typeof simulatorValue === 'number') {
				expect(simulatorValue, `stat "${key}" drifted`).toBeCloseTo(pipelineValue as number);
			}
		}
	});
});

describe('simulateBuild', () => {
	it('returns one snapshot per stage with no upgrades', () => {
		const snapshots = simulateBuild([], 5);
		expect(snapshots).toHaveLength(5);
		expect(snapshots[0].stage).toBe(1);
		expect(snapshots[4].stage).toBe(5);
	});

	it('has increasing enemy HP across stages', () => {
		const snapshots = simulateBuild([], 10);
		for (let i = 1; i < snapshots.length; i++) {
			expect(snapshots[i].enemyHp).toBeGreaterThan(snapshots[i - 1].enemyHp);
		}
	});

	it('applies upgrades at the correct stage', () => {
		const plan: BuildStep[] = [{ level: 3, upgradeId: 'damage_1' }];
		const snapshots = simulateBuild(plan, 5);
		// Stage 2 should have default damage DPS, stage 3 should be higher
		expect(snapshots[2].computedDps).toBeGreaterThan(snapshots[1].computedDps);
		// Stage 1 and 2 should have same DPS (no upgrades yet)
		expect(snapshots[0].computedDps).toBeCloseTo(snapshots[1].computedDps);
	});

	it('computes timeToKill as enemyHp / dps', () => {
		const snapshots = simulateBuild([], 3);
		for (const snap of snapshots) {
			expect(snap.timeToKill).toBeCloseTo(snap.enemyHp / snap.computedDps);
		}
	});

	it('accumulates multiple upgrades', () => {
		const plan: BuildStep[] = [
			{ level: 1, upgradeId: 'damage_1' },
			{ level: 2, upgradeId: 'damage_2' },
			{ level: 3, upgradeId: 'damage_3' }
		];
		const snapshots = simulateBuild(plan, 3);
		// Each stage should have higher DPS than the last
		expect(snapshots[1].computedDps).toBeGreaterThan(snapshots[0].computedDps);
		expect(snapshots[2].computedDps).toBeGreaterThan(snapshots[1].computedDps);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/engine/simulator.test.ts`
Expected: FAIL — module does not exist

**Step 3: Write the implementation**

```ts
// src/lib/engine/simulator.ts

// DECISION: Simulator must NEVER contain its own stat/damage/wave formulas.
// It calls the real engine functions (applyUpgrade via modifier application,
// getEnemyHealth, getBossHealth, computeEffectiveDps, etc.)
// so that balance changes automatically propagate to the visualization.
// If you need a new derived value here, add it to the engine first, then call it.

import type { PlayerStats } from '$lib/types';
import { createDefaultStats } from './stats';
import { computeEffectiveDps, computePoisonDps } from './dps';
import { getEnemyHealth, getBossHealth, getXpToNextLevel } from './waves';
import { getUpgradeById } from '$lib/data/upgrades';
import type { StatSnapshot, SnapshotEvent } from '$lib/stores/runHistory.svelte';

export type BuildStep = { level: number; upgradeId: string };
export type BuildPlan = BuildStep[];

// DECISION: Pure function that applies upgrade modifiers to a plain PlayerStats object.
// Why: The real statPipeline uses Svelte $state internally and can't run outside component context.
// This replicates the additive modifier logic from statPipeline.rebuildLayer() without duplicating
// any damage/scaling formulas. Only the "apply stat modifier" operation is reproduced here.
// COUPLING: If statPipeline.rebuildLayer() ever gains non-additive modifier types (multiply,
// conditional, etc.), this function must be updated to match. The drift-detection test in
// simulator.test.ts ("matches statPipeline output for same upgrades") will catch this.
export function applyUpgradeToStats(stats: PlayerStats, upgradeId: string): PlayerStats {
	const upgrade = getUpgradeById(upgradeId);
	if (!upgrade) return stats;

	const result = { ...stats };
	for (const mod of upgrade.modifiers) {
		(result[mod.stat] as number) += mod.value;
	}
	return result;
}

export function simulateBuild(plan: BuildPlan, maxStage: number): StatSnapshot[] {
	let stats = createDefaultStats();
	const snapshots: StatSnapshot[] = [];
	const upgradesPicked: string[] = [];

	for (let stage = 1; stage <= maxStage; stage++) {
		// Apply upgrades scheduled for this stage using real upgrade data
		const stageUpgrades = plan.filter((s) => s.level === stage);
		for (const step of stageUpgrades) {
			stats = applyUpgradeToStats(stats, step.upgradeId);
			upgradesPicked.push(step.upgradeId);
		}

		// Compute ALL derived values from real engine functions
		const dps = computeEffectiveDps(stats);
		const poisonDps = computePoisonDps(stats);
		const enemyHp = getEnemyHealth(stage, stats.greed);
		const bossHp = getBossHealth(stage, stats.greed);
		const xpToNext = getXpToNextLevel(stage);

		snapshots.push({
			event: 'stage_transition' as SnapshotEvent,
			stage,
			level: stage, // In simulator, level tracks with stage
			stats: { ...stats },
			computedDps: dps,
			poisonDps,
			enemyHp,
			bossHp,
			timeToKill: dps > 0 ? enemyHp / dps : Infinity,
			xpToNextLevel: xpToNext,
			upgradesPicked: [...upgradesPicked],
			timestamp: 0
		});
	}
	return snapshots;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/engine/simulator.test.ts`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/lib/engine/simulator.ts src/lib/engine/simulator.test.ts
git commit -m "feat: add simulator engine that drives real engine functions"
```

---

## Task 5: Build the `StatChart` and `StatGroup` shared components

**Depends on:** None

**Files:**

- Create: `src/lib/components/stats/StatChart.svelte`
- Create: `src/lib/components/stats/StatGroup.svelte`

These are pure presentation components. Match the economy-simulation page styling.

**Step 1: Create `StatGroup.svelte`**

```svelte
<!-- src/lib/components/stats/StatGroup.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		expanded = false,
		children
	}: { title: string; expanded?: boolean; children: Snippet } = $props();

	let isExpanded = $state(expanded);
</script>

<div class="stat-group">
	<button class="group-header" onclick={() => (isExpanded = !isExpanded)}>
		<span class="group-title">{title}</span>
		<span class="chevron" class:rotated={isExpanded}>▶</span>
	</button>
	{#if isExpanded}
		<div class="group-content">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.stat-group {
		margin-bottom: 16px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		overflow: hidden;
	}
	.group-header {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background: rgba(255, 255, 255, 0.05);
		border: none;
		color: white;
		cursor: pointer;
		font-size: 1.1rem;
		font-weight: 600;
	}
	.group-header:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	.chevron {
		transition: transform 0.2s;
		font-size: 0.8rem;
	}
	.chevron.rotated {
		transform: rotate(90deg);
	}
	.group-content {
		padding: 16px;
	}
</style>
```

**Step 2: Create `StatChart.svelte`**

```svelte
<!-- src/lib/components/stats/StatChart.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';

	type ChartDataset = {
		label: string;
		data: number[];
		borderColor: string;
		backgroundColor?: string;
		stepped?: boolean | string;
		fill?: boolean;
		yAxisID?: string;
	};

	let {
		title,
		datasets,
		labels,
		logScale = false,
		dualAxis = false
	}: {
		title: string;
		datasets: ChartDataset[];
		labels: number[];
		logScale?: boolean;
		dualAxis?: boolean;
	} = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let chartInstance: { destroy: () => void } | undefined;

	onMount(async () => {
		const { Chart, registerables } = await import('chart.js');
		Chart.register(...registerables);

		if (!canvas) return;

		const scales: Record<string, object> = {
			x: {
				ticks: { color: 'white' },
				grid: { color: 'rgba(255,255,255,0.1)' },
				title: { display: true, text: 'Stage', color: 'white' }
			},
			y: {
				type: logScale ? 'logarithmic' : 'linear',
				ticks: { color: 'white' },
				grid: { color: 'rgba(255,255,255,0.1)' },
				position: 'left'
			}
		};

		if (dualAxis) {
			scales.y1 = {
				type: logScale ? 'logarithmic' : 'linear',
				ticks: { color: 'white' },
				grid: { drawOnChartArea: false },
				position: 'right'
			};
		}

		chartInstance = new Chart(canvas, {
			type: 'line',
			data: {
				labels,
				datasets: datasets.map((ds) => ({
					...ds,
					tension: 0.3,
					pointRadius: 2,
					borderWidth: 2,
					fill: ds.fill ?? false
				}))
			},
			options: {
				responsive: true,
				plugins: {
					title: { display: true, text: title, color: 'white', font: { size: 14 } },
					legend: { labels: { color: 'white' } }
				},
				scales
			}
		});

		return () => {
			chartInstance?.destroy();
		};
	});
</script>

<div class="chart-container">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.chart-container {
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		padding: 12px;
		margin-bottom: 12px;
	}
</style>
```

**Step 3: Verify components compile**

Run: `npm run check` (svelte-check)
Expected: No type errors in the new files

**Step 4: Commit**

```bash
git add src/lib/components/stats/StatChart.svelte src/lib/components/stats/StatGroup.svelte
git commit -m "feat: add StatChart and StatGroup shared components"
```

---

## Task 6: Build the stats page route with tab toggle

**Depends on:** Task 5

**Files:**

- Create: `src/routes/stats/+page.svelte`

The page shell: dev gate, tab toggle between Live Run and Simulator views. Initially renders placeholder text for each tab — the real views are wired in Tasks 7 and 8.

**Step 1: Create the page**

```svelte
<!-- src/routes/stats/+page.svelte -->
<script lang="ts">
	import LiveRunView from '$lib/components/stats/LiveRunView.svelte';
	import SimulatorView from '$lib/components/stats/SimulatorView.svelte';

	let activeTab: 'live' | 'simulator' = $state('live');
</script>

{#if !import.meta.env.DEV}
	<p style="color: white; text-align: center; padding: 2rem;">Not available in production.</p>
{:else}
	<div class="stats-page">
		<h1>Stats Progression</h1>
		<div class="tabs">
			<button class:active={activeTab === 'live'} onclick={() => (activeTab = 'live')}>
				Live Run
			</button>
			<button class:active={activeTab === 'simulator'} onclick={() => (activeTab = 'simulator')}>
				Simulator
			</button>
		</div>
		{#if activeTab === 'live'}
			<LiveRunView />
		{:else}
			<SimulatorView />
		{/if}
	</div>
{/if}

<style>
	.stats-page {
		background: #1a1a2e;
		color: white;
		min-height: 100vh;
		padding: 24px;
		font-family: system-ui, sans-serif;
	}
	h1 {
		margin: 0 0 16px;
		font-size: 1.5rem;
	}
	.tabs {
		display: flex;
		gap: 8px;
		margin-bottom: 24px;
	}
	.tabs button {
		padding: 8px 20px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		background: transparent;
		color: white;
		cursor: pointer;
		font-size: 0.9rem;
	}
	.tabs button.active {
		background: rgba(139, 92, 246, 0.3);
		border-color: #8b5cf6;
	}
	.tabs button:hover {
		background: rgba(255, 255, 255, 0.1);
	}
</style>
```

**Step 2: Verify the page loads**

Run: `npm run dev` — navigate to `http://localhost:5173/stats`
Expected: Page renders with title, two tabs, no errors. Tabs toggle (content will be placeholders until Tasks 7-8).

**Step 3: Commit**

```bash
git add src/routes/stats/+page.svelte
git commit -m "feat: add /stats route with dev gate and tab toggle"
```

---

## Task 7: Build the Live Run View

**Depends on:** Tasks 3, 5, 6

**Files:**

- Create: `src/lib/components/stats/LiveRunView.svelte`

Displays recorded snapshots from `gameState.runSnapshots` as grouped accordion charts. Uses `StatGroup` and `StatChart` components. Shows empty state when no snapshots exist.

**Step 1: Create LiveRunView**

```svelte
<!-- src/lib/components/stats/LiveRunView.svelte -->
<script lang="ts">
	import { gameState } from '$lib/stores/gameState.svelte';
	import StatGroup from './StatGroup.svelte';
	import StatChart from './StatChart.svelte';
	import type { StatSnapshot } from '$lib/stores/runHistory.svelte';

	const snapshots: StatSnapshot[] = $derived(gameState.runSnapshots);
	const stageSnapshots: StatSnapshot[] = $derived(
		snapshots.filter((s) => s.event === 'stage_transition')
	);

	const labels: number[] = $derived(stageSnapshots.map((s) => s.stage));

	// Chart dataset color palette
	const COLORS = {
		damage: '#ef4444',
		critChance: '#f59e0b',
		critMultiplier: '#f97316',
		attackSpeed: '#22d3ee',
		multiStrike: '#a855f7',
		dps: '#8b5cf6',
		poison: '#22c55e',
		poisonStacks: '#16a34a',
		poisonDuration: '#86efac',
		poisonDps: '#15803d',
		execute: '#dc2626',
		executeCap: '#991b1b',
		damageMult: '#fb923c',
		xpMult: '#38bdf8',
		goldPerKill: '#fbbf24',
		goldDrop: '#d97706',
		goldMult: '#f59e0b',
		enemyHp: '#ef4444',
		bossHp: '#dc2626',
		xpToNext: '#818cf8',
		ttk: '#f472b6'
	};
</script>

{#if stageSnapshots.length === 0}
	<p class="empty">Start a run to see progression data.</p>
{:else}
	<StatGroup title="Offensive Stats" expanded={true}>
		<StatChart
			title="Offensive Stats"
			{labels}
			datasets={[
				{
					label: 'Base Damage',
					data: stageSnapshots.map((s) => s.stats.damage),
					borderColor: COLORS.damage
				},
				{
					label: 'Crit Chance %',
					data: stageSnapshots.map((s) => s.stats.critChance * 100),
					borderColor: COLORS.critChance
				},
				{
					label: 'Crit Multiplier',
					data: stageSnapshots.map((s) => s.stats.critMultiplier),
					borderColor: COLORS.critMultiplier
				},
				{
					label: 'Attack Speed',
					data: stageSnapshots.map((s) => s.stats.attackSpeed),
					borderColor: COLORS.attackSpeed
				},
				{
					label: 'Multi-Strike',
					data: stageSnapshots.map((s) => s.stats.multiStrike),
					borderColor: COLORS.multiStrike,
					stepped: 'before'
				},
				{
					label: 'Effective DPS',
					data: stageSnapshots.map((s) => s.computedDps),
					borderColor: COLORS.dps
				}
			]}
		/>
	</StatGroup>

	<StatGroup title="Poison Stats">
		<StatChart
			title="Poison Stats"
			{labels}
			datasets={[
				{
					label: 'Poison/Stack',
					data: stageSnapshots.map((s) => s.stats.poison),
					borderColor: COLORS.poison
				},
				{
					label: 'Max Stacks',
					data: stageSnapshots.map((s) => s.stats.poisonMaxStacks),
					borderColor: COLORS.poisonStacks,
					stepped: 'before'
				},
				{
					label: 'Duration (s)',
					data: stageSnapshots.map((s) => s.stats.poisonDuration),
					borderColor: COLORS.poisonDuration
				},
				{
					label: 'Poison DPS',
					data: stageSnapshots.map((s) => s.poisonDps),
					borderColor: COLORS.poisonDps
				}
			]}
		/>
	</StatGroup>

	<StatGroup title="Execute & Multipliers">
		<StatChart
			title="Execute & Multipliers"
			{labels}
			datasets={[
				{
					label: 'Execute Chance %',
					data: stageSnapshots.map((s) => s.stats.executeChance * 100),
					borderColor: COLORS.execute
				},
				{
					label: 'Execute Cap %',
					data: stageSnapshots.map((s) => s.stats.executeCap * 100),
					borderColor: COLORS.executeCap
				},
				{
					label: 'Damage Multiplier',
					data: stageSnapshots.map((s) => s.stats.damageMultiplier),
					borderColor: COLORS.damageMult
				},
				{
					label: 'XP Multiplier',
					data: stageSnapshots.map((s) => s.stats.xpMultiplier),
					borderColor: COLORS.xpMult
				}
			]}
		/>
	</StatGroup>

	<StatGroup title="Economy">
		<StatChart
			title="Economy"
			{labels}
			datasets={[
				{
					label: 'Gold/Kill',
					data: stageSnapshots.map((s) => s.stats.goldPerKill),
					borderColor: COLORS.goldPerKill
				},
				{
					label: 'Gold Drop %',
					data: stageSnapshots.map((s) => s.stats.goldDropChance * 100),
					borderColor: COLORS.goldDrop
				},
				{
					label: 'Gold Multiplier',
					data: stageSnapshots.map((s) => s.stats.goldMultiplier),
					borderColor: COLORS.goldMult
				}
			]}
		/>
	</StatGroup>

	<StatGroup title="Enemy Scaling">
		<StatChart
			title="Enemy Scaling"
			{labels}
			logScale={true}
			datasets={[
				{
					label: 'Enemy HP',
					data: stageSnapshots.map((s) => s.enemyHp),
					borderColor: COLORS.enemyHp
				},
				{ label: 'Boss HP', data: stageSnapshots.map((s) => s.bossHp), borderColor: COLORS.bossHp },
				{
					label: 'XP to Next Level',
					data: stageSnapshots.map((s) => s.xpToNextLevel),
					borderColor: COLORS.xpToNext
				}
			]}
		/>
	</StatGroup>

	<StatGroup title="Composite Views">
		<StatChart
			title="Player DPS vs Enemy HP"
			{labels}
			dualAxis={true}
			datasets={[
				{
					label: 'Effective DPS',
					data: stageSnapshots.map((s) => s.computedDps),
					borderColor: COLORS.dps,
					yAxisID: 'y'
				},
				{
					label: 'Enemy HP',
					data: stageSnapshots.map((s) => s.enemyHp),
					borderColor: COLORS.enemyHp,
					yAxisID: 'y1'
				}
			]}
		/>
		<StatChart
			title="Time-to-Kill (seconds)"
			{labels}
			datasets={[
				{ label: 'TTK', data: stageSnapshots.map((s) => s.timeToKill), borderColor: COLORS.ttk }
			]}
		/>
	</StatGroup>
{/if}

<style>
	.empty {
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		padding: 48px 0;
		font-size: 1.1rem;
	}
</style>
```

**Step 2: Verify the live run view renders**

Run: `npm run dev` — navigate to `/stats`, play a run to stage 3+, return to `/stats`
Expected: Charts populate with data after gameplay. Empty state shows before any run.

**Step 3: Commit**

```bash
git add src/lib/components/stats/LiveRunView.svelte
git commit -m "feat: add LiveRunView with all chart groups"
```

---

## Task 8: Build the Simulator View

**Depends on:** Tasks 4, 5, 6

**Files:**

- Create: `src/lib/components/stats/SimulatorView.svelte`

The simulator view has three sections: a build planner (searchable upgrade list), stage range slider, and chart output. It calls `simulateBuild()` and renders the same chart groups as LiveRunView.

**Step 1: Create SimulatorView**

```svelte
<!-- src/lib/components/stats/SimulatorView.svelte -->
<script lang="ts">
	import { allUpgrades } from '$lib/data/upgrades';
	import { simulateBuild, type BuildStep } from '$lib/engine/simulator';
	import type { StatSnapshot } from '$lib/stores/runHistory.svelte';
	import StatGroup from './StatGroup.svelte';
	import StatChart from './StatChart.svelte';

	let search = $state('');
	let maxStage = $state(50);
	let buildPlan: BuildStep[] = $state([]);
	let nextLevel = $state(1);

	const filteredUpgrades = $derived(
		search.length > 0
			? allUpgrades.filter(
					(u) =>
						u.title.toLowerCase().includes(search.toLowerCase()) ||
						u.id.toLowerCase().includes(search.toLowerCase())
				)
			: allUpgrades
	);

	const snapshots: StatSnapshot[] = $derived(simulateBuild(buildPlan, maxStage));
	const labels: number[] = $derived(snapshots.map((s) => s.stage));

	function addUpgrade(upgradeId: string) {
		buildPlan = [...buildPlan, { level: nextLevel, upgradeId }];
	}

	function removeStep(index: number) {
		buildPlan = buildPlan.filter((_, i) => i !== index);
	}

	function clearPlan() {
		buildPlan = [];
	}

	// Presets: common archetype build plans
	const PRESETS: { name: string; steps: BuildStep[] }[] = [
		{
			name: 'Damage',
			steps: [
				{ level: 1, upgradeId: 'damage_1' },
				{ level: 2, upgradeId: 'damage_2' },
				{ level: 3, upgradeId: 'damage_3' },
				{ level: 5, upgradeId: 'crit_chance_1' },
				{ level: 7, upgradeId: 'crit_damage_1' },
				{ level: 10, upgradeId: 'damage_4' },
				{ level: 12, upgradeId: 'damage_multiplier_1' },
				{ level: 15, upgradeId: 'attack_speed_1' }
			]
		},
		{
			name: 'Poison',
			steps: [
				{ level: 1, upgradeId: 'poison_1' },
				{ level: 2, upgradeId: 'poison_2' },
				{ level: 3, upgradeId: 'poison_stacks_1' },
				{ level: 5, upgradeId: 'poison_duration_1' },
				{ level: 7, upgradeId: 'poison_3' },
				{ level: 10, upgradeId: 'poison_stacks_2' },
				{ level: 12, upgradeId: 'poison_crit_1' }
			]
		},
		{
			name: 'Speed',
			steps: [
				{ level: 1, upgradeId: 'attack_speed_1' },
				{ level: 2, upgradeId: 'attack_speed_2' },
				{ level: 3, upgradeId: 'multi_strike_1' },
				{ level: 5, upgradeId: 'attack_speed_3' },
				{ level: 7, upgradeId: 'multi_strike_2' },
				{ level: 10, upgradeId: 'damage_2' }
			]
		},
		{
			name: 'Crit',
			steps: [
				{ level: 1, upgradeId: 'crit_chance_1' },
				{ level: 2, upgradeId: 'crit_damage_1' },
				{ level: 3, upgradeId: 'crit_chance_2' },
				{ level: 5, upgradeId: 'crit_damage_2' },
				{ level: 7, upgradeId: 'crit_chance_3' },
				{ level: 10, upgradeId: 'damage_3' }
			]
		}
	];

	function loadPreset(preset: { name: string; steps: BuildStep[] }) {
		buildPlan = [...preset.steps];
	}

	const COLORS = {
		damage: '#ef4444',
		critChance: '#f59e0b',
		critMultiplier: '#f97316',
		attackSpeed: '#22d3ee',
		multiStrike: '#a855f7',
		dps: '#8b5cf6',
		poison: '#22c55e',
		poisonStacks: '#16a34a',
		poisonDuration: '#86efac',
		poisonDps: '#15803d',
		execute: '#dc2626',
		executeCap: '#991b1b',
		damageMult: '#fb923c',
		xpMult: '#38bdf8',
		goldPerKill: '#fbbf24',
		goldDrop: '#d97706',
		goldMult: '#f59e0b',
		enemyHp: '#ef4444',
		bossHp: '#dc2626',
		xpToNext: '#818cf8',
		ttk: '#f472b6'
	};

	const RARITY_COLORS: Record<string, string> = {
		common: '#9ca3af',
		uncommon: '#22c55e',
		rare: '#3b82f6',
		epic: '#a855f7',
		legendary: '#f59e0b'
	};
</script>

<div class="simulator">
	<div class="controls">
		<div class="build-planner">
			<h3>Build Planner</h3>

			<div class="presets">
				{#each PRESETS as preset}
					<button class="preset-btn" onclick={() => loadPreset(preset)}>{preset.name}</button>
				{/each}
				<button class="preset-btn clear" onclick={clearPlan}>Clear</button>
			</div>

			<div class="add-controls">
				<label>
					At stage:
					<input type="number" bind:value={nextLevel} min={1} max={maxStage} />
				</label>
			</div>

			<input type="text" bind:value={search} placeholder="Search upgrades..." class="search" />

			<div class="upgrade-list">
				{#each filteredUpgrades as upgrade}
					<button
						class="upgrade-item"
						onclick={() => addUpgrade(upgrade.id)}
						style="border-left: 3px solid {RARITY_COLORS[upgrade.rarity]}"
					>
						<span class="upgrade-title">{upgrade.title}</span>
						<span class="upgrade-rarity" style="color: {RARITY_COLORS[upgrade.rarity]}"
							>{upgrade.rarity}</span
						>
					</button>
				{/each}
			</div>
		</div>

		<div class="plan-summary">
			<h3>Current Build ({buildPlan.length} upgrades)</h3>
			<div class="stage-range">
				<label>
					Max Stage: {maxStage}
					<input type="range" bind:value={maxStage} min={5} max={200} />
				</label>
			</div>
			{#if buildPlan.length === 0}
				<p class="empty-plan">Add upgrades or load a preset.</p>
			{:else}
				<div class="plan-list">
					{#each buildPlan as step, i}
						<div class="plan-step">
							<span class="step-level">Stage {step.level}:</span>
							<span class="step-upgrade">{step.upgradeId}</span>
							<button class="remove-btn" onclick={() => removeStep(i)}>×</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	{#if snapshots.length > 0}
		<div class="charts">
			<StatGroup title="Offensive Stats" expanded={true}>
				<StatChart
					title="Offensive Stats"
					{labels}
					datasets={[
						{
							label: 'Base Damage',
							data: snapshots.map((s) => s.stats.damage),
							borderColor: COLORS.damage
						},
						{
							label: 'Crit Chance %',
							data: snapshots.map((s) => s.stats.critChance * 100),
							borderColor: COLORS.critChance
						},
						{
							label: 'Crit Multiplier',
							data: snapshots.map((s) => s.stats.critMultiplier),
							borderColor: COLORS.critMultiplier
						},
						{
							label: 'Attack Speed',
							data: snapshots.map((s) => s.stats.attackSpeed),
							borderColor: COLORS.attackSpeed
						},
						{
							label: 'Multi-Strike',
							data: snapshots.map((s) => s.stats.multiStrike),
							borderColor: COLORS.multiStrike,
							stepped: 'before'
						},
						{
							label: 'Effective DPS',
							data: snapshots.map((s) => s.computedDps),
							borderColor: COLORS.dps
						}
					]}
				/>
			</StatGroup>

			<StatGroup title="Poison Stats">
				<StatChart
					title="Poison Stats"
					{labels}
					datasets={[
						{
							label: 'Poison/Stack',
							data: snapshots.map((s) => s.stats.poison),
							borderColor: COLORS.poison
						},
						{
							label: 'Max Stacks',
							data: snapshots.map((s) => s.stats.poisonMaxStacks),
							borderColor: COLORS.poisonStacks,
							stepped: 'before'
						},
						{
							label: 'Duration (s)',
							data: snapshots.map((s) => s.stats.poisonDuration),
							borderColor: COLORS.poisonDuration
						},
						{
							label: 'Poison DPS',
							data: snapshots.map((s) => s.poisonDps),
							borderColor: COLORS.poisonDps
						}
					]}
				/>
			</StatGroup>

			<StatGroup title="Execute & Multipliers">
				<StatChart
					title="Execute & Multipliers"
					{labels}
					datasets={[
						{
							label: 'Execute Chance %',
							data: snapshots.map((s) => s.stats.executeChance * 100),
							borderColor: COLORS.execute
						},
						{
							label: 'Execute Cap %',
							data: snapshots.map((s) => s.stats.executeCap * 100),
							borderColor: COLORS.executeCap
						},
						{
							label: 'Damage Multiplier',
							data: snapshots.map((s) => s.stats.damageMultiplier),
							borderColor: COLORS.damageMult
						},
						{
							label: 'XP Multiplier',
							data: snapshots.map((s) => s.stats.xpMultiplier),
							borderColor: COLORS.xpMult
						}
					]}
				/>
			</StatGroup>

			<StatGroup title="Economy">
				<StatChart
					title="Economy"
					{labels}
					datasets={[
						{
							label: 'Gold/Kill',
							data: snapshots.map((s) => s.stats.goldPerKill),
							borderColor: COLORS.goldPerKill
						},
						{
							label: 'Gold Drop %',
							data: snapshots.map((s) => s.stats.goldDropChance * 100),
							borderColor: COLORS.goldDrop
						},
						{
							label: 'Gold Multiplier',
							data: snapshots.map((s) => s.stats.goldMultiplier),
							borderColor: COLORS.goldMult
						}
					]}
				/>
			</StatGroup>

			<StatGroup title="Enemy Scaling">
				<StatChart
					title="Enemy Scaling"
					{labels}
					logScale={true}
					datasets={[
						{
							label: 'Enemy HP',
							data: snapshots.map((s) => s.enemyHp),
							borderColor: COLORS.enemyHp
						},
						{ label: 'Boss HP', data: snapshots.map((s) => s.bossHp), borderColor: COLORS.bossHp },
						{
							label: 'XP to Next Level',
							data: snapshots.map((s) => s.xpToNextLevel),
							borderColor: COLORS.xpToNext
						}
					]}
				/>
			</StatGroup>

			<StatGroup title="Composite Views">
				<StatChart
					title="Player DPS vs Enemy HP"
					{labels}
					dualAxis={true}
					datasets={[
						{
							label: 'Effective DPS',
							data: snapshots.map((s) => s.computedDps),
							borderColor: COLORS.dps,
							yAxisID: 'y'
						},
						{
							label: 'Enemy HP',
							data: snapshots.map((s) => s.enemyHp),
							borderColor: COLORS.enemyHp,
							yAxisID: 'y1'
						}
					]}
				/>
				<StatChart
					title="Time-to-Kill (seconds)"
					{labels}
					datasets={[
						{ label: 'TTK', data: snapshots.map((s) => s.timeToKill), borderColor: COLORS.ttk }
					]}
				/>
			</StatGroup>
		</div>
	{/if}
</div>

<style>
	.simulator {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.controls {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	h3 {
		margin: 0 0 12px;
		font-size: 1rem;
	}
	.presets {
		display: flex;
		gap: 6px;
		margin-bottom: 12px;
		flex-wrap: wrap;
	}
	.preset-btn {
		padding: 4px 12px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		background: transparent;
		color: white;
		cursor: pointer;
		font-size: 0.8rem;
	}
	.preset-btn:hover {
		background: rgba(139, 92, 246, 0.3);
	}
	.preset-btn.clear {
		border-color: #ef4444;
		color: #ef4444;
	}
	.add-controls {
		margin-bottom: 8px;
	}
	.add-controls label {
		font-size: 0.85rem;
	}
	.add-controls input {
		width: 60px;
		padding: 2px 6px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		color: white;
	}
	.search {
		width: 100%;
		padding: 6px 10px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		color: white;
		margin-bottom: 8px;
		font-size: 0.85rem;
		box-sizing: border-box;
	}
	.upgrade-list {
		max-height: 300px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.upgrade-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 4px 8px;
		background: rgba(0, 0, 0, 0.2);
		border: none;
		border-radius: 4px;
		color: white;
		cursor: pointer;
		font-size: 0.8rem;
		text-align: left;
	}
	.upgrade-item:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	.upgrade-rarity {
		font-size: 0.7rem;
		text-transform: uppercase;
	}
	.plan-summary {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 8px;
		padding: 12px;
	}
	.stage-range {
		margin-bottom: 12px;
	}
	.stage-range label {
		font-size: 0.85rem;
	}
	.stage-range input[type='range'] {
		width: 100%;
	}
	.empty-plan {
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.85rem;
	}
	.plan-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 300px;
		overflow-y: auto;
	}
	.plan-step {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.8rem;
		padding: 2px 4px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
	}
	.step-level {
		color: #8b5cf6;
		font-weight: 600;
		min-width: 60px;
	}
	.step-upgrade {
		flex: 1;
	}
	.remove-btn {
		background: none;
		border: none;
		color: #ef4444;
		cursor: pointer;
		font-size: 1rem;
		padding: 0 4px;
	}
</style>
```

**Step 2: Verify the simulator view works**

Run: `npm run dev` — navigate to `/stats`, switch to Simulator tab
Expected: Build planner visible, presets load upgrade plans, charts render with projected curves. Stage slider changes chart range.

**Step 3: Commit**

```bash
git add src/lib/components/stats/SimulatorView.svelte
git commit -m "feat: add SimulatorView with build planner, presets, and chart output"
```

---

## Task 9: Run `svelte-check` and fix any type errors

**Depends on:** Tasks 7, 8

**Files:**

- Possibly modify any files from Tasks 1-8

**Step 1: Run svelte-check**

Run: `npm run check`
Expected: Zero errors. If there are errors, fix them.

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass, including the new dps and simulator tests.

**Step 3: Manual smoke test**

Run: `npm run dev`

1. Navigate to `/stats` — see Live Run tab with empty state
2. Go to main game, play through ~3 stages
3. Return to `/stats` — charts should show progression data
4. Switch to Simulator tab — load "Damage" preset, verify charts render
5. Adjust stage slider — charts should update
6. Search for an upgrade, add it to the build plan
7. Verify no console errors throughout

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type errors and polish stats page"
```

---

## Dependency Graph

```
Task 1 (engine DPS functions)  ──┬──→ Task 2 (runHistory store) ──→ Task 3 (gameState integration) ──┐
                                 │                                                                     │
                                 └──→ Task 4 (simulator engine)  ──────────────────────────────────────┤
                                                                                                       │
Task 5 (StatChart + StatGroup)  ──→ Task 6 (page route) ──────────────────────────────────────────────┤
                                                                                                       │
                                                            Task 7 (LiveRunView) ←─── depends on 3,5,6 ┤
                                                            Task 8 (SimulatorView) ←── depends on 4,5,6 ┤
                                                                                                       │
                                                            Task 9 (verify + fix) ←─── depends on 7,8 ──┘
```
