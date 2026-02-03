<script lang="ts">
	import CardSelectionModal from './CardSelectionModal.svelte';
	import type { Upgrade, PlayerStats } from '$lib/types';

	type Props = {
		choices: Upgrade[];
		onSelect: (upgrade: Upgrade | null) => void;
		currentStats?: Partial<PlayerStats>;
	};

	let { choices, onSelect, currentStats }: Props = $props();

	function handleSelect(card: Upgrade, _index: number) {
		onSelect(card);
	}

	function handleSkip() {
		onSelect(null);
	}
</script>

<CardSelectionModal cards={choices} onSelect={handleSelect} {currentStats} theme="legendary">
	{#snippet header()}
		<h2 class="m-0 mb-2 text-[1.8rem] text-[#ffd700] [text-shadow:0_0_10px_rgba(255,215,0,0.5)]">
			Choose Your Starting Legendary
		</h2>
		<p class="m-0 mb-6 text-white/70">Select one legendary upgrade to begin your run:</p>
	{/snippet}

	{#snippet footer()}
		<div class="skip-section">
			<button class="skip-button" onclick={handleSkip}>Skip</button>
		</div>
	{/snippet}
</CardSelectionModal>

<style>
	.skip-section {
		margin-top: 24px;
	}

	.skip-button {
		padding: 0.75rem 2rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		color: white;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.skip-button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.5);
	}

	.skip-button:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
