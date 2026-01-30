# Standardize Temporary UI Effects

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate ad-hoc temporary UI effect patterns by standardizing on a single store-driven, array-based system — the same pattern the hit display already uses.

**Architecture:** Today there are three competing patterns for showing temporary on-screen messages (hits, gold drops, card flips). The hit system is the most robust: the store owns an array of items with unique IDs, items are added imperatively during game actions, each item self-cleans via a `setTimeout` keyed by ID, and components are pure renderers (`{#each items as item (item.id)}`). Gold drops use a fragile hybrid of store state + component `$effect` + component `setTimeout` that cannot handle overlapping drops and previously caused an infinite reactive loop. Card flip animations are copy-pasted across two modal components. This plan converts gold drops to the hits pattern, extracts a shared card-flip utility, and documents the standard so future effects follow it.

**Tech Stack:** TypeScript, Svelte 5 (SvelteKit), Bun, `bun test` (vitest)

---

## Prerequisites / Things You Need to Know

### Project structure (relevant files)
```
src/
  lib/
    stores/gameState.svelte.ts   ← game state store (hits, gold drops, timers)
    types.ts                     ← HitInfo, HitType, PlayerStats, etc.
    components/
      BattleArea.svelte          ← renders hits + gold drops
      LevelUpModal.svelte        ← card flip animation (local $effect)
      ChestLootModal.svelte      ← card flip animation (duplicated)
      hits/
        HitNumber.svelte         ← routes hit type → visual component
        NormalHit.svelte
        CritHit.svelte
        ExecuteHit.svelte
        PoisonHit.svelte
        PoisonCritHit.svelte
```

### How to run tests
```bash
bun test              # all tests
bun run check         # svelte-check type checking
```

### The hits pattern (reference implementation)

This is the gold standard. Every step of this plan converges toward it.

**Store side** (`gameState.svelte.ts`):
```ts
// State
let hits = $state<HitInfo[]>([]);
let hitId = $state(0);

// Imperative add + self-cleaning removal
function addHits(newHits: HitInfo[]) {
    hits = [...hits, ...newHits];
    const hitIds = newHits.map((h) => h.id);
    setTimeout(() => {
        hits = hits.filter((h) => !hitIds.includes(h.id));
    }, 700);
}

// Called from attack() / applyPoison() — never from $effect
hitId++;
addHits([{ damage, type, id: hitId, index }]);
```

**Component side** (`BattleArea.svelte`):
```svelte
<!-- Pure render. No $effect, no $state, no setTimeout. -->
{#each hits as hit (hit.id)}
    <HitNumber damage={hit.damage} type={hit.type} index={hit.index} />
{/each}
```

**Why it works:**
- Store owns lifecycle (add + cleanup). Components are stateless renderers.
- Array-based: multiple items coexist naturally (rapid attacks don't collide).
- ID-based cleanup: each item removes only itself, regardless of what else was added.
- No `$effect` writes to `$state` it also reads — no reactive loops possible.

---

## Task 1 — Add `GoldDrop` type and convert gold drops to array-based system

### Problem
Gold drops use a single `lastGoldDrop` number + `goldDropId` counter + a component `$effect` with `setTimeout`. Only one drop can display at a time. Rapid kills that both drop gold cause the first timeout to hide the second animation early.

### What to do

**Modify** `src/lib/types.ts`:
- Add a `GoldDrop` interface: `{ id: number; amount: number }`

**Modify** `src/lib/stores/gameState.svelte.ts`:
- Replace `lastGoldDrop` and `goldDropId` with:
  ```ts
  let goldDrops = $state<GoldDrop[]>([]);
  let goldDropId = $state(0);
  ```
- Add an `addGoldDrop(amount)` function following the `addHits` pattern:
  ```ts
  function addGoldDrop(amount: number) {
      goldDropId++;
      goldDrops = [...goldDrops, { id: goldDropId, amount }];
      const dropId = goldDropId;
      setTimeout(() => {
          goldDrops = goldDrops.filter((d) => d.id !== dropId);
      }, 1200);
  }
  ```
- In `killEnemy()`, replace the `lastGoldDrop = goldReward; goldDropId++;` block with `addGoldDrop(goldReward)`.
- Remove the `lastGoldDrop = 0` reset line (no longer needed — drops self-clean).
- In `resetGame()`, clear goldDrops: `goldDrops = []`.
- Update the getter: replace `lastGoldDrop` and `goldDropId` getters with a single `goldDrops` getter.

**Modify** `src/routes/+page.svelte`:
- Replace `lastGoldDrop` and `goldDropId` props with a single `goldDrops` prop.

**Modify** `src/lib/components/BattleArea.svelte`:
- Remove: `showGoldDrop` state, the `$effect` block, `lastGoldDrop` and `goldDropId` props.
- Add: `goldDrops` prop (type `GoldDrop[]`).
- Replace the `{#if showGoldDrop}...{/if}` template with:
  ```svelte
  {#each goldDrops as drop (drop.id)}
      <span class="gold-drop-popup">+{drop.amount}g</span>
  {/each}
  ```
- The CSS animation (`gold-float 1.2s ease-out forwards`) stays unchanged — each `<span>` animates independently because it's created fresh per array entry.

### Steps
1. Add `GoldDrop` type to `types.ts`.
2. Implement `addGoldDrop()` in the store, rewire `killEnemy()` and `resetGame()`, update getters.
3. Update `+page.svelte` to pass `goldDrops` instead of `lastGoldDrop` + `goldDropId`.
4. Refactor `BattleArea.svelte` to pure render — remove all `$effect`, `$state`, and `setTimeout`.
5. Run `bun test && bun run check` — verify 0 errors.
6. Commit: `refactor: convert gold drops to array-based self-cleaning pattern`

### Verify
- Kill several enemies rapidly (or with high gold drop chance). Multiple "+Xg" popups should stack and each fade independently.
- No console errors (`effect_update_depth_exceeded` is gone — there's no `$effect` in BattleArea at all).

---

## Task 2 — Extract shared card-flip animation utility

### Problem
`LevelUpModal.svelte` and `ChestLootModal.svelte` contain identical 20-line `$effect` blocks managing `flippedCards`, `enabledCards`, and `flipTimers`. Any fix to one must be manually copied to the other.

### What to do

**Create** `src/lib/components/useCardFlip.svelte.ts` (Svelte 5 runes module):
```ts
export function useCardFlip() {
    let flippedCards = $state<boolean[]>([]);
    let enabledCards = $state<boolean[]>([]);
    let flipTimers: ReturnType<typeof setTimeout>[] = [];

    function startFlip(count: number) {
        flippedCards = Array(count).fill(false);
        enabledCards = Array(count).fill(false);
        flipTimers.forEach(clearTimeout);
        flipTimers = [];

        for (let i = 0; i < count; i++) {
            flipTimers.push(setTimeout(() => { flippedCards[i] = true; }, 200 + i * 250));
            flipTimers.push(setTimeout(() => { enabledCards[i] = true; }, 200 + i * 250 + 600));
        }
    }

    function cleanup() {
        flipTimers.forEach(clearTimeout);
        flipTimers = [];
    }

    return {
        get flippedCards() { return flippedCards; },
        get enabledCards() { return enabledCards; },
        startFlip,
        cleanup
    };
}
```

**Modify** `src/lib/components/LevelUpModal.svelte`:
- Remove: local `flippedCards`, `enabledCards`, `flipTimers` declarations and the `$effect` block.
- Add: `import { useCardFlip } from './useCardFlip.svelte';`
- Add: `const flip = useCardFlip();`
- Add: `$effect` that calls `flip.startFlip(choices.length)` when `show` is true and returns `flip.cleanup`.
- Update template: `flippedCards[i]` → `flip.flippedCards[i]`, `enabledCards[i]` → `flip.enabledCards[i]`.

**Modify** `src/lib/components/ChestLootModal.svelte`:
- Same changes as LevelUpModal.

### Steps
1. Create `useCardFlip.svelte.ts`.
2. Refactor `LevelUpModal.svelte` to use it.
3. Refactor `ChestLootModal.svelte` to use it.
4. Run `bun test && bun run check` — verify 0 errors.
5. Manually test: open a level-up modal and a chest loot modal. Cards should flip with the same staggered animation.
6. Commit: `refactor: extract shared card-flip animation into useCardFlip`

---

## Task 3 — Document the standard pattern in CLAUDE.md

### Problem
There's no written convention for how to add temporary UI effects. The next developer (or AI) will invent a fourth pattern.

### What to do

**Modify** `CLAUDE.md`:
- Add a `## Temporary UI Effects` section with:
  - The rule: store owns lifecycle, components are pure renderers.
  - The pattern: array of `{ id, ...data }` in the store, `addX()` function that appends + schedules `setTimeout` removal by ID, component renders with `{#each items as item (item.id)}`.
  - Explicit anti-patterns: no `$effect` that writes to `$state` it also reads, no component-local `setTimeout` for show/hide, no single-slot state for effects that can overlap.
  - Reference to `hits` and `goldDrops` as canonical examples.

### Steps
1. Add the section to `CLAUDE.md`.
2. Commit: `docs: document standard pattern for temporary UI effects`

---

## Task 4 — Audit remaining `$effect` blocks for reactive safety ✅

### Problem
The `goldDropKey++` bug was caused by `$effect` reading and writing the same `$state`. Other effects should be checked for the same anti-pattern.

### Audit results

Only 2 `$effect` blocks remain in the codebase (after Tasks 1-3):

1. **`LevelUpModal.svelte:18`** — SAFE. Reads: `show` (prop), `choices.length` (prop). Writes: `flip.startFlip()` mutates encapsulated state not read by the effect. Cleanup returns `flip.cleanup()`.
2. **`ChestLootModal.svelte:19`** — SAFE. Identical pattern to LevelUpModal.

**`BattleArea.svelte`** — No `$effect` blocks (removed in Task 1). ✅
**`gameState.svelte.ts`** — No `$effect` blocks. ✅

No violations found. No commit needed.

---

## Summary

| Task | What changes | Key files | Risk |
|------|-------------|-----------|------|
| 1 | Gold drops → array-based | gameState.svelte.ts, BattleArea.svelte, +page.svelte, types.ts | Medium — changes props and store API |
| 2 | Card flip → shared utility | useCardFlip.svelte.ts, LevelUpModal.svelte, ChestLootModal.svelte | Low — pure refactor, no behavior change |
| 3 | Document the pattern | CLAUDE.md | None |
| 4 | Audit remaining effects | All .svelte files | Low — read-only unless violations found |

Execute in order. Each task is independently committable. Tasks 1 and 2 have no dependencies on each other but Task 3 should come after both so the docs reference the final code. Task 4 is a final sweep.
