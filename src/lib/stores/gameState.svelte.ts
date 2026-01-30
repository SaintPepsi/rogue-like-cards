import type { PlayerStats, Upgrade, Effect, HitInfo } from '$lib/types';
import { createUIEffects } from './uiEffects.svelte';
import { createTimers } from './timers.svelte';
import { createPersistence } from './persistence.svelte';
import { createEnemy } from './enemy.svelte';
import { createLeveling } from './leveling.svelte';
import { createShop } from './shop.svelte';
import { createDefaultStats } from '$lib/engine/stats';
import { calculateAttack, calculatePoison } from '$lib/engine/combat';
import {
	BASE_BOSS_TIME,
	getGreedMultiplier,
	shouldDropGold,
	getXpReward,
	getChestGoldReward,
	getEnemyGoldReward,
	getBossGoldReward,
	BOSS_XP_MULTIPLIER,
	CHEST_XP_MULTIPLIER,
} from '$lib/engine/waves';

function createGameState() {
	const persistence = createPersistence('roguelike-cards-save', 'roguelike-cards-persistent');
	// Player stats
	let playerStats = $state<PlayerStats>(createDefaultStats());

	let effects = $state<Effect[]>([]);
	let unlockedUpgrades = $state<Set<string>>(new Set());
	let gold = $state(0);

	// Poison stacks - each entry is remaining ticks for that stack
	let poisonStacks = $state<number[]>([]);

	// UI state
	let showGameOver = $state(false);

	// UI effects (hits + gold drops)
	const ui = createUIEffects();

	// Timers (boss countdown + poison tick)
	const timers = createTimers();

	// Enemy / wave / stage management
	const enemy = createEnemy();

	// Leveling / XP / upgrade choices
	const leveling = createLeveling();

	// Shop / persistent upgrades
	const shop = createShop(persistence);

	// Derived values
	let bossTimerMax = $derived(BASE_BOSS_TIME + playerStats.bonusBossTime);

	function upgradeContext() {
		return {
			luckyChance: playerStats.luckyChance,
			executeChance: playerStats.executeChance,
			executeCap: shop.getExecuteCapValue(),
			poison: playerStats.poison
		};
	}

	function handleBossExpired() {
		shop.depositGold(gold);
		showGameOver = true;
		persistence.clearSession();
	}

	// Centralized check: is the game currently paused by a modal?
	function isModalOpen() {
		return showGameOver || leveling.hasActiveEvent;
	}

	function attack() {
		if (isModalOpen() || enemy.isDead()) return;

		const result = calculateAttack(playerStats, {
			enemyHealth: enemy.enemyHealth,
			enemyMaxHealth: enemy.enemyMaxHealth,
			overkillDamage: enemy.overkillDamage,
			rng: Math.random,
			executeCap: shop.getExecuteCapValue(),
			isBoss: enemy.isBoss
		});

		// Assign hit IDs (UI concern)
		const newHits: HitInfo[] = result.hits.map((h) => {
			return { ...h, id: ui.nextHitId() };
		});

		// Apply results to state
		enemy.setOverkillDamage(result.overkillDamageOut);
		enemy.takeDamage(result.totalDamage);
		ui.addHits(newHits);

		// Add or refresh poison stacks — one per strike
		if (playerStats.poison > 0) {
			const strikes = result.hits.filter((h) => h.type !== 'execute').length;
			for (let i = 0; i < strikes; i++) {
				if (poisonStacks.length < playerStats.poisonMaxStacks) {
					// Below max: add a new stack
					poisonStacks = [...poisonStacks, playerStats.poisonDuration];
				} else {
					// At max: refresh the oldest (lowest remaining) stack
					const updated = [...poisonStacks];
					let minIndex = 0;
					for (let j = 1; j < updated.length; j++) {
						if (updated[j] < updated[minIndex]) minIndex = j;
					}
					updated[minIndex] = playerStats.poisonDuration;
					poisonStacks = updated;
				}
			}
		}

		if (enemy.isDead()) {
			killEnemy();
		}
	}

	function applyPoison() {
		if (playerStats.poison <= 0 || enemy.isDead() || isModalOpen()) return;
		if (poisonStacks.length === 0) return;

		const result = calculatePoison(playerStats, { rng: Math.random, activeStacks: poisonStacks.length });
		if (result.damage <= 0) return;

		enemy.takeDamage(result.damage);
		ui.addHits([{ damage: result.damage, type: result.type, id: ui.nextHitId(), index: 0 }]);

		// Tick down all stacks and remove expired ones
		poisonStacks = poisonStacks
			.map((remaining) => remaining - 1)
			.filter((remaining) => remaining > 0);

		if (enemy.isDead()) {
			killEnemy();
		}
	}

	// Re-entry guard: JS is single-threaded so attack() (click handler) and
	// applyPoison() (setInterval) can't truly interleave. Kept as a cheap
	// safety net documenting the invariant.
	let killingEnemy = false;

	function killEnemy() {
		if (killingEnemy) return;
		killingEnemy = true;

		try {
			enemy.recordKill();
			poisonStacks = [];

			if (enemy.isChest) {
				const goldReward = getChestGoldReward(enemy.stage, playerStats.goldMultiplier);
				gold += goldReward;
				const wasBossChest = enemy.isBossChest;
				enemy.clearChestFlags();

				leveling.queueChestLoot(wasBossChest, upgradeContext(), goldReward);
				enemy.spawnNextTarget(playerStats);
				saveGame();
				return;
			}

			enemy.advanceWave();

			const effectiveGoldPerKill = playerStats.goldPerKill + shop.getGoldPerKillBonus();
			if (shouldDropGold(playerStats.goldDropChance, Math.random)) {
				const goldReward = enemy.isBoss
					? getBossGoldReward(enemy.stage, effectiveGoldPerKill, playerStats.goldMultiplier)
					: getEnemyGoldReward(enemy.stage, effectiveGoldPerKill, playerStats.goldMultiplier);
				gold += goldReward;
				ui.addGoldDrop(goldReward);
			}

			const enemyXpMultiplier = enemy.isBoss ? BOSS_XP_MULTIPLIER : enemy.isChest ? CHEST_XP_MULTIPLIER : 1;
			const greedMult = getGreedMultiplier(playerStats.greed);
			const xpGain = getXpReward(enemy.enemyMaxHealth, enemy.stage, playerStats.xpMultiplier, enemyXpMultiplier, greedMult);
			leveling.addXp(xpGain);

			if (enemy.isBoss) {
				timers.stopBossTimer();
				enemy.advanceStage();
			}

			leveling.checkLevelUp(upgradeContext());

			if (!enemy.isBoss && enemy.isWaveComplete()) {
				if (enemy.shouldSpawnBossChestTarget(playerStats)) {
					enemy.spawnBossChest(playerStats.greed);
				} else {
					enemy.spawnBoss(playerStats.greed);
					timers.startBossTimer(bossTimerMax, handleBossExpired);
				}
			} else {
				enemy.spawnNextTarget(playerStats);
			}

			saveGame();
		} finally {
			killingEnemy = false;
		}
	}

	function selectUpgrade(upgrade: Upgrade) {
		upgrade.apply(playerStats);

		// Track unlocked upgrades for collection
		unlockedUpgrades = new Set([...unlockedUpgrades, upgrade.id]);

		// Track special effects
		const hasSpecialEffect = upgrade.stats.some(
			(s) =>
				s.label.includes('Crit') ||
				s.label.includes('XP') ||
				s.label.includes('Poison') ||
				s.label.includes('Stacks') ||
				s.label.includes('Duration') ||
				s.label.includes('Multi') ||
				s.label.includes('Execute') ||
				s.label.includes('Overkill') ||
				s.label.includes('Timer') ||
				s.label.includes('Lucky') ||
				s.label.includes('Chest') ||
				s.label.includes('Boss Chest') ||
				s.label.includes('Gold')
		);

		if (hasSpecialEffect) {
			const effectName = upgrade.title;
			if (!effects.find((e) => e.name === effectName)) {
				effects.push({
					name: effectName,
					description: upgrade.stats.map((s) => `${s.label} ${s.value}`).join(', ')
				});
			}
		}

		const allConsumed = leveling.closeActiveEvent();
		if (allConsumed) {
			// All upgrades consumed — resume game
			timers.startPoisonTick(applyPoison);
			timers.resumeBossTimer(handleBossExpired);
		}
		saveGame();
	}

	function openNextUpgrade() {
		const event = leveling.openNextUpgrade();
		if (event) {
			timers.stopPoisonTick();
			timers.pauseBossTimer();
		}
	}

	function saveGame() {
		persistence.saveSession({
			playerStats: { ...playerStats },
			effects: [...effects],
			unlockedUpgradeIds: [...unlockedUpgrades],
			xp: leveling.xp,
			level: leveling.level,
			gold,
			stage: enemy.stage,
			waveKills: enemy.waveKills,
			enemiesKilled: enemy.enemiesKilled,
			enemyHealth: enemy.enemyHealth,
			enemyMaxHealth: enemy.enemyMaxHealth,
			isBoss: enemy.isBoss,
			isChest: enemy.isChest,
			isBossChest: enemy.isBossChest,
			timestamp: Date.now()
		});
	}

	function loadGame(): boolean {
		const data = persistence.loadSession();
		if (!data) return false;

		// Restore player stats, merging with defaults for forward-compat
		const savedStats = data.playerStats as Record<string, unknown>;
		playerStats = { ...createDefaultStats(), ...data.playerStats };
		// Migrate old executeThreshold → executeChance
		if ('executeThreshold' in savedStats && !('executeChance' in savedStats)) {
			const threshold = savedStats.executeThreshold as number;
			playerStats.executeChance = threshold > 0 ? 0.005 : 0;
		}
		delete (playerStats as Record<string, unknown>).executeThreshold;
		effects = [...data.effects];
		unlockedUpgrades = new Set(data.unlockedUpgradeIds);
		leveling.restore({ xp: data.xp, level: data.level });
		gold = data.gold;
		enemy.restore({
			stage: data.stage,
			waveKills: data.waveKills,
			enemiesKilled: data.enemiesKilled,
			enemyHealth: data.enemyHealth,
			enemyMaxHealth: data.enemyMaxHealth,
			isBoss: data.isBoss,
			isChest: data.isChest,
			isBossChest: data.isBossChest ?? false
		});

		return true;
	}

	function applyPurchasedUpgrades() {
		unlockedUpgrades = shop.applyPurchasedUpgrades(playerStats, unlockedUpgrades);
	}

	function resetGame() {
		timers.stopAll();

		playerStats = createDefaultStats();
		effects = [];
		unlockedUpgrades = new Set();
		gold = 0;
		poisonStacks = [];
		ui.reset();
		leveling.reset();
		showGameOver = false;
		shop.resetShopUI();
		persistence.clearSession();

		// Apply purchased upgrades from shop
		applyPurchasedUpgrades();

		enemy.reset(playerStats.greed);
		timers.startPoisonTick(applyPoison);
	}

	function fullReset() {
		shop.fullReset();
		resetGame();
	}

	function init() {
		// Always load persistent data first
		shop.load();

		const loaded = loadGame();
		if (!loaded) {
			// Apply purchased upgrades for new game
			applyPurchasedUpgrades();
			enemy.spawnEnemy(playerStats.greed);
		} else if (enemy.isBoss) {
			// Resume boss timer if we were fighting a boss
			timers.startBossTimer(bossTimerMax, handleBossExpired);
		}
		timers.startPoisonTick(applyPoison);
	}

	return {
		// Getters for state
		get playerStats() {
			return playerStats;
		},
		get effects() {
			return effects;
		},
		get xp() {
			return leveling.xp;
		},
		get level() {
			return leveling.level;
		},
		get xpToNextLevel() {
			return leveling.xpToNextLevel;
		},
		get stage() {
			return enemy.stage;
		},
		get waveKills() {
			return enemy.waveKills;
		},
		get killsPerWave() {
			return enemy.killsPerWave;
		},
		get isBoss() {
			return enemy.isBoss;
		},
		get bossTimer() {
			return timers.bossTimer;
		},
		get enemyHealth() {
			return enemy.enemyHealth;
		},
		get enemyMaxHealth() {
			return enemy.enemyMaxHealth;
		},
		get enemiesKilled() {
			return enemy.enemiesKilled;
		},
		get showGameOver() {
			return showGameOver;
		},
		get upgradeChoices() {
			return leveling.upgradeChoices;
		},
		get hits() {
			return ui.hits;
		},
		get poisonStacks() {
			return poisonStacks;
		},
		get gold() {
			return gold;
		},
		get isChest() {
			return enemy.isChest;
		},
		get isBossChest() {
			return enemy.isBossChest;
		},
		get pendingUpgrades() {
			return leveling.pendingUpgrades;
		},
		get activeEvent() {
			return leveling.activeEvent;
		},
		get hasActiveEvent() {
			return leveling.hasActiveEvent;
		},
		get unlockedUpgrades() {
			return unlockedUpgrades;
		},
		get persistentGold() {
			return shop.persistentGold;
		},
		get purchasedUpgrades() {
			return shop.purchasedUpgrades;
		},
		get showShop() {
			return shop.showShop;
		},
		get shopChoices() {
			return shop.shopChoices;
		},

		get goldDrops() {
			return ui.goldDrops;
		},
		get executeCapLevel() {
			return shop.executeCapLevel;
		},
		get goldPerKillLevel() {
			return shop.goldPerKillLevel;
		},

		// Actions
		attack,
		selectUpgrade,
		openNextUpgrade,
		resetGame,
		fullReset,
		init,
		openShop: (stats?: PlayerStats) => shop.open(stats ?? playerStats),
		closeShop: () => shop.close(),
		buyUpgrade: (upgrade: Upgrade) => shop.buy(upgrade, playerStats),
		getCardPrice: (upgrade: Upgrade) => shop.getPrice(upgrade)
	};
}

export const gameState = createGameState();
