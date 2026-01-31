import { describe, test, expect } from 'vitest';
import { executeSystem } from './execute';
import type { AttackContext } from '$lib/engine/systemPipeline';
import type { PlayerStats } from '$lib/types';
import { createDefaultStats } from '$lib/engine/stats';

function makeStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
	return {
		...createDefaultStats(),
		damage: 10,
		...overrides,
	};
}

function makeCtx(overrides: Partial<AttackContext> = {}): AttackContext {
	return {
		enemyHealth: 100,
		enemyMaxHealth: 100,
		overkillDamage: 0,
		isBoss: false,
		rng: () => 0.5,
		...overrides,
	};
}

describe('executeSystem', () => {
	test('has correct id and priority', () => {
		expect(executeSystem.id).toBe('execute');
	});

	test('isActive returns false when executeChance is 0', () => {
		expect(executeSystem.isActive!(makeStats({ executeChance: 0 }))).toBe(false);
	});

	test('isActive returns true when executeChance > 0', () => {
		expect(executeSystem.isActive!(makeStats({ executeChance: 0.3 }))).toBe(true);
	});

	test('does not trigger on bosses', () => {
		const state = executeSystem.initialState();
		const result = executeSystem.beforeAttack!(
			state,
			makeCtx({ isBoss: true, enemyHealth: 50 }),
			makeStats({ executeChance: 1.0, executeCap: 1.0 })
		);
		expect(result).not.toBeNull();
		expect(result!.skip).toBe(false);
	});

	test('triggers when rng below executeChance', () => {
		const state = executeSystem.initialState();
		const result = executeSystem.beforeAttack!(
			state,
			makeCtx({ enemyHealth: 50, rng: () => 0.1 }),
			makeStats({ executeChance: 0.3, executeCap: 1.0 })
		);
		expect(result).not.toBeNull();
		expect(result!.skip).toBe(true);
		expect(result!.hits).toHaveLength(1);
		expect(result!.hits![0].type).toBe('executeHit');
		expect((result!.hits![0] as any).damage).toBe(50); // enemy health
	});

	test('does not trigger when rng above executeChance', () => {
		const state = executeSystem.initialState();
		const result = executeSystem.beforeAttack!(
			state,
			makeCtx({ enemyHealth: 50, rng: () => 0.9 }),
			makeStats({ executeChance: 0.3, executeCap: 1.0 })
		);
		expect(result).not.toBeNull();
		expect(result!.skip).toBe(false);
	});

	test('respects executeCap', () => {
		const state = executeSystem.initialState();
		// executeChance is 0.5, cap is 0.2, rng is 0.3
		// effective chance = min(0.5, 0.2) = 0.2, rng 0.3 >= 0.2 → no execute
		const result = executeSystem.beforeAttack!(
			state,
			makeCtx({ enemyHealth: 50, rng: () => 0.3 }),
			makeStats({ executeChance: 0.5, executeCap: 0.2 })
		);
		expect(result!.skip).toBe(false);
	});

	test('executeCap allows execute when rng below cap', () => {
		const state = executeSystem.initialState();
		// effective chance = min(0.5, 0.2) = 0.2, rng 0.1 < 0.2 → execute
		const result = executeSystem.beforeAttack!(
			state,
			makeCtx({ enemyHealth: 50, rng: () => 0.1 }),
			makeStats({ executeChance: 0.5, executeCap: 0.2 })
		);
		expect(result!.skip).toBe(true);
	});
});
