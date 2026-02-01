<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		expanded = false,
		children
	}: { title: string; expanded?: boolean; children: Snippet } = $props();

	// expanded is intentionally captured as initial value only — this is a local toggle
	let isExpanded = $state(expanded);
</script>

<div class="stat-group">
	<button class="group-header" onclick={() => (isExpanded = !isExpanded)}>
		<span class="group-title">{title}</span>
		<span class="chevron" class:rotated={isExpanded}>▶</span>
	</button>
	{#if isExpanded}
		<div class="group-content">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.stat-group {
		margin-bottom: 16px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		overflow: hidden;
	}
	.group-header {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background: rgba(255, 255, 255, 0.05);
		border: none;
		color: white;
		cursor: pointer;
		font-size: 1.1rem;
		font-weight: 600;
	}
	.group-header:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	.chevron {
		transition: transform 0.2s;
		font-size: 0.8rem;
	}
	.chevron.rotated {
		transform: rotate(90deg);
	}
	.group-content {
		padding: 16px;
	}
</style>
