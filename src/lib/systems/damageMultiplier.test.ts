import { describe, test, expect } from 'vitest';
import { damageMultiplierSystem } from './damageMultiplier';
import type { PipelineHit } from '$lib/engine/systemPipeline';
import type { PlayerStats } from '$lib/types';
import { createDefaultStats } from '$lib/engine/stats';

function makeStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
	return {
		...createDefaultStats(),
		damage: 10,
		...overrides,
	};
}

function makeHit(type: string, damage: number, index = 0): PipelineHit {
	return { type, damage, index } as PipelineHit;
}

describe('damageMultiplierSystem', () => {
	test('has correct id and priority', () => {
		expect(damageMultiplierSystem.id).toBe('damageMultiplier');
		expect(damageMultiplierSystem.priority).toBe(90);
	});

	test('transforms hit and criticalHit', () => {
		expect(damageMultiplierSystem.transformsFrom).toContain('hit');
		expect(damageMultiplierSystem.transformsFrom).toContain('criticalHit');
	});

	test('multiplies damage on hit', () => {
		const state = damageMultiplierSystem.initialState();
		const result = damageMultiplierSystem.transformHit!(
			state,
			makeHit('hit', 10),
			makeStats({ damageMultiplier: 2 }),
			() => 0
		);
		expect((result!.hit as any).damage).toBe(20);
	});

	test('multiplies damage on criticalHit', () => {
		const state = damageMultiplierSystem.initialState();
		const result = damageMultiplierSystem.transformHit!(
			state,
			makeHit('criticalHit', 15),
			makeStats({ damageMultiplier: 3 }),
			() => 0
		);
		expect((result!.hit as any).damage).toBe(45);
	});

	test('floors result', () => {
		const state = damageMultiplierSystem.initialState();
		const result = damageMultiplierSystem.transformHit!(
			state,
			makeHit('hit', 7),
			makeStats({ damageMultiplier: 1.5 }),
			() => 0
		);
		expect((result!.hit as any).damage).toBe(10); // floor(7 * 1.5)
	});

	test('does not change with multiplier of 1', () => {
		const state = damageMultiplierSystem.initialState();
		const result = damageMultiplierSystem.transformHit!(
			state,
			makeHit('hit', 10),
			makeStats({ damageMultiplier: 1 }),
			() => 0
		);
		expect((result!.hit as any).damage).toBe(10);
	});
});
