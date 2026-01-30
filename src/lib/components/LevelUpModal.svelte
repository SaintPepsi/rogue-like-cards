<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Upgrade } from '$lib/types';
	import UpgradeCard from './UpgradeCard.svelte';
	import CardCarousel from './CardCarousel.svelte';
	import { useCardFlip } from './useCardFlip.svelte';
	import { useCardSelect } from './useCardSelect.svelte';

	type Props = {
		show: boolean;
		choices: Upgrade[];
		pendingCount: number;
		onSelect: (upgrade: Upgrade) => void;
	};

	let { show, choices, pendingCount, onSelect }: Props = $props();

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
	<div class="modal-overlay">
		<div class="modal" class:selecting={cardSelect.selecting}>
			{#if pendingCount > 1}
				<div class="pending-badge">+{pendingCount - 1} more</div>
			{/if}
			<div class="modal-header" class:content-fade-out={cardSelect.selecting} class:content-fade-in={cardSelect.phaseIn}>
				<h2>Level Up!</h2>
				<p>Choose an upgrade:</p>
			</div>
			<div class="upgrade-choices desktop-grid" class:content-fade-in={cardSelect.phaseIn}>
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
									stats={upgrade.stats}
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
									stats={upgrade.stats}
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

	.modal {
		background: #1a1a2e;
		padding: 32px;
		border-radius: 16px;
		text-align: center;
		max-width: 90vw;
		position: relative;
	}

	.modal.selecting {
		animation: panel-pulse 350ms ease-in-out;
	}

	@keyframes panel-pulse {
		0% { transform: scale(1); }
		43% { transform: scale(0.98); }
		100% { transform: scale(1); }
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
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.05); }
	}

	.modal-header {
		transition: opacity 300ms ease-out;
	}

	.modal-header.content-fade-out {
		opacity: 0;
	}

	.modal-header.content-fade-in {
		animation: fade-in 200ms ease-out;
	}

	.modal h2 {
		margin: 0 0 8px;
		font-size: 1.8rem;
		color: #fbbf24;
	}

	.modal p {
		margin: 0 0 24px;
		color: rgba(255, 255, 255, 0.7);
	}

	.upgrade-choices {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	.upgrade-choices.content-fade-in {
		animation: fade-in 200ms ease-out;
	}

	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
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
