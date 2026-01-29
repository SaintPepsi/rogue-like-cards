<script lang="ts">
	import type { PlayerStats, Effect } from '$lib/types';
	import { formatNumber } from '$lib/format';

	type Props = {
		stats: PlayerStats;
		effects: Effect[];
	};

	let { stats, effects }: Props = $props();
</script>

<aside class="stats-panel">
	<h2>Stats</h2>
	<!-- Always show damage -->
	<div class="stat-row">
		<span>⚔️ Damage</span>
		<span>{formatNumber(stats.damage)}</span>
	</div>
	<!-- Only show other stats when improved from default -->
	{#if stats.critChance > 0}
		<div class="stat-row">
			<span>🎯 Crit Chance</span>
			<span>{Math.round(stats.critChance * 100)}%</span>
		</div>
	{/if}
	{#if stats.critMultiplier > 1.5}
		<div class="stat-row">
			<span>💥 Crit Damage</span>
			<span>{stats.critMultiplier.toFixed(1)}x</span>
		</div>
	{/if}
	{#if stats.poison > 0}
		<div class="stat-row poison">
			<span>☠️ Poison</span>
			<span>{formatNumber(stats.poison)}/sec</span>
		</div>
	{/if}
	{#if stats.poisonCritChance > 0}
		<div class="stat-row poison">
			<span>💀 Poison Crit</span>
			<span>{Math.round(stats.poisonCritChance * 100)}%</span>
		</div>
	{/if}
	{#if stats.multiStrike > 0}
		<div class="stat-row">
			<span>⚡ Multi-Strike</span>
			<span>+{stats.multiStrike}</span>
		</div>
	{/if}
	{#if stats.executeChance > 0}
		<div class="stat-row">
			<span>⚰️ Execute</span>
			<span>{Math.round(stats.executeChance * 100)}%</span>
		</div>
	{/if}
	{#if stats.overkill}
		<div class="stat-row">
			<span>💀 Overkill</span>
			<span>Active</span>
		</div>
	{/if}
	{#if stats.xpMultiplier > 1}
		<div class="stat-row">
			<span>✨ XP Bonus</span>
			<span>+{Math.round((stats.xpMultiplier - 1) * 100)}%</span>
		</div>
	{/if}
	{#if stats.bonusBossTime > 0}
		<div class="stat-row">
			<span>⏱️ Boss Time</span>
			<span>+{stats.bonusBossTime}s</span>
		</div>
	{/if}
	{#if stats.luckyChance > 0}
		<div class="stat-row">
			<span>🍀 Lucky</span>
			<span>+{Math.round(stats.luckyChance * 100)}%</span>
		</div>
	{/if}
	{#if stats.greed > 0}
		<div class="stat-row greed">
			<span>💰 Greed</span>
			<span>+{Math.round(stats.greed * 100)}%</span>
		</div>
	{/if}

	{#if effects.length > 0}
		<h3>Effects</h3>
		<ul class="effects-list">
			{#each effects as effect (effect.name)}
				<li title={effect.description}>{effect.name}</li>
			{/each}
		</ul>
	{/if}
</aside>

<style>
	.stats-panel {
		background: rgba(0, 0, 0, 0.3);
		padding: 16px;
		border-radius: 8px;
		height: fit-content;
	}

	.stats-panel h2 {
		margin: 0 0 16px;
		font-size: 1.1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
		padding-bottom: 8px;
	}

	.stats-panel h3 {
		margin: 16px 0 8px;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		padding: 4px 0;
		font-size: 0.9rem;
	}

	.stat-row.poison {
		color: #a855f7;
	}

	.stat-row.greed {
		color: #fbbf24;
	}

	.effects-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.effects-list li {
		padding: 4px 8px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		margin-bottom: 4px;
		font-size: 0.8rem;
		cursor: help;
	}
</style>
