<script lang="ts">
	import type { HitInfo } from '$lib/types';
	import { formatNumber } from '$lib/format';
	import enemySprite from '$lib/assets/images/enemy.png';
	import chestSprite from '$lib/assets/images/chest.png';
	import HitNumber from './hits/HitNumber.svelte';

	type Props = {
		isBoss: boolean;
		isChest: boolean;
		enemyHealth: number;
		enemyMaxHealth: number;
		enemiesKilled: number;
		gold: number;
		hits: HitInfo[];
		poisonStacks: number;
		onAttack: () => void;
	};

	let {
		isBoss,
		isChest,
		enemyHealth,
		enemyMaxHealth,
		enemiesKilled,
		gold,
		hits,
		poisonStacks,
		onAttack
	}: Props = $props();
</script>

<div class="battle-area">
	<div class="enemy-section">
		<div
			class="enemy"
			class:boss={isBoss}
			class:chest={isChest}
			onclick={onAttack}
			onkeydown={(e) => e.key === ' ' && onAttack()}
			tabindex="0"
			role="button"
		>
			<img class="enemy-sprite" src={isChest ? chestSprite : enemySprite} alt={isChest ? 'Chest' : 'Enemy'} draggable="false" />
			{#if poisonStacks > 0}
				<div class="poison-counter">
					<span class="poison-icon">☠️</span>
					<span class="poison-count">{poisonStacks}</span>
				</div>
			{/if}
			{#each hits as hit (hit.id)}
				<HitNumber damage={hit.damage} type={hit.type} index={hit.index} />
			{/each}
		</div>
		<div class="health-bar" class:boss-bar={isBoss}>
			<div class="health-fill" style:width="{(enemyHealth / enemyMaxHealth) * 100}%"></div>
		</div>
		<span class="health-text">{formatNumber(enemyHealth)}/{formatNumber(enemyMaxHealth)}</span>
		<p class="hint">Click the enemy to attack!</p>
	</div>

	<div class="battle-stats">
		<p class="kills">Enemies Killed: {formatNumber(enemiesKilled)}</p>
		{#if gold > 0}
			<p class="gold">Gold: {formatNumber(gold)}</p>
		{/if}
	</div>
</div>

<style>
	.battle-area {
		display: grid;
		grid-template-columns: 3fr 1fr;
		gap: 24px;
		align-items: start;
	}

	.battle-stats {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 8px;
	}

	.kills {
		font-size: 1.1rem;
		color: #4ade80;
		margin: 0;
	}

	.gold {
		font-size: 1.1rem;
		color: #fbbf24;
		margin: 0;
	}

	.enemy-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.enemy {
		width: 150px;
		height: 150px;
		background: rgba(0, 0, 0, 0.4);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: transform 0.1s;
		position: relative;
		user-select: none;
	}

	.enemy:hover {
		transform: scale(1.05);
	}

	.enemy:active {
		transform: scale(0.95);
	}

	.enemy.boss {
		width: 180px;
		height: 180px;
		background: linear-gradient(135deg, rgba(220, 38, 38, 0.3), rgba(0, 0, 0, 0.4));
		border: 2px solid #dc2626;
		box-shadow: 0 0 20px rgba(220, 38, 38, 0.5);
	}

	.enemy.chest {
		background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(0, 0, 0, 0.4));
		border: 2px solid #fbbf24;
		box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
		animation: chest-glow 1.5s ease-in-out infinite;
	}

	@keyframes chest-glow {
		0%, 100% {
			box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
		}
		50% {
			box-shadow: 0 0 35px rgba(251, 191, 36, 0.8), 0 0 50px rgba(251, 191, 36, 0.3);
		}
	}

	.enemy-sprite {
		width: 64px;
		height: 64px;
		image-rendering: pixelated;
		transform: scale(2);
	}

	.enemy.boss .enemy-sprite {
		transform: scale(3);
	}

	.poison-counter {
		position: absolute;
		top: -8px;
		right: -8px;
		display: flex;
		align-items: center;
		gap: 2px;
		background: rgba(34, 197, 94, 0.9);
		border: 2px solid #16a34a;
		border-radius: 12px;
		padding: 2px 8px;
		font-size: 0.8rem;
		font-weight: bold;
		color: white;
		z-index: 10;
		box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
		animation: poison-pulse 1.5s ease-in-out infinite;
	}

	.poison-icon {
		font-size: 0.7rem;
	}

	.poison-count {
		font-size: 0.85rem;
	}

	@keyframes poison-pulse {
		0%, 100% {
			box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
		}
		50% {
			box-shadow: 0 0 14px rgba(34, 197, 94, 0.8);
		}
	}

	.health-bar {
		width: 150px;
		height: 16px;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 8px;
		overflow: hidden;
	}

	.health-bar.boss-bar {
		width: 180px;
		height: 20px;
		border: 2px solid #dc2626;
	}

	.health-fill {
		height: 100%;
		background: linear-gradient(90deg, #ef4444, #f87171);
		transition: width 0.2s ease;
	}

	.health-bar.boss-bar .health-fill {
		background: linear-gradient(90deg, #dc2626, #f87171);
	}

	.health-text {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.hint {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.9rem;
		margin: 8px 0 0;
	}
</style>
