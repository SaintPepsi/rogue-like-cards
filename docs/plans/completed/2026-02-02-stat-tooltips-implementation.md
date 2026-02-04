# Stat Tooltips Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use coca-wits:executing-plans to implement this plan task-by-task.

**Goal:** Add hover/tap tooltips to every stat in the StatsPanel showing a description and the base value.

**Architecture:** Add a `description` field to `StatEntry` in the stat registry, then wrap each stat row in `StatsPanel.svelte` with bits-ui `Tooltip` components. Dark-styled tooltips open leftward to avoid viewport clipping.

**Tech Stack:** Svelte 5, bits-ui Tooltip (already installed at ^2.15.4)

---

### Task 1: Add `description` field to StatEntry type and all registry entries

**Depends on:** None

**Files:**

- Modify: `src/lib/engine/stats.ts:46-58` (type definition)
- Modify: `src/lib/engine/stats.ts:69-155` (registry entries)

**Step 1: Add `description` to the `StatEntry` type**

In `src/lib/engine/stats.ts`, change the type at lines 46-58 to include `description`:

```ts
export type StatEntry = {
	key: keyof PlayerStats;
	icon: string;
	label: string;
	description: string; // mechanical tooltip text
	// format: displays the total stat value (e.g. 1.5 → "+50%")
	format: (value: number | boolean) => string;
	// formatMod: displays the modifier delta on upgrade cards (e.g. 0.5 → "+50%")
	// Falls back to format when absent. Needed for stats where the base is non-zero
	// (multipliers with base 1) so the delta formatter differs from the total formatter.
	formatMod?: (value: number | boolean) => string;
	colorClass?: string;
	alwaysShow?: boolean;
};
```

**Step 2: Add descriptions to every registry entry**

Update each entry in `statRegistry` (lines 69-155) to include the `description` field. Use the exact descriptions from the design doc:

```ts
export const statRegistry: StatEntry[] = [
	{
		key: 'damage',
		icon: '⚔️',
		label: 'Damage',
		description: 'Base damage dealt per attack.',
		format: asNumber,
		alwaysShow: true
	},
	{
		key: 'damageMultiplier',
		icon: '⚔️',
		label: 'Damage Bonus',
		description: 'Percentage bonus applied to all damage.',
		format: asBonusPercent,
		formatMod: asPlusPercent
	},
	{
		key: 'critChance',
		icon: '🎯',
		label: 'Crit Chance',
		description: 'Probability of landing a critical hit.',
		format: asPercent
	},
	{
		key: 'critMultiplier',
		icon: '💥',
		label: 'Crit Damage',
		description: 'Damage multiplier applied on critical hits.',
		format: (v) => `${(v as number).toFixed(1)}x`,
		formatMod: (v) => `+${(v as number).toFixed(1)}x`
	},
	{
		key: 'poison',
		icon: '☠️',
		label: 'Poison',
		description: 'Damage dealt per poison stack per tick.',
		format: (v) => `${formatNumber(v as number)}/stack`,
		colorClass: 'poison'
	},
	{
		key: 'poisonMaxStacks',
		icon: '🧪',
		label: 'Max Stacks',
		description: 'Maximum number of concurrent poison stacks on a target.',
		format: (v) => `${v}`,
		colorClass: 'poison'
	},
	{
		key: 'poisonDuration',
		icon: '🕐',
		label: 'Duration',
		description: 'How long each poison stack lasts.',
		format: (v) => `${v}s`,
		colorClass: 'poison'
	},
	{
		key: 'poisonCritChance',
		icon: '💀',
		label: 'Poison Crit',
		description: 'Chance for poison ticks to critically strike.',
		format: asPercent,
		colorClass: 'poison'
	},
	{
		key: 'multiStrike',
		icon: '⚡',
		label: 'Multi-Strike',
		description: 'Extra attacks dealt per click.',
		format: asPlusNumber
	},
	{
		key: 'executeChance',
		icon: '⚰️',
		label: 'Execute',
		description: 'Chance to instantly kill an enemy. Capped at 10% against bosses.',
		format: asPercent
	},
	{
		key: 'xpMultiplier',
		icon: '✨',
		label: 'XP Bonus',
		description: 'Percentage bonus applied to all XP gained.',
		format: asBonusPercent,
		formatMod: asPlusPercent
	},
	{
		key: 'bonusBossTime',
		icon: '⏱️',
		label: 'Boss Time',
		description: 'Extra seconds added to boss fight timers.',
		format: asPlusSeconds
	},
	{
		key: 'luckyChance',
		icon: '🍀',
		label: 'Lucky',
		description: 'Bonus chance to be offered rare upgrades.',
		format: asPlusPercent
	},
	{
		key: 'chestChance',
		icon: '📦',
		label: 'Chest Chance',
		description: 'Probability of a chest spawning after a kill.',
		format: asPercent
	},
	{
		key: 'bossChestChance',
		icon: '👑',
		label: 'Mimic',
		description: 'Probability of a boss dropping a mimic chest.',
		format: asPercent
	},
	{
		key: 'goldDropChance',
		icon: '🪙',
		label: 'Gold Drop',
		description: 'Probability of gold dropping from a kill.',
		format: asPercent,
		colorClass: 'gold'
	},
	{
		key: 'goldPerKill',
		icon: '💵',
		label: 'Gold/Kill',
		description: 'Flat gold earned per enemy killed.',
		format: asPlusNumber,
		colorClass: 'gold'
	},
	{
		key: 'goldMultiplier',
		icon: '🏆',
		label: 'Gold Bonus',
		description: 'Percentage bonus applied to all gold earned.',
		format: asBonusPercent,
		formatMod: asPlusPercent,
		colorClass: 'gold'
	},
	{
		key: 'greed',
		icon: '💰',
		label: 'Greed',
		description: 'Increases gold earned but also increases enemy health.',
		format: asPlusPercent,
		colorClass: 'greed'
	},
	{
		key: 'attackSpeed',
		icon: '🗡️',
		label: 'Attack Speed',
		description: 'Number of automatic attacks per second.',
		format: (v) => `${(v as number).toFixed(2)}/s`,
		alwaysShow: true
	},
	{
		key: 'tapFrenzyBonus',
		icon: '✨',
		label: 'Frenzy Bonus',
		description: 'Attack speed bonus gained per frenzy tap.',
		format: asPlusPercent
	},
	{
		key: 'tapFrenzyDuration',
		icon: '⏳',
		label: 'Frenzy Duration',
		description: 'How long the frenzy effect lasts.',
		format: asPlusSeconds
	},
	{
		key: 'tapFrenzyStackMultiplier',
		icon: '🔥',
		label: 'Frenzy Stacks',
		description: 'Multiplier applied to frenzy stack accumulation.',
		format: (v) => `${v}x`,
		formatMod: (v) => `+${v}x`
	}
];
```

**Step 3: Verify TypeScript compiles**

Run: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -20`
Expected: No errors related to `stats.ts`

**Step 4: Commit**

```bash
git add src/lib/engine/stats.ts
git commit -m "feat: add description field to stat registry for tooltips"
```

---

### Task 2: Add tooltip UI to StatsPanel

**Depends on:** Task 1

**Files:**

- Modify: `src/lib/components/StatsPanel.svelte`

**Step 1: Add Tooltip import and wrap stat rows**

Replace the entire `StatsPanel.svelte` with:

```svelte
<script lang="ts">
	import type { PlayerStats } from '$lib/types';
	import { createDefaultStats, statRegistry } from '$lib/engine/stats';
	import { Tooltip } from 'bits-ui';

	type Props = {
		stats: PlayerStats;
	};

	let { stats }: Props = $props();

	const defaults = createDefaultStats();
</script>

<aside class="stats-panel">
	<h2>Stats</h2>
	<Tooltip.Provider delayDuration={0} disableHoverableContent>
		{#each statRegistry as entry (entry.key)}
			{@const value = stats[entry.key]}
			{@const defaultValue = defaults[entry.key]}
			{#if entry.alwaysShow || value !== defaultValue}
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						{#snippet child({ props })}
							<div {...props} class="stat-row {entry.colorClass ?? ''}">
								<span>{entry.icon} {entry.label}</span>
								<span>{entry.format(value)}</span>
							</div>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content class="stat-tooltip" side="left" sideOffset={8}>
							{entry.description} Base: {entry.format(defaultValue)}
							<Tooltip.Arrow class="stat-tooltip-arrow" />
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			{/if}
		{/each}
	</Tooltip.Provider>
</aside>

<style>
	.stats-panel {
		background: rgba(0, 0, 0, 0.3);
		padding: 16px;
		border-radius: 8px;
		height: fit-content;
	}

	.stats-panel h2 {
		margin: 0 0 16px;
		font-size: 1.1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
		padding-bottom: 8px;
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		padding: 4px 0;
		font-size: 0.9rem;
		cursor: default;
	}

	.stat-row.poison {
		color: #a855f7;
	}

	.stat-row.gold {
		color: #f59e0b;
	}

	.stat-row.greed {
		color: #fbbf24;
	}

	:global(.stat-tooltip) {
		background: rgba(0, 0, 0, 0.85);
		color: #e2e8f0;
		font-size: 0.8rem;
		padding: 8px 12px;
		border-radius: 6px;
		max-width: 240px;
		line-height: 1.4;
		animation: stat-tooltip-fade-in 0.15s ease-out;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
		z-index: 50;
	}

	:global(.stat-tooltip-arrow) {
		fill: rgba(0, 0, 0, 0.85);
	}

	@keyframes stat-tooltip-fade-in {
		from {
			opacity: 0;
			transform: translateX(4px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
</style>
```

**Key implementation notes:**

- `asChild` with `{#snippet child({ props })}` is the bits-ui v2 pattern for rendering the trigger as a custom element. The `props` spread passes aria attributes and event handlers onto the `<div>`.
- `cursor: default` added to `.stat-row` so the pointer doesn't change to a text cursor on hover.
- `:global(.stat-tooltip)` uses dark semi-transparent styling (not the orange gradient from UpgradeBadge — that's upgrade-specific).
- Fade-in animation slides from the right (`translateX(4px)`) since tooltips open leftward.

**Step 2: Run svelte-check to verify**

Run: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -30`
Expected: No errors related to `StatsPanel.svelte`

**Step 3: Manual smoke test**

Run: `npm run dev`

- Hover over any stat row in the stats panel — tooltip should appear to the left
- Tooltip should show description text and "Base: {value}"
- On mobile (or devtools touch simulation), tap a stat to show, tap away to dismiss
- Verify tooltip doesn't clip off-screen

**Step 4: Commit**

```bash
git add src/lib/components/StatsPanel.svelte
git commit -m "feat: add tooltips to stats panel with descriptions and base values"
```
