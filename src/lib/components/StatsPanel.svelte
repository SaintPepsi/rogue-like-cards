<script lang="ts">
	import type { PlayerStats } from '$lib/types';
	import { createDefaultStats, statRegistry } from '$lib/engine/stats';

	type Props = {
		stats: PlayerStats;
	};

	let { stats }: Props = $props();

	const defaults = createDefaultStats();
</script>

<aside class="stats-panel">
	<h2>Stats</h2>
	{#each statRegistry as entry (entry.key)}
		{@const value = stats[entry.key]}
		{@const defaultValue = defaults[entry.key]}
		{#if entry.alwaysShow || value !== defaultValue}
			<div class="stat-row {entry.colorClass ?? ''}">
				<span>{entry.icon} {entry.label}</span>
				<span>{entry.format(value)}</span>
			</div>
		{/if}
	{/each}
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

	.stat-row {
		display: flex;
		justify-content: space-between;
		padding: 4px 0;
		font-size: 0.9rem;
	}

	.stat-row.poison {
		color: #a855f7;
	}

	.stat-row.gold {
		color: #f59e0b;
	}

	.stat-row.greed {
		color: #fbbf24;
	}

</style>
