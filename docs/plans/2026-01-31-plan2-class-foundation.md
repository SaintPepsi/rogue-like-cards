# Plan 2: Class Foundation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the class data model (Adventurer, Warrior, Mage, Rogue), reclassify existing cards into class pools, add class-filtered upgrade selection, build the Level 30 class selection UI, and wire class state into persistence. This plan builds the foundation that Plan 3 (Class Mechanics) will use.

**Design doc:** `docs/plans/2026-01-30-enemy-types-and-class-system-design.md` (Classes, Card Classification, First Job Selection Screen sections)

**Architecture:** Bottom-up — (1) class data model with base stat overrides, (2) card reclassification + filtering, (3) class state in game store + pipeline integration + persistence, (4) Level 30 selection UI. Pure logic first, then stores, then UI.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript, Vitest, Tailwind CSS.

**Dependencies:** Requires Plan 0 (stat pipeline, game loop). Uses `statPipeline.setClassBase()` for per-class base stats and `statPipeline.setClassModifiers()` for class bonuses. Uses `gameLoop.resume()` instead of deleted timer calls. Plan 3 depends on this plan.

**Alignment doc:** `docs/plans/2026-01-31-plan-alignment-and-gaps.md`

---

## Phase 1: Class Data Model

### Task 1.1: Define Class Types and Definitions

**Files:**

- Modify: `src/lib/types.ts` (add `ClassId`)
- Create: `src/lib/data/classes.ts`
- Create: `src/lib/data/classes.test.ts`

**Step 1: Add `ClassId` to `types.ts`**

```typescript
export type ClassId = 'adventurer' | 'warrior' | 'mage' | 'rogue';
```

**Step 2: Create `src/lib/data/classes.ts`**

```typescript
import type { ClassId, StatModifier } from '$lib/types';

export const CLASS_SELECTION_LEVEL = 30;

export type ClassDefinition = {
	id: ClassId;
	name: string;
	borderColor: string;
	description: string;
	playstyle: string;
	economyPerk: string;
	startingBonuses: string[];
	baseStatOverrides: StatModifier[]; // Layer 0: replaces Adventurer base values
	classModifiers: StatModifier[]; // Layer 2: additive bonuses on top of base
};

export const CLASS_DEFINITIONS: Record<ClassId, ClassDefinition> = {
	adventurer: {
		id: 'adventurer',
		name: 'Adventurer',
		borderColor: '#9ca3af',
		description: 'A classless wanderer learning the basics.',
		playstyle: 'Tap enemies to deal damage. No special abilities.',
		economyPerk: 'None',
		startingBonuses: [],
		baseStatOverrides: [], // Uses default base stats
		classModifiers: []
	},
	warrior: {
		id: 'warrior',
		name: 'Warrior',
		borderColor: '#ef4444',
		description: 'Slow, heavy strikes. Each tap draws a random weapon.',
		playstyle: 'Build combos for devastating payoffs. Fewer taps, bigger hits.',
		economyPerk: 'Longer boss timer',
		startingBonuses: ['Highest base damage', '+10s Boss Timer'],
		baseStatOverrides: [
			{ stat: 'attackSpeed', value: -0.4 } // 0.8 base - 0.4 = 0.4/s (slow heavy hitter)
		],
		classModifiers: [
			{ stat: 'damage', value: 5 },
			{ stat: 'bonusBossTime', value: 10 }
		]
	},
	mage: {
		id: 'mage',
		name: 'Mage',
		borderColor: '#3b82f6',
		description: 'Cast elemental spells for powerful combos.',
		playstyle: 'Tap to regenerate mana, cast spells to deal magic damage.',
		economyPerk: 'Bonus XP multiplier',
		startingBonuses: ['+1 Magic damage', '+50% XP multiplier'],
		baseStatOverrides: [
			{ stat: 'attackSpeed', value: -0.16 } // 0.8 base - 0.16 = 0.64/s (moderate)
		],
		classModifiers: [
			{ stat: 'magic', value: 1 },
			{ stat: 'xpMultiplier', value: 0.5 }
		]
	},
	rogue: {
		id: 'rogue',
		name: 'Rogue',
		borderColor: '#22c55e',
		description: 'Stack poison and land devastating crits.',
		playstyle: 'Fast attacks that pile poison. Crits scale with active stacks.',
		economyPerk: 'Higher base gold drop chance',
		startingBonuses: ['+5% Crit Chance', '+10% Gold Drop Chance'],
		baseStatOverrides: [
			{ stat: 'attackSpeed', value: 0.4 } // 0.8 base + 0.4 = 1.2/s (fast)
		],
		classModifiers: [
			{ stat: 'critChance', value: 0.05 },
			{ stat: 'goldDropChance', value: 0.1 }
		]
	}
};

export const SELECTABLE_CLASSES: ClassId[] = ['warrior', 'mage', 'rogue'];
```

Note: `baseStatOverrides` uses additive modifiers applied to Layer 0 of the stat pipeline. Warrior's `attackSpeed: -0.4` means the pipeline computes `0.8 (base) + (-0.4) = 0.4/s`. `classModifiers` are Layer 2 bonuses applied on top of permanent upgrades.

**Step 3: Write tests**

Test:

- 4 class definitions exist (adventurer + 3 selectable)
- Adventurer has empty `startingBonuses`, `baseStatOverrides`, `classModifiers`
- All selectable classes have non-empty `borderColor`, `description`, `startingBonuses`
- Warrior `baseStatOverrides` results in effective attack speed of 0.4 when applied
- Rogue `baseStatOverrides` results in effective attack speed of 1.2 when applied
- `SELECTABLE_CLASSES` has exactly warrior, mage, rogue (no adventurer)
- `CLASS_SELECTION_LEVEL` is 30

**Run:** `bun test src/lib/data/classes.test.ts`

**Commit:** `feat: add class definitions with base stat overrides and class modifiers`

---

## Phase 2: Card Reclassification + Filtering

### Task 2.1: Add `classRestriction` to Upgrade Type

**Files:**

- Modify: `src/lib/types.ts` (add `classRestriction` to `Upgrade`)

Add optional field:

```typescript
export type Upgrade = {
	id: string;
	title: string;
	rarity: Rarity;
	image: string;
	modifiers: StatModifier[];
	onAcquire?: () => void;
	classRestriction?: ClassId; // undefined = generic (available to all classes)
};
```

**Commit:** `feat: add classRestriction field to Upgrade type`

---

### Task 2.2: Reclassify Existing Cards

**Files:**

- Modify: `src/lib/data/upgrades.ts` (add `classRestriction` to each card)
- Create or modify: `src/lib/data/upgrades.test.ts`

**Classification per design doc:**

**Generic (leave `classRestriction` undefined) — 26 cards:**

- Damage: `damage1`, `damage2`, `damage3`, `damage4`
- XP: `xp1`, `xp2`
- Boss Timer: `timer1`, `timer2`
- Gold/Economy: `golddrop1`, `golddrop2`, `golddrop3`, `chest1`, `chest2`, `chest3`, `bosschest1`, `bosschest2`
- Lucky: `lucky1`, `lucky2`
- Damage Multiplier: `dmgmult1`, `dmgmult2`
- Greed: `greed1`, `greed2`
- Overkill: `overkill1`
- Multi-Strike: `multi1`, `multi2`, `multi3`
- Legendary: `legendary3` (Time Lord)

**Rogue (`classRestriction: 'rogue'`) — 21 cards:**

- Poison Damage: `poison1`, `poison2`, `poison3`
- Poison Duration: `poisondur1`, `poisondur2`, `poisondur3`
- Poison Stacks: `poisonstack1`, `poisonstack2`, `poisonstack3`
- Poison Crit: `poisoncrit1`, `poisoncrit2`, `poisoncrit3`
- Crit Chance: `crit1`, `crit2`, `crit3`
- Crit Damage: `critdmg1`, `critdmg2`
- Execute: `execute1`, `execute2`, `execute3`
- Combo: `combo2` (Poison Master), `combo3` (Plague Doctor)
- Legendary: `legendary2` (Death Incarnate), `legendary4` (Toxic Apocalypse)

**Warrior (`classRestriction: 'warrior'`) — 2 cards:**

- Combo: `combo1` (Berserker)
- Legendary: `legendary1` (Dragon's Fury)

**Mage — 0 cards (all Mage cards will be new, added in Plan 3)**

Add the `classRestriction` property to each card entry in `upgrades.ts`.

**Write validation tests:**

```typescript
describe('card classification', () => {
	test('generic cards have no classRestriction', () => {
		const genericIds = [
			'damage1',
			'damage2',
			'damage3',
			'damage4',
			'xp1',
			'xp2',
			'timer1',
			'timer2',
			'greed1',
			'greed2',
			'overkill1',
			'multi1',
			'multi2',
			'multi3',
			'legendary3',
			'golddrop1',
			'golddrop2',
			'golddrop3',
			'chest1',
			'chest2',
			'chest3',
			'bosschest1',
			'bosschest2',
			'lucky1',
			'lucky2',
			'dmgmult1',
			'dmgmult2'
		];
		for (const id of genericIds) {
			const card = allUpgrades.find((u) => u.id === id);
			expect(card?.classRestriction, `${id} should be generic`).toBeUndefined();
		}
	});

	test('rogue cards have rogue classRestriction', () => {
		const rogueIds = [
			'poison1',
			'poison2',
			'poison3',
			'poisondur1',
			'poisondur2',
			'poisondur3',
			'poisonstack1',
			'poisonstack2',
			'poisonstack3',
			'poisoncrit1',
			'poisoncrit2',
			'poisoncrit3',
			'crit1',
			'crit2',
			'crit3',
			'critdmg1',
			'critdmg2',
			'execute1',
			'execute2',
			'execute3',
			'combo2',
			'combo3',
			'legendary2',
			'legendary4'
		];
		for (const id of rogueIds) {
			const card = allUpgrades.find((u) => u.id === id);
			expect(card?.classRestriction, `${id} should be rogue`).toBe('rogue');
		}
	});

	test('warrior cards have warrior classRestriction', () => {
		expect(allUpgrades.find((u) => u.id === 'combo1')?.classRestriction).toBe('warrior');
		expect(allUpgrades.find((u) => u.id === 'legendary1')?.classRestriction).toBe('warrior');
	});

	test('every card is classified', () => {
		for (const card of allUpgrades) {
			const restriction = card.classRestriction;
			expect(
				restriction === undefined ||
					restriction === 'warrior' ||
					restriction === 'mage' ||
					restriction === 'rogue',
				`${card.id} has unexpected classRestriction: ${restriction}`
			).toBe(true);
		}
	});
});
```

**Run:** `bun test src/lib/data/upgrades.test.ts`

**Commit:** `feat: reclassify existing upgrade cards into generic, warrior, and rogue pools`

---

### Task 2.3: Class-Filtered Upgrade Selection

**Files:**

- Modify: `src/lib/data/upgrades.ts` (add `classId` param to `getRandomUpgrades`)
- Modify: `src/lib/data/upgrades.test.ts`

**Step 1:** Add `classId` parameter to `getRandomUpgrades`:

```typescript
export function getRandomUpgrades(
	count: number,
	luckyChance: number = 0,
	currentExecuteChance: number = 0,
	executeCap: number = EXECUTE_CHANCE_BASE_CAP,
	currentPoison: number = 0,
	minRarity: string = 'common',
	classId: ClassId = 'adventurer'
): Upgrade[] {
	let pool = [...allUpgrades];

	// Class filter: generic + matching class cards
	if (classId === 'adventurer') {
		pool = pool.filter((u) => !u.classRestriction);
	} else {
		pool = pool.filter((u) => !u.classRestriction || u.classRestriction === classId);
	}

	// ... rest of existing logic unchanged ...
}
```

Also update `getRandomLegendaryUpgrades` to accept `classId` and filter similarly.

**Step 2:** Write tests:

```typescript
test('adventurer only gets generic cards', () => {
	const upgrades = getRandomUpgrades(3, 0, 0, 0.1, 0, 'common', 'adventurer');
	for (const u of upgrades) {
		expect(u.classRestriction).toBeUndefined();
	}
});

test('rogue gets generic + rogue cards only', () => {
	const upgrades = getRandomUpgrades(50, 0, 0, 0.1, 1, 'common', 'rogue');
	for (const u of upgrades) {
		expect(u.classRestriction === undefined || u.classRestriction === 'rogue').toBe(true);
	}
});

test('warrior does not see rogue or mage cards', () => {
	const upgrades = getRandomUpgrades(50, 0, 0, 0.1, 0, 'common', 'warrior');
	for (const u of upgrades) {
		expect(u.classRestriction).not.toBe('rogue');
		expect(u.classRestriction).not.toBe('mage');
	}
});
```

**Run:** `bun test src/lib/data/upgrades.test.ts`

**Commit:** `feat: filter upgrade card pool by player class`

---

## Phase 3: Class State + Persistence

### Task 3.1: Add Class State to Game Store

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts`
- Modify: `src/lib/stores/leveling.svelte.ts` (add `'class_selection'` event type)

**Step 1:** Add class state:

```typescript
import type { ClassId } from '$lib/types';
import { CLASS_SELECTION_LEVEL, CLASS_DEFINITIONS } from '$lib/data/classes';

let currentClass = $state<ClassId>('adventurer');
let classSelected = $state(false);
```

**Step 2:** Add class selection via stat pipeline (replaces old `applyClassBonuses` mutation):

```typescript
function selectClass(classId: ClassId) {
	currentClass = classId;
	classSelected = true;

	const def = CLASS_DEFINITIONS[classId];

	// Layer 0: base stat overrides (e.g., attack speed per class)
	statPipeline.setClassBase(def.baseStatOverrides);

	// Layer 2: class bonuses (e.g., +5 damage for warrior)
	statPipeline.setClassModifiers(def.classModifiers);

	leveling.closeActiveEvent();
	gameLoop.resume();
	saveGame();
}
```

No direct stat mutation. The pipeline recomputes all affected stats automatically.

**Step 3:** Trigger class selection at Level 30. In `leveling.svelte.ts`, add `'class_selection'` to `UpgradeEventType`. In `gameState`, after level-up processing: if `level >= CLASS_SELECTION_LEVEL && !classSelected && currentClass === 'adventurer'`, queue a `class_selection` event.

**Step 4:** Pass `classId` to upgrade context for `getRandomUpgrades`:

```typescript
function upgradeContext() {
	return {
		luckyChance: statPipeline.get('luckyChance'),
		executeChance: statPipeline.get('executeChance'),
		executeCap: shop.getExecuteCapValue(),
		poison: statPipeline.get('poison'),
		classId: currentClass
	};
}
```

**Step 5:** Expose getters:

```typescript
get currentClass() { return currentClass; },
get classSelected() { return classSelected; },
selectClass,
```

**Step 6:** Update `resetGame()` to reset class state:

```typescript
currentClass = 'adventurer';
classSelected = false;
statPipeline.setClassBase([]);
statPipeline.setClassModifiers([]);
```

**Run:** `bun test`

**Commit:** `feat: add class state with Level 30 selection trigger and pipeline-based bonuses`

---

### Task 3.2: Persist Class Choice

**Files:**

- Modify: `src/lib/stores/persistence.svelte.ts`
- Modify: `src/lib/stores/gameState.svelte.ts` (save/load)

**Step 1:** Add to `SessionSaveData`:

```typescript
currentClass?: string;
classSelected?: boolean;
```

**Step 2:** Save in `saveGame()`:

```typescript
persistence.saveSession({
	// ... existing fields ...
	currentClass,
	classSelected
});
```

**Step 3:** Restore in `loadGame()`:

```typescript
currentClass = (data.currentClass as ClassId) ?? 'adventurer';
classSelected = data.classSelected ?? false;

// Restore pipeline layers from class choice
if (currentClass !== 'adventurer') {
	const def = CLASS_DEFINITIONS[currentClass];
	statPipeline.setClassBase(def.baseStatOverrides);
	statPipeline.setClassModifiers(def.classModifiers);
}
```

Backward compat: old saves without these fields default to adventurer/false.

**Run:** `bun test`

**Commit:** `feat: persist class choice across save/load`

---

## Phase 4: Class Selection UI

### Task 4.1: Create Class Selection Modal

**Files:**

- Create: `src/lib/components/ClassSelectionModal.svelte`

**Design (from design doc):**

1. Title "Choose Your Path" fades in
2. 3 class cards animate in with staggered landing (~0.5s apart), screen shake + glow pulse on impact
3. Cards show: class name, class border color, rotating icon carousel (3 icons cycling)
4. Tap a card → flips to reveal: starting bonuses, playstyle description, economy perk
5. Tap again → flips back
6. "Pick {Class}!" button appears beneath a card when it shows its info side
7. Only one button visible at a time (whichever card is currently flipped)
8. Pressing button → selected card grows/glows, other two fade out → callback fires

**Icon carousels per class:**

- Warrior (red): sword.png → axe.png → hammer.png
- Mage (blue): fire.png → frost emoji → arcane emoji
- Rogue (green): poison.png → dagger emoji → coffin emoji

**Props:**

```typescript
type Props = {
	show: boolean;
	onSelect: (classId: ClassId) => void;
};
```

**State:**

```typescript
let flippedIndex = $state<number | null>(null);
let selectedClass = $state<ClassId | null>(null);
let landed = $state<boolean[]>([false, false, false]);
```

**Key behaviors:**

- Staggered landing: `setTimeout` for each card at 500ms, 1000ms, 1500ms after `show` becomes true (cosmetic animation, not gameplay timing — `setTimeout` acceptable here per Plan 0 design decisions)
- Card flip toggle: `handleCardClick(index)` toggles `flippedIndex`
- Selection: `handleSelect(classId)` sets `selectedClass`, waits 800ms for animation, then calls `onSelect`
- Use CSS transitions for flip (transform rotateY), fade, grow animations

**Commit:** `feat: create class selection modal with card flip and staggered landing animations`

---

### Task 4.2: Wire Class Selection into Page

**Files:**

- Modify: `src/routes/+page.svelte`

**Step 1:** Import `ClassSelectionModal`.

**Step 2:** Render conditionally:

```svelte
{#if gameState.activeEvent?.type === 'class_selection'}
	<ClassSelectionModal show={true} onSelect={(classId) => gameState.selectClass(classId)} />
{/if}
```

**Step 3:** Manual test: temporarily set `CLASS_SELECTION_LEVEL = 2` to quickly reach the modal. Verify:

- Modal appears at the right level
- Cards animate in with stagger
- Tap flips cards
- "Pick" button works
- Selection animation plays
- Game resumes after selection
- Class bonuses visible in stats panel (via pipeline)

**Commit:** `feat: wire class selection modal into game page`

---

### Task 4.3: Display Class Label on Upgrade Cards

**Files:**

- Modify: `src/lib/components/UpgradeCard.svelte`
- Modify: `src/lib/components/LevelUpModal.svelte` (pass classRestriction prop)
- Modify: `src/lib/components/ChestLootModal.svelte` (pass classRestriction prop)

**Step 1:** Add `classRestriction` prop to `UpgradeCard`:

```typescript
type Props = {
	// ... existing ...
	classRestriction?: ClassId;
};
```

**Step 2:** Render class label below the card title:

```svelte
{#if classRestriction}
	<span class="class-label" style:color={CLASS_DEFINITIONS[classRestriction].borderColor}>
		{CLASS_DEFINITIONS[classRestriction].name}
	</span>
{/if}
```

```css
.class-label {
	font-size: 0.7rem;
	font-weight: bold;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}
```

**Step 3:** Pass `classRestriction={choice.classRestriction}` from both `LevelUpModal` and `ChestLootModal`.

**Commit:** `feat: display class label on class-restricted upgrade cards`

---

### Task 4.4: Add Changelog Entry

**Files:**

- Modify: `src/lib/changelog.ts`

```typescript
{
	version: '0.30.0',
	date: '2026-01-31',
	changes: [
		{ category: 'new', description: 'Added class system with Warrior, Mage, and Rogue paths' },
		{ category: 'new', description: 'Added class selection screen at Level 30 with animated card reveal' },
		{ category: 'new', description: 'Added class-specific upgrade card pools' },
		{ category: 'changed', description: 'Reclassified existing upgrade cards into generic and class-specific pools' },
		{ category: 'new', description: 'Added class labels on class-restricted upgrade cards' }
	]
}
```

**Commit:** `docs: add changelog entry for class foundation`

---

## Implementation Order

```
Phase 1: Class Data Model
└─ Task 1.1  Class types + definitions with base stat overrides + tests

Phase 2: Card Reclassification + Filtering
├─ Task 2.1  Add classRestriction to Upgrade type
├─ Task 2.2  Reclassify all existing cards
└─ Task 2.3  Class-filtered getRandomUpgrades

Phase 3: Class State + Persistence
├─ Task 3.1  Class state in gameState + pipeline integration + Level 30 trigger
└─ Task 3.2  Persist class choice

Phase 4: Class Selection UI
├─ Task 4.1  ClassSelectionModal component
├─ Task 4.2  Wire into page
├─ Task 4.3  Class label on upgrade cards
└─ Task 4.4  Changelog
```

**Total tasks: 10**
