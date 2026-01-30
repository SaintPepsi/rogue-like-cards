<script lang="ts">
	type Props = {
		count: number;
		onclick: () => void;
	};

	let { count, onclick }: Props = $props();
</script>

{#if count > 0}
	<button class="upgrade-badge" {onclick}>
		<span class="badge-icon">⬆</span>
		<span class="badge-text">{count}</span>
	</button>
{/if}

<style>
	.upgrade-badge {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 12px;
		background: linear-gradient(135deg, #8b5cf6, #a78bfa);
		border: 2px solid #a78bfa;
		border-radius: 20px;
		color: white;
		font-weight: bold;
		font-size: 0.9rem;
		cursor: pointer;
		animation: pulse-badge 1s ease-in-out infinite;
		transition: transform 0.15s, box-shadow 0.15s;
		box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
	}

	.upgrade-badge:hover {
		transform: scale(1.08);
		box-shadow: 0 0 20px rgba(139, 92, 246, 0.7);
	}

	.upgrade-badge:active {
		transform: scale(0.95);
	}

	.badge-icon {
		font-size: 0.85rem;
	}

	@keyframes pulse-badge {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.05); }
	}
</style>
