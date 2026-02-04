<script lang="ts">
	import CardSelectionModal from './CardSelectionModal.svelte';
	import type { Upgrade, PlayerStats } from '$lib/types';
	import { Button } from 'bits-ui';

	type Props = {
		choices: Upgrade[];
		onSelect: (upgrade: Upgrade | null) => void;
		currentStats?: Partial<PlayerStats>;
	};

	let { choices, onSelect, currentStats }: Props = $props();

	function handleSelect(card: Upgrade) {
		onSelect(card);
	}

	function handleSkip() {
		onSelect(null);
	}
</script>

<CardSelectionModal
	cards={choices}
	onSelect={handleSelect}
	{currentStats}
	theme="legendary"
	testId="legendary-selection-modal"
>
	{#snippet header()}
		<h2 class="m-0 mb-2 text-[1.8rem] text-[#ffd700] [text-shadow:0_0_10px_rgba(255,215,0,0.5)]">
			Choose Your Starting Legendary
		</h2>
		<p class="m-0 mb-6 text-white/70">Select one legendary upgrade to begin your run:</p>
	{/snippet}

	{#snippet footer()}
		<div class="mt-6">
			<Button.Root
				class="px-8 py-3 bg-white/10 border border-white/30 rounded-lg text-white text-base cursor-pointer transition-all duration-200 hover:bg-white/20 hover:border-white/50 disabled:opacity-50 disabled:cursor-default"
				onclick={handleSkip}>Skip</Button.Root
			>
		</div>
	{/snippet}
</CardSelectionModal>
