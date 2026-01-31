<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Upgrade } from '$lib/types';
	import { formatNumber } from '$lib/format';
	import UpgradeCard from './UpgradeCard.svelte';
	import CardCarousel from './CardCarousel.svelte';
	import { useCardFlip } from './useCardFlip.svelte';
	import { useCardSelect } from './useCardSelect.svelte';

	type Props = {
		show: boolean;
		gold: number;
		choices: Upgrade[];
		onSelect: (upgrade: Upgrade) => void;
		exiting?: boolean;
	};

	let { show, gold, choices, onSelect, exiting = false }: Props = $props();

	const flip = useCardFlip();
	const cardSelect = useCardSelect();

	$effect(() => {
		if (show) {
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
</script>

{#if show}
	<div class="modal-overlay" class:exiting>
		<div class="modal" class:selecting={cardSelect.selecting}>
			<div class="modal-header" class:content-fade-out={cardSelect.selecting}>
				<h2>Treasure Found!</h2>
				<p class="gold-reward">+{formatNumber(gold)} Gold</p>
				<p>Choose a reward:</p>
			</div>
			<div class="upgrade-choices desktop-grid">
				{#each choices as upgrade, i (upgrade.id)}
					<Button.Root
						class="group bg-transparent border-none p-0 cursor-pointer [perspective:800px] disabled:cursor-default card-wrapper {cardSelect.selecting ? (cardSelect.selectedIndex === i ? 'card-selected' : 'card-dismissed') : ''}"
						disabled={!flip.enabledCards[i] || cardSelect.selecting}
						onclick={() => handleSelect(upgrade, i)}
					>
						<div class="card-flip" class:flipped={flip.flippedCards[i]}>
							<div class="card-face card-back">
								<div class="card-back-design">
									<div class="card-back-inner">?</div>
								</div>
							</div>
							<div class="card-face card-front">
								<UpgradeCard
									title={upgrade.title}
									rarity={upgrade.rarity}
									image={upgrade.image}
									modifiers={upgrade.modifiers}
								/>
							</div>
						</div>
					</Button.Root>
				{/each}
			</div>
			<CardCarousel count={choices.length}>
				{#each choices as upgrade, i (upgrade.id)}
					<Button.Root
						class="group bg-transparent border-none p-0 cursor-pointer [perspective:800px] disabled:cursor-default card-wrapper {cardSelect.selecting ? (cardSelect.selectedIndex === i ? 'card-selected' : 'card-dismissed') : ''}"
						disabled={!flip.enabledCards[i] || cardSelect.selecting}
						onclick={() => handleSelect(upgrade, i)}
					>
						<div class="card-flip" class:flipped={flip.flippedCards[i]}>
							<div class="card-face card-back">
								<div class="card-back-design">
									<div class="card-back-inner">?</div>
								</div>
							</div>
							<div class="card-face card-front">
								<UpgradeCard
									title={upgrade.title}
									rarity={upgrade.rarity}
									image={upgrade.image}
									modifiers={upgrade.modifiers}
								/>
							</div>
						</div>
					</Button.Root>
				{/each}
			</CardCarousel>
		</div>
	</div>
{/if}

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
	}

	.modal.selecting {
		animation: panel-pulse 350ms ease-in-out;
	}

	@keyframes panel-pulse {
		0% { transform: scale(1); }
		43% { transform: scale(0.98); }
		100% { transform: scale(1); }
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
		color: #fbbf24;
	}

	.gold-reward {
		font-size: 1.4rem;
		color: #fbbf24;
		font-weight: bold;
		margin: 0 0 16px;
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
		transition: transform 300ms ease-out, opacity 300ms ease-out, filter 300ms ease-out;
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

	.card-back-inner {
		font-size: 3rem;
		color: rgba(139, 92, 246, 0.6);
		font-weight: bold;
		text-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
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
