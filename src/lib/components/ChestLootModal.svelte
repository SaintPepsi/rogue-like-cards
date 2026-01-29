<script lang="ts">
	import type { Upgrade } from '$lib/types';
	import { formatNumber } from '$lib/format';
	import UpgradeCard from './UpgradeCard.svelte';
	import CardCarousel from './CardCarousel.svelte';

	type Props = {
		show: boolean;
		gold: number;
		choices: Upgrade[];
		onSelect: (upgrade: Upgrade) => void;
	};

	let { show, gold, choices, onSelect }: Props = $props();

	let flippedCards = $state<boolean[]>([]);
	let flipTimers: ReturnType<typeof setTimeout>[] = [];

	$effect(() => {
		if (show) {
			flippedCards = choices.map(() => false);
			flipTimers.forEach(clearTimeout);
			flipTimers = [];

			choices.forEach((_, i) => {
				const timer = setTimeout(() => {
					flippedCards[i] = true;
				}, 200 + i * 250);
				flipTimers.push(timer);
			});
		}
		return () => flipTimers.forEach(clearTimeout);
	});

	function handleSelect(upgrade: Upgrade, index: number) {
		if (!flippedCards[index]) return;
		onSelect(upgrade);
	}
</script>

{#if show}
	<div class="modal-overlay">
		<div class="modal">
			<h2>Treasure Found!</h2>
			<p class="gold-reward">+{formatNumber(gold)} Gold</p>
			<p>Choose a reward:</p>
			<div class="upgrade-choices desktop-grid">
				{#each choices as upgrade, i (upgrade.id)}
					<button
						class="upgrade-btn"
						disabled={!flippedCards[i]}
						onclick={() => handleSelect(upgrade, i)}
					>
						<div class="card-flip" class:flipped={flippedCards[i]}>
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
					</button>
				{/each}
			</div>
			<CardCarousel count={choices.length}>
				{#each choices as upgrade, i (upgrade.id)}
					<button
						class="upgrade-btn"
						disabled={!flippedCards[i]}
						onclick={() => handleSelect(upgrade, i)}
					>
						<div class="card-flip" class:flipped={flippedCards[i]}>
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
					</button>
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
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	.upgrade-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		perspective: 800px;
	}

	.upgrade-btn:hover:not(:disabled) .card-flip.flipped {
		transform: rotateY(180deg) translateY(-8px);
	}

	.upgrade-btn:disabled {
		cursor: default;
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
