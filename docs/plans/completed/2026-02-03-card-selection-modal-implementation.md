# Card Selection Modal Consolidation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate four modal components (ChestLootModal, LevelUpModal, ShopModal, LegendarySelectionModal) into a single reusable CardSelectionModal component.

**Architecture:** Extract shared card flip/select pattern into a base component that accepts customization via props and Svelte 5 snippets. Each existing modal becomes a thin wrapper (~30-180 lines) that passes modal-specific configuration.

**Tech Stack:** Svelte 5, TypeScript, Vitest with vitest-browser-svelte, bits-ui

**Design doc reference:** `docs/plans/2026-02-03-card-selection-modal-design.md`

---

## Task 1: Create CardSelectionModal Base Component

**Goal:** Build the reusable base modal with all shared logic for card flip/select behavior.

**Files:**

- Create: `src/lib/components/CardSelectionModal.svelte`

### Step 1: Write skeleton component with props interface

Create the file with TypeScript types and basic structure:

```svelte
<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Upgrade, PlayerStats, StatModifier, Snippet } from '$lib/types';
	import UpgradeCard from './UpgradeCard.svelte';
	import CardCarousel from './CardCarousel.svelte';
	import { useCardFlip } from './useCardFlip.svelte';
	import { useCardSelect } from './useCardSelect.svelte';

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
		getCardTitle?: (card: Upgrade) => string;
		getCardModifiers?: (card: Upgrade) => StatModifier[];
		isCardDisabled?: (card: Upgrade, index: number) => boolean;

		// Theming & styling
		theme?: 'default' | 'legendary';
		class?: string;
		modalClass?: string;
	};

	let {
		cards,
		onSelect,
		currentStats,
		header,
		footer,
		cardOverlay,
		getCardTitle,
		getCardModifiers,
		isCardDisabled,
		theme = 'default',
		class: overlayClass = '',
		modalClass = ''
	}: Props = $props();
</script>

<!-- Placeholder structure -->
<div class="modal-overlay">
	<div class="modal">
		<p>CardSelectionModal skeleton</p>
	</div>
</div>
```

**Expected:** File compiles without errors, basic types defined.

### Step 2: Add flip and select state management

Add the hooks and lifecycle management matching LegendarySelectionModal pattern:

```svelte
<script lang="ts">
	// ... previous imports and types ...

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

	function handleSelect(card: Upgrade, index: number) {
		if (!flip.enabledCards[index]) return;
		if (cardSelect.selecting) return;
		const disabled = isCardDisabled?.(card, index) ?? false;
		if (disabled) return;
		cardSelect.select(index, () => onSelect(card, index));
	}
</script>
```

**Expected:** State hooks initialized correctly.

### Step 3: Implement card button snippet

Add the internal snippet for rendering individual card buttons:

```svelte
{#snippet cardButton(card: Upgrade, i: number)}
	{@const disabled = isCardDisabled?.(card, i) ?? false}
	<Button.Root
		class="group bg-transparent border-none p-0 cursor-pointer [perspective:800px] disabled:cursor-default card-wrapper {cardSelect.selecting
			? cardSelect.selectedIndex === i
				? 'card-selected'
				: 'card-dismissed'
			: ''}"
		disabled={!flip.enabledCards[i] || cardSelect.selecting || disabled}
		onclick={() => handleSelect(card, i)}
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

**Expected:** Snippet compiles with correct type parameters.

### Step 4: Build complete modal structure

Replace placeholder with full modal structure:

```svelte
<div class="modal-overlay {overlayClass}">
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

**Expected:** Component structure matches design spec.

### Step 5: Add base styles from existing modals

Copy shared styles from ChestLootModal/LegendarySelectionModal:

```svelte
<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal-overlay.exiting {
		background: transparent;
		pointer-events: none;
	}

	.modal-overlay.exiting .modal {
		animation: modal-exit 350ms ease-out forwards;
	}

	@keyframes modal-exit {
		to {
			opacity: 0;
			transform: scale(0.95);
		}
	}

	.modal {
		background: #1a1a2e;
		padding: 32px;
		border-radius: 16px;
		text-align: center;
		max-width: 90vw;
		position: relative;
	}

	/* Legendary theme */
	.modal.theme-legendary {
		background: linear-gradient(135deg, #1a0033 0%, #0d001a 100%);
		border: 2px solid #ffd700;
		box-shadow: 0 0 40px rgba(255, 215, 0, 0.3);
	}

	.modal.selecting {
		animation: panel-pulse 350ms ease-in-out;
	}

	@keyframes panel-pulse {
		0% {
			transform: scale(1);
		}
		43% {
			transform: scale(0.98);
		}
		100% {
			transform: scale(1);
		}
	}

	.modal-header,
	.modal-footer {
		transition: opacity 300ms ease-out;
	}

	.modal-header.content-fade-out,
	.modal-footer.content-fade-out {
		opacity: 0;
	}

	.upgrade-choices {
		display: grid;
		grid-template-columns: repeat(3, 180px);
		justify-content: center;
		align-items: center;
		gap: 16px;
	}

	/* Card selection transitions */
	:global(.card-wrapper) {
		transition:
			transform 300ms ease-out,
			opacity 300ms ease-out,
			filter 300ms ease-out;
	}

	:global(.card-wrapper.card-selected) {
		transform: translateY(-12px) scale(1.03) !important;
		filter: brightness(1.2) drop-shadow(0 0 12px rgba(251, 191, 36, 0.5));
		z-index: 1;
	}

	:global(.card-wrapper.card-dismissed) {
		opacity: 0;
		transform: scale(0.92) !important;
	}

	:global(.group:hover:not(:disabled)) .card-flip.flipped {
		transform: rotateY(180deg) translateY(-8px);
	}

	.card-flip {
		position: relative;
		width: 100%;
		transform-style: preserve-3d;
		transition: transform 0.6s ease;
		transform: rotateY(0deg);
	}

	.card-flip.flipped {
		transform: rotateY(180deg);
	}

	.card-face {
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}

	.card-back {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-back-design {
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, #1a1525, #2d2438);
		border: 2px solid #4a3a5a;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			0 0 20px rgba(139, 92, 246, 0.3),
			inset 0 0 30px rgba(0, 0, 0, 0.4);
	}

	.card-back-design.legendary {
		background: linear-gradient(135deg, #1a0f00, #2d1a00);
		border: 2px solid #ffd700;
		box-shadow:
			0 0 30px rgba(255, 215, 0, 0.4),
			inset 0 0 40px rgba(255, 215, 0, 0.1);
	}

	.card-back-inner {
		font-size: 3rem;
		color: rgba(139, 92, 246, 0.6);
		font-weight: bold;
		text-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
	}

	.card-back-design.legendary .card-back-inner {
		color: rgba(255, 215, 0, 0.7);
		text-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
	}

	.card-front {
		transform: rotateY(180deg);
	}

	@media (max-width: 768px) {
		.desktop-grid {
			display: none;
		}
	}
</style>
```

**Expected:** Component has all base styles needed for both themes.

### Step 6: Manual test the component

Create a temporary test page or modify an existing modal to use CardSelectionModal.

Run: `npm run dev`

**Expected:** Component renders without errors in browser, cards flip correctly.

### Step 7: Commit

```bash
git add src/lib/components/CardSelectionModal.svelte
git commit -m "feat: add CardSelectionModal base component

Extract shared card flip/select pattern into reusable component.
Supports themes (default/legendary), custom snippets, and card
customization functions.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add Tests for CardSelectionModal

**Goal:** Create comprehensive test coverage for the base component.

**Files:**

- Create: `src/lib/components/CardSelectionModal.svelte.test.ts`

### Step 1: Write test file skeleton with imports

```typescript
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CardSelectionModal from './CardSelectionModal.svelte';
import { createMockUpgrade, noopArg } from '$lib/test-utils/mock-factories';

const mockCards = [
	createMockUpgrade({ id: 'c1', title: 'Card A' }),
	createMockUpgrade({ id: 'c2', title: 'Card B' }),
	createMockUpgrade({ id: 'c3', title: 'Card C' })
];

describe('CardSelectionModal', () => {
	test('placeholder', () => {
		expect(true).toBe(true);
	});
});
```

Run: `npm test -- CardSelectionModal`

**Expected:** Test file found and placeholder passes.

### Step 2: Add basic rendering tests

```typescript
test('renders cards with default card backs', async () => {
	vi.useFakeTimers();
	try {
		const screen = render(CardSelectionModal, {
			props: { cards: mockCards, onSelect: noopArg }
		});
		// Card backs use '?' symbol for default theme
		const cardBacks = screen.container.querySelectorAll('.card-back-inner');
		expect(cardBacks.length).toBeGreaterThan(0);
		expect(cardBacks[0].textContent?.trim()).toBe('?');
	} finally {
		vi.useRealTimers();
	}
});

test('renders cards with legendary card backs when theme=legendary', async () => {
	vi.useFakeTimers();
	try {
		const screen = render(CardSelectionModal, {
			props: { cards: mockCards, onSelect: noopArg, theme: 'legendary' }
		});
		const cardBacks = screen.container.querySelectorAll('.card-back-inner');
		expect(cardBacks[0].textContent?.trim()).toBe('★');
	} finally {
		vi.useRealTimers();
	}
});
```

Run: `npm test -- CardSelectionModal`

**Expected:** Tests pass, theme variations work.

### Step 3: Add snippet rendering tests

```typescript
test('renders custom header snippet', async () => {
	vi.useFakeTimers();
	try {
		const screen = render(CardSelectionModal, {
			props: {
				cards: mockCards,
				onSelect: noopArg,
				header: () => '<h2>Custom Header</h2>'
			}
		});
		await expect.element(screen.getByText('Custom Header')).toBeInTheDocument();
	} finally {
		vi.useRealTimers();
	}
});

test('renders custom footer snippet', async () => {
	vi.useFakeTimers();
	try {
		const screen = render(CardSelectionModal, {
			props: {
				cards: mockCards,
				onSelect: noopArg,
				footer: () => '<button>Custom Footer</button>'
			}
		});
		await expect.element(screen.getByText('Custom Footer')).toBeInTheDocument();
	} finally {
		vi.useRealTimers();
	}
});
```

Run: `npm test -- CardSelectionModal`

**Expected:** Snippet tests pass.

### Step 4: Add card customization tests

```typescript
test('uses custom getCardTitle function', async () => {
	vi.useFakeTimers();
	try {
		const screen = render(CardSelectionModal, {
			props: {
				cards: mockCards,
				onSelect: noopArg,
				getCardTitle: (card) => `Custom: ${card.title}`
			}
		});
		await expect.element(screen.getByText('Custom: Card A')).toBeInTheDocument();
	} finally {
		vi.useRealTimers();
	}
});

test('respects isCardDisabled function', async () => {
	vi.useFakeTimers();
	try {
		const screen = render(CardSelectionModal, {
			props: {
				cards: mockCards,
				onSelect: noopArg,
				isCardDisabled: (card, index) => index === 1
			}
		});
		const buttons = screen.container.querySelectorAll('.card-wrapper');
		expect(buttons[1]).toHaveAttribute('disabled');
	} finally {
		vi.useRealTimers();
	}
});
```

Run: `npm test -- CardSelectionModal`

**Expected:** Customization function tests pass.

### Step 5: Add selection callback test

```typescript
test('invokes onSelect callback with card and index', async () => {
	vi.useFakeTimers();
	const onSelect = vi.fn();

	try {
		const screen = render(CardSelectionModal, {
			props: { cards: mockCards, onSelect }
		});

		// Wait for flip to enable cards
		vi.advanceTimersByTime(1000);

		const buttons = screen.container.querySelectorAll('.card-wrapper');
		await buttons[0].click();

		// Wait for selection animation
		vi.advanceTimersByTime(500);

		expect(onSelect).toHaveBeenCalledWith(mockCards[0], 0);
	} finally {
		vi.useRealTimers();
	}
});
```

Run: `npm test -- CardSelectionModal`

**Expected:** Selection callback test passes.

### Step 6: Add class prop tests

```typescript
test('applies custom overlay class', async () => {
	vi.useFakeTimers();
	try {
		const screen = render(CardSelectionModal, {
			props: { cards: mockCards, onSelect: noopArg, class: 'exiting' }
		});
		const overlay = screen.container.querySelector('.modal-overlay');
		expect(overlay).toHaveClass('exiting');
	} finally {
		vi.useRealTimers();
	}
});

test('applies custom modal class', async () => {
	vi.useFakeTimers();
	try {
		const screen = render(CardSelectionModal, {
			props: { cards: mockCards, onSelect: noopArg, modalClass: 'custom-modal' }
		});
		const modal = screen.container.querySelector('.modal');
		expect(modal).toHaveClass('custom-modal');
	} finally {
		vi.useRealTimers();
	}
});
```

Run: `npm test -- CardSelectionModal`

**Expected:** All tests pass.

### Step 7: Run full test suite

Run: `npm test`

**Expected:** All tests pass including CardSelectionModal tests.

### Step 8: Commit

```bash
git add src/lib/components/CardSelectionModal.svelte.test.ts
git commit -m "test: add CardSelectionModal component tests

Cover rendering, themes, snippets, customization functions,
callbacks, and class props.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Refactor LegendarySelectionModal

**Goal:** Convert LegendarySelectionModal to use CardSelectionModal (simplest case - no special state).

**Files:**

- Modify: `src/lib/components/LegendarySelectionModal.svelte`

### Step 1: Replace entire component with CardSelectionModal wrapper

```svelte
<script lang="ts">
	import CardSelectionModal from './CardSelectionModal.svelte';
	import type { Upgrade, PlayerStats } from '$lib/types';

	type Props = {
		choices: Upgrade[];
		onSelect: (upgrade: Upgrade | null) => void;
		currentStats?: Partial<PlayerStats>;
	};

	let { choices, onSelect, currentStats }: Props = $props();

	function handleSelect(card: Upgrade, _index: number) {
		onSelect(card);
	}

	function handleSkip() {
		onSelect(null);
	}
</script>

<CardSelectionModal cards={choices} onSelect={handleSelect} {currentStats} theme="legendary">
	{#snippet header()}
		<h2>Choose Your Starting Legendary</h2>
		<p>Select one legendary upgrade to begin your run:</p>
	{/snippet}

	{#snippet footer()}
		<div class="skip-section">
			<button class="skip-button" onclick={handleSkip}>Skip</button>
		</div>
	{/snippet}
</CardSelectionModal>

<style>
	.modal :global(h2) {
		margin: 0 0 8px;
		font-size: 1.8rem;
		color: #ffd700;
		text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
	}

	.modal :global(p) {
		margin: 0 0 24px;
		color: rgba(255, 255, 255, 0.7);
	}

	.skip-section {
		margin-top: 24px;
	}

	.skip-button {
		padding: 0.75rem 2rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		color: white;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.skip-button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.5);
	}

	.skip-button:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
```

**Expected:** File compiles, no import errors.

### Step 2: Manual test in browser

Run: `npm run dev`

Navigate to legendary selection flow (start new game).

**Expected:**

- Modal renders with gold theme
- Cards show ★ on back
- Cards flip and become selectable
- Selection works correctly
- Skip button works

### Step 3: Verify line count reduction

Run: `wc -l src/lib/components/LegendarySelectionModal.svelte`

**Expected:** File reduced from 278 lines to ~70 lines.

### Step 4: Commit

```bash
git add src/lib/components/LegendarySelectionModal.svelte
git commit -m "refactor: use CardSelectionModal in LegendarySelectionModal

Reduce from 278 to ~70 lines by using shared base component.
Maintains identical behavior and appearance.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Refactor ChestLootModal

**Goal:** Convert ChestLootModal to use CardSelectionModal (simple case - just gold display).

**Files:**

- Modify: `src/lib/components/ChestLootModal.svelte`
- Modify: `src/lib/components/ChestLootModal.svelte.test.ts`

### Step 1: Replace component with CardSelectionModal wrapper

```svelte
<script lang="ts">
	import CardSelectionModal from './CardSelectionModal.svelte';
	import type { Upgrade, PlayerStats } from '$lib/types';
	import { formatNumber } from '$lib/format';

	type Props = {
		show: boolean;
		gold: number;
		choices: Upgrade[];
		onSelect: (upgrade: Upgrade) => void;
		exiting?: boolean;
		currentStats?: Partial<PlayerStats>;
	};

	let { show, gold, choices, onSelect, exiting = false, currentStats }: Props = $props();

	function handleSelect(card: Upgrade, _index: number) {
		onSelect(card);
	}
</script>

{#if show}
	<CardSelectionModal
		cards={choices}
		onSelect={handleSelect}
		{currentStats}
		class={exiting ? 'exiting' : ''}
	>
		{#snippet header()}
			<h2>Treasure Found!</h2>
			<p class="gold-reward">+{formatNumber(gold)} Gold</p>
			<p>Choose a reward:</p>
		{/snippet}
	</CardSelectionModal>
{/if}

<style>
	.modal :global(h2) {
		margin: 0 0 8px;
		font-size: 1.8rem;
		color: #fbbf24;
	}

	.gold-reward {
		font-size: 1.4rem;
		color: #fbbf24;
		font-weight: bold;
		margin: 0 0 16px;
	}

	.modal :global(p) {
		margin: 0 0 24px;
		color: rgba(255, 255, 255, 0.7);
	}
</style>
```

**Expected:** File compiles correctly.

### Step 2: Update tests if needed

Review test file and ensure tests still pass with new structure.

Run: `npm test -- ChestLootModal`

**Expected:** All ChestLootModal tests pass.

### Step 3: Manual test in browser

Run: `npm run dev`

Play until chest loot appears.

**Expected:**

- Gold amount displays correctly
- Cards flip and select correctly
- Exit animation works

### Step 4: Verify line count reduction

Run: `wc -l src/lib/components/ChestLootModal.svelte`

**Expected:** File reduced from 277 lines to ~80 lines.

### Step 5: Commit

```bash
git add src/lib/components/ChestLootModal.svelte src/lib/components/ChestLootModal.svelte.test.ts
git commit -m "refactor: use CardSelectionModal in ChestLootModal

Reduce from 277 to ~80 lines. Maintains identical behavior.
All existing tests pass.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Refactor LevelUpModal

**Goal:** Convert LevelUpModal to use CardSelectionModal (medium complexity - pending badge).

**Files:**

- Modify: `src/lib/components/LevelUpModal.svelte`
- Modify: `src/lib/components/LevelUpModal.svelte.test.ts`

### Step 1: Replace component with CardSelectionModal wrapper

```svelte
<script lang="ts">
	import CardSelectionModal from './CardSelectionModal.svelte';
	import type { Upgrade, PlayerStats } from '$lib/types';

	type Props = {
		show: boolean;
		choices: Upgrade[];
		pendingCount: number;
		onSelect: (upgrade: Upgrade) => void;
		exiting?: boolean;
		currentStats?: Partial<PlayerStats>;
	};

	let { show, choices, pendingCount, onSelect, exiting = false, currentStats }: Props = $props();

	function handleSelect(card: Upgrade, _index: number) {
		onSelect(card);
	}
</script>

{#if show}
	<CardSelectionModal
		cards={choices}
		onSelect={handleSelect}
		{currentStats}
		class={exiting ? 'exiting' : ''}
		modalClass={pendingCount > 1 ? 'with-badge' : ''}
	>
		{#snippet header()}
			{#if pendingCount > 1}
				<div class="pending-badge">+{pendingCount - 1} more</div>
			{/if}
			<h2>Level Up!</h2>
			<p>Choose an upgrade:</p>
		{/snippet}
	</CardSelectionModal>
{/if}

<style>
	.modal :global(h2) {
		margin: 0 0 8px;
		font-size: 1.8rem;
		color: #fbbf24;
	}

	.modal :global(p) {
		margin: 0 0 24px;
		color: rgba(255, 255, 255, 0.7);
	}

	.pending-badge {
		position: absolute;
		top: 12px;
		right: 12px;
		background: linear-gradient(135deg, #8b5cf6, #a78bfa);
		color: white;
		padding: 6px 12px;
		border-radius: 20px;
		font-size: 0.9rem;
		font-weight: bold;
		animation: pulse-badge 1s ease-in-out infinite;
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

**Expected:** File compiles, badge positioning works.

### Step 2: Update tests if needed

Run: `npm test -- LevelUpModal`

**Expected:** All LevelUpModal tests pass (especially pending badge test).

### Step 3: Manual test in browser

Run: `npm run dev`

Play until level up with multiple pending levels.

**Expected:**

- Badge shows correct "+X more" count
- Badge animates (pulse)
- Modal functionality unchanged

### Step 4: Verify line count reduction

Run: `wc -l src/lib/components/LevelUpModal.svelte`

**Expected:** File reduced from 295 lines to ~90 lines.

### Step 5: Commit

```bash
git add src/lib/components/LevelUpModal.svelte src/lib/components/LevelUpModal.svelte.test.ts
git commit -m "refactor: use CardSelectionModal in LevelUpModal

Reduce from 295 to ~90 lines. Pending badge implemented
with modalClass prop. All tests pass.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Refactor ShopModal (Part 1 - Structure)

**Goal:** Begin refactoring ShopModal to use CardSelectionModal (most complex - reroll, prices, affordability).

**Files:**

- Modify: `src/lib/components/ShopModal.svelte`

### Step 1: Set up wrapper with all required functions

```svelte
<script lang="ts">
	import CardSelectionModal from './CardSelectionModal.svelte';
	import { Button } from 'bits-ui';
	import type { Upgrade, StatModifier, PlayerStats } from '$lib/types';
	import { formatNumber } from '$lib/format';
	import { EXECUTE_CAP_BONUS_PER_TIER } from '$lib/data/upgrades';
	import { untrack } from 'svelte';

	type Props = {
		show: boolean;
		gold: number;
		choices: Upgrade[];
		getUpgradeLevel: (upgrade: Upgrade) => number;
		rerollCost: number;
		getPrice: (upgrade: Upgrade) => number;
		onBuy: (upgrade: Upgrade) => boolean;
		onReroll: () => void;
		onBack: () => void;
		onPlayAgain: () => void;
		currentStats?: Partial<PlayerStats>;
	};

	let {
		show,
		gold,
		choices,
		getUpgradeLevel,
		rerollCost,
		getPrice,
		onBuy,
		onReroll,
		onBack,
		onPlayAgain,
		currentStats
	}: Props = $props();

	let rerolling = $state(false);
	let rerollGeneration = $state(0);
	let priceSnapshot = $state<number[]>([]);
	let lastChoiceIds = '';

	// Snapshot prices when cards change
	$effect.pre(() => {
		const currentIds = choices.map((c) => c.id).join(',');
		if (show && currentIds && currentIds !== lastChoiceIds) {
			lastChoiceIds = currentIds;
			rerollGeneration++;
			priceSnapshot = choices.map((c) => untrack(() => getPrice(c)));
		}
		if (!show) {
			lastChoiceIds = '';
			priceSnapshot = [];
		}
	});

	const REROLL_FADE_MS = 300;

	function handleReroll() {
		if (rerolling) return;
		rerolling = true;
		setTimeout(() => {
			onReroll();
			rerolling = false;
		}, REROLL_FADE_MS);
	}

	function getModifiers(upgrade: Upgrade): StatModifier[] {
		if (upgrade.id in EXECUTE_CAP_BONUS_PER_TIER)
			return [{ stat: 'executeChance', value: EXECUTE_CAP_BONUS_PER_TIER[upgrade.id] }];
		if (upgrade.id === 'gold_per_kill') return [{ stat: 'goldPerKill', value: 1 }];
		return upgrade.modifiers;
	}

	function getTitle(upgrade: Upgrade): string {
		const level = getUpgradeLevel(upgrade);
		if (level === 0) return upgrade.title;
		return `${upgrade.title} (Lv.${level})`;
	}

	function isDisabled(card: Upgrade, index: number): boolean {
		const price = priceSnapshot[index] ?? 0;
		return gold < price || rerolling;
	}

	function handleBuy(card: Upgrade, _index: number) {
		onBuy(card);
	}
</script>
```

**Expected:** Script section compiles with all logic extracted.

### Step 2: Create modal structure with CardSelectionModal

```svelte
{#if show}
	<CardSelectionModal
		cards={choices}
		onSelect={handleBuy}
		{currentStats}
		getCardTitle={getTitle}
		getCardModifiers={getModifiers}
		isCardDisabled={isDisabled}
		modalClass={rerolling ? 'shop-rerolling' : ''}
	>
		{#snippet header()}
			<h2>Card Shop</h2>
			<p class="gold-display">Your Gold: <span class="gold-amount">{formatNumber(gold)}</span></p>
			<p class="shop-info">Purchased cards give permanent bonuses each run!</p>
		{/snippet}

		{#snippet cardOverlay(card, i)}
			{@const price = priceSnapshot[i] ?? 0}
			{@const canAfford = gold >= price}
			<div class="buy-label" class:affordable={canAfford} class:too-expensive={!canAfford}>
				Buy for {formatNumber(price)}g
			</div>
		{/snippet}

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
					class="py-3 px-8 bg-[#374151] border-none rounded-lg text-white text-base font-bold cursor-pointer transition-[background] duration-200 hover:bg-[#4b5563]"
					onclick={onBack}>Back</Button.Root
				>
				<Button.Root
					class="py-3 px-8 bg-linear-to-r from-[#22c55e] to-[#16a34a] border-none rounded-lg text-white text-base font-bold cursor-pointer transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-[0_4px_20px_rgba(34,197,94,0.4)]"
					onclick={onPlayAgain}>Play Again</Button.Root
				>
			</div>
		{/snippet}
	</CardSelectionModal>
{/if}
```

**Expected:** Modal structure defined with snippets.

### Step 3: Add shop-specific styles

```svelte
<style>
	.modal :global(h2) {
		margin: 0 0 8px;
		font-size: 1.8rem;
		color: #a78bfa;
	}

	.gold-display {
		font-size: 1.2rem;
		color: rgba(255, 255, 255, 0.8);
		margin: 0 0 8px;
	}

	.gold-amount {
		color: #fbbf24;
		font-weight: bold;
	}

	.shop-info {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0 0 24px;
	}

	.buy-label {
		padding: 10px 16px;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: bold;
		text-align: center;
		margin-top: 8px;
	}

	.buy-label.affordable {
		background: linear-gradient(to right, #fbbf24, #f59e0b);
		color: #1a1a2e;
	}

	.buy-label.too-expensive {
		background: #374151;
		color: rgba(255, 255, 255, 0.5);
	}

	.reroll-row {
		display: flex;
		justify-content: center;
		margin-bottom: 16px;
	}

	:global(.reroll-btn) {
		padding: 10px 24px;
		border: none;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: bold;
		cursor: pointer;
		transition:
			transform 200ms,
			box-shadow 200ms;
	}

	:global(.reroll-btn.reroll-affordable) {
		background: linear-gradient(to right, #fbbf24, #f59e0b);
		color: #1a1a2e;
	}

	:global(.reroll-btn.reroll-affordable:hover) {
		transform: scale(1.05);
		box-shadow: 0 4px 20px rgba(251, 191, 36, 0.4);
	}

	:global(.reroll-btn.reroll-disabled) {
		background: #374151;
		color: rgba(255, 255, 255, 0.5);
		cursor: default;
	}

	.button-row {
		display: flex;
		justify-content: center;
		gap: 16px;
	}
</style>
```

**Expected:** Styles compiled, no conflicts with base component.

### Step 4: Manual test basic functionality

Run: `npm run dev`

Die and enter shop.

**Expected:**

- Shop displays correctly
- Gold amount shown
- Cards show prices
- Cards flip

### Step 5: Commit partial implementation

```bash
git add src/lib/components/ShopModal.svelte
git commit -m "refactor: convert ShopModal to CardSelectionModal (WIP)

Extract shop-specific logic into wrapper functions. Use
cardOverlay snippet for price labels. Part 1 of 2.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Refactor ShopModal (Part 2 - Reroll Animation)

**Goal:** Complete ShopModal refactoring by implementing reroll fade animation.

**Files:**

- Modify: `src/lib/components/CardSelectionModal.svelte`
- Modify: `src/lib/components/ShopModal.svelte`

### Step 1: Add reroll fade support to CardSelectionModal

Modify CardSelectionModal to accept an additional class for the upgrade-choices div:

```svelte
<script lang="ts">
	// ... existing Props ...
	type Props = {
		// ... existing props ...
		choicesClass?: string; // NEW: additional class for choices div
	};

	let {
		// ... existing destructure ...
		choicesClass = ''
	}: Props = $props();
</script>

<!-- In template, update upgrade-choices div -->
<div class="upgrade-choices desktop-grid {choicesClass}">
	{#each cards as card, i (card.id)}
		{@render cardButton(card, i)}
	{/each}
</div>
```

**Expected:** CardSelectionModal accepts choicesClass prop.

### Step 2: Update ShopModal to use choicesClass for fade

```svelte
<CardSelectionModal
	cards={choices}
	onSelect={handleBuy}
	{currentStats}
	getCardTitle={getTitle}
	getCardModifiers={getModifiers}
	isCardDisabled={isDisabled}
	choicesClass={rerolling ? 'cards-fading' : ''}
>
	<!-- ... snippets ... -->
</CardSelectionModal>

<style>
	/* ... existing styles ... */

	:global(.upgrade-choices.cards-fading) {
		opacity: 0;
		transition: opacity 300ms ease-out;
	}
</style>
```

**Expected:** Cards fade out during reroll.

### Step 3: Manual test reroll animation

Run: `npm run dev`

Enter shop and click Reroll multiple times.

**Expected:**

- Cards fade out
- New cards fade in
- Price snapshot prevents price flickering
- Reroll cost updates correctly

### Step 4: Verify line count reduction

Run: `wc -l src/lib/components/ShopModal.svelte`

**Expected:** File reduced from 446 lines to ~180 lines.

### Step 5: Run tests

Run: `npm test`

**Expected:** All tests pass.

### Step 6: Commit completion

```bash
git add src/lib/components/CardSelectionModal.svelte src/lib/components/ShopModal.svelte
git commit -m "refactor: complete ShopModal refactoring

Add choicesClass prop to CardSelectionModal for reroll fade.
Reduce ShopModal from 446 to ~180 lines. All functionality
preserved including reroll animation.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Final Testing and Cleanup

**Goal:** Comprehensive manual testing and documentation updates.

### Step 1: Run full test suite

Run: `npm test`

**Expected:** All tests pass.

### Step 2: Manual test all modals in sequence

Run: `npm run dev`

Play through full game flow:

1. Start game → legendary selection
2. Play through waves → level up modal
3. Open chest → chest loot modal
4. Die → shop modal

**Expected:** All modals work identically to before refactoring.

### Step 3: Test edge cases

- Rapidly clicking cards
- Spam clicking reroll
- Skip button in legendary modal
- Multiple pending level ups
- Unaffordable shop items

**Expected:** No crashes, animations smooth, state consistent.

### Step 4: Build for production

Run: `npm run build`

**Expected:** Build succeeds without errors or warnings.

### Step 5: Review line count savings

```bash
wc -l src/lib/components/CardSelectionModal.svelte
wc -l src/lib/components/LegendarySelectionModal.svelte
wc -l src/lib/components/ChestLootModal.svelte
wc -l src/lib/components/LevelUpModal.svelte
wc -l src/lib/components/ShopModal.svelte
```

**Expected:**

- CardSelectionModal: ~350 lines (new)
- LegendarySelectionModal: ~70 lines (was 278)
- ChestLootModal: ~80 lines (was 277)
- LevelUpModal: ~90 lines (was 295)
- ShopModal: ~180 lines (was 446)

Total: ~770 lines (was ~1296 lines) = 40% reduction

### Step 6: Update design doc status

Edit `docs/plans/2026-02-03-card-selection-modal-design.md`:

Change line 4 from:

```markdown
**Status:** Approved
```

To:

```markdown
**Status:** Implemented
```

### Step 7: Final commit

```bash
git add docs/plans/2026-02-03-card-selection-modal-design.md
git commit -m "docs: mark card selection modal consolidation as implemented

Successfully consolidated 4 modals into single reusable component.
Reduced codebase by ~526 lines (40%) while maintaining identical
behavior and appearance.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Summary

**Total Tasks:** 8 tasks, each broken into 2-8 steps

**Files Created:**

- `src/lib/components/CardSelectionModal.svelte`
- `src/lib/components/CardSelectionModal.svelte.test.ts`

**Files Modified:**

- `src/lib/components/LegendarySelectionModal.svelte`
- `src/lib/components/ChestLootModal.svelte`
- `src/lib/components/ChestLootModal.svelte.test.ts`
- `src/lib/components/LevelUpModal.svelte`
- `src/lib/components/LevelUpModal.svelte.test.ts`
- `src/lib/components/ShopModal.svelte`
- `docs/plans/2026-02-03-card-selection-modal-design.md`

**Testing Strategy:**

- Unit tests for CardSelectionModal covering all props and behaviors
- Existing tests for ChestLootModal and LevelUpModal maintained
- Manual testing after each modal refactor
- Full regression testing at end

**Migration Order Rationale:**

1. LegendarySelectionModal - simplest (no exit animation, no special state)
2. ChestLootModal - simple (just gold display + exit animation)
3. LevelUpModal - medium (pending badge + exit animation)
4. ShopModal - complex (reroll, prices, affordability, no exit animation)
