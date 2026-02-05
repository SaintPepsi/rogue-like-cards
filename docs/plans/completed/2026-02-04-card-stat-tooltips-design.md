# Card Stat Tooltips Design

**Date:** 2026-02-04
**Status:** Design Complete

## Overview

Add hover/tap tooltips to upgrade card stats that display mechanical descriptions from the stat registry. This helps players understand what each stat does directly from the card selection interface.

## Current State

- Upgrade cards display stat modifiers (icon, label, value, optional total)
- Stat descriptions exist in `statRegistry` but are only shown in `StatsPanel` tooltips
- Cards in `CardSelectionModal` are wrapped in `Button.Root` for selection
- No existing tooltip functionality on card stats

## Design

### Component: `CardStatTooltip.svelte`

**Location:** `src/lib/components/CardStatTooltip.svelte`

**Purpose:** Wrap individual stat lines on upgrade cards with tooltip functionality showing stat descriptions.

**Props:**

```ts
type Props = {
	statKey: string; // stat identifier (e.g., 'damage', 'critChance')
	children: Snippet; // the stat line content to wrap
};
```

**Implementation:**

```svelte
<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import { statRegistry } from '$lib/engine/stats';
	import type { Snippet } from 'svelte';

	type Props = {
		statKey: string;
		children: Snippet;
	};

	let { statKey, children }: Props = $props();

	const stat = $derived(statRegistry.find((s) => s.key === statKey));
	const description = $derived(stat?.description);
</script>

{#if description}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<div {...props} onclick={(e) => e.stopPropagation()}>
					{@render children()}
				</div>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content
				class="bg-black/85 text-slate-200 text-sm px-3 py-2 rounded-md max-w-60 leading-snug shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 z-50"
				side="top"
				sideOffset={8}
			>
				{description}
				<Tooltip.Arrow class="fill-black/85" />
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
{:else}
	{@render children()}
{/if}
```

### Integration Points

**1. UpgradeCard.svelte**

Wrap each stat `<li>` with `CardStatTooltip`:

```svelte
{#if displayStats.length > 0}
	<ul class="stats">
		{#each displayStats as stat, i (i)}
			<CardStatTooltip statKey={stat.stat}>
				<li>
					<span class="stat-icon">{stat.icon}</span>
					<div class="stat-text">
						<span class="stat-label">{stat.label}</span>
						<span class="stat-change">
							<span class="stat-value">{stat.value}</span>
							{#if 'total' in stat && stat.total}
								<span class="stat-arrow">→</span>
								<span class="stat-total">{stat.total}</span>
							{/if}
						</span>
					</div>
				</li>
			</CardStatTooltip>
		{/each}
	</ul>
{/if}
```

**2. CardSelectionModal.svelte**

Add `Tooltip.Provider` wrapper around card rendering area:

```svelte
<Tooltip.Provider delayDuration={0} disableHoverableContent>
	<!-- existing card rendering -->
</Tooltip.Provider>
```

## Behavior

### Desktop

- **Hover** over a stat line shows tooltip above it
- **Hover away** hides tooltip
- Tooltip positioned `side="top"` with `sideOffset={8}`

### Mobile

- **Tap** a stat line shows tooltip (bits-ui default behavior)
- **Tap outside** or **scroll** dismisses tooltip
- Tap doesn't propagate to card button (card selection prevented)

### Event Propagation

- `onclick={(e) => e.stopPropagation()}` on tooltip trigger prevents card selection
- Allows viewing stat descriptions without accidentally selecting the card

## Styling

Uses Tailwind classes for consistency with bits-ui components:

- Background: `bg-black/85` (matches `StatsPanel` tooltips)
- Text: `text-slate-200 text-sm`
- Padding: `px-3 py-2`
- Max width: `max-w-60` (240px)
- Shadow: `shadow-lg`
- Animation: `animate-in fade-in slide-in-from-top-1 duration-150`
- Z-index: `z-50` (above card overlays)
- Arrow fill: `fill-black/85`

## Edge Cases

1. **Missing description:** If `statRegistry.find()` returns undefined, render children without tooltip wrapper (graceful degradation)
2. **Disabled cards:** Tooltips work on disabled cards (information-only, doesn't interfere with disabled state)
3. **Card flip animation:** Back side of cards shows `?`, has no stats, so no tooltip issue
4. **Z-index layering:** Tooltip appears above card overlays (e.g., shop price labels) via `z-50`
5. **Multiple tooltips:** bits-ui `Tooltip.Provider` ensures only one tooltip open at a time

## Data Source

All descriptions come from `statRegistry` in `src/lib/engine/stats.ts`. Each stat entry already includes:

```ts
{
  key: 'damage',
  icon: '⚔️',
  label: 'Damage',
  description: 'Base damage dealt per attack.',  // ← this is shown in tooltip
  format: asNumber,
  formatMod: asPlusNumber,
  alwaysShow: true
}
```

No new data structure needed.

## Testing Considerations

- Verify tooltips show correct descriptions for all stat types
- Test hover behavior on desktop (show/hide)
- Test tap behavior on mobile/touch devices (show/dismiss)
- Confirm click propagation is stopped (card not selected when tapping stat)
- Check tooltip positioning doesn't overflow viewport edges
- Verify z-index stacking with shop price overlays
- Test graceful degradation if description is missing
