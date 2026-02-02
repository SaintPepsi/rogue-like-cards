<script lang="ts">
	import type { PlayerStats } from '$lib/types';
	import { createDefaultStats, statRegistry } from '$lib/engine/stats';
	import { Tooltip } from 'bits-ui';

	type Props = {
		stats: PlayerStats;
	};

	let { stats }: Props = $props();

	const defaults = createDefaultStats();
</script>

<aside class="stats-panel">
	<h2>Stats</h2>
	<Tooltip.Provider delayDuration={0} disableHoverableContent>
		{#each statRegistry as entry (entry.key)}
			{@const value = stats[entry.key]}
			{@const defaultValue = defaults[entry.key]}
			{#if entry.alwaysShow || value !== defaultValue}
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						{#snippet child({ props })}
							<div {...props} class="stat-row {entry.colorClass ?? ''}">
								<span>{entry.icon} {entry.label}</span>
								<span>{entry.format(value)}</span>
							</div>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content class="stat-tooltip" side="left" sideOffset={8}>
							{entry.description} Base: {entry.format(defaultValue)}
							<Tooltip.Arrow class="stat-tooltip-arrow" />
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			{/if}
		{/each}
	</Tooltip.Provider>
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
		cursor: default;
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

	:global(.stat-tooltip) {
		background: rgba(0, 0, 0, 0.85);
		color: #e2e8f0;
		font-size: 0.8rem;
		padding: 8px 12px;
		border-radius: 6px;
		max-width: 240px;
		line-height: 1.4;
		animation: stat-tooltip-fade-in 0.15s ease-out;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
		z-index: 50;
	}

	:global(.stat-tooltip-arrow) {
		fill: rgba(0, 0, 0, 0.85);
	}

	@keyframes stat-tooltip-fade-in {
		from {
			opacity: 0;
			transform: translateX(4px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
</style>
