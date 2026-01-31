# Plan 0: Stat Pipeline + Timer Registry + Game Loop + Attack Speed

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce three foundational systems — (1) a layered memoised stat pipeline that replaces direct stat mutation, (2) a named timer registry that replaces all `setTimeout`/`setInterval` for gameplay timing, (3) a `requestAnimationFrame` game loop with attack speed, pointer-held auto-attack, tap frenzy, and tap queuing. These systems underpin Plans 1-3.

**Architecture:** Bottom-up in five phases — (0) stat pipeline engine + store + card migration, (1) timer registry engine, (2) game loop engine with attack speed helpers, (3) rAF store + gameState migration + pointer input + UI, (4) upgrade cards + changelog.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript, Vitest, Tailwind CSS.

**Dependencies:** None. Must be completed before Plans 1-3.

**Design doc:** This plan was designed during brainstorming session 2026-01-31. Key decisions:
- Stats are never mutated. All effective values computed via layered memoised pipeline (monad pattern).
- All gameplay timing uses a named timer registry ticked by the rAF loop. No `setTimeout`/`setInterval` for game logic.
- Attack speed = "attacks per second" (Adventurer 0.8, future: Warrior 0.4, Mage 0.64, Rogue 1.2).
- `pointerdown` = can attack, `pointerup` = stop auto-attack.
- Tap frenzy: each attack adds a temporary stack that boosts attack speed via transient pipeline modifier.
- Tap queuing: tapping during cooldown queues one attack that fires when cooldown ends.
- Single rAF loop drives the timer registry which handles: attack cooldown, poison ticks, boss timer, and all future mechanics.
- UI effects (hit numbers, gold drops) stay on `setTimeout` — cosmetic, not game logic.

---

## Phase 0: Stat Pipeline

### Task 0.1: Define Stat Pipeline Types and Engine

**Files:**
- Create: `src/lib/engine/statPipeline.ts`
- Create: `src/lib/engine/statPipeline.test.ts`

**Step 1: Write failing tests**

Create `src/lib/engine/statPipeline.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';
import {
	add, multiply, clampMin, conditionalAdd,
	computeLayered, createLayer, dirtyLayer,
	type PipelineLayer
} from '$lib/engine/statPipeline';

describe('step functions', () => {
	test('add creates additive step', () => {
		expect(add(3)(10)).toBe(13);
	});

	test('multiply creates multiplicative step', () => {
		expect(multiply(1.5)(10)).toBe(15);
	});

	test('clampMin enforces floor', () => {
		expect(clampMin(0)(-5)).toBe(0);
		expect(clampMin(0)(5)).toBe(5);
	});

	test('conditionalAdd applies when true', () => {
		expect(conditionalAdd(5, true)(10)).toBe(15);
	});

	test('conditionalAdd skips when false', () => {
		expect(conditionalAdd(5, false)(10)).toBe(10);
	});
});

describe('computeLayered', () => {
	test('computes through all layers', () => {
		const layers: PipelineLayer[] = [
			createLayer([add(5)]),       // 1 + 5 = 6
			createLayer([multiply(2)]),  // 6 * 2 = 12
			createLayer([clampMin(0)])   // 12 (no change)
		];
		expect(computeLayered(1, layers)).toBe(12);
	});

	test('returns cached result when not dirty and input unchanged', () => {
		const layers: PipelineLayer[] = [
			createLayer([add(5)]),
			createLayer([multiply(2)])
		];

		// First computation
		computeLayered(1, layers);

		// All layers should now be clean
		expect(layers[0].dirty).toBe(false);
		expect(layers[1].dirty).toBe(false);

		// Second computation — hits cache
		expect(computeLayered(1, layers)).toBe(12);
	});

	test('recomputes only dirty layers', () => {
		const layers: PipelineLayer[] = [
			createLayer([add(5)]),       // Layer 0: permanent
			createLayer([add(0)]),       // Layer 1: transient (will be modified)
		];

		// First computation: 1 + 5 + 0 = 6
		expect(computeLayered(1, layers)).toBe(6);

		// Change transient layer (e.g., frenzy stack added)
		layers[1] = createLayer([add(3)]);

		// Recompute: Layer 0 cached (6), Layer 1 dirty: 6 + 3 = 9
		expect(computeLayered(1, layers)).toBe(9);

		// Layer 0 still has its cache intact
		expect(layers[0].dirty).toBe(false);
	});

	test('dirtying an earlier layer forces recomputation of later layers', () => {
		const layers: PipelineLayer[] = [
			createLayer([add(5)]),
			createLayer([multiply(2)])
		];

		// First: (1 + 5) * 2 = 12
		expect(computeLayered(1, layers)).toBe(12);

		// Dirty Layer 0 (e.g., new upgrade acquired)
		dirtyLayer(layers, 0);
		layers[0] = createLayer([add(10)]);

		// Both recompute: (1 + 10) * 2 = 22
		expect(computeLayered(1, layers)).toBe(22);
	});

	test('handles empty layers', () => {
		expect(computeLayered(5, [])).toBe(5);
	});

	test('handles multiple steps in one layer', () => {
		const layers: PipelineLayer[] = [
			createLayer([add(2), add(3), multiply(2)])  // (5 + 2 + 3) * 2 = 20
		];
		expect(computeLayered(5, layers)).toBe(20);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/lib/engine/statPipeline.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement stat pipeline engine**

Create `src/lib/engine/statPipeline.ts`:

```typescript
// --- Step functions (monad units) ---

export type StatStep = (value: number) => number;

export const add = (n: number): StatStep => (v) => v + n;
export const multiply = (n: number): StatStep => (v) => v * n;
export const clampMin = (min: number): StatStep => (v) => Math.max(min, v);
export const conditionalAdd = (n: number, condition: boolean): StatStep =>
	condition ? (v) => v + n : (v) => v;

// --- Pipeline layer with memoisation ---

export type PipelineLayer = {
	steps: StatStep[];
	cachedResult: number;
	cachedInput: number;
	dirty: boolean;
};

export function createLayer(steps: StatStep[]): PipelineLayer {
	return { steps, cachedResult: 0, cachedInput: NaN, dirty: true };
}

export function dirtyLayer(layers: PipelineLayer[], fromIndex: number): void {
	for (let i = fromIndex; i < layers.length; i++) {
		layers[i].dirty = true;
	}
}

// --- Layered computation with per-layer memoisation ---

export function computeLayered(base: number, layers: PipelineLayer[]): number {
	let value = base;

	for (let i = 0; i < layers.length; i++) {
		const layer = layers[i];
		if (!layer.dirty && layer.cachedInput === value) {
			value = layer.cachedResult;
			continue;
		}

		layer.cachedInput = value;
		for (let j = 0; j < layer.steps.length; j++) {
			value = layer.steps[j](value);
		}
		layer.cachedResult = value;
		layer.dirty = false;
	}

	return value;
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test src/lib/engine/statPipeline.test.ts`
Expected: PASS

**Step 5: Commit**

`feat: add layered memoised stat pipeline engine`

---

### Task 0.2: Define Stat Modifier Type and Upgrade Card Format

**Files:**
- Modify: `src/lib/types.ts` (add `StatModifier`, update `Upgrade`)

**Step 1: Add `StatModifier` type to `types.ts`**

Add after the `Rarity` type:

```typescript
export type StatModifier = {
	stat: keyof PlayerStats;
	value: number;
};
```

**Step 2: Update `Upgrade` type**

Replace the current `Upgrade` type:

```typescript
export type Upgrade = {
	id: string;
	title: string;
	rarity: Rarity;
	image: string;
	modifiers: StatModifier[];
	onAcquire?: () => void; // One-time side effect (unlock weapon, unlock ability)
};
```

This removes:
- `stats: { label: string; value: string }[]` — display derived from `modifiers` + `statRegistry`
- `apply: (stats: PlayerStats) => void` — replaced by pipeline

**Step 3: Run tests**

Run: `bun test`
Expected: FAIL — existing code references `stats` and `apply`. This is expected; Task 0.3 migrates the cards.

**Step 4: Commit**

`feat: add StatModifier type and update Upgrade to use modifiers`

---

### Task 0.3: Migrate All Upgrade Cards to Modifier Format

**Files:**
- Modify: `src/lib/data/upgrades.ts` (replace `stats`/`apply` with `modifiers` on all cards)
- Modify: `src/lib/data/upgrades.test.ts`

**Step 1: Migrate each card**

For every card in `allUpgrades`, replace `stats` and `apply` with `modifiers`. Examples:

```typescript
// Damage cards
{ id: 'damage1', title: 'Sharpen Blade', rarity: 'common', image: swordImg,
  modifiers: [{ stat: 'damage', value: 1 }] },
{ id: 'damage2', title: 'Heavy Strike', rarity: 'common', image: swordImg,
  modifiers: [{ stat: 'damage', value: 3 }] },
{ id: 'damage3', title: 'Devastating Blow', rarity: 'uncommon', image: swordImg,
  modifiers: [{ stat: 'damage', value: 5 }] },
{ id: 'damage4', title: 'Titan Strength', rarity: 'rare', image: swordImg,
  modifiers: [{ stat: 'damage', value: 10 }] },

// Crit chance
{ id: 'crit1', title: 'Keen Eye', rarity: 'common', image: critImg,
  modifiers: [{ stat: 'critChance', value: 0.05 }] },

// Multi-stat cards become multiple modifiers
{ id: 'combo1', title: 'Berserker', rarity: 'epic', image: swordImg,
  modifiers: [
    { stat: 'damage', value: 5 },
    { stat: 'critChance', value: 0.1 },
    { stat: 'critMultiplier', value: 0.5 }
  ] },

// Boolean stats (overkill) use value: 1 as truthy
{ id: 'overkill1', title: 'Overkill', rarity: 'rare', image: swordImg,
  modifiers: [{ stat: 'overkill', value: 1 }] },
```

Migrate all 50+ cards following this pattern. The existing `apply` function body tells you exactly what modifiers to create.

**Step 2: Update display label generation**

Create a helper that derives display labels from modifiers:

```typescript
export function getModifierDisplay(mod: StatModifier): string {
	const entry = statRegistry.find((s) => s.key === mod.stat);
	if (!entry) return `${mod.stat} +${mod.value}`;
	return `${entry.label} ${entry.format(mod.value)}`;
}
```

Update any UI components that read `upgrade.stats` to use `upgrade.modifiers.map(getModifierDisplay)` instead.

**Step 3: Write validation tests**

```typescript
describe('upgrade card modifiers', () => {
	test('every card has at least one modifier', () => {
		for (const card of allUpgrades) {
			expect(card.modifiers.length, `${card.id} has no modifiers`).toBeGreaterThan(0);
		}
	});

	test('all modifier stats reference valid PlayerStats keys', () => {
		const validKeys = Object.keys(createDefaultStats());
		for (const card of allUpgrades) {
			for (const mod of card.modifiers) {
				expect(validKeys, `${card.id} references unknown stat: ${mod.stat}`).toContain(mod.stat);
			}
		}
	});

	test('no card has apply() or stats[] property', () => {
		for (const card of allUpgrades) {
			expect((card as any).apply, `${card.id} still has apply()`).toBeUndefined();
			expect((card as any).stats, `${card.id} still has stats[]`).toBeUndefined();
		}
	});
});
```

**Step 4: Run tests**

Run: `bun test`
Expected: Some tests may still fail if other code references `apply()` — those are fixed in Task 0.4.

**Step 5: Commit**

`refactor: migrate all upgrade cards from apply() to modifiers[]`

---

### Task 0.4: Create Stat Pipeline Store and Wire into Game State

**Files:**
- Create: `src/lib/stores/statPipeline.svelte.ts`
- Modify: `src/lib/stores/gameState.svelte.ts`
- Modify: `src/lib/engine/stats.ts` (add `BASE_STATS` constant)

**Step 1: Add `BASE_STATS` to `stats.ts`**

Export a constant with all baseline stat values (the current `createDefaultStats()` values):

```typescript
export const BASE_STATS: Readonly<PlayerStats> = Object.freeze(createDefaultStats());
```

**Step 2: Create stat pipeline store**

Create `src/lib/stores/statPipeline.svelte.ts`:

```typescript
import {
	computeLayered, createLayer, dirtyLayer, add, multiply, clampMin,
	type PipelineLayer, type StatStep
} from '$lib/engine/statPipeline';
import { BASE_STATS } from '$lib/engine/stats';
import { allUpgrades } from '$lib/data/upgrades';
import type { PlayerStats, StatModifier } from '$lib/types';

type StatKey = keyof PlayerStats;

// Pipeline layers per stat:
// 0: Base (class overrides)
// 1: Permanent (acquired upgrades + shop)
// 2: Class bonuses (from class selection)
// 3: Transient (enemy effects, frenzy, buffs/debuffs)
// 4: Clamp (floor at 0)
const LAYER_BASE = 0;
const LAYER_PERMANENT = 1;
const LAYER_CLASS = 2;
const LAYER_TRANSIENT = 3;
const LAYER_CLAMP = 4;
const LAYER_COUNT = 5;

export function createStatPipeline() {
	// Per-stat pipeline layers
	let pipelines = $state<Record<StatKey, PipelineLayer[]>>(initPipelines());

	// Sources of truth
	let acquiredUpgradeIds = $state<string[]>([]);
	let classBaseOverrides = $state<StatModifier[]>([]);
	let classModifiers = $state<StatModifier[]>([]);
	let transientModifiers = $state<StatModifier[]>([]);
	let transientSteps = $state<{ stat: StatKey; step: StatStep; source: string }[]>([]);

	function initPipelines(): Record<StatKey, PipelineLayer[]> {
		const result = {} as Record<StatKey, PipelineLayer[]>;
		for (const key of Object.keys(BASE_STATS) as StatKey[]) {
			result[key] = Array.from({ length: LAYER_COUNT }, () => createLayer([]));
			result[key][LAYER_CLAMP] = createLayer([clampMin(0)]);
		}
		return result;
	}

	function rebuildLayer(layerIndex: number, modifiers: StatModifier[]): void {
		const affectedStats = new Set<StatKey>();
		for (const mod of modifiers) {
			affectedStats.add(mod.stat);
		}

		// Clear and rebuild affected stats for this layer
		for (const stat of Object.keys(BASE_STATS) as StatKey[]) {
			const steps: StatStep[] = [];
			for (const mod of modifiers) {
				if (mod.stat === stat) {
					steps.push(add(mod.value));
				}
			}
			pipelines[stat][layerIndex] = createLayer(steps);
			// Dirty this layer and all after it
			dirtyLayer(pipelines[stat], layerIndex);
		}
	}

	function rebuildTransientLayer(): void {
		for (const stat of Object.keys(BASE_STATS) as StatKey[]) {
			const steps: StatStep[] = [];

			// Additive transient modifiers
			for (const mod of transientModifiers) {
				if (mod.stat === stat) {
					steps.push(add(mod.value));
				}
			}

			// Custom step transient modifiers (multiply, conditional, etc.)
			for (const entry of transientSteps) {
				if (entry.stat === stat) {
					steps.push(entry.step);
				}
			}

			pipelines[stat][LAYER_TRANSIENT] = createLayer(steps);
			dirtyLayer(pipelines[stat], LAYER_TRANSIENT);
		}
	}

	function get(stat: StatKey): number {
		return computeLayered(BASE_STATS[stat] as number, pipelines[stat]);
	}

	// --- Public API ---

	function acquireUpgrade(upgradeId: string): void {
		acquiredUpgradeIds = [...acquiredUpgradeIds, upgradeId];
		const allMods: StatModifier[] = [];
		for (const id of acquiredUpgradeIds) {
			const card = allUpgrades.find((u) => u.id === id);
			if (card) allMods.push(...card.modifiers);
		}
		rebuildLayer(LAYER_PERMANENT, allMods);
	}

	function setAcquiredUpgrades(ids: string[]): void {
		acquiredUpgradeIds = [...ids];
		const allMods: StatModifier[] = [];
		for (const id of acquiredUpgradeIds) {
			const card = allUpgrades.find((u) => u.id === id);
			if (card) allMods.push(...card.modifiers);
		}
		rebuildLayer(LAYER_PERMANENT, allMods);
	}

	function setClassBase(overrides: StatModifier[]): void {
		classBaseOverrides = overrides;
		rebuildLayer(LAYER_BASE, overrides);
	}

	function setClassModifiers(mods: StatModifier[]): void {
		classModifiers = mods;
		rebuildLayer(LAYER_CLASS, mods);
	}

	function addTransient(source: string, mods: StatModifier[]): void {
		transientModifiers = [...transientModifiers, ...mods.map((m) => ({ ...m }))];
		rebuildTransientLayer();
	}

	function addTransientStep(source: string, stat: StatKey, step: StatStep): void {
		transientSteps = [...transientSteps, { stat, step, source }];
		rebuildTransientLayer();
	}

	function removeTransient(source: string): void {
		transientModifiers = transientModifiers.filter((m) => (m as any).source !== source);
		transientSteps = transientSteps.filter((s) => s.source !== source);
		rebuildTransientLayer();
	}

	function clearTransients(): void {
		transientModifiers = [];
		transientSteps = [];
		rebuildTransientLayer();
	}

	function dirtyAll(): void {
		for (const stat of Object.keys(BASE_STATS) as StatKey[]) {
			dirtyLayer(pipelines[stat], 0);
		}
	}

	function reset(): void {
		acquiredUpgradeIds = [];
		classBaseOverrides = [];
		classModifiers = [];
		transientModifiers = [];
		transientSteps = [];
		pipelines = initPipelines();
	}

	return {
		get,
		get acquiredUpgradeIds() { return acquiredUpgradeIds; },
		acquireUpgrade,
		setAcquiredUpgrades,
		setClassBase,
		setClassModifiers,
		addTransient,
		addTransientStep,
		removeTransient,
		clearTransients,
		dirtyAll,
		reset
	};
}
```

**Step 3: Wire into gameState**

In `gameState.svelte.ts`:

1. Create pipeline instance: `const statPipeline = createStatPipeline();`
2. Replace all `playerStats.damage` reads with `statPipeline.get('damage')` (and similarly for all stats)
3. Replace `upgrade.apply(playerStats)` in `selectUpgrade()` with:
   ```typescript
   statPipeline.acquireUpgrade(upgrade.id);
   if (upgrade.onAcquire) upgrade.onAcquire();
   ```
4. Remove `applyPurchasedUpgrades()` — shop upgrades are loaded via `statPipeline.setAcquiredUpgrades()`
5. Remove the mutable `playerStats` object entirely (or keep as a compatibility shim that delegates to pipeline)

**Step 4: Update persistence**

In `saveGame()`, save `statPipeline.acquiredUpgradeIds` (already saved as `unlockedUpgradeIds`).
In `loadGame()`, call `statPipeline.setAcquiredUpgrades(data.unlockedUpgradeIds)`.

Computed stat values are NOT saved. They are derived on load.

**Step 5: Update components that display stats**

Any component reading `playerStats.X` now reads `statPipeline.get('X')` (exposed via gameState getters).

**Step 6: Run tests**

Run: `bun test`
Expected: PASS — all stat reads go through pipeline, all upgrades applied via modifiers.

**Step 7: Commit**

`feat: create stat pipeline store and wire into game state`

---

### Task 0.5: Stat Pipeline Integration Tests

**Files:**
- Create: `src/lib/stores/statPipeline.test.ts`

Test the store-level integration:

```typescript
describe('stat pipeline store', () => {
	test('base stats match defaults before any upgrades', () => {
		const pipeline = createStatPipeline();
		expect(pipeline.get('damage')).toBe(1);
		expect(pipeline.get('critChance')).toBe(0);
	});

	test('acquiring upgrade adds to stat', () => {
		const pipeline = createStatPipeline();
		pipeline.acquireUpgrade('damage2'); // +3 damage
		expect(pipeline.get('damage')).toBe(4);
	});

	test('acquiring same upgrade twice stacks', () => {
		const pipeline = createStatPipeline();
		pipeline.acquireUpgrade('damage2');
		pipeline.acquireUpgrade('damage2');
		expect(pipeline.get('damage')).toBe(7); // 1 + 3 + 3
	});

	test('transient modifiers affect stat and are removable', () => {
		const pipeline = createStatPipeline();
		pipeline.addTransient('frenzy', [{ stat: 'attackSpeed', value: 0.2 }]);
		const boosted = pipeline.get('attackSpeed');
		pipeline.removeTransient('frenzy');
		const base = pipeline.get('attackSpeed');
		expect(boosted).toBeGreaterThan(base);
	});

	test('clearTransients removes all transient effects', () => {
		const pipeline = createStatPipeline();
		pipeline.addTransient('frost_aura', [{ stat: 'damage', value: -2 }]);
		pipeline.addTransient('darkness', [{ stat: 'poison', value: -1 }]);
		pipeline.clearTransients();
		expect(pipeline.get('damage')).toBe(1);
		expect(pipeline.get('poison')).toBe(0);
	});

	test('reset clears everything', () => {
		const pipeline = createStatPipeline();
		pipeline.acquireUpgrade('damage4');
		pipeline.addTransient('test', [{ stat: 'damage', value: 5 }]);
		pipeline.reset();
		expect(pipeline.get('damage')).toBe(1);
	});
});
```

**Run:** `bun test src/lib/stores/statPipeline.test.ts`

**Commit:** `test: add stat pipeline store integration tests`

---

## Phase 1: Timer Registry

### Task 1.1: Create Timer Registry Engine

**Files:**
- Create: `src/lib/engine/timerRegistry.ts`
- Create: `src/lib/engine/timerRegistry.test.ts`

**Step 1: Write failing tests**

Create `src/lib/engine/timerRegistry.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';
import { createTimerRegistry, type GameTimer } from '$lib/engine/timerRegistry';

describe('timer registry', () => {
	test('one-shot timer fires on expiry', () => {
		const registry = createTimerRegistry();
		let fired = false;
		registry.register('test', { remaining: 100, onExpire: () => { fired = true; } });
		registry.tick(100);
		expect(fired).toBe(true);
		expect(registry.has('test')).toBe(false); // auto-removed
	});

	test('one-shot timer does not fire before expiry', () => {
		const registry = createTimerRegistry();
		let fired = false;
		registry.register('test', { remaining: 100, onExpire: () => { fired = true; } });
		registry.tick(50);
		expect(fired).toBe(false);
		expect(registry.has('test')).toBe(true);
	});

	test('repeating timer fires and resets', () => {
		const registry = createTimerRegistry();
		let count = 0;
		registry.register('tick', { remaining: 1000, onExpire: () => { count++; }, repeat: 1000 });

		registry.tick(1000);
		expect(count).toBe(1);
		expect(registry.has('tick')).toBe(true); // still alive

		registry.tick(1000);
		expect(count).toBe(2);
	});

	test('repeating timer carries remainder', () => {
		const registry = createTimerRegistry();
		let count = 0;
		registry.register('tick', { remaining: 1000, onExpire: () => { count++; }, repeat: 1000 });

		// 2500ms = fires at 1000, 2000, remainder 500
		registry.tick(2500);
		expect(count).toBe(2);

		// 600ms more = 500 + 600 = 1100, fires once more
		registry.tick(600);
		expect(count).toBe(3);
	});

	test('remove cancels a timer', () => {
		const registry = createTimerRegistry();
		let fired = false;
		registry.register('test', { remaining: 100, onExpire: () => { fired = true; } });
		registry.remove('test');
		registry.tick(200);
		expect(fired).toBe(false);
	});

	test('multiple timers tick independently', () => {
		const registry = createTimerRegistry();
		let a = 0, b = 0;
		registry.register('a', { remaining: 100, onExpire: () => { a++; } });
		registry.register('b', { remaining: 200, onExpire: () => { b++; } });

		registry.tick(150);
		expect(a).toBe(1);
		expect(b).toBe(0);

		registry.tick(100);
		expect(b).toBe(1);
	});

	test('registering same name replaces existing timer', () => {
		const registry = createTimerRegistry();
		let first = 0, second = 0;
		registry.register('test', { remaining: 100, onExpire: () => { first++; } });
		registry.register('test', { remaining: 200, onExpire: () => { second++; } });

		registry.tick(150);
		expect(first).toBe(0);
		expect(second).toBe(0);

		registry.tick(100);
		expect(second).toBe(1);
	});

	test('clear removes all timers', () => {
		const registry = createTimerRegistry();
		let fired = false;
		registry.register('a', { remaining: 100, onExpire: () => { fired = true; } });
		registry.register('b', { remaining: 100, onExpire: () => { fired = true; } });
		registry.clear();
		registry.tick(200);
		expect(fired).toBe(false);
	});

	test('has returns correct status', () => {
		const registry = createTimerRegistry();
		expect(registry.has('test')).toBe(false);
		registry.register('test', { remaining: 100, onExpire: () => {} });
		expect(registry.has('test')).toBe(true);
	});

	test('getRemaining returns remaining ms', () => {
		const registry = createTimerRegistry();
		registry.register('test', { remaining: 500, onExpire: () => {} });
		registry.tick(200);
		expect(registry.getRemaining('test')).toBe(300);
	});

	test('getRemaining returns 0 for non-existent timer', () => {
		const registry = createTimerRegistry();
		expect(registry.getRemaining('test')).toBe(0);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/lib/engine/timerRegistry.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement timer registry**

Create `src/lib/engine/timerRegistry.ts`:

```typescript
export type GameTimer = {
	remaining: number;
	onExpire: () => void;
	repeat?: number;
};

export function createTimerRegistry() {
	const timers = new Map<string, GameTimer>();

	function register(name: string, timer: GameTimer): void {
		timers.set(name, { ...timer });
	}

	function remove(name: string): void {
		timers.delete(name);
	}

	function has(name: string): boolean {
		return timers.has(name);
	}

	function getRemaining(name: string): number {
		return timers.get(name)?.remaining ?? 0;
	}

	function tick(deltaMs: number): void {
		const expired: string[] = [];

		for (const [name, timer] of timers) {
			timer.remaining -= deltaMs;

			// Handle multiple expirations in a single large delta
			let maxIterations = 100;
			for (let i = 0; i < maxIterations && timer.remaining <= 0; i++) {
				timer.onExpire();

				if (timer.repeat != null) {
					timer.remaining += timer.repeat;
				} else {
					expired.push(name);
					break;
				}
			}
		}

		for (const name of expired) {
			timers.delete(name);
		}
	}

	function clear(): void {
		timers.clear();
	}

	return { register, remove, has, getRemaining, tick, clear };
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test src/lib/engine/timerRegistry.test.ts`
Expected: PASS

**Step 5: Commit**

`feat: add named timer registry with one-shot and repeating timers`

---

## Phase 2: Attack Speed Helpers

### Task 2.1: Add New Stats to PlayerStats

**Files:**
- Modify: `src/lib/types.ts` (add 3 fields to `PlayerStats`)
- Modify: `src/lib/engine/stats.ts` (defaults + statRegistry)

**Step 1: Add fields to `PlayerStats` in `types.ts`**

Add after the `goldPerKill: number;` line:

```typescript
attackSpeed: number;
tapFrenzyBonus: number;
tapFrenzyDuration: number;
```

**Step 2: Add defaults in `createDefaultStats()` in `stats.ts`**

Add after `goldPerKill: 0`:

```typescript
attackSpeed: 0.8,
tapFrenzyBonus: 0.05,
tapFrenzyDuration: 3
```

Update `BASE_STATS` constant accordingly.

**Step 3: Add statRegistry entries in `stats.ts`**

Add after the `greed` entry:

```typescript
{ key: 'attackSpeed', icon: '🗡️', label: 'Attack Speed', format: (v) => `${(v as number).toFixed(1)}/s`, alwaysShow: true },
{ key: 'tapFrenzyBonus', icon: '🔥', label: 'Frenzy Bonus', format: plusPct },
```

Do NOT add `tapFrenzyDuration` — internal, not player-facing.

**Step 4: Run tests**

Run: `bun test`
Expected: PASS.

**Step 5: Commit**

`feat: add attackSpeed, tapFrenzyBonus, tapFrenzyDuration to PlayerStats`

---

### Task 2.2: Create Attack Speed Helper Functions

**Files:**
- Create: `src/lib/engine/gameLoop.ts`
- Create: `src/lib/engine/gameLoop.test.ts`

**Step 1: Write failing tests**

Create `src/lib/engine/gameLoop.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';
import { getEffectiveAttackSpeed, getAttackIntervalMs } from '$lib/engine/gameLoop';

describe('getEffectiveAttackSpeed', () => {
	test('returns base speed with 0 frenzy stacks', () => {
		expect(getEffectiveAttackSpeed(0.8, 0, 0.05)).toBe(0.8);
	});

	test('increases speed with frenzy stacks', () => {
		// 0.8 * (1 + 5 * 0.05) = 0.8 * 1.25 = 1.0
		expect(getEffectiveAttackSpeed(0.8, 5, 0.05)).toBe(1.0);
	});

	test('scales linearly with stack count', () => {
		expect(getEffectiveAttackSpeed(0.8, 10, 0.05)).toBeCloseTo(1.2);
	});

	test('handles zero bonus gracefully', () => {
		expect(getEffectiveAttackSpeed(0.8, 10, 0)).toBe(0.8);
	});
});

describe('getAttackIntervalMs', () => {
	test('converts attacks/sec to interval', () => {
		expect(getAttackIntervalMs(0.8)).toBe(1250);
	});

	test('1 attack/sec = 1000ms', () => {
		expect(getAttackIntervalMs(1.0)).toBe(1000);
	});

	test('returns Infinity for 0 speed', () => {
		expect(getAttackIntervalMs(0)).toBe(Infinity);
	});

	test('returns Infinity for negative speed', () => {
		expect(getAttackIntervalMs(-1)).toBe(Infinity);
	});
});
```

**Step 2: Run tests — FAIL**

**Step 3: Implement**

Create `src/lib/engine/gameLoop.ts`:

```typescript
export function getEffectiveAttackSpeed(
	baseAttackSpeed: number,
	frenzyStacks: number,
	tapFrenzyBonus: number
): number {
	return baseAttackSpeed * (1 + frenzyStacks * tapFrenzyBonus);
}

export function getAttackIntervalMs(attackSpeed: number): number {
	if (attackSpeed <= 0) return Infinity;
	return 1000 / attackSpeed;
}
```

**Step 4: Run tests — PASS**

**Step 5: Commit**

`feat: add attack speed helper functions with tests`

---

## Phase 3: rAF Store + Migration + Pointer Input

### Task 3.1: Create Game Loop Store

**Files:**
- Create: `src/lib/stores/gameLoop.svelte.ts`

**Step 1: Create the store**

This store wraps the timer registry with `requestAnimationFrame` and Svelte 5 runes. It reads attack speed from the stat pipeline and manages frenzy as transient pipeline modifiers.

```typescript
import {
	getEffectiveAttackSpeed,
	getAttackIntervalMs
} from '$lib/engine/gameLoop';
import { createTimerRegistry } from '$lib/engine/timerRegistry';

export function createGameLoop() {
	const timers = createTimerRegistry();

	// rAF state
	let rafId: number | null = null;
	let lastFrameTime = $state(0);

	// Input state
	let paused = $state(false);
	let pointerHeld = $state(false);
	let attackQueuedTap = $state(false);

	// Frenzy — tracked as named timers, count derived
	let frenzyCount = $state(0);
	let frenzyId = $state(0);

	// Callbacks (set by gameState during start())
	let callbacks = {
		onAttack: () => {},
		onPoisonTick: () => {},
		onBossExpired: () => {},
		onFrenzyChanged: (_count: number) => {}
	};

	// Stat readers (set by gameState, read from pipeline)
	let getAttackSpeed = () => 0.8;
	let getTapFrenzyBonus = () => 0.05;
	let getTapFrenzyDuration = () => 3;

	function addFrenzyStack() {
		frenzyId++;
		frenzyCount++;
		const id = frenzyId;
		const name = `frenzy_${id}`;
		const duration = getTapFrenzyDuration() * 1000;

		timers.register(name, {
			remaining: duration,
			onExpire: () => {
				frenzyCount = Math.max(0, frenzyCount - 1);
				callbacks.onFrenzyChanged(frenzyCount);
			}
		});

		callbacks.onFrenzyChanged(frenzyCount);
	}

	function fireAttack() {
		callbacks.onAttack();
		addFrenzyStack();
		attackQueuedTap = false;

		// Re-register attack cooldown
		const effectiveSpeed = getEffectiveAttackSpeed(
			getAttackSpeed(),
			frenzyCount,
			getTapFrenzyBonus()
		);
		const interval = getAttackIntervalMs(effectiveSpeed);
		timers.register('attack_cooldown', {
			remaining: interval,
			onExpire: () => {
				const canAttack = pointerHeld || frenzyCount > 0;
				if (canAttack || attackQueuedTap) {
					fireAttack();
				}
			}
		});
	}

	function frame(timestamp: number) {
		if (lastFrameTime === 0) {
			lastFrameTime = timestamp;
			rafId = requestAnimationFrame(frame);
			return;
		}

		const deltaMs = Math.min(timestamp - lastFrameTime, 200); // cap to prevent tab-switch bursts
		lastFrameTime = timestamp;

		if (!paused) {
			timers.tick(deltaMs);
		}

		rafId = requestAnimationFrame(frame);
	}

	function start(cbs: {
		onAttack: () => void;
		onPoisonTick: () => void;
		onBossExpired: () => void;
		onFrenzyChanged?: (count: number) => void;
		getAttackSpeed: () => number;
		getTapFrenzyBonus: () => number;
		getTapFrenzyDuration: () => number;
	}) {
		callbacks = {
			onAttack: cbs.onAttack,
			onPoisonTick: cbs.onPoisonTick,
			onBossExpired: cbs.onBossExpired,
			onFrenzyChanged: cbs.onFrenzyChanged ?? (() => {})
		};
		getAttackSpeed = cbs.getAttackSpeed;
		getTapFrenzyBonus = cbs.getTapFrenzyBonus;
		getTapFrenzyDuration = cbs.getTapFrenzyDuration;

		// Register poison tick (repeating 1000ms)
		timers.register('poison_tick', {
			remaining: 1000,
			onExpire: () => callbacks.onPoisonTick(),
			repeat: 1000
		});

		lastFrameTime = 0;
		rafId = requestAnimationFrame(frame);
	}

	function stop() {
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	function pause() {
		paused = true;
	}

	function resume() {
		paused = false;
	}

	function pointerDown() {
		pointerHeld = true;
		if (!timers.has('attack_cooldown')) {
			// No cooldown active — fire immediately
			fireAttack();
		} else {
			attackQueuedTap = true;
		}
	}

	function pointerUp() {
		pointerHeld = false;
	}

	function startBossTimer(maxTime: number) {
		let bossTimeRemaining = maxTime;
		timers.register('boss_countdown', {
			remaining: 1000,
			repeat: 1000,
			onExpire: () => {
				bossTimeRemaining--;
				if (bossTimeRemaining <= 0) {
					timers.remove('boss_countdown');
					callbacks.onBossExpired();
				}
			}
		});
	}

	function stopBossTimer() {
		timers.remove('boss_countdown');
	}

	function reset() {
		stop();
		timers.clear();
		paused = false;
		pointerHeld = false;
		attackQueuedTap = false;
		frenzyCount = 0;
		frenzyId = 0;
		lastFrameTime = 0;
	}

	return {
		// Timer registry access (for Plans 1-3 to register enemy/ability timers)
		get timers() { return timers; },

		get frenzyStacks() { return frenzyCount; },
		get paused() { return paused; },
		get pointerHeld() { return pointerHeld; },

		start,
		stop,
		pause,
		resume,
		pointerDown,
		pointerUp,
		startBossTimer,
		stopBossTimer,
		reset
	};
}
```

**Step 2: Run tests — PASS**

**Step 3: Commit**

`feat: create game loop store with rAF, timer registry, frenzy stacks, and pointer input`

---

### Task 3.2: Migrate gameState from Timers to Game Loop

**Files:**
- Modify: `src/lib/stores/gameState.svelte.ts`
- Modify: `src/lib/stores/persistence.svelte.ts` (add `bossTimeRemaining` to `SessionSaveData`)
- Delete: `src/lib/stores/timers.svelte.ts`

**BUG FIX: Boss timer reset exploit.** Reloading during a boss fight restarts the timer at full duration. Fix: persist remaining boss time.

**Step 1: Add `bossTimeRemaining` to `SessionSaveData`**

In `persistence.svelte.ts`:

```typescript
bossTimeRemaining?: number;
```

**Step 2: Replace imports**

```typescript
// OLD
import { createTimers } from './timers.svelte';
const timers = createTimers();

// NEW
import { createGameLoop } from './gameLoop.svelte';
const gameLoop = createGameLoop();
```

**Step 3: Replace all `timers.xxx` calls**

| Location | Old | New |
|----------|-----|-----|
| `selectUpgrade()` | `timers.startPoisonTick(applyPoison); timers.resumeBossTimer(handleBossExpired);` | `gameLoop.resume();` |
| `openNextUpgrade()` | `timers.stopPoisonTick(); timers.pauseBossTimer();` | `gameLoop.pause();` |
| `killEnemy()` (boss dies) | `timers.stopBossTimer();` | `gameLoop.stopBossTimer();` |
| `killEnemy()` (spawn boss) | `timers.startBossTimer(bossTimerMax, handleBossExpired);` | `gameLoop.startBossTimer(bossTimerMax);` |
| `resetGame()` | `timers.stopAll();` | `gameLoop.reset();` |
| `init()` (boss resume) | `timers.startBossTimer(bossTimerMax, handleBossExpired);` | `gameLoop.startBossTimer(savedBossTime ?? bossTimerMax);` |

**Step 4: Update `init()`**

```typescript
function init() {
	shop.load();
	const loaded = loadGame();
	if (!loaded) {
		statPipeline.setAcquiredUpgrades([]);
		enemy.spawnEnemy(statPipeline.get('greed'));
	} else {
		if (enemy.isBoss) {
			const data = persistence.loadSession();
			const savedBossTime = data?.bossTimeRemaining;
			gameLoop.startBossTimer(savedBossTime ?? bossTimerMax);
		}
	}

	gameLoop.start({
		onAttack: attack,
		onPoisonTick: applyPoison,
		onBossExpired: handleBossExpired,
		onFrenzyChanged: (count) => {
			// Frenzy affects attack speed via transient modifier
			statPipeline.removeTransient('frenzy');
			if (count > 0) {
				statPipeline.addTransientStep(
					'frenzy', 'attackSpeed',
					multiply(1 + count * statPipeline.get('tapFrenzyBonus'))
				);
			}
		},
		getAttackSpeed: () => statPipeline.get('attackSpeed'),
		getTapFrenzyBonus: () => statPipeline.get('tapFrenzyBonus'),
		getTapFrenzyDuration: () => statPipeline.get('tapFrenzyDuration')
	});
}
```

**Step 5: Remove `attack` from public return object, add pointer controls**

```typescript
pointerDown: () => gameLoop.pointerDown(),
pointerUp: () => gameLoop.pointerUp(),
get frenzyStacks() { return gameLoop.frenzyStacks; },
get effectiveAttackSpeed() {
	return getEffectiveAttackSpeed(
		statPipeline.get('attackSpeed'),
		gameLoop.frenzyStacks,
		statPipeline.get('tapFrenzyBonus')
	);
},
```

**Step 6: Save boss time remaining**

In `saveGame()`:

```typescript
bossTimeRemaining: gameLoop.timers.has('boss_countdown')
	? Math.ceil(gameLoop.timers.getRemaining('boss_countdown') / 1000)
	: undefined
```

**Step 7: Delete `src/lib/stores/timers.svelte.ts`**

**Step 8: Run tests**

Run: `bun test`
Fix any references to deleted `timers` or removed `attack()` public API.

**Step 9: Commit**

`refactor: replace setInterval timers with rAF game loop and timer registry, fix boss timer exploit`

---

### Task 3.3: Update BattleArea for Pointer Input

**Files:**
- Modify: `src/lib/components/BattleArea.svelte`
- Modify: `src/routes/+page.svelte`

**Step 1: Change BattleArea Props**

Replace `onAttack: () => void` with:

```typescript
type Props = {
	isBoss: boolean;
	isChest: boolean;
	enemyHealth: number;
	enemyMaxHealth: number;
	enemiesKilled: number;
	gold: number;
	goldDrops: GoldDrop[];
	hits: HitInfo[];
	poisonStacks: number;
	onPointerDown: () => void;
	onPointerUp: () => void;
	frenzyStacks: number;
	effectiveAttackSpeed: number;
};
```

**Step 2: Replace event handlers on `.enemy` div**

```svelte
<div
	class="enemy"
	class:boss={isBoss}
	class:chest={isChest}
	onpointerdown={onPointerDown}
	onpointerup={onPointerUp}
	onpointerleave={onPointerUp}
	onkeydown={(e) => e.key === ' ' && onPointerDown()}
	onkeyup={(e) => e.key === ' ' && onPointerUp()}
	tabindex="0"
	role="button"
>
```

**Step 3: Add `touch-action: none` to `.enemy` CSS**

```css
.enemy {
	/* ...existing... */
	touch-action: none;
}
```

**Step 4: Update hint text**

```svelte
<p class="hint">Tap or hold to attack!</p>
```

**Step 5: Add frenzy stack indicator**

```svelte
{#if frenzyStacks > 0}
	<div class="frenzy-indicator">
		<span class="frenzy-icon">🔥</span>
		<span class="frenzy-count">{frenzyStacks}</span>
		<span class="frenzy-speed">{effectiveAttackSpeed.toFixed(1)}/s</span>
	</div>
{/if}
```

Style with pulse animation (see original plan for CSS).

**Step 6: Update `+page.svelte`**

Replace `onAttack={() => gameState.attack()}` with:

```svelte
onPointerDown={() => gameState.pointerDown()}
onPointerUp={() => gameState.pointerUp()}
frenzyStacks={gameState.frenzyStacks}
effectiveAttackSpeed={gameState.effectiveAttackSpeed}
```

**Step 7: Manual test**

Run: `bun run dev`
Verify: tap, hold, release, frenzy decay, queued tap, boss timer, poison ticks, upgrade pause/resume, boss timer persistence on reload.

**Step 8: Commit**

`feat: replace onclick with pointer input for tap-and-hold attacks`

---

## Phase 4: Upgrade Cards + Changelog

### Task 4.1: Add Attack Speed Upgrade Cards

**Files:**
- Modify: `src/lib/data/upgrades.ts`

Add cards using the new `modifiers` format:

| ID | Title | Rarity | Modifiers |
|----|-------|--------|-----------|
| `atkspd1` | Swift Strikes | common | `[{ stat: 'attackSpeed', value: 0.1 }]` |
| `atkspd2` | Rapid Assault | uncommon | `[{ stat: 'attackSpeed', value: 0.2 }]` |
| `atkspd3` | Blinding Speed | rare | `[{ stat: 'attackSpeed', value: 0.4 }]` |
| `frenzy1` | Battle Fervor | uncommon | `[{ stat: 'tapFrenzyBonus', value: 0.05 }]` |
| `frenzy2` | Relentless | rare | `[{ stat: 'tapFrenzyBonus', value: 0.05 }, { stat: 'attackSpeed', value: 0.2 }]` |

All generic (no `classRestriction`).

**Run:** `bun test`

**Commit:** `feat: add attack speed and frenzy upgrade cards`

---

### Task 4.2: Add Changelog Entry

**Files:**
- Modify: `src/lib/changelog.ts`

```typescript
{
	version: '0.28.0',
	date: '2026-01-31',
	changes: [
		{ category: 'new', description: 'Added attack speed stat with auto-attack on tap-and-hold' },
		{ category: 'new', description: 'Added tap frenzy system that temporarily boosts attack speed with rapid tapping' },
		{ category: 'new', description: 'Added 5 new upgrade cards to discover' },
		{ category: 'changed', description: 'Redesigned stat system to use a computed pipeline instead of direct mutation' },
		{ category: 'changed', description: 'Replaced interval-based game timing with a smooth frame-based game loop' },
		{ category: 'changed', description: 'Changed attack input from click to tap-and-hold with tap queuing' }
	]
}
```

**Commit:** `docs: add changelog entry for stat pipeline, game loop, and attack speed`

---

## Implementation Order

```
Phase 0: Stat Pipeline
├─ Task 0.1  Stat pipeline engine (types + computation + tests)
├─ Task 0.2  StatModifier type + Upgrade format change
├─ Task 0.3  Migrate all 50+ cards to modifiers[]
├─ Task 0.4  Stat pipeline store + wire into gameState
└─ Task 0.5  Stat pipeline integration tests

Phase 1: Timer Registry
└─ Task 1.1  Timer registry engine (types + tick + tests)

Phase 2: Attack Speed Helpers
├─ Task 2.1  Add new stats to PlayerStats
└─ Task 2.2  Attack speed helper functions + tests

Phase 3: rAF Store + Migration + Pointer Input
├─ Task 3.1  Game loop store (rAF + timer registry + frenzy)
├─ Task 3.2  Migrate gameState from timers to game loop
└─ Task 3.3  BattleArea pointer input + frenzy UI

Phase 4: Upgrade Cards + Changelog
├─ Task 4.1  Attack speed cards (modifiers format)
└─ Task 4.2  Changelog
```

**Total tasks: 12**

---

## Design Decisions

1. **Layered memoised stat pipeline.** Stats computed via monad pattern. Per-layer caching. Only dirty layers recompute. Frequent transient changes (frenzy, enemy auras) only touch the last layer.
2. **Named timer registry.** All gameplay timing goes through a single `Map<string, GameTimer>` ticked by the rAF loop. One-shot and repeating timers. Auto-pauses when game pauses. Plans 1-3 register their own timers by name.
3. **No `setTimeout`/`setInterval` for gameplay.** Only cosmetic effects (hit numbers, gold drops) use `setTimeout`.
4. **Cards as pure data.** `apply()` removed. Cards declare `modifiers[]`. Pipeline recomputes from acquired IDs.
5. **`onAcquire` for side effects.** Weapon unlocks, ability unlocks — one-time non-stat effects.
6. **Persistence saves inputs, not outputs.** Acquired IDs, class, enemy state. Computed stats derived on load. Migration-free.
7. **rAF with 200ms delta cap.** Prevents tab-switch burst.
8. **Frenzy as named timers + transient modifier.** Each stack is a timer. Stack count drives a transient multiplier on `attackSpeed` in the pipeline.
9. **`pointerleave` triggers pointerUp.** Prevents stuck auto-attack.
10. **Single queued tap.** `attackQueuedTap` is boolean, not counter.
11. **Backward compat.** Old saves' `unlockedUpgradeIds` feed directly into `statPipeline.setAcquiredUpgrades()`.
12. **Timer registry exposed.** `gameLoop.timers` is accessible so Plans 1-3 can register enemy/ability timers without modifying the game loop code.
