<script lang="ts">
	import { resolve } from '$app/paths';
	import { getRarityWeights, getRandomUpgrades } from '$lib/data/upgrades';
	import type { Upgrade } from '$lib/types';
	import RarityTable from './RarityTable.svelte';

	let luckyPercent = $state(0);
	let chestLuckyPercent = $state(100);

	const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

	let weights = $derived(getRarityWeights(luckyPercent / 100));

	let combinedChestLucky = $derived((luckyPercent + chestLuckyPercent) / 100);

	// Chest filters out common, so redistribute its weight across remaining tiers
	let chestWeights = $derived.by(() => {
		const raw = getRarityWeights(combinedChestLucky);
		const remaining = rarities.filter((r) => r !== 'common');
		const remainingTotal = remaining.reduce((sum, r) => sum + raw[r], 0);
		const redistributed: Record<string, number> = { common: 0 };
		for (const r of remaining) {
			redistributed[r] = remainingTotal > 0 ? raw[r] / remainingTotal : 0;
		}
		return redistributed;
	});

	let levelUpCards = $state<Upgrade[]>([]);
	let chestCards = $state<Upgrade[]>([]);

	function rollLevelUp() {
		levelUpCards = getRandomUpgrades(3, luckyPercent / 100);
	}

	function rollChest() {
		chestCards = getRandomUpgrades(3, combinedChestLucky, 0, 0.05, 0, 'uncommon');
	}
</script>

<div class="page">
	<h1>Rarity Simulator</h1>

	<div class="input-row">
		<label for="lucky-input">Lucky Stat</label>
		<input id="lucky-input" type="number" min="0" max="10000" step="1" bind:value={luckyPercent} />
		<span class="unit">%</span>
		<input type="range" min="0" max="1000" step="1" bind:value={luckyPercent} class="slider" />
	</div>

	<div class="tables">
		<div class="table-section">
			<div class="section-header">
				<h2>Level-Up Drops</h2>
				<button class="roll-btn" onclick={rollLevelUp}>Roll Cards</button>
			</div>
			<RarityTable {weights} cards={levelUpCards} />
		</div>

		<div class="table-section">
			<div class="input-row compact">
				<label for="chest-lucky-input">Chest Bonus</label>
				<input
					id="chest-lucky-input"
					type="number"
					min="0"
					max="10000"
					step="1"
					bind:value={chestLuckyPercent}
				/>
				<span class="unit">%</span>
				<input
					type="range"
					min="0"
					max="1000"
					step="1"
					bind:value={chestLuckyPercent}
					class="slider"
				/>
				<span class="combined">= {luckyPercent + chestLuckyPercent}% total</span>
			</div>
			<div class="section-header">
				<h2>Chest Drops <span class="subtitle">(uncommon min)</span></h2>
				<button class="roll-btn" onclick={rollChest}>Roll Cards</button>
			</div>
			<RarityTable weights={chestWeights} cards={chestCards} filteredRarity="common" />
		</div>
	</div>

	<a href={resolve('/')} class="back-link">Back to game</a>
</div>

<style>
	.page {
		max-width: 800px;
		margin: 0 auto;
		padding: 32px 16px;
		color: white;
		font-family: system-ui, sans-serif;
	}

	h1 {
		text-align: center;
		color: #a78bfa;
		margin-bottom: 32px;
	}

	h2 {
		color: #d4d4d8;
		font-size: 1.2rem;
		margin: 0;
	}

	.subtitle {
		color: #71717a;
		font-size: 0.85rem;
		font-weight: normal;
	}

	.input-row {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 32px;
		background: #1a1a2e;
		padding: 16px 20px;
		border-radius: 12px;
	}

	label {
		font-weight: bold;
		color: #a78bfa;
		white-space: nowrap;
	}

	input[type='number'] {
		width: 80px;
		padding: 8px 12px;
		background: #0f0f1a;
		border: 1px solid #4a3a5a;
		border-radius: 8px;
		color: white;
		font-size: 1rem;
		text-align: right;
	}

	.unit {
		color: #71717a;
		font-size: 1rem;
	}

	.slider {
		flex: 1;
		accent-color: #a855f7;
	}

	.input-row.compact {
		margin-bottom: 12px;
		padding: 10px 16px;
		background: #0f0f1a;
		border-radius: 8px;
	}

	.combined {
		color: #71717a;
		font-size: 0.85rem;
		white-space: nowrap;
	}

	.tables {
		display: flex;
		flex-direction: column;
		gap: 32px;
	}

	.table-section {
		background: #1a1a2e;
		padding: 20px;
		border-radius: 12px;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.roll-btn {
		padding: 8px 16px;
		background: linear-gradient(to right, #a855f7, #7c3aed);
		border: none;
		border-radius: 8px;
		color: white;
		font-weight: bold;
		font-size: 0.85rem;
		cursor: pointer;
		transition:
			transform 150ms,
			box-shadow 150ms;
	}

	.roll-btn:hover {
		transform: scale(1.05);
		box-shadow: 0 4px 16px rgba(168, 85, 247, 0.4);
	}

	.roll-btn:active {
		transform: scale(0.97);
	}

	.back-link {
		display: block;
		text-align: center;
		margin-top: 32px;
		color: #a78bfa;
		text-decoration: none;
	}

	.back-link:hover {
		text-decoration: underline;
	}
</style>
