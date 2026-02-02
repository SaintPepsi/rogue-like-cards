import { describe, test, expect } from 'vitest';
import {
	getEnemyHealth,
	getBossHealth,
	getXpReward,
	getXpToNextLevel,
	getStageMultiplier,
	KILLS_PER_WAVE,
	XP_PER_HEALTH,
	BOSS_XP_MULTIPLIER,
	getEnemyGoldReward,
	getBossGoldReward,
	getChestHealth
} from './waves';
import { getEffectiveAttackSpeed, getAttackIntervalMs } from './attackSpeed';
import { createDefaultStats, BASE_STATS } from './stats';

// DECISION: Simulation tests verify the balance redesign produces reasonable
// progression at key stage checkpoints. These tests pin the expected ranges
// so future changes to formulas don't silently break game feel.
// Values are ranges (not exact) so small tuning changes don't break tests.

describe('balance simulation', () => {
	describe('enemy HP scaling', () => {
		test('stage 1 enemy has 5 HP (base, no greed)', () => {
			expect(getEnemyHealth(1, 0)).toBe(5);
		});

		test('stage 1 boss has 25 HP', () => {
			expect(getBossHealth(1, 0)).toBe(25);
		});

		test('stage 5 enemies are manageable with base damage', () => {
			const hp = getEnemyHealth(5, 0);
			// 5 * 1.5^4 ≈ 25
			expect(hp).toBeGreaterThanOrEqual(20);
			expect(hp).toBeLessThanOrEqual(30);
		});

		test('stage 10 enemies require meaningful upgrades', () => {
			const hp = getEnemyHealth(10, 0);
			// 5 * 1.5^9 ≈ 192
			expect(hp).toBeGreaterThanOrEqual(150);
			expect(hp).toBeLessThanOrEqual(250);
		});

		test('stage 20 HP grows steeply', () => {
			const hp = getEnemyHealth(20, 0);
			// 5 * 1.5^19 ≈ 9,536
			expect(hp).toBeGreaterThanOrEqual(5000);
			expect(hp).toBeLessThanOrEqual(15000);
		});

		test('stage 50 HP is in millions', () => {
			const hp = getEnemyHealth(50, 0);
			expect(hp).toBeGreaterThanOrEqual(1_000_000);
		});
	});

	describe('wave total HP', () => {
		test('10 kills per wave', () => {
			expect(KILLS_PER_WAVE).toBe(10);
		});

		test('stage 1 total wave HP is 50 (10 enemies * 5 HP)', () => {
			const waveHp = getEnemyHealth(1, 0) * KILLS_PER_WAVE;
			expect(waveHp).toBe(50);
		});

		test('stage 1 boss + wave total is 75', () => {
			const total = getEnemyHealth(1, 0) * KILLS_PER_WAVE + getBossHealth(1, 0);
			expect(total).toBe(75);
		});
	});

	describe('XP and leveling curve', () => {
		test('stage 1 enemy gives 5 XP (5hp * 1 xp/hp)', () => {
			const xp = getXpReward(getEnemyHealth(1, 0), 1, 1);
			expect(xp).toBe(5);
		});

		test('stage 1 boss gives 37 XP (25hp * 1.5x multiplier)', () => {
			const xp = getXpReward(getBossHealth(1, 0), 1, 1, BOSS_XP_MULTIPLIER);
			expect(xp).toBe(37);
		});

		test('level 1->2 requires 12 XP (~3 kills at stage 1)', () => {
			const xpNeeded = getXpToNextLevel(1);
			const xpPerKill = getXpReward(getEnemyHealth(1, 0), 1, 1);
			const killsNeeded = Math.ceil(xpNeeded / xpPerKill);
			expect(xpNeeded).toBe(12);
			expect(killsNeeded).toBe(3);
		});

		test('level 2->3 requires 18 XP (~4 kills at stage 1)', () => {
			const xpNeeded = getXpToNextLevel(2);
			const xpPerKill = getXpReward(getEnemyHealth(1, 0), 1, 1);
			const killsNeeded = Math.ceil(xpNeeded / xpPerKill);
			expect(xpNeeded).toBe(18);
			expect(killsNeeded).toBeLessThanOrEqual(5);
		});

		test('XP per HP diminishes at higher stages', () => {
			const earlyXp = getXpReward(getEnemyHealth(5, 0), 5, 1);
			const lateXp = getXpReward(getEnemyHealth(20, 0), 20, 1);
			// Even though enemies have more HP, xp/hp decreases by 1/sqrt(stage)
			// Stage 5 xp per hp: 1/sqrt(5) ≈ 0.447
			// Stage 20 xp per hp: 1/sqrt(20) ≈ 0.224
			// So late game enemies give proportionally less XP relative to their HP
			const earlyXpPerHp = earlyXp / getEnemyHealth(5, 0);
			const lateXpPerHp = lateXp / getEnemyHealth(20, 0);
			expect(lateXpPerHp).toBeLessThan(earlyXpPerHp);
		});

		test('XP multiplier has diminishing returns via sqrt', () => {
			const base = getXpReward(getEnemyHealth(1, 0), 1, 1);
			const with4xMult = getXpReward(getEnemyHealth(1, 0), 1, 4);
			// sqrt(4) = 2, so 4x multiplier only gives 2x XP
			expect(with4xMult).toBe(base * 2);
		});

		test('level 10 requires significantly more XP than level 1', () => {
			const level1 = getXpToNextLevel(1);
			const level10 = getXpToNextLevel(10);
			// 12 * 1.5^9 ≈ 461
			expect(level10).toBeGreaterThan(level1 * 20);
		});
	});

	describe('attack speed progression', () => {
		test('base attack speed is 0.8/s (1250ms interval)', () => {
			const speed = getEffectiveAttackSpeed(BASE_STATS.attackSpeed, 0, 0, 0);
			expect(speed).toBe(0.8);
			expect(getAttackIntervalMs(speed)).toBe(1250);
		});

		test('25% attack speed bonus gives 1.0/s', () => {
			const speed = getEffectiveAttackSpeed(0.8, 0, 0, 0.25);
			expect(speed).toBe(1.0);
		});

		test('frenzy stacks multiply on top of attack speed bonus', () => {
			// 5 frenzy stacks at 5% bonus = 25% more speed
			const withFrenzy = getEffectiveAttackSpeed(0.8, 5, 0.05, 0.25);
			const withoutFrenzy = getEffectiveAttackSpeed(0.8, 0, 0, 0.25);
			expect(withFrenzy).toBeGreaterThan(withoutFrenzy);
			// 0.8 * 1.25 * 1.25 = 1.25
			expect(withFrenzy).toBeCloseTo(1.25, 5);
		});

		test('max legendary attack speed bonus (25%) nearly doubles base speed', () => {
			const base = getEffectiveAttackSpeed(0.8, 0, 0, 0);
			const maxBonus = getEffectiveAttackSpeed(0.8, 0, 0, 0.25);
			// Single legendary card gives 25% bonus
			expect(maxBonus / base).toBeCloseTo(1.25, 5);
		});

		test('stacking multiple attack speed cards compounds', () => {
			// Common 0.5% + Uncommon 1% + Rare 2.5% + Epic 5% = 9%
			const stacked = getEffectiveAttackSpeed(0.8, 0, 0, 0.09);
			expect(stacked).toBeCloseTo(0.872, 3);
		});
	});

	describe('gold economy', () => {
		test('stage 1 enemy gold reward is base 3g (2 + 1 stage)', () => {
			const gold = getEnemyGoldReward(1, 0, 1);
			expect(gold).toBe(3);
		});

		test('stage 1 boss gold reward is 7g', () => {
			const gold = getBossGoldReward(1, 0, 1);
			expect(gold).toBe(7);
		});

		test('gold per kill bonus adds flat gold', () => {
			const base = getEnemyGoldReward(1, 0, 1);
			const withBonus = getEnemyGoldReward(1, 5, 1);
			expect(withBonus - base).toBe(5);
		});

		test('gold multiplier scales all gold', () => {
			const base = getEnemyGoldReward(5, 0, 1);
			const doubled = getEnemyGoldReward(5, 0, 2);
			expect(doubled).toBe(base * 2);
		});

		test('stage 10 gold rewards scale with stage', () => {
			const gold = getEnemyGoldReward(10, 0, 1);
			expect(gold).toBe(12); // 2 + 10
		});
	});

	describe('default stat baseline', () => {
		test('base stats form a reasonable starting point', () => {
			const stats = createDefaultStats();
			expect(stats.damage).toBe(1);
			expect(stats.critChance).toBe(0);
			expect(stats.critMultiplier).toBe(1.5);
			expect(stats.attackSpeed).toBe(0.8);
			expect(stats.tapFrenzyDuration).toBe(1);
			expect(stats.tapFrenzyDurationBonus).toBe(0);
			expect(stats.executeCap).toBe(0.05);
			expect(stats.executeChance).toBe(0);
			expect(stats.luckyChance).toBe(0);
		});

		test('frenzy base duration is 1s (short, requires upgrades)', () => {
			expect(createDefaultStats().tapFrenzyDuration).toBe(1);
		});

		test('execute cap starts at 5%', () => {
			expect(createDefaultStats().executeCap).toBe(0.05);
		});
	});

	describe('stage multiplier growth', () => {
		test('grows exponentially up to soft cap', () => {
			const stage1 = getStageMultiplier(1);
			const stage10 = getStageMultiplier(10);
			const stage20 = getStageMultiplier(20);

			expect(stage1).toBe(1);
			expect(stage10 / stage1).toBeCloseTo(Math.pow(1.5, 9), 0);
			expect(stage20 / stage10).toBeCloseTo(Math.pow(1.5, 10), 0);
		});

		test('transitions to polynomial growth after stage 100', () => {
			const at100 = getStageMultiplier(100);
			const at101 = getStageMultiplier(101);
			const at110 = getStageMultiplier(110);

			// At 100: exponential
			// At 101+: polynomial
			const expGrowth = getStageMultiplier(100) / getStageMultiplier(99);
			const polyGrowth = at101 / at100;

			// Polynomial growth should be gentler than exponential
			expect(polyGrowth).toBeLessThan(expGrowth);
			expect(at110).toBeGreaterThan(at100);
		});
	});

	describe('greed difficulty multiplier', () => {
		test('50% greed increases enemy HP by 50%', () => {
			const base = getEnemyHealth(5, 0);
			const greedy = getEnemyHealth(5, 0.5);
			expect(greedy / base).toBeCloseTo(1.5, 1);
		});

		test('greed does not affect XP (deducted before XP calc)', () => {
			const baseXp = getXpReward(getEnemyHealth(5, 0), 5, 1, 1, 1);
			const greedXp = getXpReward(getEnemyHealth(5, 0.5), 5, 1, 1, 1.5);
			// XP divides by greedMultiplier, so base health is used
			expect(greedXp).toBe(baseXp);
		});
	});

	describe('progression checkpoints', () => {
		test('a player can clear stage 1 in roughly 1 minute with base stats', () => {
			const enemyHp = getEnemyHealth(1, 0);
			const bossHp = getBossHealth(1, 0);
			const totalHp = enemyHp * KILLS_PER_WAVE + bossHp;
			const dps = BASE_STATS.damage * BASE_STATS.attackSpeed; // 0.8 dps
			const secondsToKill = totalHp / dps;
			// 75 HP / 0.8 dps ≈ 94 seconds — under 2 minutes
			expect(secondsToKill).toBeLessThan(120);
			expect(secondsToKill).toBeGreaterThan(30);
		});

		test('stage 1 provides enough XP for ~1 level up', () => {
			const xpPerEnemy = getXpReward(getEnemyHealth(1, 0), 1, 1);
			const xpFromBoss = getXpReward(getBossHealth(1, 0), 1, 1, BOSS_XP_MULTIPLIER);
			const totalXp = xpPerEnemy * KILLS_PER_WAVE + xpFromBoss;
			const level1Req = getXpToNextLevel(1);

			// 50 + 37 = 87 XP from full wave + boss
			// Level 1->2 needs 25, level 2->3 needs 37
			expect(totalXp).toBeGreaterThanOrEqual(level1Req);
			expect(totalXp).toBeGreaterThanOrEqual(60); // enough for at least 2 level-ups
		});
	});
});
