<script lang="ts">
	import CardSelectionModal from './CardSelectionModal.svelte';
	import type { Upgrade, PlayerStats } from '$lib/types';
	import { formatNumber } from '$lib/format';

	type Props = {
		show: boolean;
		gold: number;
		choices: Upgrade[];
		onSelect: (upgrade: Upgrade) => void;
		exiting?: boolean;
		currentStats?: Partial<PlayerStats>;
	};

	let { show, gold, choices, onSelect, exiting = false, currentStats }: Props = $props();

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
	>
		{#snippet header()}
			<h2>Treasure Found!</h2>
			<p class="gold-reward">+{formatNumber(gold)} Gold</p>
			<p>Choose a reward:</p>
		{/snippet}
	</CardSelectionModal>
{/if}

<style>
	:global(.modal h2) {
		margin: 0 0 8px;
		font-size: 1.8rem;
		color: #fbbf24;
	}

	.gold-reward {
		font-size: 1.4rem;
		color: #fbbf24;
		font-weight: bold;
		margin: 0 0 16px;
	}

	:global(.modal p) {
		margin: 0 0 24px;
		color: rgba(255, 255, 255, 0.7);
	}
</style>
