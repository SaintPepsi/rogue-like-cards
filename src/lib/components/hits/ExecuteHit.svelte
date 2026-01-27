<script lang="ts">
	type Props = {
		damage: number;
		index: number;
	};

	let { damage, index }: Props = $props();

	// Execute shows centered for more impact
	const animationDelay = index * 0.05;
</script>

<div
	class="hit execute"
	style:left="50%"
	style:top="50%"
	style:transform="translate(-50%, -50%)"
	style:animation-delay="{animationDelay}s"
>
	<span class="execute-icon">⚰️</span>
	<span class="execute-text">EXECUTE</span>
	<span class="execute-damage">{damage}</span>
</div>

<style>
	.hit {
		position: absolute;
		font-weight: bold;
		animation: execute-float 0.9s ease-out forwards;
		pointer-events: none;
		opacity: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.7);
	}

	.execute {
		color: #a855f7;
	}

	.execute-icon {
		font-size: 1.5rem;
	}

	.execute-text {
		font-size: 0.8rem;
		letter-spacing: 2px;
		color: #c084fc;
	}

	.execute-damage {
		font-size: 1.8rem;
		color: #a855f7;
	}

	@keyframes execute-float {
		0% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(0.5);
		}
		15% {
			transform: translate(-50%, -55%) scale(1.4);
		}
		30% {
			transform: translate(-50%, -60%) scale(1.1);
		}
		60% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -100%) scale(0.8);
		}
	}
</style>
