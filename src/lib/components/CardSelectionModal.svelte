<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { PlayerStats, StatModifier, Upgrade } from '$lib/types';
	import { Button } from 'bits-ui';
	import CardCarousel from './CardCarousel.svelte';
	import UpgradeCard from './UpgradeCard.svelte';
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
		choicesClass?: string;
		testId?: string;
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
		modalClass = '',
		choicesClass = '',
		testId
	}: Props = $props();

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

<div class="modal-overlay {overlayClass}" data-testid={testId}>
	<div class="modal {modalClass} theme-{theme}" class:selecting={cardSelect.selecting}>
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
	</div>
</div>

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
