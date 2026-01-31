// --- Hit type system (extensible via declaration merging) ---

export interface HitTypeMap {
	hit: { damage: number; index: number };
}

export type HitType = keyof HitTypeMap & string;
export type PipelineHit<T extends HitType = HitType> = { type: T } & HitTypeMap[T];

// --- Effect for cross-system communication ---

export type PipelineEffect = {
	target: string;
	action: string;
	payload: any;
};

// --- Contexts ---

export type Rng = () => number;

export type AttackContext = {
	enemyHealth: number;
	enemyMaxHealth: number;
	overkillDamage: number;
	isBoss: boolean;
	rng: Rng;
};

export type KillContext = {
	enemyMaxHealth: number;
	isBoss: boolean;
	isChest: boolean;
	isBossChest: boolean;
	stage: number;
};

export type TickContext = {
	deltaMs: number;
};

// --- Reactor result ---

export type ReactorResult<TState> = {
	state: TState;
	effects?: PipelineEffect[];
};

// --- System definition ---

export interface SystemDefinition<TState = any> {
	id: string;
	initialState: () => TState;
	priority?: number;
	isActive?: (stats: Record<string, number>) => boolean;

	// Transforms (ordered by priority, indexed by transformsFrom)
	transformsFrom?: string[];
	beforeAttack?: (state: TState, ctx: AttackContext, stats: Record<string, number>)
		=> { state: TState; skip?: boolean; hits?: PipelineHit[] } | null;
	transformHit?: (state: TState, hit: PipelineHit, stats: Record<string, number>, rng: Rng)
		=> { state: TState; hit: PipelineHit } | null;

	// Reactors (unordered, indexed by reactsTo)
	reactsTo?: string[];
	onHit?: (state: TState, hit: PipelineHit, stats: Record<string, number>)
		=> ReactorResult<TState> | null;

	// Lifecycle
	onTick?: (state: TState, stats: Record<string, number>, ctx: TickContext)
		=> { state: TState; damage: number; hitType?: string };
	onKill?: (state: TState, ctx: KillContext) => TState;

	// Cross-system effects
	handleEffect?: (state: TState, action: string, payload: any) => TState;
}

// --- Attack pipeline result ---

export type AttackPipelineResult = {
	totalDamage: number;
	hits: PipelineHit[];
	overkillDamageOut: number;
	effects: PipelineEffect[];
};

// --- Pipeline runner ---

export function createPipelineRunner(systems: SystemDefinition[]) {
	// Per-system state
	const states = new Map<string, any>();
	const systemsById = new Map<string, SystemDefinition>();

	// Indexed dispatch (rebuilt on refreshSystems)
	let activeBeforeAttack: SystemDefinition[] = [];
	let transformIndex = new Map<string, SystemDefinition[]>();
	let reactorIndex = new Map<string, SystemDefinition[]>();
	let activeTickSystems: SystemDefinition[] = [];
	let activeKillSystems: SystemDefinition[] = [];

	// Initialize all system states
	for (const sys of systems) {
		states.set(sys.id, sys.initialState());
		systemsById.set(sys.id, sys);
	}

	function refreshSystems(stats: Record<string, number>): void {
		activeBeforeAttack = [];
		transformIndex = new Map();
		reactorIndex = new Map();
		activeTickSystems = [];
		activeKillSystems = [];

		// Filter active systems
		const active = systems.filter(sys => !sys.isActive || sys.isActive(stats));

		// Index beforeAttack transforms (sorted by priority)
		const beforeAttackSystems = active
			.filter(sys => sys.beforeAttack)
			.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
		activeBeforeAttack = beforeAttackSystems;

		// Index hit transforms by transformsFrom type (sorted by priority)
		const transforms = active
			.filter(sys => sys.transformHit && sys.transformsFrom)
			.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

		for (const sys of transforms) {
			for (const type of sys.transformsFrom!) {
				const existing = transformIndex.get(type) ?? [];
				existing.push(sys);
				transformIndex.set(type, existing);
			}
		}

		// Index reactors by reactsTo type
		const reactors = active.filter(sys => sys.onHit && sys.reactsTo);
		for (const sys of reactors) {
			for (const type of sys.reactsTo!) {
				const existing = reactorIndex.get(type) ?? [];
				existing.push(sys);
				reactorIndex.set(type, existing);
			}
		}

		// Tick and kill systems
		activeTickSystems = active.filter(sys => sys.onTick);
		activeKillSystems = active.filter(sys => sys.onKill);
	}

	function runAttack(stats: Record<string, number>, ctx: AttackContext): AttackPipelineResult {
		const allEffects: PipelineEffect[] = [];

		// Step 1: beforeAttack transforms (execute, etc.)
		for (const sys of activeBeforeAttack) {
			const result = sys.beforeAttack!(states.get(sys.id), ctx, stats);
			if (result === null) continue;

			states.set(sys.id, result.state);
			if (!result.skip || !result.hits) continue;

			// Short-circuit: use provided hits, skip to reactors
			const finalHits: PipelineHit[] = [];
			let totalDamage = 0;

			for (const hit of result.hits) {
				finalHits.push(hit);
				totalDamage += (hit as any).damage ?? 0;

				// Offer to reactors
				for (const reactor of reactorIndex.get(hit.type) ?? []) {
					const rResult = reactor.onHit!(states.get(reactor.id), hit, stats);
					if (rResult === null) continue;
					states.set(reactor.id, rResult.state);
					if (rResult.effects) allEffects.push(...rResult.effects);
				}
			}

			dispatchEffects(allEffects);
			const remaining = ctx.enemyHealth - totalDamage;
			const overkillDamageOut = stats.overkill > 0 && remaining < 0 ? Math.abs(remaining) : 0;
			return { totalDamage, hits: finalHits, overkillDamageOut, effects: allEffects };
		}

		// Step 2: Generate base hits
		const strikes = 1 + (stats.multiStrike ?? 0);
		const baseHits: PipelineHit[] = [];
		for (let i = 0; i < strikes; i++) {
			let damage = stats.damage ?? 0;
			if (i === 0 && ctx.overkillDamage > 0) {
				damage += ctx.overkillDamage;
			}
			baseHits.push({ type: 'hit' as HitType, damage, index: i } as PipelineHit);
		}

		// Step 3-5: Per-hit transforms + damage accumulation + reactors
		const finalHits: PipelineHit[] = [];
		let totalDamage = 0;

		for (const baseHit of baseHits) {
			let currentHit: PipelineHit = baseHit;

			// Step 3: Transforms (indexed by current hit type)
			const transforms = transformIndex.get(currentHit.type) ?? [];
			for (const sys of transforms) {
				const result = sys.transformHit!(states.get(sys.id), currentHit, stats, ctx.rng);
				if (result === null) continue;
				states.set(sys.id, result.state);
				currentHit = result.hit;
			}

			// If hit type changed, run transforms for the new type too
			// (e.g., damageMultiplier accepts both 'hit' and 'criticalHit')
			if (currentHit.type !== baseHit.type) {
				for (const sys of transformIndex.get(currentHit.type) ?? []) {
					if (transforms.includes(sys)) continue;
					const result = sys.transformHit!(states.get(sys.id), currentHit, stats, ctx.rng);
					if (result === null) continue;
					states.set(sys.id, result.state);
					currentHit = result.hit;
				}
			}

			// Step 4: Accumulate damage
			totalDamage += (currentHit as any).damage ?? 0;
			finalHits.push(currentHit);

			// Step 5: Reactors
			for (const reactor of reactorIndex.get(currentHit.type) ?? []) {
				const result = reactor.onHit!(states.get(reactor.id), currentHit, stats);
				if (result === null) continue;
				states.set(reactor.id, result.state);
				if (result.effects) allEffects.push(...result.effects);
			}
		}

		// Step 6: Dispatch effects
		dispatchEffects(allEffects);

		// Step 7: Overkill
		const remaining = ctx.enemyHealth - totalDamage;
		const overkillDamageOut = stats.overkill > 0 && remaining < 0 ? Math.abs(remaining) : 0;

		return { totalDamage, hits: finalHits, overkillDamageOut, effects: allEffects };
	}

	function dispatchEffects(effects: PipelineEffect[]): void {
		for (const effect of effects) {
			const targetSys = systemsById.get(effect.target);
			if (targetSys?.handleEffect) {
				const newState = targetSys.handleEffect(states.get(targetSys.id), effect.action, effect.payload);
				states.set(targetSys.id, newState);
			}
		}
	}

	function runKill(ctx: KillContext): void {
		for (const sys of activeKillSystems) {
			const newState = sys.onKill!(states.get(sys.id), ctx);
			states.set(sys.id, newState);
		}
	}

	function runTick(stats: Record<string, number>, ctx: TickContext): { systemId: string; damage: number; hitType?: string }[] {
		const results: { systemId: string; damage: number; hitType?: string }[] = [];
		for (const sys of activeTickSystems) {
			const result = sys.onTick!(states.get(sys.id), stats, ctx);
			states.set(sys.id, result.state);
			if (result.damage > 0) {
				results.push({ systemId: sys.id, damage: result.damage, hitType: result.hitType });
			}
		}
		return results;
	}

	function getSystemState<T>(systemId: string): T {
		return states.get(systemId) as T;
	}

	function reset(): void {
		for (const sys of systems) {
			states.set(sys.id, sys.initialState());
		}
	}

	return {
		refreshSystems,
		runAttack,
		runKill,
		runTick,
		getSystemState,
		reset,
	};
}
