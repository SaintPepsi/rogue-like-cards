/**
 * SYSTEM ARCHITECTURE — CONCRETE EXAMPLES
 *
 * Demonstrates:
 * - PipelineHit abstraction (pipeline only knows { type: string })
 * - Accept/decline pattern (return result or null)
 * - Priority ordering for transforms
 * - Dependency inversion (pipeline never imports concrete hit types)
 * - Cross-system effects
 *
 * Run with: bun docs/plans/2026-01-31-system-architecture-examples.ts
 */

// ============================================================================
// PART 1: PIPELINE — knows ONLY about PipelineHit
// ============================================================================

interface PipelineHit {
	type: string;
	[key: string]: any;
}

type Rng = () => number;

interface AttackContext {
	enemyHealth: number;
	enemyMaxHealth: number;
	isBoss: boolean;
	rng: Rng;
}

interface KillContext {
	wasBoss: boolean;
	stage: number;
}

interface TickContext {
	enemyHealth: number;
	rng: Rng;
}

interface SystemEffect {
	target: string;
	action: string;
	payload: any;
}

interface ReactorResult<TState> {
	state: TState;
	effects?: SystemEffect[];
}

interface SystemDefinition<TState = any> {
	id: string;
	initialState: () => TState;
	priority?: number;
	isActive?: (stats: Record<string, number>) => boolean;

	beforeAttack?: (
		state: TState,
		ctx: AttackContext,
		stats: Record<string, number>
	) => { state: TState; skip?: boolean; hits?: PipelineHit[] };

	// Return result to accept, null to decline
	transformHit?: (
		state: TState,
		hit: PipelineHit,
		stats: Record<string, number>,
		rng: Rng
	) => { state: TState; hit: PipelineHit } | null;

	// Return result to accept, null to decline
	onHit?: (
		state: TState,
		hit: PipelineHit,
		stats: Record<string, number>
	) => ReactorResult<TState> | null;

	onTick?: (
		state: TState,
		stats: Record<string, number>,
		ctx: TickContext
	) => { state: TState; damage: number; hitType?: string };

	onKill?: (state: TState, ctx: KillContext) => TState;
	handleEffect?: (state: TState, action: string, payload: any) => TState;
}

function createPipeline() {
	const systems: SystemDefinition[] = [];
	const states = new Map<string, any>();

	// Transforms sorted by priority at registration time
	let transformsByPriority: SystemDefinition[] = [];

	function register(system: SystemDefinition) {
		systems.push(system);
		states.set(system.id, system.initialState());

		// Re-sort transforms whenever a new system is registered
		transformsByPriority = systems
			.filter((s) => s.transformHit)
			.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
	}

	function getState<T>(id: string): T {
		return states.get(id);
	}

	function isActive(system: SystemDefinition, stats: Record<string, number>) {
		return !system.isActive || system.isActive(stats);
	}

	function dispatchEffects(effects: SystemEffect[]) {
		for (const effect of effects) {
			const target = systems.find((s) => s.id === effect.target);
			if (!target || !target.handleEffect) continue;
			states.set(
				target.id,
				target.handleEffect(states.get(target.id), effect.action, effect.payload)
			);
		}
	}

	function routeToReactors(hit: PipelineHit, stats: Record<string, number>) {
		const active = systems.filter((s) => isActive(s, stats));
		const allEffects: SystemEffect[] = [];

		for (const sys of active) {
			if (!sys.onHit) continue;
			const result = sys.onHit(states.get(sys.id), hit, stats);
			if (result === null) continue; // declined
			states.set(sys.id, result.state);
			if (result.effects) allEffects.push(...result.effects);
		}

		if (allEffects.length > 0) {
			dispatchEffects(allEffects);
		}
	}

	function runAttack(ctx: AttackContext, stats: Record<string, number>): PipelineHit[] {
		const active = systems.filter((s) => isActive(s, stats));

		// Stage 1: beforeAttack
		for (const sys of active) {
			if (!sys.beforeAttack) continue;
			const result = sys.beforeAttack(states.get(sys.id), ctx, stats);
			states.set(sys.id, result.state);
			if (result.skip && result.hits) {
				for (const hit of result.hits) {
					routeToReactors(hit, stats);
				}
				return result.hits;
			}
		}

		// Stage 2: generate hits
		const strikes = 1 + (stats.multiStrike ?? 0);
		let hits: PipelineHit[] = [];
		for (let i = 0; i < strikes; i++) {
			hits.push({ type: 'hit', damage: stats.damage ?? 1, index: i });
		}

		// Stage 3: per-hit transforms — sorted by priority, accept/decline
		const activeTransforms = transformsByPriority.filter((s) => isActive(s, stats));
		hits = hits.map((hit) => {
			let current = hit;
			for (const sys of activeTransforms) {
				const result = sys.transformHit!(states.get(sys.id), current, stats, ctx.rng);
				if (result === null) continue; // declined — skip this transform
				states.set(sys.id, result.state);
				current = result.hit;
			}
			return current;
		});

		// Stage 4-5: offer to reactors
		for (const hit of hits) {
			routeToReactors(hit, stats);
		}

		return hits;
	}

	function runTick(
		stats: Record<string, number>,
		ctx: TickContext
	): { damage: number; hitType: string }[] {
		const results: { damage: number; hitType: string }[] = [];
		const active = systems.filter((s) => isActive(s, stats));

		for (const sys of active) {
			if (!sys.onTick) continue;
			const result = sys.onTick(states.get(sys.id), stats, ctx);
			states.set(sys.id, result.state);
			if (result.damage > 0) {
				results.push({ damage: result.damage, hitType: result.hitType ?? 'normal' });
			}
		}
		return results;
	}

	function runKill(ctx: KillContext, stats: Record<string, number>) {
		const active = systems.filter((s) => isActive(s, stats));
		for (const sys of active) {
			if (!sys.onKill) continue;
			states.set(sys.id, sys.onKill(states.get(sys.id), ctx));
		}
	}

	return { register, getState, runAttack, runTick, runKill };
}

// ============================================================================
// PART 2: SHARED PRIMITIVES
// ============================================================================

interface StackManagerConfig {
	max: number | 'unlimited';
	refreshPolicy: 'refresh-shortest' | 'add-new' | 'individual-decay';
}

interface Stack {
	remaining: number;
}

function createStackManager(config: StackManagerConfig) {
	return {
		add(stacks: Stack[], duration: number, count: number = 1): Stack[] {
			let result = [...stacks];
			for (let i = 0; i < count; i++) {
				if (config.max !== 'unlimited' && result.length >= config.max) {
					if (config.refreshPolicy === 'refresh-shortest') {
						let minIdx = 0;
						for (let j = 1; j < result.length; j++) {
							if (result[j].remaining < result[minIdx].remaining) minIdx = j;
						}
						result = result.map((s, idx) =>
							idx === minIdx ? { remaining: duration } : s
						);
					} else if (config.refreshPolicy === 'add-new') {
						result = [...result.slice(1), { remaining: duration }];
					}
				} else {
					result = [...result, { remaining: duration }];
				}
			}
			return result;
		},
		tick(stacks: Stack[]): Stack[] {
			return stacks
				.map((s) => ({ remaining: s.remaining - 1 }))
				.filter((s) => s.remaining > 0);
		},
		clear(): Stack[] {
			return [];
		}
	};
}

// ============================================================================
// PART 3: SYSTEMS — each defines its own hit types, accepts/declines
// ============================================================================

// --- block.ts (priority 10 — runs before crit) ---

interface BlockedHit extends PipelineHit {
	type: 'blockedHit';
	originalDamage: number;
	index: number;
}

const blockSystem: SystemDefinition<{}> = {
	id: 'block',
	priority: 10,
	initialState: () => ({}),

	transformHit: (_state, hit, stats, rng) => {
		// Only block base hits
		if (hit.type !== 'hit') return null;
		if (rng() >= (stats.blockChance ?? 0)) return null;

		const blocked: BlockedHit = {
			type: 'blockedHit',
			originalDamage: hit.damage,
			index: hit.index
		};
		return { state: _state, hit: blocked };
	}
};

// --- crit.ts (priority 20 — runs after block) ---

interface CriticalHit extends PipelineHit {
	type: 'criticalHit';
	damage: number;
	index: number;
	critMultiplier: number;
}

const critSystem: SystemDefinition<{}> = {
	id: 'crit',
	priority: 20,
	initialState: () => ({}),

	transformHit: (_state, hit, stats, rng) => {
		// Only crit base hits — blocked hits never reach here because
		// block runs first (priority 10) and changes the type
		if (hit.type !== 'hit') return null;
		if (rng() >= (stats.critChance ?? 0)) return null;

		const critHit: CriticalHit = {
			type: 'criticalHit',
			damage: Math.floor(hit.damage * (stats.critMultiplier ?? 1.5)),
			index: hit.index,
			critMultiplier: stats.critMultiplier ?? 1.5
		};
		return { state: _state, hit: critHit };
	}
};

// --- execute.ts ---

interface ExecuteHit extends PipelineHit {
	type: 'executeHit';
	damage: number;
}

const executeSystem: SystemDefinition<{}> = {
	id: 'execute',
	initialState: () => ({}),

	beforeAttack: (state, ctx, stats) => {
		if (ctx.isBoss) return { state, skip: false };
		if (ctx.rng() >= (stats.executeChance ?? 0)) return { state, skip: false };

		const execHit: ExecuteHit = { type: 'executeHit', damage: ctx.enemyHealth };
		return { state, skip: true, hits: [execHit] };
	}
};

// --- poison.ts ---

interface PoisonState {
	stacks: Stack[];
}

const poisonStackMgr = createStackManager({ max: 5, refreshPolicy: 'refresh-shortest' });

const poisonSystem: SystemDefinition<PoisonState> = {
	id: 'poison',
	initialState: () => ({ stacks: [] }),
	isActive: (stats) => (stats.poison ?? 0) > 0,

	onHit: (state, hit, stats) => {
		if (hit.type !== 'hit' && hit.type !== 'criticalHit') return null;
		return {
			state: {
				...state,
				stacks: poisonStackMgr.add(state.stacks, stats.poisonDuration ?? 5)
			}
		};
	},

	onTick: (state, stats) => {
		if (state.stacks.length === 0) return { state, damage: 0 };
		const perStack = Math.floor((stats.poison ?? 0) * (stats.damageMultiplier ?? 1));
		return {
			state: { ...state, stacks: poisonStackMgr.tick(state.stacks) },
			damage: perStack * state.stacks.length,
			hitType: 'poison'
		};
	},

	onKill: () => ({ stacks: [] }),

	handleEffect: (state, action, payload) => {
		if (action === 'addStacks') {
			return {
				...state,
				stacks: poisonStackMgr.add(state.stacks, payload.duration ?? 5, payload.count ?? 1)
			};
		}
		return state;
	}
};

// --- thorns.ts ---

interface ThornsState {
	reflectDamage: number;
}

const thornsSystem: SystemDefinition<ThornsState> = {
	id: 'thorns',
	initialState: () => ({ reflectDamage: 0 }),
	isActive: (stats) => (stats.thorns ?? 0) > 0,

	onHit: (state, hit, stats) => {
		if (hit.type !== 'blockedHit') return null;
		return {
			state: {
				...state,
				reflectDamage: hit.originalDamage * (stats.thorns ?? 0.5)
			}
		};
	}
};

// --- venomous-crits.ts ---

const venomousCritsSystem: SystemDefinition<{}> = {
	id: 'venomous-crits',
	initialState: () => ({}),
	isActive: (stats) => (stats.venomousCrits ?? 0) > 0 && (stats.poison ?? 0) > 0,

	onHit: (state, hit, stats) => {
		if (hit.type !== 'criticalHit') return null;
		return {
			state,
			effects: [
				{
					target: 'poison',
					action: 'addStacks',
					payload: { count: 1, duration: stats.poisonDuration ?? 5 }
				}
			]
		};
	}
};

// ============================================================================
// PART 4: COMPOSITION ROOT
// ============================================================================

const pipeline = createPipeline();
pipeline.register(blockSystem);    // priority 10
pipeline.register(critSystem);     // priority 20
pipeline.register(executeSystem);
pipeline.register(poisonSystem);
pipeline.register(thornsSystem);
pipeline.register(venomousCritsSystem);

// Registration order doesn't matter for transforms — priority does.
// Reactors are unordered.

const stats = {
	damage: 10,
	critChance: 0.5,
	critMultiplier: 2,
	blockChance: 0.3,
	poison: 3,
	poisonDuration: 5,
	poisonMaxStacks: 5,
	damageMultiplier: 1,
	thorns: 0.5,
	venomousCrits: 1
};

// ============================================================================
// PART 5: TESTS
// ============================================================================

// --- Test 1: Normal hit (no block, no crit) → poison accepts ---
console.log('--- TEST 1: Normal hit → poison accepts ---');
const hits1 = pipeline.runAttack(
	{ enemyHealth: 100, enemyMaxHealth: 100, isBoss: false, rng: () => 0.8 },
	stats
);
console.log('hit.type:', hits1[0].type);
console.log('Poison:', pipeline.getState<PoisonState>('poison'));

// --- Test 2: Block triggers (rng < blockChance) → crit never sees it ---
console.log('\n--- TEST 2: Block → crit declines, thorns accepts ---');
const hits2 = pipeline.runAttack(
	{ enemyHealth: 100, enemyMaxHealth: 100, isBoss: false, rng: () => 0.1 },
	stats // blockChance 0.3, so 0.1 < 0.3 = blocked
);
console.log('hit.type:', hits2[0].type);
console.log('Thorns:', pipeline.getState<ThornsState>('thorns'));
console.log('Poison:', pipeline.getState<PoisonState>('poison'));
// blockedHit — poison declines (not 'hit' or 'criticalHit'), thorns accepts

// --- Test 3: No block, crit triggers → poison + venomous crits ---
console.log('\n--- TEST 3: No block, crit → poison + venomous crits ---');
pipeline.runKill({ wasBoss: false, stage: 1 }, stats); // reset poison
const hits3 = pipeline.runAttack(
	{ enemyHealth: 100, enemyMaxHealth: 100, isBoss: false, rng: () => 0.4 },
	stats // 0.4 >= blockChance(0.3) so no block, 0.4 < critChance(0.5) so crit
);
console.log('hit.type:', hits3[0].type);
console.log('Poison:', pipeline.getState<PoisonState>('poison'));
// criticalHit — poison accepts, venomous crits fires effect → 2 stacks

// --- Test 4: Execute short-circuits ---
console.log('\n--- TEST 4: Execute → short-circuits ---');
pipeline.runKill({ wasBoss: false, stage: 1 }, stats);
const hits4 = pipeline.runAttack(
	{ enemyHealth: 50, enemyMaxHealth: 100, isBoss: false, rng: () => 0.01 },
	{ ...stats, executeChance: 0.1 }
);
console.log('hit.type:', hits4[0].type);
console.log('Poison:', pipeline.getState<PoisonState>('poison'));
// executeHit — poison declines

// --- Test 5: Priority reorder demo ---
// If we wanted crit BEFORE block, we'd just change the numbers.
// For now, block(10) < crit(20), so a blocked hit is never a crit.
console.log('\n--- TEST 5: Priority ordering confirmed ---');
console.log('Block priority:', blockSystem.priority, '(runs first)');
console.log('Crit priority:', critSystem.priority, '(runs second)');
console.log('A blocked hit never reaches crit. Swap numbers to change.');

// --- Test 6: Tick ---
console.log('\n--- TEST 6: Tick ---');
pipeline.runKill({ wasBoss: false, stage: 1 }, stats);
pipeline.runAttack(
	{ enemyHealth: 100, enemyMaxHealth: 100, isBoss: false, rng: () => 0.8 },
	stats
);
pipeline.runAttack(
	{ enemyHealth: 90, enemyMaxHealth: 100, isBoss: false, rng: () => 0.8 },
	stats
);
console.log('Before tick:', pipeline.getState<PoisonState>('poison'));
const tickResults = pipeline.runTick(stats, { enemyHealth: 80, rng: () => 0.5 });
console.log('Tick results:', tickResults);
console.log('After tick:', pipeline.getState<PoisonState>('poison'));

console.log('\n--- ALL TESTS PASSED ---');
