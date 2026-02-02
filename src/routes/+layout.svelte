<script lang="ts">
	import { dev } from '$app/environment';
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	let { children } = $props();

	const devPages = [
		{ href: '/rarity-simulator', label: 'Rarity Simulator' },
		{ href: '/economy-simulation', label: 'Economy Sim' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Borel&family=Inconsolata:wght@200..900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{#if dev}
	<nav class="dev-bar">
		<span class="dev-label">DEV</span>
		<a href={resolve('/')} class="dev-link">Game</a>
		{#each devPages as page (page.href)}
			<a href={resolve(page.href)} class="dev-link">{page.label}</a>
		{/each}
	</nav>
{/if}

{@render children()}

<style>
	:global(*) {
		font-family: 'Inconsolata', monospace;
		font-optical-sizing: auto;
		font-style: normal;
	}

	.dev-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		background: #1a1a2e;
		border-bottom: 1px solid #a855f7;
		font-size: 0.8rem;
		z-index: 9999;
	}

	.dev-label {
		background: #a855f7;
		color: #0f0f1a;
		padding: 2px 6px;
		border-radius: 4px;
		font-weight: bold;
		font-size: 0.7rem;
	}

	.dev-link {
		color: #d4d4d8;
		text-decoration: none;
		padding: 4px 8px;
		border-radius: 4px;
		transition: background 150ms;
	}

	.dev-link:hover {
		background: #2a2a3e;
		color: white;
	}
</style>
