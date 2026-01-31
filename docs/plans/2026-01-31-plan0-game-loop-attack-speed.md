# Plan 0: Game Loop + Attack Speed

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `setInterval`-based game timing with a single `requestAnimationFrame` game loop, introduce an attack speed stat with cooldown-based attacks, pointer-held auto-attack, tap frenzy stacks, and tap queuing.

**Architecture:** Bottom-up in three phases — (1) stats + pure game loop engine with tests, (2) rAF store + gameState migration + pointer input + UI, (3) upgrade cards + changelog. Pure logic is testable without browser APIs. The rAF store wraps the engine with Svelte 5 runes and `requestAnimationFrame`. UI effects (hit numbers, gold drops) stay on `setTimeout` — only game timing moves to rAF.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript, Vitest, Tailwind CSS.

**Dependencies:** None. Must be completed before Plan 1 (Enemy System).

**Design doc:** This plan was designed during brainstorming session 2026-01-31. Key decisions:
- Attack speed = "attacks per second" (Adventurer 0.8, future: Warrior 0.4, Mage 0.64, Rogue 1.2)
- `pointerdown` = can attack, `pointerup` = stop auto-attack
- Tap frenzy: each attack adds a temporary stack that boosts attack speed. Attacks continue after pointer release while stacks remain.
- Tap queuing: tapping during cooldown queues one attack that fires when cooldown ends.
- Single rAF loop drives: attack cooldown, poison ticks (1000ms), boss timer (1000ms countdown).
- Stun mechanic (Plan 1) will pause enemy mechanics. Frost Aura (Plan 1) will slow both DoT ticks AND attack speed via this loop.

---

## Phase 1: Stats + Pure Game Loop Engine

### Task 1.1: Add New Stats to PlayerStats

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

**Step 3: Add statRegistry entries in `stats.ts`**

Add after the `greed` entry at the end of the `statRegistry` array:

```typescript
{ key: 'attackSpeed', icon: '🗡️', label: 'Attack Speed', format: (v) => `${(v as number).toFixed(1)}/s`, alwaysShow: true },
{ key: 'tapFrenzyBonus', icon: '🔥', label: 'Frenzy Bonus', format: plusPct },
```

Do NOT add `tapFrenzyDuration` — it's internal, not player-facing.

**Step 4: Run tests**

Run: `bun test`
Expected: All existing tests pass. New defaults are picked up by the `{ ...createDefaultStats(), ...saved }` merge pattern.

**Step 5: Commit**

`feat: add attackSpeed, tapFrenzyBonus, tapFrenzyDuration to PlayerStats`

---

### Task 1.2: Create Game Loop Engine — Types and Helpers

**Files:**
- Create: `src/lib/engine/gameLoop.ts`
- Create: `src/lib/engine/gameLoop.test.ts`

**Step 1: Write failing tests for helper functions**

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

**Step 2: Run tests to verify they fail**

Run: `bun test src/lib/engine/gameLoop.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement helper functions**

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

**Step 4: Run tests to verify they pass**

Run: `bun test src/lib/engine/gameLoop.test.ts`
Expected: PASS

**Step 5: Commit**

`feat: add attack speed helper functions with tests`

---

### Task 1.3: Create Game Loop Engine — tickFrame

**Files:**
- Modify: `src/lib/engine/gameLoop.ts` (add types + `tickFrame`)
- Modify: `src/lib/engine/gameLoop.test.ts` (add `tickFrame` tests)

**Step 1: Write failing tests for `tickFrame`**

Add to `gameLoop.test.ts`:

```typescript
import { tickFrame, type LoopAccumulators, type LoopState, type LoopCallbacks } from '$lib/engine/gameLoop';

function makeCallbacks(overrides: Partial<LoopCallbacks> = {}): LoopCallbacks & { attackCount: number; poisonCount: number; bossSecondCount: number; bossExpiredCount: number } {
	const tracker = { attackCount: 0, poisonCount: 0, bossSecondCount: 0, bossExpiredCount: 0 };
	return {
		onAttack: () => { tracker.attackCount++; },
		onPoisonTick: () => { tracker.poisonCount++; },
		onBossSecond: () => { tracker.bossSecondCount++; },
		onBossExpired: () => { tracker.bossExpiredCount++; },
		...overrides,
		...tracker
	};
}

function makeState(overrides: Partial<LoopState> = {}): LoopState {
	return {
		paused: false,
		canAttack: false,
		attackQueuedTap: false,
		bossActive: false,
		bossTimeRemaining: 0,
		...overrides
	};
}

function makeAccumulators(overrides: Partial<LoopAccumulators> = {}): LoopAccumulators {
	return { attackCooldown: 0, poisonTick: 0, bossTimer: 0, ...overrides };
}

describe('tickFrame', () => {
	test('returns unchanged accumulators when paused', () => {
		const acc = makeAccumulators({ attackCooldown: 500, poisonTick: 300 });
		const cbs = makeCallbacks();
		const result = tickFrame(100, acc, makeState({ paused: true }), 1250, cbs);
		expect(result).toEqual(acc);
		expect(cbs.attackCount).toBe(0);
	});

	test('fires attack when canAttack and cooldown expires', () => {
		const cbs = makeCallbacks();
		const result = tickFrame(
			1300,
			makeAccumulators({ attackCooldown: 1250 }),
			makeState({ canAttack: true }),
			1250,
			cbs
		);
		expect(cbs.attackCount).toBe(1);
		// Remainder: 1250 - 1300 = -50, new cooldown = 1250 - 50 = 1200
		expect(result.attackCooldown).toBeCloseTo(1200);
	});

	test('does NOT fire attack when canAttack is false', () => {
		const cbs = makeCallbacks();
		tickFrame(
			2000,
			makeAccumulators({ attackCooldown: 0 }),
			makeState({ canAttack: false }),
			1250,
			cbs
		);
		expect(cbs.attackCount).toBe(0);
	});

	test('fires queued tap attack on cooldown completion', () => {
		const cbs = makeCallbacks();
		const result = tickFrame(
			600,
			makeAccumulators({ attackCooldown: 500 }),
			makeState({ canAttack: false, attackQueuedTap: true }),
			1250,
			cbs
		);
		expect(cbs.attackCount).toBe(1);
	});

	test('fires poison tick at 1000ms boundary', () => {
		const cbs = makeCallbacks();
		const result = tickFrame(
			1050,
			makeAccumulators({ poisonTick: 0 }),
			makeState(),
			1250,
			cbs
		);
		expect(cbs.poisonCount).toBe(1);
		expect(result.poisonTick).toBeCloseTo(50);
	});

	test('fires multiple poison ticks for large delta', () => {
		const cbs = makeCallbacks();
		const result = tickFrame(
			2500,
			makeAccumulators({ poisonTick: 0 }),
			makeState(),
			1250,
			cbs
		);
		expect(cbs.poisonCount).toBe(2);
		expect(result.poisonTick).toBeCloseTo(500);
	});

	test('fires boss second at 1000ms boundary', () => {
		const cbs = makeCallbacks();
		const result = tickFrame(
			1100,
			makeAccumulators({ bossTimer: 0 }),
			makeState({ bossActive: true, bossTimeRemaining: 30 }),
			1250,
			cbs
		);
		expect(cbs.bossSecondCount).toBe(1);
		expect(result.bossTimer).toBeCloseTo(100);
	});

	test('does not tick boss timer when bossActive is false', () => {
		const cbs = makeCallbacks();
		const result = tickFrame(
			2000,
			makeAccumulators({ bossTimer: 0 }),
			makeState({ bossActive: false }),
			1250,
			cbs
		);
		expect(cbs.bossSecondCount).toBe(0);
	});

	test('carries over attack cooldown remainder correctly', () => {
		const cbs = makeCallbacks();
		// Cooldown 100ms remaining, 116ms passes -> fires, new cooldown = 1250 - 16 = 1234
		const result = tickFrame(
			116,
			makeAccumulators({ attackCooldown: 100 }),
			makeState({ canAttack: true }),
			1250,
			cbs
		);
		expect(cbs.attackCount).toBe(1);
		expect(result.attackCooldown).toBeCloseTo(1234);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/lib/engine/gameLoop.test.ts`
Expected: FAIL — `tickFrame` not exported.

**Step 3: Implement types and `tickFrame`**

Add to `src/lib/engine/gameLoop.ts`:

```typescript
export interface LoopAccumulators {
	attackCooldown: number;   // ms remaining until next attack allowed
	poisonTick: number;       // ms accumulated toward next poison tick
	bossTimer: number;        // ms accumulated toward next boss second decrement
}

export interface LoopCallbacks {
	onAttack: () => void;
	onPoisonTick: () => void;
	onBossSecond: () => void;
	onBossExpired: () => void;
}

export interface LoopState {
	paused: boolean;
	canAttack: boolean;       // pointerHeld OR frenzyStacks > 0
	attackQueuedTap: boolean;
	bossActive: boolean;
	bossTimeRemaining: number;
}

export const POISON_TICK_MS = 1000;
export const BOSS_TICK_MS = 1000;

export function tickFrame(
	deltaMs: number,
	accumulators: LoopAccumulators,
	state: LoopState,
	attackIntervalMs: number,
	callbacks: LoopCallbacks
): LoopAccumulators {
	if (state.paused) return { ...accumulators };

	let { attackCooldown, poisonTick, bossTimer } = accumulators;

	// --- Attack cooldown ---
	if (state.canAttack || state.attackQueuedTap) {
		attackCooldown -= deltaMs;
		if (attackCooldown <= 0) {
			callbacks.onAttack();
			attackCooldown = attackIntervalMs + attackCooldown; // carry remainder
		}
	}

	// --- Poison tick ---
	poisonTick += deltaMs;
	const poisonTicks = Math.floor(poisonTick / POISON_TICK_MS);
	for (let i = 0; i < poisonTicks; i++) {
		callbacks.onPoisonTick();
	}
	poisonTick -= poisonTicks * POISON_TICK_MS;

	// --- Boss timer ---
	if (state.bossActive) {
		bossTimer += deltaMs;
		const bossSeconds = Math.floor(bossTimer / BOSS_TICK_MS);
		for (let i = 0; i < bossSeconds; i++) {
			callbacks.onBossSecond();
		}
		bossTimer -= bossSeconds * BOSS_TICK_MS;
	}

	return { attackCooldown, poisonTick, bossTimer };
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test src/lib/engine/gameLoop.test.ts`
Expected: PASS

**Step 5: Commit**

`feat: add tickFrame game loop engine with accumulator-based timing`

---

## Phase 2: rAF Store + Migration + Pointer Input

### Task 2.1: Create Game Loop Store

**Files:**
- Create: `src/lib/stores/gameLoop.svelte.ts`

**Step 1: Create the store**

This store wraps the pure engine with `requestAnimationFrame` and Svelte 5 runes.

```typescript
import {
	tickFrame,
	getEffectiveAttackSpeed,
	getAttackIntervalMs,
	type LoopAccumulators,
	type LoopCallbacks,
	type LoopState
} from '$lib/engine/gameLoop';

export interface FrenzyStack {
	id: number;
	expiresAt: number; // performance.now() timestamp
}

export function createGameLoop() {
	// rAF state
	let rafId: number | null = null;
	let lastFrameTime = $state(0);

	// Accumulators
	let accumulators = $state<LoopAccumulators>({
		attackCooldown: 0,
		poisonTick: 0,
		bossTimer: 0
	});

	// Input state
	let paused = $state(false);
	let pointerHeld = $state(false);
	let attackQueuedTap = $state(false);

	// Boss
	let bossTimeRemaining = $state(0);
	let bossActive = $state(false);

	// Frenzy — timestamp-based expiry, checked each rAF frame
	let frenzyStacks = $state<FrenzyStack[]>([]);
	let frenzyId = $state(0);

	// Stats (synced from playerStats by gameState)
	let baseAttackSpeed = $state(0.8);
	let tapFrenzyBonus = $state(0.05);
	let tapFrenzyDuration = $state(3);

	// Callbacks (set by gameState during start())
	let callbacks: Omit<LoopCallbacks, 'onBossSecond'> = {
		onAttack: () => {},
		onPoisonTick: () => {},
		onBossExpired: () => {}
	};

	function addFrenzyStack() {
		frenzyId++;
		const expiresAt = performance.now() + tapFrenzyDuration * 1000;
		frenzyStacks = [...frenzyStacks, { id: frenzyId, expiresAt }];
	}

	function frame(timestamp: number) {
		if (lastFrameTime === 0) {
			lastFrameTime = timestamp;
			rafId = requestAnimationFrame(frame);
			return;
		}

		const deltaMs = Math.min(timestamp - lastFrameTime, 200); // cap to prevent tab-switch bursts
		lastFrameTime = timestamp;

		// Decay frenzy stacks
		const now = performance.now();
		frenzyStacks = frenzyStacks.filter((s) => s.expiresAt > now);

		// Compute effective speed from current frenzy count
		const effectiveSpeed = getEffectiveAttackSpeed(
			baseAttackSpeed,
			frenzyStacks.length,
			tapFrenzyBonus
		);
		const attackInterval = getAttackIntervalMs(effectiveSpeed);

		// Build loop state
		const canAttack = pointerHeld || frenzyStacks.length > 0;

		const loopState: LoopState = {
			paused,
			canAttack,
			attackQueuedTap,
			bossActive,
			bossTimeRemaining
		};

		// Wrap callbacks
		const wrappedCallbacks: LoopCallbacks = {
			onAttack: () => {
				callbacks.onAttack();
				addFrenzyStack();
				attackQueuedTap = false;
			},
			onPoisonTick: () => {
				callbacks.onPoisonTick();
			},
			onBossSecond: () => {
				bossTimeRemaining--;
				if (bossTimeRemaining <= 0) {
					bossActive = false;
					callbacks.onBossExpired();
				}
			},
			onBossExpired: () => {} // handled inside onBossSecond
		};

		accumulators = tickFrame(deltaMs, accumulators, loopState, attackInterval, wrappedCallbacks);

		rafId = requestAnimationFrame(frame);
	}

	function start(cbs: Omit<LoopCallbacks, 'onBossSecond' | 'onBossExpired'> & { onBossExpired: () => void }) {
		callbacks = cbs;
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
		if (accumulators.attackCooldown <= 0) {
			// Fire immediately on next frame
			accumulators = { ...accumulators, attackCooldown: 0 };
		} else {
			attackQueuedTap = true;
		}
	}

	function pointerUp() {
		pointerHeld = false;
	}

	function startBossTimer(maxTime: number) {
		bossTimeRemaining = maxTime;
		bossActive = true;
		accumulators = { ...accumulators, bossTimer: 0 };
	}

	function stopBossTimer() {
		bossActive = false;
		bossTimeRemaining = 0;
	}

	function syncStats(stats: { attackSpeed: number; tapFrenzyBonus: number; tapFrenzyDuration: number }) {
		baseAttackSpeed = stats.attackSpeed;
		tapFrenzyBonus = stats.tapFrenzyBonus;
		tapFrenzyDuration = stats.tapFrenzyDuration;
	}

	function reset() {
		stop();
		accumulators = { attackCooldown: 0, poisonTick: 0, bossTimer: 0 };
		paused = false;
		pointerHeld = false;
		attackQueuedTap = false;
		bossTimeRemaining = 0;
		bossActive = false;
		frenzyStacks = [];
		frenzyId = 0;
		lastFrameTime = 0;
	}

	return {
		get bossTimer() { return bossTimeRemaining; },
		get bossActive() { return bossActive; },
		get effectiveAttackSpeed() {
			return getEffectiveAttackSpeed(baseAttackSpeed, frenzyStacks.length, tapFrenzyBonus);
		},
		get frenzyStacks() { return frenzyStacks.length; },
		get paused() { return paused; },
		start,
		stop,
		pause,
		resume,
		pointerDown,
		pointerUp,
		startBossTimer,
		stopBossTimer,
		syncStats,
		reset
	};
}
```

**Step 2: Run existing tests to verify no regressions**

Run: `bun test`
Expected: PASS (new file, no existing tests broken).

**Step 3: Commit**

`feat: create game loop store with rAF, frenzy stacks, and pointer input`

---

### Task 2.2: Migrate gameState from Timers to Game Loop

**Files:**
- Modify: `src/lib/stores/gameState.svelte.ts`
- Modify: `src/lib/stores/persistence.svelte.ts` (add `bossTimeRemaining` to `SessionSaveData`)
- Delete: `src/lib/stores/timers.svelte.ts`

**BUG FIX: Boss timer reset exploit.** Currently, reloading during a boss fight restarts the timer at full duration (`bossTimerMax`) because `bossTimeRemaining` is never saved. Players can infinitely retry boss fights by reloading. Fix: persist the remaining boss time and restore it on load.

**Step 1: Add `bossTimeRemaining` to `SessionSaveData`**

In `persistence.svelte.ts`, add to `SessionSaveData`:

```typescript
bossTimeRemaining?: number; // seconds remaining on boss timer (undefined = no boss)
```

**Step 2: Replace imports**

In `gameState.svelte.ts`, change:

```typescript
// OLD
import { createTimers } from './timers.svelte';
// ...
const timers = createTimers();

// NEW
import { createGameLoop } from './gameLoop.svelte';
// ...
const gameLoop = createGameLoop();
```

**Step 2: Replace all `timers.xxx` calls**

| Location | Old | New |
|----------|-----|-----|
| `selectUpgrade()` (after all events consumed) | `timers.startPoisonTick(applyPoison); timers.resumeBossTimer(handleBossExpired);` | `gameLoop.resume();` |
| `openNextUpgrade()` | `timers.stopPoisonTick(); timers.pauseBossTimer();` | `gameLoop.pause();` |
| `killEnemy()` (boss dies) | `timers.stopBossTimer();` | `gameLoop.stopBossTimer();` |
| `killEnemy()` (wave complete, spawn boss) | `timers.startBossTimer(bossTimerMax, handleBossExpired);` | `gameLoop.startBossTimer(bossTimerMax);` |
| `resetGame()` | `timers.stopAll();` | `gameLoop.reset();` |
| `init()` (boss resume) | `timers.startBossTimer(bossTimerMax, handleBossExpired);` | `gameLoop.startBossTimer(bossTimerMax);` |
| `init()` (poison start) | `timers.startPoisonTick(applyPoison);` | _(handled by game loop start)_ |
| `bossTimer` getter | `timers.bossTimer` | `gameLoop.bossTimer` |

**Step 3: Update `init()`**

```typescript
function init() {
	shop.load();
	const loaded = loadGame();
	if (!loaded) {
		applyPurchasedUpgrades();
		enemy.spawnEnemy(playerStats.greed);
	} else {
		if (enemy.isBoss) {
			// Restore saved boss time (fixes reload exploit — no more free timer resets)
			const data = persistence.loadSession();
			const savedBossTime = data?.bossTimeRemaining;
			gameLoop.startBossTimer(savedBossTime != null ? savedBossTime : bossTimerMax);
		}
	}

	gameLoop.syncStats(playerStats);
	gameLoop.start({
		onAttack: attack,
		onPoisonTick: applyPoison,
		onBossExpired: handleBossExpired
	});
}
```

**Step 4: Update `resetGame()`**

```typescript
function resetGame() {
	gameLoop.reset();

	playerStats = createDefaultStats();
	effects = [];
	unlockedUpgrades = new Set();
	gold = 0;
	poisonStacks = [];
	ui.reset();
	leveling.reset();
	showGameOver = false;
	shop.resetShopUI();
	persistence.clearSession();

	applyPurchasedUpgrades();
	gameLoop.syncStats(playerStats);
	enemy.reset(playerStats.greed);

	gameLoop.start({
		onAttack: attack,
		onPoisonTick: applyPoison,
		onBossExpired: handleBossExpired
	});
}
```

**Step 5: Save and restore boss timer remaining**

In `saveGame()`, add `bossTimeRemaining` to the session data:

```typescript
persistence.saveSession({
	// ...existing fields...
	bossTimeRemaining: gameLoop.bossActive ? gameLoop.bossTimer : undefined
});
```

In `init()`, restore with saved time instead of full max:

```typescript
} else if (enemy.isBoss) {
	const savedBossTime = data?.bossTimeRemaining;
	gameLoop.startBossTimer(savedBossTime != null ? savedBossTime : bossTimerMax);
}
```

This fixes the exploit where reloading during a boss fight reset the timer to full.

**Step 6: Add `gameLoop.syncStats()` calls**

Add `gameLoop.syncStats(playerStats);` after:
- `upgrade.apply(playerStats)` in `selectUpgrade()`
- `applyPurchasedUpgrades()` in `init()` (already done in Step 3)
- `applyPurchasedUpgrades()` in `resetGame()` (already done in Step 4)
- Successful `loadGame()` path in `init()` (before `gameLoop.start()`)

**Step 7: Replace `attack` action with pointer controls in return object**

Remove `attack` from the returned object. Add:

```typescript
// Pointer controls
pointerDown: () => gameLoop.pointerDown(),
pointerUp: () => gameLoop.pointerUp(),

// New getters
get bossTimer() { return gameLoop.bossTimer; },
get effectiveAttackSpeed() { return gameLoop.effectiveAttackSpeed; },
get frenzyStacks() { return gameLoop.frenzyStacks; },
```

**Step 8: Delete `src/lib/stores/timers.svelte.ts`**

**Step 9: Run tests**

Run: `bun test`
Expected: Some tests may reference `timers` or `attack()` directly — fix any that break. The `uiEffects.test.ts` tests should still pass (they use `vi.useFakeTimers()` for `setTimeout`, unrelated to game loop).

**Step 10: Commit**

`refactor: replace setInterval timers with rAF game loop, fix boss timer reset exploit`

---

### Task 2.3: Update BattleArea for Pointer Input

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

Update the destructuring to match.

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

Prevents browser scroll/zoom on pointer hold (mobile).

```css
.enemy {
	/* ...existing styles... */
	touch-action: none;
}
```

**Step 4: Update hint text**

```svelte
<p class="hint">Tap or hold to attack!</p>
```

**Step 5: Add frenzy stack indicator**

Add after the health text, before the hint:

```svelte
{#if frenzyStacks > 0}
	<div class="frenzy-indicator">
		<span class="frenzy-icon">🔥</span>
		<span class="frenzy-count">{frenzyStacks}</span>
		<span class="frenzy-speed">{effectiveAttackSpeed.toFixed(1)}/s</span>
	</div>
{/if}
```

Style:

```css
.frenzy-indicator {
	display: flex;
	align-items: center;
	gap: 4px;
	background: rgba(239, 68, 68, 0.2);
	border: 1px solid rgba(239, 68, 68, 0.5);
	border-radius: 8px;
	padding: 4px 10px;
	font-size: 0.85rem;
	color: #fca5a5;
	animation: frenzy-pulse 0.8s ease-in-out infinite;
}

.frenzy-icon { font-size: 0.9rem; }
.frenzy-count { font-weight: bold; color: #ef4444; }
.frenzy-speed { color: rgba(255, 255, 255, 0.6); font-size: 0.8rem; }

@keyframes frenzy-pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.7; }
}
```

**Step 6: Update `+page.svelte`**

Find where `<BattleArea>` is rendered. Replace:

```svelte
onAttack={() => gameState.attack()}
```

with:

```svelte
onPointerDown={() => gameState.pointerDown()}
onPointerUp={() => gameState.pointerUp()}
frenzyStacks={gameState.frenzyStacks}
effectiveAttackSpeed={gameState.effectiveAttackSpeed}
```

**Step 7: Manual test**

Run: `bun run dev`

Test:
- Tap enemy → fires one attack immediately, hit number appears
- Hold enemy → auto-attacks at ~0.8/sec, frenzy indicator appears and grows
- Release → attacks continue briefly while frenzy stacks decay, then stop
- Tap during cooldown → attack fires when cooldown ends (queued)
- Boss timer → counts down correctly, game over on expiry
- Poison → ticks at 1s intervals as before
- Open upgrade modal → game pauses (no attacks, no poison, no boss countdown)
- Close upgrade modal → game resumes
- Spacebar → same behavior as pointer (keydown = attack, keyup = stop)
- Boss timer reload: start boss fight, note timer at e.g. 15s, reload page → timer resumes at ~15s, NOT full duration

**Step 8: Commit**

`feat: replace onclick with pointer input for tap-and-hold attacks`

---

## Phase 3: Upgrade Cards + Changelog

### Task 3.1: Add Attack Speed Upgrade Cards

**Files:**
- Modify: `src/lib/data/upgrades.ts`
- Modify: `src/lib/stores/gameState.svelte.ts` (special effect tracking)

**Step 1: Add cards to `allUpgrades` array in `upgrades.ts`**

Use existing `swordImg` for attack speed, `fireImg` for frenzy. Follow the existing card pattern exactly.

| ID | Title | Rarity | Stats Display | Apply |
|----|-------|--------|---------------|-------|
| `atkspd1` | Swift Strikes | common | Attack Speed +0.1/s | `s.attackSpeed += 0.1` |
| `atkspd2` | Rapid Assault | uncommon | Attack Speed +0.2/s | `s.attackSpeed += 0.2` |
| `atkspd3` | Blinding Speed | rare | Attack Speed +0.4/s | `s.attackSpeed += 0.4` |
| `frenzy1` | Battle Fervor | uncommon | Frenzy Bonus +5%/stack | `s.tapFrenzyBonus += 0.05` |
| `frenzy2` | Relentless | rare | Frenzy Bonus +5%/stack, Attack Speed +0.2/s | `s.tapFrenzyBonus += 0.05; s.attackSpeed += 0.2` |

**Step 2: Add to special effect tracking in `selectUpgrade()`**

In `gameState.svelte.ts`, the `hasSpecialEffect` check that scans `s.label.includes(...)` — add:

```typescript
s.label.includes('Attack Speed') ||
s.label.includes('Frenzy')
```

**Step 3: Run tests**

Run: `bun test`
Expected: PASS. Existing upgrade tests should continue to pass. New cards follow the same pattern.

**Step 4: Commit**

`feat: add attack speed and frenzy upgrade cards`

---

### Task 3.2: Add Changelog Entry

**Files:**
- Modify: `src/lib/changelog.ts`

**Step 1: Check current version**

Read the latest entry in `CHANGELOG` array to determine current version. Add entry for the next minor version.

**Step 2: Add entry**

```typescript
{
	version: '0.28.0',
	date: '2026-01-31',
	changes: [
		{ category: 'new', description: 'Added attack speed stat with auto-attack on tap-and-hold' },
		{ category: 'new', description: 'Added tap frenzy system that temporarily boosts attack speed with rapid tapping' },
		{ category: 'new', description: 'Added 5 new upgrade cards to discover' },
		{ category: 'changed', description: 'Replaced interval-based game timing with a smooth frame-based game loop' },
		{ category: 'changed', description: 'Changed attack input from click to tap-and-hold with tap queuing' }
	]
}
```

Note: Adjust version if another plan has already claimed `0.28.0`. Follow CLAUDE.md rules (no specific card names).

**Step 3: Commit**

`docs: add changelog entry for game loop and attack speed`

---

## Implementation Order

```
Phase 1: Stats + Pure Engine
├─ Task 1.1  Add new stats to PlayerStats
├─ Task 1.2  Game loop engine — helpers + tests
└─ Task 1.3  Game loop engine — tickFrame + tests

Phase 2: rAF Store + Migration + UI
├─ Task 2.1  Create game loop store (rAF + runes)
├─ Task 2.2  Migrate gameState from timers to game loop
└─ Task 2.3  Update BattleArea + page for pointer input + frenzy UI

Phase 3: Upgrade Cards + Changelog
├─ Task 3.1  Add attack speed upgrade cards
└─ Task 3.2  Add changelog entry
```

**Total tasks: 8**
**Total commits: ~8**

---

## Design Decisions

1. **rAF with 200ms delta cap.** Prevents tab-switch burst. Game effectively pauses when backgrounded.
2. **Frenzy stacks use timestamp expiry, not setTimeout.** Checked each rAF frame. Clean since the loop is already running.
3. **UI effects (hit numbers, gold drops) stay on setTimeout.** Cosmetic, not game logic. No change needed.
4. **`pointerleave` triggers pointerUp.** Prevents stuck auto-attack when dragging off enemy.
5. **First tap fires immediately.** pointerDown sets cooldown to 0 if not in cooldown, or queues if in cooldown.
6. **Attacks continue after pointerup while frenzy stacks remain.** `canAttack = pointerHeld || frenzyStacks > 0`. Stacks decay naturally.
7. **Single queued tap.** `attackQueuedTap` is boolean, not counter. No spam-queuing.
8. **Backward compat.** Old saves get new stat defaults via existing `{ ...createDefaultStats(), ...data.playerStats }` merge in `loadGame()`.
9. **`onBossSecond` handled internally by store.** Store decrements `bossTimeRemaining` and calls `onBossExpired` when <= 0.
10. **Pure engine is fully testable.** `tickFrame`, `getEffectiveAttackSpeed`, `getAttackIntervalMs` have no browser dependencies.
