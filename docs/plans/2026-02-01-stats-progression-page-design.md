# Stats Progression Page — Design

## Overview

A dev-only page at `/stats` for visualizing game balance through stat progression charts. Two modes: **Live Run** (records actual gameplay data) and **Balance Simulator** (projects curves from theoretical build plans).

Gated behind `import.meta.env.DEV` — not accessible in production.

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

Pure functions that take a build plan and produce stat curves:

```ts
type BuildStep = { level: number; upgradeId: string };
type BuildPlan = BuildStep[];

function simulateBuild(plan: BuildPlan, maxStage: number): StatSnapshot[];
```

1. Start with `DEFAULT_STATS`
2. Sort plan by level
3. For each stage 1..maxStage:
   - Apply any upgrades scheduled at current level
   - Compute derived values (DPS, enemy HP, etc.) using existing wave/stat formulas
   - Emit a snapshot
4. Return array of snapshots (same shape as live snapshots, for chart reuse)

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
