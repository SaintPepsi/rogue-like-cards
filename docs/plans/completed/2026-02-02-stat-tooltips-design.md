# Stat Tooltips Design

## Summary

Add hover/tap tooltips to every stat in the StatsPanel that explain what the stat does and show its base value.

## Data Layer

### `src/lib/engine/stats.ts`

Add a `description` field to `StatEntry`:

```ts
export type StatEntry = {
	key: keyof PlayerStats;
	icon: string;
	label: string;
	description: string; // mechanical tooltip text
	format: (value: number | boolean) => string;
	formatMod?: (value: number | boolean) => string;
	colorClass?: string;
	alwaysShow?: boolean;
};
```

Each registry entry gets a precise, mechanical description. The tooltip renders as:
`{description} Base: {format(defaultValue)}`

### Descriptions for each stat

| Stat                     | Description                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| damage                   | "Base damage dealt per attack."                                    |
| damageMultiplier         | "Percentage bonus applied to all damage."                          |
| critChance               | "Probability of landing a critical hit."                           |
| critMultiplier           | "Damage multiplier applied on critical hits."                      |
| poison                   | "Damage dealt per poison stack per tick."                          |
| poisonMaxStacks          | "Maximum number of concurrent poison stacks on a target."          |
| poisonDuration           | "How long each poison stack lasts."                                |
| poisonCritChance         | "Chance for poison ticks to critically strike."                    |
| multiStrike              | "Extra attacks dealt per click."                                   |
| executeChance            | "Chance to instantly kill an enemy. Capped at 10% against bosses." |
| xpMultiplier             | "Percentage bonus applied to all XP gained."                       |
| bonusBossTime            | "Extra seconds added to boss fight timers."                        |
| luckyChance              | "Bonus chance to be offered rare upgrades."                        |
| chestChance              | "Probability of a chest spawning after a kill."                    |
| bossChestChance          | "Probability of a boss dropping a mimic chest."                    |
| goldDropChance           | "Probability of gold dropping from a kill."                        |
| goldPerKill              | "Flat gold earned per enemy killed."                               |
| goldMultiplier           | "Percentage bonus applied to all gold earned."                     |
| greed                    | "Increases gold earned but also increases enemy health."           |
| attackSpeed              | "Number of automatic attacks per second."                          |
| tapFrenzyBonus           | "Attack speed bonus gained per frenzy tap."                        |
| tapFrenzyDuration        | "How long the frenzy effect lasts."                                |
| tapFrenzyStackMultiplier | "Multiplier applied to frenzy stack accumulation."                 |

## UI Layer

### `src/lib/components/StatsPanel.svelte`

Wrap each stat row in a `bits-ui` Tooltip (same library already used in UpgradeBadge):

```svelte
<Tooltip.Provider delayDuration={0} disableHoverableContent>
	{#each statRegistry as entry (entry.key)}
		{@const value = stats[entry.key]}
		{@const defaultValue = defaults[entry.key]}
		{#if entry.alwaysShow || value !== defaultValue}
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<div class="stat-row {entry.colorClass ?? ''}">
						<span>{entry.icon} {entry.label}</span>
						<span>{entry.format(value)}</span>
					</div>
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
```

### Design decisions

- **`side="left"`** — stats panel sits on the right edge; tooltips open leftward to avoid viewport clipping.
- **Single `Tooltip.Provider`** wrapping the whole list — one provider, not one per row.
- **`delayDuration={0}`** — instant show on hover/tap, matching existing tooltip behavior.
- **Tap to show, tap-away to dismiss** — natural mobile interaction handled by bits-ui's built-in behavior.
- **Dark tooltip styling** — semi-transparent dark background matching the stats panel aesthetic (not the orange gradient used in UpgradeBadge, which is upgrade-specific).

## Scope

- **Files changed:** 2 (`stats.ts`, `StatsPanel.svelte`)
- **New dependencies:** None (bits-ui already installed)
- **No new components** — uses existing bits-ui Tooltip primitives inline
