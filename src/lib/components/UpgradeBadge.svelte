<script lang="ts">
	type Props = {
		count: number;
		onclick: () => void;
	};

	let { count, onclick }: Props = $props();
</script>

<button class="upgrade-badge" class:disabled={count === 0} onclick={count > 0 ? onclick : undefined} disabled={count === 0}>
	<span class="badge-icon">⬆</span>
	<span class="badge-text">{count}</span>
</button>

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
		transition: transform 0.15s, box-shadow 0.15s, opacity 0.2s;
		box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
	}

	.upgrade-badge.disabled {
		opacity: 0.3;
		cursor: default;
		animation: none;
		box-shadow: none;
	}

	.upgrade-badge:hover:not(.disabled) {
		transform: scale(1.08);
		box-shadow: 0 0 20px rgba(139, 92, 246, 0.7);
	}

	.upgrade-badge:active:not(.disabled) {
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
