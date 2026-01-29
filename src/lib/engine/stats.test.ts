import { describe, test, expect } from 'vitest';
import { createDefaultStats } from './stats';

describe('createDefaultStats', () => {
	test('returns fresh PlayerStats with correct defaults', () => {
		const stats = createDefaultStats();
		expect(stats.damage).toBe(1);
		expect(stats.critChance).toBe(0);
		expect(stats.critMultiplier).toBe(1.5);
		expect(stats.xpMultiplier).toBe(1);
		expect(stats.damageMultiplier).toBe(1);
		expect(stats.poison).toBe(0);
		expect(stats.poisonCritChance).toBe(0);
		expect(stats.poisonMaxStacks).toBe(5);
		expect(stats.poisonDuration).toBe(5);
		expect(stats.multiStrike).toBe(0);
		expect(stats.overkill).toBe(false);
		expect(stats.executeChance).toBe(0);
		expect(stats.bonusBossTime).toBe(0);
		expect(stats.greed).toBe(0);
		expect(stats.luckyChance).toBe(0);
		expect(stats.chestChance).toBe(0.05);
		expect(stats.goldMultiplier).toBe(1);
	});

	test('returns a new object each time (no shared references)', () => {
		const a = createDefaultStats();
		const b = createDefaultStats();
		expect(a).toEqual(b);
		expect(a).not.toBe(b);
		a.damage = 999;
		expect(b.damage).toBe(1);
	});
});
