import { getEffectiveAttackSpeed } from '$lib/engine/attackSpeed';
import { multiply } from '$lib/engine/statPipeline';
import { BASE_STATS, statRegistry } from '$lib/engine/stats';
import { createPipelineRunner } from '$lib/engine/systemPipeline';
import { allSystems } from '$lib/systems/registry';
import {
	BASE_BOSS_TIME,
	BOSS_XP_MULTIPLIER,
	CHEST_XP_MULTIPLIER,
	getBossGoldReward,
	getChestGoldReward,
	getEnemyGoldReward,
	getGreedMultiplier,
	getXpReward,
	shouldDropGold
} from '$lib/engine/waves';
import type { Effect, HitInfo, HitType, PlayerStats, Upgrade } from '$lib/types';
import { createEnemy } from './enemy.svelte';
import { createGameLoop } from './gameLoop.svelte';
import { createLeveling } from './leveling.svelte';
import { createPersistence } from './persistence.svelte';
import { createShop } from './shop.svelte';
import { createStatPipeline } from './statPipeline.svelte';
import { createUIEffects } from './uiEffects.svelte';

function createGameState() {
	const persistence = createPersistence('roguelike-cards-save', 'roguelike-cards-persistent');

	// Stat pipeline replaces mutable playerStats
	const statPipeline = createStatPipeline();

	// Combat system pipeline (execute, crit, damageMultiplier, poison)
	const pipeline = createPipelineRunner(allSystems);

	let effects = $state<Effect[]>([]);
	let unlockedUpgrades = $state<Set<string>>(new Set());
	let gold = $state(0);

	// UI state
	let showGameOver = $state(false);

	// UI effects (hits + gold drops)
	const ui = createUIEffects();

	// Game loop (rAF + timer registry)
	const gameLoop = createGameLoop();

	// Enemy / wave / stage management
	const enemy = createEnemy();

	// Leveling / XP / upgrade choices
	const leveling = createLeveling();

	// Shop / persistent upgrades
	const shop = createShop(persistence);

	// Derived values
	let bossTimerMax = $derived(BASE_BOSS_TIME + statPipeline.get('bonusBossTime'));

	// Helper: build a PlayerStats object from pipeline
	function getEffectiveStats(): PlayerStats {
		const stats = {} as PlayerStats;
		for (const key of Object.keys(BASE_STATS) as (keyof PlayerStats)[]) {
			(stats as any)[key] = statPipeline.get(key);
		}
		// overkill is boolean in PlayerStats but number in pipeline
		(stats as any).overkill = statPipeline.get('overkill') > 0;
		return stats;
	}

	function getPipelineStats(): Record<string, number> {
		const stats: Record<string, number> = {};
		for (const key of Object.keys(BASE_STATS) as (keyof PlayerStats)[]) {
			const val = statPipeline.get(key);
			stats[key] = typeof val === 'boolean' ? (val ? 1 : 0) : val;
		}
		stats.executeCap = shop.getExecuteCapValue();
		return stats;
	}

	function upgradeContext() {
		return {
			luckyChance: statPipeline.get('luckyChance'),
			executeChance: statPipeline.get('executeChance'),
			executeCap: shop.getExecuteCapValue(),
			poison: statPipeline.get('poison')
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

	function dealDamage(damage: number, hits: HitInfo[]) {
		enemy.takeDamage(damage);
		ui.addHits(hits);
		if (enemy.isDead()) {
			killEnemy();
		}
	}

	function attack() {
		if (isModalOpen() || enemy.isDead()) return;

		const stats = getPipelineStats();
		pipeline.refreshSystems(stats);

		const result = pipeline.runAttack(stats, {
			enemyHealth: enemy.enemyHealth,
			enemyMaxHealth: enemy.enemyMaxHealth,
			overkillDamage: enemy.overkillDamage,
			isBoss: enemy.isBoss,
			rng: Math.random,
		});

		// Map pipeline hits to UI HitInfo
		const newHits: HitInfo[] = result.hits.map((h) => {
			const pipeHit = h as any;
			let uiType: HitType;
			switch (h.type) {
				case 'criticalHit': uiType = 'crit'; break;
				case 'executeHit': uiType = 'execute'; break;
				case 'hit': uiType = 'normal'; break;
				default: uiType = h.type as HitType;
			}
			return {
				damage: pipeHit.damage ?? 0,
				type: uiType,
				id: ui.nextHitId(),
				index: pipeHit.index ?? 0,
			};
		});

		enemy.setOverkillDamage(result.overkillDamageOut);
		dealDamage(result.totalDamage, newHits);
	}

	function tickSystems() {
		if (enemy.isDead() || isModalOpen()) return;

		const stats = getPipelineStats();
		const tickResults = pipeline.runTick(stats, { deltaMs: 1000 });

		for (const tick of tickResults) {
			if (tick.damage <= 0) continue;

			dealDamage(tick.damage, [{
				damage: tick.damage,
				type: (tick.hitType ?? 'poison') as HitType,
				id: ui.nextHitId(),
				index: 0,
			}]);
		}
	}

	let killingEnemy = false;

	function killEnemy() {
		if (killingEnemy) return;
		killingEnemy = true;

		try {
			const playerStats = getEffectiveStats();
			enemy.recordKill();
			pipeline.runKill({
				enemyMaxHealth: enemy.enemyMaxHealth,
				isBoss: enemy.isBoss,
				isChest: enemy.isChest,
				isBossChest: enemy.isBossChest,
				stage: enemy.stage,
			});

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

			const enemyXpMultiplier = enemy.isBoss
				? BOSS_XP_MULTIPLIER
				: enemy.isChest
					? CHEST_XP_MULTIPLIER
					: 1;
			const greedMult = getGreedMultiplier(playerStats.greed);
			const xpGain = getXpReward(
				enemy.enemyMaxHealth,
				enemy.stage,
				playerStats.xpMultiplier,
				enemyXpMultiplier,
				greedMult
			);
			leveling.addXp(xpGain);

			if (enemy.isBoss) {
				gameLoop.stopBossTimer();
				enemy.advanceStage();
			}

			leveling.checkLevelUp(upgradeContext());

			if (!enemy.isBoss && enemy.isWaveComplete()) {
				if (enemy.shouldSpawnBossChestTarget(playerStats)) {
					enemy.spawnBossChest(playerStats.greed);
				} else {
					enemy.spawnBoss(playerStats.greed);
					gameLoop.startBossTimer(bossTimerMax);
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
		statPipeline.acquireUpgrade(upgrade.id);
		if (upgrade.onAcquire) upgrade.onAcquire();

		// Track unlocked upgrades for collection
		unlockedUpgrades = new Set([...unlockedUpgrades, upgrade.id]);

		// Track special effects — derive from modifiers + statRegistry
		if (upgrade.modifiers.length > 0) {
			const effectName = upgrade.title;
			if (!effects.find((e) => e.name === effectName)) {
				effects.push({
					name: effectName,
					description: upgrade.modifiers
						.map((m) => {
							const entry = statRegistry.find((s) => s.key === m.stat);
							return entry ? `${entry.label} ${entry.format(m.value)}` : `${m.stat} +${m.value}`;
						})
						.join(', ')
				});
			}
		}

		const allConsumed = leveling.closeActiveEvent();
		if (allConsumed) {
			gameLoop.resume();
		} else {
			leveling.openNextUpgrade();
		}
		saveGame();
	}

	function openNextUpgrade() {
		const event = leveling.openNextUpgrade();
		if (event) {
			gameLoop.pause();
		}
	}

	function serializeEvent(event: { type: string; choices: Upgrade[]; gold?: number }) {
		return {
			type: event.type as 'levelup' | 'chest',
			choiceIds: event.choices.map((c) => c.id),
			gold: event.gold
		};
	}

	function saveGame() {
		persistence.saveSession({
			playerStats: getEffectiveStats(),
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
			upgradeQueue: leveling.upgradeQueue.map(serializeEvent),
			activeEvent: leveling.activeEvent ? serializeEvent(leveling.activeEvent) : null,
			timestamp: Date.now(),
			bossTimeRemaining: gameLoop.timers.has('boss_countdown')
				? Math.ceil(gameLoop.timers.getRemaining('boss_countdown') / 1000)
				: undefined
		});
	}

	function loadGame(): boolean {
		const data = persistence.loadSession();
		if (!data) return false;

		// Restore stats via pipeline from saved upgrade IDs
		statPipeline.setAcquiredUpgrades(data.unlockedUpgradeIds);
		// Also apply shop purchased upgrades
		const shopIds = [...shop.purchasedUpgrades];
		if (shopIds.length > 0) {
			// Combine session upgrades + shop upgrades
			statPipeline.setAcquiredUpgrades([...data.unlockedUpgradeIds, ...shopIds]);
		}

		effects = [...data.effects];
		unlockedUpgrades = new Set(data.unlockedUpgradeIds);
		// Also mark shop upgrades as unlocked
		for (const id of shopIds) {
			unlockedUpgrades = new Set([...unlockedUpgrades, id]);
		}

		leveling.restore({
			xp: data.xp,
			level: data.level,
			upgradeQueue: data.upgradeQueue,
			activeEvent: data.activeEvent
		});
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

	function resetGame() {
		gameLoop.reset();
		statPipeline.reset();
		pipeline.reset();

		effects = [];
		unlockedUpgrades = new Set();
		gold = 0;
		ui.reset();
		leveling.reset();
		showGameOver = false;
		shop.resetShopUI();
		persistence.clearSession();

		// Apply purchased upgrades from shop via pipeline
		const shopIds = [...shop.purchasedUpgrades];
		if (shopIds.length > 0) {
			statPipeline.setAcquiredUpgrades(shopIds);
			for (const id of shopIds) {
				unlockedUpgrades = new Set([...unlockedUpgrades, id]);
			}
		}

		enemy.reset(statPipeline.get('greed'));

		gameLoop.start({
			onAttack: attack,
			onSystemTick: tickSystems,
			onBossExpired: handleBossExpired,
			onFrenzyChanged: (count) => {
				statPipeline.removeTransient('frenzy');
				if (count > 0) {
					statPipeline.addTransientStep(
						'frenzy',
						'attackSpeed',
						multiply(1 + count * statPipeline.get('tapFrenzyBonus'))
					);
				}
			},
			getAttackSpeed: () => statPipeline.get('attackSpeed'),
			getTapFrenzyBonus: () => statPipeline.get('tapFrenzyBonus'),
			getTapFrenzyDuration: () => statPipeline.get('tapFrenzyDuration')
		});
	}

	function fullReset() {
		shop.fullReset();
		resetGame();
	}

	function init() {
		shop.load();
		const loaded = loadGame();
		if (!loaded) {
			// Apply purchased upgrades for new game
			const shopIds = [...shop.purchasedUpgrades];
			if (shopIds.length > 0) {
				statPipeline.setAcquiredUpgrades(shopIds);
				for (const id of shopIds) {
					unlockedUpgrades = new Set([...unlockedUpgrades, id]);
				}
			}
			enemy.spawnEnemy(statPipeline.get('greed'));
		} else {
			pipeline.refreshSystems(getPipelineStats());
			if (enemy.isBoss) {
				const data = persistence.loadSession();
				const savedBossTime = data?.bossTimeRemaining;
				gameLoop.startBossTimer(savedBossTime ?? bossTimerMax);
			}
		}

		gameLoop.start({
			onAttack: attack,
			onSystemTick: tickSystems,
			onBossExpired: handleBossExpired,
			onFrenzyChanged: (count) => {
				statPipeline.removeTransient('frenzy');
				if (count > 0) {
					statPipeline.addTransientStep(
						'frenzy',
						'attackSpeed',
						multiply(1 + count * statPipeline.get('tapFrenzyBonus'))
					);
				}
			},
			getAttackSpeed: () => statPipeline.get('attackSpeed'),
			getTapFrenzyBonus: () => statPipeline.get('tapFrenzyBonus'),
			getTapFrenzyDuration: () => statPipeline.get('tapFrenzyDuration')
		});
	}

	return {
		// Getters for state
		get playerStats() {
			return getEffectiveStats();
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
			return Math.ceil(gameLoop.timers.getRemaining('boss_countdown') / 1000);
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
			const poisonState = pipeline.getSystemState<{ stacks: number[] }>('poison');
			return poisonState?.stacks ?? [];
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
		get frenzyStacks() {
			return gameLoop.frenzyStacks;
		},
		get effectiveAttackSpeed() {
			return getEffectiveAttackSpeed(
				statPipeline.get('attackSpeed'),
				gameLoop.frenzyStacks,
				statPipeline.get('tapFrenzyBonus')
			);
		},

		// Actions
		pointerDown: () => gameLoop.pointerDown(),
		pointerUp: () => gameLoop.pointerUp(),
		selectUpgrade,
		openNextUpgrade,
		resetGame,
		fullReset,
		init,
		openShop: () => shop.open(getEffectiveStats()),
		closeShop: () => shop.close(),
		buyUpgrade: (upgrade: Upgrade) => shop.buy(upgrade, getEffectiveStats()),
		getCardPrice: (upgrade: Upgrade) => shop.getPrice(upgrade)
	};
}

export const gameState = createGameState();
