<script lang="ts">
	import { getRarityWeights } from '$lib/data/upgrades';

	let luckyPercent = $state(0);

	const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

	const rarityColors: Record<string, string> = {
		common: '#9ca3af',
		uncommon: '#22c55e',
		rare: '#3b82f6',
		epic: '#a855f7',
		legendary: '#eab308'
	};

	let weights = $derived(getRarityWeights(luckyPercent / 100));

	function formatChance(weight: number): string {
		const pct = weight * 100;
		if (pct >= 1) return `${pct.toFixed(1)}%`;
		if (pct >= 0.01) return `${pct.toFixed(3)}%`;
		if (pct >= 0.0001) return `${pct.toFixed(5)}%`;
		return `${pct.toExponential(2)}%`;
	}

	// Chest lucky: max(1.0, lucky) * 2
	let chestWeights = $derived(getRarityWeights(Math.max(1.0, luckyPercent / 100) * 2));
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
			<h2>Level-Up Drops</h2>
			<table>
				<thead>
					<tr>
						<th>Rarity</th>
						<th>Chance</th>
						<th>Bar</th>
					</tr>
				</thead>
				<tbody>
					{#each rarities as rarity}
						<tr>
							<td
								style="color: {rarityColors[
									rarity
								]}; font-weight: bold; text-transform: capitalize;"
							>
								{rarity}
							</td>
							<td class="chance">{formatChance(weights[rarity])}</td>
							<td class="bar-cell">
								<div
									class="bar"
									style="width: {Math.max(1, weights[rarity] * 100)}%; background: {rarityColors[
										rarity
									]};"
								></div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="table-section">
			<h2>Chest Drops <span class="subtitle">(2x luck, 100% base, uncommon min)</span></h2>
			<table>
				<thead>
					<tr>
						<th>Rarity</th>
						<th>Chance</th>
						<th>Bar</th>
					</tr>
				</thead>
				<tbody>
					{#each rarities as rarity}
						{@const isFiltered = rarity === 'common'}
						<tr class:filtered={isFiltered}>
							<td
								style="color: {rarityColors[
									rarity
								]}; font-weight: bold; text-transform: capitalize;"
							>
								{rarity}
							</td>
							<td class="chance">
								{isFiltered ? 'filtered' : formatChance(chestWeights[rarity])}
							</td>
							<td class="bar-cell">
								{#if !isFiltered}
									<div
										class="bar"
										style="width: {Math.max(
											1,
											chestWeights[rarity] * 100
										)}%; background: {rarityColors[rarity]};"
									></div>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<a href="/" class="back-link">Back to game</a>
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
		margin-bottom: 12px;
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
