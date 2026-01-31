# Plan 1: Enemy System

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 enemy types with unique sprites, resistances/weaknesses, stage-based unlock schedule, and unique per-enemy mechanics. This plan is fully independent and shippable without the class system.

**Design doc:** `docs/plans/2026-01-30-enemy-types-and-class-system-design.md` (Enemy sections)

**Architecture:** Bottom-up in two phases — (1) enemy data layer + spawn integration + UI, (2) enemy mechanics engine + combat integration. Each phase starts with pure logic (testable), then wires into stores, then adds UI.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript, Vitest, Tailwind CSS, existing Sunnyside World pixel art sprites.

**Dependencies:** None. Can be implemented independently of Plans 2 and 3.

---

## Phase 1: Enemy Types (Data + Spawning + UI)

### Task 1.1: Define Enemy Type Data Model

**Files:**
- Modify: `src/lib/types.ts` (add `EnemyTypeId`, `DamageType`, `ResistanceLevel`, `EnemyTypeDefinition`)
- Create: `src/lib/data/enemies.ts`
- Create: `src/lib/data/enemies.test.ts`

**Step 1: Add types to `types.ts`**

Add after the `GoldDrop` type:

```typescript
export type EnemyTypeId = 'skeleton' | 'goblin' | 'red_mushroom' | 'blue_mushroom' | 'blinking_eyes';

export type DamageType = 'physical' | 'bleed' | 'poison' | 'fire' | 'frost' | 'arcane' | 'stun';

export type ResistanceLevel = 'immune' | 'resistant' | 'normal' | 'weak';

export type EnemyMechanicId = 'reassemble' | 'nimble' | 'spore_cloud' | 'frost_aura' | 'creeping_darkness';

export type EnemyTypeDefinition = {
	id: EnemyTypeId;
	name: string;
	spriteImport: string;
	stageIntroduced: number;
	resistances: Partial<Record<DamageType, ResistanceLevel>>;
	mechanic: EnemyMechanicId;
	mechanicDescription: string;
};
```

**Step 2: Create `src/lib/data/enemies.ts`**

Define all 5 enemy types per the design doc:

| Enemy | Stage | Resistance | Weakness | Mechanic |
|-------|-------|-----------|----------|----------|
| Skeleton | 1 | Bleed immune | Stun (2x) | Reassemble |
| Goblin | 1 | Stun (halved) | Poison | Nimble |
| Red Mushroom | 2 | Poison immune | Fire (2x) | Spore Cloud |
| Blue Mushroom | 3 | Frost immune | Bleed (2x) | Frost Aura |
| Blinking Eyes | 4 | Execute immune | Arcane | Creeping Darkness |

Sprite imports: Use `enemy.png` as placeholder for all types initially. The design doc references specific sprite files (`skeleton_idle_strip6.png`, `spr_idle_strip9.png`, etc.) — use those if they exist in assets, otherwise placeholder.

Export functions:
- `getAvailableEnemyTypes(stage: number): EnemyTypeId[]`
- `pickRandomEnemyType(stage: number, rng?: () => number): EnemyTypeId`
- `getResistance(enemyType: EnemyTypeId, damageType: DamageType): ResistanceLevel`
- `getResistanceMultiplier(level: ResistanceLevel): number` — immune=0, resistant=0.5, normal=1, weak=2

**Step 3: Write tests in `src/lib/data/enemies.test.ts`**

Test:
- 5 enemy types defined with all required fields
- `getAvailableEnemyTypes`: stage 1 → 2 types, stage 2 → 3, stage 3 → 4, stage 4+ → 5
- `pickRandomEnemyType`: returns valid type for given stage
- `getResistance`: skeleton bleed=immune, skeleton stun=weak, goblin stun=resistant, etc.
- `getResistanceMultiplier`: immune=0, resistant=0.5, normal=1, weak=2
- Undefined resistance returns 'normal'

**Step 4:** Run `bun test src/lib/data/enemies.test.ts`

**Step 5:** Commit: `feat: add enemy type definitions with resistances and stage unlock schedule`

---

### Task 1.2: Integrate Enemy Types into Enemy Store

**Files:**
- Modify: `src/lib/stores/enemy.svelte.ts`
- Modify or create: `src/lib/stores/enemy.test.ts`

**Step 1: Add enemy type state**

```typescript
import type { EnemyTypeId } from '$lib/types';
import { pickRandomEnemyType, ENEMY_DEFINITIONS } from '$lib/data/enemies';

let enemyType = $state<EnemyTypeId>('skeleton');
```

**Step 2: Update spawn functions**

`spawnEnemy()` and `spawnBoss()` both call `pickRandomEnemyType(stage)` to select a type. Chests keep their existing sprite behavior.

**Step 3: Expose via getters**

```typescript
get enemyType() { return enemyType; },
get enemyName() { return ENEMY_DEFINITIONS[enemyType].name; },
get enemySprite() { return ENEMY_DEFINITIONS[enemyType].spriteImport; },
```

**Step 4: Update `restore()` and `reset()`** to handle `enemyType` (default `'skeleton'` for backward compat).

**Step 5:** Write tests verifying spawn picks a valid type for the stage.

**Step 6:** Run `bun test`

**Step 7:** Commit: `feat: integrate enemy types into enemy store with stage-based spawning`

---

### Task 1.3: Wire Enemy Type into Persistence

**Files:**
- Modify: `src/lib/stores/persistence.svelte.ts` (add `enemyType` to `SessionSaveData`)
- Modify: `src/lib/stores/gameState.svelte.ts` (save/load `enemyType`)

Add `enemyType?: string` to `SessionSaveData`. Save it in `saveGame()`, restore in `loadGame()` with fallback to `'skeleton'`.

**Run:** `bun test`

**Commit:** `feat: persist enemy type across save/load`

---

### Task 1.4: Display Enemy Type in Battle UI

**Files:**
- Modify: `src/lib/components/BattleArea.svelte` (dynamic sprite, enemy name label)
- Modify: `src/routes/+page.svelte` (pass new props)
- Modify: `src/lib/stores/gameState.svelte.ts` (expose `enemyName`, `enemySprite`)

**Step 1:** Add `enemyName: string` and `enemySprite: string` props to `BattleArea`.

**Step 2:** Replace static `enemySprite` import with dynamic prop. Use `chestSprite` for chests, `enemySprite` prop for enemies.

**Step 3:** Add enemy name label (small text above or below enemy sprite, hidden for chests).

```css
.enemy-name {
	font-size: 0.85rem;
	color: rgba(255, 255, 255, 0.7);
	font-weight: 500;
	text-align: center;
}
```

**Step 4:** Expose `enemyName` and `enemySprite` getters from `gameState` (delegating to enemy store).

**Step 5:** Pass props from `+page.svelte` to `<BattleArea>`.

**Step 6:** Manual test: `bun run dev` — verify name displays, sprite changes per enemy type, different enemies appear as stages progress.

**Commit:** `feat: display enemy type name and dynamic sprite in battle UI`

---

## Phase 2: Enemy Mechanics (Combat Integration)

### Task 2.1: Create Enemy Mechanics Engine + Execute Immunity

**Files:**
- Create: `src/lib/engine/enemyMechanics.ts`
- Create: `src/lib/engine/enemyMechanics.test.ts`
- Modify: `src/lib/engine/combat.ts` (add `executeImmune` to `AttackContext`)
- Modify: `src/lib/engine/combat.test.ts`
- Modify: `src/lib/stores/gameState.svelte.ts` (pass flag)

**Step 1:** Create `enemyMechanics.ts` as the central file for all enemy mechanic constants and pure logic.

**Step 2:** Add `executeImmune?: boolean` to `AttackContext` in `combat.ts`. In `calculateAttack`, treat `executeImmune` the same as `isBoss` for execute chance:

```typescript
const effectiveExecuteChance = (ctx.isBoss || ctx.executeImmune) ? 0
	: ctx.executeCap != null
		? Math.min(stats.executeChance, ctx.executeCap)
		: stats.executeChance;
```

**Step 3:** In `gameState.attack()`, pass `executeImmune: enemy.enemyType === 'blinking_eyes'`.

**Step 4:** Write tests: execute never triggers when `executeImmune: true` even with 100% execute chance.

**Run:** `bun test`

**Commit:** `feat: add enemy mechanics engine with Blinking Eyes execute immunity`

---

### Task 2.2: Skeleton Reassemble Mechanic

**Files:**
- Modify: `src/lib/engine/enemyMechanics.ts`
- Modify: `src/lib/engine/enemyMechanics.test.ts`
- Modify: `src/lib/stores/enemy.svelte.ts` (reassemble state)
- Modify: `src/lib/stores/gameState.svelte.ts` (check on kill)

**Mechanic:** When a Skeleton is killed, 50% chance to revive at 25% max HP. Overkill damage prevents revival. Can only trigger once per enemy.

**Step 1:** Add to `enemyMechanics.ts`:

```typescript
export const REASSEMBLE_CHANCE = 0.5;
export const REASSEMBLE_HP_FRACTION = 0.25;

export function shouldReassemble(hasReassembled: boolean, wasOverkill: boolean, rng: () => number): boolean;
export function getReassembleHealth(maxHealth: number): number;
```

**Step 2:** Add `hasReassembled` state + `reassemble(newHealth)` method to enemy store. Reset on spawn.

**Step 3:** In `gameState.killEnemy()`, before processing the kill: if enemy is skeleton, check `shouldReassemble`. If true, call `enemy.reassemble(getReassembleHealth(enemy.enemyMaxHealth))` and return early (skip kill logic).

Overkill detection: `enemyHealth` is negative after lethal damage. If `playerStats.overkill` is enabled and `Math.abs(enemy.enemyHealth) > 0`, count as overkill.

**Step 4:** Write tests for `shouldReassemble` and `getReassembleHealth`.

**Run:** `bun test`

**Commit:** `feat: add Skeleton Reassemble mechanic (revive once at 25% HP)`

---

### Task 2.3: Goblin Nimble Mechanic (Dodge)

**Files:**
- Modify: `src/lib/engine/enemyMechanics.ts` (dodge constants)
- Modify: `src/lib/types.ts` (add `'dodge'` to `HitType`)
- Modify: `src/lib/stores/enemy.svelte.ts` (dodge timer state)
- Modify: `src/lib/stores/gameState.svelte.ts` (dodge check in attack)
- Modify: `src/lib/components/BattleArea.svelte` (dodge visual)

**Mechanic:** Every 4 seconds, the Goblin charges a dodge that nullifies the next tap. Visual tell (hop animation) warns the player.

**Step 1:** Add constants:

```typescript
export const NIMBLE_BASE_INTERVAL_MS = 4000;
export const NIMBLE_TAP_REDUCTION_MS = 200;
export const NIMBLE_MIN_INTERVAL_MS = 2000;
```

**Step 2:** Add `'dodge'` to `HitType` union in `types.ts`.

**Step 3:** Add dodge state to enemy store: `dodgeReady`, `dodgeTimerId`, `startDodgeTimer()`, `consumeDodge(): boolean`, `clearDodge()`. Start timer when spawning a goblin. Clear on non-goblin spawn and reset.

**Step 4:** In `gameState.attack()`, at the top: if goblin and `enemy.consumeDodge()` returns true, show "DODGE!" hit text and return (attack nullified).

**Step 5:** In `BattleArea.svelte`, style dodge hits differently (e.g., white "DODGE!" text, hop animation on enemy sprite).

**Run:** `bun test`

**Commit:** `feat: add Goblin Nimble dodge mechanic`

---

### Task 2.4: Red Mushroom Spore Cloud Mechanic

**Files:**
- Modify: `src/lib/engine/enemyMechanics.ts` (spore constants)
- Modify: `src/lib/stores/gameState.svelte.ts` (spore debuff timer + stat drain)
- Modify: `src/lib/components/BattleArea.svelte` (spore visual)

**Mechanic:** Every 5 seconds, releases spores that reduce player damage by 1 for 3 seconds. Max 3 stacks. Debuffs clear on enemy death.

**Step 1:** Constants:

```typescript
export const SPORE_CLOUD_INTERVAL_MS = 5000;
export const SPORE_CLOUD_DEBUFF_AMOUNT = 1;
export const SPORE_CLOUD_DEBUFF_DURATION_MS = 3000;
export const SPORE_CLOUD_MAX_STACKS = 3;
```

**Step 2:** In `gameState`, add `sporeDebuffStacks` state. When fighting a red_mushroom, start a spore interval. Each tick: if stacks < max, apply -1 damage debuff and schedule auto-remove after duration. On enemy death: clear all debuffs, restore damage.

**Step 3:** Show spore indicator on enemy (mushroom icon + stack count).

**Run:** `bun test`

**Commit:** `feat: add Red Mushroom Spore Cloud mechanic (periodic attack debuff)`

---

### Task 2.5: Blue Mushroom Frost Aura Mechanic

**Files:**
- Modify: `src/lib/engine/enemyMechanics.ts` (frost aura constant)
- Modify: `src/lib/stores/timers.svelte.ts` (configurable poison tick interval)
- Modify: `src/lib/stores/gameState.svelte.ts` (apply/remove frost aura)
- Modify: `src/lib/components/BattleArea.svelte` (frost visual)

**Mechanic:** While alive, slows all DoT tick rates to half speed (2x interval).

**Step 1:** Constant:

```typescript
export const FROST_AURA_TICK_MULTIPLIER = 2;
```

**Step 2:** Make poison tick interval configurable in `timers.svelte.ts`:

```typescript
function startPoisonTick(onTick: () => void, intervalMs: number = 1000)
```

**Step 3:** When spawning blue_mushroom, restart poison tick at `1000 * FROST_AURA_TICK_MULTIPLIER`. On death, restart at normal 1000ms.

**Step 4:** Show frost aura icon on the enemy.

**Run:** `bun test`

**Commit:** `feat: add Blue Mushroom Frost Aura mechanic (slows DoT tick rates)`

---

### Task 2.6: Blinking Eyes Creeping Darkness Mechanic

**Files:**
- Modify: `src/lib/engine/enemyMechanics.ts` (darkness logic)
- Modify: `src/lib/engine/enemyMechanics.test.ts`
- Modify: `src/lib/stores/gameState.svelte.ts` (idle detection + stat drain)

**Mechanic:** If player stops tapping for >2 seconds, a random stat is temporarily reduced by 1. Stacks up to 3. Stats recover on enemy death.

**Step 1:** Constants and logic:

```typescript
export const DARKNESS_IDLE_THRESHOLD_MS = 2000;
export const DARKNESS_MAX_STACKS = 3;
export const DARKNESS_DRAIN_AMOUNT = 1;

export type DrainableStat = 'damage' | 'poison' | 'multiStrike';

export function pickStatToDrain(rng: () => number): DrainableStat;
```

**Step 2:** In `gameState`, track `lastTapTime`, `darknessStacks: DrainableStat[]`, and a check interval. On each tick: if `Date.now() - lastTapTime > 2000` and stacks < 3, drain a random stat. Update `lastTapTime` on every attack.

**Step 3:** On blinking_eyes death, restore all drained stats:

```typescript
function restoreDarknessDebuffs() {
	for (const stat of darknessStacks) {
		playerStats[stat] += DARKNESS_DRAIN_AMOUNT;
	}
	darknessStacks = [];
}
```

**Step 4:** Start/stop idle check interval when spawning/killing blinking_eyes.

**Step 5:** Write tests for `pickStatToDrain`.

**Run:** `bun test`

**Commit:** `feat: add Blinking Eyes Creeping Darkness mechanic (stat drain on idle)`

---

### Task 2.7: Resistance-Aware Damage Calculations

**Files:**
- Modify: `src/lib/engine/combat.ts` (add `enemyType` and `damageType` to `AttackContext`)
- Modify: `src/lib/engine/combat.test.ts`
- Modify: `src/lib/stores/gameState.svelte.ts` (pass enemy type to combat)

**Step 1:** Add to `AttackContext`:

```typescript
enemyType?: EnemyTypeId;
damageType?: DamageType;
```

**Step 2:** In `calculateAttack`, after computing per-hit damage, apply resistance multiplier:

```typescript
if (ctx.enemyType && ctx.damageType) {
	const resistance = getResistance(ctx.enemyType, ctx.damageType);
	damage = Math.floor(damage * getResistanceMultiplier(resistance));
}
```

**Step 3:** Pass `enemyType` from `gameState.attack()`. For now, `damageType` is `'physical'` by default. Class-specific damage types (bleed, poison, fire, etc.) will be wired in Plan 3.

**Step 4:** Write tests:
- Bleed damage vs skeleton → 0 (immune)
- Poison damage vs goblin → 2x (weak)
- Physical damage vs any → 1x (normal)

**Run:** `bun test`

**Commit:** `feat: apply enemy resistance/weakness multipliers to damage calculations`

---

### Task 2.8: Enemy Mechanic Visual Indicators

**Files:**
- Modify: `src/lib/components/BattleArea.svelte`

Add visual indicators for active mechanics on each enemy type:
- **Skeleton**: Bone icon + "Can Reassemble" badge (hidden after reassemble used)
- **Goblin**: Hop animation on dodge + "DODGE!" text
- **Red Mushroom**: Spore cloud particles periodically, debuff stack counter
- **Blue Mushroom**: Blue tint overlay / frost icon showing aura active
- **Blinking Eyes**: Darkness stacks counter + pulsing eye animation

Each indicator uses the store-driven temporary effect pattern from CLAUDE.md.

**Commit:** `feat: add visual indicators for enemy mechanics in battle UI`

---

### Task 2.9: Add Changelog Entry

**Files:**
- Modify: `src/lib/changelog.ts`

Add entry for the current minor version:

```typescript
{
	version: '0.28.0',
	date: '2026-01-31',
	changes: [
		{ category: 'new', description: 'Added 5 enemy types with unique mechanics, resistances, and weaknesses' },
		{ category: 'new', description: 'Added enemy type variety with stage-based unlock schedule' },
		{ category: 'new', description: 'Added visual indicators for active enemy mechanics' },
		{ category: 'changed', description: 'Enemies now display their name and type-specific sprite' }
	]
}
```

Note: Check current version before writing. Follow CLAUDE.md rules (no specific card names).

**Commit:** `docs: add changelog entry for enemy system`

---

## Implementation Order

```
Phase 1: Data + Spawning + UI
├─ Task 1.1  Enemy data model + tests
├─ Task 1.2  Enemy store integration
├─ Task 1.3  Persistence
└─ Task 1.4  Battle UI display

Phase 2: Mechanics + Combat
├─ Task 2.1  Enemy mechanics engine + execute immunity
├─ Task 2.2  Skeleton Reassemble
├─ Task 2.3  Goblin Nimble (dodge)
├─ Task 2.4  Red Mushroom Spore Cloud
├─ Task 2.5  Blue Mushroom Frost Aura
├─ Task 2.6  Blinking Eyes Creeping Darkness
├─ Task 2.7  Resistance-aware damage
├─ Task 2.8  Mechanic visual indicators
└─ Task 2.9  Changelog
```

**Total tasks: 13**
**Total commits: ~13**
