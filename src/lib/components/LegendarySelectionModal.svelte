<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Upgrade, PlayerStats } from '$lib/types';
	import UpgradeCard from './UpgradeCard.svelte';
	import CardCarousel from './CardCarousel.svelte';
	import { useCardFlip } from './useCardFlip.svelte';
	import { useCardSelect } from './useCardSelect.svelte';

	type Props = {
		choices: Upgrade[];
		onSelect: (upgrade: Upgrade | null) => void;
		currentStats?: Partial<PlayerStats>;
	};

	let { choices, onSelect, currentStats }: Props = $props();

	const flip = useCardFlip();
	const cardSelect = useCardSelect();

	$effect(() => {
		if (choices.length > 0) {
			flip.startFlip(choices.length);
		}
		return () => {
			flip.cleanup();
			cardSelect.cleanup();
		};
	});

	function handleSelect(upgrade: Upgrade, index: number) {
		if (!flip.enabledCards[index]) return;
		if (cardSelect.selecting) return;
		cardSelect.select(index, () => onSelect(upgrade));
	}

	function handleSkip() {
		if (cardSelect.selecting) return;
		onSelect(null);
	}
</script>

{#snippet cardButton(upgrade: Upgrade, i: number)}
	<Button.Root
		class="group bg-transparent border-none p-0 cursor-pointer [perspective:800px] disabled:cursor-default card-wrapper {cardSelect.selecting
			? cardSelect.selectedIndex === i
				? 'card-selected'
				: 'card-dismissed'
			: ''}"
		disabled={!flip.enabledCards[i] || cardSelect.selecting}
		onclick={() => handleSelect(upgrade, i)}
	>
		<div class="card-flip" class:flipped={flip.flippedCards[i]}>
			<div class="card-face card-back">
				<div class="card-back-design legendary">
					<div class="card-back-inner">★</div>
				</div>
			</div>
			<div class="card-face card-front">
				<UpgradeCard
					title={upgrade.title}
					rarity={upgrade.rarity}
					image={upgrade.image}
					modifiers={upgrade.modifiers}
					{currentStats}
				/>
			</div>
		</div>
	</Button.Root>
{/snippet}

<div class="modal-overlay">
	<div class="modal" class:selecting={cardSelect.selecting}>
		<div class="modal-header" class:content-fade-out={cardSelect.selecting}>
			<h2>Choose Your Starting Legendary</h2>
			<p>Select one legendary upgrade to begin your run:</p>
		</div>
		<div class="upgrade-choices desktop-grid">
			{#each choices as upgrade, i (upgrade.id)}
				{@render cardButton(upgrade, i)}
			{/each}
		</div>
		<CardCarousel count={choices.length}>
			{#each choices as upgrade, i (upgrade.id)}
				{@render cardButton(upgrade, i)}
			{/each}
		</CardCarousel>
		<div class="skip-section" class:content-fade-out={cardSelect.selecting}>
			<button class="skip-button" onclick={handleSkip} disabled={cardSelect.selecting}>
				Skip
			</button>
		</div>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: linear-gradient(135deg, #1a0033 0%, #0d001a 100%);
		border: 2px solid #ffd700;
		padding: 32px;
		border-radius: 16px;
		text-align: center;
		max-width: 90vw;
		position: relative;
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

	.modal-header {
		transition: opacity 300ms ease-out;
	}

	.modal-header.content-fade-out {
		opacity: 0;
	}

	.modal h2 {
		margin: 0 0 8px;
		font-size: 1.8rem;
		color: #ffd700;
		text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
	}

	.modal p {
		margin: 0 0 24px;
		color: rgba(255, 255, 255, 0.7);
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
		filter: brightness(1.2) drop-shadow(0 0 12px rgba(255, 215, 0, 0.8));
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
		color: rgba(255, 215, 0, 0.7);
		font-weight: bold;
		text-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
	}

	.card-front {
		transform: rotateY(180deg);
	}

	.skip-section {
		margin-top: 24px;
		transition: opacity 300ms ease-out;
	}

	.skip-section.content-fade-out {
		opacity: 0;
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

	@media (max-width: 768px) {
		.desktop-grid {
			display: none;
		}
	}
</style>
