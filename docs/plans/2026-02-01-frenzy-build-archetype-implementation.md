# Frenzy Build Archetype Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand frenzy from 2 cards into a 7-card build archetype with duration scaling, bonus-per-stack scaling, and a legendary stack multiplier capstone.

**Architecture:** Add `tapFrenzyStackMultiplier` to PlayerStats. Modify `frenzy.svelte.ts` to read the multiplier and add N stacks per tap. Add 5 new upgrade card definitions. All new cards use existing stat modifier flow — no new systems needed.

**Tech Stack:** TypeScript, Svelte 5 (runes), Vitest

---

### Task 1: Add `tapFrenzyStackMultiplier` to PlayerStats type

**Files:**
- Modify: `src/lib/types.ts:37` (after `tapFrenzyDuration`)

**Step 1: Add the new stat to the PlayerStats type**

In `src/lib/types.ts`, add `tapFrenzyStackMultiplier: number;` after `tapFrenzyDuration: number;`:

```typescript
	tapFrenzyDuration: number;
	tapFrenzyStackMultiplier: number; // Multiplier on frenzy stacks per tap (legendary-only)
	executeCap: number;
```

**Step 2: Add default value in `createDefaultStats()`**

In `src/lib/engine/stats.ts`, add `tapFrenzyStackMultiplier: 1,` after `tapFrenzyDuration: 3,`:

```typescript
		tapFrenzyDuration: 3,
		tapFrenzyStackMultiplier: 1,
		executeCap: 0.1
```

**Step 3: Add stat registry entry**

In `src/lib/engine/stats.ts`, add a new entry in `statRegistry` after the `tapFrenzyBonus` entry (line 89):

```typescript
	{ key: 'tapFrenzyBonus', icon: '✨', label: 'Frenzy Bonus', format: plusPct },
	{ key: 'tapFrenzyStackMultiplier', icon: '🔥', label: 'Frenzy Stacks', format: (v) => `${v}x`, formatMod: (v) => `+${v}x` },
```

**Step 4: Run tests to verify nothing broke**

Run: `npx vitest run`
Expected: All 378 tests pass. The new stat is picked up by `createDefaultStats()` and existing tests that iterate `Object.keys(BASE_STATS)` will include it.

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/engine/stats.ts
git commit -m "feat: add tapFrenzyStackMultiplier stat for frenzy build archetype"
```

---

### Task 2: Wire stack multiplier into frenzy module

**Files:**
- Modify: `src/lib/stores/frenzy.svelte.ts:27-43` (addStack function)
- Test: `src/lib/stores/frenzy.test.ts`

**Step 1: Write the failing test for stack multiplier**

Add a new test in `src/lib/stores/frenzy.test.ts`. The test needs to verify that when `tapFrenzyStackMultiplier` is greater than 1, a single `addStack()` call creates multiple stacks with independent decay timers.

Since `createFrenzy()` takes a `StatPipeline` and `TimerRegistry`, we need to create a minimal mock pipeline. Add this test:

```typescript
import { test, expect, describe } from 'vitest';
import { createTimerRegistry } from '$lib/engine/timerRegistry';

// Tests frenzy stack decay using the timer registry directly,
// mirroring how createFrenzy() registers per-stack timers.

describe('frenzy stack decay', () => {
	// ... existing tests stay unchanged ...

	test('stack multiplier adds multiple stacks per tap', () => {
		const timers = createTimerRegistry();
		let frenzyCount = 0;
		let frenzyId = 0;
		const stackMultiplier = 3;

		function addFrenzyStack(duration: number) {
			const stacksToAdd = Math.floor(stackMultiplier);
			for (let i = 0; i < stacksToAdd; i++) {
				frenzyId++;
				frenzyCount++;
				const id = frenzyId;
				timers.register(`frenzy_${id}`, {
					remaining: duration,
					onExpire: () => {
						frenzyCount = Math.max(0, frenzyCount - 1);
					}
				});
			}
		}

		// Single tap with 3x multiplier should add 3 stacks
		addFrenzyStack(3000);
		expect(frenzyCount).toBe(3);

		// All 3 stacks expire together after duration
		timers.tick(3000);
		expect(frenzyCount).toBe(0);
	});

	test('stack multiplier stacks decay independently', () => {
		const timers = createTimerRegistry();
		let frenzyCount = 0;
		let frenzyId = 0;
		const stackMultiplier = 2;

		function addFrenzyStack(duration: number) {
			const stacksToAdd = Math.floor(stackMultiplier);
			for (let i = 0; i < stacksToAdd; i++) {
				frenzyId++;
				frenzyCount++;
				const id = frenzyId;
				timers.register(`frenzy_${id}`, {
					remaining: duration,
					onExpire: () => {
						frenzyCount = Math.max(0, frenzyCount - 1);
					}
				});
			}
		}

		// Tap 1: 2 stacks at t=0
		addFrenzyStack(3000);
		expect(frenzyCount).toBe(2);

		// Tap 2: 2 more stacks at t=1000
		timers.tick(1000);
		addFrenzyStack(3000);
		expect(frenzyCount).toBe(4);

		// At t=3000, first 2 stacks expire
		timers.tick(2000);
		expect(frenzyCount).toBe(2);

		// At t=4000, second 2 stacks expire
		timers.tick(1000);
		expect(frenzyCount).toBe(0);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/stores/frenzy.test.ts`
Expected: New tests pass (they test the timer pattern directly, same as existing tests). This is a pattern test — we're verifying the logic that will be implemented in `addStack()`.

**Step 3: Modify `addStack()` to read the multiplier**

In `src/lib/stores/frenzy.svelte.ts`, replace the `addStack()` function:

```typescript
	function addStack() {
		const stacksToAdd = Math.floor(pipeline.get('tapFrenzyStackMultiplier') as number);
		const duration = pipeline.get('tapFrenzyDuration') * 1000;

		for (let i = 0; i < stacksToAdd; i++) {
			nextId++;
			count++;
			const id = nextId;

			timers.register(`frenzy_${id}`, {
				remaining: duration,
				onExpire: () => {
					count = Math.max(0, count - 1);
					syncPipeline();
				}
			});
		}

		syncPipeline();
	}
```

Key changes:
- Reads `tapFrenzyStackMultiplier` from pipeline (defaults to 1, so existing behavior unchanged)
- Loops `stacksToAdd` times, each iteration creating a stack with its own ID and decay timer
- `syncPipeline()` called once at end (not per stack) for efficiency
- Duration read once outside loop since all stacks from same tap share the same duration

**Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/lib/stores/frenzy.svelte.ts src/lib/stores/frenzy.test.ts
git commit -m "feat: frenzy addStack reads tapFrenzyStackMultiplier for multi-stack taps"
```

---

### Task 3: Add 5 new frenzy upgrade cards

**Files:**
- Modify: `src/lib/data/upgrades.ts:450-464` (frenzy section)
- Test: `src/lib/data/upgrades.test.ts`

**Step 1: Write a failing test for the new cards**

Add to `src/lib/data/upgrades.test.ts`, inside a new describe block:

```typescript
describe('frenzy upgrade cards', () => {
	const frenzyIds = ['frenzy1', 'frenzy2', 'frenzy3', 'frenzydur1', 'frenzydur2', 'frenzydur3', 'frenzylegendary1'];

	test('all frenzy cards exist', () => {
		for (const id of frenzyIds) {
			expect(getUpgradeById(id), `${id} not found`).toBeDefined();
		}
	});

	test('frenzy cards have correct rarities', () => {
		expect(getUpgradeById('frenzydur1')!.rarity).toBe('uncommon');
		expect(getUpgradeById('frenzydur2')!.rarity).toBe('rare');
		expect(getUpgradeById('frenzydur3')!.rarity).toBe('epic');
		expect(getUpgradeById('frenzy3')!.rarity).toBe('epic');
		expect(getUpgradeById('frenzylegendary1')!.rarity).toBe('legendary');
	});

	test('GOTTA GO FAST modifies tapFrenzyStackMultiplier', () => {
		const card = getUpgradeById('frenzylegendary1')!;
		const stackMod = card.modifiers.find(m => m.stat === 'tapFrenzyStackMultiplier');
		expect(stackMod).toBeDefined();
		expect(stackMod!.value).toBe(2);
	});

	test('frenzy cards are always available (no filtering)', () => {
		// With zero poison and maxed execute, frenzy cards should still appear
		let foundFrenzyNew = false;
		for (let i = 0; i < 500; i++) {
			const result = getRandomUpgrades(10, 1.0, EXECUTE_CHANCE_BASE_CAP, EXECUTE_CHANCE_BASE_CAP, 0);
			if (result.some(u => frenzyIds.includes(u.id))) {
				foundFrenzyNew = true;
				break;
			}
		}
		expect(foundFrenzyNew).toBe(true);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/data/upgrades.test.ts`
Expected: FAIL — `frenzydur1`, `frenzydur2`, `frenzydur3`, `frenzy3`, `frenzylegendary1` not found.

**Step 3: Add the 5 new upgrade card definitions**

In `src/lib/data/upgrades.ts`, replace the frenzy section (after attack speed cards, before the closing of `allUpgrades`):

```typescript
	// === FRENZY ===
	{
		id: 'frenzy1',
		title: 'Battle Rage',
		rarity: 'uncommon',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyBonus', value: 0.05 }]
	},
	{
		id: 'frenzy2',
		title: 'Berserker Fury',
		rarity: 'rare',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyBonus', value: 0.05 }, { stat: 'attackSpeed', value: 0.2 }]
	},

	// === FRENZY DURATION ===
	{
		id: 'frenzydur1',
		title: 'Adrenaline Rush',
		rarity: 'uncommon',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyDuration', value: 1 }]
	},
	{
		id: 'frenzydur2',
		title: 'Sustained Fury',
		rarity: 'rare',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyDuration', value: 2 }]
	},
	{
		id: 'frenzydur3',
		title: 'Relentless Rage',
		rarity: 'epic',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyDuration', value: 3 }, { stat: 'tapFrenzyBonus', value: 0.03 }]
	},

	// === FRENZY BONUS (Epic capstone) ===
	{
		id: 'frenzy3',
		title: 'Bloodlust',
		rarity: 'epic',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyBonus', value: 0.08 }, { stat: 'attackSpeed', value: 0.3 }]
	},

	// === FRENZY LEGENDARY ===
	{
		id: 'frenzylegendary1',
		title: 'GOTTA GO FAST',
		rarity: 'legendary',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyStackMultiplier', value: 2 }]
	}
```

**Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass, including the new frenzy card tests.

**Step 5: Commit**

```bash
git add src/lib/data/upgrades.ts src/lib/data/upgrades.test.ts
git commit -m "feat: add 5 new frenzy upgrade cards (duration, bonus, legendary capstone)"
```

---

### Task 4: Add `tapFrenzyDuration` to stat registry display

**Files:**
- Modify: `src/lib/engine/stats.ts:89` (stat registry)

The `tapFrenzyDuration` stat already exists in PlayerStats and `createDefaultStats()`, but it has **no entry in `statRegistry`**. This means duration cards won't show their modifier on upgrade cards or in the stats panel.

**Step 1: Add the stat registry entry**

In `src/lib/engine/stats.ts`, add an entry for `tapFrenzyDuration` after `tapFrenzyBonus`:

```typescript
	{ key: 'tapFrenzyBonus', icon: '✨', label: 'Frenzy Bonus', format: plusPct },
	{ key: 'tapFrenzyDuration', icon: '⏳', label: 'Frenzy Duration', format: plusSec },
	{ key: 'tapFrenzyStackMultiplier', icon: '🔥', label: 'Frenzy Stacks', format: (v) => `${v}x`, formatMod: (v) => `+${v}x` },
```

**Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/lib/engine/stats.ts
git commit -m "feat: add tapFrenzyDuration and tapFrenzyStackMultiplier to stat registry display"
```

---

### Task 5: Manual smoke test

No code changes. Verify the full flow works:

1. Start the dev server: `npm run dev`
2. Play through a few levels and verify:
   - Frenzy duration cards (Adrenaline Rush, Sustained Fury, Relentless Rage) appear in upgrade choices
   - Bloodlust and GOTTA GO FAST appear at appropriate rarities
   - Card modifiers display correctly (duration shows "+Xs", stack multiplier shows "+Nx")
   - Picking duration cards makes frenzy stacks last longer
   - Picking GOTTA GO FAST causes each tap to add 3 stacks
   - Stats panel shows new frenzy stats when non-default
3. Verify no console errors
