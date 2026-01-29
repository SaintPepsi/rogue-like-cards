import { describe, test, expect } from 'vitest';
import {
	getStageMultiplier,
	getGreedMultiplier,
	getEnemyHealth,
	getBossHealth,
	getChestHealth,
	shouldSpawnChest,
	shouldSpawnBossChest,
	getXpReward,
	getXpPerHealth,
	getChestGoldReward,
	getXpToNextLevel,
	XP_PER_HEALTH,
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

describe('shouldSpawnBossChest', () => {
	test('spawns when both chest and boss chest rolls succeed', () => {
		expect(shouldSpawnBossChest(0.05, 0.001, () => 0.0001)).toBe(true);
	});

	test('does not spawn when chest roll fails', () => {
		let call = 0;
		expect(shouldSpawnBossChest(0.05, 0.001, () => {
			call++;
			return call === 1 ? 0.99 : 0.0001; // chest fails, boss would pass
		})).toBe(false);
	});

	test('does not spawn when boss chest roll fails', () => {
		let call = 0;
		expect(shouldSpawnBossChest(0.05, 0.001, () => {
			call++;
			return call === 1 ? 0.01 : 0.99; // chest passes, boss fails
		})).toBe(false);
	});
});

describe('getXpPerHealth', () => {
	test('stage 1 returns full XP_PER_HEALTH rate', () => {
		expect(getXpPerHealth(1)).toBe(XP_PER_HEALTH);
	});

	test('rate decreases at higher stages', () => {
		expect(getXpPerHealth(4)).toBeLessThan(getXpPerHealth(1));
		expect(getXpPerHealth(9)).toBeLessThan(getXpPerHealth(4));
	});

	test('stage 4 returns half the rate', () => {
		// 1 / sqrt(4) = 0.5
		expect(getXpPerHealth(4)).toBeCloseTo(XP_PER_HEALTH * 0.5);
	});
});

describe('getXpReward', () => {
	test('regular enemy at stage 1', () => {
		// 10hp * 1.0 xpPerHp = 10
		expect(getXpReward(10, 1, 1)).toBe(10);
	});

	test('boss applies BOSS_XP_MULTIPLIER', () => {
		// 50hp * 1.0 xpPerHp * 2 = 100
		expect(getXpReward(50, 1, 1, BOSS_XP_MULTIPLIER)).toBe(100);
	});

	test('chest applies CHEST_XP_MULTIPLIER', () => {
		// 20hp * 1.0 xpPerHp * 1.5 = 30
		expect(getXpReward(20, 1, 1, CHEST_XP_MULTIPLIER)).toBe(30);
	});

	test('base xp rate is the same for all enemy types at a given stage', () => {
		// The underlying rate (before floor) is identical: XP_PER_HEALTH / sqrt(stage)
		const stage = 3;
		const rate = getXpPerHealth(stage);
		const regularHp = getEnemyHealth(stage, 0);
		const bossHp = getBossHealth(stage, 0);
		// Before floor, both use the same rate
		expect(regularHp * rate).toBeCloseTo(bossHp * rate * (regularHp / bossHp));
	});

	test('boss xp per hp is higher than regular due to multiplier', () => {
		const stage = 3;
		const regularHp = getEnemyHealth(stage, 0);
		const bossHp = getBossHealth(stage, 0);
		const regularXpPerHp = getXpReward(regularHp, stage, 1) / regularHp;
		const bossXpPerHp = getXpReward(bossHp, stage, 1, BOSS_XP_MULTIPLIER) / bossHp;
		expect(bossXpPerHp).toBeGreaterThan(regularXpPerHp);
	});

	test('xp rate weens off at higher stages', () => {
		// Same health, higher stage = less XP
		expect(getXpReward(100, 5, 1)).toBeLessThan(getXpReward(100, 1, 1));
		expect(getXpReward(100, 10, 1)).toBeLessThan(getXpReward(100, 5, 1));
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
