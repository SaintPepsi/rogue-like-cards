<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		count: number;
		children: Snippet;
	};

	let { count, children }: Props = $props();

	let scrollContainer: HTMLDivElement | undefined = $state();
	let activeIndex = $state(0);

	function onScroll() {
		if (!scrollContainer) return;
		const scrollLeft = scrollContainer.scrollLeft;
		const cardWidth = scrollContainer.offsetWidth;
		activeIndex = Math.round(scrollLeft / cardWidth);
	}

	function scrollTo(index: number) {
		if (!scrollContainer) return;
		const cardWidth = scrollContainer.offsetWidth;
		scrollContainer.scrollTo({ left: cardWidth * index, behavior: 'smooth' });
	}
</script>

<div class="carousel-wrapper">
	<div class="carousel-scroll" bind:this={scrollContainer} onscroll={onScroll}>
		{@render children()}
	</div>
	{#if count > 1}
		<div class="carousel-dots">
			{#each Array.from({ length: count }, (_, i) => i) as i (i)}
				<Button.Root
					class="w-2.5 h-2.5 rounded-full border-none bg-white/30 cursor-pointer p-0 transition-[background,transform] duration-200 {i ===
					activeIndex
						? 'bg-[#fbbf24] scale-[1.3]'
						: ''}"
					onclick={() => scrollTo(i)}
					aria-label="Go to card {i + 1}"
				></Button.Root>
			{/each}
		</div>
	{/if}
</div>

<style>
	.carousel-wrapper {
		display: none;
	}

	.carousel-scroll {
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		gap: 12px;
	}

	.carousel-scroll::-webkit-scrollbar {
		display: none;
	}

	.carousel-scroll :global(> *) {
		flex: 0 0 100%;
		scroll-snap-align: center;
		min-width: 0;
	}

	.carousel-dots {
		display: flex;
		justify-content: center;
		gap: 8px;
		margin-top: 16px;
	}

	@media (max-width: 768px) {
		.carousel-wrapper {
			display: block;
		}
	}
</style>
