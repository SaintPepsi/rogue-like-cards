<script lang="ts">
	import { Button } from 'bits-ui';
	import { codes } from '$lib/stores/codes.svelte';
	import { gameState } from '$lib/stores/gameState.svelte';

	let autoclickerActive = $state(false);

	// DECISION: Use game loop timer instead of setInterval
	// Why: setInterval queues callbacks when tab is inactive, causing bursts on focus.
	// Game loop's timer registry already handles this via deltaMs capping.
	// DECISION: Call gameState.pointerDown() (not gameLoop.pointerDown()) to add frenzy stacks
	// Why: Autoclicker should behave exactly like manual taps, including frenzy stacking.
	$effect(() => {
		if (autoclickerActive) {
			gameState.startAutoclicker();
		} else {
			gameState.stopAutoclicker();
		}

		return () => {
			gameState.stopAutoclicker();
		};
	});
</script>

{#if codes.autoclickerUnlocked}
	<Button.Root
		class="autoclicker-btn {autoclickerActive ? 'active' : ''}"
		onclick={() => (autoclickerActive = !autoclickerActive)}
	>
		{autoclickerActive ? 'Auto: ON' : 'Auto: OFF'}
	</Button.Root>
{/if}

<style>
	:global(.autoclicker-btn) {
		padding: 6px 16px !important;
		border-radius: 8px !important;
		font-size: 0.85rem !important;
		font-weight: 600 !important;
		cursor: pointer !important;
		transition:
			background 0.15s,
			border-color 0.15s,
			color 0.15s !important;
		background: rgba(255, 255, 255, 0.05) !important;
		border: 1px solid rgba(255, 255, 255, 0.15) !important;
		color: rgba(255, 255, 255, 0.6) !important;
	}

	:global(.autoclicker-btn:hover) {
		background: rgba(255, 255, 255, 0.1) !important;
		color: white !important;
	}

	:global(.autoclicker-btn.active) {
		background: rgba(74, 222, 128, 0.2) !important;
		border-color: rgba(74, 222, 128, 0.4) !important;
		color: #4ade80 !important;
		animation: autoclicker-pulse 1.5s ease-in-out infinite !important;
	}

	@keyframes autoclicker-pulse {
		0%,
		100% {
			box-shadow: 0 0 4px rgba(74, 222, 128, 0.2);
		}
		50% {
			box-shadow: 0 0 10px rgba(74, 222, 128, 0.4);
		}
	}
</style>
