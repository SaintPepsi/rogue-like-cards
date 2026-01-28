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
	getXpToNextLevel
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
	test('stage 1 with 1x multiplier', () => {
		expect(getXpReward(1, 1)).toBe(8);
	});

	test('stage 3 with 2x multiplier', () => {
		expect(getXpReward(3, 2)).toBe(28);
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
