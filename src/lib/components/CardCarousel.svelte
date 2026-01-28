<script lang="ts">
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
			{#each Array(count) as _, i}
				<button
					class="dot"
					class:active={i === activeIndex}
					onclick={() => scrollTo(i)}
					aria-label="Go to card {i + 1}"
				></button>
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

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.3);
		cursor: pointer;
		padding: 0;
		transition: background 0.2s, transform 0.2s;
	}

	.dot.active {
		background: #fbbf24;
		transform: scale(1.3);
	}

	@media (max-width: 768px) {
		.carousel-wrapper {
			display: block;
		}
	}
</style>
