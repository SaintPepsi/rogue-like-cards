# Cross-Check Report: Attack Category Counter

**Date:** 2026-02-06
**Feature:** Attack Category Counter
**Status:** READY (with minor patches applied)

---

## Test Coverage Audit

### Acceptance Criteria Coverage: 8/8 (100%)

| #   | Acceptance Criterion                                | Unit Tests    | E2E Tests     | Status  |
| --- | --------------------------------------------------- | ------------- | ------------- | ------- |
| 1   | Attack counts by category displayed in battle-stats | 6.1, 6.3      | Scenario 1, 2 | Covered |
| 2   | Counts update in real-time                          | 6.6           | Scenario 2    | Covered |
| 3   | Only non-zero categories displayed                  | 6.2, 7.2      | Scenario 5    | Covered |
| 4   | Numbers use formatNumber()                          | 6.5, 7.5      | Scenario 2    | Covered |
| 5   | Counts saved to SessionSaveData                     | 3.1, 3.5      | Scenario 6    | Covered |
| 6   | Counts restored on page load                        | 3.2           | Scenario 6    | Covered |
| 7   | Counts reset when starting new run                  | 4.1, 4.2, 4.3 | Scenario 4    | Covered |
| 8   | Attack totals visible on Game Over                  | 7.1, 7.3      | Scenario 7    | Covered |

---

## Interface Validation

### Data Structures

| Interface                      | Design Doc                          | Feature Plan                        | Unit Tests               | E2E Tests     | Status  |
| ------------------------------ | ----------------------------------- | ----------------------------------- | ------------------------ | ------------- | ------- |
| `AttackCounts` type            | `Record<string, number>`            | `Record<string, number>`            | `Record<string, number>` | N/A (runtime) | ALIGNED |
| `SessionSaveData.attackCounts` | `Record<string, number>` (optional) | `Record<string, number>` (optional) | Optional field           | N/A           | ALIGNED |

### Function Signatures

| Function                                            | Feature Plan Signature           | Test Expectations              | Status  |
| --------------------------------------------------- | -------------------------------- | ------------------------------ | ------- |
| `incrementAttackCount(type: string)`                | Internal helper                  | Tests increment by type string | ALIGNED |
| `formatAttackType(type: string): string`            | Returns display label            | 5.1-5.6 verify labels          | ALIGNED |
| `getSortedAttackCounts(counts): [string, number][]` | Returns sorted entries           | Implicit in 6.x tests          | ALIGNED |
| `gameState.attackCounts` getter                     | Returns `Record<string, number>` | Used in all UI tests           | ALIGNED |

### CSS Selectors (E2E)

| Selector               | Feature Plan    | E2E Plan    | Actual Component | Status                  |
| ---------------------- | --------------- | ----------- | ---------------- | ----------------------- |
| `.battle-stats`        | Used            | Used        | Exists (line 92) | ALIGNED                 |
| `.attack-counts`       | Not defined     | Used in E2E | -                | GAP - see Patch #1      |
| `.attack-breakdown`    | Defined in plan | -           | -                | MISMATCH - see Patch #1 |
| `.attack-count`        | Defined         | Used        | -                | ALIGNED                 |
| `.attack-count.{type}` | Defined         | Used        | -                | ALIGNED                 |
| `.game-over-stats`     | Referenced      | Used        | Exists (line 55) | ALIGNED                 |

---

## Edge Case Coverage

| Edge Case                        | Unit Test       | E2E Test   | Status    |
| -------------------------------- | --------------- | ---------- | --------- |
| Empty attack counts (no attacks) | 6.4, 7.4        | -          | Unit only |
| Large numbers (1M+)              | 6.5, 7.5        | -          | Unit only |
| Rapid increments (100+)          | 1.11, 1.12      | -          | Unit only |
| Mixed multi-strike types         | 2.6             | -          | Unit only |
| Modal blocking attacks           | 2.7, 2.8        | -          | Unit only |
| Legacy save without attackCounts | 3.3             | -          | Unit only |
| Poison tick counting             | 2.4, Scenario 5 | Scenario 5 | Covered   |
| Unknown attack type passthrough  | 5.6             | -          | Unit only |

---

## Integration Readiness

### Component Dependencies

| Component               | Required Changes                 | Dependencies Met         | Status |
| ----------------------- | -------------------------------- | ------------------------ | ------ |
| `types.ts`              | Add `AttackCounts` type          | None                     | READY  |
| `persistence.svelte.ts` | Add `attackCounts` to interface  | None                     | READY  |
| `gameState.svelte.ts`   | State, helpers, save/load, reset | `AttackCounts` type      | READY  |
| `BattleArea.svelte`     | New prop, helpers, UI section    | `AttackCounts` type      | READY  |
| `GameOverModal.svelte`  | New prop, helpers, UI section    | `AttackCounts` type      | READY  |
| `+page.svelte`          | Pass prop to 2 components        | `gameState.attackCounts` | READY  |

### Existing Test Files to Extend

| File                                              | Exists | Changes Needed                   |
| ------------------------------------------------- | ------ | -------------------------------- |
| `src/lib/stores/gameState.test.ts`                | Yes    | Add attack count tests           |
| `src/lib/stores/persistence.test.ts`              | Yes    | Add attackCounts save/load tests |
| `src/lib/components/BattleArea.svelte.test.ts`    | Yes    | Add attackCounts rendering tests |
| `src/lib/components/GameOverModal.svelte.test.ts` | Yes    | Add attackCounts rendering tests |

---

## Inconsistencies Found

### Issue 1: CSS Class Naming Mismatch

**Location:** Feature plan vs E2E plan

**Details:**

- Feature plan uses `.attack-breakdown` for container
- E2E plan expects `.attack-counts` for container

**Resolution:** Patch #1 - Align on `.attack-counts` (matches E2E expectations and is more descriptive)

### Issue 2: Missing E2E Test File Path Pattern

**Location:** E2E plan

**Details:**

- E2E plan specifies `src/routes/_attack-category-counter.spec.ts`
- Existing E2E files follow `_page.spec.ts`, `_legendary-selection.spec.ts` pattern
- Pattern is correct, no issue

**Resolution:** None needed

### Issue 3: Feature Plan Line Numbers May Drift

**Location:** Feature plan

**Details:**

- Feature plan references specific line numbers in source files
- Line numbers in actual files may differ slightly
- Current checks show alignment but this is fragile

**Resolution:** Implementation should use pattern matching, not line numbers

---

## Patches Applied

### Patch #1: Align CSS Class Names

**Files Modified:** `docs/implementation-plans/feature-plan.md`

**Change:** Updated container class from `.attack-breakdown` to `.attack-counts` to match E2E test expectations.

```diff
- <div class="attack-breakdown">
+ <div class="attack-counts">
```

**Rationale:** E2E tests expect `.attack-counts` selector. Aligning implementation with test expectations.

### Patch #2: Add E2E Test Helper Documentation

**Files Modified:** `docs/test-plans/e2e-test-plan.md`

**Change:** Added note about `__test__.getAttackCounts()` being optional since counts can be verified via UI selectors.

---

## Risk Assessment

### Low Risk

1. **Type safety** - Using `Record<string, number>` is flexible but all keys come from well-defined `HitType` values
2. **Backward compatibility** - Optional `attackCounts` field with nullish coalescing handles legacy saves

### Medium Risk

1. **UI clutter** - Multiple attack types could crowd battle-stats. Mitigation: only show non-zero counts
2. **Test flakiness** - E2E crit testing depends on RNG. Mitigation: seeded random + high attack count

### Addressed in Plans

1. **Performance** - Integer increments are O(1), negligible overhead
2. **Display order** - Explicit ordering via `ATTACK_TYPE_ORDER` array

---

## Final Checklist

- [x] All acceptance criteria have corresponding tests
- [x] Unit tests and E2E tests are complementary (not duplicative)
- [x] Interface signatures match between implementation and tests
- [x] CSS selectors aligned between feature plan and E2E plan
- [x] Edge cases covered (primarily in unit tests)
- [x] Existing test files identified for extension
- [x] No missing files in feature plan
- [x] Reset behavior tested (resetGame + fullReset)
- [x] Persistence round-trip tested

---

## Conclusion

**Status: READY FOR IMPLEMENTATION**

The planning documents are well-aligned with minor patches applied:

1. CSS class naming standardized to `.attack-counts`
2. All 8 acceptance criteria have test coverage
3. 45 unit tests + 7 E2E scenarios provide comprehensive coverage
4. Interface contracts are consistent across all documents
5. Edge cases are adequately covered in unit tests

The feature can proceed to implementation following the feature plan with the applied patches.
