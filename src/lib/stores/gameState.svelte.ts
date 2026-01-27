import type { PlayerStats, Upgrade, Effect, HitInfo } from '$lib/types';
import { getRandomUpgrades } from '$lib/data/upgrades';

function createGameState() {
	// Player stats
	let playerStats = $state<PlayerStats>({
		damage: 1,
		critChance: 0,
		critMultiplier: 1.5,
		xpMultiplier: 1,
		poison: 0,
		multiStrike: 0,
		overkill: false,
		executeThreshold: 0,
		bonusBossTime: 0,
		greed: 0,
		luckyChance: 0,
		chestChance: 0.05, // 5% base chance
		goldMultiplier: 1
	});

	let effects = $state<Effect[]>([]);
	let xp = $state(0);
	let level = $state(1);
	let gold = $state(0);

	// Stage/Wave system
	let stage = $state(1);
	let waveKills = $state(0);
	const killsPerWave = 5;
	let isBoss = $state(false);
	let isChest = $state(false);
	let bossTimer = $state(0);
	const baseBossTime = 30;
	let bossInterval: ReturnType<typeof setInterval> | null = null;
	let poisonInterval: ReturnType<typeof setInterval> | null = null;

	// Enemy
	let enemyHealth = $state(10);
	let enemyMaxHealth = $state(10);
	let enemiesKilled = $state(0);
	let overkillDamage = $state(0);

	// UI state
	let showLevelUp = $state(false);
	let showGameOver = $state(false);
	let showChestLoot = $state(false);
	let chestGold = $state(0);
	let upgradeChoices = $state<Upgrade[]>([]);
	let levelingUp = $state(false);

	// Hit display
	let lastHit = $state<HitInfo | null>(null);
	let hitId = $state(0);

	// Derived values
	let xpToNextLevel = $derived(Math.floor(10 * Math.pow(1.5, level - 1)));
	let stageMultiplier = $derived(Math.pow(1.5, stage - 1));
	let greedMultiplier = $derived(1 + playerStats.greed);
	let bossTimerMax = $derived(baseBossTime + playerStats.bonusBossTime);

	function attack() {
		if (showLevelUp || showGameOver || levelingUp) return;

		const strikes = 1 + playerStats.multiStrike;
		let totalDamage = 0;
		let wasCrit = false;

		for (let i = 0; i < strikes; i++) {
			const isCrit = Math.random() < playerStats.critChance;
			if (isCrit) wasCrit = true;

			let damage = isCrit
				? Math.floor(playerStats.damage * playerStats.critMultiplier)
				: playerStats.damage;

			// Add overkill damage from previous kill
			if (i === 0 && overkillDamage > 0) {
				damage += overkillDamage;
				overkillDamage = 0;
			}

			totalDamage += damage;
		}

		// Check execute threshold
		const healthPercent = enemyHealth / enemyMaxHealth;
		if (playerStats.executeThreshold > 0 && healthPercent <= playerStats.executeThreshold) {
			totalDamage = enemyHealth; // Instant kill
		}

		enemyHealth -= totalDamage;
		hitId++;
		lastHit = { damage: totalDamage, crit: wasCrit, id: hitId };

		if (enemyHealth <= 0) {
			// Calculate overkill
			if (playerStats.overkill && enemyHealth < 0) {
				overkillDamage = Math.abs(enemyHealth);
			}
			killEnemy();
		}
	}

	function applyPoison() {
		if (playerStats.poison > 0 && enemyHealth > 0 && !showLevelUp && !showGameOver) {
			enemyHealth -= playerStats.poison;
			if (enemyHealth <= 0) {
				killEnemy();
			}
		}
	}

	function startPoisonTick() {
		if (poisonInterval) clearInterval(poisonInterval);
		poisonInterval = setInterval(applyPoison, 1000);
	}

	function killEnemy() {
		enemiesKilled++;

		if (isChest) {
			// Chest gives gold + guaranteed upgrade
			const goldReward = Math.floor((10 + stage * 5) * playerStats.goldMultiplier);
			chestGold = goldReward;
			gold += goldReward;
			isChest = false;

			// Show chest loot with higher rarity cards
			upgradeChoices = getRandomUpgrades(3, playerStats.luckyChance + 0.5); // +50% rarity boost
			showChestLoot = true;
			return;
		}

		waveKills++;

		// XP scales with stage, boosted by greed
		const xpGain = Math.floor((5 + stage * 3) * playerStats.xpMultiplier);
		xp += xpGain;

		if (isBoss) {
			stopBossTimer();
			stage++;
			waveKills = 0;
			isBoss = false;
		}

		if (xp >= xpToNextLevel) {
			startLevelUp();
		} else if (!isBoss && waveKills >= killsPerWave) {
			spawnBoss();
		} else {
			spawnNextTarget();
		}
	}

	function spawnNextTarget() {
		// Check for chest spawn (not during boss wave buildup)
		if (!isBoss && waveKills < killsPerWave - 1 && Math.random() < playerStats.chestChance) {
			spawnChest();
		} else {
			spawnEnemy();
		}
	}

	function spawnChest() {
		isChest = true;
		// Chests have more health than regular enemies
		enemyMaxHealth = Math.floor(20 * stageMultiplier * greedMultiplier);
		enemyHealth = enemyMaxHealth;
	}

	function startLevelUp() {
		levelingUp = true;
		// Store overflow XP
		const overflowXp = xp - xpToNextLevel;
		// Set XP to max to show full bar
		xp = xpToNextLevel;

		// Wait for bar to fill, then show level up modal
		setTimeout(() => {
			xp = overflowXp;
			level++;
			upgradeChoices = getRandomUpgrades(3, playerStats.luckyChance);
			levelingUp = false;
			showLevelUp = true;
		}, 400);
	}

	function selectUpgrade(upgrade: Upgrade) {
		upgrade.apply(playerStats);

		// Track special effects
		const hasSpecialEffect = upgrade.stats.some(
			(s) =>
				s.label.includes('Crit') ||
				s.label.includes('XP') ||
				s.label.includes('Poison') ||
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
			return;
		}

		showLevelUp = false;

		if (isBoss) {
			// Continue boss fight
		} else if (waveKills >= killsPerWave) {
			spawnBoss();
		} else {
			spawnEnemy();
		}
	}

	function spawnEnemy() {
		enemyMaxHealth = Math.floor(10 * stageMultiplier * greedMultiplier);
		enemyHealth = enemyMaxHealth;
		isBoss = false;
	}

	function spawnBoss() {
		isBoss = true;
		enemyMaxHealth = Math.floor(50 * stageMultiplier * greedMultiplier);
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
				showGameOver = true;
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

	function resetGame() {
		stopBossTimer();
		if (poisonInterval) clearInterval(poisonInterval);

		playerStats = {
			damage: 1,
			critChance: 0,
			critMultiplier: 1.5,
			xpMultiplier: 1,
			poison: 0,
			multiStrike: 0,
			overkill: false,
			executeThreshold: 0,
			bonusBossTime: 0,
			greed: 0,
			luckyChance: 0,
			chestChance: 0.05,
			goldMultiplier: 1
		};
		effects = [];
		xp = 0;
		level = 1;
		stage = 1;
		waveKills = 0;
		isBoss = false;
		overkillDamage = 0;
		enemiesKilled = 0;
		gold = 0;
		isChest = false;
		showChestLoot = false;
		chestGold = 0;
		showLevelUp = false;
		showGameOver = false;
		levelingUp = false;
		spawnEnemy();
		startPoisonTick();
	}

	function init() {
		spawnEnemy();
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
			return killsPerWave;
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
		get lastHit() {
			return lastHit;
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

		// Actions
		attack,
		selectUpgrade,
		resetGame,
		init
	};
}

export const gameState = createGameState();
