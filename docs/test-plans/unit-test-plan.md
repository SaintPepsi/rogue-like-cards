# Attack Category Counter - Unit Test Plan

## Overview

This document outlines the unit test plan for the Attack Category Counter feature. Tests are organized by module, with colocated test files following the project convention (`foo.test.ts` next to `foo.ts`).

**Framework:** Vitest
**Test Runner Command:** `bun run test`

## Requirements Summary

From the design document, the feature requires:

1. Track attack counts by category: `normal`, `crit`, `execute`, `poison`, `poisonCrit`
2. Display counts in battle-stats section (non-zero only)
3. Persist counts to SessionSaveData and restore on page refresh
4. Reset counts to zero when starting a new run
5. Display counts on Game Over screen

## Test Modules

---

### 1. Attack Counts State Management

**File to Test:** `src/lib/stores/gameState.svelte.ts`
**Test File:** `src/lib/stores/attackCounts.test.ts` (new module) or extend `gameState.test.ts`

The attack counts functionality will be added to gameState. Tests should verify the state management logic.

#### Test Cases

| #    | Description                                  | Setup                         | Action                                    | Assertions                               | Category   |
| ---- | -------------------------------------------- | ----------------------------- | ----------------------------------------- | ---------------------------------------- | ---------- |
| 1.1  | Initial state - all categories start at zero | Create fresh game state       | Access `attackCounts`                     | All values are 0 or empty object `{}`    | Happy Path |
| 1.2  | Increment normal hit                         | Fresh state                   | Call increment with `normal` type         | `attackCounts.normal === 1`              | Happy Path |
| 1.3  | Increment crit hit                           | Fresh state                   | Call increment with `crit` type           | `attackCounts.crit === 1`                | Happy Path |
| 1.4  | Increment execute hit                        | Fresh state                   | Call increment with `execute` type        | `attackCounts.execute === 1`             | Happy Path |
| 1.5  | Increment poison hit                         | Fresh state                   | Call increment with `poison` type         | `attackCounts.poison === 1`              | Happy Path |
| 1.6  | Increment poisonCrit hit                     | Fresh state                   | Call increment with `poisonCrit` type     | `attackCounts.poisonCrit === 1`          | Happy Path |
| 1.7  | Multiple increments same category            | Fresh state                   | Call increment `normal` 5 times           | `attackCounts.normal === 5`              | Happy Path |
| 1.8  | Multiple categories independently tracked    | Fresh state                   | Increment normal 3x, crit 2x, poison 1x   | `normal === 3, crit === 2, poison === 1` | Happy Path |
| 1.9  | Reset clears all counts                      | State with counts             | Call reset                                | All counts are 0 or empty object         | Happy Path |
| 1.10 | Reset preserves structure for new counting   | State with counts, then reset | Increment after reset                     | Counts from 1, not from previous values  | Regression |
| 1.11 | Rapid increments - 100 normal hits           | Fresh state                   | Increment normal 100 times in loop        | `attackCounts.normal === 100`            | Edge Case  |
| 1.12 | Mixed rapid increments                       | Fresh state                   | Interleave 50 normal, 30 crit, 20 execute | Correct counts for each                  | Edge Case  |

---

### 2. Attack Count Increment Integration

**File to Test:** `src/lib/stores/gameState.svelte.ts`
**Test File:** `src/lib/stores/gameState.test.ts` (extend existing)

Tests verifying attack counts are incremented at the correct points during gameplay.

#### Test Cases

| #   | Description                             | Setup                                      | Action               | Assertions                         | Category    |
| --- | --------------------------------------- | ------------------------------------------ | -------------------- | ---------------------------------- | ----------- |
| 2.1 | Normal attack increments normal count   | Mock pipeline to return `hit` type         | Call `attack()`      | `attackCounts.normal` incremented  | Integration |
| 2.2 | Crit attack increments crit count       | Mock pipeline to return `criticalHit` type | Call `attack()`      | `attackCounts.crit` incremented    | Integration |
| 2.3 | Execute attack increments execute count | Mock pipeline to return `executeHit` type  | Call `attack()`      | `attackCounts.execute` incremented | Integration |
| 2.4 | Poison tick increments poison count     | Mock tick to return poison damage          | Call `tickSystems()` | `attackCounts.poison` incremented  | Integration |
| 2.5 | Multi-strike increments multiple times  | Mock pipeline for 3-strike multi-hit       | Call `attack()`      | Count increments by 3              | Edge Case   |
| 2.6 | Mixed multi-strike (1 normal, 2 crit)   | Mock pipeline returning mixed types        | Call `attack()`      | `normal += 1, crit += 2`           | Edge Case   |
| 2.7 | No increment when modal is open         | Game over modal open                       | Call `attack()`      | Counts unchanged                   | Boundary    |
| 2.8 | No increment when enemy is dead         | Enemy at 0 health                          | Call `attack()`      | Counts unchanged                   | Boundary    |

---

### 3. Persistence - Save and Load

**File to Test:** `src/lib/stores/persistence.svelte.ts`
**Test File:** `src/lib/stores/persistence.test.ts` (extend existing)

Tests for the `attackCounts` field in `SessionSaveData`.

#### Test Cases

| #   | Description                                   | Setup                                 | Action                                     | Assertions                            | Category   |
| --- | --------------------------------------------- | ------------------------------------- | ------------------------------------------ | ------------------------------------- | ---------- |
| 3.1 | Save attackCounts to session                  | State with counts                     | Call `saveGame()`                          | SessionSaveData contains attackCounts | Happy Path |
| 3.2 | Load attackCounts from session                | Saved data with attackCounts          | Call `loadGame()`                          | State reflects saved counts           | Happy Path |
| 3.3 | Load missing attackCounts (legacy save)       | Saved data without attackCounts field | Call `loadGame()`                          | Defaults to empty/zero counts         | Migration  |
| 3.4 | Save empty attackCounts                       | Fresh state, no attacks               | Call `saveGame()`                          | SessionSaveData contains empty object | Boundary   |
| 3.5 | Round-trip save/load preserves all categories | State with all 5 categories non-zero  | Save then load                             | All 5 categories match original       | Happy Path |
| 3.6 | Session clear removes attackCounts            | Saved data                            | Call `clearSession()` then `loadSession()` | Returns null/no attackCounts          | Happy Path |

---

### 4. Reset Behavior

**File to Test:** `src/lib/stores/gameState.svelte.ts`
**Test File:** `src/lib/stores/gameState.test.ts` (extend existing)

Tests verifying attack counts reset correctly when starting a new run.

#### Test Cases

| #   | Description                     | Setup                   | Action                | Assertions                    | Category   |
| --- | ------------------------------- | ----------------------- | --------------------- | ----------------------------- | ---------- |
| 4.1 | resetGame clears attackCounts   | State with counts       | Call `resetGame()`    | All counts are 0/empty        | Happy Path |
| 4.2 | fullReset clears attackCounts   | State with counts       | Call `fullReset()`    | All counts are 0/empty        | Happy Path |
| 4.3 | Counts accumulate after reset   | Reset, then new attacks | Increment after reset | New counts only, no carryover | Regression |
| 4.4 | Game over does not reset counts | State with counts       | Trigger game over     | Counts preserved for display  | Edge Case  |

---

### 5. UI Display Logic - formatAttackType

**File to Test:** `src/lib/components/BattleArea.svelte` (or extracted utility)
**Test File:** `src/lib/components/BattleArea.svelte.test.ts` (extend existing)

Tests for the display label formatting function.

#### Test Cases

| #   | Description         | Setup | Action                           | Assertions                        | Category   |
| --- | ------------------- | ----- | -------------------------------- | --------------------------------- | ---------- |
| 5.1 | Format normal       | N/A   | `formatAttackType('normal')`     | Returns `'Normal Hits'`           | Happy Path |
| 5.2 | Format crit         | N/A   | `formatAttackType('crit')`       | Returns `'Critical Hits'`         | Happy Path |
| 5.3 | Format execute      | N/A   | `formatAttackType('execute')`    | Returns `'Executes'`              | Happy Path |
| 5.4 | Format poison       | N/A   | `formatAttackType('poison')`     | Returns `'Poison Ticks'`          | Happy Path |
| 5.5 | Format poisonCrit   | N/A   | `formatAttackType('poisonCrit')` | Returns `'Poison Crits'`          | Happy Path |
| 5.6 | Format unknown type | N/A   | `formatAttackType('unknown')`    | Returns `'unknown'` (passthrough) | Edge Case  |

---

### 6. UI Rendering - BattleArea

**File to Test:** `src/lib/components/BattleArea.svelte`
**Test File:** `src/lib/components/BattleArea.svelte.test.ts` (extend existing)

Component tests for attack count display in battle stats.

#### Test Cases

| #   | Description                | Setup                                         | Action           | Assertions                           | Category   |
| --- | -------------------------- | --------------------------------------------- | ---------------- | ------------------------------------ | ---------- |
| 6.1 | Shows non-zero counts      | attackCounts with normal=10                   | Render component | Displays "Normal Hits: 10"           | Happy Path |
| 6.2 | Hides zero counts          | attackCounts with only normal=5, crit=0       | Render component | Only shows Normal Hits, not Critical | Happy Path |
| 6.3 | Shows multiple categories  | attackCounts with normal=10, crit=5, poison=3 | Render component | All three displayed                  | Happy Path |
| 6.4 | Empty counts shows nothing | attackCounts is empty object                  | Render component | No attack breakdown section          | Boundary   |
| 6.5 | Large numbers formatted    | attackCounts.normal = 1234567                 | Render component | Uses formatNumber (e.g., "1.23M")    | Edge Case  |
| 6.6 | Updates in real-time       | Initial normal=5, then 6                      | Increment count  | Display updates to 6                 | Happy Path |

---

### 7. UI Rendering - GameOverModal

**File to Test:** `src/lib/components/GameOverModal.svelte`
**Test File:** `src/lib/components/GameOverModal.svelte.test.ts` (extend existing)

Component tests for attack count display on game over screen.

#### Test Cases

| #   | Description                         | Setup                                  | Action                        | Assertions                       | Category   |
| --- | ----------------------------------- | -------------------------------------- | ----------------------------- | -------------------------------- | ---------- |
| 7.1 | Shows attack breakdown on game over | attackCounts with normal=100, crit=25  | Render with showGameOver=true | Attack breakdown section visible | Happy Path |
| 7.2 | Hides zero counts on game over      | attackCounts with normal=100, poison=0 | Render                        | Only shows Normal Hits           | Happy Path |
| 7.3 | Shows all non-zero categories       | All 5 categories non-zero              | Render                        | All 5 displayed                  | Happy Path |
| 7.4 | Empty counts shows no breakdown     | attackCounts is empty                  | Render                        | No attack breakdown section      | Boundary   |
| 7.5 | Large numbers formatted             | attackCounts.normal = 9999999          | Render                        | Formatted correctly              | Edge Case  |

---

### 8. Type Safety

**File to Test:** `src/lib/types.ts` and `src/lib/stores/persistence.svelte.ts`
**Test File:** Type-level tests (compile-time verification)

Verify TypeScript types are correctly defined.

#### Test Cases

| #   | Description                                    | Setup | Action                      | Assertions                                         | Category    |
| --- | ---------------------------------------------- | ----- | --------------------------- | -------------------------------------------------- | ----------- |
| 8.1 | AttackCounts type is Record<string, number>    | N/A   | Type check                  | No compile errors                                  | Type Safety |
| 8.2 | SessionSaveData includes optional attackCounts | N/A   | Assign without attackCounts | No compile errors                                  | Type Safety |
| 8.3 | HitType union includes all tracked types       | N/A   | Check type definition       | Contains normal, crit, execute, poison, poisonCrit | Type Safety |

---

## Coverage Summary

| Category    | Count                  | Percentage |
| ----------- | ---------------------- | ---------- |
| Happy Path  | 24                     | 53%        |
| Edge Case   | 10                     | 22%        |
| Boundary    | 5                      | 11%        |
| Integration | 3                      | 7%         |
| Migration   | 1                      | 2%         |
| Regression  | 2                      | 4%         |
| Type Safety | 3                      | -          |
| **Total**   | **45** (+3 type-level) | 100%       |

## Test File Locations (Colocated)

| Module                | Test File                                                  |
| --------------------- | ---------------------------------------------------------- |
| gameState.svelte.ts   | `src/lib/stores/gameState.test.ts` (extend)                |
| persistence.svelte.ts | `src/lib/stores/persistence.test.ts` (extend)              |
| BattleArea.svelte     | `src/lib/components/BattleArea.svelte.test.ts` (extend)    |
| GameOverModal.svelte  | `src/lib/components/GameOverModal.svelte.test.ts` (extend) |

## Mocking Strategy

### localStorage Mock (already in codebase)

```ts
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		})
	};
})();
vi.stubGlobal('localStorage', localStorageMock);
```

### Pipeline Mock (for hit type testing)

```ts
const mockPipeline = {
	runAttack: vi.fn(() => ({
		hits: [{ type: 'criticalHit', damage: 100, index: 0 }],
		totalDamage: 100,
		overkillDamageOut: 0
	})),
	runTick: vi.fn(() => [])
	// ...other methods
};
```

## Acceptance Criteria Mapping

| Acceptance Criterion                                | Test Cases    |
| --------------------------------------------------- | ------------- |
| Attack counts by category displayed in battle-stats | 6.1, 6.3      |
| Counts update in real-time                          | 6.6           |
| Only non-zero categories displayed                  | 6.2, 7.2      |
| Numbers use formatNumber()                          | 6.5, 7.5      |
| Counts saved to SessionSaveData                     | 3.1, 3.5      |
| Counts restored on page load                        | 3.2           |
| Counts reset when starting new run                  | 4.1, 4.2, 4.3 |
| Attack totals visible on Game Over                  | 7.1, 7.3      |

## Notes

1. **Test Isolation:** Each test should reset localStorage and game state before running to prevent cross-test contamination.

2. **Fake Timers:** Use `vi.useFakeTimers()` when testing time-dependent behavior (poison ticks, save debouncing).

3. **Component Testing:** Use `@testing-library/svelte` for component rendering tests, following existing patterns in `BattleArea.svelte.test.ts`.

4. **Snapshot Consideration:** Consider snapshot tests for the attack breakdown UI rendering, but prefer explicit assertions for logic.
