<script lang="ts">
	import { onMount } from 'svelte';
	import { gameState } from '$lib/stores/gameState.svelte';
	import StatsPanel from '$lib/components/StatsPanel.svelte';
	import BattleArea from '$lib/components/BattleArea.svelte';
	import LevelUpModal from '$lib/components/LevelUpModal.svelte';
	import GameOverModal from '$lib/components/GameOverModal.svelte';
	import ChestLootModal from '$lib/components/ChestLootModal.svelte';

	onMount(() => {
		gameState.init();
	});
</script>

<svelte:head>
	<title>Rogue Arena</title>
</svelte:head>

<div class="game">
	<header>
		<h1>Rogue Arena</h1>
		<button class="reset-btn" onclick={gameState.resetGame}>Reset</button>
	</header>

	<div class="game-container">
		<!-- Stage Info - Full Width -->
		<div class="stage-info">
			<span class="stage-label">Stage {gameState.stage}</span>
			{#if gameState.isBoss}
				<span class="boss-label">BOSS</span>
				<span class="boss-timer" class:urgent={gameState.bossTimer <= 10}>{gameState.bossTimer}s</span>
			{:else}
				<span class="wave-progress">{gameState.waveKills}/{gameState.killsPerWave} until boss</span>
			{/if}
		</div>

		<!-- Level Bar - Full Width -->
		<div class="level-bar">
			<span class="level-label">Level {gameState.level}</span>
			{#key gameState.level}
				<div class="xp-bar">
					<div class="xp-fill" style:width="{(gameState.xp / gameState.xpToNextLevel) * 100}%"></div>
				</div>
			{/key}
			<span class="xp-text">{gameState.xp}/{gameState.xpToNextLevel} XP</span>
		</div>

		<!-- Main Content: Stats + Battle -->
		<div class="game-layout">
			<StatsPanel stats={gameState.playerStats} effects={gameState.effects} />

			<BattleArea
				isBoss={gameState.isBoss}
				isChest={gameState.isChest}
				enemyHealth={gameState.enemyHealth}
				enemyMaxHealth={gameState.enemyMaxHealth}
				enemiesKilled={gameState.enemiesKilled}
				gold={gameState.gold}
				lastHit={gameState.lastHit}
				onAttack={gameState.attack}
			/>
		</div>
	</div>

	<LevelUpModal
		show={gameState.showLevelUp}
		choices={gameState.upgradeChoices}
		onSelect={gameState.selectUpgrade}
	/>

	<GameOverModal
		show={gameState.showGameOver}
		stage={gameState.stage}
		level={gameState.level}
		enemiesKilled={gameState.enemiesKilled}
		onReset={gameState.resetGame}
	/>

	<ChestLootModal
		show={gameState.showChestLoot}
		gold={gameState.chestGold}
		choices={gameState.upgradeChoices}
		onSelect={gameState.selectUpgrade}
	/>

	<footer>
		<p>
			Assets by <a href="https://danieldiggle.itch.io/sunnyside" target="_blank" rel="noopener"
				>Daniel Diggle - Sunnyside World</a
			>
		</p>
	</footer>
</div>

<style>
	.game {
		min-height: 100vh;
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
		color: white;
		font-family: system-ui, sans-serif;
		display: flex;
		flex-direction: column;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 24px;
		background: rgba(0, 0, 0, 0.3);
	}

	header h1 {
		margin: 0;
		font-size: 1.5rem;
	}

	.reset-btn {
		padding: 8px 16px;
		background: #ef4444;
		border: none;
		border-radius: 4px;
		color: white;
		cursor: pointer;
	}

	.reset-btn:hover {
		background: #dc2626;
	}

	.game-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 24px;
		max-width: 1100px;
		margin: 0 auto;
		flex: 1;
		width: 100%;
		box-sizing: border-box;
	}

	.stage-info {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 12px 20px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
	}

	.stage-label {
		font-weight: bold;
		font-size: 1.2rem;
	}

	.wave-progress {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.9rem;
	}

	.boss-label {
		background: linear-gradient(90deg, #dc2626, #ef4444);
		padding: 4px 12px;
		border-radius: 4px;
		font-weight: bold;
		font-size: 0.9rem;
		animation: pulse 1s ease-in-out infinite;
	}

	.boss-timer {
		font-size: 1.2rem;
		font-weight: bold;
		color: #fbbf24;
	}

	.boss-timer.urgent {
		color: #ef4444;
		animation: pulse 0.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	.level-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 12px 20px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		box-sizing: border-box;
	}

	.level-label {
		flex-shrink: 0;
		font-weight: 500;
	}

	.xp-bar {
		flex: 1 1 auto;
		min-width: 0;
		height: 12px;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 6px;
		overflow: hidden;
	}

	.xp-fill {
		height: 100%;
		background: linear-gradient(90deg, #8b5cf6, #a78bfa);
		transition: width 0.3s ease;
		animation: fill-in 0.3s ease-out;
	}

	@keyframes fill-in {
		from {
			transform: scaleX(0);
			transform-origin: left;
		}
		to {
			transform: scaleX(1);
			transform-origin: left;
		}
	}

	.xp-text {
		flex-shrink: 0;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.game-layout {
		display: grid;
		grid-template-columns: 1fr 4fr;
		gap: 24px;
	}

	footer {
		padding: 16px;
		text-align: center;
		background: rgba(0, 0, 0, 0.3);
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
	}

	footer a {
		color: #a78bfa;
		text-decoration: none;
	}

	footer a:hover {
		text-decoration: underline;
	}

	@media (max-width: 768px) {
		.game-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
