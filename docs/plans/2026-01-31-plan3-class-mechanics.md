# Plan 3: Class Mechanics

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the three class ability systems (Warrior weapon roulette, Mage elements + mana, Rogue poison cloud), their battle UI, new class-specific upgrade cards, and keyboard shortcuts. Each class gets a distinct combat identity on top of the shared foundation.

**Design doc:** `docs/plans/2026-01-30-enemy-types-and-class-system-design.md` (Warrior, Mage, Rogue sections, Card Classification > New Cards Needed, Class Ability UI)

**Architecture:** Each class mechanic is built as an independent vertical slice: pure engine logic (testable) → game state integration → battle UI component → new cards. The three classes can be implemented in any order.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript, Vitest, Tailwind CSS.

**Dependencies:** Requires Plan 0 (stat pipeline, timer registry, game loop) and Plan 2 (class data model, `currentClass` state, class-filtered card pools, `ClassId` type). Benefits from Plan 1 (Enemy System) for resistance interactions but not strictly required.

**Alignment doc:** `docs/plans/2026-01-31-plan-alignment-and-gaps.md`

**Key design decisions from alignment:**
- Warrior has NO separate cooldown system. Slow attack identity comes from `attackSpeed: 0.4` set in Plan 2's class base stat overrides. Weapon draw + combo hooks into the `onAttack` callback.
- All timed effects (element expiry, burn DoT, poison cloud, cooldowns) use the timer registry via `gameLoop.timers`. No `setTimeout`/`setInterval` for gameplay.
- Element effects (frost debuff, arcane vulnerability) are transient modifiers in the stat pipeline. Auto-removed when timer expires — no manual reversal.
- Weapon/ability unlock cards use `onAcquire` callback on the Upgrade type.

---

## Phase 1: Warrior — Weapon Roulette

### Task 1.1: Warrior Engine (Pure Logic)

**Files:**
- Create: `src/lib/engine/warrior.ts`
- Create: `src/lib/engine/warrior.test.ts`

**Data model:**

```typescript
export type WeaponId = 'knife' | 'sword' | 'axe' | 'hammer';

export type WeaponDefinition = {
	id: WeaponId;
	name: string;
	comboEffect: 'bleed' | 'megaCrit' | 'stun';
	comboDescription: string;
};

export const WEAPON_DEFINITIONS: Record<WeaponId, WeaponDefinition> = {
	knife: { id: 'knife', name: 'Knife', comboEffect: 'bleed', comboDescription: 'Minor Bleed' },
	sword: { id: 'sword', name: 'Sword', comboEffect: 'bleed', comboDescription: 'Super Bleed (massive burst scaled by combo count)' },
	axe: { id: 'axe', name: 'Axe', comboEffect: 'megaCrit', comboDescription: 'Mega Crit (guaranteed crit scaled by combo count)' },
	hammer: { id: 'hammer', name: 'Hammer', comboEffect: 'stun', comboDescription: 'Shockwave Stun (long stun scaled by combo count)' }
};
```

Note: No `WARRIOR_SWING_COOLDOWN_MS` — Warrior attack rate is governed by `attackSpeed: 0.4` from Plan 2's class base stat overrides, enforced by the game loop's attack cooldown timer.

**Functions:**

```typescript
export function drawWeapon(unlockedWeapons: WeaponId[], rng?: () => number): WeaponId;

export function calculateComboPayoff(
	weapon: WeaponId,
	comboCount: number,
	baseDamage: number
): { damage: number; effect: string };
```

Combo payoff scaling:
- Sword (bleed): `baseDamage * comboCount * 1.5`
- Axe (megaCrit): `baseDamage * comboCount * 2.5`
- Hammer (stun): `baseDamage * comboCount * 0.5` (lower damage, but stun effect)

**Tests:**
- `drawWeapon` picks from the given pool deterministically with a fixed rng
- `calculateComboPayoff` returns correct damage and effect for each weapon type
- Combo count multiplier works (combo 3 = 3x the base scaling)

**Run:** `bun test src/lib/engine/warrior.test.ts`

**Commit:** `feat: add Warrior weapon roulette engine with combo payoff calculations`

---

### Task 1.2: Warrior State Integration

**Files:**
- Modify: `src/lib/stores/gameState.svelte.ts`

**Step 1:** Add warrior state:

```typescript
let warriorWeapons = $state<WeaponId[]>(['knife']); // Starting pool
let currentWeapon = $state<WeaponId | null>(null);
let comboWeapon = $state<WeaponId | null>(null);
let comboCount = $state(0);
```

No `warriorCooldown` state — attack rate is controlled by the game loop's attack cooldown timer using `attackSpeed: 0.4`.

**Step 2:** Create warrior attack override. When `currentClass === 'warrior'`, the internal `attack()` function:

1. Draw a random weapon from `warriorWeapons` via `drawWeapon()`
2. If same as `comboWeapon` → increment `comboCount`
3. If different and `comboWeapon !== null` → fire `calculateComboPayoff()` for the old weapon, apply that damage to enemy, reset combo
4. Set `comboWeapon` to drawn weapon, `currentWeapon` to drawn weapon
5. Deal normal tap damage (base damage + crit check, using existing `calculateAttack`)
6. Play swing animation (weapon-specific)

The game loop fires `onAttack` at the Warrior's attack rate (~0.4/s = every 2.5s). No separate cooldown system needed.

**Step 3:** Add method to unlock new weapons (called by weapon unlock upgrade cards via `onAcquire`):

```typescript
function unlockWeapon(weaponId: WeaponId) {
	if (!warriorWeapons.includes(weaponId)) {
		warriorWeapons = [...warriorWeapons, weaponId];
	}
}
```

**Step 4:** Expose getters:

```typescript
get currentWeapon() { return currentWeapon; },
get comboCount() { return comboCount; },
get comboWeapon() { return comboWeapon; },
get warriorWeapons() { return warriorWeapons; },
unlockWeapon,
```

**Step 5:** Reset warrior state in `resetGame()` and handle in persistence (save/load `warriorWeapons`).

**Run:** `bun test`

**Commit:** `feat: integrate Warrior weapon roulette into game state with combo tracking`

---

### Task 1.3: Warrior Battle UI

**Files:**
- Create: `src/lib/components/WarriorUI.svelte`
- Modify: `src/lib/components/BattleArea.svelte`

**WarriorUI component:**

Passive display near the enemy (no action buttons — Warrior's roulette is automatic on attack):

```svelte
<div class="warrior-ui">
	{#if currentWeapon}
		<div class="weapon-display">
			<img src={weaponSprites[currentWeapon]} alt={currentWeapon} class="weapon-icon" />
			<span class="weapon-name">{WEAPON_DEFINITIONS[currentWeapon].name}</span>
		</div>
	{/if}
	{#if comboCount > 1}
		<div class="combo-counter">
			<span class="combo-label">COMBO</span>
			<span class="combo-number">x{comboCount}</span>
		</div>
	{/if}
</div>
```

Weapon sprite mapping: use existing card art (`sword.png`, `axe.png`, `hammer.png`). Knife can use `sword.png` scaled down or a placeholder.

**Props:**

```typescript
type Props = {
	currentWeapon: WeaponId | null;
	comboCount: number;
};
```

**BattleArea integration:** Conditionally render `<WarriorUI>` when `currentClass === 'warrior'`:

```svelte
{#if currentClass === 'warrior'}
	<WarriorUI {currentWeapon} {comboCount} />
{/if}
```

**Swing animation:** On each warrior attack, briefly show the drawn weapon sprite swinging across the enemy (CSS animation, ~0.3s). Use the temporary UI effect pattern — add swing events to an array in the store, auto-remove after animation duration.

**Commit:** `feat: add Warrior battle UI with weapon display, combo counter, and swing animation`

---

### Task 1.4: Warrior Upgrade Cards

**Files:**
- Modify: `src/lib/data/upgrades.ts`
- Modify: `src/lib/data/upgrades.test.ts`

**New warrior-specific cards (all with `classRestriction: 'warrior'`):**

**Weapon Unlock Cards (one-time, uses `onAcquire`):**

```typescript
{ id: 'warrior_sword', title: 'Forge: Sword', rarity: 'uncommon', image: swordImg,
  classRestriction: 'warrior',
  modifiers: [],  // No stat changes
  onAcquire: () => gameState.unlockWeapon('sword') },
{ id: 'warrior_axe', title: 'Forge: Axe', rarity: 'rare', image: axeImg,
  classRestriction: 'warrior',
  modifiers: [],
  onAcquire: () => gameState.unlockWeapon('axe') },
{ id: 'warrior_hammer', title: 'Forge: Hammer', rarity: 'epic', image: hammerImg,
  classRestriction: 'warrior',
  modifiers: [],
  onAcquire: () => gameState.unlockWeapon('hammer') },
```

Note: `onAcquire` is called once when the upgrade is selected. These cards have empty `modifiers[]` since their effect is a one-time side effect, not a stat modification.

**Boost Cards (use `modifiers`):**

| ID | Title | Rarity | Modifiers |
|----|-------|--------|-----------|
| `warrior_oil1` | Weapon Oil | common | `[{ stat: 'damage', value: 2 }]` |
| `warrior_oil2` | Master Oil | uncommon | `[{ stat: 'damage', value: 5 }]` |
| `warrior_heavy1` | Heavy Swing | common | `[{ stat: 'damage', value: 3 }]` |
| `warrior_heavy2` | Mighty Blow | rare | `[{ stat: 'damage', value: 8 }]` |

Note: Combo payoff boost cards (`warrior_rhythm1`, `warrior_rhythm2`) need a `comboPayoffMultiplier` stat added to PlayerStats. Add:
- `comboPayoffMultiplier: number` to PlayerStats (default 1.0)
- `warrior_rhythm1`: `[{ stat: 'comboPayoffMultiplier', value: 0.25 }]`
- `warrior_rhythm2`: `[{ stat: 'comboPayoffMultiplier', value: 0.5 }]`

**Legendary:**
- `warrior_legendary`: `modifiers: [{ stat: 'damage', value: 15 }, { stat: 'comboPayoffMultiplier', value: 0.5 }]`, `onAcquire: () => gameState.unlockRandomWeapon()`

**Total new warrior cards: ~10**

**Tests:** Verify all new cards have `classRestriction: 'warrior'` and expected count.

**Run:** `bun test src/lib/data/upgrades.test.ts`

**Commit:** `feat: add Warrior-specific upgrade cards (weapon unlocks, combo boosts)`

---

## Phase 2: Mage — Elemental Combos

### Task 2.1: Mage Engine (Pure Logic)

**Files:**
- Create: `src/lib/engine/mage.ts`
- Create: `src/lib/engine/mage.test.ts`

**Data model:**

```typescript
export type ElementId = 'frost' | 'fire' | 'arcane';
export type ElementComboId = 'frost_arcane' | 'fire_arcane' | 'frost_fire';

export const ELEMENT_MANA_COSTS: Record<ElementId, number> = {
	frost: 15,
	fire: 15,
	arcane: 20
};

export const BASE_MANA_PER_TAP = 1;
export const ELEMENT_DURATION_MS = 5000;

export const ELEMENT_EFFECTS: Record<ElementId, {
	id: ElementId;
	name: string;
	description: string;
}>;

export const ELEMENT_COMBOS: Record<ElementComboId, {
	elements: [ElementId, ElementId];
	name: string;
	description: string;
}>;
```

Element effects:
- Frost = enemy takes more damage (debuff, +50% damage taken)
- Fire = burn DoT (damage per second)
- Arcane = increased vulnerability (+25% all damage taken)

Combo effects (trigger when two elements are active simultaneously):
- Frost + Arcane = "Shatter Burst" — large burst damage
- Fire + Arcane = "Empowered Burn" — massively enhanced burn DoT
- Frost + Fire = "Shatter" — reduce enemy defenses

**Functions:**

```typescript
export function checkElementCombo(activeElements: Set<ElementId>): ElementComboId | null;
export function getManaPerTap(baseManaPerTap: number, manaPerTapBonus: number): number;
export function getManaCost(element: ElementId, costReduction: number): number;
```

**Tests:**
- `checkElementCombo`: frost+arcane → `frost_arcane`, fire+arcane → `fire_arcane`, frost+fire → `frost_fire`, single → null, empty → null
- `getManaPerTap`: base + bonus
- `getManaCost`: base cost minus reduction, minimum 1

**Run:** `bun test src/lib/engine/mage.test.ts`

**Commit:** `feat: add Mage element system with combos and mana calculations`

---

### Task 2.2: Mage Stats (Magic, Mana)

**Files:**
- Modify: `src/lib/types.ts` (add mana/magic to `PlayerStats`)
- Modify: `src/lib/engine/stats.ts` (defaults + stat registry)

**Step 1:** Add to `PlayerStats`:

```typescript
magic: number;
maxMana: number;
manaPerTap: number;
manaCostReduction: number;
```

**Step 2:** Update `createDefaultStats()`:

```typescript
magic: 0,
maxMana: 50,
manaPerTap: 1,
manaCostReduction: 0,
```

**Step 3:** Add to stat registry for display:

```typescript
{ key: 'magic', icon: '🔮', label: 'Magic', format: num, colorClass: 'magic' },
{ key: 'maxMana', icon: '💧', label: 'Max Mana', format: num, colorClass: 'magic' },
{ key: 'manaPerTap', icon: '💧', label: 'Mana/Tap', format: num, colorClass: 'magic' },
```

**Step 4:** Handle save migration — new fields merge safely via pipeline (base stats include defaults, acquired upgrades add on top).

**Run:** `bun test`

**Commit:** `feat: add Magic, Mana, and Mana/Tap stats for Mage class`

---

### Task 2.3: Mage State Integration

**Files:**
- Modify: `src/lib/stores/gameState.svelte.ts`

**Step 1:** Add mage state:

```typescript
let mana = $state(0);
let activeElements = $state<Set<ElementId>>(new Set());
```

**Step 2:** Mage tap behavior (when `currentClass === 'mage'`):
- Regenerate mana: `mana = Math.min(statPipeline.get('maxMana'), mana + getManaPerTap(statPipeline.get('manaPerTap'), 0))`
- Deal base magic damage to enemy (use `statPipeline.get('magic')`)

**Step 3:** Add `castElement(element: ElementId)` using timer registry:

```typescript
function castElement(element: ElementId) {
	if (currentClass !== 'mage') return;
	const cost = getManaCost(element, statPipeline.get('manaCostReduction'));
	if (mana < cost) return;

	mana -= cost;

	// Remove existing timer for this element if active (refresh)
	const timerName = `element_${element}`;
	if (gameLoop.timers.has(timerName)) {
		gameLoop.timers.remove(timerName);
		removeElementEffect(element);
	}

	// Apply element effect via transient modifiers
	applyElementEffect(element);
	activeElements = new Set([...activeElements, element]);

	// Register expiration timer
	gameLoop.timers.register(timerName, {
		remaining: ELEMENT_DURATION_MS,
		onExpire: () => {
			removeElementEffect(element);
			activeElements = new Set([...activeElements].filter(e => e !== element));

			// If fire, also remove burn DoT timer
			if (element === 'fire') {
				gameLoop.timers.remove('burn_dot');
			}
		}
	});

	// Check for combo
	const combo = checkElementCombo(activeElements);
	if (combo) {
		triggerElementCombo(combo);
	}
}
```

**Step 4:** Implement element effects as transient pipeline modifiers:

```typescript
function applyElementEffect(element: ElementId) {
	switch (element) {
		case 'frost':
			// Enemy takes +50% damage — transient multiplier on damage
			statPipeline.addTransientStep('element_frost', 'damage', multiply(1.5));
			break;
		case 'fire':
			// Start burn DoT — repeating timer
			gameLoop.timers.register('burn_dot', {
				remaining: 1000,
				repeat: 1000,
				onExpire: () => {
					const burnDamage = statPipeline.get('magic');
					enemy.takeDamage(burnDamage);
					// Add hit number for burn
					ui.addHits([{ damage: burnDamage, type: 'fire' as HitType, id: 0, index: 0 }]);
					if (enemy.isDead()) killEnemy();
				}
			});
			break;
		case 'arcane':
			// Enemy takes +25% damage — transient multiplier
			statPipeline.addTransientStep('element_arcane', 'damage', multiply(1.25));
			break;
	}
}

function removeElementEffect(element: ElementId) {
	statPipeline.removeTransient(`element_${element}`);
}
```

No manual stat reversal needed — removing the transient from the pipeline recomputes automatically.

**Step 5:** Implement combo triggers:
- `frost_arcane`: instant burst damage (e.g., `statPipeline.get('magic') * 10`)
- `fire_arcane`: enhanced burn (e.g., burn damage * 3 for remaining duration)
- `frost_fire`: defense shatter (e.g., enemy takes +100% damage for 5s)

**Step 6:** Clear all element state on enemy death:

```typescript
activeElements = new Set();
gameLoop.timers.remove('element_frost');
gameLoop.timers.remove('element_fire');
gameLoop.timers.remove('element_arcane');
gameLoop.timers.remove('burn_dot');
statPipeline.removeTransient('element_frost');
statPipeline.removeTransient('element_fire');
statPipeline.removeTransient('element_arcane');
```

**Step 7:** Expose getters:

```typescript
get mana() { return mana; },
get activeElements() { return activeElements; },
castElement,
```

**Step 8:** Persist mana in save data.

**Run:** `bun test`

**Commit:** `feat: integrate Mage mana system with element casting via timer registry and stat pipeline`

---

### Task 2.4: Mage Battle UI

**Files:**
- Create: `src/lib/components/MageUI.svelte`
- Modify: `src/lib/components/BattleArea.svelte`

**MageUI component:**

```svelte
<div class="mage-ui">
	<!-- Mana Bar -->
	<div class="mana-bar">
		<div class="mana-fill" style:width="{(mana / maxMana) * 100}%"></div>
		<span class="mana-text">{mana}/{maxMana}</span>
	</div>

	<!-- Element Buttons -->
	<div class="element-buttons">
		<button
			class="element-btn frost"
			class:active={activeElements.has('frost')}
			onclick={() => onCast('frost')}
			disabled={mana < frostCost}
		>
			❄️ Frost ({frostCost})
		</button>
		<button
			class="element-btn fire"
			class:active={activeElements.has('fire')}
			onclick={() => onCast('fire')}
			disabled={mana < fireCost}
		>
			🔥 Fire ({fireCost})
		</button>
		<button
			class="element-btn arcane"
			class:active={activeElements.has('arcane')}
			onclick={() => onCast('arcane')}
			disabled={mana < arcaneCost}
		>
			✨ Arcane ({arcaneCost})
		</button>
	</div>
</div>
```

**Props:**

```typescript
type Props = {
	mana: number;
	maxMana: number;
	activeElements: Set<ElementId>;
	frostCost: number;
	fireCost: number;
	arcaneCost: number;
	onCast: (element: ElementId) => void;
};
```

**Styling:**
- Mana bar: blue gradient fill, similar to health bar but blue themed
- Element buttons: colored per element (frost=cyan, fire=orange, arcane=purple)
- Active elements: glowing border when element is applied to enemy
- Disabled state: grayed out when insufficient mana

**Active element indicators on enemy:** Show small icons above/near the enemy sprite for each active element.

**Desktop layout:** Element buttons in a fixed action bar at bottom of screen (MOBA-style).
**Mobile layout:** Element buttons directly below enemy sprite for thumb access.

**BattleArea integration:**

```svelte
{#if currentClass === 'mage'}
	<MageUI
		{mana}
		maxMana={statPipeline.get('maxMana')}
		{activeElements}
		frostCost={getManaCost('frost', statPipeline.get('manaCostReduction'))}
		fireCost={getManaCost('fire', statPipeline.get('manaCostReduction'))}
		arcaneCost={getManaCost('arcane', statPipeline.get('manaCostReduction'))}
		onCast={(element) => gameState.castElement(element)}
	/>
{/if}
```

**Commit:** `feat: add Mage battle UI with mana bar and element buttons`

---

### Task 2.5: Mage Upgrade Cards

**Files:**
- Modify: `src/lib/data/upgrades.ts`
- Modify: `src/lib/data/upgrades.test.ts`

**New mage-specific cards (all with `classRestriction: 'mage'`, using `modifiers` format):**

| ID | Title | Rarity | Modifiers |
|----|-------|--------|-----------|
| `mage_cost1` | Efficient Casting | common | `[{ stat: 'manaCostReduction', value: 2 }]` |
| `mage_cost2` | Arcane Flow | uncommon | `[{ stat: 'manaCostReduction', value: 4 }]` |
| `mage_cost3` | Mana Mastery | rare | `[{ stat: 'manaCostReduction', value: 6 }]` |
| `mage_regen1` | Mana Siphon | common | `[{ stat: 'manaPerTap', value: 1 }]` |
| `mage_regen2` | Arcane Absorption | uncommon | `[{ stat: 'manaPerTap', value: 2 }]` |
| `mage_regen3` | Soul Drain | rare | `[{ stat: 'manaPerTap', value: 3 }]` |
| `mage_pool1` | Mana Well | common | `[{ stat: 'maxMana', value: 20 }]` |
| `mage_pool2` | Arcane Reservoir | uncommon | `[{ stat: 'maxMana', value: 40 }]` |
| `mage_magic1` | Arcane Studies | common | `[{ stat: 'magic', value: 1 }]` |
| `mage_magic2` | Mystic Power | uncommon | `[{ stat: 'magic', value: 3 }]` |
| `mage_magic3` | Eldritch Might | rare | `[{ stat: 'magic', value: 5 }]` |
| `mage_legendary` | Archmage | legendary | `[{ stat: 'magic', value: 5 }, { stat: 'maxMana', value: 30 }, { stat: 'manaPerTap', value: 3 }, { stat: 'manaCostReduction', value: 5 }]` |

Note: Element duration and combo enhancement cards need additional stats added to PlayerStats:
- `elementDurationBonus: number` (default 0, added to `ELEMENT_DURATION_MS`)
- `comboDamageMultiplier: number` (default 1.0)

| ID | Title | Rarity | Modifiers |
|----|-------|--------|-----------|
| `mage_duration1` | Lingering Magic | uncommon | `[{ stat: 'elementDurationBonus', value: 2000 }]` |
| `mage_duration2` | Eternal Enchant | rare | `[{ stat: 'elementDurationBonus', value: 4000 }]` |
| `mage_combo1` | Elemental Synergy | rare | `[{ stat: 'comboDamageMultiplier', value: 0.5 }]` |
| `mage_combo2` | Harmonic Resonance | epic | `[{ stat: 'comboDamageMultiplier', value: 1.0 }]` |

**Total new mage cards: ~16**

**Tests:** Verify all new cards have `classRestriction: 'mage'` and count >= 15.

**Run:** `bun test src/lib/data/upgrades.test.ts`

**Commit:** `feat: add Mage-specific upgrade cards (mana, elements, magic damage)`

---

## Phase 3: Rogue — Poison Assassin

### Task 3.1: Rogue Engine (Pure Logic)

**Files:**
- Create: `src/lib/engine/rogue.ts`
- Create: `src/lib/engine/rogue.test.ts`

**Data model:**

```typescript
export const POISON_CLOUD_BASE_COOLDOWN_MS = 10000;
export const POISON_CLOUD_STACKS_PER_TICK = 1;
export const POISON_CLOUD_DURATION_MS = 5000;
export const POISON_CLOUD_TICK_INTERVAL_MS = 1000;

export function getEffectiveCooldown(baseCooldown: number, cooldownReduction: number): number {
	return Math.max(3000, baseCooldown - cooldownReduction);
}
```

**Tests:**
- Base cooldown is 10s
- Cooldown reduction works correctly
- Minimum cooldown is 3s

**Run:** `bun test src/lib/engine/rogue.test.ts`

**Commit:** `feat: add Rogue Poison Cloud engine with cooldown calculations`

---

### Task 3.2: Rogue State Integration

**Files:**
- Modify: `src/lib/stores/gameState.svelte.ts`

**Step 1:** Add rogue state:

```typescript
let poisonCloudUnlocked = $state(false);
let poisonCloudOnCooldown = $state(false);
let poisonCloudActive = $state(false);
let carryOverPoisonStacks = $state(0);
```

**Step 2:** Add `deployPoisonCloud()` using timer registry:

```typescript
function deployPoisonCloud() {
	if (!poisonCloudUnlocked || poisonCloudOnCooldown || poisonCloudActive) return;

	poisonCloudActive = true;
	poisonCloudOnCooldown = true;

	// Register cloud tick timer (applies poison stacks)
	gameLoop.timers.register('poison_cloud_tick', {
		remaining: POISON_CLOUD_TICK_INTERVAL_MS,
		repeat: POISON_CLOUD_TICK_INTERVAL_MS,
		onExpire: () => {
			applyPoisonStack();
		}
	});

	// Register cloud expiry timer
	gameLoop.timers.register('poison_cloud_expire', {
		remaining: POISON_CLOUD_DURATION_MS,
		onExpire: () => {
			poisonCloudActive = false;
			gameLoop.timers.remove('poison_cloud_tick');
		}
	});

	// Register cooldown timer
	const effectiveCooldown = getEffectiveCooldown(
		POISON_CLOUD_BASE_COOLDOWN_MS,
		statPipeline.get('poisonCloudCooldownReduction') ?? 0
	);
	gameLoop.timers.register('poison_cloud_cooldown', {
		remaining: effectiveCooldown,
		onExpire: () => {
			poisonCloudOnCooldown = false;
		}
	});
}
```

All three timers automatically pause during upgrade modals since the game loop pauses.

**Step 3:** Poison carry-over. When killing an enemy as Rogue:

```typescript
if (currentClass === 'rogue') {
	carryOverPoisonStacks = poisonStacks.length;
}
```

When spawning the next enemy, if rogue and `carryOverPoisonStacks > 0`, pre-apply that many stacks.

**Step 4:** Method to unlock poison cloud (called by upgrade card via `onAcquire`):

```typescript
function unlockPoisonCloud() {
	poisonCloudUnlocked = true;
}
```

**Step 5:** Expose getters:

```typescript
get poisonCloudUnlocked() { return poisonCloudUnlocked; },
get poisonCloudOnCooldown() { return poisonCloudOnCooldown; },
get poisonCloudActive() { return poisonCloudActive; },
deployPoisonCloud,
unlockPoisonCloud,
```

**Step 6:** Reset rogue state in `resetGame()`. Clean up cloud timers on enemy death:

```typescript
gameLoop.timers.remove('poison_cloud_tick');
gameLoop.timers.remove('poison_cloud_expire');
poisonCloudActive = false;
// Note: cooldown timer keeps running across enemies
```

Persist `poisonCloudUnlocked` in save data.

**Run:** `bun test`

**Commit:** `feat: integrate Rogue Poison Cloud into game state with timer registry and carry-over stacks`

---

### Task 3.3: Rogue Battle UI

**Files:**
- Create: `src/lib/components/RogueUI.svelte`
- Modify: `src/lib/components/BattleArea.svelte`

**RogueUI component:**

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
			{#if onCooldown}
				<span class="cooldown-text">Cooling...</span>
			{/if}
		</button>
	{/if}
</div>
```

**Props:**

```typescript
type Props = {
	poisonCloudUnlocked: boolean;
	onCooldown: boolean;
	cloudActive: boolean;
	onDeployCloud: () => void;
};
```

**Styling:**
- Poison cloud button: green themed, large enough for mobile tap
- Active state: glowing green border, particle effect
- Cooldown state: grayed out, optional cooldown timer countdown
- Position: below enemy sprite on mobile, in action bar on desktop

**BattleArea integration:**

```svelte
{#if currentClass === 'rogue'}
	<RogueUI
		poisonCloudUnlocked={gameState.poisonCloudUnlocked}
		onCooldown={gameState.poisonCloudOnCooldown}
		cloudActive={gameState.poisonCloudActive}
		onDeployCloud={() => gameState.deployPoisonCloud()}
	/>
{/if}
```

**Commit:** `feat: add Rogue battle UI with Poison Cloud button`

---

### Task 3.4: Rogue Upgrade Cards

**Files:**
- Modify: `src/lib/data/upgrades.ts`
- Modify: `src/lib/data/upgrades.test.ts`

**New rogue-specific cards (all with `classRestriction: 'rogue'`, using `modifiers` format):**

Note: Many rogue cards already exist from Plan 2's reclassification. These are additional cards for the Poison Cloud ability.

**Poison Cloud Cards:**

| ID | Title | Rarity | Modifiers / OnAcquire |
|----|-------|--------|-----------|
| `rogue_cloud_unlock` | Poison Cloud | rare | `modifiers: [], onAcquire: () => gameState.unlockPoisonCloud()` |
| `rogue_cloud_cd1` | Quick Deploy | uncommon | `[{ stat: 'poisonCloudCooldownReduction', value: 2000 }]` |
| `rogue_cloud_cd2` | Rapid Deployment | rare | `[{ stat: 'poisonCloudCooldownReduction', value: 3000 }]` |

Note: `poisonCloudCooldownReduction` needs to be added to PlayerStats (default 0).

**Additional Finisher Cards:**

| ID | Title | Rarity | Modifiers |
|----|-------|--------|-----------|
| `rogue_finisher1` | Backstab | rare | `[{ stat: 'executeChance', value: 0.03 }]` |
| `rogue_finisher2` | Assassinate | epic | `[{ stat: 'executeChance', value: 0.05 }]` |

**Legendary:**
- `rogue_legendary`: `modifiers: [{ stat: 'poisonCloudCooldownReduction', value: 5000 }], onAcquire: () => gameState.unlockPoisonCloud()`

**Total new rogue cards: ~6**

**Tests:** Verify all new cards have `classRestriction: 'rogue'` and expected count.

**Run:** `bun test src/lib/data/upgrades.test.ts`

**Commit:** `feat: add Rogue-specific upgrade cards (Poison Cloud unlock, finishers)`

---

## Phase 4: Cross-Class Polish

### Task 4.1: Keyboard Shortcuts for Class Abilities

**Files:**
- Modify: `src/routes/+page.svelte`

**Step 1:** Add `<svelte:window onkeydown={handleKeydown} />` handler:

Note: Spacebar attack is already handled by Plan 0's `onkeydown`/`onkeyup` on the BattleArea enemy div. This task only adds Mage and Rogue ability bindings.

```typescript
function handleKeydown(e: KeyboardEvent) {
	// Don't handle keys when modals are open
	if (gameState.activeEvent) return;

	// Mage element casting
	if (gameState.currentClass === 'mage') {
		if (e.key === 'q' || e.key === 'Q') gameState.castElement('frost');
		if (e.key === 'w' || e.key === 'W') gameState.castElement('fire');
		if (e.key === 'e' || e.key === 'E') gameState.castElement('arcane');
	}

	// Rogue poison cloud
	if (gameState.currentClass === 'rogue') {
		if (e.key === 'q' || e.key === 'Q') gameState.deployPoisonCloud();
	}
}
```

**Step 2:** Show keyboard hints on ability buttons (desktop only):

```svelte
<!-- Mage button example -->
<button class="element-btn frost">
	<span class="key-hint">[Q]</span> ❄️ Frost
</button>
```

Detect desktop vs mobile: use `matchMedia('(hover: hover)')` or similar.

**Commit:** `feat: add keyboard shortcuts (Q/W/E) for class abilities`

---

### Task 4.2: Class Ability UI Layout (Desktop vs Mobile)

**Files:**
- Modify: `src/lib/components/BattleArea.svelte`
- Modify: `src/lib/components/MageUI.svelte`
- Modify: `src/lib/components/RogueUI.svelte`

Per the design doc:
- **Desktop:** Class ability buttons in a fixed action bar at the bottom of the screen (MOBA-style). Keyboard shortcuts Q, W, E.
- **Mobile:** Class ability buttons directly below the enemy sprite for easy thumb access.
- **Warrior:** No ability buttons — weapon roulette display and combo counter are passive UI elements near the enemy.

Use CSS media queries or a responsive container query to position the action bar.

**Commit:** `feat: responsive class ability UI layout (desktop action bar, mobile below enemy)`

---

### Task 4.3: Save Migration for New Fields

**Files:**
- Modify: `src/lib/stores/gameState.svelte.ts`

Ensure `loadGame()` handles saves that don't have:
- `warriorWeapons` (default `['knife']`)
- `mana` (default `0`)
- `poisonCloudUnlocked` (default `false`)
- New PlayerStats fields: `magic`, `maxMana`, `manaPerTap`, `manaCostReduction`, `comboPayoffMultiplier`, `elementDurationBonus`, `comboDamageMultiplier`, `poisonCloudCooldownReduction` (all handled by stat pipeline — base defaults apply when no upgrades modify them)

All backward-compatible — old saves work without errors because the stat pipeline derives values from base stats + acquired upgrade IDs.

**Run:** `bun test`

**Commit:** `fix: handle save migration for class mechanics fields`

---

### Task 4.4: Add Changelog Entry

**Files:**
- Modify: `src/lib/changelog.ts`

```typescript
{
	version: '0.31.0',
	date: '2026-01-31',
	changes: [
		{ category: 'new', description: 'Added Warrior weapon roulette with combo payoffs for each weapon type' },
		{ category: 'new', description: 'Added Mage elemental combo system with mana resource and 3 element types' },
		{ category: 'new', description: 'Added Rogue Poison Cloud ability with carry-over stacks between enemies' },
		{ category: 'new', description: 'Added keyboard shortcuts (Q/W/E) for class abilities on desktop' },
		{ category: 'new', description: 'Added new class-specific upgrade cards to discover' }
	]
}
```

**Commit:** `docs: add changelog entry for class mechanics`

---

## Implementation Order

```
Phase 1: Warrior
├─ Task 1.1  Warrior engine (pure logic + tests)
├─ Task 1.2  Warrior state integration (no separate cooldown — uses attack speed)
├─ Task 1.3  Warrior battle UI
└─ Task 1.4  Warrior upgrade cards (with onAcquire for weapon unlocks)

Phase 2: Mage
├─ Task 2.1  Mage engine (pure logic + tests)
├─ Task 2.2  Mage stats (magic, mana)
├─ Task 2.3  Mage state integration (timer registry + stat pipeline transients)
├─ Task 2.4  Mage battle UI
└─ Task 2.5  Mage upgrade cards

Phase 3: Rogue
├─ Task 3.1  Rogue engine (pure logic + tests)
├─ Task 3.2  Rogue state integration (timer registry for cloud)
├─ Task 3.3  Rogue battle UI
└─ Task 3.4  Rogue upgrade cards (with onAcquire for cloud unlock)

Phase 4: Cross-Class Polish
├─ Task 4.1  Keyboard shortcuts (Mage Q/W/E, Rogue Q — space already handled by Plan 0)
├─ Task 4.2  Responsive ability UI layout
├─ Task 4.3  Save migration
└─ Task 4.4  Changelog
```

**Note:** Phases 1-3 are independent of each other and can be implemented in any order (or parallelised). Phase 4 depends on all three being complete.

**Total tasks: 17**
