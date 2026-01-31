<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Upgrade } from '$lib/types';
	import { formatNumber } from '$lib/format';
	import UpgradeCard from './UpgradeCard.svelte';
	import CardCarousel from './CardCarousel.svelte';

	type Props = {
		show: boolean;
		gold: number;
		choices: Upgrade[];
		purchasedUpgrades: Set<string>;
		executeCapLevel: number;
		goldPerKillLevel: number;
		getPrice: (upgrade: Upgrade) => number;
		onBuy: (upgrade: Upgrade) => boolean;
		onBack: () => void;
		onPlayAgain: () => void;
	};

	let { show, gold, choices, purchasedUpgrades, executeCapLevel, goldPerKillLevel, getPrice, onBuy, onBack, onPlayAgain }: Props = $props();

	// Track which cards are animating out
	let animatingOut = $state<Set<string>>(new Set());

	function handleBuy(upgrade: Upgrade) {
		const success = onBuy(upgrade);
		if (success) {
			// Animate all cards out, then they'll re-render with new choices
			const ids = new Set(choices.map(c => c.id));
			animatingOut = ids;
			setTimeout(() => {
				animatingOut = new Set();
			}, 400);
		}
	}
</script>

{#if show}
	<div class="modal-overlay">
		<div class="modal">
			<h2>Card Shop</h2>
			<p class="gold-display">Your Gold: <span class="gold-amount">{formatNumber(gold)}</span></p>
			<p class="shop-info">Purchased cards give permanent bonuses each run!</p>
			<div class="upgrade-choices desktop-grid">
				{#each choices as upgrade (upgrade.id)}
					{@const isExecuteCap = upgrade.id === 'execute_cap'}
					{@const isGoldPerKill = upgrade.id === 'gold_per_kill'}
					{@const price = getPrice(upgrade)}
					{@const canAfford = gold >= price}
					{@const alreadyOwned = !isExecuteCap && !isGoldPerKill && purchasedUpgrades.has(upgrade.id)}
					{@const isAnimating = animatingOut.has(upgrade.id)}
					<div class="card-wrapper" class:animate-out={isAnimating}>
						<UpgradeCard
							title={isExecuteCap ? `${upgrade.title} (Lv.${executeCapLevel})` : isGoldPerKill ? `${upgrade.title} (Lv.${goldPerKillLevel})` : upgrade.title}
							rarity={upgrade.rarity}
							image={upgrade.image}
							modifiers={upgrade.modifiers}
						/>
						<Button.Root
							class="py-2.5 px-4 border-none rounded-lg text-[0.95rem] font-bold cursor-pointer transition-[transform,box-shadow] duration-200 {canAfford && !alreadyOwned ? 'bg-linear-to-r from-[#fbbf24] to-[#f59e0b] text-[#1a1a2e] hover:scale-105 hover:shadow-[0_4px_20px_rgba(251,191,36,0.4)]' : alreadyOwned ? 'bg-[#22c55e] text-white cursor-default' : 'bg-[#374151] text-white/50 cursor-not-allowed'}"
							disabled={!canAfford || alreadyOwned}
							onclick={() => handleBuy(upgrade)}
						>
							{#if alreadyOwned}
								Owned
							{:else}
								Buy for {formatNumber(price)}g
							{/if}
						</Button.Root>
					</div>
				{/each}
			</div>
			<CardCarousel count={choices.length}>
				{#each choices as upgrade (upgrade.id)}
					{@const isExecuteCap = upgrade.id === 'execute_cap'}
					{@const isGoldPerKill = upgrade.id === 'gold_per_kill'}
					{@const price = getPrice(upgrade)}
					{@const canAfford = gold >= price}
					{@const alreadyOwned = !isExecuteCap && !isGoldPerKill && purchasedUpgrades.has(upgrade.id)}
					{@const isAnimating = animatingOut.has(upgrade.id)}
					<div class="card-wrapper" class:animate-out={isAnimating}>
						<UpgradeCard
							title={isExecuteCap ? `${upgrade.title} (Lv.${executeCapLevel})` : isGoldPerKill ? `${upgrade.title} (Lv.${goldPerKillLevel})` : upgrade.title}
							rarity={upgrade.rarity}
							image={upgrade.image}
							modifiers={upgrade.modifiers}
						/>
						<Button.Root
							class="py-2.5 px-4 border-none rounded-lg text-[0.95rem] font-bold cursor-pointer transition-[transform,box-shadow] duration-200 {canAfford && !alreadyOwned ? 'bg-linear-to-r from-[#fbbf24] to-[#f59e0b] text-[#1a1a2e] hover:scale-105 hover:shadow-[0_4px_20px_rgba(251,191,36,0.4)]' : alreadyOwned ? 'bg-[#22c55e] text-white cursor-default' : 'bg-[#374151] text-white/50 cursor-not-allowed'}"
							disabled={!canAfford || alreadyOwned}
							onclick={() => handleBuy(upgrade)}
						>
							{#if alreadyOwned}
								Owned
							{:else}
								Buy for {formatNumber(price)}g
							{/if}
						</Button.Root>
					</div>
				{/each}
			</CardCarousel>

			<div class="button-row">
				<Button.Root class="py-3 px-8 bg-[#374151] border-none rounded-lg text-white text-base font-bold cursor-pointer transition-[background] duration-200 hover:bg-[#4b5563]" onclick={onBack}>Back</Button.Root>
				<Button.Root class="py-3 px-8 bg-linear-to-r from-[#22c55e] to-[#16a34a] border-none rounded-lg text-white text-base font-bold cursor-pointer transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-[0_4px_20px_rgba(34,197,94,0.4)]" onclick={onPlayAgain}>Play Again</Button.Root>
			</div>
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

	.upgrade-choices {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
		margin-bottom: 24px;
	}

	.card-wrapper {
		display: flex;
		flex-direction: column;
		gap: 8px;
		transition: opacity 0.35s ease, transform 0.35s ease;
	}

	.card-wrapper.animate-out {
		opacity: 0;
		transform: scale(0.85) translateY(20px);
		pointer-events: none;
	}

	.button-row {
		display: flex;
		justify-content: center;
		gap: 16px;
	}

	@media (max-width: 768px) {
		.desktop-grid {
			display: none;
		}
	}
</style>
