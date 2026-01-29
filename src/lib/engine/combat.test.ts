import { describe, test, expect } from 'vitest';
import { calculateAttack, calculatePoison } from './combat';
import { createDefaultStats } from './stats';
import type { PlayerStats } from '$lib/types';

describe('calculateAttack', () => {
	test('basic attack deals base damage with no crit', () => {
		const stats = createDefaultStats();
		const result = calculateAttack(stats, {
			enemyHealth: 10,
			enemyMaxHealth: 10,
			overkillDamage: 0,
			rng: () => 0.99
		});

		expect(result.totalDamage).toBe(1);
		expect(result.hits).toHaveLength(1);
		expect(result.hits[0].type).toBe('normal');
		expect(result.hits[0].damage).toBe(1);
		expect(result.overkillDamageOut).toBe(0);
	});

	test('crit attack multiplies damage', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			damage: 10,
			critChance: 1,
			critMultiplier: 2
		};
		const result = calculateAttack(stats, {
			enemyHealth: 100,
			enemyMaxHealth: 100,
			overkillDamage: 0,
			rng: () => 0
		});

		expect(result.totalDamage).toBe(20);
		expect(result.hits[0].type).toBe('crit');
	});

	test('execute triggers based on chance roll', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			executeChance: 0.3
		};
		// rng returns 0.1, which is < 0.3, so execute triggers
		const result = calculateAttack(stats, {
			enemyHealth: 50,
			enemyMaxHealth: 100,
			overkillDamage: 0,
			rng: () => 0.1
		});

		expect(result.totalDamage).toBe(50);
		expect(result.hits).toHaveLength(1);
		expect(result.hits[0].type).toBe('execute');
	});

	test('execute does not trigger when chance roll fails', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			executeChance: 0.3
		};
		// rng returns 0.5, which is >= 0.3, so execute does not trigger
		const result = calculateAttack(stats, {
			enemyHealth: 50,
			enemyMaxHealth: 100,
			overkillDamage: 0,
			rng: () => 0.5
		});

		expect(result.totalDamage).toBe(1);
		expect(result.hits).toHaveLength(1);
		expect(result.hits[0].type).toBe('normal');
	});

	test('multi-strike produces multiple hits', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			damage: 5,
			multiStrike: 2
		};
		const result = calculateAttack(stats, {
			enemyHealth: 100,
			enemyMaxHealth: 100,
			overkillDamage: 0,
			rng: () => 0.99
		});

		expect(result.hits).toHaveLength(3);
		expect(result.totalDamage).toBe(15);
	});

	test('overkill damage is added to first strike only', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			damage: 5,
			multiStrike: 1
		};
		const result = calculateAttack(stats, {
			enemyHealth: 100,
			enemyMaxHealth: 100,
			overkillDamage: 10,
			rng: () => 0.99
		});

		expect(result.hits[0].damage).toBe(15);
		expect(result.hits[1].damage).toBe(5);
		expect(result.totalDamage).toBe(20);
	});

	test('damageMultiplier applies to all strikes', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			damage: 10,
			damageMultiplier: 2
		};
		const result = calculateAttack(stats, {
			enemyHealth: 100,
			enemyMaxHealth: 100,
			overkillDamage: 0,
			rng: () => 0.99
		});

		expect(result.totalDamage).toBe(20);
	});

	test('overkillDamageOut is set when enemy would die and overkill is enabled', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			damage: 15,
			overkill: true
		};
		const result = calculateAttack(stats, {
			enemyHealth: 10,
			enemyMaxHealth: 10,
			overkillDamage: 0,
			rng: () => 0.99
		});

		expect(result.totalDamage).toBe(15);
		expect(result.overkillDamageOut).toBe(5);
	});

	test('overkillDamageOut is 0 when overkill is disabled', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			damage: 15,
			overkill: false
		};
		const result = calculateAttack(stats, {
			enemyHealth: 10,
			enemyMaxHealth: 10,
			overkillDamage: 0,
			rng: () => 0.99
		});

		expect(result.overkillDamageOut).toBe(0);
	});
});

describe('calculatePoison', () => {
	test('returns zero damage when poison is 0', () => {
		const stats = createDefaultStats();
		const result = calculatePoison(stats, { rng: () => 0.99, activeStacks: 0 });
		expect(result.damage).toBe(0);
		expect(result.type).toBe('poison');
	});

	test('deals base poison damage with 1 stack', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			poison: 5,
			damageMultiplier: 1
		};
		const result = calculatePoison(stats, { rng: () => 0.99, activeStacks: 1 });
		expect(result.damage).toBe(5);
		expect(result.type).toBe('poison');
	});

	test('poison scales with active stacks', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			poison: 5,
			damageMultiplier: 1
		};
		const result = calculatePoison(stats, { rng: () => 0.99, activeStacks: 3 });
		expect(result.damage).toBe(15);
		expect(result.type).toBe('poison');
	});

	test('poison can crit', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			poison: 10,
			poisonCritChance: 1,
			critMultiplier: 2,
			damageMultiplier: 1
		};
		const result = calculatePoison(stats, { rng: () => 0, activeStacks: 1 });
		expect(result.damage).toBe(20);
		expect(result.type).toBe('poisonCrit');
	});

	test('damageMultiplier applies to poison', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			poison: 4,
			damageMultiplier: 3
		};
		const result = calculatePoison(stats, { rng: () => 0.99, activeStacks: 1 });
		expect(result.damage).toBe(12);
	});

	test('returns zero damage with zero active stacks', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			poison: 10,
			damageMultiplier: 1
		};
		const result = calculatePoison(stats, { rng: () => 0.99, activeStacks: 0 });
		expect(result.damage).toBe(0);
	});
});
