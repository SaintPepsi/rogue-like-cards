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

export function shouldSpawnChest(chestChance: number, rng: () => number): boolean {
	return rng() < chestChance;
}

export const BOSS_XP_MULTIPLIER = 2;
export const CHEST_XP_MULTIPLIER = 1.5;

export function getXpReward(enemyMaxHealth: number, xpMultiplier: number, enemyXpMultiplier: number = 1): number {
	return Math.floor(Math.log2(enemyMaxHealth + 1) * 3 * xpMultiplier * enemyXpMultiplier);
}

export function getChestGoldReward(stage: number, goldMultiplier: number): number {
	return Math.floor((10 + stage * 5) * goldMultiplier);
}

export function getXpToNextLevel(level: number): number {
	return Math.floor(10 * Math.pow(1.5, level - 1));
}
