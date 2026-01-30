# Decompose gameState into Single-Responsibility Modules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Break the monolithic 810-line `createGameState()` closure into small, focused Svelte 5 runes modules — each owning one concern. The orchestrator (`gameState.svelte.ts`) becomes a thin composition root that wires modules together and exposes the public API.

**Architecture:** Today, `createGameState()` is a single function containing ~50 `$state` variables, ~25 internal functions, and ~50 getters. Every function can read and write every variable through closure capture, making it impossible to reason about dependencies. The engine layer (`src/lib/engine/`) already follows FP principles — pure functions with explicit inputs. This plan extends that discipline to the reactive state layer by giving each module its own state and a narrow, typed interface to the rest of the system.

**Design principles:**
- **Single responsibility:** Each module owns one concern (timers, combat, spawning, etc.)
- **Composition over inheritance:** The orchestrator composes modules via function calls, not class hierarchies
- **Explicit dependencies:** Modules receive only the state they need via typed context objects or callbacks — no ambient closure capture
- **Functional core, imperative shell:** Modules contain reactive state (`$state`) but expose pure-ish interfaces. Side effects (timers, localStorage) are isolated.

**Tech Stack:** TypeScript, Svelte 5 (SvelteKit), Bun, `bun test` (vitest)

---

## Prerequisites / Things You Need to Know

### Current file structure
```
src/lib/
  stores/
    gameState.svelte.ts          ← 810 lines, monolithic (THE PROBLEM)
  engine/
    combat.ts                    ← pure: calculateAttack(), calculatePoison()
    waves.ts                     ← pure: health/xp/spawn formulas
    stats.ts                     ← pure: createDefaultStats()
    shop.ts                      ← pure: getCardPrice()
  data/
    upgrades.ts                  ← static upgrade definitions
  types.ts                       ← shared types
  components/
    ...                          ← all prop-based, no direct gameState imports
```

### Target file structure
```
src/lib/
  stores/
    gameState.svelte.ts          ← ~120 lines: composition root + public API
    timers.svelte.ts             ← boss timer + poison tick intervals
    combat.svelte.ts             ← attack(), applyPoison(), poison stacks, overkill
    enemy.svelte.ts              ← enemy HP, spawn logic, wave/stage tracking
    leveling.svelte.ts           ← XP, level, pending level-ups, upgrade selection
    shop.svelte.ts               ← persistent gold, purchased upgrades, shop UI
    persistence.svelte.ts        ← save/load/clear for session + persistent data
    uiEffects.svelte.ts          ← hits + gold drops (array-based self-cleaning)
  engine/                        ← unchanged
  data/                          ← unchanged
  types.ts                       ← add module-specific types as needed
```

### Module dependency graph
```
gameState (orchestrator)
  ├── uiEffects     (no deps — standalone)
  ├── timers        (no deps — standalone, callbacks injected)
  ├── persistence   (no deps — receives data to save/load)
  ├── shop          (depends on: persistence for gold/purchases)
  ├── enemy         (no deps — receives stage/stats to compute health)
  ├── leveling      (no deps — receives xp/level, returns choices)
  └── combat        (depends on: enemy for HP, uiEffects for hits, timers for poison)
```

### How to run tests
```bash
bun test              # all tests
bun run check         # svelte-check type checking
```

### Critical constraint
`+page.svelte` imports `gameState` and accesses ~30 properties + 8 methods. The **public API must not change**. All refactoring is internal. Components are already prop-based and unaffected.

---

## Task 1 — Extract UI effects module (`uiEffects.svelte.ts`)

### Problem
`addHits()` and `addGoldDrop()` are self-contained systems that don't depend on any other game state. They're the simplest extraction target and are already well-patterned.

### What to do

**Create** `src/lib/stores/uiEffects.svelte.ts`:
```ts
import type { HitInfo, GoldDrop } from '$lib/types';

export function createUIEffects() {
    let hits = $state<HitInfo[]>([]);
    let hitId = $state(0);
    let goldDrops = $state<GoldDrop[]>([]);
    let goldDropId = $state(0);

    function nextHitId(): number {
        return ++hitId;
    }

    function addHits(newHits: HitInfo[]) {
        hits = [...hits, ...newHits];
        const hitIds = newHits.map((h) => h.id);
        setTimeout(() => {
            hits = hits.filter((h) => !hitIds.includes(h.id));
        }, 700);
    }

    function addGoldDrop(amount: number) {
        goldDropId++;
        goldDrops = [...goldDrops, { id: goldDropId, amount }];
        const dropId = goldDropId;
        setTimeout(() => {
            goldDrops = goldDrops.filter((d) => d.id !== dropId);
        }, 1200);
    }

    function reset() {
        hits = [];
        goldDrops = [];
        hitId = 0;
        goldDropId = 0;
    }

    return {
        get hits() { return hits; },
        get goldDrops() { return goldDrops; },
        nextHitId,
        addHits,
        addGoldDrop,
        reset,
    };
}
```

**Modify** `src/lib/stores/gameState.svelte.ts`:
- Import `createUIEffects`.
- Replace `hits`, `hitId`, `goldDrops`, `goldDropId`, `addHits()`, `addGoldDrop()` with: `const ui = createUIEffects();`
- Update all references: `hits` → `ui.hits`, `addHits(...)` → `ui.addHits(...)`, `hitId++` → `ui.nextHitId()`, etc.
- In `resetGame()`, replace individual resets with `ui.reset()`.
- Update getters: `get hits() { return ui.hits; }`, `get goldDrops() { return ui.goldDrops; }`.

### Steps
1. Create `uiEffects.svelte.ts`.
2. Update `gameState.svelte.ts` to compose it.
3. Run `bun run check` — verify 0 errors.
4. Commit: `refactor: extract uiEffects module from gameState`

### Verify
- Game plays identically. Hit numbers and gold drops appear and fade as before.

---

## Task 2 — Extract timers module (`timers.svelte.ts`)

### Problem
Boss timer and poison tick are interval-management concerns mixed into game logic. The boss timer callback has game-over logic baked in; poison tick calls `applyPoison` directly. These should be isolated timer managers with injected callbacks.

### What to do

**Create** `src/lib/stores/timers.svelte.ts`:
```ts
export function createTimers() {
    let bossTimer = $state(0);
    let bossInterval: ReturnType<typeof setInterval> | null = null;
    let poisonInterval: ReturnType<typeof setInterval> | null = null;

    function startBossTimer(maxTime: number, onExpire: () => void) {
        bossTimer = maxTime;
        if (bossInterval) clearInterval(bossInterval);
        bossInterval = setInterval(() => {
            bossTimer--;
            if (bossTimer <= 0) {
                stopBossTimer();
                onExpire();
            }
        }, 1000);
    }

    function stopBossTimer() {
        if (bossInterval) {
            clearInterval(bossInterval);
            bossInterval = null;
        }
        bossTimer = 0;
    }

    function pauseBossTimer() {
        if (bossInterval) {
            clearInterval(bossInterval);
            bossInterval = null;
        }
        // bossTimer value preserved for resume
    }

    function resumeBossTimer(onExpire: () => void) {
        if (bossTimer > 0 && !bossInterval) {
            bossInterval = setInterval(() => {
                bossTimer--;
                if (bossTimer <= 0) {
                    stopBossTimer();
                    onExpire();
                }
            }, 1000);
        }
    }

    function startPoisonTick(onTick: () => void) {
        if (poisonInterval) clearInterval(poisonInterval);
        poisonInterval = setInterval(onTick, 1000);
    }

    function stopPoisonTick() {
        if (poisonInterval) {
            clearInterval(poisonInterval);
            poisonInterval = null;
        }
    }

    function stopAll() {
        stopBossTimer();
        stopPoisonTick();
    }

    return {
        get bossTimer() { return bossTimer; },
        startBossTimer,
        stopBossTimer,
        pauseBossTimer,
        resumeBossTimer,
        startPoisonTick,
        stopPoisonTick,
        stopAll,
    };
}
```

**Modify** `src/lib/stores/gameState.svelte.ts`:
- Import `createTimers`.
- Replace `bossTimer`, `bossInterval`, `poisonInterval`, and all 6 timer functions with: `const timers = createTimers();`
- The game-over callback (currently inside `startBossTimer`) moves to the orchestrator as a function passed to `timers.startBossTimer(bossTimerMax, handleBossExpired)`.
- `applyPoison` stays in gameState (it touches enemy HP). The orchestrator passes it to `timers.startPoisonTick(applyPoison)`.
- Update getter: `get bossTimer() { return timers.bossTimer; }`.

### Steps
1. Create `timers.svelte.ts`.
2. Update `gameState.svelte.ts` to compose it. Wire callbacks.
3. Run `bun run check` — verify 0 errors.
4. Commit: `refactor: extract timers module from gameState`

### Verify
- Boss timer counts down and triggers game over.
- Poison ticks apply damage every second.
- Timers pause when modals are open, resume when closed.

---

## Task 3 — Extract persistence module (`persistence.svelte.ts`)

### Problem
Save/load logic is 6 functions (~130 lines) interleaved with game state. The `loadGame` function directly writes to ~15 state variables. Persistence should be a service that serializes/deserializes typed data, with the orchestrator applying the loaded data.

### What to do

**Create** `src/lib/stores/persistence.svelte.ts`:
```ts
// Pure persistence service — no $state, just localStorage operations.
// Returns typed data for the caller to apply.

export interface SessionSaveData {
    playerStats: PlayerStats;
    effects: Effect[];
    unlockedUpgradeIds: string[];
    xp: number;
    level: number;
    gold: number;
    stage: number;
    waveKills: number;
    enemiesKilled: number;
    enemyHealth: number;
    enemyMaxHealth: number;
    isBoss: boolean;
    isChest: boolean;
    isBossChest: boolean;
    timestamp: number;
}

export interface PersistentSaveData {
    gold: number;
    purchasedUpgradeIds: string[];
    executeCapBonus: number;
    goldPerKillBonus: number;
}

export function createPersistence(storageKey: string, persistentKey: string) {
    function saveSession(data: SessionSaveData): void { ... }
    function loadSession(): SessionSaveData | null { ... }
    function clearSession(): void { ... }
    function savePersistent(data: PersistentSaveData): void { ... }
    function loadPersistent(): PersistentSaveData | null { ... }
    function clearPersistent(): void { ... }

    return { saveSession, loadSession, clearSession, savePersistent, loadPersistent, clearPersistent };
}
```

**Modify** `src/lib/stores/gameState.svelte.ts`:
- Import `createPersistence`.
- Replace `SaveData`, `PersistentData` interfaces and 6 save/load functions.
- `saveGame()` becomes: `persistence.saveSession({ playerStats, effects, ... })`.
- `loadGame()` becomes: `const data = persistence.loadSession(); if (data) { /* apply fields */ }`.
- The `SaveData` → field migration logic (e.g. `executeThreshold` → `executeChance`) stays in the orchestrator's load path, not in the persistence module.

### Steps
1. Create `persistence.svelte.ts`.
2. Move save/load logic, keep migration in orchestrator.
3. Run `bun run check` — verify 0 errors.
4. Commit: `refactor: extract persistence module from gameState`

### Verify
- Save game, reload page — state is restored.
- Shop purchases persist across game overs.
- `clearSave()` and `fullReset()` work correctly.

---

## Task 4 — Extract enemy module (`enemy.svelte.ts`)

### Problem
Enemy HP, spawn selection, wave tracking, and boss/chest flags are scattered across `killEnemy()`, `spawnEnemy()`, `spawnBoss()`, `spawnChest()`, `spawnBossChest()`, and `spawnNextTarget()`. These are one concern: "what's the current target and how do we get the next one?"

### What to do

**Create** `src/lib/stores/enemy.svelte.ts`:
```ts
export function createEnemy() {
    let enemyHealth = $state(10);
    let enemyMaxHealth = $state(10);
    let enemiesKilled = $state(0);
    let isBoss = $state(false);
    let isChest = $state(false);
    let isBossChest = $state(false);
    let stage = $state(1);
    let waveKills = $state(0);

    function takeDamage(amount: number) {
        enemyHealth -= amount;
    }

    function isDead(): boolean {
        return enemyHealth <= 0;
    }

    function recordKill() {
        enemiesKilled++;
    }

    function spawnEnemy(greed: number) {
        isBoss = false;
        isChest = false;
        isBossChest = false;
        enemyMaxHealth = getEnemyHealth(stage, greed);
        enemyHealth = enemyMaxHealth;
    }

    function spawnBoss(greed: number) {
        isBoss = true;
        isChest = false;
        isBossChest = false;
        enemyMaxHealth = getBossHealth(stage, greed);
        enemyHealth = enemyMaxHealth;
    }

    function spawnChest(greed: number) { ... }
    function spawnBossChest(greed: number) { ... }

    function spawnNextTarget(stats: PlayerStats) {
        if (shouldSpawnChest(stats.chestChance, Math.random)) {
            spawnChest(stats.greed);
        } else {
            spawnEnemy(stats.greed);
        }
    }

    function advanceWave() {
        waveKills++;
    }

    function advanceStage() {
        stage++;
        waveKills = 0;
        isBoss = false;
    }

    function isWaveComplete(): boolean {
        return waveKills >= KILLS_PER_WAVE;
    }

    function reset(greed: number) {
        stage = 1;
        waveKills = 0;
        enemiesKilled = 0;
        isBoss = false;
        isChest = false;
        isBossChest = false;
        spawnEnemy(greed);
    }

    // For loading saved state
    function restore(data: { ... }) { ... }

    return {
        get enemyHealth() { return enemyHealth; },
        get enemyMaxHealth() { return enemyMaxHealth; },
        get enemiesKilled() { return enemiesKilled; },
        get isBoss() { return isBoss; },
        get isChest() { return isChest; },
        get isBossChest() { return isBossChest; },
        get stage() { return stage; },
        get waveKills() { return waveKills; },
        takeDamage,
        isDead,
        recordKill,
        spawnEnemy,
        spawnBoss,
        spawnChest,
        spawnBossChest,
        spawnNextTarget,
        advanceWave,
        advanceStage,
        isWaveComplete,
        reset,
        restore,
    };
}
```

**Modify** `src/lib/stores/gameState.svelte.ts`:
- Import `createEnemy`.
- Replace: `enemyHealth`, `enemyMaxHealth`, `enemiesKilled`, `isBoss`, `isChest`, `isBossChest`, `stage`, `waveKills`, and all 5 spawn functions.
- `killEnemy()` now calls: `enemy.recordKill()`, `enemy.advanceWave()`, `enemy.advanceStage()`, `enemy.spawnNextTarget(playerStats)`, etc.
- `attack()` calls: `enemy.takeDamage(result.totalDamage)`, checks `enemy.isDead()`.

### Steps
1. Create `enemy.svelte.ts`.
2. Refactor `gameState.svelte.ts` to use it.
3. Run `bun run check` — verify 0 errors.
4. Commit: `refactor: extract enemy module from gameState`

### Verify
- Enemies spawn with correct health per stage.
- Wave → boss transition works.
- Chest/boss chest spawning works.
- Stage advances after boss kill.

---

## Task 5 — Extract leveling module (`leveling.svelte.ts`)

### Problem
XP accumulation, level-up detection, pending level-up queue, and upgrade choice generation are mixed into `killEnemy()` and `startLevelUp()`. This is a self-contained progression system.

### What to do

**Create** `src/lib/stores/leveling.svelte.ts`:
```ts
export function createLeveling() {
    let xp = $state(0);
    let level = $state(1);
    let pendingLevelUps = $state(0);
    let upgradeChoices = $state<Upgrade[]>([]);
    let showLevelUp = $state(false);

    let xpToNextLevel = $derived(getXpToNextLevel(level));

    function addXp(amount: number) {
        xp += amount;
    }

    function checkLevelUp(luckyChance: number, executeChance: number, executeCap: number, poison: number): boolean {
        const MAX_LEVELUPS = 100;
        let leveled = false;
        for (let i = 0; i < MAX_LEVELUPS && xp >= getXpToNextLevel(level); i++) {
            pendingLevelUps++;
            xp -= getXpToNextLevel(level);
            level++;
            leveled = true;
        }
        if (leveled && !showLevelUp) {
            upgradeChoices = getRandomUpgrades(3, luckyChance, executeChance, executeCap, poison);
            showLevelUp = true;
        }
        return leveled && showLevelUp;
    }

    function consumeLevelUp(luckyChance: number, executeChance: number, executeCap: number, poison: number): boolean {
        pendingLevelUps = Math.max(0, pendingLevelUps - 1);
        if (pendingLevelUps > 0) {
            upgradeChoices = getRandomUpgrades(3, luckyChance, executeChance, executeCap, poison);
            return false; // more pending
        }
        showLevelUp = false;
        return true; // all consumed
    }

    // For chest loot (shares upgradeChoices)
    function setChoices(choices: Upgrade[]) {
        upgradeChoices = choices;
    }

    function reset() {
        xp = 0;
        level = 1;
        pendingLevelUps = 0;
        upgradeChoices = [];
        showLevelUp = false;
    }

    function restore(data: { xp: number; level: number }) {
        xp = data.xp;
        level = data.level;
    }

    return {
        get xp() { return xp; },
        get level() { return level; },
        get xpToNextLevel() { return xpToNextLevel; },
        get pendingLevelUps() { return pendingLevelUps; },
        get upgradeChoices() { return upgradeChoices; },
        get showLevelUp() { return showLevelUp; },
        addXp,
        checkLevelUp,
        consumeLevelUp,
        setChoices,
        reset,
        restore,
    };
}
```

**Modify** `src/lib/stores/gameState.svelte.ts`:
- Import `createLeveling`.
- Replace: `xp`, `level`, `pendingLevelUps`, `upgradeChoices`, `showLevelUp`, `xpToNextLevel`, and `startLevelUp()`.
- `selectUpgrade()` calls `leveling.consumeLevelUp(...)` to determine if modal should close.
- Chest loot uses `leveling.setChoices(...)` then `showChestLoot = true`.

### Steps
1. Create `leveling.svelte.ts`.
2. Refactor `gameState.svelte.ts` to use it.
3. Run `bun run check` — verify 0 errors.
4. Commit: `refactor: extract leveling module from gameState`

### Verify
- XP accumulates, level-ups trigger.
- Multiple pending level-ups queue correctly.
- Upgrade choices appear and selection applies stats.

---

## Task 6 — Extract shop module (`shop.svelte.ts`)

### Problem
Shop logic (persistent gold, purchases, pricing, shop UI state) is independent of combat but tangled into the same closure. It even has its own persistence that should compose with the persistence module.

### What to do

**Create** `src/lib/stores/shop.svelte.ts`:
```ts
export function createShop(persistence: ReturnType<typeof createPersistence>) {
    let persistentGold = $state(0);
    let purchasedUpgrades = $state<Set<string>>(new Set());
    let executeCapBonus = $state(0);
    let goldPerKillBonus = $state(0);
    let showShop = $state(false);
    let shopChoices = $state<Upgrade[]>([]);

    function open() { ... }
    function close() { ... }
    function buy(upgrade: Upgrade): boolean { ... }
    function getPrice(upgrade: Upgrade): number { ... }
    function depositGold(amount: number) {
        persistentGold += amount;
        save();
    }
    function applyPurchasedUpgrades(stats: PlayerStats, unlocked: Set<string>): Set<string> { ... }
    function save() { persistence.savePersistent({ ... }); }
    function load() { const data = persistence.loadPersistent(); ... }
    function fullReset() { ... persistence.clearPersistent(); }

    return {
        get persistentGold() { return persistentGold; },
        get purchasedUpgrades() { return purchasedUpgrades; },
        get executeCapBonus() { return executeCapBonus; },
        get goldPerKillBonus() { return goldPerKillBonus; },
        get executeCapLevel() { ... },
        get goldPerKillLevel() { ... },
        get showShop() { return showShop; },
        get shopChoices() { return shopChoices; },
        open, close, buy, getPrice,
        depositGold, applyPurchasedUpgrades,
        save, load, fullReset,
    };
}
```

**Modify** `src/lib/stores/gameState.svelte.ts`:
- Import `createShop`.
- Replace all persistent/shop state and functions.
- `handleBossExpired()` calls `shop.depositGold(gold)`.
- `init()` calls `shop.load()` then `shop.applyPurchasedUpgrades(playerStats, unlockedUpgrades)`.

### Steps
1. Create `shop.svelte.ts`.
2. Refactor `gameState.svelte.ts` to use it.
3. Run `bun run check` — verify 0 errors.
4. Commit: `refactor: extract shop module from gameState`

### Verify
- Shop opens, shows correct prices, purchases work.
- Persistent gold transfers on game over.
- Purchased upgrades apply on new game.
- Full reset clears everything.

---

## Task 7 — Slim down orchestrator and remove try/finally

### Problem
After Tasks 1-6, `gameState.svelte.ts` should be ~200 lines — a composition root that wires modules together. The `killEnemy()` function should now be a short orchestration sequence of module calls. With each step being a simple module call that can't leave the system in a broken state, the try/finally and re-entry guard become unnecessary overhead.

### What to do

**Review** `gameState.svelte.ts` after all extractions:
- Verify `killEnemy()` is now a short sequence of module method calls (each idempotent/safe).
- If any module call could leave another module in an inconsistent state on failure, keep the guard. Otherwise, remove the `killingEnemy` flag and try/finally.
- Remove the `isModalOpen()` helper if it's only used in one place, or move it to a shared utility.
- Ensure the remaining orchestrator state is minimal: `playerStats`, `effects`, `unlockedUpgrades`, `gold`, `overkillDamage`, `poisonStacks`, `showGameOver`, `showChestLoot`, `chestGold`.
- Clean up imports — remove anything that moved to sub-modules.

**Evaluate the re-entry guard:**
- `killingEnemy` exists because `attack()` and `applyPoison()` could both trigger `killEnemy()` in the same tick.
- After extraction, `enemy.isDead()` is checked before calling `killEnemy()`. If `killEnemy()` sets `enemy.health` to the new enemy's health (via spawn), a second call would see a live enemy and exit early.
- If this natural guard is sufficient, remove the flag. If not (e.g. spawn is async or deferred), keep it but document why.

### Steps
1. Review the orchestrator after Tasks 1-6.
2. Evaluate whether the re-entry guard is still needed.
3. Remove dead code and simplify.
4. Run `bun run check` — verify 0 errors.
5. Commit: `refactor: slim orchestrator and evaluate re-entry guard`

### Verify
- Full gameplay works end-to-end.
- Rapid clicking during enemy kills doesn't cause double-kill bugs.
- All modals (level-up, chest, game over, shop) function correctly.

---

## Task 8 — Add tests for extracted modules

### Problem
The modules are now independently testable — they have narrow interfaces and no DOM dependencies. We should add tests to lock down their behavior.

### What to do

**Create** `src/lib/stores/uiEffects.test.ts`:
- Test `addHits` appends and auto-removes after timeout.
- Test `addGoldDrop` appends and auto-removes.
- Test `reset` clears both arrays.
- Test rapid adds produce multiple concurrent items.

**Create** `src/lib/stores/timers.test.ts`:
- Test `startBossTimer` counts down and calls `onExpire`.
- Test `pauseBossTimer` preserves value, `resumeBossTimer` continues.
- Test `stopBossTimer` zeroes the timer.
- Test `startPoisonTick` calls `onTick` at 1s intervals.

**Create** `src/lib/stores/enemy.test.ts`:
- Test `spawnEnemy`, `spawnBoss`, `spawnChest` set correct health.
- Test `takeDamage` and `isDead`.
- Test `advanceWave` and `isWaveComplete`.
- Test `advanceStage` increments stage and resets wave kills.

**Create** `src/lib/stores/leveling.test.ts`:
- Test `addXp` and `checkLevelUp` with single/multi level-ups.
- Test `consumeLevelUp` queue behavior.

**Create** `src/lib/stores/shop.test.ts`:
- Test `buy` deducts gold and adds upgrade.
- Test `getPrice` scales with purchases.
- Test `depositGold`.
- Test `applyPurchasedUpgrades` applies all owned upgrades.

### Steps
1. Create test files for each module.
2. Run `bun test` — verify all pass.
3. Commit: `test: add unit tests for extracted game state modules`

### Verify
- `bun test` passes with 0 failures.
- Each module has at least 3-4 test cases.

---

## Summary

| Task | What changes | Key files | Risk |
|------|-------------|-----------|------|
| 1 | UI effects → own module | uiEffects.svelte.ts, gameState.svelte.ts | Low — standalone, no cross-deps |
| 2 | Timers → own module | timers.svelte.ts, gameState.svelte.ts | Medium — callback wiring for boss expire |
| 3 | Persistence → own module | persistence.svelte.ts, gameState.svelte.ts | Low — pure service, no $state |
| 4 | Enemy → own module | enemy.svelte.ts, gameState.svelte.ts | Medium — most references to refactor |
| 5 | Leveling → own module | leveling.svelte.ts, gameState.svelte.ts | Medium — upgrade selection + modal state |
| 6 | Shop → own module | shop.svelte.ts, gameState.svelte.ts | Medium — persistent state + pricing |
| 7 | Slim orchestrator | gameState.svelte.ts | Low — cleanup after extractions |
| 8 | Unit tests | 5 test files | None — additive only |

Execute in order. Each task is independently committable and the game should work identically after each step. Task 7 depends on all prior tasks. Task 8 can be done after any subset of 1-6 (just test whatever has been extracted).
