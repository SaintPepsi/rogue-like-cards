<script lang="ts">
	import { Button } from 'bits-ui';
	import { gameState } from '$lib/stores/gameState.svelte';
</script>

<Button.Root
	class="auto-pick-btn {gameState.autoPickUpgrades ? 'active' : ''}"
	onclick={() => gameState.toggleAutoPickUpgrades()}
	title={gameState.autoPickUpgrades ? 'Auto-pick upgrades enabled' : 'Auto-pick upgrades disabled'}
>
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<polyline points="16 3 21 3 21 8" />
		<line x1="4" y1="20" x2="21" y2="3" />
		<polyline points="21 16 21 21 16 21" />
		<line x1="15" y1="15" x2="21" y2="21" />
		<line x1="4" y1="4" x2="9" y2="9" />
	</svg>
	<span>{gameState.autoPickUpgrades ? 'Pick: Auto' : 'Pick: Manual'}</span>
</Button.Root>

<style>
	:global(.auto-pick-btn) {
		display: inline-flex !important;
		align-items: center !important;
		gap: 6px !important;
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

	:global(.auto-pick-btn:hover) {
		background: rgba(255, 255, 255, 0.1) !important;
		color: white !important;
	}

	:global(.auto-pick-btn.active) {
		background: rgba(251, 191, 36, 0.2) !important;
		border-color: rgba(251, 191, 36, 0.4) !important;
		color: #fbbf24 !important;
		animation: auto-pick-pulse 1.5s ease-in-out infinite !important;
	}

	@keyframes auto-pick-pulse {
		0%,
		100% {
			box-shadow: 0 0 4px rgba(251, 191, 36, 0.2);
		}
		50% {
			box-shadow: 0 0 10px rgba(251, 191, 36, 0.4);
		}
	}
</style>
