# Enemy Types & Class System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 enemy types with unique mechanics/resistances and a 3-class system (Warrior/Mage/Rogue) with class selection at Level 30, class-specific card pools, and class ability UIs.

**Architecture:** The feature decomposes into 4 independent pillars built bottom-up: (1) Enemy type data layer + spawn integration, (2) Enemy mechanics engine + combat integration, (3) Class system data layer + selection UI, (4) Class ability engines + battle UI. Each pillar starts with pure logic (testable), then wires into stores, then adds UI. Card reclassification is a cross-cutting concern woven into pillar 3.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript, Vitest, Tailwind CSS, existing Sunnyside World pixel art sprites.

---

## Pillar Overview

| Pillar | What It Delivers | Dependencies |
|--------|-----------------|--------------|
| **1. Enemy Types (Data + Spawning)** | 5 enemy definitions, sprite loading, type-aware spawning, enemy name/type in UI | None |
| **2. Enemy Mechanics (Combat)** | Resistances, weaknesses, unique per-enemy mechanics (Reassemble, Nimble, Spore Cloud, Frost Aura, Creeping Darkness) | Pillar 1 |
| **3. Class System (Data + Selection)** | Class type, card reclassification, class-filtered upgrade pools, Level 30 selection modal, persistence | Pillar 1 (for enemy context during selection) |
| **4. Class Abilities (Combat + UI)** | Warrior weapon roulette, Mage elements + mana, Rogue poison cloud, class-specific battle UI | Pillars 1, 2, 3 |

Each pillar is broken into tasks of 2-5 minutes. Tasks within a pillar are sequential. Pillars 1 and 3 can be built in parallel. Pillar 2 depends on 1. Pillar 4 depends on all others.

---

## Pillar 1: Enemy Types (Data + Spawning)

### Task 1.1: Define Enemy Type Data Model

**Files:**
- Create: `src/lib/data/enemies.ts`
- Modify: `src/lib/types.ts` (add `EnemyType` type)
- Test: `src/lib/data/enemies.test.ts`

**Step 1: Add EnemyType to types.ts**

Add after the `GoldDrop` type at the bottom of `src/lib/types.ts`:

```typescript
export type EnemyTypeId = 'skeleton' | 'goblin' | 'red_mushroom' | 'blue_mushroom' | 'blinking_eyes';

export type DamageType = 'physical' | 'bleed' | 'poison' | 'fire' | 'frost' | 'arcane' | 'stun';

export type ResistanceLevel = 'immune' | 'resistant' | 'normal' | 'weak';

export type EnemyMechanicId = 'reassemble' | 'nimble' | 'spore_cloud' | 'frost_aura' | 'creeping_darkness';

export type EnemyTypeDefinition = {
	id: EnemyTypeId;
	name: string;
	spriteImport: string; // Path to sprite asset
	stageIntroduced: number;
	resistances: Partial<Record<DamageType, ResistanceLevel>>;
	mechanic: EnemyMechanicId;
	mechanicDescription: string;
};
```

**Step 2: Create enemies.ts data file**

Create `src/lib/data/enemies.ts`:

```typescript
import type { EnemyTypeId, EnemyTypeDefinition, DamageType, ResistanceLevel } from '$lib/types';

// Sprite imports - these will use existing enemy.png initially
// New sprites will be added as assets become available
import skeletonSprite from '$lib/assets/images/enemy.png';
// Placeholder: all enemies use skeleton sprite until art is added
// TODO: Import actual sprites when available:
// import goblinSprite from '$lib/assets/images/enemies/goblin.png';
// import redMushroomSprite from '$lib/assets/images/enemies/red_mushroom.png';
// import blueMushroomSprite from '$lib/assets/images/enemies/blue_mushroom.png';
// import blinkingEyesSprite from '$lib/assets/images/enemies/blinking_eyes.png';

export const ENEMY_DEFINITIONS: Record<EnemyTypeId, EnemyTypeDefinition> = {
	skeleton: {
		id: 'skeleton',
		name: 'Skeleton',
		spriteImport: skeletonSprite,
		stageIntroduced: 1,
		resistances: {
			bleed: 'immune',
			stun: 'weak' // 2x stun duration
		},
		mechanic: 'reassemble',
		mechanicDescription: 'May revive once at 25% HP. Overkill prevents revival.'
	},
	goblin: {
		id: 'goblin',
		name: 'Goblin',
		spriteImport: skeletonSprite, // placeholder
		stageIntroduced: 1,
		resistances: {
			stun: 'resistant', // halved duration
			poison: 'weak'
		},
		mechanic: 'nimble',
		mechanicDescription: 'Periodically dodges, nullifying the next tap.'
	},
	red_mushroom: {
		id: 'red_mushroom',
		name: 'Red Mushroom',
		spriteImport: skeletonSprite, // placeholder
		stageIntroduced: 2,
		resistances: {
			poison: 'immune',
			fire: 'weak' // 2x fire DoT
		},
		mechanic: 'spore_cloud',
		mechanicDescription: 'Periodically reduces player Attack by 1.'
	},
	blue_mushroom: {
		id: 'blue_mushroom',
		name: 'Blue Mushroom',
		spriteImport: skeletonSprite, // placeholder
		stageIntroduced: 3,
		resistances: {
			frost: 'immune',
			bleed: 'weak' // 2x bleed
		},
		mechanic: 'frost_aura',
		mechanicDescription: 'Slows all player DoT tick rates while alive.'
	},
	blinking_eyes: {
		id: 'blinking_eyes',
		name: 'Blinking Eyes',
		spriteImport: skeletonSprite, // placeholder
		stageIntroduced: 4,
		resistances: {
			physical: 'normal', // execute immune handled separately
			arcane: 'weak'
		},
		mechanic: 'creeping_darkness',
		mechanicDescription: 'Drains a random stat if player stops tapping for 2s.'
	}
};

export const ENEMY_TYPE_LIST: EnemyTypeId[] = Object.keys(ENEMY_DEFINITIONS) as EnemyTypeId[];

/**
 * Get enemy types available at a given stage.
 * Enemies unlock progressively per the design doc schedule.
 */
export function getAvailableEnemyTypes(stage: number): EnemyTypeId[] {
	return ENEMY_TYPE_LIST.filter(
		(id) => ENEMY_DEFINITIONS[id].stageIntroduced <= stage
	);
}

/**
 * Pick a random enemy type from the pool available at the given stage.
 */
export function pickRandomEnemyType(stage: number, rng: () => number = Math.random): EnemyTypeId {
	const available = getAvailableEnemyTypes(stage);
	return available[Math.floor(rng() * available.length)];
}

/**
 * Get the resistance level for a specific damage type against an enemy.
 * Returns 'normal' if no specific resistance is defined.
 */
export function getResistance(enemyType: EnemyTypeId, damageType: DamageType): ResistanceLevel {
	return ENEMY_DEFINITIONS[enemyType].resistances[damageType] ?? 'normal';
}

/**
 * Get the damage multiplier based on resistance level.
 * immune = 0x, resistant = 0.5x, normal = 1x, weak = 2x
 */
export function getResistanceMultiplier(level: ResistanceLevel): number {
	switch (level) {
		case 'immune': return 0;
		case 'resistant': return 0.5;
		case 'normal': return 1;
		case 'weak': return 2;
	}
}
```

**Step 3: Write tests**

Create `src/lib/data/enemies.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import {
	ENEMY_DEFINITIONS,
	getAvailableEnemyTypes,
	pickRandomEnemyType,
	getResistance,
	getResistanceMultiplier
} from './enemies';

describe('ENEMY_DEFINITIONS', () => {
	test('has exactly 5 enemy types', () => {
		expect(Object.keys(ENEMY_DEFINITIONS)).toHaveLength(5);
	});

	test('all enemies have required fields', () => {
		for (const enemy of Object.values(ENEMY_DEFINITIONS)) {
			expect(enemy.id).toBeTruthy();
			expect(enemy.name).toBeTruthy();
			expect(enemy.spriteImport).toBeTruthy();
			expect(enemy.stageIntroduced).toBeGreaterThanOrEqual(1);
			expect(enemy.mechanic).toBeTruthy();
		}
	});
});

describe('getAvailableEnemyTypes', () => {
	test('stage 1 returns skeleton and goblin', () => {
		const types = getAvailableEnemyTypes(1);
		expect(types).toContain('skeleton');
		expect(types).toContain('goblin');
		expect(types).toHaveLength(2);
	});

	test('stage 2 adds red_mushroom', () => {
		const types = getAvailableEnemyTypes(2);
		expect(types).toHaveLength(3);
		expect(types).toContain('red_mushroom');
	});

	test('stage 3 adds blue_mushroom', () => {
		const types = getAvailableEnemyTypes(3);
		expect(types).toHaveLength(4);
		expect(types).toContain('blue_mushroom');
	});

	test('stage 4+ has all 5 enemy types', () => {
		const types = getAvailableEnemyTypes(4);
		expect(types).toHaveLength(5);
		expect(types).toContain('blinking_eyes');
	});

	test('stage 100 still has all 5', () => {
		expect(getAvailableEnemyTypes(100)).toHaveLength(5);
	});
});

describe('pickRandomEnemyType', () => {
	test('returns a valid enemy type', () => {
		const type = pickRandomEnemyType(4, () => 0.5);
		expect(ENEMY_DEFINITIONS[type]).toBeDefined();
	});

	test('respects stage availability', () => {
		// With rng=0, should pick first available
		const type = pickRandomEnemyType(1, () => 0);
		expect(['skeleton', 'goblin']).toContain(type);
	});
});

describe('getResistance', () => {
	test('skeleton is bleed immune', () => {
		expect(getResistance('skeleton', 'bleed')).toBe('immune');
	});

	test('skeleton is weak to stun', () => {
		expect(getResistance('skeleton', 'stun')).toBe('weak');
	});

	test('skeleton has normal physical resistance', () => {
		expect(getResistance('skeleton', 'physical')).toBe('normal');
	});

	test('goblin is resistant to stun', () => {
		expect(getResistance('goblin', 'stun')).toBe('resistant');
	});

	test('red_mushroom is poison immune', () => {
		expect(getResistance('red_mushroom', 'poison')).toBe('immune');
	});

	test('blue_mushroom is frost immune', () => {
		expect(getResistance('blue_mushroom', 'frost')).toBe('immune');
	});

	test('undefined resistance returns normal', () => {
		expect(getResistance('skeleton', 'fire')).toBe('normal');
	});
});

describe('getResistanceMultiplier', () => {
	test('immune = 0x', () => {
		expect(getResistanceMultiplier('immune')).toBe(0);
	});

	test('resistant = 0.5x', () => {
		expect(getResistanceMultiplier('resistant')).toBe(0.5);
	});

	test('normal = 1x', () => {
		expect(getResistanceMultiplier('normal')).toBe(1);
	});

	test('weak = 2x', () => {
		expect(getResistanceMultiplier('weak')).toBe(2);
	});
});
```

**Step 4: Run tests**

Run: `bun test src/lib/data/enemies.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/data/enemies.ts src/lib/data/enemies.test.ts
git commit -m "feat: add enemy type definitions with resistances and stage unlock schedule"
```

---

### Task 1.2: Integrate Enemy Types into Enemy Store

**Files:**
- Modify: `src/lib/stores/enemy.svelte.ts` (add enemyType tracking)
- Modify: `src/lib/stores/enemy.test.ts` (update tests)

**Step 1: Add enemyType state to enemy store**

In `src/lib/stores/enemy.svelte.ts`, add imports and state:

```typescript
// Add to imports at top:
import type { EnemyTypeId } from '$lib/types';
import { pickRandomEnemyType, ENEMY_DEFINITIONS } from '$lib/data/enemies';

// Add inside createEnemy():
let enemyType = $state<EnemyTypeId>('skeleton');
```

**Step 2: Update spawn functions to pick enemy type**

Modify `spawnEnemy()` to pick a random type:

```typescript
function spawnEnemy(greed: number) {
	isBoss = false;
	isChest = false;
	isBossChest = false;
	enemyType = pickRandomEnemyType(stage);
	enemyMaxHealth = getEnemyHealth(stage, greed);
	enemyHealth = enemyMaxHealth;
}
```

Modify `spawnBoss()` to also pick a type (bosses can be any unlocked type):

```typescript
function spawnBoss(greed: number) {
	isBoss = true;
	isChest = false;
	isBossChest = false;
	enemyType = pickRandomEnemyType(stage);
	enemyMaxHealth = getBossHealth(stage, greed);
	enemyHealth = enemyMaxHealth;
}
```

**Step 3: Expose enemyType via getters and update restore/reset**

Add to the return object:
```typescript
get enemyType() { return enemyType; },
get enemyName() { return ENEMY_DEFINITIONS[enemyType].name; },
get enemySprite() { return ENEMY_DEFINITIONS[enemyType].spriteImport; },
```

Update `restore()` to accept `enemyType`:
```typescript
function restore(data: {
	// ... existing fields ...
	enemyType?: EnemyTypeId;
}) {
	// ... existing restoration ...
	enemyType = data.enemyType ?? 'skeleton';
}
```

Update `reset()`:
```typescript
function reset(greed: number) {
	// ... existing reset ...
	enemyType = 'skeleton'; // Will be overwritten by spawnEnemy
	spawnEnemy(greed);
}
```

**Step 4: Update tests**

Add to `src/lib/stores/enemy.test.ts`:

```typescript
describe('enemy types', () => {
	test('spawnEnemy picks a valid enemy type for the stage', () => {
		// After reset at stage 1, type should be skeleton or goblin
		const enemy = createEnemy();
		enemy.reset(0);
		expect(['skeleton', 'goblin']).toContain(enemy.enemyType);
	});

	test('enemyName returns the human-readable name', () => {
		const enemy = createEnemy();
		enemy.reset(0);
		expect(typeof enemy.enemyName).toBe('string');
		expect(enemy.enemyName.length).toBeGreaterThan(0);
	});
});
```

**Step 5: Run tests**

Run: `bun test src/lib/stores/enemy.test.ts`
Expected: All PASS

**Step 6: Commit**

```bash
git add src/lib/stores/enemy.svelte.ts src/lib/stores/enemy.test.ts
git commit -m "feat: integrate enemy types into enemy store with stage-based spawning"
```

---

### Task 1.3: Wire Enemy Type into Persistence

**Files:**
- Modify: `src/lib/stores/persistence.svelte.ts` (add `enemyType` to `SessionSaveData`)
- Modify: `src/lib/stores/gameState.svelte.ts` (save/load `enemyType`)

**Step 1: Update SessionSaveData**

In `persistence.svelte.ts`, add to `SessionSaveData`:

```typescript
export interface SessionSaveData {
	// ... existing fields ...
	enemyType?: string; // EnemyTypeId - optional for backward compat
}
```

**Step 2: Update saveGame in gameState**

In `gameState.svelte.ts`, update `saveGame()`:

```typescript
function saveGame() {
	persistence.saveSession({
		// ... existing fields ...
		enemyType: enemy.enemyType,
		timestamp: Date.now()
	});
}
```

**Step 3: Update loadGame in gameState**

In `gameState.svelte.ts`, update `loadGame()` where `enemy.restore()` is called:

```typescript
enemy.restore({
	// ... existing fields ...
	enemyType: data.enemyType as import('$lib/types').EnemyTypeId | undefined
});
```

**Step 4: Run full test suite**

Run: `bun test`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/lib/stores/persistence.svelte.ts src/lib/stores/gameState.svelte.ts
git commit -m "feat: persist enemy type across save/load"
```

---

### Task 1.4: Display Enemy Type in Battle UI

**Files:**
- Modify: `src/lib/components/BattleArea.svelte` (use dynamic sprite, show enemy name)
- Modify: `src/routes/+page.svelte` (pass new props)

**Step 1: Update BattleArea props**

In `BattleArea.svelte`, update Props type:

```typescript
type Props = {
	// ... existing props ...
	enemyName: string;
	enemySprite: string;
};
```

Remove the static sprite imports at top:
```typescript
// Remove these:
// import enemySprite from '$lib/assets/images/enemy.png';
// Keep chest sprite:
import chestSprite from '$lib/assets/images/chest-closed.png';
```

Update the destructuring to include new props, and use dynamic `enemySprite` prop in the `<img>`:

```svelte
<img class="enemy-sprite" src={isChest ? chestSprite : enemySprite} alt={isChest ? 'Chest' : enemyName} draggable="false" />
```

Add enemy name label above or below the enemy:

```svelte
{#if !isChest}
	<span class="enemy-name">{enemyName}</span>
{/if}
```

Add CSS for `.enemy-name`:

```css
.enemy-name {
	font-size: 0.85rem;
	color: rgba(255, 255, 255, 0.7);
	font-weight: 500;
	text-align: center;
}
```

**Step 2: Pass props from +page.svelte**

In `+page.svelte`, update the `<BattleArea>` usage:

```svelte
<BattleArea
	isBoss={gameState.isBoss}
	isChest={gameState.isChest}
	enemyHealth={gameState.enemyHealth}
	enemyMaxHealth={gameState.enemyMaxHealth}
	enemiesKilled={gameState.enemiesKilled}
	gold={gameState.gold}
	goldDrops={gameState.goldDrops}
	hits={gameState.hits}
	poisonStacks={gameState.poisonStacks.length}
	enemyName={gameState.enemyName}
	enemySprite={gameState.enemySprite}
	onAttack={gameState.attack}
/>
```

**Step 3: Expose enemyName and enemySprite from gameState**

In `gameState.svelte.ts`, add getters:

```typescript
get enemyName() { return enemy.enemyName; },
get enemySprite() { return enemy.enemySprite; },
```

**Step 4: Manual test**

Run: `bun run dev`
Verify: Enemy name appears below health bar. Sprite displays correctly. Different enemies spawn as stages progress.

**Step 5: Commit**

```bash
git add src/lib/components/BattleArea.svelte src/routes/+page.svelte src/lib/stores/gameState.svelte.ts
git commit -m "feat: display enemy type name and dynamic sprite in battle UI"
```

---

## Pillar 2: Enemy Mechanics (Combat Integration)

### Task 2.1: Add Execute Immunity for Blinking Eyes

**Files:**
- Modify: `src/lib/engine/combat.ts` (add `executeImmune` to `AttackContext`)
- Modify: `src/lib/engine/combat.test.ts`
- Modify: `src/lib/stores/gameState.svelte.ts` (pass flag from enemy type)

**Step 1: Update AttackContext**

In `combat.ts`, add `executeImmune` to `AttackContext`:

```typescript
export interface AttackContext {
	// ... existing fields ...
	executeImmune?: boolean; // Blinking Eyes mechanic
}
```

Update `calculateAttack` to check `executeImmune`:

```typescript
// Replace existing execute chance calculation:
const effectiveExecuteChance = (ctx.isBoss || ctx.executeImmune) ? 0
	: ctx.executeCap != null
		? Math.min(stats.executeChance, ctx.executeCap)
		: stats.executeChance;
```

**Step 2: Write test**

In `combat.test.ts`, add:

```typescript
describe('executeImmune', () => {
	test('execute never triggers when executeImmune is true', () => {
		const stats = { ...createDefaultStats(), executeChance: 1.0, damage: 10 };
		const result = calculateAttack(stats, {
			enemyHealth: 100,
			enemyMaxHealth: 100,
			overkillDamage: 0,
			rng: () => 0, // Would normally trigger execute
			executeImmune: true
		});
		// Should deal normal damage, not execute
		expect(result.hits[0].type).not.toBe('execute');
	});
});
```

**Step 3: Wire into gameState.attack()**

In `gameState.svelte.ts`, update the `attack()` function:

```typescript
import { getResistance } from '$lib/data/enemies';

// Inside attack():
const result = calculateAttack(playerStats, {
	enemyHealth: enemy.enemyHealth,
	enemyMaxHealth: enemy.enemyMaxHealth,
	overkillDamage: enemy.overkillDamage,
	rng: Math.random,
	executeCap: shop.getExecuteCapValue(),
	isBoss: enemy.isBoss,
	executeImmune: enemy.enemyType === 'blinking_eyes'
});
```

**Step 4: Run tests**

Run: `bun test src/lib/engine/combat.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/lib/engine/combat.ts src/lib/engine/combat.test.ts src/lib/stores/gameState.svelte.ts
git commit -m "feat: add execute immunity for Blinking Eyes enemy type"
```

---

### Task 2.2: Skeleton Reassemble Mechanic

**Files:**
- Create: `src/lib/engine/enemyMechanics.ts`
- Create: `src/lib/engine/enemyMechanics.test.ts`
- Modify: `src/lib/stores/enemy.svelte.ts` (add reassemble state)
- Modify: `src/lib/stores/gameState.svelte.ts` (check reassemble on kill)

**Step 1: Create enemy mechanics engine**

Create `src/lib/engine/enemyMechanics.ts`:

```typescript
/**
 * Skeleton Reassemble: When killed, has a chance to revive at 25% HP.
 * Overkill damage (dealing more than the remaining HP) prevents revival.
 * Can only trigger once per enemy.
 */
export const REASSEMBLE_CHANCE = 0.5; // 50% chance to revive
export const REASSEMBLE_HP_FRACTION = 0.25; // Revive at 25% max HP

export function shouldReassemble(
	hasReassembled: boolean,
	wasOverkill: boolean,
	rng: () => number
): boolean {
	if (hasReassembled) return false; // Only once per enemy
	if (wasOverkill) return false; // Overkill prevents revival
	return rng() < REASSEMBLE_CHANCE;
}

export function getReassembleHealth(maxHealth: number): number {
	return Math.max(1, Math.floor(maxHealth * REASSEMBLE_HP_FRACTION));
}
```

**Step 2: Write tests**

Create `src/lib/engine/enemyMechanics.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { shouldReassemble, getReassembleHealth, REASSEMBLE_CHANCE } from './enemyMechanics';

describe('Skeleton Reassemble', () => {
	test('triggers when conditions are met and rng succeeds', () => {
		expect(shouldReassemble(false, false, () => 0)).toBe(true);
	});

	test('does not trigger if already reassembled', () => {
		expect(shouldReassemble(true, false, () => 0)).toBe(false);
	});

	test('does not trigger if overkill', () => {
		expect(shouldReassemble(false, true, () => 0)).toBe(false);
	});

	test('does not trigger if rng fails', () => {
		expect(shouldReassemble(false, false, () => 1)).toBe(false);
	});

	test('getReassembleHealth returns 25% of max', () => {
		expect(getReassembleHealth(100)).toBe(25);
		expect(getReassembleHealth(200)).toBe(50);
	});

	test('getReassembleHealth minimum is 1', () => {
		expect(getReassembleHealth(1)).toBe(1);
		expect(getReassembleHealth(2)).toBe(1);
	});
});
```

**Step 3: Add reassemble state to enemy store**

In `enemy.svelte.ts`, add:

```typescript
let hasReassembled = $state(false);

// Add to spawnEnemy and spawnBoss:
hasReassembled = false;

// Add new method:
function reassemble(newHealth: number) {
	enemyHealth = newHealth;
	hasReassembled = true;
}

// Add to return object:
get hasReassembled() { return hasReassembled; },
reassemble,
```

**Step 4: Wire into killEnemy in gameState**

In `gameState.svelte.ts`, update `killEnemy()` - add reassemble check at the top, before `enemy.recordKill()`:

```typescript
import { shouldReassemble, getReassembleHealth } from '$lib/engine/enemyMechanics';

function killEnemy() {
	if (killingEnemy) return;
	killingEnemy = true;

	try {
		// Skeleton Reassemble check
		if (enemy.enemyType === 'skeleton' && !enemy.isChest) {
			const wasOverkill = enemy.enemyHealth < 0 && Math.abs(enemy.enemyHealth) > 0;
			if (shouldReassemble(enemy.hasReassembled, wasOverkill, Math.random)) {
				const newHealth = getReassembleHealth(enemy.enemyMaxHealth);
				enemy.reassemble(newHealth);
				// TODO: Add visual flash/shake effect for reassemble
				return;
			}
		}

		// ... rest of existing killEnemy logic ...
	} finally {
		killingEnemy = false;
	}
}
```

Note: The overkill check needs refinement. `enemy.enemyHealth` is already negative at this point (damage was applied). The "overkill" here means the damage that exceeded the remaining HP. We check if `playerStats.overkill` is enabled AND there's excess damage:

```typescript
const excessDamage = Math.abs(enemy.enemyHealth); // enemyHealth is negative at this point
const wasOverkill = playerStats.overkill && excessDamage > 0;
```

**Step 5: Run tests**

Run: `bun test src/lib/engine/enemyMechanics.test.ts`
Expected: All PASS

**Step 6: Commit**

```bash
git add src/lib/engine/enemyMechanics.ts src/lib/engine/enemyMechanics.test.ts src/lib/stores/enemy.svelte.ts src/lib/stores/gameState.svelte.ts
git commit -m "feat: add Skeleton Reassemble mechanic (revive once at 25% HP)"
```

---

### Task 2.3: Goblin Nimble Mechanic (Dodge)

**Files:**
- Modify: `src/lib/engine/enemyMechanics.ts` (add dodge logic)
- Modify: `src/lib/engine/enemyMechanics.test.ts`
- Modify: `src/lib/stores/enemy.svelte.ts` (add dodge state + timer)
- Modify: `src/lib/stores/gameState.svelte.ts` (check dodge on attack)
- Modify: `src/lib/components/BattleArea.svelte` (dodge visual)

**Step 1: Add dodge logic to enemyMechanics.ts**

```typescript
/**
 * Goblin Nimble: Every few seconds, the Goblin queues a dodge that nullifies the next tap.
 * Consistent fast tapping reduces dodge frequency.
 */
export const NIMBLE_BASE_INTERVAL_MS = 4000; // 4 seconds between dodge charges
export const NIMBLE_TAP_REDUCTION_MS = 200; // Each tap reduces next dodge timer by 200ms
export const NIMBLE_MIN_INTERVAL_MS = 2000; // Minimum interval between dodges
```

**Step 2: Add dodge state to enemy store**

In `enemy.svelte.ts`, add:

```typescript
let dodgeReady = $state(false);
let dodgeTimerId = $state<ReturnType<typeof setTimeout> | null>(null);

function startDodgeTimer() {
	if (dodgeTimerId) clearTimeout(dodgeTimerId);
	dodgeTimerId = setTimeout(() => {
		dodgeReady = true;
	}, NIMBLE_BASE_INTERVAL_MS);
}

function consumeDodge(): boolean {
	if (!dodgeReady) return false;
	dodgeReady = false;
	startDodgeTimer(); // Queue next dodge
	return true;
}

function clearDodge() {
	dodgeReady = false;
	if (dodgeTimerId) {
		clearTimeout(dodgeTimerId);
		dodgeTimerId = null;
	}
}
```

Start dodge timer in `spawnEnemy`/`spawnBoss` when type is goblin. Clear in other spawns and reset.

**Step 3: Wire into gameState.attack()**

At the top of `attack()`:

```typescript
// Goblin dodge check
if (enemy.enemyType === 'goblin' && enemy.consumeDodge()) {
	// Show "DODGE!" text as a hit
	ui.addHits([{ damage: 0, type: 'dodge' as HitType, id: ui.nextHitId(), index: 0 }]);
	return; // Attack nullified
}
```

Note: This requires adding `'dodge'` to the `HitType` union in `types.ts`:

```typescript
export type HitType = 'normal' | 'crit' | 'execute' | 'poison' | 'poisonCrit' | 'dodge';
```

**Step 4: Add dodge visual to BattleArea**

Add a brief hop animation class when dodge triggers. Create a `DodgeHit.svelte` component or handle in `HitNumber.svelte` with a "DODGE!" text.

**Step 5: Write tests**

```typescript
describe('Goblin Nimble (dodge)', () => {
	test('NIMBLE_BASE_INTERVAL_MS is 4000', () => {
		expect(NIMBLE_BASE_INTERVAL_MS).toBe(4000);
	});
});
```

**Step 6: Run tests**

Run: `bun test`
Expected: All PASS

**Step 7: Commit**

```bash
git add src/lib/engine/enemyMechanics.ts src/lib/engine/enemyMechanics.test.ts src/lib/stores/enemy.svelte.ts src/lib/stores/gameState.svelte.ts src/lib/types.ts src/lib/components/BattleArea.svelte
git commit -m "feat: add Goblin Nimble dodge mechanic"
```

---

### Task 2.4: Red Mushroom Spore Cloud Mechanic

**Files:**
- Modify: `src/lib/engine/enemyMechanics.ts` (add spore cloud logic)
- Modify: `src/lib/engine/enemyMechanics.test.ts`
- Modify: `src/lib/stores/gameState.svelte.ts` (apply attack debuff)
- Modify: `src/lib/components/BattleArea.svelte` (spore visual indicator)

**Step 1: Add spore cloud constants to enemyMechanics.ts**

```typescript
/**
 * Red Mushroom Spore Cloud: Periodically releases spores that reduce
 * player Attack by 1 for a short duration.
 */
export const SPORE_CLOUD_INTERVAL_MS = 5000; // Every 5 seconds
export const SPORE_CLOUD_DEBUFF_AMOUNT = 1; // -1 damage
export const SPORE_CLOUD_DEBUFF_DURATION_MS = 3000; // 3 second debuff
export const SPORE_CLOUD_MAX_STACKS = 3; // Max concurrent debuff stacks
```

**Step 2: Add spore cloud timer to enemy store or gameState**

This mechanic modifies `playerStats.damage`, so it lives in gameState. Add a `sporeDebuffStacks` counter and a timer that periodically fires while fighting a red_mushroom:

```typescript
let sporeDebuffStacks = $state(0);

function startSporeCloud() {
	// Set interval to apply spore every SPORE_CLOUD_INTERVAL_MS
	// Each spore adds a debuff stack (up to max)
	// Each stack auto-removes after SPORE_CLOUD_DEBUFF_DURATION_MS
}
```

When the red mushroom dies, clear all spore debuff state and restore player damage.

**Step 3: Write tests for spore debuff amounts**

```typescript
describe('Red Mushroom Spore Cloud', () => {
	test('debuff amount is 1 damage', () => {
		expect(SPORE_CLOUD_DEBUFF_AMOUNT).toBe(1);
	});

	test('max stacks is 3', () => {
		expect(SPORE_CLOUD_MAX_STACKS).toBe(3);
	});
});
```

**Step 4: Add visual indicator**

Show a small spore cloud icon/badge on the enemy similar to poison counter:

```svelte
{#if sporeDebuffStacks > 0}
	<div class="spore-counter">
		<span class="spore-icon">🍄</span>
		<span class="spore-count">-{sporeDebuffStacks}</span>
	</div>
{/if}
```

**Step 5: Run tests and commit**

```bash
git add src/lib/engine/enemyMechanics.ts src/lib/engine/enemyMechanics.test.ts src/lib/stores/gameState.svelte.ts src/lib/components/BattleArea.svelte
git commit -m "feat: add Red Mushroom Spore Cloud mechanic (periodic attack debuff)"
```

---

### Task 2.5: Blue Mushroom Frost Aura Mechanic

**Files:**
- Modify: `src/lib/engine/enemyMechanics.ts` (frost aura constants)
- Modify: `src/lib/stores/timers.svelte.ts` (adjustable poison tick rate)
- Modify: `src/lib/stores/gameState.svelte.ts` (apply frost aura)

**Step 1: Add frost aura constants**

```typescript
/**
 * Blue Mushroom Frost Aura: Passively slows all player DoT tick rates
 * while this enemy is alive. Poison ticks slower.
 */
export const FROST_AURA_TICK_MULTIPLIER = 2; // DoTs tick at 2x interval (half speed)
```

**Step 2: Modify poison tick interval**

In `timers.svelte.ts`, make the poison tick interval configurable:

```typescript
function startPoisonTick(onTick: () => void, intervalMs: number = 1000) {
	stopPoisonTick();
	poisonInterval = setInterval(onTick, intervalMs);
}
```

**Step 3: Apply frost aura in gameState**

When spawning a blue_mushroom, restart poison tick with `FROST_AURA_TICK_MULTIPLIER * 1000` ms. When the blue mushroom dies, restart at normal rate (1000ms).

**Step 4: Add frost aura visual**

Show a frost icon on the enemy:

```svelte
{#if enemyType === 'blue_mushroom'}
	<div class="frost-aura-indicator">❄️</div>
{/if}
```

**Step 5: Test and commit**

```bash
git add src/lib/engine/enemyMechanics.ts src/lib/stores/timers.svelte.ts src/lib/stores/gameState.svelte.ts src/lib/components/BattleArea.svelte
git commit -m "feat: add Blue Mushroom Frost Aura mechanic (slows DoT tick rates)"
```

---

### Task 2.6: Blinking Eyes Creeping Darkness Mechanic

**Files:**
- Modify: `src/lib/engine/enemyMechanics.ts` (creeping darkness logic)
- Modify: `src/lib/engine/enemyMechanics.test.ts`
- Modify: `src/lib/stores/gameState.svelte.ts` (idle detection + stat drain)

**Step 1: Add creeping darkness logic**

```typescript
/**
 * Blinking Eyes Creeping Darkness: If the player stops tapping for >2s,
 * a random stat is temporarily reduced. Stacks up to 3 times.
 * Stats recover after the enemy dies.
 */
export const DARKNESS_IDLE_THRESHOLD_MS = 2000;
export const DARKNESS_MAX_STACKS = 3;
export const DARKNESS_DRAIN_AMOUNT = 1;

export type DrainableStat = 'damage' | 'poison' | 'multiStrike';

const DRAINABLE_STATS: DrainableStat[] = ['damage', 'poison', 'multiStrike'];

export function pickStatToDrain(rng: () => number): DrainableStat {
	return DRAINABLE_STATS[Math.floor(rng() * DRAINABLE_STATS.length)];
}
```

**Step 2: Write tests**

```typescript
describe('Blinking Eyes Creeping Darkness', () => {
	test('idle threshold is 2000ms', () => {
		expect(DARKNESS_IDLE_THRESHOLD_MS).toBe(2000);
	});

	test('max stacks is 3', () => {
		expect(DARKNESS_MAX_STACKS).toBe(3);
	});

	test('pickStatToDrain returns a valid stat', () => {
		const stat = pickStatToDrain(() => 0);
		expect(['damage', 'poison', 'multiStrike']).toContain(stat);
	});
});
```

**Step 3: Implement idle detection in gameState**

Track `lastTapTime` and set an interval that checks if `Date.now() - lastTapTime > 2000`. If so, apply drain (up to 3 stacks). On attack, update `lastTapTime`. On enemy death, restore all drained stats.

```typescript
let darknessStacks = $state<DrainableStat[]>([]);
let lastTapTime = $state(Date.now());
let darknessCheckInterval: ReturnType<typeof setInterval> | null = null;
```

**Step 4: Clear on enemy death**

When blinking_eyes is killed, restore drained stats:

```typescript
function restoreDarknessDebuffs() {
	for (const stat of darknessStacks) {
		playerStats[stat] += DARKNESS_DRAIN_AMOUNT;
	}
	darknessStacks = [];
}
```

**Step 5: Test and commit**

```bash
git add src/lib/engine/enemyMechanics.ts src/lib/engine/enemyMechanics.test.ts src/lib/stores/gameState.svelte.ts
git commit -m "feat: add Blinking Eyes Creeping Darkness mechanic (stat drain on idle)"
```

---

## Pillar 3: Class System (Data + Selection + Card Pools)

### Task 3.1: Define Class Data Model

**Files:**
- Modify: `src/lib/types.ts` (add ClassId, ClassDefinition)
- Create: `src/lib/data/classes.ts`
- Create: `src/lib/data/classes.test.ts`

**Step 1: Add class types to types.ts**

```typescript
export type ClassId = 'adventurer' | 'warrior' | 'mage' | 'rogue';
```

**Step 2: Create classes.ts**

```typescript
import type { ClassId } from '$lib/types';

export const CLASS_SELECTION_LEVEL = 30;

export type ClassDefinition = {
	id: ClassId;
	name: string;
	borderColor: string; // Tailwind/CSS color for class card border
	description: string;
	playstyle: string;
	economyPerk: string;
	startingBonuses: string[];
};

export const CLASS_DEFINITIONS: Record<ClassId, ClassDefinition> = {
	adventurer: {
		id: 'adventurer',
		name: 'Adventurer',
		borderColor: '#9ca3af', // gray
		description: 'A classless wanderer learning the basics.',
		playstyle: 'Tap enemies to deal damage. No special abilities.',
		economyPerk: 'None',
		startingBonuses: []
	},
	warrior: {
		id: 'warrior',
		name: 'Warrior',
		borderColor: '#ef4444', // red
		description: 'Slow, heavy strikes. Each tap draws a random weapon.',
		playstyle: 'Build combos for devastating payoffs. Fewer taps, bigger hits.',
		economyPerk: 'Longer boss timer',
		startingBonuses: ['Highest base damage', '+10s Boss Timer']
	},
	mage: {
		id: 'mage',
		name: 'Mage',
		borderColor: '#3b82f6', // blue
		description: 'Cast elemental spells for powerful combos.',
		playstyle: 'Tap to regenerate mana, cast spells to deal magic damage.',
		economyPerk: 'Bonus XP multiplier',
		startingBonuses: ['+1 Magic damage', '+50% XP multiplier']
	},
	rogue: {
		id: 'rogue',
		name: 'Rogue',
		borderColor: '#22c55e', // green
		description: 'Stack poison and land devastating crits.',
		playstyle: 'Fast attacks that pile poison. Crits scale with active stacks.',
		economyPerk: 'Higher base gold drop chance',
		startingBonuses: ['+5% Crit Chance', '+10% Gold Drop Chance']
	}
};

/**
 * Classes available for selection at Level 30.
 * Adventurer is not selectable - it's the default pre-class.
 */
export const SELECTABLE_CLASSES: ClassId[] = ['warrior', 'mage', 'rogue'];
```

**Step 3: Write tests**

```typescript
import { describe, test, expect } from 'vitest';
import { CLASS_DEFINITIONS, SELECTABLE_CLASSES, CLASS_SELECTION_LEVEL } from './classes';

describe('CLASS_DEFINITIONS', () => {
	test('has 4 class definitions', () => {
		expect(Object.keys(CLASS_DEFINITIONS)).toHaveLength(4);
	});

	test('adventurer exists as default class', () => {
		expect(CLASS_DEFINITIONS.adventurer).toBeDefined();
		expect(CLASS_DEFINITIONS.adventurer.name).toBe('Adventurer');
	});

	test('all selectable classes have border colors and descriptions', () => {
		for (const id of SELECTABLE_CLASSES) {
			const cls = CLASS_DEFINITIONS[id];
			expect(cls.borderColor).toBeTruthy();
			expect(cls.description).toBeTruthy();
			expect(cls.startingBonuses.length).toBeGreaterThan(0);
		}
	});
});

describe('CLASS_SELECTION_LEVEL', () => {
	test('is 30', () => {
		expect(CLASS_SELECTION_LEVEL).toBe(30);
	});
});

describe('SELECTABLE_CLASSES', () => {
	test('has warrior, mage, rogue', () => {
		expect(SELECTABLE_CLASSES).toEqual(['warrior', 'mage', 'rogue']);
	});

	test('does not include adventurer', () => {
		expect(SELECTABLE_CLASSES).not.toContain('adventurer');
	});
});
```

**Step 4: Run tests**

Run: `bun test src/lib/data/classes.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/data/classes.ts src/lib/data/classes.test.ts
git commit -m "feat: add class definitions (Adventurer, Warrior, Mage, Rogue)"
```

---

### Task 3.2: Reclassify Existing Upgrade Cards

**Files:**
- Modify: `src/lib/types.ts` (add `classRestriction` to `Upgrade`)
- Modify: `src/lib/data/upgrades.ts` (add `classRestriction` to each card)
- Modify: `src/lib/data/upgrades.test.ts` (validate classifications)

**Step 1: Add classRestriction to Upgrade type**

In `types.ts`, update the `Upgrade` type:

```typescript
export type Upgrade = {
	id: string;
	title: string;
	rarity: Rarity;
	image: string;
	stats: StatModifier[];
	apply: (stats: PlayerStats) => void;
	classRestriction?: ClassId; // undefined = generic (available to all)
};
```

**Step 2: Add classRestriction to all existing cards in upgrades.ts**

Per the design doc classification:

**Generic (no classRestriction needed - leave undefined):**
- damage1-4, xp1-2, timer1-2, all gold/chest cards (golddrop1-3, chest1-3, bosschest1-2), lucky1-2, dmgmult1-2, greed1-2, overkill1, multi1-3, legendary3 (Time Lord)

**Rogue-specific (`classRestriction: 'rogue'`):**
- poison1-3, poisondur1-3, poisonstack1-3, poisoncrit1-3, crit1-3, critdmg1-2, execute1-3, combo2 (Poison Master), combo3 (Plague Doctor), legendary2 (Death Incarnate), legendary4 (Toxic Apocalypse)

**Warrior-specific (`classRestriction: 'warrior'`):**
- combo1 (Berserker), legendary1 (Dragon's Fury)

Add `classRestriction: 'rogue'` or `classRestriction: 'warrior'` to each card as appropriate. Leave generic cards without the field.

**Step 3: Write validation test**

```typescript
describe('card classification', () => {
	test('generic cards have no classRestriction', () => {
		const genericIds = ['damage1', 'damage2', 'damage3', 'damage4', 'xp1', 'xp2', 'timer1', 'timer2', 'greed1', 'greed2', 'overkill1', 'multi1', 'multi2', 'multi3', 'legendary3'];
		for (const id of genericIds) {
			const card = allUpgrades.find(u => u.id === id);
			expect(card?.classRestriction).toBeUndefined();
		}
	});

	test('poison cards are rogue-restricted', () => {
		const rogueIds = ['poison1', 'poison2', 'poison3', 'poisondur1', 'poisondur2', 'poisondur3', 'poisonstack1', 'poisonstack2', 'poisonstack3'];
		for (const id of rogueIds) {
			const card = allUpgrades.find(u => u.id === id);
			expect(card?.classRestriction).toBe('rogue');
		}
	});

	test('combo1 and legendary1 are warrior-restricted', () => {
		expect(allUpgrades.find(u => u.id === 'combo1')?.classRestriction).toBe('warrior');
		expect(allUpgrades.find(u => u.id === 'legendary1')?.classRestriction).toBe('warrior');
	});
});
```

**Step 4: Run tests**

Run: `bun test src/lib/data/upgrades.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/data/upgrades.ts src/lib/data/upgrades.test.ts
git commit -m "feat: reclassify existing upgrade cards into generic, warrior, and rogue pools"
```

---

### Task 3.3: Class-Filtered Upgrade Selection

**Files:**
- Modify: `src/lib/data/upgrades.ts` (add class filter to `getRandomUpgrades`)
- Modify: `src/lib/data/upgrades.test.ts`
- Modify: `src/lib/stores/leveling.svelte.ts` (pass class to upgrade context)
- Modify: `src/lib/stores/gameState.svelte.ts` (pass class context)

**Step 1: Add classId parameter to getRandomUpgrades**

```typescript
export function getRandomUpgrades(
	count: number,
	luckyChance: number = 0,
	currentExecuteChance: number = 0,
	executeCap: number = EXECUTE_CHANCE_BASE_CAP,
	currentPoison: number = 0,
	minRarity: string = 'common',
	classId: ClassId = 'adventurer' // NEW PARAMETER
): Upgrade[] {
	let pool = [...allUpgrades];

	// Filter by class: show generic cards + cards matching player's class
	// Adventurer only sees generic cards
	if (classId === 'adventurer') {
		pool = pool.filter((u) => !u.classRestriction);
	} else {
		pool = pool.filter((u) => !u.classRestriction || u.classRestriction === classId);
	}

	// ... rest of existing logic unchanged ...
}
```

**Step 2: Update UpgradeContext to include classId**

In `leveling.svelte.ts`:

```typescript
export interface UpgradeContext {
	luckyChance: number;
	executeChance: number;
	executeCap: number;
	poison: number;
	classId: ClassId; // NEW
}
```

Update `checkLevelUp()` and `queueChestLoot()` to pass `ctx.classId` to `getRandomUpgrades()`.

**Step 3: Pass classId from gameState**

In `gameState.svelte.ts`, add `classId` to `upgradeContext()`:

```typescript
function upgradeContext() {
	return {
		luckyChance: playerStats.luckyChance,
		executeChance: playerStats.executeChance,
		executeCap: shop.getExecuteCapValue(),
		poison: playerStats.poison,
		classId: currentClass // Will be added in Task 3.4
	};
}
```

**Step 4: Write tests**

```typescript
describe('class-filtered upgrades', () => {
	test('adventurer only gets generic cards', () => {
		const upgrades = getRandomUpgrades(3, 0, 0, 0.1, 0, 'common', 'adventurer');
		for (const u of upgrades) {
			expect(u.classRestriction).toBeUndefined();
		}
	});

	test('rogue gets generic + rogue cards', () => {
		const upgrades = getRandomUpgrades(50, 0, 0, 0.1, 1, 'common', 'rogue');
		for (const u of upgrades) {
			expect(u.classRestriction === undefined || u.classRestriction === 'rogue').toBe(true);
		}
	});

	test('warrior does not see rogue cards', () => {
		const upgrades = getRandomUpgrades(50, 0, 0, 0.1, 0, 'common', 'warrior');
		for (const u of upgrades) {
			expect(u.classRestriction).not.toBe('rogue');
		}
	});
});
```

**Step 5: Run tests**

Run: `bun test src/lib/data/upgrades.test.ts`
Expected: All PASS

**Step 6: Commit**

```bash
git add src/lib/data/upgrades.ts src/lib/data/upgrades.test.ts src/lib/stores/leveling.svelte.ts src/lib/stores/gameState.svelte.ts
git commit -m "feat: filter upgrade card pool by player class"
```

---

### Task 3.4: Add Class State to Game Store

**Files:**
- Modify: `src/lib/stores/gameState.svelte.ts` (add class tracking)
- Modify: `src/lib/stores/persistence.svelte.ts` (persist class choice)

**Step 1: Add class state to gameState**

```typescript
import type { ClassId } from '$lib/types';
import { CLASS_SELECTION_LEVEL } from '$lib/data/classes';

// Inside createGameState():
let currentClass = $state<ClassId>('adventurer');
let classSelected = $state(false); // Has the player chosen a class this run?
```

**Step 2: Apply class starting bonuses**

```typescript
function applyClassBonuses(classId: ClassId) {
	switch (classId) {
		case 'warrior':
			playerStats.damage += 5; // Highest base damage
			playerStats.bonusBossTime += 10; // Longer boss timer
			break;
		case 'mage':
			playerStats.xpMultiplier += 0.5; // Bonus XP
			// Magic stat will be added in Pillar 4
			break;
		case 'rogue':
			playerStats.critChance += 0.05; // +5% crit
			playerStats.goldDropChance += 0.10; // +10% gold drop
			break;
	}
}
```

**Step 3: Trigger class selection at Level 30**

Modify `checkLevelUp` flow in gameState: after leveling, if `level >= CLASS_SELECTION_LEVEL && !classSelected && currentClass === 'adventurer'`, queue a special `'class_selection'` event.

Add to `UpgradeEventType` in leveling.svelte.ts:

```typescript
export type UpgradeEventType = 'levelup' | 'chest' | 'class_selection';
```

**Step 4: Persist class choice**

Update `SessionSaveData`:

```typescript
export interface SessionSaveData {
	// ... existing ...
	currentClass?: string;
	classSelected?: boolean;
}
```

Save and restore the class in `saveGame()` and `loadGame()`.

**Step 5: Add class getters to gameState return**

```typescript
get currentClass() { return currentClass; },
get classSelected() { return classSelected; },
```

**Step 6: Update resetGame**

```typescript
function resetGame() {
	// ... existing reset ...
	currentClass = 'adventurer';
	classSelected = false;
}
```

**Step 7: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts src/lib/stores/persistence.svelte.ts src/lib/stores/leveling.svelte.ts
git commit -m "feat: add class state tracking with persistence and starting bonuses"
```

---

### Task 3.5: Class Selection Modal

**Files:**
- Create: `src/lib/components/ClassSelectionModal.svelte`
- Modify: `src/routes/+page.svelte` (render modal)
- Modify: `src/lib/stores/gameState.svelte.ts` (selectClass action)

**Step 1: Create ClassSelectionModal.svelte**

This is the cinematic "Choose Your Path" modal from the design doc. Key features:
- Title: "Choose Your Path" fades in
- 3 class cards animate in with staggered landing (0.5s apart)
- Cards show: class name, border color, rotating icon carousel (3 icons cycling)
- Tap to flip → shows stats/bonuses/description on back
- "Pick {Class}!" button appears when card is flipped to info side
- Selection animation: chosen card grows, others fade out

```svelte
<script lang="ts">
	import { CLASS_DEFINITIONS, SELECTABLE_CLASSES, type ClassDefinition } from '$lib/data/classes';
	import type { ClassId } from '$lib/types';

	// Carousel icons per class (use existing images + emoji placeholders)
	import swordImg from '$lib/assets/images/cards/sword.png';
	import axeImg from '$lib/assets/images/cards/axe.png';
	import hammerImg from '$lib/assets/images/cards/hammer.png';
	import fireImg from '$lib/assets/images/cards/fire.png';
	import poisonImg from '$lib/assets/images/cards/poison.png';

	type Props = {
		show: boolean;
		onSelect: (classId: ClassId) => void;
	};

	let { show, onSelect }: Props = $props();

	let flippedIndex = $state<number | null>(null);
	let selectedClass = $state<ClassId | null>(null);
	let landed = $state<boolean[]>([false, false, false]);

	// Staggered landing animation
	$effect(() => {
		if (show) {
			for (let i = 0; i < 3; i++) {
				setTimeout(() => {
					landed[i] = true;
					landed = [...landed]; // trigger reactivity
				}, 500 + i * 500);
			}
		}
	});

	const classCarouselIcons: Record<string, { images: string[]; emojis: string[] }> = {
		warrior: { images: [swordImg, axeImg, hammerImg], emojis: [] },
		mage: { images: [fireImg], emojis: ['❄️', '✨'] },
		rogue: { images: [poisonImg], emojis: ['🗡️', '⚰️'] }
	};

	function handleCardClick(index: number) {
		if (selectedClass) return;
		flippedIndex = flippedIndex === index ? null : index;
	}

	function handleSelect(classId: ClassId) {
		selectedClass = classId;
		// Wait for animation then callback
		setTimeout(() => onSelect(classId), 800);
	}
</script>
```

The template renders 3 class cards in a row with flip animations, border colors from `CLASS_DEFINITIONS`, and the "Pick" button.

**Step 2: Wire into +page.svelte**

```svelte
{#if gameState.activeEvent?.type === 'class_selection'}
	<ClassSelectionModal
		show={true}
		onSelect={handleClassSelect}
	/>
{/if}
```

Add `handleClassSelect`:

```typescript
function handleClassSelect(classId: ClassId) {
	gameState.selectClass(classId);
}
```

**Step 3: Add selectClass to gameState**

```typescript
function selectClass(classId: ClassId) {
	currentClass = classId;
	classSelected = true;
	applyClassBonuses(classId);
	leveling.closeActiveEvent();
	// Resume game
	timers.startPoisonTick(applyPoison);
	timers.resumeBossTimer(handleBossExpired);
	saveGame();
}
```

**Step 4: Manual test**

Run: `bun run dev`
- Progress to Level 30 (can temporarily set `CLASS_SELECTION_LEVEL = 2` for testing)
- Verify modal appears with 3 class cards
- Verify tap-to-flip, "Pick" button, selection animation

**Step 5: Commit**

```bash
git add src/lib/components/ClassSelectionModal.svelte src/routes/+page.svelte src/lib/stores/gameState.svelte.ts
git commit -m "feat: add class selection modal with card flip and staggered landing animations"
```

---

### Task 3.6: Display Class Label on Upgrade Cards

**Files:**
- Modify: `src/lib/components/UpgradeCard.svelte` (add class badge)

**Step 1: Add class label prop**

```typescript
type Props = {
	// ... existing ...
	classRestriction?: ClassId;
};
```

**Step 2: Render class label**

Below the card title, add:

```svelte
{#if classRestriction}
	<span class="class-label" style:color={CLASS_DEFINITIONS[classRestriction].borderColor}>
		{CLASS_DEFINITIONS[classRestriction].name}
	</span>
{/if}
```

**Step 3: Style class label**

```css
.class-label {
	font-size: 0.7rem;
	font-weight: bold;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}
```

**Step 4: Pass classRestriction from LevelUpModal and ChestLootModal**

Both modals render `UpgradeCard` - pass `classRestriction={choice.classRestriction}`.

**Step 5: Commit**

```bash
git add src/lib/components/UpgradeCard.svelte src/lib/components/LevelUpModal.svelte src/lib/components/ChestLootModal.svelte
git commit -m "feat: display class label on class-restricted upgrade cards"
```

---

## Pillar 4: Class Abilities (Combat + UI)

### Task 4.1: Warrior - Weapon Roulette Data Model

**Files:**
- Create: `src/lib/engine/warrior.ts`
- Create: `src/lib/engine/warrior.test.ts`

**Step 1: Create warrior engine**

```typescript
import type { PlayerStats } from '$lib/types';

export type WeaponId = 'knife' | 'sword' | 'axe' | 'hammer';

export type WeaponDefinition = {
	id: WeaponId;
	name: string;
	comboEffect: 'bleed' | 'megaCrit' | 'stun';
	comboDescription: string;
};

export const WEAPON_DEFINITIONS: Record<WeaponId, WeaponDefinition> = {
	knife: {
		id: 'knife',
		name: 'Knife',
		comboEffect: 'bleed', // Basic weapon, weaker bleed
		comboDescription: 'Minor Bleed'
	},
	sword: {
		id: 'sword',
		name: 'Sword',
		comboEffect: 'bleed',
		comboDescription: 'Super Bleed (massive bleed burst scaled by combo count)'
	},
	axe: {
		id: 'axe',
		name: 'Axe',
		comboEffect: 'megaCrit',
		comboDescription: 'Mega Crit (guaranteed crit with multiplier scaled by combo count)'
	},
	hammer: {
		id: 'hammer',
		name: 'Hammer',
		comboEffect: 'stun',
		comboDescription: 'Shockwave Stun (long stun scaled by combo count)'
	}
};

export const WARRIOR_SWING_COOLDOWN_MS = 1000; // 1s between taps

/**
 * Draw a random weapon from the unlocked pool.
 */
export function drawWeapon(unlockedWeapons: WeaponId[], rng: () => number = Math.random): WeaponId {
	return unlockedWeapons[Math.floor(rng() * unlockedWeapons.length)];
}

/**
 * Calculate combo payoff damage when weapon changes.
 */
export function calculateComboPayoff(
	weapon: WeaponId,
	comboCount: number,
	baseDamage: number
): { damage: number; effect: string } {
	const def = WEAPON_DEFINITIONS[weapon];
	switch (def.comboEffect) {
		case 'bleed':
			return {
				damage: Math.floor(baseDamage * comboCount * 1.5),
				effect: 'bleed'
			};
		case 'megaCrit':
			return {
				damage: Math.floor(baseDamage * comboCount * 2.5),
				effect: 'megaCrit'
			};
		case 'stun':
			return {
				damage: Math.floor(baseDamage * comboCount * 0.5),
				effect: 'stun'
			};
	}
}
```

**Step 2: Write tests**

```typescript
import { describe, test, expect } from 'vitest';
import { drawWeapon, calculateComboPayoff, WEAPON_DEFINITIONS } from './warrior';

describe('drawWeapon', () => {
	test('draws from the pool', () => {
		const weapon = drawWeapon(['sword', 'axe'], () => 0);
		expect(weapon).toBe('sword');
	});

	test('draws last weapon with high rng', () => {
		const weapon = drawWeapon(['sword', 'axe'], () => 0.99);
		expect(weapon).toBe('axe');
	});
});

describe('calculateComboPayoff', () => {
	test('sword bleed scales with combo count', () => {
		const result = calculateComboPayoff('sword', 3, 10);
		expect(result.damage).toBe(45); // 10 * 3 * 1.5
		expect(result.effect).toBe('bleed');
	});

	test('axe mega crit scales with combo count', () => {
		const result = calculateComboPayoff('axe', 2, 10);
		expect(result.damage).toBe(50); // 10 * 2 * 2.5
		expect(result.effect).toBe('megaCrit');
	});

	test('hammer stun scales with combo count', () => {
		const result = calculateComboPayoff('hammer', 4, 10);
		expect(result.damage).toBe(20); // 10 * 4 * 0.5
		expect(result.effect).toBe('stun');
	});
});
```

**Step 3: Run tests**

Run: `bun test src/lib/engine/warrior.test.ts`
Expected: All PASS

**Step 4: Commit**

```bash
git add src/lib/engine/warrior.ts src/lib/engine/warrior.test.ts
git commit -m "feat: add Warrior weapon roulette engine with combo payoff calculations"
```

---

### Task 4.2: Warrior - Battle Integration

**Files:**
- Modify: `src/lib/stores/gameState.svelte.ts` (warrior attack override)
- Create: `src/lib/components/WarriorUI.svelte` (weapon display + combo counter)
- Modify: `src/lib/components/BattleArea.svelte` (render WarriorUI)

**Step 1: Add warrior state to gameState**

```typescript
let warriorWeapons = $state<WeaponId[]>(['knife']); // Starting pool
let currentWeapon = $state<WeaponId | null>(null);
let comboWeapon = $state<WeaponId | null>(null);
let comboCount = $state(0);
let warriorCooldown = $state(false);
```

**Step 2: Override attack for warrior**

When `currentClass === 'warrior'`, the attack function:
1. Checks cooldown (1s between taps)
2. Draws a random weapon
3. If same as current → increment combo
4. If different → fire combo payoff for old weapon, start new combo
5. Apply swing animation (weapon-specific)
6. Deal damage

**Step 3: Create WarriorUI component**

Shows: current weapon icon, combo counter, cooldown indicator.

```svelte
<div class="warrior-ui">
	{#if currentWeapon}
		<div class="weapon-display">
			<img src={weaponSprites[currentWeapon]} alt={currentWeapon} class="weapon-icon" />
		</div>
	{/if}
	{#if comboCount > 1}
		<div class="combo-counter">x{comboCount}</div>
	{/if}
</div>
```

**Step 4: Wire into BattleArea**

Conditionally render `<WarriorUI>` when class is warrior.

**Step 5: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts src/lib/components/WarriorUI.svelte src/lib/components/BattleArea.svelte
git commit -m "feat: add Warrior weapon roulette battle integration with combo tracking"
```

---

### Task 4.3: Mage - Element System Data Model

**Files:**
- Create: `src/lib/engine/mage.ts`
- Create: `src/lib/engine/mage.test.ts`

**Step 1: Create mage engine**

```typescript
export type ElementId = 'frost' | 'fire' | 'arcane';

export type ElementComboId = 'frost_arcane' | 'fire_arcane' | 'frost_fire';

export const ELEMENT_MANA_COSTS: Record<ElementId, number> = {
	frost: 15,
	fire: 15,
	arcane: 20
};

export const BASE_MANA_PER_TAP = 1;
export const ELEMENT_DURATION_MS = 5000; // 5 seconds active

export type ElementEffect = {
	id: ElementId;
	name: string;
	description: string;
};

export const ELEMENT_EFFECTS: Record<ElementId, ElementEffect> = {
	frost: { id: 'frost', name: 'Frost', description: 'Enemy takes more damage (debuff)' },
	fire: { id: 'fire', name: 'Fire', description: 'Burn DoT' },
	arcane: { id: 'arcane', name: 'Arcane', description: 'Increased vulnerability (debuff)' }
};

export type ElementCombo = {
	elements: [ElementId, ElementId];
	name: string;
	description: string;
};

export const ELEMENT_COMBOS: Record<ElementComboId, ElementCombo> = {
	frost_arcane: {
		elements: ['frost', 'arcane'],
		name: 'Shatter Burst',
		description: 'Large burst damage'
	},
	fire_arcane: {
		elements: ['fire', 'arcane'],
		name: 'Empowered Burn',
		description: 'Massively enhanced burn DoT'
	},
	frost_fire: {
		elements: ['frost', 'fire'],
		name: 'Shatter',
		description: 'Reduce enemy defenses'
	}
};

/**
 * Check which combo triggers given two active elements.
 */
export function checkElementCombo(activeElements: Set<ElementId>): ElementComboId | null {
	for (const [comboId, combo] of Object.entries(ELEMENT_COMBOS)) {
		if (combo.elements.every(e => activeElements.has(e))) {
			return comboId as ElementComboId;
		}
	}
	return null;
}

/**
 * Calculate mana regenerated per tap.
 */
export function getManaPerTap(baseManaPerTap: number, manaPerTapBonus: number): number {
	return baseManaPerTap + manaPerTapBonus;
}
```

**Step 2: Write tests**

```typescript
import { describe, test, expect } from 'vitest';
import { checkElementCombo, getManaPerTap, ELEMENT_MANA_COSTS } from './mage';

describe('checkElementCombo', () => {
	test('frost + arcane triggers shatter burst', () => {
		expect(checkElementCombo(new Set(['frost', 'arcane']))).toBe('frost_arcane');
	});

	test('fire + arcane triggers empowered burn', () => {
		expect(checkElementCombo(new Set(['fire', 'arcane']))).toBe('fire_arcane');
	});

	test('frost + fire triggers shatter', () => {
		expect(checkElementCombo(new Set(['frost', 'fire']))).toBe('frost_fire');
	});

	test('single element returns null', () => {
		expect(checkElementCombo(new Set(['frost']))).toBeNull();
	});

	test('no elements returns null', () => {
		expect(checkElementCombo(new Set())).toBeNull();
	});

	test('all three elements triggers first matching combo', () => {
		const result = checkElementCombo(new Set(['frost', 'fire', 'arcane']));
		expect(result).toBeTruthy(); // At least one combo triggers
	});
});

describe('getManaPerTap', () => {
	test('base mana per tap with no bonus', () => {
		expect(getManaPerTap(1, 0)).toBe(1);
	});

	test('mana per tap with bonus', () => {
		expect(getManaPerTap(1, 3)).toBe(4);
	});
});
```

**Step 3: Run tests and commit**

```bash
git add src/lib/engine/mage.ts src/lib/engine/mage.test.ts
git commit -m "feat: add Mage element system with combos and mana calculations"
```

---

### Task 4.4: Mage - Mana State and Element Buttons

**Files:**
- Modify: `src/lib/types.ts` (add mana/magic to PlayerStats)
- Modify: `src/lib/engine/stats.ts` (add mana to defaults and registry)
- Modify: `src/lib/stores/gameState.svelte.ts` (mana state + element casting)
- Create: `src/lib/components/MageUI.svelte`
- Modify: `src/lib/components/BattleArea.svelte` (render MageUI)

**Step 1: Add mana and magic to PlayerStats**

In `types.ts`:

```typescript
export type PlayerStats = {
	// ... existing ...
	magic: number; // Base magic damage for Mage
	mana: number; // Current mana
	maxMana: number; // Maximum mana pool
	manaPerTap: number; // Mana regenerated per enemy tap
};
```

In `stats.ts`, update `createDefaultStats()`:

```typescript
magic: 0,
mana: 0,
maxMana: 50,
manaPerTap: 1,
```

Add to `statRegistry`:

```typescript
{ key: 'magic', icon: '🔮', label: 'Magic', format: num, colorClass: 'magic' },
{ key: 'maxMana', icon: '💧', label: 'Max Mana', format: num, colorClass: 'magic' },
{ key: 'manaPerTap', icon: '💧', label: 'Mana/Tap', format: num, colorClass: 'magic' },
```

**Step 2: Add mana state to gameState**

```typescript
let mana = $state(0);
let activeElements = $state<Set<ElementId>>(new Set());
let elementTimers = $state<Map<ElementId, ReturnType<typeof setTimeout>>>(new Map());
```

On mage tap:
- Regenerate mana: `mana = Math.min(playerStats.maxMana, mana + playerStats.manaPerTap)`
- Deal base magic damage to enemy

Element button press:
- Check mana >= cost
- Deduct mana
- Apply element to enemy (set timer for duration)
- Check for combos

**Step 3: Create MageUI component**

Shows: mana bar, 3 element buttons (Frost/Fire/Arcane), active element indicators on enemy.

```svelte
<div class="mage-ui">
	<div class="mana-bar">
		<div class="mana-fill" style:width="{(mana / maxMana) * 100}%"></div>
		<span class="mana-text">{mana}/{maxMana}</span>
	</div>
	<div class="element-buttons">
		<button class="element-btn frost" onclick={() => castElement('frost')} disabled={mana < frostCost}>
			❄️ Frost
		</button>
		<button class="element-btn fire" onclick={() => castElement('fire')} disabled={mana < fireCost}>
			🔥 Fire
		</button>
		<button class="element-btn arcane" onclick={() => castElement('arcane')} disabled={mana < arcaneCost}>
			✨ Arcane
		</button>
	</div>
</div>
```

**Step 4: Wire into BattleArea**

Conditionally render `<MageUI>` when class is mage. Pass mana, costs, and cast callback.

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/engine/stats.ts src/lib/stores/gameState.svelte.ts src/lib/components/MageUI.svelte src/lib/components/BattleArea.svelte
git commit -m "feat: add Mage mana system with element buttons and combo detection"
```

---

### Task 4.5: Rogue - Poison Cloud Ability

**Files:**
- Create: `src/lib/engine/rogue.ts`
- Create: `src/lib/engine/rogue.test.ts`
- Modify: `src/lib/stores/gameState.svelte.ts` (poison cloud state)
- Create: `src/lib/components/RogueUI.svelte`
- Modify: `src/lib/components/BattleArea.svelte` (render RogueUI)

**Step 1: Create rogue engine**

```typescript
export const POISON_CLOUD_BASE_COOLDOWN_MS = 10000; // 10 second cooldown
export const POISON_CLOUD_STACKS_PER_TICK = 1;
export const POISON_CLOUD_DURATION_MS = 5000; // Cloud lasts 5 seconds
export const POISON_CLOUD_TICK_INTERVAL_MS = 1000; // Applies stacks every 1s

/**
 * Calculate effective cooldown with reduction bonuses.
 */
export function getEffectiveCooldown(baseCooldown: number, cooldownReduction: number): number {
	return Math.max(3000, baseCooldown - cooldownReduction);
}
```

**Step 2: Write tests**

```typescript
import { describe, test, expect } from 'vitest';
import { getEffectiveCooldown, POISON_CLOUD_BASE_COOLDOWN_MS } from './rogue';

describe('Poison Cloud', () => {
	test('base cooldown is 10s', () => {
		expect(POISON_CLOUD_BASE_COOLDOWN_MS).toBe(10000);
	});

	test('cooldown reduction works', () => {
		expect(getEffectiveCooldown(10000, 3000)).toBe(7000);
	});

	test('cooldown has minimum of 3s', () => {
		expect(getEffectiveCooldown(10000, 20000)).toBe(3000);
	});
});
```

**Step 3: Add poison cloud state to gameState**

```typescript
let poisonCloudUnlocked = $state(false);
let poisonCloudOnCooldown = $state(false);
let poisonCloudActive = $state(false);
let carryOverPoisonStacks = $state(0); // Stacks from previous enemy

function deployPoisonCloud() {
	if (!poisonCloudUnlocked || poisonCloudOnCooldown || poisonCloudActive) return;
	poisonCloudActive = true;
	poisonCloudOnCooldown = true;

	// Cloud ticks: add stacks every second for duration
	let ticksRemaining = POISON_CLOUD_DURATION_MS / POISON_CLOUD_TICK_INTERVAL_MS;
	const cloudInterval = setInterval(() => {
		if (ticksRemaining <= 0 || enemy.isDead()) {
			clearInterval(cloudInterval);
			poisonCloudActive = false;
			return;
		}
		// Add poison stack
		if (poisonStacks.length < playerStats.poisonMaxStacks) {
			poisonStacks = [...poisonStacks, playerStats.poisonDuration];
		}
		ticksRemaining--;
	}, POISON_CLOUD_TICK_INTERVAL_MS);

	// Cooldown timer
	setTimeout(() => {
		poisonCloudOnCooldown = false;
	}, getEffectiveCooldown(POISON_CLOUD_BASE_COOLDOWN_MS, 0));
}
```

Key feature: carry over poison stacks from previous enemy. When killing an enemy as rogue, store current stacks. On next spawn, apply them.

**Step 4: Create RogueUI component**

```svelte
<div class="rogue-ui">
	{#if poisonCloudUnlocked}
		<button
			class="poison-cloud-btn"
			class:on-cooldown={onCooldown}
			class:active={cloudActive}
			onclick={onDeployCloud}
			disabled={onCooldown}
		>
			🌫️ Poison Cloud
		</button>
	{/if}
</div>
```

**Step 5: Wire into BattleArea**

Conditionally render `<RogueUI>` when class is rogue.

**Step 6: Commit**

```bash
git add src/lib/engine/rogue.ts src/lib/engine/rogue.test.ts src/lib/stores/gameState.svelte.ts src/lib/components/RogueUI.svelte src/lib/components/BattleArea.svelte
git commit -m "feat: add Rogue Poison Cloud ability with cooldown and carry-over stacks"
```

---

### Task 4.6: Keyboard Shortcuts for Class Abilities

**Files:**
- Modify: `src/routes/+page.svelte` (keyboard event handler)

**Step 1: Add keydown listener**

```svelte
<svelte:window onkeydown={handleKeydown} />

<script>
function handleKeydown(e: KeyboardEvent) {
	if (gameState.currentClass === 'mage') {
		if (e.key === 'q' || e.key === 'Q') gameState.castElement('frost');
		if (e.key === 'w' || e.key === 'W') gameState.castElement('fire');
		if (e.key === 'e' || e.key === 'E') gameState.castElement('arcane');
	}
	if (gameState.currentClass === 'rogue') {
		if (e.key === 'q' || e.key === 'Q') gameState.deployPoisonCloud();
	}
	// Space bar = attack (all classes)
	if (e.key === ' ') {
		e.preventDefault();
		gameState.attack();
	}
}
</script>
```

**Step 2: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add keyboard shortcuts (Q/W/E) for class abilities"
```

---

## Cross-Cutting Tasks

### Task 5.1: Add New Mage Upgrade Cards

**Files:**
- Modify: `src/lib/data/upgrades.ts` (add ~15 mage cards)
- Modify: `src/lib/data/upgrades.test.ts`

**Step 1: Add mage-specific upgrade cards**

```typescript
// === MAGE: MANA COST REDUCTION ===
{
	id: 'mana_cost1',
	title: 'Efficient Casting',
	rarity: 'common',
	image: bookImg,
	classRestriction: 'mage',
	stats: [{ icon: '💧', label: 'Mana Cost', value: '-2' }],
	apply: (s) => { /* reduce element costs */ }
},
// ... ~15 more mage cards covering:
// - Mana cost reduction (3 tiers)
// - Mana per tap increase (3 tiers)
// - Max mana increase (2 tiers)
// - Element duration extension (2 tiers)
// - Combo enhancement (2 tiers)
// - Magic damage boost (3 tiers)
// - Legendary: Archmage (all element boosts)
```

All with `classRestriction: 'mage'`.

**Step 2: Write test**

```typescript
test('mage cards all have mage classRestriction', () => {
	const mageCards = allUpgrades.filter(u => u.classRestriction === 'mage');
	expect(mageCards.length).toBeGreaterThanOrEqual(12);
});
```

**Step 3: Commit**

```bash
git add src/lib/data/upgrades.ts src/lib/data/upgrades.test.ts
git commit -m "feat: add Mage-specific upgrade cards (mana, elements, magic damage)"
```

---

### Task 5.2: Add New Warrior Upgrade Cards

**Files:**
- Modify: `src/lib/data/upgrades.ts`

Add warrior-specific cards:
- Weapon unlock cards (Sword, Axe, Hammer - one-time, adds to roulette pool)
- Weapon Oil (+all weapon damage)
- Battle Rhythm (+combo effects)
- Heavy Swing (+base tap damage)
- Weapon-specific combo boosters

All with `classRestriction: 'warrior'`.

**Commit:**

```bash
git add src/lib/data/upgrades.ts src/lib/data/upgrades.test.ts
git commit -m "feat: add Warrior-specific upgrade cards (weapon unlocks, combo boosts)"
```

---

### Task 5.3: Add New Rogue Upgrade Cards

**Files:**
- Modify: `src/lib/data/upgrades.ts`

Add rogue-specific cards:
- Poison Cloud unlock card (one-time, enables the ability)
- Poison Cloud cooldown reduction (2 tiers)
- Poison Cloud stack enhancement (2 tiers)
- Additional finisher/execute cards

All with `classRestriction: 'rogue'`.

**Commit:**

```bash
git add src/lib/data/upgrades.ts src/lib/data/upgrades.test.ts
git commit -m "feat: add Rogue-specific upgrade cards (Poison Cloud unlock, finishers)"
```

---

### Task 5.4: Resistance-Aware Damage Calculations

**Files:**
- Modify: `src/lib/engine/combat.ts` (add resistance multiplier to damage)
- Modify: `src/lib/engine/combat.test.ts`
- Modify: `src/lib/stores/gameState.svelte.ts` (pass enemy type to combat)

**Step 1: Add damageType and enemyType to AttackContext**

```typescript
export interface AttackContext {
	// ... existing ...
	enemyType?: EnemyTypeId;
	damageType?: DamageType; // 'physical' by default
}
```

**Step 2: Apply resistance multiplier in calculateAttack**

```typescript
// After calculating damage per hit:
if (ctx.enemyType && ctx.damageType) {
	const resistance = getResistance(ctx.enemyType, ctx.damageType);
	const multiplier = getResistanceMultiplier(resistance);
	damage = Math.floor(damage * multiplier);
}
```

**Step 3: Write tests**

```typescript
test('damage is zero against immune resistance', () => {
	const stats = { ...createDefaultStats(), damage: 10 };
	const result = calculateAttack(stats, {
		enemyHealth: 100,
		enemyMaxHealth: 100,
		overkillDamage: 0,
		rng: () => 0.5,
		enemyType: 'skeleton',
		damageType: 'bleed' // skeleton is bleed immune
	});
	expect(result.totalDamage).toBe(0);
});

test('damage is doubled against weak resistance', () => {
	const stats = { ...createDefaultStats(), damage: 10 };
	const result = calculateAttack(stats, {
		enemyHealth: 100,
		enemyMaxHealth: 100,
		overkillDamage: 0,
		rng: () => 0.5,
		enemyType: 'goblin',
		damageType: 'poison' // goblin is weak to poison
	});
	// 10 * 1 (damageMultiplier) * 2 (weak) = 20
	expect(result.totalDamage).toBe(20);
});
```

**Step 4: Commit**

```bash
git add src/lib/engine/combat.ts src/lib/engine/combat.test.ts src/lib/stores/gameState.svelte.ts
git commit -m "feat: apply enemy resistance/weakness multipliers to damage calculations"
```

---

### Task 5.5: Enemy Mechanic Visual Indicators

**Files:**
- Modify: `src/lib/components/BattleArea.svelte`

Add visual indicators for active enemy mechanics:
- Skeleton: bone icon + "Reassemble Ready" badge (if not yet used)
- Goblin: hop animation on dodge
- Red Mushroom: spore cloud animation periodically
- Blue Mushroom: frost aura visual effect (blue tint overlay)
- Blinking Eyes: darkness stacks counter + pulsing eye animation

Each indicator uses the store-driven temporary effect pattern from CLAUDE.md.

**Commit:**

```bash
git add src/lib/components/BattleArea.svelte
git commit -m "feat: add visual indicators for enemy mechanics in battle UI"
```

---

### Task 5.6: Add Changelog Entry

**Files:**
- Modify: `src/lib/changelog.ts`

**Step 1: Add new version entry**

```typescript
{
	version: '0.26.0',
	date: '2026-01-30',
	changes: [
		{ category: 'new', description: 'Added 5 enemy types with unique mechanics, resistances, and weaknesses' },
		{ category: 'new', description: 'Added class system with Warrior, Mage, and Rogue paths available at Level 30' },
		{ category: 'new', description: 'Added Warrior weapon roulette with combo payoffs' },
		{ category: 'new', description: 'Added Mage elemental combo system with mana resource' },
		{ category: 'new', description: 'Added Rogue Poison Cloud ability with carry-over stacks' },
		{ category: 'new', description: 'Added class-specific upgrade card pools' },
		{ category: 'changed', description: 'Reclassified existing upgrade cards into generic, warrior, and rogue pools' },
		{ category: 'new', description: 'Added keyboard shortcuts (Q/W/E) for class abilities' }
	]
}
```

Note: Follow CLAUDE.md rules - don't list specific card names, use counts.

**Commit:**

```bash
git add src/lib/changelog.ts
git commit -m "docs: add changelog entry for enemy types and class system"
```

---

### Task 5.7: Update Save Migration

**Files:**
- Modify: `src/lib/stores/gameState.svelte.ts` (handle loading old saves without enemy/class data)

Ensure `loadGame()` gracefully handles saves that don't have:
- `enemyType` (default to `'skeleton'`)
- `currentClass` (default to `'adventurer'`)
- `classSelected` (default to `false`)
- New PlayerStats fields (merged with `createDefaultStats()`)

This is already partially handled by the `{ ...createDefaultStats(), ...data.playerStats }` pattern, but verify new fields like `magic`, `mana`, `maxMana`, `manaPerTap` have safe defaults.

**Commit:**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "fix: handle save migration for enemy types and class system fields"
```

---

## Implementation Order Summary

```
Pillar 1 (Enemy Types)          Pillar 3 (Classes)
├─ Task 1.1 Enemy data model    ├─ Task 3.1 Class data model
├─ Task 1.2 Enemy store         ├─ Task 3.2 Card reclassification
├─ Task 1.3 Persistence         ├─ Task 3.3 Class-filtered pools
├─ Task 1.4 Battle UI           ├─ Task 3.4 Class state
│                                ├─ Task 3.5 Selection modal
│                                └─ Task 3.6 Class label on cards
│
Pillar 2 (Enemy Mechanics)       Cross-Cutting
├─ Task 2.1 Execute immunity    ├─ Task 5.1 Mage cards
├─ Task 2.2 Skeleton reassemble ├─ Task 5.2 Warrior cards
├─ Task 2.3 Goblin dodge        ├─ Task 5.3 Rogue cards
├─ Task 2.4 Spore cloud         ├─ Task 5.4 Resistance damage calc
├─ Task 2.5 Frost aura          ├─ Task 5.5 Mechanic visuals
└─ Task 2.6 Creeping darkness   ├─ Task 5.6 Changelog
                                 └─ Task 5.7 Save migration
Pillar 4 (Class Abilities)
├─ Task 4.1 Warrior data model
├─ Task 4.2 Warrior battle UI
├─ Task 4.3 Mage data model
├─ Task 4.4 Mage mana + buttons
├─ Task 4.5 Rogue poison cloud
└─ Task 4.6 Keyboard shortcuts
```

**Parallel execution groups:**
- Group A: Tasks 1.1-1.4 + Tasks 3.1-3.6 (can run in parallel)
- Group B: Tasks 2.1-2.6 (depends on Group A Pillar 1)
- Group C: Tasks 4.1-4.6 (depends on Group A both pillars)
- Group D: Tasks 5.1-5.7 (depends on Groups A-C)

**Total tasks: 25**
**Total commits: ~25**
