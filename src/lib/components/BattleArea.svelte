<script lang="ts">
	import type { HitInfo, GoldDrop, AttackCounts } from '$lib/types';
	import { formatNumber, formatAttackType } from '$lib/format';
	import enemySprite from '$lib/assets/images/enemy.png';
	import chestSprite from '$lib/assets/images/chest-closed.png';
	import mimicSprite from '$lib/assets/images/mimic-closed.png';
	import HitNumber from './hits/HitNumber.svelte';
	import Autoclicker from './Autoclicker.svelte';
	import frenzyGlint from '$lib/assets/images/frenzy-glint.png';

	type Props = {
		isBoss: boolean;
		isChest: boolean;
		isBossChest: boolean;
		enemyHealth: number;
		enemyMaxHealth: number;
		enemiesKilled: number;
		gold: number;
		goldDrops: GoldDrop[];
		hits: HitInfo[];
		poisonStacks: number;
		onPointerDown: () => void;
		onPointerUp: () => void;
		frenzyStacks: number;
		attackCounts: AttackCounts;
	};

	let {
		isBoss,
		isChest,
		isBossChest,
		enemyHealth,
		enemyMaxHealth,
		enemiesKilled,
		gold,
		goldDrops,
		hits,
		poisonStacks,
		onPointerDown,
		onPointerUp,
		frenzyStacks,
		attackCounts
	}: Props = $props();

	// Order for display consistency
	const ATTACK_TYPE_ORDER = ['normal', 'crit', 'execute', 'poison', 'poisonCrit'];

	function getSortedAttackCounts(counts: AttackCounts): [string, number][] {
		return Object.entries(counts)
			.filter(([, count]) => count > 0)
			.sort(([a], [b]) => {
				const aIndex = ATTACK_TYPE_ORDER.indexOf(a);
				const bIndex = ATTACK_TYPE_ORDER.indexOf(b);
				// Unknown types go to end
				const aSort = aIndex === -1 ? 999 : aIndex;
				const bSort = bIndex === -1 ? 999 : bIndex;
				return aSort - bSort;
			});
	}
</script>

<div class="battle-area">
	<div class="enemy-section">
		<div
			class="enemy"
			class:boss={isBoss}
			class:chest={isChest}
			onpointerdown={onPointerDown}
			onpointerup={onPointerUp}
			onpointerleave={onPointerUp}
			onkeydown={(e) => {
				if (e.key === ' ') {
					onPointerDown();
					setTimeout(onPointerUp, 100);
				}
			}}
			tabindex="0"
			role="button"
		>
			<img
				class="enemy-sprite"
				src={isBossChest ? mimicSprite : isChest ? chestSprite : enemySprite}
				alt={isBossChest ? 'Mimic' : isChest ? 'Chest' : 'Enemy'}
				draggable="false"
			/>
			{#if poisonStacks > 0}
				<div class="poison-counter">
					<span class="poison-icon">☠️</span>
					<span class="poison-count">{poisonStacks}</span>
				</div>
			{/if}
			{#if frenzyStacks > 0}
				<div class="frenzy-counter">
					<div class="frenzy-icon" style:background-image="url({frenzyGlint})"></div>
					<span class="frenzy-count">{frenzyStacks}</span>
				</div>
			{/if}
			{#each hits as hit (hit.id)}
				<HitNumber damage={hit.damage} type={hit.type} index={hit.index} />
			{/each}
		</div>
		<Autoclicker />
		<div class="health-bar" class:boss-bar={isBoss}>
			<div class="health-fill" style:width="{(enemyHealth / enemyMaxHealth) * 100}%"></div>
		</div>
		<span class="health-text">{formatNumber(enemyHealth)}/{formatNumber(enemyMaxHealth)}</span>
		<p class="hint">Tap to attack, hold to auto-attack!</p>
	</div>

	<div class="battle-stats">
		<p class="kills">Enemies Killed: {formatNumber(enemiesKilled)}</p>
		<p class="gold">
			Gold: {formatNumber(gold)}
			{#each goldDrops as drop (drop.id)}
				<span class="gold-drop-popup">+{drop.amount}g</span>
			{/each}
		</p>
		{#if Object.keys(attackCounts).length > 0}
			{@const sortedCounts = getSortedAttackCounts(attackCounts)}
			{#if sortedCounts.length > 0}
				<div class="attack-counts">
					<p class="breakdown-header">Attack Breakdown</p>
					{#each sortedCounts as [type, count] (type)}
						<p class="attack-count {type}">{formatAttackType(type)}: {formatNumber(count)}</p>
					{/each}
				</div>
			{/if}
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
		position: relative;
	}

	.gold-drop-popup {
		position: absolute;
		left: calc(100% + 4px);
		top: 0;
		color: #fbbf24;
		font-weight: bold;
		font-size: 0.9rem;
		animation: gold-float 1.2s ease-out forwards;
		pointer-events: none;
		white-space: nowrap;
		text-shadow: 0 0 6px rgba(251, 191, 36, 0.6);
	}

	@keyframes gold-float {
		0% {
			opacity: 1;
			transform: translateY(0);
		}
		70% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translateY(-20px);
		}
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
		0%,
		100% {
			box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
		}
		50% {
			box-shadow:
				0 0 35px rgba(251, 191, 36, 0.8),
				0 0 50px rgba(251, 191, 36, 0.3);
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
		0%,
		100% {
			box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
		}
		50% {
			box-shadow: 0 0 14px rgba(34, 197, 94, 0.8);
		}
	}

	.frenzy-counter {
		position: absolute;
		top: -8px;
		left: -8px;
		display: flex;
		align-items: center;
		gap: 2px;
		background: rgba(251, 146, 60, 0.9);
		border: 2px solid #ea580c;
		border-radius: 12px;
		padding: 2px 8px;
		font-size: 0.8rem;
		font-weight: bold;
		color: white;
		z-index: 10;
		box-shadow: 0 0 8px rgba(251, 146, 60, 0.5);
		animation: frenzy-pulse 0.5s ease-in-out infinite;
	}

	.frenzy-icon {
		width: 14px;
		height: 14px;
		image-rendering: pixelated;
		background-size: calc(4 * 14px) 14px;
		background-repeat: no-repeat;
		animation: frenzy-sprite 0.4s steps(4) infinite;
	}

	@keyframes frenzy-sprite {
		from {
			background-position: 0 0;
		}
		to {
			background-position: -56px 0;
		}
	}

	.frenzy-count {
		font-size: 0.85rem;
	}

	@keyframes frenzy-pulse {
		0%,
		100% {
			box-shadow: 0 0 8px rgba(251, 146, 60, 0.5);
		}
		50% {
			box-shadow: 0 0 14px rgba(251, 146, 60, 0.8);
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

	.attack-counts {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.breakdown-header {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0 0 4px;
	}

	.attack-count {
		font-size: 0.95rem;
		color: rgba(255, 255, 255, 0.8);
		margin: 2px 0;
	}

	.attack-count.crit {
		color: #fbbf24;
	}

	.attack-count.execute {
		color: #ef4444;
	}

	.attack-count.poison {
		color: #22c55e;
	}

	.attack-count.poisonCrit {
		color: #84cc16;
	}
</style>
