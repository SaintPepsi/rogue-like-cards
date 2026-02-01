<script lang="ts">
	import { Button } from 'bits-ui';
	import { leaderboard, type TimeFilter } from '$lib/stores/leaderboard.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { formatNumber } from '$lib/format';

	type Props = {
		show: boolean;
		onClose: () => void;
	};

	let { show, onClose }: Props = $props();

	const filters: { label: string; value: TimeFilter }[] = [
		{ label: 'Today', value: 'today' },
		{ label: 'This Week', value: 'week' },
		{ label: 'This Month', value: 'month' },
		{ label: 'All Time', value: 'all' }
	];

	// Fetch when modal opens
	$effect(() => {
		if (show) {
			leaderboard.fetchEntries(auth.profile?.id ?? null);
		}
	});
</script>

{#if show}
	<div
		class="modal-overlay"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		role="button"
		tabindex="0"
	>
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
			role="dialog"
			tabindex="-1"
		>
			<div class="modal-header">
				<h2>Leaderboard</h2>
				<Button.Root
					class="bg-transparent border-none text-white/60 text-[2rem] cursor-pointer leading-none p-0 hover:text-white"
					onclick={onClose}>&times;</Button.Root
				>
			</div>

			<!-- Time filter tabs -->
			<div class="filter-tabs">
				{#each filters as filter (filter.value)}
					<button
						class="filter-tab"
						class:active={leaderboard.activeFilter === filter.value}
						onclick={() => leaderboard.setFilter(filter.value, auth.profile?.id ?? null)}
					>
						{filter.label}
					</button>
				{/each}
			</div>

			<div class="modal-content">
				{#if leaderboard.loading}
					<p class="status-text">Loading...</p>
				{:else if leaderboard.entries.length === 0}
					<p class="status-text">No entries yet. Be the first!</p>
				{:else}
					<div class="leaderboard-list">
						<div class="leaderboard-header">
							<span class="col-rank">#</span>
							<span class="col-name">Player</span>
							<span class="col-stat">Stage</span>
							<span class="col-stat">Level</span>
							<span class="col-stat">Kills</span>
						</div>
						{#each leaderboard.entries as entry, i (entry.id)}
							<div class="leaderboard-row" class:current-user={entry.isCurrentUser}>
								<span
									class="col-rank rank"
									class:gold={i === 0}
									class:silver={i === 1}
									class:bronze={i === 2}>{i + 1}</span
								>
								<span class="col-name player-name">{entry.displayName}</span>
								<span class="col-stat">{entry.stage}</span>
								<span class="col-stat">{entry.level}</span>
								<span class="col-stat">{formatNumber(entry.enemiesKilled)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 20px;
	}

	.modal {
		background: #1a1a2e;
		border-radius: 16px;
		max-width: 600px;
		max-height: 80vh;
		width: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px 24px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		color: #fbbf24;
		flex: 1;
	}

	.filter-tabs {
		display: flex;
		gap: 4px;
		padding: 12px 24px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.filter-tab {
		flex: 1;
		padding: 8px 12px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			border-color 0.15s;
	}

	.filter-tab:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	.filter-tab.active {
		background: rgba(251, 191, 36, 0.15);
		border-color: rgba(251, 191, 36, 0.3);
		color: #fbbf24;
	}

	.modal-content {
		padding: 16px 24px 24px;
		overflow-y: auto;
		flex: 1;
	}

	.status-text {
		margin: 0;
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		padding: 32px 0;
	}

	.leaderboard-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.leaderboard-header {
		display: flex;
		align-items: center;
		padding: 8px 12px;
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.35);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.leaderboard-row {
		display: flex;
		align-items: center;
		padding: 10px 12px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.03);
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.8);
		transition: background 0.1s;
	}

	.leaderboard-row:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.leaderboard-row.current-user {
		background: rgba(139, 92, 246, 0.12);
		border-left: 3px solid #a78bfa;
	}

	.col-rank {
		width: 40px;
		flex-shrink: 0;
		text-align: center;
	}

	.col-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.col-stat {
		width: 60px;
		flex-shrink: 0;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.rank {
		font-weight: 700;
	}

	.rank.gold {
		color: #fbbf24;
	}

	.rank.silver {
		color: #94a3b8;
	}

	.rank.bronze {
		color: #cd7f32;
	}

	.player-name {
		font-weight: 600;
	}

	@media (max-width: 480px) {
		.modal {
			max-width: 100%;
		}

		.col-stat {
			width: 48px;
			font-size: 0.8rem;
		}
	}
</style>
