<script lang="ts">
	import { gameState } from '$lib/stores/gameState.svelte';
	import StatGroup from './StatGroup.svelte';
	import StatChart from './StatChart.svelte';
	import type { StatSnapshot } from '$lib/stores/runHistory.svelte';

	const snapshots: StatSnapshot[] = $derived(gameState.runSnapshots);

	// Use sequential index as x-axis label since snapshots include both
	// stage_transition and level_up events
	const labels: number[] = $derived(snapshots.map((_, i) => i + 1));

	// Chart dataset color palette
	const COLORS = {
		damage: '#ef4444',
		critChance: '#f59e0b',
		critMultiplier: '#f97316',
		attackSpeed: '#22d3ee',
		multiStrike: '#a855f7',
		dps: '#8b5cf6',
		poison: '#22c55e',
		poisonStacks: '#16a34a',
		poisonDuration: '#86efac',
		poisonDps: '#15803d',
		execute: '#dc2626',
		executeCap: '#991b1b',
		damageMult: '#fb923c',
		xpMult: '#38bdf8',
		goldPerKill: '#fbbf24',
		goldDrop: '#d97706',
		goldMult: '#f59e0b',
		enemyHp: '#ef4444',
		bossHp: '#dc2626',
		xpToNext: '#818cf8',
		ttk: '#f472b6'
	};
</script>

{#if snapshots.length === 0}
	<p class="empty">Start a run to see progression data.</p>
{:else}
	<div class="chart-grid">
		<StatGroup title="Offensive Stats" expanded={true}>
			<StatChart
				title="Offensive Stats"
				{labels}
				datasets={[
					{
						label: 'Base Damage',
						data: snapshots.map((s) => s.stats.damage),
						borderColor: COLORS.damage
					},
					{
						label: 'Crit Chance %',
						data: snapshots.map((s) => s.stats.critChance * 100),
						borderColor: COLORS.critChance
					},
					{
						label: 'Crit Multiplier',
						data: snapshots.map((s) => s.stats.critMultiplier),
						borderColor: COLORS.critMultiplier
					},
					{
						label: 'Attack Speed',
						data: snapshots.map((s) => s.stats.attackSpeed),
						borderColor: COLORS.attackSpeed
					},
					{
						label: 'Multi-Strike',
						data: snapshots.map((s) => s.stats.multiStrike),
						borderColor: COLORS.multiStrike,
						stepped: 'before'
					},
					{
						label: 'Effective DPS',
						data: snapshots.map((s) => s.computedDps),
						borderColor: COLORS.dps
					}
				]}
			/>
		</StatGroup>

		<StatGroup title="Poison Stats">
			<StatChart
				title="Poison Stats"
				{labels}
				datasets={[
					{
						label: 'Poison/Stack',
						data: snapshots.map((s) => s.stats.poison),
						borderColor: COLORS.poison
					},
					{
						label: 'Max Stacks',
						data: snapshots.map((s) => s.stats.poisonMaxStacks),
						borderColor: COLORS.poisonStacks,
						stepped: 'before'
					},
					{
						label: 'Duration (s)',
						data: snapshots.map((s) => s.stats.poisonDuration),
						borderColor: COLORS.poisonDuration
					},
					{
						label: 'Poison DPS',
						data: snapshots.map((s) => s.poisonDps),
						borderColor: COLORS.poisonDps
					}
				]}
			/>
		</StatGroup>

		<StatGroup title="Execute & Multipliers">
			<StatChart
				title="Execute & Multipliers"
				{labels}
				datasets={[
					{
						label: 'Execute Chance %',
						data: snapshots.map((s) => s.stats.executeChance * 100),
						borderColor: COLORS.execute
					},
					{
						label: 'Execute Cap %',
						data: snapshots.map((s) => s.stats.executeCap * 100),
						borderColor: COLORS.executeCap
					},
					{
						label: 'Damage Multiplier',
						data: snapshots.map((s) => s.stats.damageMultiplier),
						borderColor: COLORS.damageMult
					},
					{
						label: 'XP Multiplier',
						data: snapshots.map((s) => s.stats.xpMultiplier),
						borderColor: COLORS.xpMult
					}
				]}
			/>
		</StatGroup>

		<StatGroup title="Economy">
			<StatChart
				title="Economy"
				{labels}
				datasets={[
					{
						label: 'Gold/Kill',
						data: snapshots.map((s) => s.stats.goldPerKill),
						borderColor: COLORS.goldPerKill
					},
					{
						label: 'Gold Drop %',
						data: snapshots.map((s) => s.stats.goldDropChance * 100),
						borderColor: COLORS.goldDrop
					},
					{
						label: 'Gold Multiplier',
						data: snapshots.map((s) => s.stats.goldMultiplier),
						borderColor: COLORS.goldMult
					}
				]}
			/>
		</StatGroup>

		<StatGroup title="Enemy Scaling">
			<StatChart
				title="Enemy Scaling"
				{labels}
				logScale={true}
				datasets={[
					{
						label: 'Enemy HP',
						data: snapshots.map((s) => s.enemyHp),
						borderColor: COLORS.enemyHp
					},
					{
						label: 'Boss HP',
						data: snapshots.map((s) => s.bossHp),
						borderColor: COLORS.bossHp
					},
					{
						label: 'XP to Next Level',
						data: snapshots.map((s) => s.xpToNextLevel),
						borderColor: COLORS.xpToNext
					}
				]}
			/>
		</StatGroup>

		<StatGroup title="Composite Views">
			<StatChart
				title="Player DPS vs Enemy HP"
				{labels}
				dualAxis={true}
				datasets={[
					{
						label: 'Effective DPS',
						data: snapshots.map((s) => s.computedDps),
						borderColor: COLORS.dps,
						yAxisID: 'y'
					},
					{
						label: 'Enemy HP',
						data: snapshots.map((s) => s.enemyHp),
						borderColor: COLORS.enemyHp,
						yAxisID: 'y1'
					}
				]}
			/>
			<StatChart
				title="Time-to-Kill (seconds)"
				{labels}
				datasets={[
					{ label: 'TTK', data: snapshots.map((s) => s.timeToKill), borderColor: COLORS.ttk }
				]}
			/>
		</StatGroup>
	</div>
{/if}

<style>
	.chart-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
		gap: 16px;
	}
	.empty {
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		padding: 48px 0;
		font-size: 1.1rem;
	}
</style>
