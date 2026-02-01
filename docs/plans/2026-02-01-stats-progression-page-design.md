# Stats Progression Page — Design

## Overview

A dev-only page at `/stats` for visualizing game balance through stat progression charts. Two modes: **Live Run** (records actual gameplay data) and **Balance Simulator** (projects curves from theoretical build plans).

Gated behind `import.meta.env.DEV` — not accessible in production.

## Core Constraint: No Duplicate Formulas

The stats page and simulator must **never contain their own stat, damage, or wave formulas**. All derived values (effective DPS, enemy HP, poison DPS, time-to-kill, XP thresholds) must be computed by calling the real engine functions (`getWaveConfig`, `xpToNextLevel`, `applyUpgrade`, etc.).

This ensures balance changes automatically propagate to the visualization without manual syncing.

**What this means in practice:**

- **Live Run snapshots** call real engine functions with current stage/stats to compute derived fields.
- **Simulator** drives a loop over the real `applyUpgrade()` and `getWaveConfig()` functions — it contains no math of its own.
- **New derived values** (e.g. `computeEffectiveDps`) are added to the engine first, then called from both the game and the stats page. The engine is the single source of truth.

```ts
// DECISION: Simulator must NEVER contain its own stat/damage/wave formulas.
// It calls the real engine functions (applyUpgrade, getWaveConfig, computeEffectiveDps, etc.)
// so that balance changes automatically propagate to the visualization.
// If you need a new derived value here, add it to the engine first, then call it.
```

## Data Recording

### Snapshot Store (`src/lib/stores/runHistory.svelte.ts`)

Records stat snapshots during gameplay at two trigger points:

- Stage transitions (after wave completes)
- Level-ups (after upgrade is applied)

Each snapshot captures:

```ts
type SnapshotEvent = 'stage_transition' | 'level_up';

type StatSnapshot = {
	event: SnapshotEvent;
	stage: number;
	level: number;
	stats: Stats;
	computedDps: number; // damage × attackSpeed × (1 + critChance × (critMultiplier - 1)) × (1 + multiStrike)
	poisonDps: number; // poison × poisonMaxStacks (assumes full stacks)
	timeToKill: number; // enemyHp / computedDps (seconds)
	enemyHp: number; // from wave formulas at this stage
	bossHp: number; // from wave formulas at this stage
	xpToNextLevel: number; // from leveling formula
	upgradesPicked: string[]; // cumulative upgrade IDs
	timestamp: number; // ms since run start
};
```

Reset on new run. Exposed as `snapshots` array for chart consumption.

### Integration Points

In `gameState.svelte.ts`:

- After stage transition logic: call `addSnapshot('stage_transition', currentStats, stage, level, upgrades)`
- After level-up / upgrade selection: call `addSnapshot('level_up', currentStats, stage, level, upgrades)`

Computed fields (DPS, poison DPS, time-to-kill, enemy HP) are derived from existing engine functions in `waves.ts`, `stats.ts`.

## Page Structure

### Route: `src/routes/stats/+page.svelte`

- Dev gate: early return with "Not available" if `!import.meta.env.DEV`
- Tab toggle: "Live Run" | "Simulator"
- Renders `LiveRunView` or `SimulatorView` based on active tab

### Live Run View (`src/lib/components/stats/LiveRunView.svelte`)

Displays recorded snapshots as grouped accordion charts. If no snapshots exist, shows "Start a run to see progression data."

### Simulator View (`src/lib/components/stats/SimulatorView.svelte`)

- **Build planner:** Searchable list of all upgrades. Click to add to build at a given level.
- **Stage range slider:** Configure how many stages to project (default 1-50).
- **Presets:** Quick-fill common archetypes (damage, poison, speed, crit).
- **Output:** Same accordion chart groups, computed on-the-fly from build plan + game formulas.

### Shared Components

- `StatChart.svelte` — Reusable Chart.js line chart wrapper. Props: `datasets`, `labels`, `title`. Dark theme matching existing economy-simulation page.
- `StatGroup.svelte` — Collapsible accordion section. Props: `title`, `expanded` (default false), children slot.

## Chart Groups

### 1. Offensive Stats

- Base Damage (line)
- Crit Chance % (line)
- Crit Multiplier (line)
- Attack Speed (attacks/sec) (line)
- Multi-Strike count (stepped line)
- **Effective DPS** (composite: `damage × attackSpeed × critExpectedValue × (1 + multiStrike)`)

### 2. Poison Stats

- Poison per stack (line)
- Max Stacks (stepped line)
- Poison Duration (line)
- **Poison DPS** (composite: `poison × maxStacks` assuming full stacks)

### 3. Execute & Multipliers

- Execute Chance % vs Execute Cap % (two lines)
- Damage Multiplier (line)
- XP Multiplier (line)

### 4. Economy

- Gold per Kill (line)
- Gold Drop Chance % (line)
- Gold Multiplier (line)
- Rarity distribution at current Lucky value (stacked area or bar)

### 5. Enemy Scaling (Reference)

- Enemy HP per stage (line, log scale option)
- Boss HP per stage (line, log scale option)
- XP to next level (line)

### 6. Composite Views

- **Player DPS vs Enemy HP** (dual-axis: DPS left, HP right — the key balance chart)
- **Time-to-Kill per stage** (seconds, derived)
- **Gold income rate vs common/uncommon/rare shop prices** (multi-line)

## Simulator Engine (`src/lib/engine/simulator.ts`)

A thin loop that drives real engine functions — **zero formulas of its own**.

```ts
type BuildStep = { level: number; upgradeId: string };
type BuildPlan = BuildStep[];

function simulateBuild(plan: BuildPlan, maxStage: number): StatSnapshot[] {
	let stats = { ...DEFAULT_STATS };
	const snapshots: StatSnapshot[] = [];

	for (let stage = 1; stage <= maxStage; stage++) {
		// Apply upgrades using the REAL applyUpgrade() from the engine
		for (const step of plan.filter((s) => s.level === stage)) {
			stats = applyUpgrade(stats, step.upgradeId);
		}
		// Compute derived values using REAL engine functions
		const wave = getWaveConfig(stage, stats);
		const dps = computeEffectiveDps(stats);
		const poisonDps = computePoisonDps(stats);
		snapshots.push({
			stage,
			stats: { ...stats },
			computedDps: dps,
			poisonDps,
			enemyHp: wave.enemyHp,
			bossHp: wave.bossHp,
			timeToKill: wave.enemyHp / dps,
			xpToNextLevel: xpToNextLevel(stage)
			// ...
		});
	}
	return snapshots;
}
```

**`computeEffectiveDps`** and **`computePoisonDps`** are new engine functions (added to the engine, not the simulator) that the game itself can also use for tooltips/UI.

The simulator has no knowledge of how damage, crits, or scaling work — it just calls the engine.

## File Layout

```
src/
├── lib/
│   ├── stores/
│   │   └── runHistory.svelte.ts
│   ├── engine/
│   │   └── simulator.ts
│   └── components/
│       └── stats/
│           ├── LiveRunView.svelte
│           ├── SimulatorView.svelte
│           ├── StatChart.svelte
│           └── StatGroup.svelte
└── routes/
    └── stats/
        └── +page.svelte
```

## Styling

Match existing economy-simulation page aesthetic:

- Dark background (`#1a1a2e`)
- White text, white chart labels
- Chart backgrounds: `rgba(0, 0, 0, 0.3)` with rounded corners
- Rarity colors: common gray, uncommon green, rare blue, epic purple, legendary gold

## Future Considerations

- Export/import snapshot data for sharing builds
- Overlay multiple simulator builds for comparison
- Link from game-over screen to live stats view
