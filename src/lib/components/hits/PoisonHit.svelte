<script lang="ts">
	import { onMount } from 'svelte';
	import { formatNumber } from '$lib/format';
	import { playHitSound } from './playHitSound';

	type Props = {
		damage: number;
		index: number;
	};

	let { damage, index }: Props = $props();

	onMount(() => playHitSound('hit:poison', index));

	// Random position within the enemy area
	const randomX = Math.floor(Math.random() * 100) - 50;
	const randomY = Math.floor(Math.random() * 80) - 40;
	const animationDelay = $derived(index * 0.05);
</script>

<div
	class="hit poison"
	style:left="calc(50% + {randomX}px)"
	style:top="calc(50% + {randomY}px)"
	style:animation-delay="{animationDelay}s"
>
	<span class="poison-icon">☠️</span>{formatNumber(damage)}
</div>

<style>
	.hit {
		position: absolute;
		font-weight: bold;
		animation: poison-float 0.6s ease-out forwards;
		pointer-events: none;
		display: flex;
		opacity: 0;
		text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
	}

	.poison {
		font-size: 1.3rem;
		color: #22c55e;
	}

	.poison-icon {
		margin-right: 2px;
	}

	@keyframes poison-float {
		0% {
			opacity: 1;
			transform: translateY(0);
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translateY(-30px);
		}
	}
</style>
