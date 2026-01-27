<script lang="ts">
	import type { Upgrade } from '$lib/types';
	import UpgradeCard from './UpgradeCard.svelte';

	type Props = {
		show: boolean;
		choices: Upgrade[];
		pendingCount: number;
		onSelect: (upgrade: Upgrade) => void;
	};

	let { show, choices, pendingCount, onSelect }: Props = $props();
</script>

{#if show}
	<div class="modal-overlay">
		<div class="modal">
			{#if pendingCount > 1}
				<div class="pending-badge">+{pendingCount - 1} more</div>
			{/if}
			<h2>Level Up!</h2>
			<p>Choose an upgrade:</p>
			<div class="upgrade-choices">
				{#each choices as upgrade (upgrade.id)}
					<button class="upgrade-btn" onclick={() => onSelect(upgrade)}>
						<UpgradeCard
							title={upgrade.title}
							rarity={upgrade.rarity}
							image={upgrade.image}
							stats={upgrade.stats}
						/>
					</button>
				{/each}
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
		position: relative;
	}

	.pending-badge {
		position: absolute;
		top: 12px;
		right: 12px;
		background: linear-gradient(135deg, #8b5cf6, #a78bfa);
		color: white;
		padding: 6px 12px;
		border-radius: 20px;
		font-size: 0.9rem;
		font-weight: bold;
		animation: pulse-badge 1s ease-in-out infinite;
	}

	@keyframes pulse-badge {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.05); }
	}

	.modal h2 {
		margin: 0 0 8px;
		font-size: 1.8rem;
		color: #fbbf24;
	}

	.modal p {
		margin: 0 0 24px;
		color: rgba(255, 255, 255, 0.7);
	}

	.upgrade-choices {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	.upgrade-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: transform 0.2s;
	}

	.upgrade-btn:hover {
		transform: translateY(-8px);
	}

	@media (max-width: 768px) {
		.upgrade-choices {
			grid-template-columns: 1fr;
		}
	}
</style>
