import { describe, test, expect } from 'vitest';
import {
	getStageMultiplier,
	getGreedMultiplier,
	getEnemyHealth,
	getBossHealth,
	getChestHealth,
	shouldSpawnChest,
	getXpReward,
	getChestGoldReward,
	getXpToNextLevel,
	BOSS_XP_MULTIPLIER,
	CHEST_XP_MULTIPLIER
} from './waves';

describe('getStageMultiplier', () => {
	test('stage 1 returns 1', () => {
		expect(getStageMultiplier(1)).toBe(1);
	});

	test('stage 2 returns 1.5', () => {
		expect(getStageMultiplier(2)).toBe(1.5);
	});

	test('stage 3 returns 2.25', () => {
		expect(getStageMultiplier(3)).toBeCloseTo(2.25);
	});
});

describe('getGreedMultiplier', () => {
	test('0 greed returns 1', () => {
		expect(getGreedMultiplier(0)).toBe(1);
	});

	test('0.5 greed returns 1.5', () => {
		expect(getGreedMultiplier(0.5)).toBe(1.5);
	});
});

describe('enemy health', () => {
	test('regular enemy at stage 1, greed 0', () => {
		expect(getEnemyHealth(1, 0)).toBe(10);
	});

	test('regular enemy at stage 2, greed 0', () => {
		expect(getEnemyHealth(2, 0)).toBe(15);
	});

	test('boss at stage 1, greed 0', () => {
		expect(getBossHealth(1, 0)).toBe(50);
	});

	test('chest at stage 1, greed 0', () => {
		expect(getChestHealth(1, 0)).toBe(20);
	});

	test('regular enemy with greed', () => {
		expect(getEnemyHealth(1, 0.5)).toBe(15);
	});
});

describe('shouldSpawnChest', () => {
	test('spawns when rng < chestChance', () => {
		expect(shouldSpawnChest(0.05, () => 0.01)).toBe(true);
	});

	test('does not spawn when rng >= chestChance', () => {
		expect(shouldSpawnChest(0.05, () => 0.99)).toBe(false);
	});
});

describe('getXpReward', () => {
	test('regular enemy health 10 with 1x multiplier', () => {
		// floor(log2(11) * 3) = floor(10.37) = 10
		expect(getXpReward(10, 1)).toBe(10);
	});

	test('boss health 50 with boss multiplier', () => {
		// floor(log2(51) * 3 * 2) = floor(34.03) = 34
		expect(getXpReward(50, 1, BOSS_XP_MULTIPLIER)).toBe(34);
	});

	test('chest health 20 with chest multiplier', () => {
		// floor(log2(21) * 3 * 1.5) = floor(19.76) = 19
		expect(getXpReward(20, 1, CHEST_XP_MULTIPLIER)).toBe(19);
	});

	test('boss gives significantly more xp than regular enemy', () => {
		const regularXp = getXpReward(10, 1);
		const bossXp = getXpReward(50, 1, BOSS_XP_MULTIPLIER);
		expect(bossXp).toBeGreaterThan(regularXp * 2);
	});

	test('logarithmic curve falls behind exponential health growth', () => {
		// Health doubles but XP only increases by ~3
		const xpAt10 = getXpReward(10, 1);
		const xpAt20 = getXpReward(20, 1);
		const xpAt40 = getXpReward(40, 1);
		expect(xpAt20 - xpAt10).toBeLessThan(xpAt10);
		expect(xpAt40 - xpAt20).toBeLessThan(xpAt20);
	});
});

describe('getChestGoldReward', () => {
	test('stage 1 with 1x gold multiplier', () => {
		expect(getChestGoldReward(1, 1)).toBe(15);
	});

	test('stage 3 with 2x gold multiplier', () => {
		expect(getChestGoldReward(3, 2)).toBe(50);
	});
});

describe('getXpToNextLevel', () => {
	test('level 1 needs 10 xp', () => {
		expect(getXpToNextLevel(1)).toBe(10);
	});

	test('level 2 needs 15 xp', () => {
		expect(getXpToNextLevel(2)).toBe(15);
	});

	test('level 3 needs 22 xp', () => {
		expect(getXpToNextLevel(3)).toBe(22);
	});
});
