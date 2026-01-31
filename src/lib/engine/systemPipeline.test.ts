import { describe, test, expect } from 'vitest';
import {
	createPipelineRunner,
	type SystemDefinition,
	type PipelineHit,
	type AttackContext,
	type AttackPipelineResult
} from '$lib/engine/systemPipeline';
import type { PlayerStats } from '$lib/types';
import { createDefaultStats } from '$lib/engine/stats';

// --- Mock systems for testing ---

const noopSystem: SystemDefinition<{}> = {
	id: 'noop',
	initialState: () => ({}),
};

const alwaysCritSystem: SystemDefinition<{}> = {
	id: 'always-crit',
	priority: 20,
	initialState: () => ({}),
	transformsFrom: ['hit'],
	transformHit: (state, hit, _stats, _rng) => {
		return {
			state,
			hit: { type: 'criticalHit', damage: (hit as any).damage * 2, index: (hit as any).index, critMultiplier: 2 }
		};
	}
};

const neverCritSystem: SystemDefinition<{}> = {
	id: 'never-crit',
	priority: 20,
	initialState: () => ({}),
	transformsFrom: ['hit'],
	transformHit: (state, hit, _stats, _rng) => {
		return { state, hit }; // Accept but don't change
	}
};

const damageDoubleTransform: SystemDefinition<{}> = {
	id: 'damage-double',
	priority: 30,
	initialState: () => ({}),
	transformsFrom: ['hit', 'criticalHit'],
	transformHit: (state, hit, _stats, _rng) => {
		return {
			state,
			hit: { ...hit, damage: (hit as any).damage * 2 }
		};
	}
};

const hitCountReactor: SystemDefinition<{ count: number }> = {
	id: 'hit-counter',
	initialState: () => ({ count: 0 }),
	reactsTo: ['hit', 'criticalHit'],
	onHit: (state, _hit, _stats) => {
		return { state: { count: state.count + 1 } };
	}
};

const conditionalSystem: SystemDefinition<{}> = {
	id: 'conditional',
	initialState: () => ({}),
	isActive: (stats) => (stats as any).conditionMet > 0,
	reactsTo: ['hit'],
	onHit: (state, _hit, _stats) => {
		return { state };
	}
};

const effectEmitter: SystemDefinition<{}> = {
	id: 'effect-emitter',
	initialState: () => ({}),
	reactsTo: ['criticalHit'],
	onHit: (state, _hit, _stats) => {
		return {
			state,
			effects: [{ target: 'effect-receiver', action: 'addStack', payload: { count: 1 } }]
		};
	}
};

const effectReceiver: SystemDefinition<{ stacks: number }> = {
	id: 'effect-receiver',
	initialState: () => ({ stacks: 0 }),
	handleEffect: (state, action, payload) => {
		if (action === 'addStack') {
			return { stacks: state.stacks + (payload.count ?? 1) };
		}
		return state;
	}
};

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

function makeStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
	return {
		...createDefaultStats(),
		damage: 10,
		...overrides,
	};
}

describe('createPipelineRunner', () => {
	test('returns a runner with required methods', () => {
		const runner = createPipelineRunner([noopSystem]);
		expect(runner.runAttack).toBeDefined();
		expect(runner.runKill).toBeDefined();
		expect(runner.refreshSystems).toBeDefined();
		expect(runner.getSystemState).toBeDefined();
		expect(runner.reset).toBeDefined();
	});

	test('initializes system state', () => {
		const runner = createPipelineRunner([hitCountReactor]);
		expect(runner.getSystemState<{ count: number }>('hit-counter').count).toBe(0);
	});
});

describe('runAttack — hit generation', () => {
	test('generates one hit with no multiStrike', () => {
		const runner = createPipelineRunner([noopSystem]);
		const stats = makeStats();
		runner.refreshSystems(stats);

		const result = runner.runAttack(stats, makeCtx());
		expect(result.hits).toHaveLength(1);
		expect(result.hits[0].type).toBe('hit');
		expect(result.hits[0].damage).toBe(10);
	});

	test('generates 1 + multiStrike hits', () => {
		const runner = createPipelineRunner([noopSystem]);
		const stats = makeStats({ multiStrike: 2 });
		runner.refreshSystems(stats);

		const result = runner.runAttack(stats, makeCtx());
		expect(result.hits).toHaveLength(3);
	});

	test('each hit gets correct index', () => {
		const runner = createPipelineRunner([noopSystem]);
		const stats = makeStats({ multiStrike: 2 });
		runner.refreshSystems(stats);

		const result = runner.runAttack(stats, makeCtx());
		expect(result.hits[0].index).toBe(0);
		expect(result.hits[1].index).toBe(1);
		expect(result.hits[2].index).toBe(2);
	});

	test('overkill damage added to first hit only', () => {
		const runner = createPipelineRunner([noopSystem]);
		const stats = makeStats({ multiStrike: 1 });
		runner.refreshSystems(stats);

		const result = runner.runAttack(stats, makeCtx({ overkillDamage: 5 }));
		expect(result.hits[0].damage).toBe(15); // 10 + 5
		expect(result.hits[1].damage).toBe(10); // no overkill
	});
});

describe('runAttack — transforms', () => {
	test('transform changes hit type', () => {
		const runner = createPipelineRunner([alwaysCritSystem]);
		const stats = makeStats();
		runner.refreshSystems(stats);

		const result = runner.runAttack(stats, makeCtx());
		expect(result.hits[0].type).toBe('criticalHit');
	});

	test('transform that accepts but does not change passes hit through', () => {
		const runner = createPipelineRunner([neverCritSystem]);
		const stats = makeStats();
		runner.refreshSystems(stats);

		const result = runner.runAttack(stats, makeCtx());
		expect(result.hits[0].type).toBe('hit');
	});

	test('transforms run in priority order', () => {
		// alwaysCrit (priority 20) changes hit→criticalHit
		// damageDouble (priority 30) doubles damage, accepts hit AND criticalHit
		const runner = createPipelineRunner([damageDoubleTransform, alwaysCritSystem]);
		const stats = makeStats();
		runner.refreshSystems(stats);

		const result = runner.runAttack(stats, makeCtx());
		// Crit first: 10 * 2 = 20, then double: 20 * 2 = 40
		expect(result.hits[0].type).toBe('criticalHit');
		expect(result.hits[0].damage).toBe(40);
	});

	test('transform only called for declared transformsFrom types', () => {
		// A transform that only accepts 'criticalHit' should not be called for 'hit'
		const critOnlyTransform: SystemDefinition<{ called: boolean }> = {
			id: 'crit-only',
			priority: 10,
			initialState: () => ({ called: false }),
			transformsFrom: ['criticalHit'],
			transformHit: (state, hit) => {
				return { state: { called: true }, hit };
			}
		};
		const runner = createPipelineRunner([critOnlyTransform]);
		const stats = makeStats();
		runner.refreshSystems(stats);

		runner.runAttack(stats, makeCtx());
		expect(runner.getSystemState<{ called: boolean }>('crit-only').called).toBe(false);
	});
});

describe('runAttack — reactors', () => {
	test('reactor called for matching hit type', () => {
		const runner = createPipelineRunner([hitCountReactor]);
		const stats = makeStats();
		runner.refreshSystems(stats);

		runner.runAttack(stats, makeCtx());
		expect(runner.getSystemState<{ count: number }>('hit-counter').count).toBe(1);
	});

	test('reactor called once per hit with multiStrike', () => {
		const runner = createPipelineRunner([hitCountReactor]);
		const stats = makeStats({ multiStrike: 2 });
		runner.refreshSystems(stats);

		runner.runAttack(stats, makeCtx());
		expect(runner.getSystemState<{ count: number }>('hit-counter').count).toBe(3);
	});

	test('reactor receives transformed hit type', () => {
		// Crit transforms hit→criticalHit, reactor reacts to criticalHit
		const critReactor: SystemDefinition<{ critCount: number }> = {
			id: 'crit-reactor',
			initialState: () => ({ critCount: 0 }),
			reactsTo: ['criticalHit'],
			onHit: (state) => ({ state: { critCount: state.critCount + 1 } }),
		};
		const runner = createPipelineRunner([alwaysCritSystem, critReactor]);
		const stats = makeStats();
		runner.refreshSystems(stats);

		runner.runAttack(stats, makeCtx());
		expect(runner.getSystemState<{ critCount: number }>('crit-reactor').critCount).toBe(1);
	});
});

describe('runAttack — isActive gating', () => {
	test('inactive system is excluded from dispatch', () => {
		const runner = createPipelineRunner([conditionalSystem]);
		const stats = makeStats();
		runner.refreshSystems(stats);

		// Should not error — system is simply skipped
		const result = runner.runAttack(stats, makeCtx());
		expect(result.hits).toHaveLength(1);
	});

	test('system becomes active when stats change', () => {
		const activeTracker: SystemDefinition<{ hitCount: number }> = {
			id: 'active-tracker',
			initialState: () => ({ hitCount: 0 }),
			isActive: (stats) => (stats as any).trackerEnabled > 0,
			reactsTo: ['hit'],
			onHit: (state) => ({ state: { hitCount: state.hitCount + 1 } }),
		};
		const runner = createPipelineRunner([activeTracker]);

		// Initially inactive
		const inactive = { ...makeStats(), trackerEnabled: 0 } as PlayerStats;
		runner.refreshSystems(inactive);
		runner.runAttack(inactive, makeCtx());
		expect(runner.getSystemState<{ hitCount: number }>('active-tracker').hitCount).toBe(0);

		// Activate
		const active = { ...makeStats(), trackerEnabled: 1 } as PlayerStats;
		runner.refreshSystems(active);
		runner.runAttack(active, makeCtx());
		expect(runner.getSystemState<{ hitCount: number }>('active-tracker').hitCount).toBe(1);
	});
});

describe('runAttack — effects (cross-system communication)', () => {
	test('reactor emits effect, target system receives it', () => {
		const runner = createPipelineRunner([alwaysCritSystem, effectEmitter, effectReceiver]);
		const stats = makeStats();
		runner.refreshSystems(stats);

		runner.runAttack(stats, makeCtx());
		expect(runner.getSystemState<{ stacks: number }>('effect-receiver').stacks).toBe(1);
	});

	test('effect is no-op when target system is not registered', () => {
		// effectEmitter targets 'effect-receiver', but we don't register it
		const runner = createPipelineRunner([alwaysCritSystem, effectEmitter]);
		const stats = makeStats();
		runner.refreshSystems(stats);

		// Should not throw
		expect(() => runner.runAttack(stats, makeCtx())).not.toThrow();
	});
});

describe('runAttack — overkill calculation', () => {
	test('overkillDamageOut is 0 when overkill stat is off', () => {
		const runner = createPipelineRunner([noopSystem]);
		const stats = makeStats({ damage: 50, overkill: false });
		runner.refreshSystems(stats);

		const result = runner.runAttack(stats, makeCtx({ enemyHealth: 10 }));
		expect(result.overkillDamageOut).toBe(0);
	});

	test('overkillDamageOut captures excess damage when overkill is on', () => {
		const runner = createPipelineRunner([noopSystem]);
		const stats = makeStats({ damage: 50, overkill: true });
		runner.refreshSystems(stats);

		const result = runner.runAttack(stats, makeCtx({ enemyHealth: 10 }));
		expect(result.totalDamage).toBe(50);
		expect(result.overkillDamageOut).toBe(40);
	});
});

describe('runAttack — totalDamage', () => {
	test('totalDamage sums all hit damages', () => {
		const runner = createPipelineRunner([noopSystem]);
		const stats = makeStats({ damage: 5, multiStrike: 2 });
		runner.refreshSystems(stats);

		const result = runner.runAttack(stats, makeCtx());
		expect(result.totalDamage).toBe(15);
	});
});

describe('reset', () => {
	test('reset restores all system states to initial', () => {
		const runner = createPipelineRunner([hitCountReactor]);
		const stats = makeStats();
		runner.refreshSystems(stats);

		runner.runAttack(stats, makeCtx());
		expect(runner.getSystemState<{ count: number }>('hit-counter').count).toBe(1);

		runner.reset();
		expect(runner.getSystemState<{ count: number }>('hit-counter').count).toBe(0);
	});
});
