<script lang="ts">
	import type { Upgrade } from '$lib/types';
	import UpgradeCard from './UpgradeCard.svelte';
	import CardCarousel from './CardCarousel.svelte';

	type Props = {
		show: boolean;
		gold: number;
		choices: Upgrade[];
		purchasedUpgrades: Set<string>;
		executeCap: number;
		executeCapPrice: number;
		getPrice: (index: number) => number;
		onBuy: (upgrade: Upgrade, index: number) => boolean;
		onBuyExecuteCap: () => boolean;
		onBack: () => void;
		onPlayAgain: () => void;
	};

	let { show, gold, choices, purchasedUpgrades, executeCap, executeCapPrice, getPrice, onBuy, onBuyExecuteCap, onBack, onPlayAgain }: Props = $props();

	function handleBuy(upgrade: Upgrade, index: number) {
		onBuy(upgrade, index);
	}
</script>

{#if show}
	<div class="modal-overlay">
		<div class="modal">
			<h2>Card Shop</h2>
			<p class="gold-display">Your Gold: <span class="gold-amount">{gold}</span></p>
			<p class="shop-info">Purchased cards give permanent bonuses each run!</p>
			<div class="upgrade-choices desktop-grid">
				{#each choices as upgrade, index (upgrade.id)}
					{@const price = getPrice(index)}
					{@const canAfford = gold >= price}
					{@const alreadyOwned = purchasedUpgrades.has(upgrade.id)}
					<div class="card-wrapper">
						<UpgradeCard
							title={upgrade.title}
							rarity={upgrade.rarity}
							image={upgrade.image}
							stats={upgrade.stats}
						/>
						<button
							class="buy-btn"
							class:affordable={canAfford && !alreadyOwned}
							class:owned={alreadyOwned}
							disabled={!canAfford || alreadyOwned}
							onclick={() => handleBuy(upgrade, index)}
						>
							{#if alreadyOwned}
								Owned
							{:else}
								Buy for {price}g
							{/if}
						</button>
					</div>
				{/each}
			</div>
			<CardCarousel count={choices.length}>
				{#each choices as upgrade, index (upgrade.id)}
					{@const price = getPrice(index)}
					{@const canAfford = gold >= price}
					{@const alreadyOwned = purchasedUpgrades.has(upgrade.id)}
					<div class="card-wrapper">
						<UpgradeCard
							title={upgrade.title}
							rarity={upgrade.rarity}
							image={upgrade.image}
							stats={upgrade.stats}
						/>
						<button
							class="buy-btn"
							class:affordable={canAfford && !alreadyOwned}
							class:owned={alreadyOwned}
							disabled={!canAfford || alreadyOwned}
							onclick={() => handleBuy(upgrade, index)}
						>
							{#if alreadyOwned}
								Owned
							{:else}
								Buy for {price}g
							{/if}
						</button>
					</div>
				{/each}
			</CardCarousel>

			<div class="special-section">
				<h3>Special</h3>
				<div class="execute-cap-card">
					<div class="cap-info">
						<span class="cap-title">Executioner's Pact</span>
						<span class="cap-desc">Raise execute chance cap by +5%</span>
						<span class="cap-current">Current cap: {Math.round(executeCap * 100)}%</span>
					</div>
					{@const canAffordCap = gold >= executeCapPrice}
					<button
						class="buy-btn"
						class:affordable={canAffordCap}
						disabled={!canAffordCap}
						onclick={onBuyExecuteCap}
					>
						Buy for {executeCapPrice}g
					</button>
				</div>
			</div>

			<div class="button-row">
				<button class="back-btn" onclick={onBack}>Back</button>
				<button class="play-btn" onclick={onPlayAgain}>Play Again</button>
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
	}

	.buy-btn {
		padding: 10px 16px;
		border: none;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: bold;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
		background: #374151;
		color: rgba(255, 255, 255, 0.5);
	}

	.buy-btn.affordable {
		background: linear-gradient(90deg, #fbbf24, #f59e0b);
		color: #1a1a2e;
		cursor: pointer;
	}

	.buy-btn.affordable:hover {
		transform: scale(1.05);
		box-shadow: 0 4px 20px rgba(251, 191, 36, 0.4);
	}

	.buy-btn.owned {
		background: #22c55e;
		color: white;
		cursor: default;
	}

	.buy-btn:disabled:not(.owned) {
		cursor: not-allowed;
	}

	.special-section {
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		margin: 16px 0;
		padding-top: 16px;
	}

	.special-section h3 {
		margin: 0 0 12px;
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.6);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.execute-cap-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: rgba(139, 92, 246, 0.1);
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 16px;
	}

	.cap-info {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
	}

	.cap-title {
		font-weight: bold;
		font-size: 1rem;
		color: #a78bfa;
	}

	.cap-desc {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.cap-current {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.button-row {
		display: flex;
		justify-content: center;
		gap: 16px;
	}

	.back-btn {
		padding: 12px 32px;
		background: #374151;
		border: none;
		border-radius: 8px;
		color: white;
		font-size: 1rem;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.2s;
	}

	.back-btn:hover {
		background: #4b5563;
	}

	.play-btn {
		padding: 12px 32px;
		background: linear-gradient(90deg, #22c55e, #16a34a);
		border: none;
		border-radius: 8px;
		color: white;
		font-size: 1rem;
		font-weight: bold;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.play-btn:hover {
		transform: scale(1.05);
		box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4);
	}

	@media (max-width: 768px) {
		.desktop-grid {
			display: none;
		}
	}
</style>
