<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import { statRegistry } from '$lib/engine/stats';
	import type { Snippet } from 'svelte';

	type Props = {
		statKey: string;
		children: Snippet;
	};

	let { statKey, children }: Props = $props();

	const stat = $derived(statRegistry.find((s) => s.key === statKey));
	const description = $derived(stat?.description);
</script>

{#if description}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<li {...props}>
					{@render children()}
				</li>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content
				class="bg-black/85 text-slate-200 text-sm px-3 py-2 rounded-md max-w-60 leading-snug shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 z-50"
				side="top"
				sideOffset={8}
			>
				{description}
				<Tooltip.Arrow class="fill-black/85" />
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
{:else}
	<li>
		{@render children()}
	</li>
{/if}
