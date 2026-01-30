export const KILLS_PER_WAVE = 5;
export const BASE_BOSS_TIME = 30;

export function getStageMultiplier(stage: number): number {
	// Use 1.5^stage for early game, transitioning to softer polynomial growth
	// to prevent numbers from exceeding safe floating-point precision
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
export const BOSS_XP_MULTIPLIER = 2;
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

export function getXpToNextLevel(level: number): number {
	// Same soft cap approach as stage multiplier to prevent overflow
	const SOFT_CAP_LEVEL = 100;
	if (level <= SOFT_CAP_LEVEL) {
		return Math.floor(25 * Math.pow(1.5, level - 1));
	}
	const base = Math.pow(1.5, SOFT_CAP_LEVEL - 1);
	const beyond = level - SOFT_CAP_LEVEL;
	return Math.floor(25 * base * Math.pow(1 + beyond * 0.1, 3));
}
