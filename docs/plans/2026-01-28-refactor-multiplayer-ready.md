# Multiplayer-Ready Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract all game logic from the monolithic Svelte store into a pure, portable game engine so it can later run on a server for authoritative multiplayer.

**Architecture:** Currently, all game logic (combat, spawning, leveling, shop) lives in a single Svelte 5 reactive store (`gameState.svelte.ts`). We will extract pure functions into `src/lib/engine/` — no Svelte, no DOM, no `$state`. The Svelte store becomes a thin wrapper that calls engine functions. This makes the engine portable to a Bun server later.

**Tech Stack:** TypeScript, Svelte 5 (SvelteKit), Vitest (node environment for engine tests), Bun

---

## Prerequisites / Things You Need to Know

### Project structure
```
src/
  lib/
    stores/gameState.svelte.ts   ← monolithic store (ALL game logic + UI state)
    types.ts                     ← PlayerStats, Upgrade, Effect, HitInfo, HitType
    data/upgrades.ts             ← 47 upgrade definitions + getRandomUpgrades()
    components/                  ← Svelte UI components
  routes/
    +page.svelte                 ← main game page (imports gameState)
```

### How to run tests
```bash
# Run all tests (node + browser):
bun run test

# Run only node-environment tests (engine tests go here):
bun run test:unit -- --run --project server

# Run a specific test file:
bun run test:unit -- --run --project server src/lib/engine/combat.test.ts
```

### Test file naming convention
- Engine tests: `src/lib/engine/*.test.ts` → runs in **node** environment (vitest project "server")
- Svelte component tests: `src/**/*.svelte.spec.ts` → runs in **browser** environment (vitest project "client")
- The vitest config at `vite.config.ts:10-34` defines these two projects

### Import aliases
- `$lib` maps to `src/lib/` (configured by SvelteKit)
- Engine files can use relative imports to each other, but test files should use relative imports too (they run outside SvelteKit's alias resolution in the node vitest project)

### Key types (from `src/lib/types.ts`)
```typescript
type PlayerStats = {
  damage: number; critChance: number; critMultiplier: number;
  xpMultiplier: number; damageMultiplier: number;
  poison: number; poisonCritChance: number; multiStrike: number;
  overkill: boolean; executeThreshold: number; bonusBossTime: number;
  greed: number; luckyChance: number; chestChance: number; goldMultiplier: number;
};

type HitType = 'normal' | 'crit' | 'execute' | 'poison' | 'poisonCrit';
type HitInfo = { damage: number; type: HitType; id: number; index: number; };
```

### The "apply" pattern for upgrades
Each upgrade in `src/lib/data/upgrades.ts` has an `apply(stats: PlayerStats) => void` that mutates the stats object directly. Example: `apply: (s) => (s.damage += 3)`. This pattern stays — we're not changing upgrades.

### What we are NOT doing
- We are NOT adding multiplayer, WebSockets, or server code yet
- We are NOT changing any UI components or visual behavior
- We are NOT changing the upgrade definitions in `data/upgrades.ts`
- We are NOT adding abstractions we don't need yet (no interfaces for persistence, no event bus)
- We ARE extracting pure functions that compute the same results the store currently computes inline

---

## Task 1: Extract Default Player Stats

Extract the default `PlayerStats` object that's currently hardcoded in two places inside `gameState.svelte.ts` (lines 31-47 and 492-508) into a single reusable function.

**Files:**
- Create: `src/lib/engine/stats.ts`
- Test: `src/lib/engine/stats.test.ts`
- Modify: `src/lib/stores/gameState.svelte.ts` (lines 31-47 and 492-508)

**Step 1: Write the failing test**

Create `src/lib/engine/stats.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { createDefaultStats } from './stats';

describe('createDefaultStats', () => {
  test('returns fresh PlayerStats with correct defaults', () => {
    const stats = createDefaultStats();
    expect(stats.damage).toBe(1);
    expect(stats.critChance).toBe(0);
    expect(stats.critMultiplier).toBe(1.5);
    expect(stats.xpMultiplier).toBe(1);
    expect(stats.damageMultiplier).toBe(1);
    expect(stats.poison).toBe(0);
    expect(stats.poisonCritChance).toBe(0);
    expect(stats.multiStrike).toBe(0);
    expect(stats.overkill).toBe(false);
    expect(stats.executeThreshold).toBe(0);
    expect(stats.bonusBossTime).toBe(0);
    expect(stats.greed).toBe(0);
    expect(stats.luckyChance).toBe(0);
    expect(stats.chestChance).toBe(0.05);
    expect(stats.goldMultiplier).toBe(1);
  });

  test('returns a new object each time (no shared references)', () => {
    const a = createDefaultStats();
    const b = createDefaultStats();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    a.damage = 999;
    expect(b.damage).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bun run test:unit -- --run --project server src/lib/engine/stats.test.ts
```
Expected: FAIL — `Cannot find module './stats'`

**Step 3: Write minimal implementation**

Create `src/lib/engine/stats.ts`:

```typescript
import type { PlayerStats } from '$lib/types';

export function createDefaultStats(): PlayerStats {
  return {
    damage: 1,
    critChance: 0,
    critMultiplier: 1.5,
    xpMultiplier: 1,
    damageMultiplier: 1,
    poison: 0,
    poisonCritChance: 0,
    multiStrike: 0,
    overkill: false,
    executeThreshold: 0,
    bonusBossTime: 0,
    greed: 0,
    luckyChance: 0,
    chestChance: 0.05,
    goldMultiplier: 1,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
bun run test:unit -- --run --project server src/lib/engine/stats.test.ts
```
Expected: PASS (2 tests)

**Step 5: Wire the store to use the new function**

In `src/lib/stores/gameState.svelte.ts`:

1. Add import at top: `import { createDefaultStats } from '$lib/engine/stats';`
2. Replace lines 31-47 (`let playerStats = $state<PlayerStats>({...})`) with:
   ```typescript
   let playerStats = $state<PlayerStats>(createDefaultStats());
   ```
3. Replace lines 492-508 (inside `resetGame()`, the identical object literal) with:
   ```typescript
   playerStats = createDefaultStats();
   ```

**Step 6: Smoke test — make sure the app still builds**

```bash
bun run check
```
Expected: No errors

**Step 7: Commit**

```bash
git add src/lib/engine/stats.ts src/lib/engine/stats.test.ts src/lib/stores/gameState.svelte.ts
git commit -m "refactor: extract createDefaultStats into engine/stats"
```

---

## Task 2: Extract Combat Calculation (Attack)

The `attack()` function at `gameState.svelte.ts:106-157` mixes damage math with state mutation. Extract the pure math part: given stats + enemy state, return what hits occur and total damage dealt.

**Files:**
- Create: `src/lib/engine/combat.ts`
- Test: `src/lib/engine/combat.test.ts`
- Modify: `src/lib/stores/gameState.svelte.ts` (lines 106-157)

**Step 1: Write the failing test**

Create `src/lib/engine/combat.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { calculateAttack } from './combat';
import { createDefaultStats } from './stats';
import type { PlayerStats } from '$lib/types';

describe('calculateAttack', () => {
  test('basic attack deals base damage with no crit', () => {
    const stats = createDefaultStats(); // damage=1, critChance=0
    const result = calculateAttack(stats, {
      enemyHealth: 10,
      enemyMaxHealth: 10,
      overkillDamage: 0,
      rng: () => 0.99, // always fails crit check
    });

    expect(result.totalDamage).toBe(1);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].type).toBe('normal');
    expect(result.hits[0].damage).toBe(1);
    expect(result.overkillDamageOut).toBe(0);
  });

  test('crit attack multiplies damage', () => {
    const stats: PlayerStats = {
      ...createDefaultStats(),
      damage: 10,
      critChance: 1, // always crit
      critMultiplier: 2,
    };
    const result = calculateAttack(stats, {
      enemyHealth: 100,
      enemyMaxHealth: 100,
      overkillDamage: 0,
      rng: () => 0, // always passes crit check (< critChance)
    });

    expect(result.totalDamage).toBe(20);
    expect(result.hits[0].type).toBe('crit');
  });

  test('execute triggers when enemy health below threshold', () => {
    const stats: PlayerStats = {
      ...createDefaultStats(),
      executeThreshold: 0.3, // execute below 30%
    };
    const result = calculateAttack(stats, {
      enemyHealth: 2,     // 20% of max
      enemyMaxHealth: 10,
      overkillDamage: 0,
      rng: () => 0.99,
    });

    expect(result.totalDamage).toBe(2); // instant kill = remaining health
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].type).toBe('execute');
  });

  test('multi-strike produces multiple hits', () => {
    const stats: PlayerStats = {
      ...createDefaultStats(),
      damage: 5,
      multiStrike: 2, // 1 base + 2 extra = 3 strikes
    };
    const result = calculateAttack(stats, {
      enemyHealth: 100,
      enemyMaxHealth: 100,
      overkillDamage: 0,
      rng: () => 0.99,
    });

    expect(result.hits).toHaveLength(3);
    expect(result.totalDamage).toBe(15); // 5 × 3
  });

  test('overkill damage is added to first strike only', () => {
    const stats: PlayerStats = {
      ...createDefaultStats(),
      damage: 5,
      multiStrike: 1, // 2 strikes
    };
    const result = calculateAttack(stats, {
      enemyHealth: 100,
      enemyMaxHealth: 100,
      overkillDamage: 10,
      rng: () => 0.99,
    });

    expect(result.hits[0].damage).toBe(15); // 5 base + 10 overkill
    expect(result.hits[1].damage).toBe(5);  // no overkill
    expect(result.totalDamage).toBe(20);
  });

  test('damageMultiplier applies to all strikes', () => {
    const stats: PlayerStats = {
      ...createDefaultStats(),
      damage: 10,
      damageMultiplier: 2,
    };
    const result = calculateAttack(stats, {
      enemyHealth: 100,
      enemyMaxHealth: 100,
      overkillDamage: 0,
      rng: () => 0.99,
    });

    expect(result.totalDamage).toBe(20); // 10 × 2
  });

  test('overkillDamageOut is set when enemy would die and overkill is enabled', () => {
    const stats: PlayerStats = {
      ...createDefaultStats(),
      damage: 15,
      overkill: true,
    };
    const result = calculateAttack(stats, {
      enemyHealth: 10,
      enemyMaxHealth: 10,
      overkillDamage: 0,
      rng: () => 0.99,
    });

    expect(result.totalDamage).toBe(15);
    // enemy had 10 HP, took 15 → 5 overkill
    expect(result.overkillDamageOut).toBe(5);
  });

  test('overkillDamageOut is 0 when overkill is disabled', () => {
    const stats: PlayerStats = {
      ...createDefaultStats(),
      damage: 15,
      overkill: false,
    };
    const result = calculateAttack(stats, {
      enemyHealth: 10,
      enemyMaxHealth: 10,
      overkillDamage: 0,
      rng: () => 0.99,
    });

    expect(result.overkillDamageOut).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bun run test:unit -- --run --project server src/lib/engine/combat.test.ts
```
Expected: FAIL — `Cannot find module './combat'`

**Step 3: Write minimal implementation**

Create `src/lib/engine/combat.ts`:

```typescript
import type { PlayerStats, HitInfo, HitType } from '$lib/types';

export interface AttackContext {
  enemyHealth: number;
  enemyMaxHealth: number;
  overkillDamage: number;
  rng: () => number; // injectable RNG, defaults to Math.random in prod
}

export interface AttackResult {
  totalDamage: number;
  hits: Omit<HitInfo, 'id'>[]; // caller assigns IDs (UI concern)
  overkillDamageOut: number;
}

export function calculateAttack(
  stats: PlayerStats,
  ctx: AttackContext
): AttackResult {
  const hits: Omit<HitInfo, 'id'>[] = [];
  let totalDamage = 0;

  // Check execute threshold
  const healthPercent = ctx.enemyHealth / ctx.enemyMaxHealth;
  const isExecute =
    stats.executeThreshold > 0 && healthPercent <= stats.executeThreshold;

  if (isExecute) {
    totalDamage = ctx.enemyHealth;
    hits.push({ damage: totalDamage, type: 'execute', index: 0 });
  } else {
    const strikes = 1 + stats.multiStrike;
    for (let i = 0; i < strikes; i++) {
      const isCrit = ctx.rng() < stats.critChance;
      const hitType: HitType = isCrit ? 'crit' : 'normal';

      let damage = isCrit
        ? Math.floor(stats.damage * stats.critMultiplier)
        : stats.damage;

      // Add overkill damage from previous kill (first strike only)
      if (i === 0 && ctx.overkillDamage > 0) {
        damage += ctx.overkillDamage;
      }

      // Apply final damage multiplier
      damage = Math.floor(damage * stats.damageMultiplier);

      totalDamage += damage;
      hits.push({ damage, type: hitType, index: i });
    }
  }

  // Calculate overkill for next enemy
  const remainingHealth = ctx.enemyHealth - totalDamage;
  const overkillDamageOut =
    stats.overkill && remainingHealth < 0 ? Math.abs(remainingHealth) : 0;

  return { totalDamage, hits, overkillDamageOut };
}
```

**Step 4: Run test to verify it passes**

```bash
bun run test:unit -- --run --project server src/lib/engine/combat.test.ts
```
Expected: PASS (7 tests)

**Step 5: Commit the engine code + tests**

```bash
git add src/lib/engine/combat.ts src/lib/engine/combat.test.ts
git commit -m "feat: extract calculateAttack pure function into engine/combat"
```

**Step 6: Wire the store to use calculateAttack**

In `src/lib/stores/gameState.svelte.ts`:

1. Add import: `import { calculateAttack } from '$lib/engine/combat';`
2. Replace the body of the `attack()` function (lines 106-157) with:

```typescript
function attack() {
  if (showGameOver || levelingUp) return;

  const result = calculateAttack(playerStats, {
    enemyHealth,
    enemyMaxHealth,
    overkillDamage,
    rng: Math.random,
  });

  // Assign hit IDs (UI concern)
  const newHits: HitInfo[] = result.hits.map((h) => {
    hitId++;
    return { ...h, id: hitId };
  });

  // Apply results to state
  overkillDamage = result.overkillDamageOut;
  enemyHealth -= result.totalDamage;
  addHits(newHits);

  if (enemyHealth <= 0) {
    killEnemy();
  }
}
```

Note: Remove the old overkill handling inside `killEnemy()` — it's now handled by `calculateAttack`. Check `killEnemy()` (lines 183-226): the overkill block at lines 151-154 was inside `attack()`, not `killEnemy()`, so you only need to replace `attack()`.

**Step 7: Run full test suite**

```bash
bun run test
```
Expected: All tests pass

**Step 8: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "refactor: wire attack() to use calculateAttack from engine"
```

---

## Task 3: Extract Poison Calculation

The `applyPoison()` function at `gameState.svelte.ts:159-176` has the same pattern as combat — pure math mixed with state mutation.

**Files:**
- Modify: `src/lib/engine/combat.ts` (add function)
- Test: `src/lib/engine/combat.test.ts` (add tests)
- Modify: `src/lib/stores/gameState.svelte.ts` (lines 159-176)

**Step 1: Write the failing test**

Add to `src/lib/engine/combat.test.ts`:

```typescript
import { calculateAttack, calculatePoison } from './combat';

// ... existing tests ...

describe('calculatePoison', () => {
  test('returns zero damage when poison is 0', () => {
    const stats = createDefaultStats(); // poison=0
    const result = calculatePoison(stats, { rng: () => 0.99 });
    expect(result.damage).toBe(0);
    expect(result.type).toBe('poison');
  });

  test('deals base poison damage', () => {
    const stats: PlayerStats = {
      ...createDefaultStats(),
      poison: 5,
      damageMultiplier: 1,
    };
    const result = calculatePoison(stats, { rng: () => 0.99 });
    expect(result.damage).toBe(5);
    expect(result.type).toBe('poison');
  });

  test('poison can crit', () => {
    const stats: PlayerStats = {
      ...createDefaultStats(),
      poison: 10,
      poisonCritChance: 1, // always crit
      critMultiplier: 2,
      damageMultiplier: 1,
    };
    const result = calculatePoison(stats, { rng: () => 0 });
    expect(result.damage).toBe(20); // 10 × 2
    expect(result.type).toBe('poisonCrit');
  });

  test('damageMultiplier applies to poison', () => {
    const stats: PlayerStats = {
      ...createDefaultStats(),
      poison: 4,
      damageMultiplier: 3,
    };
    const result = calculatePoison(stats, { rng: () => 0.99 });
    expect(result.damage).toBe(12); // 4 × 3
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bun run test:unit -- --run --project server src/lib/engine/combat.test.ts
```
Expected: FAIL — `calculatePoison is not exported`

**Step 3: Write minimal implementation**

Add to `src/lib/engine/combat.ts`:

```typescript
export interface PoisonContext {
  rng: () => number;
}

export interface PoisonResult {
  damage: number;
  type: 'poison' | 'poisonCrit';
}

export function calculatePoison(
  stats: PlayerStats,
  ctx: PoisonContext
): PoisonResult {
  if (stats.poison <= 0) {
    return { damage: 0, type: 'poison' };
  }

  const isPoisonCrit = ctx.rng() < stats.poisonCritChance;
  let damage = isPoisonCrit
    ? Math.floor(stats.poison * stats.critMultiplier)
    : stats.poison;

  damage = Math.floor(damage * stats.damageMultiplier);

  return {
    damage,
    type: isPoisonCrit ? 'poisonCrit' : 'poison',
  };
}
```

**Step 4: Run test to verify it passes**

```bash
bun run test:unit -- --run --project server src/lib/engine/combat.test.ts
```
Expected: PASS (all tests)

**Step 5: Commit the engine code**

```bash
git add src/lib/engine/combat.ts src/lib/engine/combat.test.ts
git commit -m "feat: extract calculatePoison pure function into engine/combat"
```

**Step 6: Wire the store**

In `src/lib/stores/gameState.svelte.ts`:

1. Update import: `import { calculateAttack, calculatePoison } from '$lib/engine/combat';`
2. Replace `applyPoison()` body (lines 159-176) with:

```typescript
function applyPoison() {
  if (playerStats.poison <= 0 || enemyHealth <= 0 || showGameOver || levelingUp) return;

  const result = calculatePoison(playerStats, { rng: Math.random });
  if (result.damage <= 0) return;

  enemyHealth -= result.damage;
  hitId++;
  addHits([{ damage: result.damage, type: result.type, id: hitId, index: 0 }]);

  if (enemyHealth <= 0) {
    killEnemy();
  }
}
```

**Step 7: Run full test suite**

```bash
bun run test
```
Expected: All tests pass

**Step 8: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "refactor: wire applyPoison() to use calculatePoison from engine"
```

---

## Task 4: Extract Enemy Spawning & Wave Logic

Enemy health formulas and wave structure are embedded in the store. Extract them as pure functions.

**Files:**
- Create: `src/lib/engine/waves.ts`
- Test: `src/lib/engine/waves.test.ts`
- Modify: `src/lib/stores/gameState.svelte.ts`

**Step 1: Write the failing test**

Create `src/lib/engine/waves.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import {
  getStageMultiplier,
  getGreedMultiplier,
  getEnemyHealth,
  getBossHealth,
  getChestHealth,
  shouldSpawnChest,
  getXpReward,
  getChestGoldReward,
  getXpToNextLevel,
} from './waves';

describe('getStageMultiplier', () => {
  test('stage 1 returns 1', () => {
    expect(getStageMultiplier(1)).toBe(1);
  });

  test('stage 2 returns 1.5', () => {
    expect(getStageMultiplier(2)).toBe(1.5);
  });

  test('stage 3 returns 2.25', () => {
    expect(getStageMultiplier(3)).toBeCloseTo(2.25);
  });
});

describe('getGreedMultiplier', () => {
  test('0 greed returns 1', () => {
    expect(getGreedMultiplier(0)).toBe(1);
  });

  test('0.5 greed returns 1.5', () => {
    expect(getGreedMultiplier(0.5)).toBe(1.5);
  });
});

describe('enemy health', () => {
  test('regular enemy at stage 1, greed 0', () => {
    expect(getEnemyHealth(1, 0)).toBe(10);
  });

  test('regular enemy at stage 2, greed 0', () => {
    expect(getEnemyHealth(2, 0)).toBe(15); // floor(10 × 1.5)
  });

  test('boss at stage 1, greed 0', () => {
    expect(getBossHealth(1, 0)).toBe(50);
  });

  test('chest at stage 1, greed 0', () => {
    expect(getChestHealth(1, 0)).toBe(20);
  });

  test('regular enemy with greed', () => {
    expect(getEnemyHealth(1, 0.5)).toBe(15); // floor(10 × 1 × 1.5)
  });
});

describe('shouldSpawnChest', () => {
  test('spawns when rng < chestChance', () => {
    expect(shouldSpawnChest(0.05, () => 0.01)).toBe(true);
  });

  test('does not spawn when rng >= chestChance', () => {
    expect(shouldSpawnChest(0.05, () => 0.99)).toBe(false);
  });
});

describe('getXpReward', () => {
  test('stage 1 with 1x multiplier', () => {
    expect(getXpReward(1, 1)).toBe(8); // floor((5 + 1×3) × 1)
  });

  test('stage 3 with 2x multiplier', () => {
    expect(getXpReward(3, 2)).toBe(28); // floor((5 + 3×3) × 2)
  });
});

describe('getChestGoldReward', () => {
  test('stage 1 with 1x gold multiplier', () => {
    expect(getChestGoldReward(1, 1)).toBe(15); // floor((10 + 1×5) × 1)
  });

  test('stage 3 with 2x gold multiplier', () => {
    expect(getChestGoldReward(3, 2)).toBe(50); // floor((10 + 3×5) × 2)
  });
});

describe('getXpToNextLevel', () => {
  test('level 1 needs 10 xp', () => {
    expect(getXpToNextLevel(1)).toBe(10);
  });

  test('level 2 needs 15 xp', () => {
    expect(getXpToNextLevel(2)).toBe(15); // floor(10 × 1.5)
  });

  test('level 3 needs 22 xp', () => {
    expect(getXpToNextLevel(3)).toBe(22); // floor(10 × 2.25)
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bun run test:unit -- --run --project server src/lib/engine/waves.test.ts
```
Expected: FAIL — `Cannot find module './waves'`

**Step 3: Write minimal implementation**

Create `src/lib/engine/waves.ts`:

```typescript
export const KILLS_PER_WAVE = 5;
export const BASE_BOSS_TIME = 30;

export function getStageMultiplier(stage: number): number {
  return Math.pow(1.5, stage - 1);
}

export function getGreedMultiplier(greed: number): number {
  return 1 + greed;
}

export function getEnemyHealth(stage: number, greed: number): number {
  return Math.floor(10 * getStageMultiplier(stage) * getGreedMultiplier(greed));
}

export function getBossHealth(stage: number, greed: number): number {
  return Math.floor(50 * getStageMultiplier(stage) * getGreedMultiplier(greed));
}

export function getChestHealth(stage: number, greed: number): number {
  return Math.floor(20 * getStageMultiplier(stage) * getGreedMultiplier(greed));
}

export function shouldSpawnChest(
  chestChance: number,
  rng: () => number
): boolean {
  return rng() < chestChance;
}

export function getXpReward(stage: number, xpMultiplier: number): number {
  return Math.floor((5 + stage * 3) * xpMultiplier);
}

export function getChestGoldReward(
  stage: number,
  goldMultiplier: number
): number {
  return Math.floor((10 + stage * 5) * goldMultiplier);
}

export function getXpToNextLevel(level: number): number {
  return Math.floor(10 * Math.pow(1.5, level - 1));
}
```

**Step 4: Run test to verify it passes**

```bash
bun run test:unit -- --run --project server src/lib/engine/waves.test.ts
```
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/lib/engine/waves.ts src/lib/engine/waves.test.ts
git commit -m "feat: extract wave/enemy/xp formulas into engine/waves"
```

**Step 6: Wire the store to use wave functions**

In `src/lib/stores/gameState.svelte.ts`:

1. Add import:
   ```typescript
   import {
     KILLS_PER_WAVE, BASE_BOSS_TIME,
     getStageMultiplier, getGreedMultiplier,
     getEnemyHealth, getBossHealth, getChestHealth,
     getXpReward, getChestGoldReward, getXpToNextLevel,
   } from '$lib/engine/waves';
   ```

2. Remove the local constants and derived values that are now redundant:
   - Remove `const killsPerWave = 5;` (line 64) — use `KILLS_PER_WAVE`
   - Remove `const baseBossTime = 30;` (line 68) — use `BASE_BOSS_TIME`
   - Replace `let xpToNextLevel = $derived(Math.floor(10 * Math.pow(1.5, level - 1)));` (line 92) with:
     ```typescript
     let xpToNextLevel = $derived(getXpToNextLevel(level));
     ```
   - Replace `let stageMultiplier = $derived(Math.pow(1.5, stage - 1));` (line 93) with:
     ```typescript
     let stageMultiplier = $derived(getStageMultiplier(stage));
     ```
   - Replace `let greedMultiplier = $derived(1 + playerStats.greed);` (line 94) with:
     ```typescript
     let greedMultiplier = $derived(getGreedMultiplier(playerStats.greed));
     ```
   - Replace `let bossTimerMax = $derived(baseBossTime + playerStats.bonusBossTime);` (line 95) with:
     ```typescript
     let bossTimerMax = $derived(BASE_BOSS_TIME + playerStats.bonusBossTime);
     ```

3. Replace `spawnEnemy()` body (line 323-327):
   ```typescript
   function spawnEnemy() {
     enemyMaxHealth = getEnemyHealth(stage, playerStats.greed);
     enemyHealth = enemyMaxHealth;
     isBoss = false;
   }
   ```

4. Replace `spawnBoss()` body (lines 329-334):
   ```typescript
   function spawnBoss() {
     isBoss = true;
     enemyMaxHealth = getBossHealth(stage, playerStats.greed);
     enemyHealth = enemyMaxHealth;
     startBossTimer();
   }
   ```

5. Replace `spawnChest()` body (lines 237-242):
   ```typescript
   function spawnChest() {
     isChest = true;
     enemyMaxHealth = getChestHealth(stage, playerStats.greed);
     enemyHealth = enemyMaxHealth;
   }
   ```

6. In `killEnemy()`, replace the inline XP calculation (line 202):
   ```typescript
   const xpGain = getXpReward(stage, playerStats.xpMultiplier);
   ```

7. In `killEnemy()`, replace the inline gold calculation (line 188):
   ```typescript
   const goldReward = getChestGoldReward(stage, playerStats.goldMultiplier);
   ```

8. In `spawnNextTarget()`, replace the inline chest roll (line 230):
   ```typescript
   if (!isBoss && waveKills < KILLS_PER_WAVE - 1 && shouldSpawnChest(playerStats.chestChance, Math.random)) {
   ```

9. Update all references to `killsPerWave` to use `KILLS_PER_WAVE` (search for `killsPerWave` in the file — it appears in the `return` block too at the getter on line 574). Update the getter:
   ```typescript
   get killsPerWave() {
     return KILLS_PER_WAVE;
   },
   ```

**Step 7: Run full test suite**

```bash
bun run test
```
Expected: All tests pass

**Step 8: Run the type checker**

```bash
bun run check
```
Expected: No errors

**Step 9: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "refactor: wire store to use wave/enemy formulas from engine"
```

---

## Task 5: Extract Shop Pricing

The `getCardPrice()` function at `gameState.svelte.ts:446-451` is pure math. Extract it.

**Files:**
- Create: `src/lib/engine/shop.ts`
- Test: `src/lib/engine/shop.test.ts`
- Modify: `src/lib/stores/gameState.svelte.ts` (lines 446-451)

**Step 1: Write the failing test**

Create `src/lib/engine/shop.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { getCardPrice } from './shop';

describe('getCardPrice', () => {
  test('slot 0 base price with 0 purchased', () => {
    expect(getCardPrice(0, 0)).toBe(10);
  });

  test('slot 1 base price with 0 purchased', () => {
    expect(getCardPrice(1, 0)).toBe(15);
  });

  test('slot 2 base price with 0 purchased', () => {
    expect(getCardPrice(2, 0)).toBe(25);
  });

  test('price increases by 5 per purchased upgrade', () => {
    expect(getCardPrice(0, 3)).toBe(25); // 10 + 3×5
    expect(getCardPrice(1, 3)).toBe(30); // 15 + 3×5
    expect(getCardPrice(2, 3)).toBe(40); // 25 + 3×5
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bun run test:unit -- --run --project server src/lib/engine/shop.test.ts
```
Expected: FAIL — `Cannot find module './shop'`

**Step 3: Write minimal implementation**

Create `src/lib/engine/shop.ts`:

```typescript
const BASE_PRICES = [10, 15, 25];

export function getCardPrice(
  cardIndex: number,
  purchasedCount: number
): number {
  return BASE_PRICES[cardIndex] + purchasedCount * 5;
}
```

**Step 4: Run test to verify it passes**

```bash
bun run test:unit -- --run --project server src/lib/engine/shop.test.ts
```
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/lib/engine/shop.ts src/lib/engine/shop.test.ts
git commit -m "feat: extract getCardPrice into engine/shop"
```

**Step 6: Wire the store**

In `src/lib/stores/gameState.svelte.ts`:

1. Add import: `import { getCardPrice as calculateCardPrice } from '$lib/engine/shop';`
2. Replace the `getCardPrice` function body (lines 446-451):
   ```typescript
   function getCardPrice(cardIndex: number): number {
     return calculateCardPrice(cardIndex, purchasedUpgrades.size);
   }
   ```

**Step 7: Run full test suite**

```bash
bun run test
```
Expected: All tests pass

**Step 8: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "refactor: wire store getCardPrice to use engine/shop"
```

---

## Task 6: Create Engine Barrel Export

Create an index file so future consumers (like a server) can import all engine functions from one place.

**Files:**
- Create: `src/lib/engine/index.ts`

**Step 1: Create the barrel export**

Create `src/lib/engine/index.ts`:

```typescript
export { createDefaultStats } from './stats';
export { calculateAttack, calculatePoison } from './combat';
export type { AttackContext, AttackResult, PoisonContext, PoisonResult } from './combat';
export {
  KILLS_PER_WAVE,
  BASE_BOSS_TIME,
  getStageMultiplier,
  getGreedMultiplier,
  getEnemyHealth,
  getBossHealth,
  getChestHealth,
  shouldSpawnChest,
  getXpReward,
  getChestGoldReward,
  getXpToNextLevel,
} from './waves';
export { getCardPrice } from './shop';
```

**Step 2: Verify it compiles**

```bash
bun run check
```
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/engine/index.ts
git commit -m "feat: add engine barrel export"
```

---

## Task 7: Verify No Behavior Changes — Full Regression

This is the final verification step. Nothing should have changed from the user's perspective.

**Files:** None (verification only)

**Step 1: Run the full test suite**

```bash
bun run test
```
Expected: All tests pass

**Step 2: Run the type checker**

```bash
bun run check
```
Expected: No errors

**Step 3: Run the build**

```bash
bun run build
```
Expected: Build succeeds with no errors

**Step 4: Commit (if any formatting/lint fixes were needed)**

```bash
# Only if changes were needed:
git add -A
git commit -m "chore: fix formatting after engine extraction"
```

**Step 5: Push**

```bash
git push -u origin claude/refactor-multiplayer-ready-PvVn5
```

---

## Summary of Files Created/Modified

### New files (engine — portable, no Svelte dependencies):
| File | Purpose |
|------|---------|
| `src/lib/engine/stats.ts` | `createDefaultStats()` |
| `src/lib/engine/stats.test.ts` | Tests for default stats |
| `src/lib/engine/combat.ts` | `calculateAttack()`, `calculatePoison()` |
| `src/lib/engine/combat.test.ts` | Tests for combat math |
| `src/lib/engine/waves.ts` | Wave, enemy health, XP, gold formulas |
| `src/lib/engine/waves.test.ts` | Tests for wave formulas |
| `src/lib/engine/shop.ts` | `getCardPrice()` |
| `src/lib/engine/shop.test.ts` | Tests for shop pricing |
| `src/lib/engine/index.ts` | Barrel export |

### Modified files:
| File | What changed |
|------|--------------|
| `src/lib/stores/gameState.svelte.ts` | Imports engine functions instead of inline math. Same behavior, less logic. |

### Unchanged files:
| File | Why unchanged |
|------|---------------|
| `src/lib/types.ts` | Types are already clean and portable |
| `src/lib/data/upgrades.ts` | Upgrade definitions stay as-is |
| `src/lib/components/*.svelte` | No UI changes |
| `src/routes/+page.svelte` | No page changes |

---

## What This Enables Next

After this refactor, the engine functions are ready to run on a Bun server. Future tasks (not part of this plan) would be:

1. **Action/Command Pattern** — Define `GameAction` union type and `processAction(state, action)` reducer using the engine functions
2. **Server Game Loop** — Import `$lib/engine` into a `Bun.serve()` WebSocket handler
3. **Client Prediction** — Client calls the same engine functions locally for instant feedback, server is authoritative
4. **Server-side Persistence** — Replace localStorage calls with API calls
5. **Seeded RNG** — Replace `Math.random` with a seeded PRNG the server controls
