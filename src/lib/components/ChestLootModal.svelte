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
			<h2 class="m-0 mb-2 text-[1.8rem] text-[#fbbf24]">Treasure Found!</h2>
			<p class="gold-reward">+{formatNumber(gold)} Gold</p>
			<p class="m-0 mb-6 text-white/70">Choose a reward:</p>
		{/snippet}
	</CardSelectionModal>
{/if}

<style>
	.gold-reward {
		font-size: 1.4rem;
		color: #fbbf24;
		font-weight: bold;
		margin: 0 0 16px;
	}
</style>
