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

{#if show}
	<CardSelectionModal
		cards={choices}
		onSelect={handleBuy}
		{currentStats}
		getCardTitle={getTitle}
		getCardModifiers={getModifiers}
		isCardDisabled={isDisabled}
		choicesClass={rerolling ? 'cards-fading' : ''}
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

<style>
	:global(.modal h2) {
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

	:global(.upgrade-choices.cards-fading) {
		opacity: 0;
		transition: opacity 300ms ease-out;
	}
</style>
