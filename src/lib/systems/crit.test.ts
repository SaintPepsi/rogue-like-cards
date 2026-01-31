import { describe, test, expect } from 'vitest';
import { critSystem } from './crit';
import type { PipelineHit } from '$lib/engine/systemPipeline';

function makeHit(overrides: Partial<PipelineHit & { damage: number; index: number }> = {}): PipelineHit {
	return { type: 'hit', damage: 10, index: 0, ...overrides } as PipelineHit;
}

describe('critSystem', () => {
	test('has correct id and priority', () => {
		expect(critSystem.id).toBe('crit');
		expect(critSystem.priority).toBe(20);
	});

	test('declares transformsFrom hit', () => {
		expect(critSystem.transformsFrom).toContain('hit');
	});

	test('transforms hit to criticalHit when rng below critChance', () => {
		const state = critSystem.initialState();
		const result = critSystem.transformHit!(
			state,
			makeHit({ damage: 10 }),
			{ critChance: 0.5, critMultiplier: 2 },
			() => 0.1 // below 0.5
		);
		expect(result).not.toBeNull();
		expect(result!.hit.type).toBe('criticalHit');
		expect((result!.hit as any).damage).toBe(20);
		expect((result!.hit as any).critMultiplier).toBe(2);
	});

	test('passes through hit unchanged when rng above critChance', () => {
		const state = critSystem.initialState();
		const hit = makeHit({ damage: 10 });
		const result = critSystem.transformHit!(
			state,
			hit,
			{ critChance: 0.5, critMultiplier: 2 },
			() => 0.9 // above 0.5
		);
		expect(result).not.toBeNull();
		expect(result!.hit.type).toBe('hit');
		expect((result!.hit as any).damage).toBe(10);
	});

	test('always crits when critChance is 1.0', () => {
		const state = critSystem.initialState();
		const result = critSystem.transformHit!(
			state,
			makeHit({ damage: 5 }),
			{ critChance: 1.0, critMultiplier: 3 },
			() => 0.99
		);
		expect(result!.hit.type).toBe('criticalHit');
		expect((result!.hit as any).damage).toBe(15);
	});

	test('never crits when critChance is 0', () => {
		const state = critSystem.initialState();
		const result = critSystem.transformHit!(
			state,
			makeHit({ damage: 10 }),
			{ critChance: 0, critMultiplier: 2 },
			() => 0.0
		);
		expect(result!.hit.type).toBe('hit');
	});

	test('floors crit damage', () => {
		const state = critSystem.initialState();
		const result = critSystem.transformHit!(
			state,
			makeHit({ damage: 7 }),
			{ critChance: 1.0, critMultiplier: 1.5 },
			() => 0
		);
		expect((result!.hit as any).damage).toBe(10); // floor(7 * 1.5) = 10
	});

	test('preserves hit index', () => {
		const state = critSystem.initialState();
		const result = critSystem.transformHit!(
			state,
			makeHit({ damage: 10, index: 2 }),
			{ critChance: 1.0, critMultiplier: 2 },
			() => 0
		);
		expect((result!.hit as any).index).toBe(2);
	});
});
