# Card Stat Tooltips Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add hover/tap tooltips to upgrade card stats showing mechanical descriptions from the stat registry.

**Architecture:** Create a reusable `CardStatTooltip` component wrapping stat lines with bits-ui `Tooltip`. Integrate into `UpgradeCard.svelte` and wrap card rendering in `CardSelectionModal.svelte` with `Tooltip.Provider`. Uses existing `statRegistry` descriptions, no new data needed.

**Tech Stack:** Svelte 5, bits-ui Tooltip, Tailwind CSS

---

## Task 1: Create CardStatTooltip Component

**Files:**

- Create: `src/lib/components/CardStatTooltip.svelte`

**Step 1: Create the CardStatTooltip component**

Create new file with complete implementation:

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

**Step 2: Verify component compiles**

Run: `npm run check`
Expected: No errors for CardStatTooltip.svelte

**Step 3: Commit**

```bash
git add src/lib/components/CardStatTooltip.svelte
git commit -m "feat: create CardStatTooltip component for stat descriptions"
```

---

## Task 2: Integrate CardStatTooltip into UpgradeCard

**Files:**

- Modify: `src/lib/components/UpgradeCard.svelte:1-7` (add import)
- Modify: `src/lib/components/UpgradeCard.svelte:69-87` (wrap stats with tooltip)

**Step 1: Add CardStatTooltip import**

Add import after existing imports:

```svelte
import CardStatTooltip from './CardStatTooltip.svelte';
```

Location: After line 4 (`import { getModifierDisplay, getModifierDisplayWithTotal } from '$lib/data/upgrades';`)

**Step 2: Wrap stat list items with CardStatTooltip**

Replace the stats rendering block (lines 69-87) with:

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

**Step 3: Verify component compiles**

Run: `npm run check`
Expected: No errors for UpgradeCard.svelte

**Step 4: Commit**

```bash
git add src/lib/components/UpgradeCard.svelte
git commit -m "feat: integrate CardStatTooltip into UpgradeCard stats"
```

---

## Task 3: Add Tooltip.Provider to CardSelectionModal

**Files:**

- Modify: `src/lib/components/CardSelectionModal.svelte:1-8` (add Tooltip import)
- Modify: `src/lib/components/CardSelectionModal.svelte:104-128` (wrap content with Provider)

**Step 1: Add Tooltip import**

Modify the bits-ui import on line 4:

```svelte
import {(Button, Tooltip)} from 'bits-ui';
```

**Step 2: Wrap modal content with Tooltip.Provider**

Replace the modal-overlay div content (lines 104-128) with:

```svelte
<div class="modal-overlay {overlayClass}">
	<div class="modal {modalClass} theme-{theme}" class:selecting={cardSelect.selecting}>
		<Tooltip.Provider delayDuration={0} disableHoverableContent>
			<div class="modal-header" class:content-fade-out={cardSelect.selecting}>
				{@render header?.()}
			</div>

			<!-- Desktop grid -->
			<div class="upgrade-choices desktop-grid {choicesClass}">
				{#each cards as card, i (card.id)}
					{@render cardButton(card, i)}
				{/each}
			</div>

			<!-- Mobile carousel -->
			<CardCarousel count={cards.length}>
				{#each cards as card, i (card.id)}
					{@render cardButton(card, i)}
				{/each}
			</CardCarousel>

			<div class="modal-footer mt-4" class:content-fade-out={cardSelect.selecting}>
				{@render footer?.()}
			</div>
		</Tooltip.Provider>
	</div>
</div>
```

**Step 3: Verify component compiles**

Run: `npm run check`
Expected: No errors for CardSelectionModal.svelte

**Step 4: Commit**

```bash
git add src/lib/components/CardSelectionModal.svelte
git commit -m "feat: add Tooltip.Provider to CardSelectionModal for stat tooltips"
```

---

## Task 4: Manual Testing

**Files:**

- None (manual testing)

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts without errors

**Step 2: Test desktop hover behavior**

1. Navigate to a card selection screen (level up or legendary selection)
2. Hover over a stat line on any card
3. Expected: Tooltip appears above the stat with description
4. Move mouse away
5. Expected: Tooltip disappears

**Step 3: Test mobile tap behavior**

1. Open browser dev tools
2. Toggle device emulation (mobile viewport)
3. Tap a stat line on a card
4. Expected: Tooltip appears
5. Tap outside the tooltip
6. Expected: Tooltip dismisses
7. Tap the stat line again, then tap the card
8. Expected: Tooltip dismisses, card is NOT selected (stopPropagation working)

**Step 4: Test edge cases**

1. Check that tooltips appear on disabled cards (information still available)
2. Verify tooltip z-index is above shop price overlays (if present)
3. Test with multiple card types (common, rare, legendary) to ensure all stats show tooltips
4. Verify graceful degradation: If a stat somehow has no description, the stat still renders without tooltip

**Step 5: Document test results**

Note any issues found in a comment:

```bash
# Testing complete - record any issues here before committing
# Example: "Tooltip positioning off on mobile Safari" or "All tests pass"
```

**Step 6: Commit (if changes needed)**

Only if bugs were found and fixed:

```bash
git add <files-changed-during-testing>
git commit -m "fix: resolve tooltip issues found during testing"
```

---

## Task 5: Verify Against Design Spec

**Files:**

- Read: `docs/plans/2026-02-04-card-stat-tooltips-design.md`

**Step 1: Check all requirements met**

Verify each design requirement is implemented:

- ✅ CardStatTooltip component created at correct path
- ✅ Props match design (statKey, children snippet)
- ✅ Tooltip.Provider wrapper added to CardSelectionModal
- ✅ Stats wrapped with CardStatTooltip in UpgradeCard
- ✅ Styling matches design (bg-black/85, text-slate-200, etc.)
- ✅ Event propagation stopped (onclick stopPropagation)
- ✅ Graceful degradation if description missing
- ✅ Desktop hover works
- ✅ Mobile tap works

**Step 2: Document completion**

No commit needed - just verify checklist above.

---

## Testing Summary

**Manual tests required:**

1. Desktop hover shows/hides tooltip correctly
2. Mobile tap shows/dismisses tooltip correctly
3. Click propagation stopped (tapping stat doesn't select card)
4. Tooltip positioning (above stat, doesn't overflow viewport)
5. Z-index stacking (appears above overlays)
6. Graceful degradation (missing descriptions don't break render)
7. Works on disabled cards
8. All stat types show correct descriptions

**No automated tests needed** - this is pure UI behavior best verified visually.

---

## Rollback Plan

If issues are found after deployment:

1. Revert Task 3: Remove `Tooltip.Provider` wrapper (removes tooltip functionality but keeps cards working)
2. Revert Task 2: Remove `CardStatTooltip` usage in UpgradeCard (stats render without tooltips)
3. Revert Task 1: Delete `CardStatTooltip.svelte` component

Commands:

```bash
git revert <commit-hash-task-3>
git revert <commit-hash-task-2>
git revert <commit-hash-task-1>
```
