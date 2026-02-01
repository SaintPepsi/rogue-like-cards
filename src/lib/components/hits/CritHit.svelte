<script lang="ts">
	import { onMount } from 'svelte';
	import { formatNumber } from '$lib/format';
	import { playHitSound } from './playHitSound';

	type Props = {
		damage: number;
		index: number;
	};

	let { damage, index }: Props = $props();

	onMount(() => playHitSound('hit:crit', index));

	// Random position within the enemy area
	const randomX = Math.floor(Math.random() * 100) - 50;
	const randomY = Math.floor(Math.random() * 80) - 40;
	const animationDelay = $derived(index * 0.05);
</script>

<div
	class="hit crit"
	style:left="calc(50% + {randomX}px)"
	style:top="calc(50% + {randomY}px)"
	style:animation-delay="{animationDelay}s"
>
	<span class="crit-icon">💥</span>{formatNumber(damage)}
</div>

<style>
	.hit {
		position: absolute;
		font-weight: bold;
		animation: crit-float 0.7s ease-out forwards;
		pointer-events: none;
		display: flex;
		opacity: 0;
		text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
	}

	.crit {
		font-size: 2rem;
		color: #ef4444;
	}

	.crit-icon {
		margin-right: 2px;
	}

	@keyframes crit-float {
		0% {
			opacity: 1;
			transform: translateY(0) scale(1.2);
		}
		20% {
			transform: translateY(-5px) scale(1.3);
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translateY(-50px) scale(0.9);
		}
	}
</style>
