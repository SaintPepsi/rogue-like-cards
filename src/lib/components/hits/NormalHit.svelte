<script lang="ts">
	import { formatNumber } from '$lib/format';
	import { playHitSound } from './playHitSound';

	type Props = {
		damage: number;
		index: number;
	};

	let { damage, index }: Props = $props();

	playHitSound('hit:normal', index);

	// Random position within the enemy area
	const randomX = Math.floor(Math.random() * 100) - 50; // -50 to 50
	const randomY = Math.floor(Math.random() * 80) - 40; // -40 to 40
	const animationDelay = $derived(index * 0.05);
</script>

<div
	class="hit normal"
	style:left="calc(50% + {randomX}px)"
	style:top="calc(50% + {randomY}px)"
	style:animation-delay="{animationDelay}s"
>
	{formatNumber(damage)}
</div>

<style>
	.hit {
		position: absolute;
		top: -10px;
		font-weight: bold;
		animation: float-up 0.6s ease-out forwards;
		pointer-events: none;
		opacity: 0;
		text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
	}

	.normal {
		font-size: 1.5rem;
		color: #fbbf24;
	}

	@keyframes float-up {
		0% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translateY(-40px) scale(0.8);
		}
	}
</style>
