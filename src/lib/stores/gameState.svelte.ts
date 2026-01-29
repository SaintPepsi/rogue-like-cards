import type { PlayerStats, Upgrade, Effect, HitInfo, HitType } from '$lib/types';
import { getRandomUpgrades, allUpgrades, getExecuteCap, EXECUTE_CAP_BONUS_PER_LEVEL } from '$lib/data/upgrades';
import { createDefaultStats } from '$lib/engine/stats';
import { calculateAttack, calculatePoison } from '$lib/engine/combat';
import {
	KILLS_PER_WAVE,
	BASE_BOSS_TIME,
	getEnemyHealth,
	getBossHealth,
	getChestHealth,
	shouldSpawnChest,
	getXpReward,
	getChestGoldReward,
	getXpToNextLevel,
	BOSS_XP_MULTIPLIER,
	CHEST_XP_MULTIPLIER,
} from '$lib/engine/waves';
import { getCardPrice as calculateCardPrice } from '$lib/engine/shop';

const STORAGE_KEY = 'roguelike-cards-save';
const PERSISTENT_STORAGE_KEY = 'roguelike-cards-persistent';

interface SaveData {
	playerStats: PlayerStats;
	effects: Effect[];
	unlockedUpgradeIds: string[];
	xp: number;
	level: number;
	gold: number;
	stage: number;
	waveKills: number;
	enemiesKilled: number;
	enemyHealth: number;
	enemyMaxHealth: number;
	isBoss: boolean;
	isChest: boolean;
	timestamp: number;
}

interface PersistentData {
	gold: number;
	purchasedUpgradeIds: string[];
	executeCapBonus: number;
}

function createGameState() {
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
	let showShop = $state(false);
	let shopChoices = $state<Upgrade[]>([]);

	// Stage/Wave system
	let stage = $state(1);
	let waveKills = $state(0);
	let isBoss = $state(false);
	let isChest = $state(false);
	let bossTimer = $state(0);
	let bossInterval: ReturnType<typeof setInterval> | null = null;
	let poisonInterval: ReturnType<typeof setInterval> | null = null;

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
	let levelingUp = $state(false);

	// Hit display
	let hits = $state<HitInfo[]>([]);
	let hitId = $state(0);

	// Derived values
	let xpToNextLevel = $derived(getXpToNextLevel(level));
	let bossTimerMax = $derived(BASE_BOSS_TIME + playerStats.bonusBossTime);

	function addHits(newHits: HitInfo[]) {
		hits = [...hits, ...newHits];
		// Clean up old hits after animation completes
		const hitIds = newHits.map((h) => h.id);
		setTimeout(() => {
			hits = hits.filter((h) => !hitIds.includes(h.id));
		}, 700);
	}

	function attack() {
		if (showGameOver || levelingUp) return;

		const result = calculateAttack(playerStats, {
			enemyHealth,
			enemyMaxHealth,
			overkillDamage,
			rng: Math.random,
			executeCap: getExecuteCap(executeCapBonus)
		});

		// Assign hit IDs (UI concern)
		const newHits: HitInfo[] = result.hits.map((h) => {
			hitId++;
			return { ...h, id: hitId };
		});

		// Apply results to state
		overkillDamage = result.overkillDamageOut;
		enemyHealth -= result.totalDamage;
		addHits(newHits);

		// Add or refresh poison stack on attack
		if (playerStats.poison > 0) {
			if (poisonStacks.length < playerStats.poisonMaxStacks) {
				// Below max: add a new stack
				poisonStacks = [...poisonStacks, playerStats.poisonDuration];
			} else {
				// At max: refresh the oldest (lowest remaining) stack
				const updated = [...poisonStacks];
				let minIndex = 0;
				for (let i = 1; i < updated.length; i++) {
					if (updated[i] < updated[minIndex]) minIndex = i;
				}
				updated[minIndex] = playerStats.poisonDuration;
				poisonStacks = updated;
			}
		}

		if (enemyHealth <= 0) {
			killEnemy();
		}
	}

	function applyPoison() {
		if (playerStats.poison <= 0 || enemyHealth <= 0 || showGameOver || levelingUp) return;
		if (poisonStacks.length === 0) return;

		const result = calculatePoison(playerStats, { rng: Math.random, activeStacks: poisonStacks.length });
		if (result.damage <= 0) return;

		enemyHealth -= result.damage;
		hitId++;
		addHits([{ damage: result.damage, type: result.type, id: hitId, index: 0 }]);

		// Tick down all stacks and remove expired ones
		poisonStacks = poisonStacks
			.map((remaining) => remaining - 1)
			.filter((remaining) => remaining > 0);

		if (enemyHealth <= 0) {
			killEnemy();
		}
	}

	function startPoisonTick() {
		if (poisonInterval) clearInterval(poisonInterval);
		poisonInterval = setInterval(applyPoison, 1000);
	}

	function killEnemy() {
		enemiesKilled++;
		poisonStacks = [];

		if (isChest) {
			// Chest gives gold + guaranteed upgrade
			const goldReward = getChestGoldReward(stage, playerStats.goldMultiplier);
			chestGold = goldReward;
			gold += goldReward;
			isChest = false;

			// Show chest loot with higher rarity cards
			upgradeChoices = getRandomUpgrades(3, playerStats.luckyChance + 0.5, playerStats.executeChance, getExecuteCap(executeCapBonus), playerStats.poison); // +50% rarity boost
			showChestLoot = true;
			return;
		}

		waveKills++;

		// XP scales with enemy health, rate decreases per stage, boosted for bosses/chests
		const enemyXpMultiplier = isBoss ? BOSS_XP_MULTIPLIER : isChest ? CHEST_XP_MULTIPLIER : 1;
		const xpGain = getXpReward(enemyMaxHealth, stage, playerStats.xpMultiplier, enemyXpMultiplier);
		xp += xpGain;

		if (isBoss) {
			stopBossTimer();
			stage++;
			waveKills = 0;
			isBoss = false;
		}

		// Check for level up (non-blocking - game continues)
		if (xp >= xpToNextLevel) {
			startLevelUp();
		}

		// Always spawn next target (game continues during level up)
		if (!isBoss && waveKills >= KILLS_PER_WAVE) {
			spawnBoss();
		} else {
			spawnNextTarget();
		}

		// Auto-save after each kill
		saveGame();
	}

	function spawnNextTarget() {
		// Check for chest spawn (not during boss wave buildup)
		if (!isBoss && waveKills < KILLS_PER_WAVE - 1 && shouldSpawnChest(playerStats.chestChance, Math.random)) {
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

	function startLevelUp() {
		// Queue this level up
		pendingLevelUps++;

		// If already showing level up or animating, just queue it
		if (levelingUp || showLevelUp) {
			// Consume the XP for this level
			xp -= xpToNextLevel;
			level++;
			return;
		}

		levelingUp = true;
		// Store overflow XP
		const overflowXp = xp - xpToNextLevel;
		// Set XP to max to show full bar
		xp = xpToNextLevel;

		// Wait for bar to fill, then show level up modal
		setTimeout(() => {
			xp = overflowXp;
			level++;
			upgradeChoices = getRandomUpgrades(3, playerStats.luckyChance, playerStats.executeChance, getExecuteCap(executeCapBonus), playerStats.poison);
			levelingUp = false;
			showLevelUp = true;
		}, 400);
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
				s.label.includes('Lucky')
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
			saveGame();
			return;
		}

		// Handle queued level ups
		pendingLevelUps--;
		if (pendingLevelUps > 0) {
			// Show next level up
			upgradeChoices = getRandomUpgrades(3, playerStats.luckyChance, playerStats.executeChance, getExecuteCap(executeCapBonus), playerStats.poison);
			saveGame();
			return;
		}

		// Game continues in background, just close the modal
		showLevelUp = false;
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
		startBossTimer();
	}

	function startBossTimer() {
		bossTimer = bossTimerMax;
		if (bossInterval) clearInterval(bossInterval);
		bossInterval = setInterval(() => {
			bossTimer--;
			if (bossTimer <= 0) {
				stopBossTimer();
				// Transfer current gold to persistent gold
				persistentGold += gold;
				savePersistent();
				showGameOver = true;
				clearSave(); // Clear save on game over
			}
		}, 1000);
	}

	function stopBossTimer() {
		if (bossInterval) {
			clearInterval(bossInterval);
			bossInterval = null;
		}
		bossTimer = 0;
	}

	function saveGame() {
		const saveData: SaveData = {
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
			timestamp: Date.now()
		};
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
		} catch (e) {
			console.warn('Failed to save game:', e);
		}
	}

	function loadGame(): boolean {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (!saved) return false;

			const data: SaveData = JSON.parse(saved);

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

			return true;
		} catch (e) {
			console.warn('Failed to load game:', e);
			return false;
		}
	}

	function clearSave() {
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch (e) {
			console.warn('Failed to clear save:', e);
		}
	}

	function clearPersistent() {
		try {
			localStorage.removeItem(PERSISTENT_STORAGE_KEY);
		} catch (e) {
			console.warn('Failed to clear persistent data:', e);
		}
	}

	function savePersistent() {
		const data: PersistentData = {
			gold: persistentGold,
			purchasedUpgradeIds: [...purchasedUpgrades],
			executeCapBonus
		};
		try {
			localStorage.setItem(PERSISTENT_STORAGE_KEY, JSON.stringify(data));
		} catch (e) {
			console.warn('Failed to save persistent data:', e);
		}
	}

	function loadPersistent() {
		try {
			const saved = localStorage.getItem(PERSISTENT_STORAGE_KEY);
			if (!saved) return;

			const data: PersistentData = JSON.parse(saved);
			persistentGold = data.gold || 0;
			purchasedUpgrades = new Set(data.purchasedUpgradeIds || []);
			executeCapBonus = data.executeCapBonus || 0;
		} catch (e) {
			console.warn('Failed to load persistent data:', e);
		}
	}

	function getCardPrice(cardIndex: number): number {
		return calculateCardPrice(cardIndex, purchasedUpgrades.size);
	}

	function openShop() {
		// Generate 3 random upgrade choices for the shop
		shopChoices = getRandomUpgrades(3, 0.2, playerStats.executeChance, getExecuteCap(executeCapBonus), playerStats.poison); // Slight lucky boost in shop
		showShop = true;
	}

	function closeShop() {
		showShop = false;
	}

	function buyUpgrade(upgrade: Upgrade, cardIndex: number): boolean {
		const price = getCardPrice(cardIndex);
		if (persistentGold < price) return false;

		persistentGold -= price;
		purchasedUpgrades = new Set([...purchasedUpgrades, upgrade.id]);
		savePersistent();

		// Refresh shop choices after purchase
		shopChoices = getRandomUpgrades(3, 0.2, playerStats.executeChance, getExecuteCap(executeCapBonus), playerStats.poison);
		return true;
	}

	function getExecuteCapPrice(): number {
		// Exponential runaway cost: 25 * e^(0.3 * level)
		// Level 0: 25g, Level 1: 34g, Level 3: 61g, Level 5: 112g,
		// Level 10: 498g, Level 15: 2216g, Level 20: 9866g
		const level = Math.round(executeCapBonus / EXECUTE_CAP_BONUS_PER_LEVEL);
		return Math.round(25 * Math.exp(0.3 * level));
	}

	function buyExecuteCap(): boolean {
		const price = getExecuteCapPrice();
		if (persistentGold < price) return false;

		persistentGold -= price;
		executeCapBonus += EXECUTE_CAP_BONUS_PER_LEVEL;
		savePersistent();
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
		stopBossTimer();
		if (poisonInterval) clearInterval(poisonInterval);

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
		showChestLoot = false;
		chestGold = 0;
		showLevelUp = false;
		showGameOver = false;
		showShop = false;
		levelingUp = false;
		clearSave();

		// Apply purchased upgrades from shop
		applyPurchasedUpgrades();

		spawnEnemy();
		startPoisonTick();
	}

	function fullReset() {
		// Clear persistent data (bank purchases, gold, execute cap)
		persistentGold = 0;
		purchasedUpgrades = new Set();
		executeCapBonus = 0;
		clearPersistent();

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
			startBossTimer();
		}
		startPoisonTick();
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
			return bossTimer;
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
			return hits;
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

		get executeCap() {
			return getExecuteCap(executeCapBonus);
		},
		get executeCapPrice() {
			return getExecuteCapPrice();
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
		buyExecuteCap,
		getCardPrice
	};
}

export const gameState = createGameState();
