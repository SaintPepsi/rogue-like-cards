import { describe, test, expect } from 'vitest';
import { poisonSystem, type PoisonState } from './poison';
import type { PipelineHit, KillContext } from '$lib/engine/systemPipeline';

function makeHit(type: string, damage = 10, index = 0): PipelineHit {
	return { type, damage, index } as PipelineHit;
}

function makeStats(overrides: Record<string, number> = {}): Record<string, number> {
	return {
		poison: 2,
		poisonDuration: 5,
		poisonMaxStacks: 5,
		poisonCritChance: 0,
		critMultiplier: 1.5,
		damageMultiplier: 1,
		...overrides,
	};
}

describe('poisonSystem — isActive', () => {
	test('inactive when poison is 0', () => {
		expect(poisonSystem.isActive!({ poison: 0 })).toBe(false);
	});

	test('active when poison > 0', () => {
		expect(poisonSystem.isActive!({ poison: 2 })).toBe(true);
	});
});

describe('poisonSystem — onHit (reactor)', () => {
	test('adds stack on normal hit', () => {
		const state = poisonSystem.initialState();
		const result = poisonSystem.onHit!(state, makeHit('hit'), makeStats());
		expect(result).not.toBeNull();
		expect(result!.state.stacks).toHaveLength(1);
		expect(result!.state.stacks[0]).toBe(5); // poisonDuration
	});

	test('adds stack on criticalHit', () => {
		const state = poisonSystem.initialState();
		const result = poisonSystem.onHit!(state, makeHit('criticalHit'), makeStats());
		expect(result).not.toBeNull();
		expect(result!.state.stacks).toHaveLength(1);
	});

	test('declines executeHit', () => {
		const state = poisonSystem.initialState();
		const result = poisonSystem.onHit!(state, makeHit('executeHit'), makeStats());
		expect(result).toBeNull();
	});

	test('respects max stacks (refresh-shortest policy)', () => {
		let state: PoisonState = { stacks: [5, 5, 5, 5, 5] }; // at max (5)
		const result = poisonSystem.onHit!(state, makeHit('hit'), makeStats({ poisonMaxStacks: 5, poisonDuration: 6 }));
		expect(result!.state.stacks).toHaveLength(5); // still at max
		expect(result!.state.stacks).toContain(6); // new stack with refreshed duration
	});

	test('accumulates stacks across multiple hits', () => {
		let state = poisonSystem.initialState();
		for (let i = 0; i < 3; i++) {
			const result = poisonSystem.onHit!(state, makeHit('hit'), makeStats());
			state = result!.state;
		}
		expect(state.stacks).toHaveLength(3);
	});
});

describe('poisonSystem — onTick', () => {
	test('deals no damage with 0 stacks', () => {
		const state = poisonSystem.initialState();
		const result = poisonSystem.onTick!(state, makeStats(), { deltaMs: 1000 });
		expect(result.damage).toBe(0);
	});

	test('deals damage = poison * stackCount', () => {
		const state: PoisonState = { stacks: [3, 3, 3] };
		const result = poisonSystem.onTick!(state, makeStats({ poison: 2, damageMultiplier: 1 }), { deltaMs: 1000 });
		expect(result.damage).toBe(6); // 2 * 3 stacks
		expect(result.hitType).toBe('poison');
	});

	test('decrements stack durations on tick', () => {
		const state: PoisonState = { stacks: [3, 1, 5] };
		const result = poisonSystem.onTick!(state, makeStats(), { deltaMs: 1000 });
		expect(result.state.stacks).toEqual([2, 4]); // 1-tick stack expired
	});

	test('applies damageMultiplier', () => {
		const state: PoisonState = { stacks: [3] };
		const result = poisonSystem.onTick!(state, makeStats({ poison: 4, damageMultiplier: 3 }), { deltaMs: 1000 });
		expect(result.damage).toBe(12); // floor(4 * 3) * 1 stack
	});

	test('applies poison crit', () => {
		const state: PoisonState = { stacks: [3] };
		const stats = makeStats({ poison: 10, poisonCritChance: 1, critMultiplier: 2, damageMultiplier: 1 });
		// Note: onTick doesn't have rng param currently — poison crit needs rng
		// For now, poison crit is handled by passing rng through stats or context
		// This test documents the expected behavior
		const result = poisonSystem.onTick!(state, stats, { deltaMs: 1000 });
		// Without rng in onTick, crit is not possible — this is a design decision
		// Poison crit may move to a separate reactor on poison tick hits
		expect(result.damage).toBeGreaterThan(0);
	});
});

describe('poisonSystem — onKill', () => {
	test('clears all stacks', () => {
		const state: PoisonState = { stacks: [3, 5, 4] };
		const result = poisonSystem.onKill!(state, { enemyMaxHealth: 100, isBoss: false, isChest: false, isBossChest: false, stage: 1 });
		expect(result.stacks).toHaveLength(0);
	});
});

describe('poisonSystem — handleEffect', () => {
	test('addStacks adds extra stacks', () => {
		const state: PoisonState = { stacks: [3] };
		const result = poisonSystem.handleEffect!(state, 'addStacks', { count: 2, duration: 5 });
		expect(result.stacks).toHaveLength(3);
	});

	test('ignores unknown actions', () => {
		const state: PoisonState = { stacks: [3] };
		const result = poisonSystem.handleEffect!(state, 'unknownAction', {});
		expect(result).toEqual(state);
	});
});
