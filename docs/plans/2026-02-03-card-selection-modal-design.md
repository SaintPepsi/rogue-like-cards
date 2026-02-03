# Card Selection Modal Consolidation

**Date:** 2026-02-03
**Status:** Approved

## Problem

ChestLootModal, LevelUpModal, ShopModal, and LegendarySelectionModal share nearly identical implementations (~1300 lines total). They all use the same card flip/select pattern with minor variations in header content, footer actions, and theming.

This duplication makes it difficult to:

- Fix animation bugs consistently across all modals
- Add new card selection features
- Maintain consistent behavior

## Solution

Extract the shared card flip/select pattern into a reusable `CardSelectionModal` component that accepts customization via props and snippets. Each existing modal becomes a thin wrapper (~30-80 lines) that passes modal-specific configuration.

**Design principle:** `ui = fn(state)` - the base component is a pure renderer that accepts all configuration via props. No internal modal-specific logic.

## Architecture & File Structure

**New files:**

- `src/lib/components/CardSelectionModal.svelte` - Base modal component
- `src/lib/components/CardSelectionModal.svelte.test.ts` - Test coverage

**Refactored files:**

- `ChestLootModal.svelte` - 277 lines → ~80 lines
- `LevelUpModal.svelte` - 295 lines → ~90 lines
- `ShopModal.svelte` - 446 lines → ~180 lines
- `LegendarySelectionModal.svelte` - 278 lines → ~70 lines

**Unchanged:**

- `UpgradesModal.svelte` - Fundamentally different (static grid, no selection)
- `useCardFlip.svelte` - Used by CardSelectionModal
- `useCardSelect.svelte` - Used by CardSelectionModal
- `CardCarousel.svelte` - Used by CardSelectionModal
- `UpgradeCard.svelte` - Used for card rendering

**Total reduction:** ~1300 lines → ~420 lines (68% reduction)

## Component Interface

### Props

```ts
type Props = {
	// Card data & selection
	cards: Upgrade[];
	onSelect: (card: Upgrade, index: number) => void;
	currentStats?: Partial<PlayerStats>;

	// Customization snippets
	header?: Snippet;
	footer?: Snippet;
	cardOverlay?: Snippet<[card: Upgrade, index: number]>;

	// Card customization functions
	getCardTitle?: (card: Upgrade) => string; // default: card.title
	getCardModifiers?: (card: Upgrade) => StatModifier[]; // default: card.modifiers
	isCardDisabled?: (card: Upgrade, index: number) => boolean; // default: false

	// Theming & styling
	theme?: 'default' | 'legendary'; // affects card back design and modal colors
	class?: string; // additional classes for overlay (e.g., 'exiting')
	modalClass?: string; // additional classes for modal panel
};
```

### Usage by Each Modal

**ChestLootModal:**

- Passes `header` snippet with gold reward display
- Uses default theme
- Wraps in `{#if show}` with `class={exiting ? 'exiting' : ''}`

**LevelUpModal:**

- Passes `header` snippet with pending badge
- Uses default theme
- Wraps in `{#if show}` with `class={exiting ? 'exiting' : ''}`

**ShopModal:**

- Passes `header`/`footer`/`cardOverlay` snippets
- Custom `isCardDisabled` for affordability checks
- Custom `getCardTitle` for level display
- Custom `getCardModifiers` for execute cap bonuses
- Handles reroll state externally (fades cards, manages price snapshot)

**LegendarySelectionModal:**

- Uses `theme='legendary'` for gold styling and ★ card back
- Passes `header`/`footer` snippets with skip button
- Always rendered (no show/hide wrapper)

## Internal Implementation

### State Management

```ts
const flip = useCardFlip();
const cardSelect = useCardSelect();

$effect(() => {
	if (cards.length > 0) {
		flip.startFlip(cards.length);
	}
	return () => {
		flip.cleanup();
		cardSelect.cleanup();
	};
});
```

### Component Structure

```svelte
<div class="modal-overlay {class}">
  <div class="modal {modalClass} theme-{theme}" class:selecting={cardSelect.selecting}>
    <div class="modal-header" class:content-fade-out={cardSelect.selecting}>
      {@render header?.()}
    </div>

    <!-- Desktop grid -->
    <div class="upgrade-choices desktop-grid">
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

    <div class="modal-footer" class:content-fade-out={cardSelect.selecting}>
      {@render footer?.()}
    </div>
  </div>
</div>
```

### Card Button Rendering (Internal Snippet)

```svelte
{#snippet cardButton(card, i)}
	<Button.Root
		disabled={!flip.enabledCards[i] || cardSelect.selecting || isCardDisabled?.(card, i)}
		onclick={() => handleSelect(card, i)}
		class="...card-wrapper classes..."
	>
		<div class="card-flip" class:flipped={flip.flippedCards[i]}>
			<div class="card-face card-back">
				<div class="card-back-design" class:legendary={theme === 'legendary'}>
					<div class="card-back-inner">
						{theme === 'legendary' ? '★' : '?'}
					</div>
				</div>
			</div>
			<div class="card-face card-front">
				<UpgradeCard
					title={getCardTitle?.(card) ?? card.title}
					modifiers={getCardModifiers?.(card) ?? card.modifiers}
					rarity={card.rarity}
					image={card.image}
					{currentStats}
				/>
				{@render cardOverlay?.(card, i)}
			</div>
		</div>
	</Button.Root>
{/snippet}
```

### Styling Strategy

- Base styles moved from individual modals to CardSelectionModal
- Theme-specific styles controlled via `theme-{theme}` class
- Parent modals provide their own specific styles for custom elements (badges, gold displays, buy labels)
- Exit animations handled via `class` prop on overlay

## Parent Modal Refactoring Examples

### ChestLootModal (simplified)

```svelte
<script lang="ts">
	import CardSelectionModal from './CardSelectionModal.svelte';
	import { formatNumber } from '$lib/format';

	let { show, gold, choices, onSelect, exiting = false, currentStats } = $props();
</script>

{#if show}
	<CardSelectionModal cards={choices} {onSelect} {currentStats} class={exiting ? 'exiting' : ''}>
		{#snippet header()}
			<h2>Treasure Found!</h2>
			<p class="gold-reward">+{formatNumber(gold)} Gold</p>
			<p>Choose a reward:</p>
		{/snippet}
	</CardSelectionModal>
{/if}

<style>
	.gold-reward {
		font-size: 1.4rem;
		color: #fbbf24;
		font-weight: bold;
		margin: 0 0 16px;
	}
</style>
```

### LegendarySelectionModal (simplified)

```svelte
<script lang="ts">
	import CardSelectionModal from './CardSelectionModal.svelte';

	let { choices, onSelect, currentStats } = $props();
</script>

<CardSelectionModal cards={choices} {onSelect} {currentStats} theme="legendary">
	{#snippet header()}
		<h2>Choose Your Starting Legendary</h2>
		<p>Select one legendary upgrade to begin your run:</p>
	{/snippet}

	{#snippet footer()}
		<div class="skip-section">
			<button class="skip-button" onclick={() => onSelect(null)}> Skip </button>
		</div>
	{/snippet}
</CardSelectionModal>

<style>
	/* Skip button styles */
</style>
```

## Testing Strategy

### New Component Tests

`CardSelectionModal.svelte.test.ts` should verify:

- Card flip animation triggers on mount with correct count
- Selection callback invoked with correct card/index
- Disabled cards don't trigger selection (flip disabled, select disabled, custom disabled)
- Cleanup called on unmount
- Snippet rendering (header, footer, cardOverlay)
- Theme variations (default vs legendary card backs)
- Selection animation states (panel pulse, content fade)

### Existing Modal Tests

- Keep existing test files for ChestLootModal and LevelUpModal
- Update tests to match new component structure
- All existing tests should pass with identical behavior
- ShopModal and LegendarySelectionModal currently have no tests (consider adding)

## Migration Strategy

### Implementation Order

1. Create `CardSelectionModal.svelte` with all shared logic
2. Create `CardSelectionModal.svelte.test.ts` and verify tests pass
3. Refactor modals one at a time:
   - **LegendarySelectionModal** (simplest - no special state)
   - **ChestLootModal** (simple - just gold display)
   - **LevelUpModal** (medium - pending badge)
   - **ShopModal** (most complex - reroll, prices, affordability)
4. Manual testing between each refactor to verify unchanged behavior
5. Run existing tests to catch regressions

### Risk Mitigation

- All animation timings preserved (no visual behavior changes)
- Props/callbacks maintain same signatures for parent components
- CSS classes preserved for any external styling dependencies
- Card flip/select hooks used identically
- Desktop grid + mobile carousel pattern unchanged

### Rollback Plan

If issues arise, each modal refactor is independent. Can revert individual modal changes without affecting others.

## Design Decisions

### Why snippets over props for header/footer?

Snippets provide maximum flexibility for complex content (badges, multiple text elements, custom buttons) without prop explosion. Follows Svelte 5 best practices.

### Why not include UpgradesModal?

UpgradesModal has fundamentally different behavior:

- No card selection callback
- No flip/select animations
- Static grid with locked/unlocked states
- No carousel for mobile

Forcing it into the same component would add unnecessary complexity.

### Why let caller handle visibility?

Decouples mount/unmount logic from card selection behavior. CardSelectionModal focuses solely on rendering and selection. Exit animations can be handled via CSS classes without component awareness.

### Why function props for card customization?

ShopModal needs dynamic title generation (level display) and modifier calculation (execute caps). Function props let the parent compute these values while keeping CardSelectionModal stateless.
