// DECISION: 5 kills per wave keeps waves short (~5-10s) so players feel constant progression.
// Lower values (3) made waves trivial; higher values (7+) felt grindy before boss encounters.
export const KILLS_PER_WAVE = 5;

// DECISION: 30s boss timer creates urgency without being punishing.
// 20s was too tight for under-geared players; 45s removed all tension.
export const BASE_BOSS_TIME = 30;

// DECISION: 1.5x per stage gives noticeable but not overwhelming scaling.
// 1.3x felt too flat past stage 10; 2.0x caused health to outpace damage by stage 15.
// Soft cap at stage 100: 1.5^100 ≈ 4e17, still within safe float range.
// Beyond 100, polynomial growth (cubic) keeps numbers climbing without overflow.
export function getStageMultiplier(stage: number): number {
	const SOFT_CAP_STAGE = 100;
	if (stage <= SOFT_CAP_STAGE) {
		return Math.pow(1.5, stage - 1);
	}
	// After soft cap: exponential base at cap * polynomial growth beyond
	const base = Math.pow(1.5, SOFT_CAP_STAGE - 1);
	const beyond = stage - SOFT_CAP_STAGE;
	return base * Math.pow(1 + beyond * 0.1, 3);
}

export function getGreedMultiplier(greed: number): number {
	return 1 + greed;
}

export function getEnemyHealth(stage: number, greed: number): number {
	return Math.floor(10 * getStageMultiplier(stage) * getGreedMultiplier(greed));
}

export function getBossHealth(stage: number, greed: number): number {
	return Math.floor(50 * getStageMultiplier(stage) * getGreedMultiplier(greed));
}

export function getChestHealth(stage: number, greed: number): number {
	return Math.floor(20 * getStageMultiplier(stage) * getGreedMultiplier(greed));
}

export function getBossChestHealth(stage: number, greed: number): number {
	// Use boss health * fixed multiplier instead of boss * chest (which squared the exponent)
	return Math.floor(getBossHealth(stage, greed) * 10);
}

export function shouldSpawnChest(chestChance: number, rng: () => number): boolean {
	return rng() < chestChance;
}

export function shouldSpawnBossChest(chestChance: number, bossChestChance: number, rng: () => number): boolean {
	return rng() < chestChance && rng() < bossChestChance;
}

export const XP_PER_HEALTH = 1;
export const BOSS_XP_MULTIPLIER = 1.5;
export const CHEST_XP_MULTIPLIER = 1.5;

export function getXpPerHealth(stage: number): number {
	return XP_PER_HEALTH / Math.sqrt(stage);
}

export function getXpReward(enemyMaxHealth: number, stage: number, xpMultiplier: number, enemyXpMultiplier: number = 1, greedMultiplier: number = 1): number {
	// Decouple XP from greed: use base health (before greed) so greed is purely a difficulty increase
	const baseHealth = enemyMaxHealth / greedMultiplier;
	// Apply diminishing returns to XP multiplier to prevent every-kill level ups at high stages
	const effectiveXpMult = Math.sqrt(xpMultiplier);
	return Math.floor(baseHealth * getXpPerHealth(stage) * enemyXpMultiplier * effectiveXpMult);
}

export function getChestGoldReward(stage: number, goldMultiplier: number): number {
	return Math.floor((10 + stage * 5) * goldMultiplier);
}

export function getEnemyGoldReward(stage: number, goldPerKill: number, goldMultiplier: number): number {
	return Math.floor((2 + stage + goldPerKill) * goldMultiplier);
}

export function getBossGoldReward(stage: number, goldPerKill: number, goldMultiplier: number): number {
	return Math.floor((5 + stage * 2 + goldPerKill) * goldMultiplier);
}

export function shouldDropGold(goldDropChance: number, rng: () => number): boolean {
	return rng() < goldDropChance;
}

// DECISION: Base XP 25 with 1.5x growth per level.
// Originally 10, but that caused level-up spam in early stages (leveling every 1-2 kills).
// 25 means level 1→2 requires ~2-3 kills, scaling steeply to prevent trivial late-game leveling.
export function getXpToNextLevel(level: number, base: number = 25): number {
	const SOFT_CAP_LEVEL = 100;
	if (level <= SOFT_CAP_LEVEL) {
		return Math.floor(base * Math.pow(1.5, level - 1));
	}
	const baseMult = Math.pow(1.5, SOFT_CAP_LEVEL - 1);
	const beyond = level - SOFT_CAP_LEVEL;
	return Math.floor(base * baseMult * Math.pow(1 + beyond * 0.1, 3));
}
