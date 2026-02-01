# System Architecture: Pipelines, Transforms, and Reactors

## Core Insight

Every game mechanic is a **self-contained system** — a set of pure functions that the orchestrator calls at the right time. Systems don't know about each other. They communicate through a **pipeline** that flows data through ordered stages.

The pipeline doesn't know about any specific system or hit type. Systems don't know about each other. Dependencies point inward toward abstractions, never toward concrete implementations.

## Hit Types: Dependency Inversion

The pipeline defines one minimal contract:

```ts
// This is ALL the pipeline knows about hits.
// It lives in the pipeline module. It never changes.
interface PipelineHit {
	type: string;
}
```

Each system defines its own hit types that satisfy this contract. The pipeline never imports them. Systems never import each other's types.

```ts
// Defined in crit.ts
interface CriticalHit extends PipelineHit {
	type: 'criticalHit';
	damage: number;
	index: number;
	critMultiplier: number;
}

// Defined in block.ts
interface BlockedHit extends PipelineHit {
	type: 'blockedHit';
	originalDamage: number;
	index: number;
}

// Defined in execute.ts
interface ExecuteHit extends PipelineHit {
	type: 'executeHit';
	damage: number;
}
```

There is **no** `type AnyHit = Hit | CriticalHit | BlockedHit | ...` union in the pipeline. The pipeline works with `PipelineHit`. Adding `FrozenHit` next month means creating a new file — the pipeline is never opened.

## Accept/Decline Pattern

Systems don't declare what they handle in arrays (`reactsTo`, `transformsTypes`). Instead, the pipeline **offers** each hit to each system, and the system **accepts** (returns a result) or **declines** (returns `null`).

```ts
// Crit accepts 'hit', declines everything else
transformHit: (state, hit, stats, rng) => {
  if (hit.type !== 'hit') return null;  // decline
  if (rng() >= stats.critChance) return { state, hit }; // accept, no change
  return { state, hit: { type: 'criticalHit', ... } };  // accept, transform
}

// Poison accepts 'hit' and 'criticalHit', declines everything else
onHit: (state, hit, stats) => {
  if (hit.type !== 'hit' && hit.type !== 'criticalHit') return null; // decline
  return { state: { ...state, stacks: addStack(...) } }; // accept
}
```

Why this over `reactsTo` / `transformsTypes` arrays:

- **Accept/decline logic lives with the system's logic**, not in a separate declaration that can drift out of sync.
- **No shared constants or imports** between systems. No coupling.
- **The pipeline is maximally dumb** — it calls, checks for null, moves on.

## Priority Ordering

Transforms run in **priority order** — lower number runs first. Each system declares its priority at registration.

```ts
const dodgeSystem  = { id: 'dodge',  priority: 0,  transformHit: ... };
const blockSystem  = { id: 'block',  priority: 10, transformHit: ... };
const critSystem   = { id: 'crit',   priority: 20, transformHit: ... };
const armorSystem  = { id: 'armor',  priority: 30, transformHit: ... };
```

The pipeline sorts transforms by priority once at registration and runs them in that order. Each system decides for itself whether to accept or decline — but the order they're offered the hit is deterministic.

**Reordering is a game design change, not a code change.** Want crits to pierce blocks? Swap crit to priority 5 so it runs before block. Block then sees a `'criticalHit'` and decides whether to block it. The architecture doesn't care — it just runs lowest to highest.

Current ordering rationale:

- Dodge first: dodged hits never reach anything else
- Block before crit: blocked hits aren't crits (default behavior)
- Crit before armor: armor reduces crit-boosted damage
- Armor last: final damage reduction

## Two Kinds of System Participation

### Transforms

Modify data flowing through the pipeline. **Ordered by priority.** A transform can **change the type** of a hit or decline to act.

```
{type:'hit'} → [dodge: decline] → [block: accept] → {type:'blockedHit'}
{type:'hit'} → [dodge: decline] → [block: decline] → [crit: accept] → {type:'criticalHit'}
```

Pipeline logic:

```ts
for (const sys of transformsSortedByPriority) {
	const result = sys.transformHit(states.get(sys.id), current, stats, rng);
	if (result !== null) {
		states.set(sys.id, result.state);
		current = result.hit;
	}
}
```

### Reactors

Respond to events after transforms are done. Produce side-state (poison stacks, gold, XP). **Unordered** — reactor ordering doesn't matter because they don't see each other's output. Accept or decline the same way as transforms.

Pipeline logic:

```ts
for (const sys of reactors) {
	if (!sys.onHit) continue;
	const result = sys.onHit(states.get(sys.id), hit, stats);
	if (result !== null) {
		states.set(sys.id, result.state);
		if (result.effects) allEffects.push(...result.effects);
	}
}
```

## The Attack Pipeline

```
Attack:
  1. beforeAttack transforms  [execute]     → may short-circuit with {type:'executeHit'}
  2. generateHits(stats)                    → [{type:'hit'}, {type:'hit'}, {type:'hit'}]
  3. per hit: transforms by priority        → type may change, systems accept or decline
  4. per hit: applyDamage                   → apply to enemy (if hit has damage)
  5. per hit: offer to reactors             → each accepts or declines
  6. afterAllHits             [overkill]    → carry damage forward
  7. checkKill                              → triggers kill pipeline if dead
```

### Short-Circuit Behavior

**Execute** (beforeAttack): replaces the entire hit generation. On success, produces a single `{type: 'executeHit', damage: enemyHealth}` and jumps from step 1 to step 6.

```ts
const executeSystem = {
	id: 'execute',
	initialState: () => ({}),

	beforeAttack: (state, ctx, stats) => {
		if (ctx.isBoss) return { state, skip: false };
		if (ctx.rng() >= stats.executeChance) return { state, skip: false };
		return {
			state,
			skip: true,
			hits: [{ type: 'executeHit', damage: ctx.enemyHealth }]
		};
	}
};
```

## System Definition

A system is a set of pure functions + initial state. No mutation, no `this`, no side effects. The pipeline's `SystemDefinition` is generic — it works only with `PipelineHit`.

```ts
interface PipelineHit {
	type: string;
}

interface SystemDefinition<TState = any> {
	id: string;
	initialState: () => TState;
	priority?: number; // transform ordering (lower = earlier). Reactors ignore this.
	isActive?: (stats: Record<string, number>) => boolean;

	// Transforms — return result to accept, null to decline
	beforeAttack?: (
		state: TState,
		ctx: AttackContext,
		stats: Record<string, number>
	) => { state: TState; skip?: boolean; hits?: PipelineHit[] };
	transformHit?: (
		state: TState,
		hit: PipelineHit,
		stats: Record<string, number>,
		rng: Rng
	) => { state: TState; hit: PipelineHit } | null;

	// Reactors — return result to accept, null to decline
	onHit?: (
		state: TState,
		hit: PipelineHit,
		stats: Record<string, number>
	) => ReactorResult<TState> | null;

	// Lifecycle
	onTick?: (
		state: TState,
		stats: Record<string, number>,
		ctx: TickContext
	) => { state: TState; damage: number; hitType?: string };
	onKill?: (state: TState, ctx: KillContext) => TState;

	// Cross-system effects
	handleEffect?: (state: TState, action: string, payload: any) => TState;

	// Serialization
	serialize?: (state: TState) => unknown;
	deserialize?: (data: unknown) => TState;
}
```

### Full Examples

```ts
// crit.ts
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

	transformHit: (state, hit, stats, rng) => {
		if (hit.type !== 'hit') return null;
		if (rng() >= stats.critChance) return { state, hit };
		return {
			state,
			hit: {
				type: 'criticalHit',
				damage: Math.floor(hit.damage * stats.critMultiplier),
				index: hit.index,
				critMultiplier: stats.critMultiplier
			}
		};
	}
};
```

```ts
// poison.ts
const poisonStackMgr = createStackManager({ max: 5, refreshPolicy: 'refresh-shortest' });

const poisonSystem: SystemDefinition<{ stacks: Stack[] }> = {
	id: 'poison',
	initialState: () => ({ stacks: [] }),
	isActive: (stats) => stats.poison > 0,

	onHit: (state, hit, stats) => {
		if (hit.type !== 'hit' && hit.type !== 'criticalHit') return null;
		return {
			state: { ...state, stacks: poisonStackMgr.add(state.stacks, stats.poisonDuration) }
		};
	},

	onTick: (state, stats) => {
		if (state.stacks.length === 0) return { state, damage: 0 };
		const perStack = Math.floor(stats.poison * (stats.damageMultiplier ?? 1));
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
```

```ts
// thorns.ts — only accepts 'blockedHit'
const thornsSystem: SystemDefinition<{ reflectDamage: number }> = {
	id: 'thorns',
	initialState: () => ({ reflectDamage: 0 }),
	isActive: (stats) => stats.thorns > 0,

	onHit: (state, hit, stats) => {
		if (hit.type !== 'blockedHit') return null;
		return {
			state: { ...state, reflectDamage: hit.originalDamage * stats.thorns }
		};
	}
};
```

## Cross-System Communication: Effects

When one system needs to influence another (e.g. "Venomous Crits" adds extra poison stacks on crit), systems don't import each other. Reactors return **effects** — the pipeline applies them after all reactors run.

```ts
// venomous-crits.ts — emits effect targeting 'poison'. Never imports poison.
const venomousCritsSystem: SystemDefinition<{}> = {
	id: 'venomous-crits',
	initialState: () => ({}),
	isActive: (stats) => stats.venomousCrits > 0 && stats.poison > 0,

	onHit: (state, hit, stats) => {
		if (hit.type !== 'criticalHit') return null;
		return {
			state,
			effects: [{ target: 'poison', action: 'addStacks', payload: { count: 1 } }]
		};
	}
};
```

If poison isn't registered, the effect is a no-op. Venomous-crits never imports poison.

## Shared Primitives

Internal tools that systems compose. Not interfaces — systems aren't required to use them.

### StackManager

Manages a collection of stacks with max count, per-stack duration, and refresh policy.

- **Policies:** `refresh-shortest` (poison), `add-new` (burn — drop oldest at cap), `unlimited` (frenzy)
- **Operations:** `add`, `tick`, `clear`

### PeriodicEffect

Wraps a system's `onTick` with an interval. Registers in the TimerRegistry.

### StatModifier

Wraps transient stat changes. Plugs into the existing StatPipeline.

## The Kill Pipeline

Triggered when `checkKill` detects enemy death. Separate from the attack pipeline.

```
Kill:
  1. beforeKill    [poison.onKill, burn.onKill]    → clear system states
  2. rewards       [gold.onKill, xp.onKill]        → calculate and apply
  3. progression   [wave.advance, stage.advance]    → advance game state
  4. afterKill     [overkill.carry]                 → carry state to next enemy
  5. spawn         [enemy.spawnNext]                → spawn next target
  6. afterSpawn    [bossTimer.onSpawn, aura.onSpawn] → set up new enemy systems
```

## The Tick Pipeline

Runs every interval (1s for DoTs). Separate from attack pipeline.

```
Tick:
  for each active system with onTick:
    → system.onTick(state, stats) → { newState, damage?, hitType? }
    → if damage > 0: apply to enemy, produce hit of hitType
    → offer hit to reactors (a poison tick hit might trigger other systems)
    → if enemy dead: trigger kill pipeline
```

## Transform Ordering

Priority numbers define transform order. Current defaults:

```
priority 0:   dodge       — dodged hits never reach anything else
priority 10:  block       — blocked hits don't crit (default)
priority 20:  crit        — crits amplify damage
priority 30:  armor       — final damage reduction
priority 40:  resistance  — elemental damage reduction
```

**Reordering is a game design change, not a code change.** Swap two numbers and behavior changes. Want crits to pierce blocks? Move crit to priority 5.

## Design Principles

1. **Dependency inversion.** The pipeline depends on `PipelineHit` (`{ type: string }`), not on concrete hit types. Systems depend on that same abstraction. Adding a new hit type never modifies the pipeline.
2. **Accept/decline, not registration.** Systems decide at call time whether to handle a hit by returning a result or null. No `reactsTo` arrays, no string constants, no declarations that drift from logic.
3. **Priority ordering for transforms.** Lower number = runs first. Reordering is changing a number, not restructuring code.
4. **Composition over inheritance.** Hit types are siblings, not parent-child. Systems compose shared primitives, not extend base classes.
5. **Systems are pure functions.** `(state, context) → newState | null`. No mutation, no side effects, no `this`.
6. **Systems own their state.** Poison owns its stacks. Frenzy owns its count. The orchestrator stores it but never reads into it.
7. **Systems don't know about each other.** They communicate through the pipeline and effects, never direct imports.
8. **The orchestrator is the only imperative code.** It holds `$state`, calls system functions, applies results. The only file that imports Svelte reactivity.
9. **Shared primitives are tools, not interfaces.** StackManager is a utility systems can use. It's not a required contract.
10. **Transforms are ordered, reactors are unordered.** Transform order is fixed by priority. Reactor order doesn't matter.
