import type { PlayerStats, Upgrade, Effect, HitInfo } from '$lib/types';
import { createUIEffects } from './uiEffects.svelte';
import { createTimers } from './timers.svelte';
import { createPersistence } from './persistence.svelte';
import { createEnemy } from './enemy.svelte';
import { createLeveling } from './leveling.svelte';
import { getRandomUpgrades, allUpgrades, getExecuteCap, EXECUTE_CAP_BONUS_PER_LEVEL, executeCapUpgrade, goldPerKillUpgrade, GOLD_PER_KILL_BONUS_PER_LEVEL } from '$lib/data/upgrades';
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
import { getCardPrice as calculateCardPrice } from '$lib/engine/shop';

function createGameState() {
	const persistence = createPersistence('roguelike-cards-save', 'roguelike-cards-persistent');
	// Player stats
	let playerStats = $state<PlayerStats>(createDefaultStats());

	let effects = $state<Effect[]>([]);
	let unlockedUpgrades = $state<Set<string>>(new Set());
	let gold = $state(0);

	// Persistent state (survives game over)
	let persistentGold = $state(0);
	let purchasedUpgrades = $state<Set<string>>(new Set());
	let executeCapBonus = $state(0);
	let goldPerKillBonus = $state(0);
	let showShop = $state(false);
	let shopChoices = $state<Upgrade[]>([]);

	// Poison stacks - each entry is remaining ticks for that stack
	let poisonStacks = $state<number[]>([]);

	// UI state
	let showGameOver = $state(false);
	let showChestLoot = $state(false);
	let chestGold = $state(0);

	// UI effects (hits + gold drops)
	const ui = createUIEffects();

	// Timers (boss countdown + poison tick)
	const timers = createTimers();

	// Enemy / wave / stage management
	const enemy = createEnemy();

	// Leveling / XP / upgrade choices
	const leveling = createLeveling();

	// Derived values
	let bossTimerMax = $derived(BASE_BOSS_TIME + playerStats.bonusBossTime);

	function upgradeContext() {
		return {
			luckyChance: playerStats.luckyChance,
			executeChance: playerStats.executeChance,
			executeCap: getExecuteCap(executeCapBonus),
			poison: playerStats.poison
		};
	}

	function handleBossExpired() {
		persistentGold += gold;
		savePersistent();
		showGameOver = true;
		persistence.clearSession();
	}

	// Centralized check: is the game currently paused by a modal?
	function isModalOpen() {
		return showGameOver || leveling.showLevelUp || showChestLoot;
	}

	function attack() {
		if (isModalOpen() || enemy.isDead()) return;

		const result = calculateAttack(playerStats, {
			enemyHealth: enemy.enemyHealth,
			enemyMaxHealth: enemy.enemyMaxHealth,
			overkillDamage: enemy.overkillDamage,
			rng: Math.random,
			executeCap: getExecuteCap(executeCapBonus)
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

	let killingEnemy = false;

	function killEnemy() {
		// Re-entry guard: attack() and applyPoison() can both call killEnemy
		// in the same tick if poison fires right as attack lands the kill.
		if (killingEnemy) return;
		killingEnemy = true;

		try {
			enemy.recordKill();
			poisonStacks = [];

			if (enemy.isChest) {
				// Chest gives gold + guaranteed upgrade
				const goldReward = getChestGoldReward(enemy.stage, playerStats.goldMultiplier);
				chestGold = goldReward;
				gold += goldReward;
				const wasBossChest = enemy.isBossChest;
				enemy.clearChestFlags();

				leveling.setChoicesForChest(wasBossChest, upgradeContext());
				showChestLoot = true;
				timers.stopPoisonTick();
				timers.pauseBossTimer();
				return;
			}

			enemy.advanceWave();

			// Gold drop check - mobs have a percentage chance to drop gold
			const effectiveGoldPerKill = playerStats.goldPerKill + goldPerKillBonus;
			if (shouldDropGold(playerStats.goldDropChance, Math.random)) {
				const goldReward = enemy.isBoss
					? getBossGoldReward(enemy.stage, effectiveGoldPerKill, playerStats.goldMultiplier)
					: getEnemyGoldReward(enemy.stage, effectiveGoldPerKill, playerStats.goldMultiplier);
				gold += goldReward;
				ui.addGoldDrop(goldReward);
			}

			// XP scales with base enemy health (excluding greed), rate decreases per stage, boosted for bosses/chests
			const enemyXpMultiplier = enemy.isBoss ? BOSS_XP_MULTIPLIER : enemy.isChest ? CHEST_XP_MULTIPLIER : 1;
			const greedMult = getGreedMultiplier(playerStats.greed);
			const xpGain = getXpReward(enemy.enemyMaxHealth, enemy.stage, playerStats.xpMultiplier, enemyXpMultiplier, greedMult);
			leveling.addXp(xpGain);

			if (enemy.isBoss) {
				timers.stopBossTimer();
				enemy.advanceStage();
			}

			// Check for level up (non-blocking - game continues)
			const leveledUp = leveling.checkLevelUp(upgradeContext());
			if (leveledUp) {
				timers.stopPoisonTick();
				timers.pauseBossTimer();
			}

			// Always spawn next target (game continues during level up)
			if (!enemy.isBoss && enemy.isWaveComplete()) {
				// Check if boss should become a chest
				if (enemy.shouldSpawnBossChestTarget(playerStats)) {
					enemy.spawnBossChest(playerStats.greed);
				} else {
					enemy.spawnBoss(playerStats.greed);
					timers.startBossTimer(bossTimerMax, handleBossExpired);
				}
			} else {
				enemy.spawnNextTarget(playerStats);
			}

			// If a level-up modal opened during this kill, ensure timers are paused.
			// This handles the case where spawnBoss() starts a boss timer AFTER
			// checkLevelUp() already attempted to pause timers.
			if (leveling.showLevelUp) {
				timers.stopPoisonTick();
				timers.pauseBossTimer();
			}

			// Auto-save after each kill
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

		// Handle chest loot modal
		if (showChestLoot) {
			showChestLoot = false;
			enemy.spawnNextTarget(playerStats);
			timers.startPoisonTick(applyPoison);
			timers.resumeBossTimer(handleBossExpired);
			saveGame();
			return;
		}

		// Handle queued level ups
		const allConsumed = leveling.consumeLevelUp(upgradeContext());
		if (!allConsumed) {
			saveGame();
			return;
		}

		// All level-ups consumed — resume game
		timers.startPoisonTick(applyPoison);
		timers.resumeBossTimer(handleBossExpired);
		saveGame();
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

	function savePersistent() {
		persistence.savePersistent({
			gold: persistentGold,
			purchasedUpgradeIds: [...purchasedUpgrades],
			executeCapBonus,
			goldPerKillBonus
		});
	}

	function loadPersistent() {
		const data = persistence.loadPersistent();
		if (!data) return;
		persistentGold = data.gold || 0;
		purchasedUpgrades = new Set(data.purchasedUpgradeIds || []);
		executeCapBonus = data.executeCapBonus || 0;
		goldPerKillBonus = data.goldPerKillBonus || 0;
	}

	function getCardPrice(upgrade: Upgrade): number {
		if (upgrade.id === 'execute_cap') {
			const level = Math.round(executeCapBonus / EXECUTE_CAP_BONUS_PER_LEVEL);
			return calculateCardPrice(upgrade.rarity, level);
		}
		if (upgrade.id === 'gold_per_kill') {
			const level = Math.round(goldPerKillBonus / GOLD_PER_KILL_BONUS_PER_LEVEL);
			return calculateCardPrice(upgrade.rarity, level);
		}
		// Count how many times this specific card has been bought
		// For regular cards it's 0 or 1 (can't rebuy), but price still reflects total purchases
		return calculateCardPrice(upgrade.rarity, purchasedUpgrades.size);
	}

	function generateShopChoices(): Upgrade[] {
		// Generate 1 random upgrade choice + always include gold per kill + execute cap cards
		const randomCards = getRandomUpgrades(1, 0.2, playerStats.executeChance, getExecuteCap(executeCapBonus), playerStats.poison);
		return [...randomCards, goldPerKillUpgrade, executeCapUpgrade];
	}

	function openShop() {
		shopChoices = generateShopChoices();
		showShop = true;
	}

	function closeShop() {
		showShop = false;
	}

	function buyUpgrade(upgrade: Upgrade): boolean {
		const price = getCardPrice(upgrade);
		if (persistentGold < price) return false;

		persistentGold -= price;

		if (upgrade.id === 'execute_cap') {
			executeCapBonus += EXECUTE_CAP_BONUS_PER_LEVEL;
		} else if (upgrade.id === 'gold_per_kill') {
			goldPerKillBonus += GOLD_PER_KILL_BONUS_PER_LEVEL;
		} else {
			purchasedUpgrades = new Set([...purchasedUpgrades, upgrade.id]);
		}

		savePersistent();

		// Refresh shop choices after purchase (delayed to let animation play)
		setTimeout(() => {
			shopChoices = generateShopChoices();
		}, 400);
		return true;
	}

	function applyPurchasedUpgrades() {
		// Apply all purchased upgrades at the start of a new game
		for (const upgradeId of purchasedUpgrades) {
			const upgrade = allUpgrades.find((u) => u.id === upgradeId);
			if (upgrade) {
				upgrade.apply(playerStats);
				// Track in unlocked upgrades for collection
				unlockedUpgrades = new Set([...unlockedUpgrades, upgrade.id]);
			}
		}
	}

	function resetGame() {
		timers.stopAll();

		playerStats = createDefaultStats();
		effects = [];
		unlockedUpgrades = new Set();
		gold = 0;
		poisonStacks = [];
		showChestLoot = false;
		chestGold = 0;
		ui.reset();
		leveling.reset();
		showGameOver = false;
		showShop = false;
		persistence.clearSession();

		// Apply purchased upgrades from shop
		applyPurchasedUpgrades();

		enemy.reset(playerStats.greed);
		timers.startPoisonTick(applyPoison);
	}

	function fullReset() {
		// Clear persistent data (bank purchases, gold, execute cap)
		persistentGold = 0;
		purchasedUpgrades = new Set();
		executeCapBonus = 0;
		goldPerKillBonus = 0;
		persistence.clearPersistent();

		// Then do a normal game reset (without purchased upgrades since they're gone)
		resetGame();
	}

	function init() {
		// Always load persistent data first
		loadPersistent();

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
		get showLevelUp() {
			return leveling.showLevelUp;
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
		get showChestLoot() {
			return showChestLoot;
		},
		get chestGold() {
			return chestGold;
		},
		get pendingLevelUps() {
			return leveling.pendingLevelUps;
		},
		get unlockedUpgrades() {
			return unlockedUpgrades;
		},
		get persistentGold() {
			return persistentGold;
		},
		get purchasedUpgrades() {
			return purchasedUpgrades;
		},
		get showShop() {
			return showShop;
		},
		get shopChoices() {
			return shopChoices;
		},

		get goldDrops() {
			return ui.goldDrops;
		},
		get executeCapLevel() {
			return Math.round(executeCapBonus / EXECUTE_CAP_BONUS_PER_LEVEL);
		},
		get goldPerKillLevel() {
			return Math.round(goldPerKillBonus / GOLD_PER_KILL_BONUS_PER_LEVEL);
		},

		// Actions
		attack,
		selectUpgrade,
		resetGame,
		fullReset,
		init,
		openShop,
		closeShop,
		buyUpgrade,
		getCardPrice
	};
}

export const gameState = createGameState();
