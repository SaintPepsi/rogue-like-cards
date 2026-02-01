# Plan 0: Stat Pipeline + Timer Registry + Game Loop + Attack Speed

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce three foundational systems — (1) a layered memoised stat pipeline that replaces direct stat mutation, (2) a named timer registry that replaces all `setTimeout`/`setInterval` for gameplay timing, (3) a `requestAnimationFrame` game loop with attack speed, pointer-held auto-attack, tap frenzy, and tap queuing. These systems underpin Plans 1-3.

**Architecture:** Bottom-up in five phases — (0) stat pipeline engine + store + card migration, (1) timer registry engine, (2) game loop engine with attack speed helpers, (3) rAF store + gameState migration + pointer input + UI, (4) upgrade cards + changelog.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript, vitest, Tailwind CSS.

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

## Testing Philosophy: Deterministic Game Loop Simulation

Because all gameplay timing flows through `timerRegistry.tick(deltaMs)`, tests can **deterministically simulate any amount of game time** without real timers, async waits, or flaky timing. This is the foundation for testing all game systems.

### Core pattern

```typescript
// Simulate exactly 100ms of game time
registry.tick(100);

// Simulate 2 seconds
registry.tick(2000);

// Simulate 5 seconds at ~60fps granularity
for (let i = 0; i < 300; i++) {
	registry.tick(16.67);
}
```

### What this enables

- **Unit tests** for individual systems (timers, stat pipeline, attack speed)
- **Integration tests** that simulate full game scenarios by ticking time forward:
  - Spawn enemy → tick through attacks → verify kill → verify gold/xp → verify next spawn
  - Apply poison → tick 5 seconds → verify 5 damage ticks applied
  - Start boss timer → tick 30s → verify boss flee triggers
  - Tap attack → tick cooldown → verify auto-attack fires when held
  - Apply frost aura debuff → verify attack speed halved → remove debuff → verify restored
- **Lifecycle tests** that simulate entire game sessions (e.g. clear 10 waves, verify progression)
- **Regression tests** for exploits (e.g. boss timer reset on reload)

### Testing rules

1. **Every engine file gets a companion `.test.ts`** — `statPipeline.test.ts`, `timerRegistry.test.ts`, `gameLoop.test.ts`
2. **Every store gets integration tests** — `statPipeline.test.ts` (store-level), `gameLoop.test.ts` (store-level)
3. **Game loop simulation tests use `tick()`** — never `setTimeout`, never `async/await` for timing
4. **Tests verify behaviour, not implementation** — assert outcomes (damage dealt, enemy killed, stat value) not internals (which layer is dirty)
5. **Bounded iteration in tests** — use `for` loops with explicit limits, never `while`

---

## Phase 0: Stat Pipeline

### Task 0.1: Define Stat Pipeline Types and Engine

**Files:**

- Create: `src/lib/engine/statPipeline.ts`
- Create: `src/lib/engine/statPipeline.test.ts`

**Step 1: Write failing tests**

Create `src/lib/engine/statPipeline.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import {
	add,
	multiply,
	clampMin,
	conditionalAdd,
	computeLayered,
	createLayer,
	dirtyLayer,
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
			createLayer([add(5)]), // 1 + 5 = 6
			createLayer([multiply(2)]), // 6 * 2 = 12
			createLayer([clampMin(0)]) // 12 (no change)
		];
		expect(computeLayered(1, layers)).toBe(12);
	});

	test('returns cached result when not dirty and input unchanged', () => {
		const layers: PipelineLayer[] = [createLayer([add(5)]), createLayer([multiply(2)])];

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
			createLayer([add(5)]), // Layer 0: permanent
			createLayer([add(0)]) // Layer 1: transient (will be modified)
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
		const layers: PipelineLayer[] = [createLayer([add(5)]), createLayer([multiply(2)])];

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
			createLayer([add(2), add(3), multiply(2)]) // (5 + 2 + 3) * 2 = 20
		];
		expect(computeLayered(5, layers)).toBe(20);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `bun run test:unit -- --run src/lib/engine/statPipeline.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement stat pipeline engine**

Create `src/lib/engine/statPipeline.ts`:

```typescript
// --- Step functions (monad units) ---

export type StatStep = (value: number) => number;

export const add =
	(n: number): StatStep =>
	(v) =>
		v + n;
export const multiply =
	(n: number): StatStep =>
	(v) =>
		v * n;
export const clampMin =
	(min: number): StatStep =>
	(v) =>
		Math.max(min, v);
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

Run: `bun run test:unit -- --run src/lib/engine/statPipeline.test.ts`
Expected: PASS

**Step 5: Commit**

`feat: add layered memoised stat pipeline engine`

---

### Task 0.2: Define Stat Modifier Type and Update Upgrade Format

**Files:**

- Modify: `src/lib/types.ts:3-7` (replace display-only `StatModifier` with pipeline `StatModifier`)
- Modify: `src/lib/types.ts:33-40` (update `Upgrade` type)

**Note:** The existing `StatModifier` at line 3 is `{ icon, label, value }` — a display-only type used by upgrade cards for rendering. This is being replaced by a pipeline-oriented `StatModifier` type. Display labels are now derived from `modifiers + statRegistry` (see Task 0.4).

**Step 1: Replace `StatModifier` type in `types.ts:3-7`**

Replace the existing `StatModifier`:

```typescript
export type StatModifier = {
	stat: keyof PlayerStats;
	value: number;
};
```

**Step 2: Update `Upgrade` type in `types.ts:33-40`**

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

- `stats: StatModifier[]` — display derived from `modifiers` + `statRegistry`
- `apply: (stats: PlayerStats) => void` — replaced by pipeline

**Step 3: Run type check**

Run: `bun run check`
Expected: FAIL — existing code references `stats`, `apply`, and old `StatModifier` shape. This is expected; Tasks 0.3–0.4 fix these.

**Step 4: Commit**

`feat: replace display StatModifier with pipeline StatModifier and update Upgrade type`

---

### Task 0.3: Migrate All Upgrade Cards to Modifier Format

**Files:**

- Modify: `src/lib/data/upgrades.ts:16-574` (replace `stats`/`apply` with `modifiers` on all 48 cards in `allUpgrades`)
- Modify: `src/lib/data/upgrades.ts:577-598` (update 2 shop-only cards)

This is a mechanical migration. Each card follows the same pattern: read what `apply()` does, convert to `modifiers: [{ stat, value }]`. The existing `apply` function body tells you exactly what modifiers to create.

**Step 1: Migrate damage, crit, XP cards (lines 18-117, 16 cards)**

Pattern for single-stat cards:

```typescript
// Before:
{ id: 'damage1', title: 'Sharpen Blade', rarity: 'common', image: swordImg,
  stats: [{ icon: '⚔️', label: 'Damage', value: '+1' }],
  apply: (s) => (s.damage += 1) },

// After:
{ id: 'damage1', title: 'Sharpen Blade', rarity: 'common', image: swordImg,
  modifiers: [{ stat: 'damage', value: 1 }] },
```

Pattern for multi-stat cards (e.g. `crit3` at line 68):

```typescript
// Before:
{ id: 'crit3', ..., apply: (s) => { s.critChance += 0.15; s.critMultiplier += 0.5; } }

// After:
{ id: 'crit3', ..., modifiers: [{ stat: 'critChance', value: 0.15 }, { stat: 'critMultiplier', value: 0.5 }] },
```

Apply this pattern to: `damage1-4`, `crit1-3`, `critdmg1-2`, `xp1-2`.

**Step 2: Migrate poison cards (lines 120-221, 12 cards)**

Apply to: `poison1-3`, `poisondur1-3`, `poisonstack1-3`, `poisoncrit1-3`.

**Step 3: Migrate combat mechanic cards (lines 224-283, 7 cards)**

Apply to: `multi1-3`, `overkill1`, `execute1-3`.

Boolean stats (overkill) use value `1` as truthy:

```typescript
{ id: 'overkill1', ..., modifiers: [{ stat: 'overkill', value: 1 }] },
```

**Step 4: Migrate utility cards (lines 286-461, 16 cards)**

Apply to: `timer1-2`, `greed1-2`, `chest1-3`, `bosschest1-2`, `lucky1-2`, `golddrop1-3`, `dmgmult1-2`.

**Step 5: Migrate combo/legendary cards (lines 464-573, 7 cards)**

Apply to: `combo1-3`, `legendary1-4`.

Multi-stat example:

```typescript
{ id: 'combo1', title: 'Berserker', rarity: 'epic', image: axeImg,
  modifiers: [
    { stat: 'damage', value: 8 },
    { stat: 'critChance', value: 0.1 }
  ] },
```

**Step 6: Update shop-only cards (lines 577-598)**

The shop-only cards (`executeCapUpgrade`, `goldPerKillUpgrade`) have no-op `apply()` functions. Convert them:

```typescript
export const executeCapUpgrade: Upgrade = {
	id: 'execute_cap',
	title: "Executioner's Pact",
	rarity: 'epic',
	image: pickaxeImg,
	modifiers: [] // Applied via executeCapBonus in gameState, not through normal stats
};

export const goldPerKillUpgrade: Upgrade = {
	id: 'gold_per_kill',
	title: "Prospector's Pick",
	rarity: 'uncommon',
	image: coinsImg,
	modifiers: [] // Applied via goldPerKillBonus in gameState, not through normal stats
};
```

**Step 7: Commit**

`refactor: migrate all upgrade cards from apply()/stats[] to modifiers[]`

---

### Task 0.4: Add Modifier Display Helper and Update Tests

**Files:**

- Modify: `src/lib/data/upgrades.ts` (add `getModifierDisplay` function after line ~600)
- Modify: `src/lib/data/upgrades.test.ts:1-145` (replace vitest mocks of old `stats` with validation of new `modifiers`)

**Step 1: Add display helper**

Add to `src/lib/data/upgrades.ts` (after the existing helper functions):

```typescript
import { statRegistry } from '$lib/engine/stats';
import type { StatModifier } from '$lib/types';

export function getModifierDisplay(mod: StatModifier): string {
	const entry = statRegistry.find((s) => s.key === mod.stat);
	if (!entry) return `${mod.stat} +${mod.value}`;
	return `${entry.label} ${entry.format(mod.value)}`;
}
```

**Step 2: Write validation tests**

Add to `src/lib/data/upgrades.test.ts` (replace or supplement existing tests):

```typescript
import { createDefaultStats } from '$lib/engine/stats';

describe('upgrade card modifiers', () => {
	test('every card has at least one modifier (except shop-only cards)', () => {
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

**Step 3: Run tests**

Run: `bun run test:unit -- --run src/lib/data/upgrades.test.ts`
Expected: Some tests may still fail if other code references `apply()` — those are fixed in Tasks 0.5–0.6.

**Step 4: Commit**

`feat: add modifier display helper and upgrade card validation tests`

---

### Task 0.5: Create Stat Pipeline Store

**Files:**

- Modify: `src/lib/engine/stats.ts:4-27` (add `BASE_STATS` constant after `createDefaultStats`)
- Create: `src/lib/stores/statPipeline.svelte.ts`

**Step 1: Add `BASE_STATS` to `stats.ts`**

Add after `createDefaultStats()` (after line 27):

```typescript
export const BASE_STATS: Readonly<PlayerStats> = Object.freeze(createDefaultStats());
```

**Step 2: Create stat pipeline store**

Create `src/lib/stores/statPipeline.svelte.ts`:

```typescript
import {
	computeLayered,
	createLayer,
	dirtyLayer,
	add,
	multiply,
	clampMin,
	type PipelineLayer,
	type StatStep
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
		// Clear and rebuild all stats for this layer
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
		get acquiredUpgradeIds() {
			return acquiredUpgradeIds;
		},
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

**Step 3: Run type check**

Run: `bun run check`
Expected: Type errors may still exist in gameState (wired in Task 0.6). The store file itself should be error-free.

**Step 4: Commit**

`feat: create stat pipeline store with layered memoised computation`

---

### Task 0.6: Wire Stat Pipeline into Game State

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:1-10` (add pipeline import)
- Modify: `src/lib/stores/gameState.svelte.ts:22-53` (add pipeline instance, replace mutable playerStats)
- Modify: `src/lib/stores/gameState.svelte.ts:207-251` (update `selectUpgrade`)
- Modify: `src/lib/stores/gameState.svelte.ts:269-289` (update `saveGame`)
- Modify: `src/lib/stores/gameState.svelte.ts:291-329` (update `loadGame`)
- Modify: `src/lib/stores/gameState.svelte.ts:327-329` (remove `applyPurchasedUpgrades`)
- Modify: `src/lib/stores/gameState.svelte.ts:331-371` (update `resetGame` and `init`)
- Modify: `src/lib/stores/gameState.svelte.ts:373-481` (update public return object stat getters)
- Modify: `src/lib/stores/shop.svelte.ts:68-78` (update `applyPurchasedUpgrades` to use pipeline)

**Step 1: Add pipeline import and instance**

In `gameState.svelte.ts`, add import:

```typescript
import { createStatPipeline } from './statPipeline.svelte';
```

Create pipeline instance alongside other sub-stores (after line 50):

```typescript
const statPipeline = createStatPipeline();
```

**Step 2: Update `selectUpgrade()` (lines 207-251)**

Replace `upgrade.apply(playerStats)` with pipeline call:

```typescript
function selectUpgrade(upgrade: Upgrade) {
	statPipeline.acquireUpgrade(upgrade.id);
	if (upgrade.onAcquire) upgrade.onAcquire();

	// Track unlocked upgrades for collection
	unlockedUpgrades = new Set([...unlockedUpgrades, upgrade.id]);

	// Track special effects — derive from modifiers + statRegistry instead of old stats[]
	if (upgrade.modifiers.length > 0) {
		const effectName = upgrade.title;
		if (!effects.find((e) => e.name === effectName)) {
			effects.push({
				name: effectName,
				description: upgrade.modifiers
					.map((m) => {
						const entry = statRegistry.find((s) => s.key === m.stat);
						return entry ? `${entry.label} ${entry.format(m.value)}` : `${m.stat} +${m.value}`;
					})
					.join(', ')
			});
		}
	}

	const allConsumed = leveling.closeActiveEvent();
	if (allConsumed) {
		timers.startPoisonTick(applyPoison);
		timers.resumeBossTimer(handleBossExpired);
	} else {
		leveling.openNextUpgrade();
	}
	saveGame();
}
```

Add import at top:

```typescript
import { statRegistry } from '$lib/engine/stats';
```

**Step 3: Replace all `playerStats.X` reads with `statPipeline.get('X')`**

Every place in gameState that reads a stat value (e.g. `playerStats.damage`, `playerStats.poison`, `playerStats.greed`) now reads `statPipeline.get('damage')`, etc. Key locations:

- `upgradeContext()` (line 55): `playerStats.luckyChance` → `statPipeline.get('luckyChance')`, etc.
- `attack()` (line 78): build a stats object from pipeline for `calculateAttack`
- `applyPoison()` (line 122): similarly for `calculatePoison`
- `killEnemy()` (line 147): `playerStats.goldDropChance`, `playerStats.goldMultiplier`, etc.
- `bossTimerMax` derived (line 53): `playerStats.bonusBossTime` → `statPipeline.get('bonusBossTime')`

For `calculateAttack` and `calculatePoison` which expect a `PlayerStats` object, create a helper:

```typescript
function getEffectiveStats(): PlayerStats {
	const stats = {} as PlayerStats;
	for (const key of Object.keys(BASE_STATS) as (keyof PlayerStats)[]) {
		(stats as any)[key] = statPipeline.get(key);
	}
	return stats;
}
```

**Step 4: Update persistence**

In `saveGame()`: save `statPipeline.acquiredUpgradeIds` (already saved as `unlockedUpgradeIds`). Computed stat values are NOT saved — they are derived on load.

In `loadGame()`: replace stat restoration with `statPipeline.setAcquiredUpgrades(data.unlockedUpgradeIds)`. Remove the `playerStats = { ...createDefaultStats(), ...data.playerStats }` line and the `executeThreshold` migration (pipeline computes from IDs).

**Step 5: Update `resetGame()` and `init()`**

`resetGame()`: Replace `playerStats = createDefaultStats()` and `applyPurchasedUpgrades()` with `statPipeline.reset()` then `statPipeline.setAcquiredUpgrades(shop.purchasedUpgrades)`.

`init()`: Replace `applyPurchasedUpgrades()` with `statPipeline.setAcquiredUpgrades(shop.purchasedUpgrades)`. On load, call `statPipeline.setAcquiredUpgrades(data.unlockedUpgradeIds)`.

**Step 6: Remove `applyPurchasedUpgrades()` (line 327-329)**

Delete this function — shop upgrades are loaded via pipeline.

**Step 7: Update public return object stat getters**

Replace `get playerStats()` with individual stat getters delegating to pipeline, or keep a compatibility getter:

```typescript
get playerStats() {
	return getEffectiveStats();
},
```

**Step 8: Update shop `applyPurchasedUpgrades`**

In `src/lib/stores/shop.svelte.ts:68-78`, the `applyPurchasedUpgrades` function calls `upgrade.apply(stats)`. Since `apply()` no longer exists, this function should be removed or changed to just return the set of purchased upgrade IDs (the pipeline handles application). Update gameState to use `statPipeline.setAcquiredUpgrades()` with purchased IDs instead.

**Step 9: Run tests**

Run: `bun run test:unit -- --run`
Expected: PASS — all stat reads go through pipeline, all upgrades applied via modifiers.

**Step 10: Commit**

`feat: wire stat pipeline into game state, replace mutable playerStats`

---

### Task 0.7: Stat Pipeline Integration Tests

**Files:**

- Create: `src/lib/stores/statPipeline.test.ts`

Test the store-level integration:

```typescript
import { describe, test, expect } from 'vitest';

// Note: statPipeline.svelte.ts uses $state runes, so tests may need
// vitest with svelte preprocessing. If direct import fails, test the
// engine functions directly and verify store wiring via e2e.

import {
	computeLayered,
	createLayer,
	add,
	multiply,
	clampMin,
	dirtyLayer,
	type PipelineLayer
} from '$lib/engine/statPipeline';
import { createDefaultStats } from '$lib/engine/stats';
import { allUpgrades } from '$lib/data/upgrades';
import type { StatModifier } from '$lib/types';

// Test pipeline computation with upgrade modifiers (mirrors what the store does)
describe('stat pipeline store logic', () => {
	function buildPermanentLayer(upgradeIds: string[]): StatModifier[] {
		const mods: StatModifier[] = [];
		for (const id of upgradeIds) {
			const card = allUpgrades.find((u) => u.id === id);
			if (card) mods.push(...card.modifiers);
		}
		return mods;
	}

	test('base stats match defaults before any upgrades', () => {
		const defaults = createDefaultStats();
		const layers: PipelineLayer[] = [
			createLayer([]), // base
			createLayer([]), // permanent
			createLayer([]), // class
			createLayer([]), // transient
			createLayer([clampMin(0)]) // clamp
		];
		expect(computeLayered(defaults.damage as number, layers)).toBe(1);
		expect(computeLayered(defaults.critChance as number, layers)).toBe(0);
	});

	test('acquiring upgrade adds to stat', () => {
		const defaults = createDefaultStats();
		const mods = buildPermanentLayer(['damage2']); // +3 damage
		const layers: PipelineLayer[] = [
			createLayer([]),
			createLayer(mods.filter((m) => m.stat === 'damage').map((m) => add(m.value))),
			createLayer([]),
			createLayer([]),
			createLayer([clampMin(0)])
		];
		expect(computeLayered(defaults.damage as number, layers)).toBe(4);
	});

	test('acquiring same upgrade twice stacks', () => {
		const defaults = createDefaultStats();
		const mods = buildPermanentLayer(['damage2', 'damage2']); // +3 +3
		const layers: PipelineLayer[] = [
			createLayer([]),
			createLayer(mods.filter((m) => m.stat === 'damage').map((m) => add(m.value))),
			createLayer([]),
			createLayer([]),
			createLayer([clampMin(0)])
		];
		expect(computeLayered(defaults.damage as number, layers)).toBe(7); // 1 + 3 + 3
	});

	test('transient modifiers affect stat and are removable', () => {
		const defaults = createDefaultStats();
		const transientMods: StatModifier[] = [{ stat: 'damage', value: 5 }];
		const layersWithTransient: PipelineLayer[] = [
			createLayer([]),
			createLayer([]),
			createLayer([]),
			createLayer(transientMods.map((m) => add(m.value))),
			createLayer([clampMin(0)])
		];
		const boosted = computeLayered(defaults.damage as number, layersWithTransient);

		const layersWithout: PipelineLayer[] = [
			createLayer([]),
			createLayer([]),
			createLayer([]),
			createLayer([]),
			createLayer([clampMin(0)])
		];
		const base = computeLayered(defaults.damage as number, layersWithout);

		expect(boosted).toBeGreaterThan(base);
		expect(boosted).toBe(6); // 1 + 5
		expect(base).toBe(1);
	});

	test('clamp layer prevents negative values', () => {
		const defaults = createDefaultStats();
		const layers: PipelineLayer[] = [
			createLayer([]),
			createLayer([]),
			createLayer([]),
			createLayer([add(-100)]), // Debuff that would make damage negative
			createLayer([clampMin(0)])
		];
		expect(computeLayered(defaults.damage as number, layers)).toBe(0);
	});

	test('multi-stat upgrade applies to multiple stats', () => {
		const defaults = createDefaultStats();
		const mods = buildPermanentLayer(['combo1']); // Berserker: +8 damage, +10% crit
		const damageMods = mods.filter((m) => m.stat === 'damage');
		const critMods = mods.filter((m) => m.stat === 'critChance');

		expect(damageMods.length).toBe(1);
		expect(critMods.length).toBe(1);

		const damageLayers: PipelineLayer[] = [
			createLayer([]),
			createLayer(damageMods.map((m) => add(m.value))),
			createLayer([]),
			createLayer([]),
			createLayer([clampMin(0)])
		];
		expect(computeLayered(defaults.damage as number, damageLayers)).toBe(9); // 1 + 8

		const critLayers: PipelineLayer[] = [
			createLayer([]),
			createLayer(critMods.map((m) => add(m.value))),
			createLayer([]),
			createLayer([]),
			createLayer([clampMin(0)])
		];
		expect(computeLayered(defaults.critChance as number, critLayers)).toBe(0.1); // 0 + 0.1
	});
});
```

**Run:** `bun run test:unit -- --run src/lib/stores/statPipeline.test.ts`

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
import { describe, test, expect } from 'vitest';
import { createTimerRegistry, type GameTimer } from '$lib/engine/timerRegistry';

describe('timer registry', () => {
	test('one-shot timer fires on expiry', () => {
		const registry = createTimerRegistry();
		let fired = false;
		registry.register('test', {
			remaining: 100,
			onExpire: () => {
				fired = true;
			}
		});
		registry.tick(100);
		expect(fired).toBe(true);
		expect(registry.has('test')).toBe(false); // auto-removed
	});

	test('one-shot timer does not fire before expiry', () => {
		const registry = createTimerRegistry();
		let fired = false;
		registry.register('test', {
			remaining: 100,
			onExpire: () => {
				fired = true;
			}
		});
		registry.tick(50);
		expect(fired).toBe(false);
		expect(registry.has('test')).toBe(true);
	});

	test('repeating timer fires and resets', () => {
		const registry = createTimerRegistry();
		let count = 0;
		registry.register('tick', {
			remaining: 1000,
			onExpire: () => {
				count++;
			},
			repeat: 1000
		});

		registry.tick(1000);
		expect(count).toBe(1);
		expect(registry.has('tick')).toBe(true); // still alive

		registry.tick(1000);
		expect(count).toBe(2);
	});

	test('repeating timer carries remainder', () => {
		const registry = createTimerRegistry();
		let count = 0;
		registry.register('tick', {
			remaining: 1000,
			onExpire: () => {
				count++;
			},
			repeat: 1000
		});

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
		registry.register('test', {
			remaining: 100,
			onExpire: () => {
				fired = true;
			}
		});
		registry.remove('test');
		registry.tick(200);
		expect(fired).toBe(false);
	});

	test('multiple timers tick independently', () => {
		const registry = createTimerRegistry();
		let a = 0,
			b = 0;
		registry.register('a', {
			remaining: 100,
			onExpire: () => {
				a++;
			}
		});
		registry.register('b', {
			remaining: 200,
			onExpire: () => {
				b++;
			}
		});

		registry.tick(150);
		expect(a).toBe(1);
		expect(b).toBe(0);

		registry.tick(100);
		expect(b).toBe(1);
	});

	test('registering same name replaces existing timer', () => {
		const registry = createTimerRegistry();
		let first = 0,
			second = 0;
		registry.register('test', {
			remaining: 100,
			onExpire: () => {
				first++;
			}
		});
		registry.register('test', {
			remaining: 200,
			onExpire: () => {
				second++;
			}
		});

		registry.tick(150);
		expect(first).toBe(0);
		expect(second).toBe(0);

		registry.tick(100);
		expect(second).toBe(1);
	});

	test('clear removes all timers', () => {
		const registry = createTimerRegistry();
		let fired = false;
		registry.register('a', {
			remaining: 100,
			onExpire: () => {
				fired = true;
			}
		});
		registry.register('b', {
			remaining: 100,
			onExpire: () => {
				fired = true;
			}
		});
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

Run: `bun run test:unit -- --run src/lib/engine/timerRegistry.test.ts`
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

Run: `bun run test:unit -- --run src/lib/engine/timerRegistry.test.ts`
Expected: PASS

**Step 5: Commit**

`feat: add named timer registry with one-shot and repeating timers`

---

### Task 1.2: Timer Registry Simulation Tests

**Files:**

- Modify: `src/lib/engine/timerRegistry.test.ts` (append new describe block)

Add tests that validate complex multi-timer game scenarios using only `tick()`:

```typescript
describe('game loop simulation', () => {
	test('simulate poison ticking for 5 seconds deals 5 ticks', () => {
		const registry = createTimerRegistry();
		let poisonTicks = 0;
		registry.register('poison_tick', {
			remaining: 1000,
			onExpire: () => {
				poisonTicks++;
			},
			repeat: 1000
		});

		// Simulate 5 seconds at ~60fps
		for (let frame = 0; frame < 300; frame++) {
			registry.tick(16.67);
		}

		expect(poisonTicks).toBe(5);
	});

	test('simulate boss timer expiring after 30 seconds', () => {
		const registry = createTimerRegistry();
		let bossExpired = false;
		let secondsLeft = 30;

		registry.register('boss_countdown', {
			remaining: 1000,
			repeat: 1000,
			onExpire: () => {
				secondsLeft--;
				if (secondsLeft <= 0) {
					registry.remove('boss_countdown');
					bossExpired = true;
				}
			}
		});

		// Tick 29 seconds — boss should still be alive
		registry.tick(29000);
		expect(bossExpired).toBe(false);
		expect(secondsLeft).toBe(1);

		// Tick final second
		registry.tick(1000);
		expect(bossExpired).toBe(true);
		expect(registry.has('boss_countdown')).toBe(false);
	});

	test('simulate attack cooldown cycle: fire → wait → fire', () => {
		const registry = createTimerRegistry();
		let attacks = 0;
		const attackInterval = 1250; // 0.8 attacks/sec

		function fireAttack() {
			attacks++;
			registry.register('attack_cooldown', {
				remaining: attackInterval,
				onExpire: () => {
					fireAttack();
				}
			});
		}

		// First attack
		fireAttack();
		expect(attacks).toBe(1);

		// Tick 1249ms — no second attack yet
		registry.tick(1249);
		expect(attacks).toBe(1);

		// Tick 1ms more — cooldown expires, second attack fires
		registry.tick(1);
		expect(attacks).toBe(2);

		// Tick full interval — third attack
		registry.tick(1250);
		expect(attacks).toBe(3);
	});

	test('simulate concurrent timers: attack + poison + boss all ticking', () => {
		const registry = createTimerRegistry();
		let attacks = 0;
		let poisonTicks = 0;
		let bossSeconds = 30;

		// Attack every 1250ms
		function fireAttack() {
			attacks++;
			registry.register('attack_cooldown', {
				remaining: 1250,
				onExpire: () => {
					fireAttack();
				}
			});
		}

		// Poison every 1000ms
		registry.register('poison_tick', {
			remaining: 1000,
			onExpire: () => {
				poisonTicks++;
			},
			repeat: 1000
		});

		// Boss countdown every 1000ms
		registry.register('boss_countdown', {
			remaining: 1000,
			repeat: 1000,
			onExpire: () => {
				bossSeconds--;
			}
		});

		fireAttack();

		// Simulate 5 seconds
		registry.tick(5000);

		expect(attacks).toBe(5); // 1 initial + 4 from cooldowns (at 1250, 2500, 3750, 5000)
		expect(poisonTicks).toBe(5); // at 1000, 2000, 3000, 4000, 5000
		expect(bossSeconds).toBe(25); // 30 - 5
	});

	test('simulate pausing: timers do not advance when not ticked', () => {
		const registry = createTimerRegistry();
		let fired = false;
		registry.register('test', {
			remaining: 100,
			onExpire: () => {
				fired = true;
			}
		});

		// "Pause" by simply not calling tick for a while
		// Then resume by ticking
		registry.tick(50);
		expect(fired).toBe(false);

		// No tick calls = paused
		// Resume
		registry.tick(50);
		expect(fired).toBe(true);
	});
});
```

**Run:** `bun run test:unit -- --run src/lib/engine/timerRegistry.test.ts`

**Commit:** `test: add game loop simulation tests for timer registry`

---

## Phase 2: Attack Speed Helpers

### Task 2.1: Add New Stats to PlayerStats

**Files:**

- Modify: `src/lib/types.ts:30` (add 3 fields after `goldPerKill`)
- Modify: `src/lib/engine/stats.ts:25` (add defaults after `goldPerKill: 0`)
- Modify: `src/lib/engine/stats.ts:45-66` (add statRegistry entries)

**Step 1: Add fields to `PlayerStats` in `types.ts:30`**

Add after the `goldPerKill: number;` line:

```typescript
attackSpeed: number;
tapFrenzyBonus: number;
tapFrenzyDuration: number;
```

**Step 2: Add defaults in `createDefaultStats()` in `stats.ts:25`**

Add after `goldPerKill: 0`:

```typescript
attackSpeed: 0.8,
tapFrenzyBonus: 0.05,
tapFrenzyDuration: 3
```

`BASE_STATS` derives from `createDefaultStats()` so it updates automatically.

**Step 3: Add statRegistry entries in `stats.ts:65`**

Add after the `greed` entry (line 65):

```typescript
{ key: 'attackSpeed', icon: '🗡️', label: 'Attack Speed', format: (v) => `${(v as number).toFixed(1)}/s`, alwaysShow: true },
{ key: 'tapFrenzyBonus', icon: '🔥', label: 'Frenzy Bonus', format: plusPct },
```

Do NOT add `tapFrenzyDuration` — internal, not player-facing.

**Step 4: Run tests**

Run: `bun run test:unit -- --run`
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
import { describe, test, expect } from 'vitest';
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

Run: `bun run test:unit -- --run src/lib/engine/gameLoop.test.ts`
Expected: FAIL — module not found.

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

Run: `bun run test:unit -- --run src/lib/engine/gameLoop.test.ts`
Expected: PASS

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
import { getEffectiveAttackSpeed, getAttackIntervalMs } from '$lib/engine/gameLoop';
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
		get timers() {
			return timers;
		},

		get frenzyStacks() {
			return frenzyCount;
		},
		get paused() {
			return paused;
		},
		get pointerHeld() {
			return pointerHeld;
		},

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

**Step 2: Run type check**

Run: `bun run check`
Expected: PASS (new file, no callers yet).

**Step 3: Commit**

`feat: create game loop store with rAF, timer registry, frenzy stacks, and pointer input`

---

### Task 3.2: Replace gameState Timer Imports and Calls

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:3` (replace timers import)
- Modify: `src/lib/stores/gameState.svelte.ts:41` (replace timers instance)
- Modify: `src/lib/stores/gameState.svelte.ts:184` (boss kill → `stopBossTimer`)
- Modify: `src/lib/stores/gameState.svelte.ts:195` (boss spawn → `startBossTimer`)
- Modify: `src/lib/stores/gameState.svelte.ts:241-245` (selectUpgrade timer resume → `gameLoop.resume()`)
- Modify: `src/lib/stores/gameState.svelte.ts:253-258` (openNextUpgrade timer pause → `gameLoop.pause()`)
- Modify: `src/lib/stores/gameState.svelte.ts:332` (resetGame `timers.stopAll()` → `gameLoop.reset()`)
- Modify: `src/lib/stores/gameState.svelte.ts:402-403` (bossTimer getter)

**Step 1: Replace import and instance**

```typescript
// OLD (line 3)
import { createTimers } from './timers.svelte';
// NEW
import { createGameLoop } from './gameLoop.svelte';

// OLD (line 41)
const timers = createTimers();
// NEW
const gameLoop = createGameLoop();
```

**Step 2: Replace all `timers.xxx` calls**

| Location                             | Old                                                                               | New                                          |
| ------------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------- |
| `selectUpgrade()` line ~244          | `timers.startPoisonTick(applyPoison); timers.resumeBossTimer(handleBossExpired);` | `gameLoop.resume();`                         |
| `openNextUpgrade()` line ~256        | `timers.stopPoisonTick(); timers.pauseBossTimer();`                               | `gameLoop.pause();`                          |
| `killEnemy()` line ~184 (boss dies)  | `timers.stopBossTimer();`                                                         | `gameLoop.stopBossTimer();`                  |
| `killEnemy()` line ~195 (spawn boss) | `timers.startBossTimer(bossTimerMax, handleBossExpired);`                         | `gameLoop.startBossTimer(bossTimerMax);`     |
| `resetGame()` line ~332              | `timers.stopAll();`                                                               | `gameLoop.reset();`                          |
| `resetGame()` line ~349              | `timers.startPoisonTick(applyPoison);`                                            | (removed — game loop `start()` handles this) |

**Step 3: Update bossTimer getter in return object**

```typescript
// OLD (line ~402)
get bossTimer() { return timers.bossTimer; },
// NEW — boss timer is now inside the timer registry, need to derive from getRemaining
get bossTimer() {
	return Math.ceil(gameLoop.timers.getRemaining('boss_countdown') / 1000);
},
```

**Step 4: Run type check**

Run: `bun run check`
Expected: Errors about deleted `timers.svelte.ts` (resolved in Task 3.3) and missing `gameLoop.start()` call (added in Task 3.3).

**Step 5: Commit**

`refactor: replace timer calls with game loop in gameState`

---

### Task 3.3: Update init, Persistence, and Delete Old Timers

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:357-371` (update `init()`)
- Modify: `src/lib/stores/gameState.svelte.ts:269-289` (update `saveGame()` with `bossTimeRemaining`)
- Modify: `src/lib/stores/persistence.svelte.ts:9-27` (add `bossTimeRemaining` to `SessionSaveData`)
- Modify: `src/lib/stores/gameState.svelte.ts:470-481` (add pointer controls + frenzy to public API)
- Delete: `src/lib/stores/timers.svelte.ts`

**BUG FIX: Boss timer reset exploit.** Reloading during a boss fight restarts the timer at full duration. Fix: persist remaining boss time.

**Step 1: Add `bossTimeRemaining` to `SessionSaveData` (persistence.svelte.ts:26)**

Add after `timestamp: number;` (line 26):

```typescript
bossTimeRemaining?: number;
```

**Step 2: Update `init()` in gameState**

```typescript
function init() {
	shop.load();
	const loaded = loadGame();
	if (!loaded) {
		statPipeline.setAcquiredUpgrades(shop.purchasedUpgrades);
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
					'frenzy',
					'attackSpeed',
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

Add import at top:

```typescript
import { multiply } from '$lib/engine/statPipeline';
```

**Step 3: Save boss time remaining in `saveGame()`**

Add to the `saveSession()` call:

```typescript
bossTimeRemaining: gameLoop.timers.has('boss_countdown')
	? Math.ceil(gameLoop.timers.getRemaining('boss_countdown') / 1000)
	: undefined;
```

**Step 4: Remove `attack` from public return, add pointer controls**

Remove `attack` from the actions section. Add:

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

Add import:

```typescript
import { getEffectiveAttackSpeed } from '$lib/engine/gameLoop';
```

**Step 5: Delete `src/lib/stores/timers.svelte.ts`**

**Step 6: Run tests**

Run: `bun run test:unit -- --run`
Fix any references to deleted `timers` or removed `attack()` public API.

**Step 7: Commit**

`refactor: complete game loop migration, persist boss timer, delete old timers`

---

### Task 3.4: Update BattleArea for Pointer Input

**Files:**

- Modify: `src/lib/components/BattleArea.svelte:9-21` (update Props type)
- Modify: `src/lib/components/BattleArea.svelte:23-35` (update destructured props)
- Modify: `src/lib/components/BattleArea.svelte:40-48` (replace event handlers)
- Modify: `src/lib/components/BattleArea.svelte:64` (update hint text)
- Modify: `src/lib/components/BattleArea.svelte:78-269` (add frenzy indicator + CSS)
- Modify: `src/routes/+page.svelte:157-169` (update BattleArea props)

**Step 1: Change BattleArea Props (lines 9-21)**

Replace `onAttack: () => void` with pointer handlers and frenzy data:

```typescript
type Props = {
	isBoss: boolean;
	isChest: boolean;
	isBossChest: boolean;
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

**Step 2: Update destructured props (lines 23-35)**

Replace `onAttack` with `onPointerDown`, `onPointerUp`, `frenzyStacks`, `effectiveAttackSpeed`.

**Step 3: Replace event handlers on `.enemy` div (lines 40-48)**

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

**Step 4: Add `touch-action: none` to `.enemy` CSS**

```css
.enemy {
	/* ...existing... */
	touch-action: none;
}
```

**Step 5: Update hint text (line 64)**

```svelte
<p class="hint">Tap or hold to attack!</p>
```

**Step 6: Add frenzy stack indicator**

Add after the hint text:

```svelte
{#if frenzyStacks > 0}
	<div class="frenzy-indicator">
		<span class="frenzy-icon">🔥</span>
		<span class="frenzy-count">{frenzyStacks}</span>
		<span class="frenzy-speed">{effectiveAttackSpeed.toFixed(1)}/s</span>
	</div>
{/if}
```

Style with pulse animation:

```css
.frenzy-indicator {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	font-size: 0.85rem;
	color: #f59e0b;
	animation: frenzy-pulse 0.3s ease-in-out;
}

@keyframes frenzy-pulse {
	0% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.15);
	}
	100% {
		transform: scale(1);
	}
}
```

**Step 7: Update `+page.svelte` (lines 157-169)**

Replace `onAttack={gameState.attack}` with:

```svelte
<BattleArea
	isBoss={gameState.isBoss}
	isChest={gameState.isChest}
	isBossChest={gameState.isBossChest}
	enemyHealth={gameState.enemyHealth}
	enemyMaxHealth={gameState.enemyMaxHealth}
	enemiesKilled={gameState.enemiesKilled}
	gold={gameState.gold}
	goldDrops={gameState.goldDrops}
	hits={gameState.hits}
	poisonStacks={gameState.poisonStacks.length}
	onPointerDown={() => gameState.pointerDown()}
	onPointerUp={() => gameState.pointerUp()}
	frenzyStacks={gameState.frenzyStacks}
	effectiveAttackSpeed={gameState.effectiveAttackSpeed}
/>
```

**Step 8: Manual test**

Run: `bun run dev`
Verify: tap, hold, release, frenzy decay, queued tap, boss timer, poison ticks, upgrade pause/resume, boss timer persistence on reload.

**Step 9: Commit**

`feat: replace onclick with pointer input for tap-and-hold attacks`

---

### Task 3.5: Game Loop Integration Tests

**Files:**

- Create: `src/lib/stores/gameLoop.test.ts`

These tests simulate full game scenarios by wiring together the timer registry, stat pipeline, and game loop logic — all driven by `tick()`. No rAF, no DOM, no async.

```typescript
import { describe, test, expect } from 'vitest';
import { createTimerRegistry } from '$lib/engine/timerRegistry';
import { getEffectiveAttackSpeed, getAttackIntervalMs } from '$lib/engine/gameLoop';

describe('game loop integration', () => {
	test('simulate full encounter: attack until enemy dies', () => {
		const registry = createTimerRegistry();
		const playerDamage = 3;
		let enemyHp = 10;
		let enemyKilled = false;
		let totalAttacks = 0;

		function fireAttack() {
			if (enemyKilled) return;
			totalAttacks++;
			enemyHp -= playerDamage;
			if (enemyHp <= 0) {
				enemyKilled = true;
				registry.remove('attack_cooldown');
				return;
			}
			registry.register('attack_cooldown', {
				remaining: 1250,
				onExpire: () => fireAttack()
			});
		}

		fireAttack(); // First attack: 10 - 3 = 7

		// Tick until enemy dies (should take 4 attacks: 10/3 = 3.33, rounds up to 4)
		for (let frame = 0; frame < 600; frame++) {
			if (enemyKilled) break;
			registry.tick(16.67);
		}

		expect(enemyKilled).toBe(true);
		expect(totalAttacks).toBe(4); // 3, 6, 9, 12 (overkill)
	});

	test('simulate poison damage over time alongside attacks', () => {
		const registry = createTimerRegistry();
		let totalDamageFromAttacks = 0;
		let totalDamageFromPoison = 0;
		const attackDamage = 5;
		const poisonDamage = 2;

		// Attack every 1250ms
		function fireAttack() {
			totalDamageFromAttacks += attackDamage;
			registry.register('attack_cooldown', {
				remaining: 1250,
				onExpire: () => fireAttack()
			});
		}

		// Poison every 1000ms
		registry.register('poison_tick', {
			remaining: 1000,
			onExpire: () => {
				totalDamageFromPoison += poisonDamage;
			},
			repeat: 1000
		});

		fireAttack();

		// Simulate exactly 5 seconds
		registry.tick(5000);

		// Attacks: initial + at 1250, 2500, 3750, 5000 = 5 total
		expect(totalDamageFromAttacks).toBe(25);
		// Poison: at 1000, 2000, 3000, 4000, 5000 = 5 ticks
		expect(totalDamageFromPoison).toBe(10);
	});

	test('simulate frenzy stacks decaying over time', () => {
		const registry = createTimerRegistry();
		let frenzyCount = 0;
		const frenzyDuration = 3000; // 3 seconds

		function addFrenzyStack() {
			frenzyCount++;
			const name = `frenzy_${frenzyCount}`;
			registry.register(name, {
				remaining: frenzyDuration,
				onExpire: () => {
					frenzyCount--;
				}
			});
		}

		// Add 3 stacks at t=0
		addFrenzyStack();
		addFrenzyStack();
		addFrenzyStack();
		expect(frenzyCount).toBe(3);

		// Tick 3 seconds — all 3 stacks expire (all added at same time)
		registry.tick(3000);
		expect(frenzyCount).toBe(0);
	});

	test('simulate frenzy stacks added at different times decay independently', () => {
		const registry = createTimerRegistry();
		let frenzyCount = 0;
		let frenzyId = 0;
		const frenzyDuration = 3000;

		function addFrenzyStack() {
			frenzyId++;
			frenzyCount++;
			const name = `frenzy_${frenzyId}`;
			registry.register(name, {
				remaining: frenzyDuration,
				onExpire: () => {
					frenzyCount--;
				}
			});
		}

		// Stack 1 at t=0
		addFrenzyStack();
		registry.tick(1000); // t=1000

		// Stack 2 at t=1000
		addFrenzyStack();
		registry.tick(1000); // t=2000

		// Stack 3 at t=2000
		addFrenzyStack();
		expect(frenzyCount).toBe(3);

		// t=3000: stack 1 expires (added at 0, duration 3000)
		registry.tick(1000);
		expect(frenzyCount).toBe(2);

		// t=4000: stack 2 expires
		registry.tick(1000);
		expect(frenzyCount).toBe(1);

		// t=5000: stack 3 expires
		registry.tick(1000);
		expect(frenzyCount).toBe(0);
	});

	test('simulate tap queuing: tap during cooldown fires when ready', () => {
		const registry = createTimerRegistry();
		let attacks = 0;
		let queuedTap = false;

		function fireAttack() {
			attacks++;
			queuedTap = false;
			registry.register('attack_cooldown', {
				remaining: 1250,
				onExpire: () => {
					if (queuedTap) {
						fireAttack();
					}
				}
			});
		}

		// First attack
		fireAttack();
		expect(attacks).toBe(1);

		// Tap during cooldown (queues)
		queuedTap = true;

		// Tick past cooldown
		registry.tick(1250);
		expect(attacks).toBe(2); // Queued tap fired

		// No queue this time — cooldown expires without firing
		registry.tick(1250);
		expect(attacks).toBe(2); // No attack since no queue and no hold
	});

	test('simulate attack speed changing mid-combat via frenzy', () => {
		const baseSpeed = 0.8;
		const frenzyBonus = 0.05;

		// 0 stacks: 0.8/s = 1250ms
		expect(getAttackIntervalMs(getEffectiveAttackSpeed(baseSpeed, 0, frenzyBonus))).toBe(1250);

		// 5 stacks: 0.8 * (1 + 5*0.05) = 1.0/s = 1000ms
		expect(getAttackIntervalMs(getEffectiveAttackSpeed(baseSpeed, 5, frenzyBonus))).toBe(1000);

		// 10 stacks: 0.8 * (1 + 10*0.05) = 1.2/s ≈ 833ms
		expect(getAttackIntervalMs(getEffectiveAttackSpeed(baseSpeed, 10, frenzyBonus))).toBeCloseTo(
			833.33,
			0
		);
	});

	test('simulate boss timer with reload persistence', () => {
		const registry = createTimerRegistry();
		let bossSeconds = 30;
		let bossExpired = false;

		registry.register('boss_countdown', {
			remaining: 1000,
			repeat: 1000,
			onExpire: () => {
				bossSeconds--;
				if (bossSeconds <= 0) {
					registry.remove('boss_countdown');
					bossExpired = true;
				}
			}
		});

		// Simulate 20 seconds of boss fight
		registry.tick(20000);
		expect(bossSeconds).toBe(10);

		// "Save" remaining time
		const savedRemaining = bossSeconds;

		// "Reload" — create fresh registry with saved time
		const registry2 = createTimerRegistry();
		let bossSeconds2 = savedRemaining;
		let bossExpired2 = false;

		registry2.register('boss_countdown', {
			remaining: 1000,
			repeat: 1000,
			onExpire: () => {
				bossSeconds2--;
				if (bossSeconds2 <= 0) {
					registry2.remove('boss_countdown');
					bossExpired2 = true;
				}
			}
		});

		// Simulate remaining 10 seconds
		registry2.tick(10000);
		expect(bossExpired2).toBe(true);
		expect(bossSeconds2).toBe(0);
	});
});
```

**Run:** `bun run test:unit -- --run src/lib/stores/gameLoop.test.ts`
Expected: PASS

**Commit:** `test: add game loop integration tests simulating full game scenarios`

---

## Phase 4: Upgrade Cards + Changelog

### Task 4.1: Add Attack Speed Upgrade Cards

**Files:**

- Modify: `src/lib/data/upgrades.ts:574` (add new cards to `allUpgrades` array before closing bracket)

Add cards using the new `modifiers` format:

| ID        | Title          | Rarity   | Modifiers                                                                        |
| --------- | -------------- | -------- | -------------------------------------------------------------------------------- |
| `atkspd1` | Swift Strikes  | common   | `[{ stat: 'attackSpeed', value: 0.1 }]`                                          |
| `atkspd2` | Rapid Assault  | uncommon | `[{ stat: 'attackSpeed', value: 0.2 }]`                                          |
| `atkspd3` | Blinding Speed | rare     | `[{ stat: 'attackSpeed', value: 0.4 }]`                                          |
| `frenzy1` | Battle Fervor  | uncommon | `[{ stat: 'tapFrenzyBonus', value: 0.05 }]`                                      |
| `frenzy2` | Relentless     | rare     | `[{ stat: 'tapFrenzyBonus', value: 0.05 }, { stat: 'attackSpeed', value: 0.2 }]` |

All generic (no `classRestriction`). Use `swordImg` for attack speed, `fireImg` for frenzy.

**Run:** `bun run test:unit -- --run`

**Commit:** `feat: add attack speed and frenzy upgrade cards`

---

### Task 4.2: Add Changelog Entry

**Files:**

- Modify: `src/lib/changelog.ts:16` (add new entry before the existing `0.28.0` entry)

```typescript
{
	version: '0.30.0',
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
├─ Task 0.3  Migrate all 48 cards to modifiers[]
├─ Task 0.4  Modifier display helper + validation tests
├─ Task 0.5  BASE_STATS + stat pipeline store (new file)
├─ Task 0.6  Wire pipeline into gameState + persistence + components
└─ Task 0.7  Stat pipeline integration tests

Phase 1: Timer Registry
├─ Task 1.1  Timer registry engine (types + tick + tests)
└─ Task 1.2  Timer registry simulation tests (game scenarios via tick())

Phase 2: Attack Speed Helpers
├─ Task 2.1  Add new stats to PlayerStats
└─ Task 2.2  Attack speed helper functions + tests

Phase 3: rAF Store + Migration + Pointer Input
├─ Task 3.1  Game loop store (rAF + timer registry + frenzy)
├─ Task 3.2  Replace gameState timer imports and calls
├─ Task 3.3  Update init, persistence, delete old timers
├─ Task 3.4  BattleArea pointer input + frenzy UI
└─ Task 3.5  Game loop integration tests (full game scenario simulation)

Phase 4: Upgrade Cards + Changelog
├─ Task 4.1  Attack speed cards (modifiers format)
└─ Task 4.2  Changelog
```

**Total tasks: 17**

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
13. **StatModifier type replaced.** The old display-only `StatModifier` (`{ icon, label, value }`) is replaced by a pipeline `StatModifier` (`{ stat, value }`). Display is derived from `modifiers + statRegistry`.
