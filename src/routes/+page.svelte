<script lang="ts">
	import { Button } from 'bits-ui';
	import { onMount, untrack } from 'svelte';
	import { gameState } from '$lib/stores/gameState.svelte';
	import type { Upgrade } from '$lib/types';
	import { formatNumber } from '$lib/format';
	import { VERSION } from '$lib/version';
	import StatsPanel from '$lib/components/StatsPanel.svelte';
	import BattleArea from '$lib/components/BattleArea.svelte';
	import LevelUpModal from '$lib/components/LevelUpModal.svelte';
	import GameOverModal from '$lib/components/GameOverModal.svelte';
	import ChestLootModal from '$lib/components/ChestLootModal.svelte';
	import UpgradesModal from '$lib/components/UpgradesModal.svelte';
	import ShopModal from '$lib/components/ShopModal.svelte';
	import ChangelogModal from '$lib/components/ChangelogModal.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import UpgradeBadge from '$lib/components/UpgradeBadge.svelte';

	let showUpgradesModal = $state(false);
	let showChangelogModal = $state(false);
	let showSettingsModal = $state(false);
	let showGiveUpConfirm = $state(false);

	// Upgrade slot management for crossfade transitions
	interface UpgradeSlot {
		id: number;
		type: 'levelup' | 'chest';
		choices: Upgrade[];
		pendingCount: number;
		gold: number;
		exiting: boolean;
	}

	let upgradeSlots = $state<UpgradeSlot[]>([]);
	let nextSlotId = $state(0);

	// Create initial slot when activeEvent appears (badge click, page load)
	$effect(() => {
		const event = gameState.activeEvent;

		if (event) {
			const hasActiveSlot = untrack(() => upgradeSlots.some((s) => !s.exiting));
			if (!hasActiveSlot) {
				nextSlotId++;
				upgradeSlots = [
					...untrack(() => upgradeSlots),
					{
						id: nextSlotId,
						type: event.type,
						choices: untrack(() => [...gameState.upgradeChoices]),
						pendingCount: untrack(() => gameState.pendingUpgrades + 1),
						gold: event.gold ?? 0,
						exiting: false
					}
				];
			}
		} else {
			// No event — mark any active slots as exiting (handles game reset)
			untrack(() => {
				const hasActive = upgradeSlots.some((s) => !s.exiting);
				if (hasActive) {
					upgradeSlots = upgradeSlots.map((s) => (s.exiting ? s : { ...s, exiting: true }));
					setTimeout(() => {
						upgradeSlots = upgradeSlots.filter((s) => !s.exiting);
					}, 400);
				}
			});
		}
	});

	function handleUpgradeSelect(upgrade: Upgrade) {
		// Mark all active slots as exiting (starts fade-out animation)
		upgradeSlots = upgradeSlots.map((s) => (s.exiting ? s : { ...s, exiting: true }));

		// Apply the upgrade (may open next event internally)
		gameState.selectUpgrade(upgrade);

		// If there's a new event, add a fresh slot (enters with card-flip animation)
		if (gameState.activeEvent) {
			nextSlotId++;
			upgradeSlots = [
				...upgradeSlots,
				{
					id: nextSlotId,
					type: gameState.activeEvent.type,
					choices: [...gameState.upgradeChoices],
					pendingCount: gameState.pendingUpgrades + 1,
					gold: gameState.activeEvent.gold ?? 0,
					exiting: false
				}
			];
		}

		// Remove exiting slots after animation completes
		setTimeout(() => {
			upgradeSlots = upgradeSlots.filter((s) => !s.exiting);
		}, 400);
	}

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
		<div class="header-buttons">
			{#if !gameState.showGameOver}
				<Button.Root
					class="flex items-center justify-center h-[38px] px-3 border rounded-lg cursor-pointer transition-[background,border-color] duration-150 bg-[rgba(239,68,68,0.15)] text-[#f87171] border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.3)] hover:text-white text-sm font-semibold"
					onclick={() => (showGiveUpConfirm = true)}
					title="Give Up"
				>
					Give Up
				</Button.Root>
			{/if}
			<Button.Root
				class="flex items-center justify-center w-[38px] h-[38px] border rounded-lg cursor-pointer transition-[background,border-color] duration-150 bg-[rgba(139,92,246,0.2)] text-[#a78bfa] border-[rgba(139,92,246,0.3)] hover:bg-[rgba(139,92,246,0.35)] hover:text-white"
				onclick={() => (showUpgradesModal = true)}
				title="Upgrades"
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
					<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
				</svg>
			</Button.Root>
			<Button.Root
				class="flex items-center justify-center w-[38px] h-[38px] border rounded-lg cursor-pointer transition-[background,border-color] duration-150 bg-white/[0.08] text-white/60 border-white/15 hover:bg-white/15 hover:text-white"
				onclick={() => (showSettingsModal = true)}
				title="Settings"
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="3" />
					<path
						d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
					/>
				</svg>
			</Button.Root>
		</div>
	</header>

	<div class="game-container">
		<!-- Stage Info - Full Width -->
		<div class="stage-info">
			<span class="stage-label">Stage {gameState.stage}</span>
			{#if gameState.isBoss}
				<span class="boss-label">BOSS</span>
				<span class="boss-timer" class:urgent={gameState.bossTimer <= 10}
					>{gameState.bossTimer}s</span
				>
			{:else}
				<span class="wave-progress">{gameState.waveKills}/{gameState.killsPerWave} until boss</span>
			{/if}
			<UpgradeBadge count={gameState.pendingUpgrades} onclick={gameState.openNextUpgrade} />
		</div>

		<!-- Level Bar - Full Width -->
		<div class="level-bar">
			<span class="level-label">Level {gameState.level}</span>
			{#key gameState.level}
				<div class="xp-bar">
					<div
						class="xp-fill"
						style:width="{(gameState.xp / gameState.xpToNextLevel) * 100}%"
					></div>
				</div>
			{/key}
			<span class="xp-text"
				>{formatNumber(gameState.xp)}/{formatNumber(gameState.xpToNextLevel)} XP</span
			>
		</div>

		<!-- Main Content: Stats + Battle -->
		<div class="game-layout">
			<div class="stats-column">
				<StatsPanel stats={gameState.playerStats} />
			</div>

			<BattleArea
				isBoss={gameState.isBoss}
				isChest={gameState.isChest}
				isBossChest={gameState.isBossChest}
				enemyHealth={gameState.enemyHealth}
				enemyMaxHealth={gameState.enemyMaxHealth}
				enemiesKilled={gameState.enemiesKilled}
				gold={gameState.gold}
				goldDrops={gameState.goldDrops}
				hits={gameState.hits}
				poisonStacks={gameState.poisonStacks}
				onPointerDown={gameState.pointerDown}
				onPointerUp={gameState.pointerUp}
				frenzyStacks={gameState.frenzyStacks}
			/>
		</div>
	</div>

	{#each upgradeSlots as slot (slot.id)}
		{#if slot.type === 'levelup'}
			<LevelUpModal
				show={true}
				choices={slot.choices}
				pendingCount={slot.exiting ? slot.pendingCount : gameState.pendingUpgrades + 1}
				onSelect={handleUpgradeSelect}
				exiting={slot.exiting}
				currentStats={gameState.playerStats}
			/>
		{:else if slot.type === 'chest'}
			<ChestLootModal
				show={true}
				gold={slot.gold}
				choices={slot.choices}
				onSelect={handleUpgradeSelect}
				exiting={slot.exiting}
				currentStats={gameState.playerStats}
			/>
		{/if}
	{/each}

	<GameOverModal
		show={gameState.showGameOver && !gameState.showShop}
		stage={gameState.stage}
		level={gameState.level}
		enemiesKilled={gameState.enemiesKilled}
		goldEarned={gameState.gold}
		totalGold={gameState.persistentGold}
		onReset={gameState.resetGame}
		onOpenShop={gameState.openShop}
	/>

	<ShopModal
		show={gameState.showShop}
		gold={gameState.persistentGold}
		choices={gameState.shopChoices}
		getUpgradeLevel={gameState.getUpgradeLevel}
		rerollCost={gameState.rerollCost}
		getPrice={gameState.getCardPrice}
		onBuy={gameState.buyUpgrade}
		currentStats={gameState.playerStats}
		onReroll={gameState.rerollShop}
		onBack={gameState.closeShop}
		onPlayAgain={gameState.resetGame}
	/>

	<UpgradesModal
		show={showUpgradesModal}
		unlockedUpgrades={gameState.unlockedUpgrades}
		onClose={() => (showUpgradesModal = false)}
	/>

	<ChangelogModal show={showChangelogModal} onClose={() => (showChangelogModal = false)} />

	<SettingsModal
		show={showSettingsModal}
		onClose={() => (showSettingsModal = false)}
		onOpenChangelog={() => (showChangelogModal = true)}
		onReset={gameState.fullReset}
	/>

	{#if showGiveUpConfirm}
		<div class="confirm-overlay">
			<div class="confirm-dialog">
				<h3>Give Up?</h3>
				<p>Your current run will end and gold will be deposited to the shop.</p>
				<div class="confirm-buttons">
					<Button.Root
						class="py-2.5 px-6 bg-[#374151] border-none rounded-lg text-white text-[0.95rem] font-bold cursor-pointer transition-[background] duration-200 hover:bg-[#4b5563]"
						onclick={() => (showGiveUpConfirm = false)}>Cancel</Button.Root
					>
					<Button.Root
						class="py-2.5 px-6 bg-linear-to-r from-[#dc2626] to-[#ef4444] border-none rounded-lg text-white text-[0.95rem] font-bold cursor-pointer transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-[0_4px_20px_rgba(239,68,68,0.4)]"
						onclick={() => {
							showGiveUpConfirm = false;
							gameState.giveUp();
						}}>Give Up</Button.Root
					>
				</div>
			</div>
		</div>
	{/if}

	<footer>
		<p>
			Assets by <a href="https://danieldiggle.itch.io/sunnyside" target="_blank" rel="noopener"
				>Daniel Diggle - Sunnyside World</a
			>
		</p>
		<a href="mailto:ianhogers@gmail.com?subject=Rogue%20Arena" class="contact-btn">Contact</a>
		<span class="version">v{VERSION}</span>
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
		user-select: none;
		-webkit-user-select: none;
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

	.header-buttons {
		display: flex;
		gap: 8px;
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
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
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

	.stats-column {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.game-layout {
		display: grid;
		grid-template-columns: 1fr 4fr;
		gap: 24px;
	}

	footer {
		position: relative;
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

	.contact-btn {
		display: inline-block;
		margin-top: 8px;
		padding: 6px 16px;
		background: rgba(167, 139, 250, 0.2);
		border: 1px solid #a78bfa;
		border-radius: 4px;
		color: #a78bfa;
		text-decoration: none;
		transition: background 0.2s;
	}

	.contact-btn:hover {
		background: rgba(167, 139, 250, 0.3);
		text-decoration: none;
	}

	.version {
		position: absolute;
		right: 16px;
		bottom: 16px;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.confirm-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
	}

	.confirm-dialog {
		background: #1a1a2e;
		padding: 32px;
		border-radius: 16px;
		text-align: center;
		max-width: 400px;
	}

	.confirm-dialog h3 {
		margin: 0 0 12px;
		font-size: 1.4rem;
		color: #f87171;
	}

	.confirm-dialog p {
		margin: 0 0 24px;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.95rem;
	}

	.confirm-buttons {
		display: flex;
		justify-content: center;
		gap: 12px;
	}

	@media (max-width: 768px) {
		header {
			padding: 12px 16px;
		}

		header h1 {
			font-size: 1.2rem;
		}

		.game-container {
			padding: 16px;
			gap: 14px;
		}

		.stage-info {
			padding: 10px 14px;
			gap: 10px;
		}

		.level-bar {
			padding: 10px 14px;
		}

		.game-layout {
			grid-template-columns: 1fr;
		}

		.game-layout :global(.battle-area) {
			order: -1;
		}
	}
</style>
