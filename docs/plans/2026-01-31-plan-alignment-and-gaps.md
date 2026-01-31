# Plan Alignment: Gaps, Decisions, and New Systems

> **Context:** Plans 0-3 were written in reverse dependency order. Plan 0 (game loop + attack speed) introduces foundational changes that break assumptions in Plans 1-3. This document catalogues every conflict, records the decisions made during brainstorming, and specifies two new systems that Plan 0 must introduce before Plans 1-3 can proceed.

---

## New System 1: Layered Stat Pipeline (Memoised Monad)

### Problem

The current codebase mutates `playerStats` directly via `apply()` functions on upgrade cards:

```typescript
apply: (s) => { s.damage += 3 }
```

This creates issues:
- **Temporary effects need manual reversal** (e.g., Blinking Eyes darkness drains a stat, must restore on death)
- **Save migration is fragile** — persisted stat values bake in old formulas
- **Fast-changing modifiers** (frenzy stacks at 60fps) require mutation + reversal cycles
- **No single source of truth** — a stat's current value is the result of many mutations scattered across the codebase

### Design

Stats are never mutated. All effective values are computed by piping a base value through a chain of step functions (monad pattern).

**Step functions:**

```typescript
type StatStep = (value: number) => number;

// Flat additive (upgrade card: +3 damage)
const add = (n: number): StatStep => (v) => v + n;

// Multiplicative (frenzy: 1 + stacks * bonus)
const multiply = (n: number): StatStep => (v) => v * n;

// Conditional (rogue finisher: +execute if poison > 5)
const conditionalAdd = (n: number, condition: boolean): StatStep =>
  condition ? (v) => v + n : (v) => v;

// Floor (never below 0)
const clampMin = (min: number): StatStep => (v) => Math.max(min, v);
```

**Layered pipeline with per-layer memoisation:**

Each stat has a pipeline split into layers. Each layer is independently cached. Only dirty layers recompute.

```
Layer 0: Base        -> class base value (changes once at class selection)
Layer 1: Permanent   -> acquired upgrades + shop purchases (changes on card pick)
Layer 2: Class       -> class-specific bonuses (changes once at level 30)
Layer 3: Transient   -> enemy effects, frenzy, buffs/debuffs (changes during combat)
Layer 4: Clamp       -> floor at 0 (pure passthrough, never dirty)
```

```typescript
type PipelineLayer = {
  steps: StatStep[];
  cachedResult: number;
  cachedInput: number;
  dirty: boolean;
};

function computeLayered(stat: keyof PlayerStats, layers: PipelineLayer[]): number {
  let value = BASE_STATS[stat];

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

**Dirty propagation:** Dirtying a layer implicitly dirties all subsequent layers (their input changed). In practice:
- Layer 1 (permanent) changes during paused modals — infrequent
- Layer 3 (transient) changes during combat — frequent but only recomputes the last layer
- At 60fps, most frames hit cache on all layers

**Dirty triggers:**

| Event | Layer dirtied |
|---|---|
| Upgrade acquired | Layer 1 (permanent) |
| Class selected | Layer 0 (base) + Layer 2 (class) |
| Enemy spawns with aura/debuff | Layer 3 (transient) |
| Enemy dies (clear transients) | Layer 3 (transient) |
| Frenzy stack added/removed | Layer 3 (transient) |
| Darkness stack added/removed | Layer 3 (transient) |
| Spore debuff applied/expired | Layer 3 (transient) |
| Game loaded from save | All layers (`dirtyAll()`) |

### Card Migration

The `apply()` function is removed from all cards. Cards become pure data:

```typescript
// Old
{
  id: 'damage2',
  title: 'Heavy Strike',
  stats: [{ label: 'Damage', value: '+3' }],
  apply: (s) => { s.damage += 3 }
}

// New
{
  id: 'damage2',
  title: 'Heavy Strike',
  modifiers: [{ stat: 'damage', value: 3 }]
}
```

Display labels are derived from `statRegistry` + modifier data. The `stats` display array is removed (redundant with `modifiers`).

When an upgrade is acquired, its ID is added to `acquiredUpgradeIds`. The pipeline rebuilds Layer 1 from the full list of acquired IDs, counting duplicates naturally (same card picked 3 times = 3 additive steps).

### Persistence

**Saved:** acquired upgrade IDs, class choice, enemy state, transient effect sources.

**Not saved:** computed stat values. On load, all layers rebuild from saved inputs.

This makes save migration free — change a formula, old saves recompute correctly.

### What This Replaces

- `playerStats` as a mutable object
- `apply()` on every upgrade card
- `applyClassBonuses()` that mutates stats
- `applyPurchasedUpgrades()` that mutates stats
- Manual stat restoration (darkness debuff reversal, spore debuff reversal)
- `gameLoop.syncStats()` — the game loop reads `getEffectiveStat()` directly

---

## New System 2: Named Timer Registry

### Problem

Plan 0 hardcodes three accumulators in `tickFrame`: `attackCooldown`, `poisonTick`, `bossTimer`. Plans 1-3 add 10+ independent timers (dodge charge, spore cycle, element expiry, cloud cooldown, etc.). Hardcoding each as a named field doesn't scale.

The alternative — using `setTimeout`/`setInterval` — breaks pause behaviour. All gameplay timers must respect the game loop's pause state.

### Design

A named timer map managed by the game loop. The engine ticks all active timers by `deltaMs` each frame.

```typescript
type GameTimer = {
  remaining: number;      // ms remaining until expiry
  onExpire: () => void;   // fires when remaining <= 0
  repeat?: number;        // if set, auto-resets to this value on expiry (for intervals)
};

type TimerRegistry = Map<string, GameTimer>;
```

**Engine integration in `tickFrame`:**

```typescript
function tickTimers(deltaMs: number, timers: TimerRegistry): void {
  for (const [name, timer] of timers) {
    timer.remaining -= deltaMs;
    if (timer.remaining <= 0) {
      timer.onExpire();
      if (timer.repeat != null) {
        timer.remaining += timer.repeat; // carry remainder for accuracy
      } else {
        timers.delete(name);
      }
    }
  }
}
```

**API on the game loop store:**

```typescript
registerTimer(name: string, durationMs: number, onExpire: () => void, repeat?: number): void
removeTimer(name: string): void
hasTimer(name: string): boolean
```

**When paused, `tickTimers` is not called** — all timers freeze automatically.

### Timer Usage Across Plans

| Timer name | Plan | Type | Duration | Purpose |
|---|---|---|---|---|
| `attack_cooldown` | 0 | one-shot, re-registered per attack | `1000 / effectiveAttackSpeed` | Attack rate limiting |
| `poison_tick` | 0 | repeating | 1000ms (modified by frost aura via stat pipeline) | Poison damage ticks |
| `boss_countdown` | 0 | repeating 1000ms | Until `bossTimeRemaining <= 0` | Boss timer seconds |
| `frenzy_{id}` | 0 | one-shot | `tapFrenzyDuration * 1000` | Individual frenzy stack expiry |
| `goblin_dodge` | 1 | repeating | 4000ms (reducible) | Goblin dodge charge cycle |
| `spore_cloud` | 1 | repeating | 5000ms | Red Mushroom spore release |
| `spore_debuff_{id}` | 1 | one-shot | 3000ms | Individual spore stack expiry |
| `darkness_check` | 1 | repeating | 1000ms | Blinking Eyes idle detection |
| `element_frost` | 3 | one-shot | 5000ms | Frost element expiry |
| `element_fire` | 3 | one-shot | 5000ms | Fire element expiry |
| `element_arcane` | 3 | one-shot | 5000ms | Arcane element expiry |
| `burn_dot` | 3 | repeating | 1000ms | Fire burn DoT ticks |
| `poison_cloud_tick` | 3 | repeating | 1000ms | Rogue cloud stacking |
| `poison_cloud_expire` | 3 | one-shot | 5000ms | End cloud effect |
| `poison_cloud_cooldown` | 3 | one-shot | 10000ms (reducible) | Cloud ability available again |

### What This Replaces

- Hardcoded `attackCooldown`, `poisonTick`, `bossTimer` accumulators in `LoopAccumulators`
- All `setTimeout`/`setInterval` calls for gameplay timing
- Frenzy stack timestamp-based expiry (becomes named timers)
- Warrior swing cooldown `setTimeout` (removed entirely — handled by attack speed stat)
- Mage element `setTimeout` expiry (becomes named timers)
- Rogue Poison Cloud `setInterval` + `setTimeout` (becomes named timers)

---

## Plan 1 (Enemy System) — Conflicts and Resolutions

### Task 2.3: Goblin Nimble (Dodge)

**Conflict:** Uses standalone `setInterval` for dodge timer. Doesn't pause during modals.

**Resolution:** Use timer registry. Register `goblin_dodge` as a repeating timer (4000ms) on Goblin spawn. Remove on enemy death. Dodge charge is automatically pause-aware.

### Task 2.4: Red Mushroom Spore Cloud

**Conflict:** Uses standalone `setInterval` for spore cycle and `setTimeout` for debuff expiry.

**Resolution:** Use timer registry. Register `spore_cloud` repeating timer (5000ms) on Red Mushroom spawn. Each tick registers a `spore_debuff_{id}` one-shot timer (3000ms) for the debuff stack. Spore debuffs become transient modifiers in the stat pipeline (Layer 3) — no manual stat mutation or reversal needed.

### Task 2.5: Blue Mushroom Frost Aura

**Conflict:** Modifies `src/lib/stores/timers.svelte.ts` which is deleted by Plan 0.

**Resolution:** Frost Aura becomes a transient modifier in the stat pipeline. On Blue Mushroom spawn, add a transient step to `attackSpeed` (multiply by 0.5) and to `poisonTickInterval` (multiply by 2). On death, remove the transient — pipeline recomputes automatically. No timer file needed, no interval modification.

Note: `poisonTickInterval` needs to become a computed stat that the `poison_tick` timer reads each frame, rather than a hardcoded `1000ms`. When the stat changes (frost aura applied/removed), the `poison_tick` timer's repeat interval updates to match.

### Task 2.6: Blinking Eyes Creeping Darkness

**Conflict:** Tracks `lastTapTime` with a "check interval" and uses `setTimeout`. Also, Plan 0's auto-attack system makes "idle" ambiguous — does holding the pointer count as active?

**Resolution:**
- Use timer registry. Register `darkness_check` repeating timer (1000ms) on Blinking Eyes spawn.
- Define "idle" as `!pointerHeld && frenzyStacks === 0` (not actively engaging). Each darkness tick: if idle, increment idle counter. If idle counter reaches 2, apply a darkness stack (transient modifier in stat pipeline, Layer 3). If not idle, reset idle counter to 0.
- On enemy death, remove all darkness transient modifiers. Pipeline recomputes — stats restore automatically. No manual reversal needed.

### Task 2.7: Resistance-Aware Damage

**No conflict.** References internal `attack()` function which still exists. `enemyType` is passed correctly.

### Task 2.9: Changelog Version

**Conflict:** Both Plan 0 and Plan 1 claim version `0.28.0`.

**Resolution:** Plan 0 gets `0.28.0`. Plan 1 gets `0.29.0`. Plan 2 gets `0.30.0`. Plan 3 gets `0.31.0`. Adjust on merge order.

---

## Plan 2 (Class Foundation) — Conflicts and Resolutions

### Task 3.1: `selectClass()` Timer Calls

**Conflict:** Calls `timers.startPoisonTick()` and `timers.resumeBossTimer()` — both deleted.

**Resolution:** Replace with `gameLoop.resume()`.

### Task 3.1: `applyClassBonuses()` Stat Mutation

**Conflict:** Directly mutates `playerStats.damage += 5` etc.

**Resolution:** Class bonuses become Layer 2 (class) modifiers in the stat pipeline. `applyClassBonuses()` is replaced by `getClassModifiers(classId)` which returns an array of `StatStep` functions. These are registered when a class is selected and feed into Layer 2 of all affected stats.

### Task 3.1: Attack Speed Per Class (Missing)

**Conflict:** Plan 0 defines per-class attack speed values (Warrior 0.4, Mage 0.64, Rogue 1.2) but Plan 2's class definitions and `applyClassBonuses()` don't set attack speed.

**Resolution:** Class base stats include attack speed. Layer 0 (base) of the `attackSpeed` pipeline reads the class-specific base:

| Class | Base Attack Speed |
|---|---|
| Adventurer | 0.8/s |
| Warrior | 0.4/s |
| Mage | 0.64/s |
| Rogue | 1.2/s |

These are part of `CLASS_DEFINITIONS` and feed into Layer 0 when a class is selected.

### Task 2.3: `getRandomUpgrades` Signature

**No conflict.** Plan 0 adds attack speed cards without a `classId` param. Plan 2 adds `classId` later. Compatible — Plan 2 just extends the function.

### Plan 0 Attack Speed Cards — Class Restriction

**Decision:** Plan 0's attack speed and frenzy cards remain generic (no `classRestriction`). All classes benefit from faster attacks. Class base values provide natural differentiation.

---

## Plan 3 (Class Mechanics) — Conflicts and Resolutions

### Task 1.2: Warrior Swing Cooldown

**Conflict:** Introduces a separate `warriorCooldown` boolean + `setTimeout` (1s cooldown) that competes with Plan 0's rAF attack cooldown.

**Resolution:** Remove `warriorCooldown` entirely. Warrior's slow attack identity comes from `attackSpeed: 0.4` (2.5s between attacks) set in Layer 0. The weapon draw + combo logic hooks into the `onAttack` callback that the game loop already fires. No separate cooldown system needed.

### Task 2.3: Mage Element Expiry

**Conflict:** Uses `setTimeout` per element with timer IDs in a Map.

**Resolution:** Use timer registry. `castElement('frost')` registers a `element_frost` one-shot timer (5000ms + duration bonuses from stat pipeline). Re-casting removes and re-registers the timer (refresh). On expiry callback: remove element effect (transient modifier from stat pipeline).

### Task 2.3: Mage Fire Burn DoT

**Conflict:** Implied interval for burn damage, no explicit timer mechanism specified.

**Resolution:** Casting Fire registers a `burn_dot` repeating timer (1000ms). Each tick deals burn damage. Timer is removed when `element_fire` expires. Burn damage scales from the stat pipeline (magic damage + fire bonuses).

### Task 2.3: Mage Element Effects as Stat Mutations

**Conflict:** `applyElementEffect('frost')` sets a flag that increases damage taken. This is a stat mutation.

**Resolution:** Element effects become transient modifiers in the stat pipeline (Layer 3). Frost active = transient multiplier on enemy damage taken. Arcane active = another transient multiplier. When the element timer expires, the transient modifier is removed, pipeline recomputes. No manual reversal.

### Task 3.2: Rogue Poison Cloud Timers

**Conflict:** Uses `setInterval` for cloud ticks and `setTimeout` for cooldown.

**Resolution:** Use timer registry:
- `deployPoisonCloud()` registers `poison_cloud_tick` (repeating, 1000ms) for stacking poison
- Registers `poison_cloud_expire` (one-shot, 5000ms) to remove the tick timer
- Registers `poison_cloud_cooldown` (one-shot, effective cooldown from stat pipeline) — on expiry, sets `poisonCloudOnCooldown = false`

### Task 4.1: Keyboard Shortcuts — Space

**Conflict:** Maps spacebar to `gameState.attack()` which is no longer public.

**Resolution:** Plan 0 Task 2.3 already handles spacebar via `onkeydown`/`onkeyup` mapped to `pointerDown()`/`pointerUp()`. Plan 3 only needs to add Mage (Q/W/E) and Rogue (Q) bindings.

### Task 1.4: Warrior Card `apply()` Side Effects

**Conflict:** Weapon unlock cards need to call `gameState.unlockWeapon()` — a side effect that doesn't fit the stat pipeline modifier model.

**Resolution:** Add an optional `onAcquire` callback to the card type for one-time side effects. This is separate from `modifiers` (which are stat pipeline inputs). Only weapon unlock cards and Rogue Poison Cloud unlock card need this:

```typescript
type Upgrade = {
  id: string;
  title: string;
  rarity: Rarity;
  image: string;
  modifiers: StatModifier[];
  onAcquire?: () => void;  // One-time side effect (unlock weapon, unlock ability)
};
```

### Task 2.2: Mage Stats in `PlayerStats`

**No conflict.** New stats (`magic`, `maxMana`, `manaPerTap`, `manaCostReduction`) added to the base stat definitions. They participate in the stat pipeline like any other stat.

---

## Summary: What Changes in Plan 0

Plan 0 must be extended with two new phases at the start:

```
Phase 0 (NEW): Stat Pipeline
├─ Define StatStep type and pipeline computation
├─ Define PipelineLayer with memoisation
├─ Create stat pipeline store with layered computation
├─ Migrate all 50+ upgrade cards from apply() to modifiers[]
├─ Remove stats display array (derive from modifiers + statRegistry)
├─ Replace applyPurchasedUpgrades() with pipeline Layer 1 rebuild
├─ Update persistence to not save computed stats
└─ Tests for pipeline computation, memoisation, dirty propagation

Phase 0.5 (NEW): Timer Registry
├─ Define GameTimer type and TimerRegistry
├─ Add tickTimers() to engine (pure, testable)
├─ Integrate registry into game loop store
├─ Migrate attackCooldown, poisonTick, bossTimer to named timers
├─ Migrate frenzy stack expiry from timestamps to named timers
└─ Tests for timer ticking, repeat, pause, remainder carry

Phase 1: Stats + Pure Game Loop Engine (existing, adjusted)
├─ Task 1.1  Add new stats (attackSpeed, tapFrenzyBonus, tapFrenzyDuration)
├─ Task 1.2  Game loop engine helpers (adjusted to use timer registry)
└─ Task 1.3  tickFrame (simplified — delegates to tickTimers)

Phase 2: rAF Store + Migration + Pointer Input (existing, adjusted)
├─ Task 2.1  Game loop store (uses timer registry + reads stat pipeline)
├─ Task 2.2  Migrate gameState (remove syncStats, read pipeline directly)
└─ Task 2.3  BattleArea pointer input + frenzy UI

Phase 3: Upgrade Cards + Changelog (existing, adjusted)
├─ Task 3.1  Attack speed cards (using new modifiers format)
└─ Task 3.2  Changelog
```

## Summary: What Changes in Plans 1-3

| Plan | Change |
|---|---|
| Plan 1 | All enemy mechanic timers use timer registry. All enemy debuffs (spore, frost aura, darkness) become transient modifiers in stat pipeline Layer 3. No manual stat reversal. Remove all `timers.svelte.ts` references. Frost Aura modifies `poisonTickInterval` stat instead of timer file. |
| Plan 2 | Class bonuses become Layer 0/2 pipeline modifiers instead of `playerStats` mutations. `selectClass()` uses `gameLoop.resume()`. Attack speed per class added to class definitions. |
| Plan 3 | Remove Warrior cooldown system (use attack speed stat). All Mage element timers and Rogue cloud timers use timer registry. Element effects become transient modifiers. Weapon/ability unlock cards use `onAcquire` callback. Keyboard space already handled by Plan 0. |
