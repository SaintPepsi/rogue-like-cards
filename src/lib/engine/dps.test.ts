import { describe, it, expect } from 'vitest';
import { computeEffectiveDps, computePoisonDps } from './dps';
import { createDefaultStats } from './stats';
import type { PlayerStats } from '$lib/types';

describe('computeEffectiveDps', () => {
	it('returns base DPS with default stats', () => {
		const stats = createDefaultStats();
		// damage(1) × attackSpeed(0.8) × critExpected(1 + 0×(1.5-1)) × (1 + multiStrike(0)) × damageMultiplier(1)
		// = 1 × 0.8 × 1 × 1 × 1 = 0.8
		expect(computeEffectiveDps(stats)).toBeCloseTo(0.8);
	});

	it('accounts for crit chance and multiplier', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			damage: 10,
			critChance: 0.5,
			critMultiplier: 2.0,
			attackSpeed: 1.0
		};
		// 10 × 1.0 × (1 + 0.5 × (2.0 - 1)) × 1 × 1 = 10 × 1.5 = 15
		expect(computeEffectiveDps(stats)).toBeCloseTo(15);
	});

	it('accounts for multiStrike', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			damage: 10,
			attackSpeed: 1.0,
			multiStrike: 2
		};
		// 10 × 1.0 × 1 × (1 + 2) × 1 = 30
		expect(computeEffectiveDps(stats)).toBeCloseTo(30);
	});

	it('accounts for damageMultiplier', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			damage: 10,
			attackSpeed: 1.0,
			damageMultiplier: 1.5
		};
		// 10 × 1.0 × 1 × 1 × 1.5 = 15
		expect(computeEffectiveDps(stats)).toBeCloseTo(15);
	});
});

describe('computePoisonDps', () => {
	it('returns 0 with no poison', () => {
		const stats = createDefaultStats();
		expect(computePoisonDps(stats)).toBe(0);
	});

	it('computes poison × maxStacks assuming full stacks', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			poison: 5,
			poisonMaxStacks: 10
		};
		// 5 × 10 = 50
		expect(computePoisonDps(stats)).toBe(50);
	});
});
