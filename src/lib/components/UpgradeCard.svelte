<script lang="ts">
	import { AspectRatio } from 'bits-ui';
	import type { StatModifier, PlayerStats } from '$lib/types';
	import { getModifierDisplay, getModifierDisplayWithTotal } from '$lib/data/upgrades';

	// Import rarity gem images
	import commonGem from '$lib/assets/images/rarity/common.png';
	import uncommonGem from '$lib/assets/images/rarity/uncommon.png';
	import rareGem from '$lib/assets/images/rarity/rare.png';
	import epicGem from '$lib/assets/images/rarity/epic.png';
	import legendaryGem from '$lib/assets/images/rarity/legendary.png';

	type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

	type Props = {
		title: string;
		image?: string;
		rarity?: Rarity;
		modifiers?: StatModifier[];
		currentStats?: Partial<PlayerStats>;
	};

	let {
		title,
		image = 'https://picsum.photos/400/300',
		rarity = 'common',
		modifiers = [],
		currentStats
	}: Props = $props();

	let displayStats = $derived(
		modifiers.map((mod) =>
			currentStats ? getModifierDisplayWithTotal(mod, currentStats) : getModifierDisplay(mod)
		)
	);

	const rarityColors: Record<Rarity, { glow: string; border: string }> = {
		common: { glow: 'transparent', border: '#6b7280' },
		uncommon: { glow: 'rgba(34, 197, 94, 0.4)', border: '#22c55e' },
		rare: { glow: 'rgba(59, 130, 246, 0.4)', border: '#3b82f6' },
		epic: { glow: 'rgba(192, 192, 192, 0.4)', border: '#c0c0c0' },
		legendary: { glow: 'rgba(234, 179, 8, 0.5)', border: '#eab308' }
	};

	const rarityGems: Record<Rarity, string> = {
		common: commonGem,
		uncommon: uncommonGem,
		rare: rareGem,
		epic: epicGem,
		legendary: legendaryGem
	};

	let colors = $derived(rarityColors[rarity]);
	let gemImage = $derived(rarityGems[rarity]);
</script>

<div class="UpgradeCard" style:--glow-color={colors.glow} style:--border-color={colors.border}>
	<div class="image-container">
		<AspectRatio.Root ratio={4 / 3}>
			<div class="image-bg">
				<img class="card-image" src={image} alt={title} />
			</div>
		</AspectRatio.Root>
		<img class="rarity-gem" src={gemImage} alt={rarity} />
	</div>

	<h2>{title}</h2>

	{#if displayStats.length > 0}
		<ul class="stats">
			{#each displayStats as stat, i (i)}
				<li>
					<span class="stat-icon">{stat.icon}</span>
					<span class="stat-label">{stat.label}</span>
					<span class="stat-value">{stat.value}</span>
					{#if stat.total}
						<span class="stat-total">→ {stat.total}</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style lang="scss">
	.UpgradeCard {
		display: flex;
		flex-direction: column;
		border: 2px solid var(--border-color);
		padding: 12px;
		border-radius: 8px;
		background-color: #28202f;
		color: white;
		box-shadow:
			0 0 20px var(--glow-color),
			inset 0 0 20px rgba(0, 0, 0, 0.3);
		transition:
			box-shadow 0.2s ease,
			transform 0.2s ease;

		&:hover {
			transform: translateY(-4px);
			box-shadow:
				0 0 30px var(--glow-color),
				0 8px 20px rgba(0, 0, 0, 0.4),
				inset 0 0 20px rgba(0, 0, 0, 0.3);
		}
	}

	.image-container {
		position: relative;
		border-radius: 4px;
		overflow: hidden;
	}

	.image-bg {
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, #1a1525 0%, #2d2438 100%);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-image {
		image-rendering: pixelated;
		transform: scale(4);
	}

	.rarity-gem {
		position: absolute;
		bottom: 8px;
		right: 8px;
		width: auto;
		height: auto;
		image-rendering: pixelated;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
		transform: scale(2);
		transform-origin: bottom right;
	}

	h2 {
		margin: 12px 0 8px;
		font-size: 1rem;
		font-weight: 600;
	}

	.stats {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;

		li {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 0.85rem;
			padding: 4px 8px;
			background: rgba(255, 255, 255, 0.05);
			border-radius: 4px;
		}

		.stat-icon {
			font-size: 1rem;
		}

		.stat-label {
			flex: 1;
			color: rgba(255, 255, 255, 0.8);
		}

		.stat-value {
			font-weight: 600;
			color: #4ade80;
		}

		.stat-total {
			font-size: 0.75rem;
			color: rgba(255, 255, 255, 0.5);
			font-weight: 400;
		}
	}
</style>
