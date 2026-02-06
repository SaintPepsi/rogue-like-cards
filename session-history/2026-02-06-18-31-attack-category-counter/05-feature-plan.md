# Attack Category Counter - Implementation Plan

## Architecture Overview

```
+------------------------+     +---------------------------+
|     types.ts           |     |   persistence.svelte.ts   |
|  - Add AttackCounts    |     |  - Add attackCounts to    |
|    type alias          |     |    SessionSaveData        |
+------------------------+     +---------------------------+
            |                              |
            v                              v
+-----------------------------------------------------------+
|                  gameState.svelte.ts                       |
|  - attackCounts state (Record<string, number>)             |
|  - incrementAttackCount() helper function                  |
|  - Increment in attack() after mapping hits (line ~228)    |
|  - Increment in tickSystems() for poison ticks (line ~252) |
|  - Reset in resetGame() (line ~557)                        |
|  - Save/load in saveGame()/loadGame()                      |
|  - Expose via getter                                       |
+-----------------------------------------------------------+
            |
            v
+------------------------+     +---------------------------+
|   BattleArea.svelte    |     |   GameOverModal.svelte    |
|  - Add attackCounts    |     |  - Add attackCounts prop  |
|    prop                |     |  - Render in game-over-   |
|  - Render breakdown    |     |    stats section          |
|    in battle-stats     |     |                           |
+------------------------+     +---------------------------+
            ^                              ^
            |                              |
+-----------------------------------------------------------+
|                    +page.svelte                            |
|  - Pass gameState.attackCounts to BattleArea               |
|  - Pass gameState.attackCounts to GameOverModal            |
+-----------------------------------------------------------+
```

## Files to Modify

### 1. `src/lib/types.ts`

**Location:** After line 77 (end of file)

**Before:**

```ts
export type GoldDrop = {
	id: number;
	amount: number;
};
```

**After:**

```ts
export type GoldDrop = {
	id: number;
	amount: number;
};

// DECISION: Use Record<string, number> keyed by HitType string rather than fixed object
// Why: Future-proofs for new attack types without code changes. The existing HitType union
// can grow without requiring changes to the counter structure.
export type AttackCounts = Record<string, number>;
```

**Verification:** TypeScript compiles without errors.

---

### 2. `src/lib/stores/persistence.svelte.ts`

**Location:** Line 30 (inside SessionSaveData interface, after `endingStats`)

**Before (lines 29-31):**

```ts
	startingStats?: PlayerStats;
	endingStats?: PlayerStats;
}
```

**After:**

```ts
	startingStats?: PlayerStats;
	endingStats?: PlayerStats;
	attackCounts?: Record<string, number>;
}
```

**Verification:** TypeScript compiles without errors.

---

### 3. `src/lib/stores/gameState.svelte.ts`

#### 3a. Add state variable (after line 61)

**Location:** After `let poisonStackCount = $state(0);` (line 61)

**Add:**

```ts
// Attack category counters - track hits by type for run statistics
let attackCounts = $state<Record<string, number>>({});
```

#### 3b. Add helper function (after syncPoisonStacks, around line 183)

**Location:** After `syncPoisonStacks()` function (line 182)

**Add:**

```ts
function incrementAttackCount(type: string) {
	attackCounts = { ...attackCounts, [type]: (attackCounts[type] ?? 0) + 1 };
}
```

#### 3c. Increment counts in attack() (after line 228)

**Location:** After the hits are mapped (after the `newHits` creation, before `dealDamage`)

**Before (lines 228-231):**

```ts
		});

		enemy.setOverkillDamage(result.overkillDamageOut);
		dealDamage(result.totalDamage, newHits);
```

**After:**

```ts
		});

		// Increment attack counts for run statistics
		for (const hit of newHits) {
			incrementAttackCount(hit.type);
		}

		enemy.setOverkillDamage(result.overkillDamageOut);
		dealDamage(result.totalDamage, newHits);
```

#### 3d. Increment counts in tickSystems() (after line 251)

**Location:** Inside the tick loop, after creating the hit

**Before (lines 244-252):**

```ts
dealDamage(tick.damage, [
	{
		damage: tick.damage,
		type: (tick.hitType ?? 'poison') as HitType,
		id: ui.nextHitId(),
		index: 0
	}
]);
```

**After:**

```ts
const hitType = (tick.hitType ?? 'poison') as HitType;
incrementAttackCount(hitType);
dealDamage(tick.damage, [
	{
		damage: tick.damage,
		type: hitType,
		id: ui.nextHitId(),
		index: 0
	}
]);
```

#### 3e. Save attackCounts in saveGame() (after line 472)

**Location:** Inside `persistence.saveSession()` call, after `endingStats`

**Before (line 472-473):**

```ts
			endingStats: endingStats ?? undefined
		});
```

**After:**

```ts
			endingStats: endingStats ?? undefined,
			attackCounts: { ...attackCounts }
		});
```

#### 3f. Restore attackCounts in loadGame() (after line 534)

**Location:** After restoring `endingStats`, before `return true;`

**Before (lines 533-536):**

```ts
// Restore stats comparison data
startingStats = data.startingStats ?? null;
endingStats = data.endingStats ?? null;

return true;
```

**After:**

```ts
// Restore stats comparison data
startingStats = data.startingStats ?? null;
endingStats = data.endingStats ?? null;

// Restore attack counts
attackCounts = data.attackCounts ?? {};

return true;
```

#### 3g. Reset attackCounts in resetGame() (after line 566)

**Location:** After `ui.reset();` in `resetGame()`

**Before (lines 565-567):**

```ts
ui.reset();
leveling.reset();
showGameOver = false;
```

**After:**

```ts
ui.reset();
attackCounts = {};
leveling.reset();
showGameOver = false;
```

#### 3h. Add getter in return object (after line 773)

**Location:** After `endingStats` getter, before `// Actions` comment

**Before (lines 770-776):**

```ts
		get endingStats() {
			return endingStats;
		},

		// Actions
```

**After:**

```ts
		get endingStats() {
			return endingStats;
		},
		get attackCounts() {
			return attackCounts;
		},

		// Actions
```

---

### 4. `src/lib/components/BattleArea.svelte`

#### 4a. Add prop and import (lines 2, 11-12, 27)

**Before (lines 2, 11-25, 27):**

```ts
	import type { HitInfo, GoldDrop } from '$lib/types';
	...
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
	};
	...
		frenzyStacks
```

**After:**

```ts
	import type { HitInfo, GoldDrop, AttackCounts } from '$lib/types';
	...
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
		attackCounts: AttackCounts;
	};
	...
		frenzyStacks,
		attackCounts
```

#### 4b. Add format helper function (after line 41)

**Location:** After the props destructuring, before `</script>`

**Add:**

```ts
// DECISION: Display labels are defined here near the UI that uses them
// Why: Configuration near usage principle - avoids centralizing unrelated config
function formatAttackType(type: string): string {
	const labels: Record<string, string> = {
		normal: 'Normal Hits',
		crit: 'Critical Hits',
		execute: 'Executes',
		poison: 'Poison Ticks',
		poisonCrit: 'Poison Crits'
	};
	return labels[type] ?? type;
}

// Order for display consistency
const ATTACK_TYPE_ORDER = ['normal', 'crit', 'execute', 'poison', 'poisonCrit'];

function getSortedAttackCounts(counts: AttackCounts): [string, number][] {
	return Object.entries(counts)
		.filter(([, count]) => count > 0)
		.sort(([a], [b]) => {
			const aIndex = ATTACK_TYPE_ORDER.indexOf(a);
			const bIndex = ATTACK_TYPE_ORDER.indexOf(b);
			// Unknown types go to end
			const aSort = aIndex === -1 ? 999 : aIndex;
			const bSort = bIndex === -1 ? 999 : bIndex;
			return aSort - bSort;
		});
}
```

#### 4c. Add attack counts display (after line 99)

**Location:** Inside `.battle-stats` div, after the gold paragraph

**Before (lines 92-100):**

```svelte
<div class="battle-stats">
	<p class="kills">Enemies Killed: {formatNumber(enemiesKilled)}</p>
	<p class="gold">
		Gold: {formatNumber(gold)}
		{#each goldDrops as drop (drop.id)}
			<span class="gold-drop-popup">+{drop.amount}g</span>
		{/each}
	</p>
</div>
```

**After:**

```svelte
<div class="battle-stats">
	<p class="kills">Enemies Killed: {formatNumber(enemiesKilled)}</p>
	<p class="gold">
		Gold: {formatNumber(gold)}
		{#each goldDrops as drop (drop.id)}
			<span class="gold-drop-popup">+{drop.amount}g</span>
		{/each}
	</p>
	{@const sortedCounts = getSortedAttackCounts(attackCounts)}
	{#if sortedCounts.length > 0}
		<div class="attack-breakdown">
			<p class="breakdown-header">Attack Breakdown</p>
			{#each sortedCounts as [type, count] (type)}
				<p class="attack-count {type}">{formatAttackType(type)}: {formatNumber(count)}</p>
			{/each}
		</div>
	{/if}
</div>
```

#### 4d. Add styles (after line 158)

**Location:** At the end of the `<style>` block, before `</style>`

**Add:**

```css
.attack-breakdown {
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.breakdown-header {
	font-size: 0.9rem;
	color: rgba(255, 255, 255, 0.5);
	margin: 0 0 4px;
}

.attack-count {
	font-size: 0.95rem;
	color: rgba(255, 255, 255, 0.8);
	margin: 2px 0;
}

.attack-count.crit {
	color: #fbbf24;
}

.attack-count.execute {
	color: #ef4444;
}

.attack-count.poison {
	color: #22c55e;
}

.attack-count.poisonCrit {
	color: #84cc16;
}
```

---

### 5. `src/lib/components/GameOverModal.svelte`

#### 5a. Add prop and import (lines 4, 19, 32)

**Before (lines 4, 7-19, 21-33):**

```ts
	import type { PlayerStats } from '$lib/types';
	...
	type Props = {
		show: boolean;
		stage: number;
		level: number;
		enemiesKilled: number;
		goldEarned: number;
		totalGold: number;
		startingStats: PlayerStats | null;
		endingStats: PlayerStats | null;
		wasDefeatNatural: boolean;
		onReset: () => void;
		onOpenShop: () => void;
	};
	...
		onOpenShop
	}: Props = $props();
```

**After:**

```ts
	import type { PlayerStats, AttackCounts } from '$lib/types';
	...
	type Props = {
		show: boolean;
		stage: number;
		level: number;
		enemiesKilled: number;
		goldEarned: number;
		totalGold: number;
		startingStats: PlayerStats | null;
		endingStats: PlayerStats | null;
		wasDefeatNatural: boolean;
		attackCounts: AttackCounts;
		onReset: () => void;
		onOpenShop: () => void;
	};
	...
		attackCounts,
		onReset,
		onOpenShop
	}: Props = $props();
```

#### 5b. Add helper functions (after line 47)

**Location:** After `getChangedStats` function, before `</script>`

**Add:**

```ts
function formatAttackType(type: string): string {
	const labels: Record<string, string> = {
		normal: 'Normal Hits',
		crit: 'Critical Hits',
		execute: 'Executes',
		poison: 'Poison Ticks',
		poisonCrit: 'Poison Crits'
	};
	return labels[type] ?? type;
}

const ATTACK_TYPE_ORDER = ['normal', 'crit', 'execute', 'poison', 'poisonCrit'];

function getSortedAttackCounts(counts: AttackCounts): [string, number][] {
	return Object.entries(counts)
		.filter(([, count]) => count > 0)
		.sort(([a], [b]) => {
			const aIndex = ATTACK_TYPE_ORDER.indexOf(a);
			const bIndex = ATTACK_TYPE_ORDER.indexOf(b);
			const aSort = aIndex === -1 ? 999 : aIndex;
			const bSort = bIndex === -1 ? 999 : bIndex;
			return aSort - bSort;
		});
}
```

#### 5c. Add attack breakdown display (after line 59)

**Location:** After the `game-over-stats` div, before the `stats-comparison` section

**Before (lines 55-62):**

```svelte
<div class="game-over-stats">
	<p>Stage Reached: <strong>{stage}</strong></p>
	<p>Level: <strong>{level}</strong></p>
	<p>Enemies Killed: <strong>{formatNumber(enemiesKilled)}</strong></p>
	<p>Gold Earned: <strong class="gold-amount">{formatNumber(goldEarned)}</strong></p>
</div>

<!-- Stats progression section -->
```

**After:**

```svelte
<div class="game-over-stats">
	<p>Stage Reached: <strong>{stage}</strong></p>
	<p>Level: <strong>{level}</strong></p>
	<p>Enemies Killed: <strong>{formatNumber(enemiesKilled)}</strong></p>
	<p>Gold Earned: <strong class="gold-amount">{formatNumber(goldEarned)}</strong></p>
</div>

<!-- Attack breakdown section -->
{@const sortedCounts = getSortedAttackCounts(attackCounts)}
{#if sortedCounts.length > 0}
	<div class="attack-breakdown">
		<h3>Attack Breakdown</h3>
		{#each sortedCounts as [type, count] (type)}
			<div class="attack-row">
				<span class="attack-label {type}">{formatAttackType(type)}</span>
				<span class="attack-value">{formatNumber(count)}</span>
			</div>
		{/each}
	</div>
{/if}

<!-- Stats progression section -->
```

#### 5d. Add styles (at end of `<style>` block)

**Add:**

```css
.attack-breakdown {
	background: rgba(0, 0, 0, 0.3);
	padding: 16px;
	border-radius: 8px;
	margin: 16px 0;
}

.attack-breakdown h3 {
	color: #60a5fa;
	margin: 0 0 12px;
	font-size: 1.2rem;
	text-align: center;
}

.attack-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin: 4px 0;
	color: rgba(255, 255, 255, 0.8);
}

.attack-label {
	font-weight: 500;
}

.attack-label.crit {
	color: #fbbf24;
}

.attack-label.execute {
	color: #ef4444;
}

.attack-label.poison {
	color: #22c55e;
}

.attack-label.poisonCrit {
	color: #84cc16;
}

.attack-value {
	font-weight: bold;
	font-family: monospace;
}
```

---

### 6. `src/routes/+page.svelte`

#### 6a. Pass attackCounts to BattleArea (line 252)

**Before (lines 238-252):**

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
	poisonStacks={gameState.poisonStacks}
	onPointerDown={gameState.pointerDown}
	onPointerUp={gameState.pointerUp}
	frenzyStacks={gameState.frenzyStacks}
/>
```

**After:**

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
	poisonStacks={gameState.poisonStacks}
	onPointerDown={gameState.pointerDown}
	onPointerUp={gameState.pointerUp}
	frenzyStacks={gameState.frenzyStacks}
	attackCounts={gameState.attackCounts}
/>
```

#### 6b. Pass attackCounts to GameOverModal (line 298)

**Before (lines 286-298):**

```svelte
<GameOverModal
	show={gameState.showGameOver && !gameState.showShop}
	stage={gameState.stage}
	level={gameState.level}
	enemiesKilled={gameState.enemiesKilled}
	goldEarned={gameState.gold}
	totalGold={gameState.persistentGold}
	startingStats={gameState.startingStats}
	endingStats={gameState.endingStats}
	wasDefeatNatural={gameState.wasDefeatNatural}
	onReset={gameState.resetGame}
	onOpenShop={gameState.openShop}
/>
```

**After:**

```svelte
<GameOverModal
	show={gameState.showGameOver && !gameState.showShop}
	stage={gameState.stage}
	level={gameState.level}
	enemiesKilled={gameState.enemiesKilled}
	goldEarned={gameState.gold}
	totalGold={gameState.persistentGold}
	startingStats={gameState.startingStats}
	endingStats={gameState.endingStats}
	wasDefeatNatural={gameState.wasDefeatNatural}
	attackCounts={gameState.attackCounts}
	onReset={gameState.resetGame}
	onOpenShop={gameState.openShop}
/>
```

---

## Implementation Steps

### Step 1: Add AttackCounts type to types.ts

**Files:** `src/lib/types.ts`

**Changes:**

- Add `AttackCounts` type alias after `GoldDrop` type

**Verification:**

```bash
npx tsc --noEmit
```

---

### Step 2: Add attackCounts to SessionSaveData

**Files:** `src/lib/stores/persistence.svelte.ts`

**Changes:**

- Add optional `attackCounts` field to `SessionSaveData` interface

**Verification:**

```bash
npx tsc --noEmit
```

---

### Step 3: Add attackCounts state and logic to gameState

**Files:** `src/lib/stores/gameState.svelte.ts`

**Changes:**

- Add `attackCounts` state variable
- Add `incrementAttackCount()` helper function
- Increment counts in `attack()` function
- Increment counts in `tickSystems()` function
- Save counts in `saveGame()`
- Restore counts in `loadGame()`
- Reset counts in `resetGame()`
- Add `attackCounts` getter to return object

**Verification:**

```bash
npx tsc --noEmit
npm run dev  # Manual test: attack enemy, check console for no errors
```

---

### Step 4: Add attackCounts prop to BattleArea

**Files:** `src/lib/components/BattleArea.svelte`

**Changes:**

- Import `AttackCounts` type
- Add `attackCounts` prop
- Add `formatAttackType()` and `getSortedAttackCounts()` helpers
- Render attack breakdown section
- Add CSS styles for attack counts

**Verification:**

```bash
npx tsc --noEmit
npm run dev  # Visual: attack enemy, see counts appear in battle-stats
```

---

### Step 5: Add attackCounts prop to GameOverModal

**Files:** `src/lib/components/GameOverModal.svelte`

**Changes:**

- Import `AttackCounts` type
- Add `attackCounts` prop
- Add helper functions (same as BattleArea)
- Render attack breakdown section
- Add CSS styles

**Verification:**

```bash
npx tsc --noEmit
npm run dev  # Visual: trigger game over, see attack breakdown in modal
```

---

### Step 6: Pass attackCounts from +page.svelte

**Files:** `src/routes/+page.svelte`

**Changes:**

- Pass `attackCounts={gameState.attackCounts}` to BattleArea
- Pass `attackCounts={gameState.attackCounts}` to GameOverModal

**Verification:**

```bash
npx tsc --noEmit
npm run dev  # Full flow test
```

---

### Step 7: Manual Testing & Edge Cases

1. **Fresh start:** Start new game, attack, verify counts increment
2. **Multi-strike:** With multiStrike upgrade, verify each strike counts
3. **Poison ticks:** Apply poison, verify poison counts increment
4. **Execute:** With execute chance, verify execute counts
5. **Crit:** With crit chance, verify crit counts
6. **Page refresh:** Mid-run refresh, verify counts persist
7. **Game over:** Complete run, verify counts show in modal
8. **New run:** Start new run, verify counts reset to empty

---

## Risk Areas

### 1. Type Coercion in Hit Type Mapping

**Location:** `gameState.svelte.ts` lines 207-228

**Risk:** The switch statement maps pipeline types (`criticalHit`, `executeHit`, `hit`) to UI types (`crit`, `execute`, `normal`). If a new pipeline type is added without updating the switch, it will fall through to the default case and use the raw type.

**Mitigation:** The default case `uiType = h.type as HitType` handles unknown types gracefully. The increment function accepts `string` keys, so new types will still be counted even if not explicitly labeled.

### 2. Object Spread for Immutable State Updates

**Location:** `incrementAttackCount()` function

**Risk:** Using object spread creates a new object on every increment. For high attack speeds (10+ attacks/second with multiStrike), this creates many short-lived objects.

**Mitigation:** JavaScript engines are highly optimized for this pattern. The game already uses this pattern extensively (e.g., `effects = [...effects]`). Negligible performance impact.

### 3. Persistence Backward Compatibility

**Location:** `persistence.svelte.ts` and `loadGame()`

**Risk:** Existing save files don't have `attackCounts`. Loading old saves could cause issues.

**Mitigation:** The `attackCounts` field is optional (`attackCounts?: Record<string, number>`), and `loadGame()` uses nullish coalescing (`data.attackCounts ?? {}`). Old saves will start with empty counts, which is correct behavior.

### 4. Display Order Consistency

**Location:** `getSortedAttackCounts()` helper

**Risk:** `Object.entries()` does not guarantee order. Without explicit sorting, attack types could appear in different orders on different browsers or runs.

**Mitigation:** The implementation includes explicit ordering via `ATTACK_TYPE_ORDER` array. Unknown types (future additions) are sorted to the end.

---

## Testing Checklist

- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] Development server runs without errors (`npm run dev`)
- [ ] Normal attacks increment "normal" counter
- [ ] Critical hits increment "crit" counter
- [ ] Execute hits increment "execute" counter
- [ ] Poison ticks increment "poison" counter
- [ ] Multi-strike attacks increment counter for each strike
- [ ] Counter resets on new run
- [ ] Counter persists across page refresh
- [ ] Counter displays in battle-stats (during run)
- [ ] Counter displays in game over modal
- [ ] Empty counters (no attacks) show nothing (no clutter)
- [ ] Styles match existing UI aesthetic
