import type { PlayerStats, Upgrade, Effect, HitInfo, HitType } from '$lib/types';
import { createUIEffects } from './uiEffects.svelte';
import { createTimers } from './timers.svelte';
import { createPersistence } from './persistence.svelte';
import { getRandomUpgrades, getRandomLegendaryUpgrades, allUpgrades, getExecuteCap, EXECUTE_CAP_BONUS_PER_LEVEL, executeCapUpgrade, goldPerKillUpgrade, GOLD_PER_KILL_BONUS_PER_LEVEL } from '$lib/data/upgrades';
import { createDefaultStats } from '$lib/engine/stats';
import { calculateAttack, calculatePoison } from '$lib/engine/combat';
import {
	KILLS_PER_WAVE,
	BASE_BOSS_TIME,
	getEnemyHealth,
	getBossHealth,
	getChestHealth,
	getBossChestHealth,
	getGreedMultiplier,
	shouldSpawnChest,
	shouldSpawnBossChest,
	shouldDropGold,
	getXpReward,
	getChestGoldReward,
	getEnemyGoldReward,
	getBossGoldReward,
	getXpToNextLevel,
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
	let xp = $state(0);
	let level = $state(1);
	let gold = $state(0);

	// Persistent state (survives game over)
	let persistentGold = $state(0);
	let purchasedUpgrades = $state<Set<string>>(new Set());
	let executeCapBonus = $state(0);
	let goldPerKillBonus = $state(0);
	let showShop = $state(false);
	let shopChoices = $state<Upgrade[]>([]);

	// Stage/Wave system
	let stage = $state(1);
	let waveKills = $state(0);
	let isBoss = $state(false);
	let isChest = $state(false);
	let isBossChest = $state(false);

	// Enemy
	let enemyHealth = $state(10);
	let enemyMaxHealth = $state(10);
	let enemiesKilled = $state(0);
	let overkillDamage = $state(0);

	// Poison stacks - each entry is remaining ticks for that stack
	let poisonStacks = $state<number[]>([]);

	// UI state
	let showLevelUp = $state(false);
	let pendingLevelUps = $state(0);
	let showGameOver = $state(false);
	let showChestLoot = $state(false);
	let chestGold = $state(0);
	let upgradeChoices = $state<Upgrade[]>([]);

	// UI effects (hits + gold drops)
	const ui = createUIEffects();

	// Timers (boss countdown + poison tick)
	const timers = createTimers();

	// Derived values (for rendering only — game logic should call getXpToNextLevel(level) directly)
	let xpToNextLevel = $derived(getXpToNextLevel(level));
	let bossTimerMax = $derived(BASE_BOSS_TIME + playerStats.bonusBossTime);

	function handleBossExpired() {
		persistentGold += gold;
		savePersistent();
		showGameOver = true;
		persistence.clearSession();
	}

	// Centralized check: is the game currently paused by a modal?
	function isModalOpen() {
		return showGameOver || showLevelUp || showChestLoot;
	}

	function attack() {
		if (isModalOpen() || enemyHealth <= 0) return;

		const result = calculateAttack(playerStats, {
			enemyHealth,
			enemyMaxHealth,
			overkillDamage,
			rng: Math.random,
			executeCap: getExecuteCap(executeCapBonus)
		});

		// Assign hit IDs (UI concern)
		const newHits: HitInfo[] = result.hits.map((h) => {
			return { ...h, id: ui.nextHitId() };
		});

		// Apply results to state
		overkillDamage = result.overkillDamageOut;
		enemyHealth -= result.totalDamage;
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

		if (enemyHealth <= 0) {
			killEnemy();
		}
	}

	function applyPoison() {
		if (playerStats.poison <= 0 || enemyHealth <= 0 || isModalOpen()) return;
		if (poisonStacks.length === 0) return;

		const result = calculatePoison(playerStats, { rng: Math.random, activeStacks: poisonStacks.length });
		if (result.damage <= 0) return;

		enemyHealth -= result.damage;
		ui.addHits([{ damage: result.damage, type: result.type, id: ui.nextHitId(), index: 0 }]);

		// Tick down all stacks and remove expired ones
		poisonStacks = poisonStacks
			.map((remaining) => remaining - 1)
			.filter((remaining) => remaining > 0);

		if (enemyHealth <= 0) {
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
			enemiesKilled++;
			poisonStacks = [];

			if (isChest) {
				// Chest gives gold + guaranteed upgrade
				const goldReward = getChestGoldReward(stage, playerStats.goldMultiplier);
				chestGold = goldReward;
				gold += goldReward;
				const wasBossChest = isBossChest;
				isChest = false;
				isBossChest = false;

				// Boss chests drop legendary-only; regular chests get rarity boost
				if (wasBossChest) {
					upgradeChoices = getRandomLegendaryUpgrades(3);
				} else {
					upgradeChoices = getRandomUpgrades(3, playerStats.luckyChance + 0.5, playerStats.executeChance, getExecuteCap(executeCapBonus), playerStats.poison); // +50% rarity boost
				}
				showChestLoot = true;
				timers.stopPoisonTick();
				timers.pauseBossTimer();
				return;
			}

			waveKills++;

			// Gold drop check - mobs have a percentage chance to drop gold
			const effectiveGoldPerKill = playerStats.goldPerKill + goldPerKillBonus;
			if (shouldDropGold(playerStats.goldDropChance, Math.random)) {
				const goldReward = isBoss
					? getBossGoldReward(stage, effectiveGoldPerKill, playerStats.goldMultiplier)
					: getEnemyGoldReward(stage, effectiveGoldPerKill, playerStats.goldMultiplier);
				gold += goldReward;
				ui.addGoldDrop(goldReward);
			}

			// XP scales with base enemy health (excluding greed), rate decreases per stage, boosted for bosses/chests
			const enemyXpMultiplier = isBoss ? BOSS_XP_MULTIPLIER : isChest ? CHEST_XP_MULTIPLIER : 1;
			const greedMult = getGreedMultiplier(playerStats.greed);
			const xpGain = getXpReward(enemyMaxHealth, stage, playerStats.xpMultiplier, enemyXpMultiplier, greedMult);
			xp += xpGain;

			if (isBoss) {
				timers.stopBossTimer();
				stage++;
				waveKills = 0;
				isBoss = false;
			}

			// Check for level up (non-blocking - game continues)
			if (xp >= getXpToNextLevel(level)) {
				startLevelUp();
			}

			// Always spawn next target (game continues during level up)
			if (!isBoss && waveKills >= KILLS_PER_WAVE) {
				// Check if boss should become a chest
				if (shouldSpawnBossChest(playerStats.chestChance, playerStats.bossChestChance, Math.random)) {
					spawnBossChest();
				} else {
					spawnBoss();
				}
			} else {
				spawnNextTarget();
			}

			// If a level-up modal opened during this kill, ensure timers are paused.
			// This handles the case where spawnBoss() starts a boss timer AFTER
			// startLevelUp() already attempted to pause timers.
			if (showLevelUp) {
				timers.stopPoisonTick();
				timers.pauseBossTimer();
			}

			// Auto-save after each kill
			saveGame();
		} finally {
			killingEnemy = false;
		}
	}

	function spawnNextTarget() {
		if (shouldSpawnChest(playerStats.chestChance, Math.random)) {
			spawnChest();
		} else {
			spawnEnemy();
		}
	}

	function spawnChest() {
		isChest = true;
		enemyMaxHealth = getChestHealth(stage, playerStats.greed);
		enemyHealth = enemyMaxHealth;
	}

	function spawnBossChest() {
		isChest = true;
		isBossChest = true;
		enemyMaxHealth = getBossChestHealth(stage, playerStats.greed);
		enemyHealth = enemyMaxHealth;
	}

	function startLevelUp() {
		// Consume all available level-ups from current XP.
		// IMPORTANT: call getXpToNextLevel(level) directly — the $derived xpToNextLevel
		// may not recompute mid-loop in Svelte 5's synchronous batch.
		// Bounded iteration to avoid any possibility of infinite looping.
		const MAX_LEVELUPS = 100;
		for (let i = 0; i < MAX_LEVELUPS && xp >= getXpToNextLevel(level); i++) {
			pendingLevelUps++;
			xp -= getXpToNextLevel(level);
			level++;
		}

		// If already showing level up modal, just queue the additional levels
		if (showLevelUp) {
			return;
		}

		upgradeChoices = getRandomUpgrades(3, playerStats.luckyChance, playerStats.executeChance, getExecuteCap(executeCapBonus), playerStats.poison);
		showLevelUp = true;
		timers.stopPoisonTick();
		timers.pauseBossTimer();
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
			spawnNextTarget();
			timers.startPoisonTick(applyPoison);
			timers.resumeBossTimer(handleBossExpired);
			saveGame();
			return;
		}

		// Handle queued level ups
		pendingLevelUps = Math.max(0, pendingLevelUps - 1);
		if (pendingLevelUps > 0) {
			// Show next level up
			upgradeChoices = getRandomUpgrades(3, playerStats.luckyChance, playerStats.executeChance, getExecuteCap(executeCapBonus), playerStats.poison);
			saveGame();
			return;
		}

		// All level-ups consumed — close modal and resume game
		showLevelUp = false;
		timers.startPoisonTick(applyPoison);
		timers.resumeBossTimer(handleBossExpired);
		saveGame();
	}

	function spawnEnemy() {
		enemyMaxHealth = getEnemyHealth(stage, playerStats.greed);
		enemyHealth = enemyMaxHealth;
		isBoss = false;
	}

	function spawnBoss() {
		isBoss = true;
		enemyMaxHealth = getBossHealth(stage, playerStats.greed);
		enemyHealth = enemyMaxHealth;
		timers.startBossTimer(bossTimerMax, handleBossExpired);
	}

	function saveGame() {
		persistence.saveSession({
			playerStats: { ...playerStats },
			effects: [...effects],
			unlockedUpgradeIds: [...unlockedUpgrades],
			xp,
			level,
			gold,
			stage,
			waveKills,
			enemiesKilled,
			enemyHealth,
			enemyMaxHealth,
			isBoss,
			isChest,
			isBossChest,
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
		xp = data.xp;
		level = data.level;
		gold = data.gold;
		stage = data.stage;
		waveKills = data.waveKills;
		enemiesKilled = data.enemiesKilled;
		enemyHealth = data.enemyHealth;
		enemyMaxHealth = data.enemyMaxHealth;
		isBoss = data.isBoss;
		isChest = data.isChest;
		isBossChest = data.isBossChest ?? false;

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
		xp = 0;
		level = 1;
		stage = 1;
		waveKills = 0;
		isBoss = false;
		overkillDamage = 0;
		poisonStacks = [];
		enemiesKilled = 0;
		gold = 0;
		isChest = false;
		isBossChest = false;
		showChestLoot = false;
		chestGold = 0;
		ui.reset();
		showLevelUp = false;
		showGameOver = false;
		showShop = false;
		pendingLevelUps = 0;
		persistence.clearSession();

		// Apply purchased upgrades from shop
		applyPurchasedUpgrades();

		spawnEnemy();
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
			spawnEnemy();
		} else if (isBoss) {
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
			return xp;
		},
		get level() {
			return level;
		},
		get xpToNextLevel() {
			return xpToNextLevel;
		},
		get stage() {
			return stage;
		},
		get waveKills() {
			return waveKills;
		},
		get killsPerWave() {
			return KILLS_PER_WAVE;
		},
		get isBoss() {
			return isBoss;
		},
		get bossTimer() {
			return timers.bossTimer;
		},
		get enemyHealth() {
			return enemyHealth;
		},
		get enemyMaxHealth() {
			return enemyMaxHealth;
		},
		get enemiesKilled() {
			return enemiesKilled;
		},
		get showLevelUp() {
			return showLevelUp;
		},
		get showGameOver() {
			return showGameOver;
		},
		get upgradeChoices() {
			return upgradeChoices;
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
			return isChest;
		},
		get isBossChest() {
			return isBossChest;
		},
		get showChestLoot() {
			return showChestLoot;
		},
		get chestGold() {
			return chestGold;
		},
		get pendingLevelUps() {
			return pendingLevelUps;
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
