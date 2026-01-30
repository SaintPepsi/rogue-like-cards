import { describe, test, expect } from 'vitest';
import {
	getStageMultiplier,
	getGreedMultiplier,
	getEnemyHealth,
	getBossHealth,
	getChestHealth,
	getBossChestHealth,
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

	test('stage 100 still uses exponential', () => {
		expect(getStageMultiplier(100)).toBeCloseTo(Math.pow(1.5, 99));
	});

	test('stage 200 uses soft cap polynomial growth', () => {
		const base = Math.pow(1.5, 99);
		const result = getStageMultiplier(200);
		// Should be much smaller than pure exponential 1.5^199
		expect(result).toBeLessThan(Math.pow(1.5, 199));
		// Should still be larger than the base
		expect(result).toBeGreaterThan(base);
	});

	test('high stages produce finite numbers', () => {
		expect(isFinite(getStageMultiplier(500))).toBe(true);
		expect(isFinite(getStageMultiplier(1000))).toBe(true);
	});

	test('monotonically increasing across soft cap boundary', () => {
		for (let s = 98; s <= 103; s++) {
			expect(getStageMultiplier(s + 1)).toBeGreaterThan(getStageMultiplier(s));
		}
	});

	test('stages 1-100 match pure exponential', () => {
		for (const s of [1, 10, 25, 50, 75, 100]) {
			expect(getStageMultiplier(s)).toBeCloseTo(Math.pow(1.5, s - 1));
		}
	});

	test('post-cap growth is polynomial, not exponential', () => {
		// The ratio between successive stages should decrease (polynomial)
		// rather than stay constant (exponential)
		const ratio150 = getStageMultiplier(151) / getStageMultiplier(150);
		const ratio200 = getStageMultiplier(201) / getStageMultiplier(200);
		const ratio300 = getStageMultiplier(301) / getStageMultiplier(300);
		// Ratios should decrease as stage increases (polynomial growth)
		expect(ratio200).toBeLessThan(ratio150);
		expect(ratio300).toBeLessThan(ratio200);
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

	test('boss chest at stage 1, greed 0', () => {
		// boss(50) * 10 = 500
		expect(getBossChestHealth(1, 0)).toBe(500);
	});

	test('boss chest at stage 2, greed 0', () => {
		// boss(75) * 10 = 750
		expect(getBossChestHealth(2, 0)).toBe(750);
	});

	test('regular enemy with greed', () => {
		expect(getEnemyHealth(1, 0.5)).toBe(15);
	});

	test('all health types are finite at stage 500', () => {
		expect(isFinite(getEnemyHealth(500, 10))).toBe(true);
		expect(isFinite(getBossHealth(500, 10))).toBe(true);
		expect(isFinite(getChestHealth(500, 10))).toBe(true);
		expect(isFinite(getBossChestHealth(500, 10))).toBe(true);
	});

	test('all health types are finite at stage 1000', () => {
		expect(isFinite(getEnemyHealth(1000, 10))).toBe(true);
		expect(isFinite(getBossHealth(1000, 10))).toBe(true);
		expect(isFinite(getChestHealth(1000, 10))).toBe(true);
		expect(isFinite(getBossChestHealth(1000, 10))).toBe(true);
	});

	test('health monotonically increases with stage', () => {
		for (let s = 1; s < 300; s += 50) {
			expect(getEnemyHealth(s + 1, 0)).toBeGreaterThan(getEnemyHealth(s, 0));
			expect(getBossHealth(s + 1, 0)).toBeGreaterThan(getBossHealth(s, 0));
		}
	});

	test('health monotonically increases with greed', () => {
		for (let g = 0; g < 10; g++) {
			expect(getEnemyHealth(50, g + 1)).toBeGreaterThan(getEnemyHealth(50, g));
		}
	});

	test('boss health is approximately 5x regular enemy health', () => {
		for (const s of [1, 50, 100, 200]) {
			const enemy = getEnemyHealth(s, 0);
			const boss = getBossHealth(s, 0);
			// Allow rounding error from independent Math.floor calls
			const ratio = boss / enemy;
			expect(ratio).toBeGreaterThanOrEqual(4.9);
			expect(ratio).toBeLessThanOrEqual(5.1);
		}
	});

	test('boss chest health is 10x boss health', () => {
		for (const s of [1, 50, 100, 200]) {
			const boss = getBossHealth(s, 0);
			const bossChest = getBossChestHealth(s, 0);
			expect(Math.abs(bossChest - boss * 10)).toBeLessThanOrEqual(1);
		}
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
	test('regular enemy at stage 1 with 1x multiplier', () => {
		// 10hp * 1.0 xpPerHp * sqrt(1) = 10
		expect(getXpReward(10, 1, 1)).toBe(10);
	});

	test('boss applies BOSS_XP_MULTIPLIER', () => {
		// 50hp * 1.0 xpPerHp * 1.5 * sqrt(1) = 75
		expect(getXpReward(50, 1, 1, BOSS_XP_MULTIPLIER)).toBe(75);
	});

	test('chest applies CHEST_XP_MULTIPLIER', () => {
		// 20hp * 1.0 xpPerHp * 1.5 * sqrt(1) = 30
		expect(getXpReward(20, 1, 1, CHEST_XP_MULTIPLIER)).toBe(30);
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

	test('xp multiplier has diminishing returns', () => {
		const base = getXpReward(1000, 1, 1);
		const x5 = getXpReward(1000, 1, 5);
		const x10 = getXpReward(1000, 1, 10);
		const x42 = getXpReward(1000, 1, 42.5);

		// sqrt(5) ≈ 2.24, sqrt(10) ≈ 3.16, sqrt(42.5) ≈ 6.52
		expect(x5).toBeCloseTo(base * Math.sqrt(5), -1);
		expect(x10).toBeCloseTo(base * Math.sqrt(10), -1);
		expect(x42).toBeCloseTo(base * Math.sqrt(42.5), -1);

		// Should be much less than linear scaling
		expect(x42).toBeLessThan(base * 42.5 * 0.5);
	});

	test('greed does not inflate XP', () => {
		const stage = 100;
		const baseHp = getEnemyHealth(stage, 0);
		const greedHp = getEnemyHealth(stage, 6.5);
		const greedMult = getGreedMultiplier(6.5);

		// With greed multiplier passed, XP should be based on base health
		const baseXp = getXpReward(baseHp, stage, 1);
		const greedXp = getXpReward(greedHp, stage, 1, 1, greedMult);

		// Should be approximately equal (greed-inflated health divided back out)
		expect(greedXp).toBeCloseTo(baseXp, -1);
	});

	test('greed without passing greed multiplier gives more XP (backwards compat)', () => {
		const stage = 50;
		const baseHp = getEnemyHealth(stage, 0);
		const greedHp = getEnemyHealth(stage, 5);

		// Without greed multiplier (default=1), health inflates XP
		const baseXp = getXpReward(baseHp, stage, 1);
		const greedXp = getXpReward(greedHp, stage, 1);

		expect(greedXp).toBeGreaterThan(baseXp);
	});

	test('at high stages with max bonuses, still requires multiple kills per level', () => {
		// Simulate endgame: stage 300, greed 6.5, xpMult 42.5x
		const stage = 300;
		const greed = 6.5;
		const xpMult = 42.5;
		const greedMult = getGreedMultiplier(greed);
		const hp = getEnemyHealth(stage, greed);
		const xpReward = getXpReward(hp, stage, xpMult, 1, greedMult);
		const xpNeeded = getXpToNextLevel(stage);

		const killsPerLevel = xpNeeded / xpReward;
		// Should need more than 1 kill per level
		expect(killsPerLevel).toBeGreaterThan(1);
	});

	test('xp reward is finite at extreme stages', () => {
		const hp = getEnemyHealth(1000, 10);
		const xp = getXpReward(hp, 1000, 100, 1, getGreedMultiplier(10));
		expect(isFinite(xp)).toBe(true);
		expect(xp).toBeGreaterThan(0);
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
	test('level 1 needs 25 xp', () => {
		expect(getXpToNextLevel(1)).toBe(25);
	});

	test('level 2 needs 37 xp', () => {
		expect(getXpToNextLevel(2)).toBe(37);
	});

	test('level 3 needs 56 xp', () => {
		expect(getXpToNextLevel(3)).toBe(56);
	});

	test('levels 1-100 match pure exponential with base 25', () => {
		for (const lvl of [1, 10, 25, 50, 75, 100]) {
			expect(getXpToNextLevel(lvl)).toBe(Math.floor(25 * Math.pow(1.5, lvl - 1)));
		}
	});

	test('soft cap kicks in after level 100', () => {
		const level100 = getXpToNextLevel(100);
		const level101 = getXpToNextLevel(101);
		// Should still increase
		expect(level101).toBeGreaterThan(level100);
		// But less than pure exponential would
		const pureExponential = Math.floor(25 * Math.pow(1.5, 100));
		expect(level101).toBeLessThan(pureExponential);
	});

	test('monotonically increasing across soft cap boundary', () => {
		for (let l = 98; l <= 103; l++) {
			expect(getXpToNextLevel(l + 1)).toBeGreaterThan(getXpToNextLevel(l));
		}
	});

	test('finite at very high levels', () => {
		expect(isFinite(getXpToNextLevel(500))).toBe(true);
		expect(isFinite(getXpToNextLevel(1000))).toBe(true);
	});

	test('xp required always grows faster than xp earned (base case)', () => {
		// With 1x xp multiplier and no greed, kills-per-level should increase with stage
		// This ensures leveling slows down as you progress
		const killsAtStage10 = getXpToNextLevel(10) / getXpReward(getEnemyHealth(10, 0), 10, 1);
		const killsAtStage50 = getXpToNextLevel(50) / getXpReward(getEnemyHealth(50, 0), 50, 1);
		const killsAtStage100 = getXpToNextLevel(100) / getXpReward(getEnemyHealth(100, 0), 100, 1);

		expect(killsAtStage50).toBeGreaterThan(killsAtStage10);
		expect(killsAtStage100).toBeGreaterThan(killsAtStage50);
	});
});

describe('number overflow protection', () => {
	test('enemy health within MAX_SAFE_INTEGER at early-mid stages', () => {
		// 1.5^89 ≈ 2.8e14, so stage 90 with small greed stays safe
		expect(getEnemyHealth(80, 0)).toBeLessThan(Number.MAX_SAFE_INTEGER);
		expect(getEnemyHealth(50, 5)).toBeLessThan(Number.MAX_SAFE_INTEGER);
	});

	test('enemy health is finite even at extreme stages', () => {
		expect(isFinite(getEnemyHealth(500, 10))).toBe(true);
		expect(isFinite(getEnemyHealth(1000, 10))).toBe(true);
	});

	test('stage multiplier does not produce Infinity up to stage 5000', () => {
		for (let s = 100; s <= 5000; s += 100) {
			const mult = getStageMultiplier(s);
			expect(isFinite(mult)).toBe(true);
			expect(mult).toBeGreaterThan(0);
		}
	});

	test('xp to next level is always positive and finite up to level 5000', () => {
		for (let l = 1; l <= 5000; l += 100) {
			const xp = getXpToNextLevel(l);
			expect(isFinite(xp)).toBe(true);
			expect(xp).toBeGreaterThan(0);
		}
	});

	test('boss chest health is finite at high stages with high greed', () => {
		for (const s of [100, 200, 500, 1000]) {
			const hp = getBossChestHealth(s, 10);
			expect(isFinite(hp)).toBe(true);
			expect(hp).toBeGreaterThan(0);
		}
	});

	test('subtraction precision works at mid-game stages', () => {
		// At stage 50 with no greed, numbers are within safe integer range
		const hp = getEnemyHealth(50, 0);
		expect(hp).toBeLessThan(Number.MAX_SAFE_INTEGER);
		const smallDamage = 50000;
		const result = hp - smallDamage;
		expect(result).toBeLessThan(hp);
		expect(result).not.toBe(hp);
	});

	test('large numbers can still be subtracted with proportional damage', () => {
		// Even at extreme stages, if damage is proportional to health, it works
		const hp = getEnemyHealth(300, 10);
		const proportionalDamage = hp * 0.01; // 1% of health
		const result = hp - proportionalDamage;
		expect(result).toBeLessThan(hp);
		expect(result).toBeCloseTo(hp * 0.99, -5);
	});
});
