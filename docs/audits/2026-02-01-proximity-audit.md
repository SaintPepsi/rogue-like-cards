# Proximity Audit — 2026-02-01

**Scope:** Full `src/` directory, all 10 proximity principles
**Findings:** 23 across 6 principles

## Decision Archaeology (8 findings)

### Finding 1
- **File:** `src/lib/engine/waves.ts:1`
- **Violation:** `KILLS_PER_WAVE = 5` has no rationale for why 5 was chosen over 3, 7, or 10. This is a core gameplay constant that directly affects pacing.
- **Suggested fix:** Add a DECISION comment explaining why 5 kills per wave was chosen (e.g., playtesting data, target time-per-stage).

### Finding 2
- **File:** `src/lib/engine/waves.ts:2`
- **Violation:** `BASE_BOSS_TIME = 30` has no rationale for the 30-second timer. This determines whether runs end or continue.
- **Suggested fix:** Add a DECISION comment explaining why 30 seconds was chosen (e.g., measured average boss kill time, desired tension level).

### Finding 3
- **File:** `src/lib/engine/waves.ts:9`
- **Violation:** `Math.pow(1.5, stage - 1)` uses 1.5 as the exponential growth base with no explanation for why 1.5 was chosen over 1.3 or 2.0. The `SOFT_CAP_STAGE = 100` threshold is also unexplained.
- **Suggested fix:** Add a DECISION comment documenting why 1.5x per stage was chosen and why 100 is the soft cap threshold (e.g., "prevents floating-point overflow at stage ~700 with 1.5 base").

### Finding 4
- **File:** `src/lib/engine/waves.ts:78-86`
- **Violation:** `getXpToNextLevel` uses base value 25 with 1.5 exponential growth. The economy sim test file duplicates this formula with a configurable base, suggesting 25 was a deliberate choice over 10, but the production code has no rationale.
- **Suggested fix:** Add a DECISION comment explaining why base XP was set to 25 (e.g., "Rebalanced from 10 to reduce early-game level-up spam. See economy-sim results").

### Finding 5
- **File:** `src/lib/engine/shop.ts:3-9`
- **Violation:** `RARITY_BASE_PRICES` maps (common=25, uncommon=50, rare=100, epic=175, legendary=300) with no explanation for the pricing curve. `PURCHASE_MULTIPLIER = 1.5` also lacks rationale.
- **Suggested fix:** Add a DECISION comment explaining the price progression and why 1.5x scaling per purchase was chosen (e.g., "Roughly 2x per rarity tier. 1.5x repeat-purchase scaling prevents stockpiling common cards").

### Finding 6
- **File:** `src/lib/data/upgrades.ts:525-541`
- **Violation:** `RARITY_TIER_CHANCES` (67/22/7/3/1) and `LUCKY_TIER_BONUS` (-20/5/7/5/3) are critical gameplay constants with no explanation for why these specific distributions were chosen.
- **Suggested fix:** Add a DECISION comment explaining the probability design (e.g., "Each tier is roughly 1/3 the previous. Measured: average player sees 1 legendary per ~100 draws").

### Finding 7
- **File:** `src/lib/engine/stats.ts:8`
- **Violation:** `critMultiplier: 1.5` as the base crit multiplier has no rationale. Same for `poisonMaxStacks: 5`, `poisonDuration: 5`, `chestChance: 0.05`, `bossChestChance: 0.001`, `goldDropChance: 0.10`, `attackSpeed: 0.8`, `tapFrenzyBonus: 0.05`, `tapFrenzyDuration: 3`, and `executeCap: 0.1`. These are all crucial balance constants.
- **Suggested fix:** Add DECISION comments to the most impactful defaults (at minimum `attackSpeed`, `executeCap`, `chestChance`, `bossChestChance`) explaining the design intent.

### Finding 8
- **File:** `src/lib/stores/uiEffects.svelte.ts:18,27`
- **Violation:** Animation durations 700ms (hit numbers) and 1200ms (gold drops) are magic numbers with no rationale for the specific timing.
- **Suggested fix:** Extract to named constants with a brief comment explaining the timing choice (e.g., "700ms matches the CSS animation duration in HitNumber.svelte").

## Three-Strikes Abstraction (5 findings)

### Finding 1
- **File:** `src/lib/stores/gameState.svelte.ts:378-395` and `src/lib/stores/gameState.svelte.ts:426-443`
- **Violation:** The `gameLoop.start()` callback object is constructed identically in both `resetGame()` and `init()`. The `onFrenzyChanged` callback (lines 382-389 and 430-437) is a 7-line block duplicated verbatim.
- **Suggested fix:** Extract the callback object construction into a helper function (e.g., `buildGameLoopCallbacks()`) called from both `resetGame()` and `init()`.

### Finding 2
- **File:** `src/lib/stores/statPipeline.svelte.ts:87-95` and `src/lib/stores/statPipeline.svelte.ts:97-105`
- **Violation:** `acquireUpgrade()` and `setAcquiredUpgrades()` both contain the same 4-line pattern: iterate `acquiredUpgradeIds`, look up each card in `allUpgrades`, collect modifiers, then call `rebuildLayer(LAYER_PERMANENT, allMods)`.
- **Suggested fix:** Extract the modifier-collection logic into a private helper (e.g., `collectPermanentModifiers()`) and call it from both functions.

### Finding 3
- **File:** `src/lib/stores/enemy.svelte.ts:49-55`, `src/lib/stores/enemy.svelte.ts:57-63`, `src/lib/stores/enemy.svelte.ts:65-70`, `src/lib/stores/enemy.svelte.ts:72-77`
- **Violation:** `spawnEnemy()`, `spawnBoss()`, `spawnChest()`, and `spawnBossChest()` all follow the same pattern: set boolean flags, compute health via a `get*Health()` function, assign to `enemyMaxHealth` and `enemyHealth`. Four occurrences of the same structure.
- **Suggested fix:** Extract a private `spawn(flags, healthFn)` helper that sets the flags and health, then have each public method delegate to it.

### Finding 4
- **File:** `src/lib/engine/economy-sim.test.ts:41-49` and `src/lib/engine/waves.ts:78-87`
- **Violation:** `xpToNextLevel()` in the economy sim test file is a near-exact copy of `getXpToNextLevel()` in `waves.ts`, differing only in the configurable `base` parameter. The production function hardcodes 25.
- **Suggested fix:** Parameterize `getXpToNextLevel()` in `waves.ts` to accept an optional base (defaulting to 25), then import it in the economy sim test instead of duplicating.

### Finding 5
- **File:** `src/lib/stores/persistence.svelte.ts:38-43`, `src/lib/stores/persistence.svelte.ts:46-54`, `src/lib/stores/persistence.svelte.ts:57-63`, `src/lib/stores/persistence.svelte.ts:65-70`, `src/lib/stores/persistence.svelte.ts:73-82`, `src/lib/stores/persistence.svelte.ts:84-90`
- **Violation:** Six functions all follow the identical `try { localStorage.X(...) } catch (e) { console.warn('Failed to ...', e) }` pattern. The only variation is the operation and warning message.
- **Suggested fix:** Extract a private `safeStorage<T>(fn: () => T, fallback: T, errorMsg: string): T` helper that wraps the try/catch, then have each function call it.

## Decision Archaeology (Config Near Usage overlap) (4 findings)

Note: These overlap with Config Near Usage but are distinct because they involve constants separated from their consumers.

### Finding 1
- **File:** `src/lib/data/upgrades.ts:487-488` and `src/lib/stores/shop.svelte.ts:2`
- **Violation:** `EXECUTE_CHANCE_BASE_CAP`, `EXECUTE_CAP_BONUS_PER_LEVEL`, and `GOLD_PER_KILL_BONUS_PER_LEVEL` are defined in `upgrades.ts` but primarily consumed in `shop.svelte.ts`. The shop imports these constants from the data module.
- **Suggested fix:** Move these constants to `shop.svelte.ts` (or `engine/shop.ts`) where they are actually used, since they control shop pricing/behavior, not upgrade card data.

### Finding 2
- **File:** `src/lib/engine/waves.ts:46-48` consumed in `src/lib/stores/gameState.svelte.ts:8-9`
- **Violation:** `XP_PER_HEALTH`, `BOSS_XP_MULTIPLIER`, and `CHEST_XP_MULTIPLIER` are exported from `waves.ts` but only consumed in `gameState.svelte.ts`. They control XP reward calculation but live in the wave/health module.
- **Suggested fix:** These are acceptable since `getXpReward()` lives in the same file and uses `XP_PER_HEALTH`. However, `BOSS_XP_MULTIPLIER` and `CHEST_XP_MULTIPLIER` are only passed as arguments from `gameState` -- consider moving them closer to the call site or making them parameters of the function.

### Finding 3
- **File:** `src/lib/engine/stats.ts:33`
- **Violation:** `BASE_STATS` is defined in `engine/stats.ts` but consumed in three separate modules: `statPipeline.svelte.ts`, `statPipeline.test.ts`, and `engine/statPipeline.ts`. This is reasonable for a shared constant, but `statRegistry` (lines 51-74) mixes stat display formatting with stat default values in the same module.
- **Suggested fix:** This is a potential violation. `statRegistry` is a UI display concern (icons, labels, formatters) colocated with engine default values. Consider whether `statRegistry` belongs closer to the StatsPanel component that renders it.

### Finding 4
- **File:** `src/lib/stores/gameLoop.svelte.ts:32-34`
- **Violation:** Default values `getAttackSpeed = () => 0.8`, `getTapFrenzyBonus = () => 0.05`, `getTapFrenzyDuration = () => 3` duplicate the defaults from `engine/stats.ts` without referencing them. If the base stats change, these fallbacks would silently diverge.
- **Suggested fix:** Import `BASE_STATS` and use it for the defaults: `let getAttackSpeed = () => BASE_STATS.attackSpeed`.

## Performance Annotations (3 findings)

### Finding 1
- **File:** `src/lib/engine/statPipeline.ts:17-29`
- **Violation:** The `WeakMap`-based memoisation cache and `LayerCache` system is a performance optimization with no benchmark data. The comment on line 17-18 explains _what_ it prevents but not _why_ memoisation was chosen or how much it improves performance.
- **Suggested fix:** Add a PERFORMANCE comment with measured impact (e.g., "Memoisation avoids recomputing N layers on every stat read. Benchmarked: 5x fewer computations during rapid combat ticks").

### Finding 2
- **File:** `src/lib/data/upgrades.ts:496`
- **Violation:** `upgradeMap = new Map<string, Upgrade>(allUpgrades.map(...))` pre-builds a Map for O(1) lookups but has no performance annotation explaining why a Map was chosen over a simple `Array.find()`.
- **Suggested fix:** Add a brief PERFORMANCE comment (e.g., "Map for O(1) lookup by ID, called on every save/load cycle").

### Finding 3
- **File:** `src/lib/engine/timerRegistry.ts:28-29`
- **Violation:** `maxRounds = 50` and `maxIterations = 100` are safety bounds on iteration with no explanation of why these specific limits were chosen or what pathological scenarios they prevent.
- **Suggested fix:** Add comments explaining the bounds (e.g., "50 rounds prevents infinite cascading timer re-registrations. In practice, 2-3 rounds suffice.").

## Error Context at Source (2 findings)

### Finding 1
- **File:** `src/lib/stores/persistence.svelte.ts:42,52,60,68,78,87`
- **Violation:** All six catch blocks use generic messages like `'Failed to save game'`, `'Failed to load game'`, `'Failed to clear save'`. None provide context about what might have caused the failure (e.g., localStorage quota exceeded, corrupted JSON, private browsing mode).
- **Suggested fix:** Add error context to the warnings. For example: `console.warn('Failed to save game (localStorage may be full or unavailable):', e)` for save operations, and `console.warn('Failed to load game (corrupted save data?):', e)` for load operations.

### Finding 2
- **File:** `src/lib/engine/systemPipeline.ts:17`
- **Violation:** `payload: any` on `PipelineEffect` type means effects carry untyped data. When `handleEffect` receives an effect, there is no type safety or error handling if the payload shape is wrong.
- **Suggested fix:** This is a potential violation flagged as "ambiguous." The `any` type here is intentional for extensibility, but adding a runtime guard in `handleEffect` implementations (like `poison.ts:51`) with a clear error message would improve debuggability.

## Temporal Proximity (1 finding)

### Finding 1
- **File:** `src/lib/types.ts` and `src/lib/engine/stats.ts`
- **Violation:** `PlayerStats` is defined in `types.ts` and `BASE_STATS`/`createDefaultStats()` is in `engine/stats.ts`. These two files change together frequently (both modified in the same commits when stats are added). `types.ts` also contains `HitType`, `HitInfo`, and `GoldDrop` which are consumed exclusively by UI stores and components, not the engine.
- **Suggested fix:** Consider moving `PlayerStats` into `engine/stats.ts` alongside its default values, since they always change together. Alternatively, move `HitInfo`/`GoldDrop`/`HitType` out of `types.ts` and closer to their consumers (`uiEffects.svelte.ts`, `BattleArea.svelte`).

## Behavior Over Structure (0 findings)

The codebase is well-organized by behavior domain: `engine/`, `systems/`, `stores/`, `components/`, `data/`. No layer-based anti-patterns (`controllers/`, `models/`, `validators/`).

## Test Colocation (0 findings)

All test files are colocated next to their source files. Every `*.ts` with tests has a `*.test.ts` in the same directory. Component tests use `*.svelte.test.ts` alongside their `.svelte` files.

## Security Annotations (0 findings)

This is a client-side game with no user-generated HTML, no authentication, and no sensitive data handling. No security-sensitive code was identified that would warrant annotations.

## Deprecation at Source (0 findings)

No deprecated code was found. No functions marked for removal.

---

**Summary by principle:**

| Principle | Findings |
|-----------|----------|
| Decision Archaeology | 8 |
| Three-Strikes Abstraction | 5 |
| Config Near Usage | 4 |
| Performance Annotations | 3 |
| Error Context at Source | 2 |
| Temporal Proximity | 1 |
| Test Colocation | 0 |
| Behavior Over Structure | 0 |
| Security Annotations | 0 |
| Deprecation at Source | 0 |
| **Total** | **23** |

Ready to resolve these? Use proximity-resolve with this audit file.
