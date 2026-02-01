import { describe, test, expect } from 'vitest';
import { createPipelineRunner, type AttackContext } from '$lib/engine/systemPipeline';
import type { PlayerStats } from '$lib/types';
import { createDefaultStats } from '$lib/engine/stats';
import { executeSystem } from '$lib/systems/execute';
import { critSystem } from '$lib/systems/crit';
import { damageMultiplierSystem } from '$lib/systems/damageMultiplier';
import { poisonSystem, type PoisonState } from '$lib/systems/poison';

function makeCtx(overrides: Partial<AttackContext> = {}): AttackContext {
	return {
		enemyHealth: 100,
		enemyMaxHealth: 100,
		overkillDamage: 0,
		isBoss: false,
		rng: () => 0.5,
		...overrides
	};
}

function makeStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
	return {
		...createDefaultStats(),
		damage: 10,
		...overrides
	};
}

describe('full pipeline: execute + crit + damageMultiplier', () => {
	test('execute short-circuits all other systems', () => {
		const runner = createPipelineRunner([executeSystem, critSystem, damageMultiplierSystem]);
		const stats = makeStats({ executeChance: 1.0, critChance: 1.0 });
		runner.refreshSystems(stats);

		const result = runner.runAttack(stats, makeCtx({ enemyHealth: 50, rng: () => 0 }));
		expect(result.hits).toHaveLength(1);
		expect(result.hits[0].type).toBe('executeHit');
		expect(result.totalDamage).toBe(50);
	});

	test('crit + damageMultiplier compound correctly', () => {
		const runner = createPipelineRunner([critSystem, damageMultiplierSystem]);
		const stats = makeStats({
			damage: 10,
			critChance: 1.0,
			critMultiplier: 2,
			damageMultiplier: 3
		});
		runner.refreshSystems(stats);

		const result = runner.runAttack(stats, makeCtx({ rng: () => 0 }));
		// Crit: 10 * 2 = 20, then damageMultiplier: 20 * 3 = 60
		expect(result.hits[0].type).toBe('criticalHit');
		expect(result.totalDamage).toBe(60);
	});

	test('no crit: only damageMultiplier applies', () => {
		const runner = createPipelineRunner([critSystem, damageMultiplierSystem]);
		const stats = makeStats({ damage: 10, critChance: 0, damageMultiplier: 2 });
		runner.refreshSystems(stats);

		const result = runner.runAttack(stats, makeCtx({ rng: () => 0.99 }));
		expect(result.hits[0].type).toBe('hit');
		expect(result.totalDamage).toBe(20);
	});
});

describe('full pipeline: crit + poison interaction', () => {
	test('poison stacks on normal hit', () => {
		const runner = createPipelineRunner([critSystem, poisonSystem]);
		const stats = makeStats({ poison: 2, critChance: 0 });
		runner.refreshSystems(stats);

		runner.runAttack(stats, makeCtx());
		const poisonState = runner.getSystemState<PoisonState>('poison');
		expect(poisonState.stacks).toHaveLength(1);
	});

	test('poison stacks on critical hit', () => {
		const runner = createPipelineRunner([critSystem, poisonSystem]);
		const stats = makeStats({ poison: 2, critChance: 1.0 });
		runner.refreshSystems(stats);

		runner.runAttack(stats, makeCtx({ rng: () => 0 }));
		const poisonState = runner.getSystemState<PoisonState>('poison');
		expect(poisonState.stacks).toHaveLength(1);
	});

	test('poison does not stack on execute', () => {
		const runner = createPipelineRunner([executeSystem, poisonSystem]);
		const stats = makeStats({ poison: 2, executeChance: 1.0 });
		runner.refreshSystems(stats);

		runner.runAttack(stats, makeCtx({ rng: () => 0 }));
		const poisonState = runner.getSystemState<PoisonState>('poison');
		expect(poisonState.stacks).toHaveLength(0);
	});

	test('multiStrike adds multiple poison stacks', () => {
		const runner = createPipelineRunner([poisonSystem]);
		const stats = makeStats({ poison: 2, multiStrike: 2 });
		runner.refreshSystems(stats);

		runner.runAttack(stats, makeCtx());
		const poisonState = runner.getSystemState<PoisonState>('poison');
		expect(poisonState.stacks).toHaveLength(3);
	});
});

describe('full pipeline: kill clears poison', () => {
	test('poison stacks cleared on kill', () => {
		const runner = createPipelineRunner([poisonSystem]);
		const stats = makeStats({ poison: 2 });
		runner.refreshSystems(stats);

		// Add some stacks
		runner.runAttack(stats, makeCtx());
		expect(runner.getSystemState<PoisonState>('poison').stacks.length).toBeGreaterThan(0);

		// Kill
		runner.runKill({
			enemyMaxHealth: 100,
			isBoss: false,
			isChest: false,
			isBossChest: false,
			stage: 1
		});
		expect(runner.getSystemState<PoisonState>('poison').stacks).toHaveLength(0);
	});
});

describe('full pipeline: tick produces damage', () => {
	test('poison tick damages based on active stacks', () => {
		const runner = createPipelineRunner([poisonSystem]);
		const stats = makeStats({ poison: 3 });
		runner.refreshSystems(stats);

		// Add 2 stacks
		runner.runAttack(stats, makeCtx());
		runner.runAttack(stats, makeCtx());
		expect(runner.getSystemState<PoisonState>('poison').stacks).toHaveLength(2);

		// Tick
		const tickResults = runner.runTick(stats, { deltaMs: 1000 });
		expect(tickResults).toHaveLength(1);
		expect(tickResults[0].damage).toBe(6); // 3 * 2 stacks
		expect(tickResults[0].hitType).toBe('poison');
	});
});

describe('full pipeline: complete encounter simulation', () => {
	test('spawn → attack with poison → tick → kill → verify clean state', () => {
		const runner = createPipelineRunner([critSystem, damageMultiplierSystem, poisonSystem]);
		const stats = makeStats({
			damage: 5,
			critChance: 0.5,
			critMultiplier: 2,
			damageMultiplier: 1,
			poison: 2,
			multiStrike: 1
		});
		runner.refreshSystems(stats);

		let rngIndex = 0;
		const rngValues = [0.3, 0.8, 0.3, 0.8]; // alternating crit/no-crit
		const rng = () => rngValues[rngIndex++ % rngValues.length];

		// Attack 1: 2 strikes, first crits (0.3 < 0.5), second doesn't (0.8 >= 0.5)
		const attack1 = runner.runAttack(stats, makeCtx({ rng }));
		expect(attack1.hits).toHaveLength(2);

		// Poison should have 2 stacks (one per strike)
		expect(runner.getSystemState<PoisonState>('poison').stacks).toHaveLength(2);

		// Tick — poison deals damage
		const tick1 = runner.runTick(stats, { deltaMs: 1000 });
		expect(tick1[0].damage).toBe(4); // 2 * 2 stacks

		// Kill
		runner.runKill({
			enemyMaxHealth: 100,
			isBoss: false,
			isChest: false,
			isBossChest: false,
			stage: 1
		});
		expect(runner.getSystemState<PoisonState>('poison').stacks).toHaveLength(0);
	});
});
