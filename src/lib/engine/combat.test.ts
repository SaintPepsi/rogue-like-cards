import { describe, test, expect } from 'vitest';
import { calculateAttack } from './combat';
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

	test('execute triggers when enemy health below threshold', () => {
		const stats: PlayerStats = {
			...createDefaultStats(),
			executeThreshold: 0.3
		};
		const result = calculateAttack(stats, {
			enemyHealth: 2,
			enemyMaxHealth: 10,
			overkillDamage: 0,
			rng: () => 0.99
		});

		expect(result.totalDamage).toBe(2);
		expect(result.hits).toHaveLength(1);
		expect(result.hits[0].type).toBe('execute');
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
