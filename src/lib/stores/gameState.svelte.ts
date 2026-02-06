import { statRegistry } from '$lib/engine/stats';
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
import { createFrenzy } from './frenzy.svelte';
import { createGameLoop } from './gameLoop.svelte';
import { createLeveling } from './leveling.svelte';
import { createPersistence } from './persistence.svelte';
import { createShop } from './shop.svelte';
import { createStatPipeline } from './statPipeline.svelte';
import { createUIEffects } from './uiEffects.svelte';
import { sfx } from '$lib/audio';
import { allUpgrades, getRandomLegendaryUpgrades } from '$lib/data/upgrades';
import { VERSION, RESET_VERSION } from '$lib/version';
import { shouldTriggerReset } from '$lib/utils/versionComparison';
import { getLastResetVersion, setLastResetVersion } from '$lib/utils/resetVersionStorage';

function createGameState() {
	const persistence = createPersistence('roguelike-cards-save', 'roguelike-cards-persistent');

	// Stat pipeline replaces mutable playerStats
	const statPipeline = createStatPipeline();

	// Combat system pipeline (execute, crit, damageMultiplier, poison)
	const pipeline = createPipelineRunner(allSystems);

	let effects = $state<Effect[]>([]);
	let unlockedUpgrades = $state<Set<string>>(new Set());
	let gold = $state(0);

	// Stats comparison tracking
	let startingStats = $state<PlayerStats | null>(null);
	let endingStats = $state<PlayerStats | null>(null);

	// UI state
	let showGameOver = $state(false);
	let wasDefeatNatural = $state(true); // Track if game over was from natural defeat vs give up

	// Legendary start selection
	let hasCompletedFirstRun = $state(false);
	let hasSelectedStartingLegendary = $state(false);
	let showLegendarySelection = $state(false);
	let legendaryChoices = $state<Upgrade[]>([]);
	// Track if we should show legendary selection on next reset (only after natural death)
	let showLegendaryOnNextReset = $state(false);

	// Reactive poison stack count — pipeline.getSystemState() reads from a plain Map
	// which Svelte can't track, so we sync this after every pipeline mutation.
	let poisonStackCount = $state(0);

	// Attack counts per category (reset each run)
	type AttackCounts = {
		normal: number;
		crit: number;
		execute: number;
		poison: number;
	};

	let attackCounts = $state<AttackCounts>({
		normal: 0,
		crit: 0,
		execute: 0,
		poison: 0
	});

	function mapHitType(type: string): keyof AttackCounts | null {
		switch (type) {
			case 'hit':
			case 'normal':
				return 'normal';
			case 'criticalHit':
			case 'crit':
				return 'crit';
			case 'executeHit':
			case 'execute':
				return 'execute';
			case 'poison':
			case 'poisonCrit':
				return 'poison';
			default:
				return null;
		}
	}

	// UI effects (hits + gold drops)
	const ui = createUIEffects();

	// Game loop (rAF + timer registry)
	const gameLoop = createGameLoop();

	// DECISION: 100ms interval = ~10 clicks per second for autoclicker
	// Why: Matches the user request for "about 10 clicks per second" testing aid
	const AUTOCLICKER_INTERVAL_MS = 100;

	// Frenzy module (tap-frenzy stacks + timer-based decay)
	// Uses gameLoop.timers so frenzy decay timers are ticked by the game loop's rAF
	const frenzy = createFrenzy(statPipeline, gameLoop.timers);

	// Enemy / wave / stage management
	const enemy = createEnemy();

	// Leveling / XP / upgrade choices
	const leveling = createLeveling();

	// Shop / persistent upgrades
	const shop = createShop(persistence);

	// Derived values
	const bossTimerMax = $derived(BASE_BOSS_TIME + statPipeline.get('bonusBossTime'));

	// Helper: build a PlayerStats object from pipeline
	function getEffectiveStats(): PlayerStats {
		return {
			damage: statPipeline.get('damage'),
			critChance: statPipeline.get('critChance'),
			critMultiplier: statPipeline.get('critMultiplier'),
			xpMultiplier: statPipeline.get('xpMultiplier'),
			damageMultiplier: statPipeline.get('damageMultiplier'),
			poison: statPipeline.get('poison'),
			poisonCritChance: statPipeline.get('poisonCritChance'),
			poisonMaxStacks: statPipeline.get('poisonMaxStacks'),
			poisonDuration: statPipeline.get('poisonDuration'),
			multiStrike: statPipeline.get('multiStrike'),
			overkill: statPipeline.get('overkill') > 0,
			executeChance: statPipeline.get('executeChance'),
			bonusBossTime: statPipeline.get('bonusBossTime'),
			greed: statPipeline.get('greed'),
			luckyChance: statPipeline.get('luckyChance'),
			chestChance: statPipeline.get('chestChance'),
			bossChestChance: statPipeline.get('bossChestChance'),
			goldMultiplier: statPipeline.get('goldMultiplier'),
			goldDropChance: statPipeline.get('goldDropChance'),
			goldPerKill: statPipeline.get('goldPerKill'),
			attackSpeed: statPipeline.get('attackSpeed'),
			attackSpeedBonus: statPipeline.get('attackSpeedBonus'),
			tapFrenzyBonus: statPipeline.get('tapFrenzyBonus'),
			tapFrenzyDuration: statPipeline.get('tapFrenzyDuration'),
			tapFrenzyDurationBonus: statPipeline.get('tapFrenzyDurationBonus'),
			tapFrenzyStackMultiplier: statPipeline.get('tapFrenzyStackMultiplier'),
			executeCap: shop.getExecuteCapValue()
		};
	}

	function upgradeContext() {
		return {
			luckyChance: statPipeline.get('luckyChance'),
			executeChance: statPipeline.get('executeChance'),
			executeCap: shop.getExecuteCapValue(),
			poison: statPipeline.get('poison'),
			critChance: statPipeline.get('critChance')
		};
	}

	function handleBossExpired(isNaturalDeath: boolean = true) {
		// Capture final stats BEFORE any state changes
		// Why: Ensures we capture stats from the actual run before gameLoop.reset()
		// clears all run-based effects and upgrades, which would show incorrect stats
		endingStats = getEffectiveStats();

		gameLoop.reset();
		shop.depositGold(gold); // This calls shop.save() which saves persistent data
		sfx.play('game:over');
		showGameOver = true;
		wasDefeatNatural = isNaturalDeath;

		// Set meta-progression flag only on natural death (not give up)
		if (isNaturalDeath) {
			hasCompletedFirstRun = true;
			// Only show legendary selection on next reset if this was a natural death
			showLegendaryOnNextReset = true;
		} else {
			// Give up doesn't trigger legendary selection
			showLegendaryOnNextReset = false;
		}

		// Save persistent data again to include hasCompletedFirstRun
		// DECISION: We save twice (shop.save inside depositGold, then here) to ensure
		// hasCompletedFirstRun is persisted. This is acceptable since it only happens on game over.
		const persistentData = persistence.loadPersistent();
		if (persistentData) {
			persistence.savePersistent({
				...persistentData,
				// Only update hasCompletedFirstRun if this is a natural death
				hasCompletedFirstRun: isNaturalDeath ? true : (persistentData.hasCompletedFirstRun ?? false)
			});
		}

		persistence.clearSession();
	}

	function giveUp() {
		if (showGameOver) return;
		handleBossExpired(false); // Give up is not a natural death, don't unlock legendaries
	}

	// Centralized check: is the game currently paused by a modal?
	function isModalOpen() {
		return showGameOver || leveling.hasActiveEvent || showLegendarySelection;
	}

	function syncPoisonStacks() {
		const state = pipeline.getSystemState<{ stacks: number[] }>('poison');
		poisonStackCount = state?.stacks?.length ?? 0;
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

		const stats = getEffectiveStats();
		pipeline.refreshSystems(stats);

		const result = pipeline.runAttack(stats, {
			enemyHealth: enemy.enemyHealth,
			enemyMaxHealth: enemy.enemyMaxHealth,
			overkillDamage: enemy.overkillDamage,
			isBoss: enemy.isBoss,
			rng: Math.random
		});

		// Map pipeline hits to UI HitInfo
		const newHits: HitInfo[] = result.hits.map((h) => {
			let uiType: HitType;
			switch (h.type) {
				case 'criticalHit':
					uiType = 'crit';
					break;
				case 'executeHit':
					uiType = 'execute';
					break;
				case 'hit':
					uiType = 'normal';
					break;
				default:
					uiType = h.type as HitType;
			}
			return {
				damage: h.damage,
				type: uiType,
				id: ui.nextHitId(),
				index: h.index
			};
		});

		// Increment attack counts by category
		for (const hit of result.hits) {
			const category = mapHitType(hit.type);
			if (category !== null) {
				attackCounts = { ...attackCounts, [category]: attackCounts[category] + 1 };
			}
		}

		enemy.setOverkillDamage(result.overkillDamageOut);
		dealDamage(result.totalDamage, newHits);
		syncPoisonStacks();
	}

	function tickSystems() {
		if (enemy.isDead() || isModalOpen()) return;

		const stats = getEffectiveStats();
		const tickResults = pipeline.runTick(stats, { deltaMs: 1000 });

		for (const tick of tickResults) {
			if (tick.damage <= 0) continue;

			dealDamage(tick.damage, [
				{
					damage: tick.damage,
					type: (tick.hitType ?? 'poison') as HitType,
					id: ui.nextHitId(),
					index: 0
				}
			]);

			// Increment poison attack count
			const category = mapHitType(tick.hitType ?? 'poison');
			if (category !== null) {
				attackCounts = { ...attackCounts, [category]: attackCounts[category] + 1 };
			}
		}
		syncPoisonStacks();
	}

	let killingEnemy = false;

	function killEnemy() {
		if (killingEnemy) return;
		killingEnemy = true;

		try {
			const playerStats = getEffectiveStats();
			enemy.recordKill();
			sfx.play('enemy:death');
			pipeline.runKill({
				enemyMaxHealth: enemy.enemyMaxHealth,
				isBoss: enemy.isBoss,
				isChest: enemy.isChest,
				isBossChest: enemy.isBossChest,
				stage: enemy.stage
			});
			syncPoisonStacks();

			if (enemy.isChest) {
				sfx.play('chest:break');
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

			if (shouldDropGold(playerStats.goldDropChance, Math.random)) {
				const goldReward = enemy.isBoss
					? getBossGoldReward(enemy.stage, playerStats.goldPerKill, playerStats.goldMultiplier)
					: getEnemyGoldReward(enemy.stage, playerStats.goldPerKill, playerStats.goldMultiplier);
				gold += goldReward;
				ui.addGoldDrop(goldReward);
				sfx.play('gold:drop');
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
				sfx.play('enemy:bossDeath');
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
							const fmt = entry ? (entry.formatMod ?? entry.format) : null;
							return fmt ? `${entry!.label} ${fmt(m.value)}` : `${m.stat} +${m.value}`;
						})
						.join(', ')
				});
			}
		}

		if (!leveling.closeActiveEvent()) {
			leveling.openNextUpgrade();
			saveGame();
			return;
		}
		gameLoop.resume();
		saveGame();
	}

	function selectLegendaryUpgrade(upgrade: Upgrade | null): void {
		if (upgrade !== null) {
			// Acquire upgrade via pipeline
			statPipeline.acquireUpgrade(upgrade.id);
			if (upgrade.onAcquire) upgrade.onAcquire();

			// Track unlocked upgrades for collection
			unlockedUpgrades = new Set([...unlockedUpgrades, upgrade.id]);

			// Track special effects — same pattern as selectUpgrade
			if (upgrade.modifiers.length > 0) {
				const effectName = upgrade.title;
				if (!effects.find((e) => e.name === effectName)) {
					effects.push({
						name: effectName,
						description: upgrade.modifiers
							.map((m) => {
								const entry = statRegistry.find((s) => s.key === m.stat);
								const formatter = entry ? (entry.formatMod ?? entry.format) : null;
								return formatter
									? `${entry!.label} ${formatter(m.value)}`
									: `${m.stat} +${m.value}`;
							})
							.join(', ')
					});
				}
			}
		}

		// Close modal and clear choices (whether upgrade was selected or skipped)
		showLegendarySelection = false;
		legendaryChoices = [];

		// Mark that user has made their selection for this run
		hasSelectedStartingLegendary = true;

		// Update session data to persist the flag and clear legendary choices
		saveGame();

		// Resume game loop
		gameLoop.resume();
	}

	function startNewRunWithLegendary(): void {
		if (showLegendaryOnNextReset && !hasSelectedStartingLegendary) {
			// Get 3 random legendary upgrades
			legendaryChoices = getRandomLegendaryUpgrades(3);

			// Only show modal if we have legendaries
			if (legendaryChoices.length > 0) {
				showLegendarySelection = true;
				gameLoop.pause();
				saveGame(); // Persist legendary choices so they survive refresh
			} else {
				// No legendaries available (edge case)
				enemy.spawnEnemy(statPipeline.get('greed'));
			}
			// Clear the flag after consuming it
			showLegendaryOnNextReset = false;
		} else {
			// First run ever OR already selected - spawn enemy immediately
			enemy.spawnEnemy(statPipeline.get('greed'));
		}
	}

	function openNextUpgrade() {
		if (!leveling.openNextUpgrade()) return;
		gameLoop.pause();
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
			bossTimeRemaining: gameLoop.bossTimeRemaining > 0 ? gameLoop.bossTimeRemaining : undefined,
			legendaryChoiceIds: legendaryChoices.map((u) => u.id),
			hasSelectedStartingLegendary,
			startingStats: startingStats ?? undefined,
			endingStats: endingStats ?? undefined,
			attackCounts
		});
	}

	function loadGame(): boolean {
		const data = persistence.loadSession();
		if (!data) return false;

		// Restore stats via pipeline from saved upgrade IDs
		statPipeline.setAcquiredUpgrades(data.unlockedUpgradeIds);
		// Also apply shop purchased upgrades
		const shopIds = shop.purchasedUpgradeIds;
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

		// Restore hasSelectedStartingLegendary flag from session
		hasSelectedStartingLegendary = data.hasSelectedStartingLegendary ?? false;

		// Restore legendary choices if they exist AND user hasn't already selected
		if (
			data.legendaryChoiceIds &&
			data.legendaryChoiceIds.length > 0 &&
			!hasSelectedStartingLegendary
		) {
			legendaryChoices = data.legendaryChoiceIds
				.map((id) => allUpgrades.find((u) => u.id === id))
				.filter((u): u is Upgrade => u !== undefined);

			if (legendaryChoices.length > 0) {
				showLegendarySelection = true;
			}
		}

		// Restore stats comparison data
		startingStats = data.startingStats ?? null;
		endingStats = data.endingStats ?? null;

		// Restore attack counts (default to zeros for legacy saves)
		attackCounts = data.attackCounts ?? { normal: 0, crit: 0, execute: 0, poison: 0 };

		return true;
	}

	function buildGameLoopCallbacks() {
		return {
			onAttack: attack,
			onSystemTick: tickSystems,
			onBossExpired: handleBossExpired,
			onBossTimerUrgent: () => sfx.play('boss:clockTicking'),
			getAttackSpeed: () =>
				statPipeline.get('attackSpeed') * (1 + statPipeline.get('attackSpeedBonus')),
			getFrenzyCount: () => frenzy.count
		};
	}

	function resetGame() {
		gameLoop.reset();
		frenzy.reset();
		statPipeline.reset();
		pipeline.reset();

		effects = [];
		unlockedUpgrades = new Set();
		gold = 0;
		attackCounts = { normal: 0, crit: 0, execute: 0, poison: 0 };
		// DECISION: hasCompletedFirstRun is a persistent meta-progression flag (stored in PersistentSaveData)
		// that tracks whether the player has ever completed a run. It should NOT be reset here since
		// resetGame() is for starting a new run (preserving meta-progression), not for clearing all progress.
		// It is only reset in fullReset() which clears all persistent data.
		hasSelectedStartingLegendary = false; // Reset for new run
		ui.reset();
		leveling.reset();
		showGameOver = false;
		shop.resetShopUI();
		persistence.clearSession();

		applyShopUpgrades();

		// Capture starting baseline (base + shop upgrades only)
		startingStats = getEffectiveStats();

		// Reset enemy state (this spawns an initial enemy)
		enemy.reset(statPipeline.get('greed'));

		gameLoop.start(buildGameLoopCallbacks());

		// Show legendary selection only if the previous run ended with a natural death
		// (tracked by showLegendaryOnNextReset flag) AND user hasn't already selected
		if (showLegendaryOnNextReset && !hasSelectedStartingLegendary) {
			legendaryChoices = getRandomLegendaryUpgrades(3);
			if (legendaryChoices.length > 0) {
				showLegendarySelection = true;
				gameLoop.pause();
				saveGame(); // Persist legendary choices so they survive refresh
			}
		}
		// Clear the flag after consuming it
		showLegendaryOnNextReset = false;
	}

	function fullReset() {
		shop.fullReset();
		// DECISION: Reset meta-progression flags here since fullReset() clears ALL persistent data
		// (unlike resetGame() which preserves meta-progression between runs)
		hasCompletedFirstRun = false;
		showLegendaryOnNextReset = false;
		resetGame();
	}

	function applyShopUpgrades() {
		const shopIds = shop.purchasedUpgradeIds;
		if (shopIds.length === 0) return;
		statPipeline.setAcquiredUpgrades(shopIds);
		for (const id of shopIds) {
			unlockedUpgrades = new Set([...unlockedUpgrades, id]);
		}
	}

	function init() {
		// Check if we need to reset due to version change
		const lastResetVersion = getLastResetVersion();
		if (shouldTriggerReset(VERSION, RESET_VERSION, lastResetVersion)) {
			persistence.clearSession();
			persistence.clearPersistent();
			setLastResetVersion(RESET_VERSION);
		}

		// Save reset version for first-time players
		if (!lastResetVersion) {
			setLastResetVersion(RESET_VERSION);
		}

		// Continue with normal initialization
		shop.load();

		// Load persistent data (includes hasCompletedFirstRun)
		const persistentData = persistence.loadPersistent();
		if (persistentData) {
			hasCompletedFirstRun = persistentData.hasCompletedFirstRun;
			// On fresh page load, if player has completed a run, they should see legendary selection
			showLegendaryOnNextReset = persistentData.hasCompletedFirstRun ?? false;
		}

		if (!loadGame()) {
			applyShopUpgrades();
			// Capture starting baseline (base + shop upgrades only) for stats comparison
			startingStats = getEffectiveStats();
			// Start new run with legendary selection (or spawn enemy immediately)
			startNewRunWithLegendary();
		} else {
			pipeline.refreshSystems(getEffectiveStats());
			if (enemy.isBoss) {
				const data = persistence.loadSession();
				gameLoop.startBossTimer(data?.bossTimeRemaining ?? bossTimerMax);
			}
		}

		gameLoop.start(buildGameLoopCallbacks());
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
			return gameLoop.bossTimeRemaining;
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
		get wasDefeatNatural() {
			return wasDefeatNatural;
		},
		get attackCounts() {
			return attackCounts;
		},
		get showLegendarySelection() {
			return showLegendarySelection;
		},
		get legendaryChoices() {
			return legendaryChoices;
		},
		get hasCompletedFirstRun() {
			return hasCompletedFirstRun;
		},
		get hasSelectedStartingLegendary() {
			return hasSelectedStartingLegendary;
		},
		get upgradeChoices() {
			return leveling.upgradeChoices;
		},
		get hits() {
			return ui.hits;
		},
		get poisonStacks() {
			return poisonStackCount;
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
		get rerollCost() {
			return shop.rerollCost;
		},
		get frenzyStacks() {
			return frenzy.count;
		},
		get startingStats() {
			return startingStats;
		},
		get endingStats() {
			return endingStats;
		},

		// Actions
		// DECISION: Frenzy stack added here (input boundary) not inside gameLoop
		// Why: gameLoop.fireAttack() runs for both taps AND auto-attacks. Frenzy
		// should only stack on player taps. gameState owns the input→mechanic mapping.
		pointerDown: () => {
			frenzy.addStack();
			gameLoop.pointerDown();
		},
		pointerUp: () => gameLoop.pointerUp(),

		// DECISION: Autoclicker uses game loop timer, not setInterval
		// Why: setInterval queues callbacks when tab is inactive, causing burst on focus.
		// Game loop caps deltaMs to 200ms (gameLoop.svelte.ts:62) preventing bursts.
		// DECISION: Autoclicker calls gameState.pointerDown() directly (DRY principle)
		// Why: Don't duplicate logic - pointerDown() already handles frenzy + gameLoop interaction.
		startAutoclicker: () => {
			if (gameLoop.timers.has('autoclicker')) return;
			gameLoop.timers.register('autoclicker', {
				remaining: AUTOCLICKER_INTERVAL_MS,
				repeat: AUTOCLICKER_INTERVAL_MS,
				onExpire: () => {
					gameState.pointerDown();
				}
			});
		},
		stopAutoclicker: () => {
			gameLoop.timers.remove('autoclicker');
			gameLoop.pointerUp();
		},

		selectUpgrade,
		selectLegendaryUpgrade,
		openNextUpgrade,
		resetGame,
		fullReset,
		giveUp,
		init,
		openShop: () => {
			showGameOver = false;
			shop.open(getEffectiveStats());
		},
		closeShop: () => shop.close(),
		buyUpgrade: (upgrade: Upgrade) => shop.buy(upgrade, getEffectiveStats()),
		getCardPrice: (upgrade: Upgrade) => shop.getPrice(upgrade),
		getUpgradeLevel: (upgrade: Upgrade) => shop.getUpgradeLevel(upgrade),
		rerollShop: () => shop.reroll(getEffectiveStats()),

		// Test-only methods
		__test__: {
			triggerBossExpired: (isNaturalDeath: boolean = true) => handleBossExpired(isNaturalDeath),
			get bossTimerMax() {
				return bossTimerMax;
			}
		}
	};
}

export const gameState = createGameState();
