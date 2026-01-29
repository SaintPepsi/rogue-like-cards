<script lang="ts">
	import type { Upgrade } from '$lib/types';
	import UpgradeCard from './UpgradeCard.svelte';
	import CardCarousel from './CardCarousel.svelte';

	type Props = {
		show: boolean;
		gold: number;
		choices: Upgrade[];
		onSelect: (upgrade: Upgrade) => void;
	};

	let { show, gold, choices, onSelect }: Props = $props();

	let selectionEnabled = $state(false);
	let delayTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (show) {
			selectionEnabled = false;
			clearTimeout(delayTimer);
			delayTimer = setTimeout(() => {
				selectionEnabled = true;
			}, 1000);
		}
		return () => clearTimeout(delayTimer);
	});

	function handleSelect(upgrade: Upgrade) {
		if (!selectionEnabled) return;
		onSelect(upgrade);
	}
</script>

{#if show}
	<div class="modal-overlay">
		<div class="modal">
			<h2>Treasure Found!</h2>
			<p class="gold-reward">+{gold} Gold</p>
			<p>Choose a reward:</p>
			<div class="upgrade-choices desktop-grid" class:selection-blocked={!selectionEnabled}>
				{#each choices as upgrade (upgrade.id)}
					<button class="upgrade-btn" disabled={!selectionEnabled} onclick={() => handleSelect(upgrade)}>
						<UpgradeCard
							title={upgrade.title}
							rarity={upgrade.rarity}
							image={upgrade.image}
							stats={upgrade.stats}
						/>
					</button>
				{/each}
			</div>
			<CardCarousel count={choices.length}>
				{#each choices as upgrade (upgrade.id)}
					<button class="upgrade-btn" disabled={!selectionEnabled} class:selection-blocked={!selectionEnabled} onclick={() => handleSelect(upgrade)}>
						<UpgradeCard
							title={upgrade.title}
							rarity={upgrade.rarity}
							image={upgrade.image}
							stats={upgrade.stats}
						/>
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
		transition: transform 0.2s;
	}

	.upgrade-btn:hover:not(:disabled) {
		transform: translateY(-8px);
	}

	.upgrade-btn:disabled {
		cursor: default;
	}

	.selection-blocked {
		opacity: 0.5;
		transition: opacity 0.3s ease;
	}

	@media (max-width: 768px) {
		.desktop-grid {
			display: none;
		}
	}
</style>
