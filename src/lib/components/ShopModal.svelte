<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Upgrade, StatModifier, PlayerStats } from '$lib/types';
	import { formatNumber } from '$lib/format';
	import UpgradeCard from './UpgradeCard.svelte';
	import CardCarousel from './CardCarousel.svelte';
	import { untrack } from 'svelte';
	import { useCardFlip } from './useCardFlip.svelte';
	import { useCardSelect } from './useCardSelect.svelte';

	type Props = {
		show: boolean;
		gold: number;
		choices: Upgrade[];
		executeCapLevel: number;
		goldPerKillLevel: number;
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
		executeCapLevel,
		goldPerKillLevel,
		rerollCost,
		getPrice,
		onBuy,
		onReroll,
		onBack,
		onPlayAgain,
		currentStats
	}: Props = $props();

	const flip = useCardFlip();
	const cardSelect = useCardSelect();

	// Plain variable (not $state) so writing to it doesn't re-trigger the effect
	let lastChoiceIds = '';
	let rerolling = $state(false);
	let rerollGeneration = $state(0);
	// Snapshot prices when cards appear so they don't update mid-animation
	let priceSnapshot = $state<number[]>([]);

	// Pre-effect: runs before DOM update so new cards never flash their front face
	$effect.pre(() => {
		const currentIds = choices.map((c) => c.id).join(',');
		if (show && currentIds && currentIds !== lastChoiceIds) {
			lastChoiceIds = currentIds;
			rerollGeneration++;
			priceSnapshot = choices.map((c) => untrack(() => getPrice(c)));
			cardSelect.cleanup();
			flip.startFlip(choices.length);
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
		if (upgrade.id === 'execute_cap') return [{ stat: 'executeChance', value: 0.005 }];
		if (upgrade.id === 'gold_per_kill') return [{ stat: 'goldPerKill', value: 1 }];
		return upgrade.modifiers;
	}

	function getTitle(upgrade: Upgrade): string {
		if (upgrade.id === 'execute_cap') return `${upgrade.title} (Lv.${executeCapLevel})`;
		if (upgrade.id === 'gold_per_kill') return `${upgrade.title} (Lv.${goldPerKillLevel})`;
		return upgrade.title;
	}

	let transitioning = $derived(
		rerolling || cardSelect.selecting || flip.enabledCards.some((e) => !e)
	);

	function handleBuy(upgrade: Upgrade, index: number) {
		if (!flip.enabledCards[index]) return;
		if (cardSelect.selecting) return;
		cardSelect.select(index, () => onBuy(upgrade));
	}
</script>

{#if show}
	<div class="modal-overlay">
		<div class="modal" class:selecting={cardSelect.selecting}>
			<div class="modal-header" class:content-fade-out={cardSelect.selecting}>
				<h2>Card Shop</h2>
				<p class="gold-display">Your Gold: <span class="gold-amount">{formatNumber(gold)}</span></p>
				<p class="shop-info">Purchased cards give permanent bonuses each run!</p>
			</div>
			<div class="upgrade-choices desktop-grid" class:cards-fading={rerolling}>
				{#each choices as upgrade, i (`${rerollGeneration}-${upgrade.id}`)}
					{@const price = priceSnapshot[i] ?? 0}
					{@const canAfford = gold >= price}
					<Button.Root
						class="group bg-transparent border-none p-0 cursor-pointer [perspective:800px] disabled:cursor-default card-wrapper {cardSelect.selecting
							? cardSelect.selectedIndex === i
								? 'card-selected'
								: 'card-dismissed'
							: ''}"
						disabled={!flip.enabledCards[i] || cardSelect.selecting || !canAfford || rerolling}
						onclick={() => handleBuy(upgrade, i)}
					>
						<div class="card-flip" class:flipped={flip.flippedCards[i]}>
							<div class="card-face card-back">
								<div class="card-back-design">
									<div class="card-back-inner">?</div>
								</div>
							</div>
							<div class="card-face card-front">
								<UpgradeCard
									title={getTitle(upgrade)}
									rarity={upgrade.rarity}
									image={upgrade.image}
									modifiers={getModifiers(upgrade)}
									{currentStats}
								/>
								<div
									class="buy-label"
									class:affordable={canAfford}
									class:too-expensive={!canAfford}
								>
									Buy for {formatNumber(price)}g
								</div>
							</div>
						</div>
					</Button.Root>
				{/each}
			</div>
			<div class="carousel-fade" class:cards-fading={rerolling}>
				<CardCarousel count={choices.length}>
					{#each choices as upgrade, i (`${rerollGeneration}-${upgrade.id}`)}
						{@const price = priceSnapshot[i] ?? 0}
						{@const canAfford = gold >= price}
						<Button.Root
							class="group bg-transparent border-none p-0 cursor-pointer [perspective:800px] disabled:cursor-default card-wrapper {cardSelect.selecting
								? cardSelect.selectedIndex === i
									? 'card-selected'
									: 'card-dismissed'
								: ''}"
							disabled={!flip.enabledCards[i] || cardSelect.selecting || !canAfford || rerolling}
							onclick={() => handleBuy(upgrade, i)}
						>
							<div class="card-flip" class:flipped={flip.flippedCards[i]}>
								<div class="card-face card-back">
									<div class="card-back-design">
										<div class="card-back-inner">?</div>
									</div>
								</div>
								<div class="card-face card-front">
									<UpgradeCard
										title={getTitle(upgrade)}
										rarity={upgrade.rarity}
										image={upgrade.image}
										modifiers={getModifiers(upgrade)}
										{currentStats}
									/>
									<div
										class="buy-label"
										class:affordable={canAfford}
										class:too-expensive={!canAfford}
									>
										Buy for {formatNumber(price)}g
									</div>
								</div>
							</div>
						</Button.Root>
					{/each}
				</CardCarousel>
			</div>

			<div class="reroll-row" class:content-fade-out={cardSelect.selecting}>
				<Button.Root
					class="reroll-btn {gold >= rerollCost ? 'reroll-affordable' : 'reroll-disabled'}"
					disabled={gold < rerollCost || transitioning}
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
		grid-template-columns: repeat(3, 180px);
		justify-content: center;
		align-items: center;
		gap: 16px;
		margin-bottom: 24px;
		transition: opacity 300ms ease-out;
	}

	.upgrade-choices.cards-fading {
		opacity: 0;
	}

	/* Card selection transitions — matches LevelUpModal */
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

	.card-back-inner {
		font-size: 3rem;
		color: rgba(139, 92, 246, 0.6);
		font-weight: bold;
		text-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
	}

	.card-front {
		transform: rotateY(180deg);
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
		transition: opacity 300ms ease-out;
	}

	.reroll-row.content-fade-out {
		opacity: 0;
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

	.carousel-fade {
		transition: opacity 300ms ease-out;
		margin-bottom: 24px;
	}

	.carousel-fade.cards-fading {
		opacity: 0;
	}

	@media (max-width: 768px) {
		.desktop-grid {
			display: none;
		}
	}
</style>
