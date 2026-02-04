<script lang="ts">
	import type { Upgrade } from '$lib/types';
	import UpgradeCard from '$lib/components/UpgradeCard.svelte';

	interface Props {
		weights: Record<string, number>;
		cards: Upgrade[];
		filteredRarity?: string;
	}

	const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

	const rarityColors: Record<string, string> = {
		common: '#9ca3af',
		uncommon: '#22c55e',
		rare: '#3b82f6',
		epic: '#a855f7',
		legendary: '#eab308'
	};

	let { weights, cards, filteredRarity }: Props = $props();

	function formatChance(weight: number): string {
		const percent = weight * 100;
		if (percent >= 1) return `${percent.toFixed(1)}%`;
		if (percent >= 0.01) return `${percent.toFixed(3)}%`;
		if (percent >= 0.0001) return `${percent.toFixed(5)}%`;
		if (weight > 0) return `1 in ${Math.round(1 / weight).toLocaleString()}`;
		return '0%';
	}
</script>

<table>
	<thead>
		<tr>
			<th>Rarity</th>
			<th>Chance</th>
			<th>Bar</th>
		</tr>
	</thead>
	<tbody>
		{#each rarities as rarity (rarity)}
			{@const isFiltered = rarity === filteredRarity}
			<tr class:filtered={isFiltered}>
				<td style="color: {rarityColors[rarity]}; font-weight: bold; text-transform: capitalize;">
					{rarity}
				</td>
				<td class="chance">
					{isFiltered ? 'filtered' : formatChance(weights[rarity])}
				</td>
				<td class="bar-cell">
					{#if !isFiltered}
						<div
							class="bar"
							style="width: {Math.max(1, weights[rarity] * 100)}%; background: {rarityColors[
								rarity
							]};"
						></div>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

{#if cards.length > 0}
	<div class="card-preview">
		{#each cards as card (card.id)}
			<UpgradeCard
				title={card.title}
				rarity={card.rarity}
				image={card.image}
				modifiers={card.modifiers}
			/>
		{/each}
	</div>
{/if}

<style>
	table {
		width: 100%;
		border-collapse: collapse;
	}

	th {
		text-align: left;
		padding: 8px 12px;
		color: #71717a;
		font-size: 0.85rem;
		border-bottom: 1px solid #2a2a3e;
	}

	td {
		padding: 10px 12px;
	}

	.chance {
		font-family: monospace;
		text-align: right;
		white-space: nowrap;
	}

	.bar-cell {
		width: 50%;
	}

	.bar {
		height: 20px;
		border-radius: 4px;
		min-width: 2px;
		transition: width 150ms ease-out;
	}

	.filtered td {
		opacity: 0.3;
	}

	.card-preview {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		margin-top: 16px;
		padding-top: 16px;
		border-top: 1px solid #2a2a3e;
	}
</style>
