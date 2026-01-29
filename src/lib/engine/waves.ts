export const KILLS_PER_WAVE = 5;
export const BASE_BOSS_TIME = 30;

export function getStageMultiplier(stage: number): number {
	return Math.pow(1.5, stage - 1);
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
	return getBossHealth(stage, greed) * getChestHealth(stage, greed);
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

export function getXpReward(enemyMaxHealth: number, stage: number, xpMultiplier: number, enemyXpMultiplier: number = 1): number {
	return Math.floor(enemyMaxHealth * getXpPerHealth(stage) * enemyXpMultiplier * xpMultiplier);
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
	return Math.floor(10 * Math.pow(1.5, level - 1));
}
