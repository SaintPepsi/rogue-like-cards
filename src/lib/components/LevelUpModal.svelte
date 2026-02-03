<script lang="ts">
	import CardSelectionModal from './CardSelectionModal.svelte';
	import type { Upgrade, PlayerStats } from '$lib/types';

	type Props = {
		show: boolean;
		choices: Upgrade[];
		pendingCount: number;
		onSelect: (upgrade: Upgrade) => void;
		exiting?: boolean;
		currentStats?: Partial<PlayerStats>;
	};

	let { show, choices, pendingCount, onSelect, exiting = false, currentStats }: Props = $props();

	function handleSelect(card: Upgrade, _index: number) {
		onSelect(card);
	}
</script>

{#if show}
	<CardSelectionModal
		cards={choices}
		onSelect={handleSelect}
		{currentStats}
		class={exiting ? 'exiting' : ''}
		modalClass={pendingCount > 1 ? 'with-badge' : ''}
	>
		{#snippet header()}
			{#if pendingCount > 1}
				<div class="pending-badge">+{pendingCount - 1} more</div>
			{/if}
			<h2 class="m-0 mb-2 text-[1.8rem] text-[#fbbf24]">Level Up!</h2>
			<p class="m-0 mb-6 text-white/70">Choose an upgrade:</p>
		{/snippet}
	</CardSelectionModal>
{/if}

<style>
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
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.05);
		}
	}
</style>
