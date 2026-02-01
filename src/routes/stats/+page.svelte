<script lang="ts">
	import LiveRunView from '$lib/components/stats/LiveRunView.svelte';
	import SimulatorView from '$lib/components/stats/SimulatorView.svelte';

	let activeTab: 'live' | 'simulator' = $state('live');
</script>

{#if !import.meta.env.DEV}
	<p style="color: white; text-align: center; padding: 2rem;">Not available in production.</p>
{:else}
	<div class="stats-page">
		<h1>Stats Progression</h1>
		<div class="tabs">
			<button class:active={activeTab === 'live'} onclick={() => (activeTab = 'live')}>
				Live Run
			</button>
			<button class:active={activeTab === 'simulator'} onclick={() => (activeTab = 'simulator')}>
				Simulator
			</button>
		</div>
		{#if activeTab === 'live'}
			<LiveRunView />
		{:else}
			<SimulatorView />
		{/if}
	</div>
{/if}

<style>
	.stats-page {
		background: #1a1a2e;
		color: white;
		min-height: 100vh;
		padding: 24px;
		font-family: system-ui, sans-serif;
	}
	h1 {
		margin: 0 0 16px;
		font-size: 1.5rem;
	}
	.tabs {
		display: flex;
		gap: 8px;
		margin-bottom: 24px;
	}
	.tabs button {
		padding: 8px 20px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		background: transparent;
		color: white;
		cursor: pointer;
		font-size: 0.9rem;
	}
	.tabs button.active {
		background: rgba(139, 92, 246, 0.3);
		border-color: #8b5cf6;
	}
	.tabs button:hover {
		background: rgba(255, 255, 255, 0.1);
	}
</style>
