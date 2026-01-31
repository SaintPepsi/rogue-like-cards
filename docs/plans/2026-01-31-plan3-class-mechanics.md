# Plan 3: Class Mechanics

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the three class ability systems (Warrior weapon roulette, Mage elements + mana, Rogue poison cloud), their battle UI, new class-specific upgrade cards, and keyboard shortcuts. Each class gets a distinct combat identity on top of the shared foundation.

**Design doc:** `docs/plans/2026-01-30-enemy-types-and-class-system-design.md` (Warrior, Mage, Rogue sections, Card Classification > New Cards Needed, Class Ability UI)

**Architecture:** Each class mechanic is built as an independent vertical slice: pure engine logic (testable) → game state integration → battle UI component → new cards. The three classes can be implemented in any order.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript, Vitest, Tailwind CSS.

**Dependencies:** Requires Plan 2 (Class Foundation) — specifically the class data model, `currentClass` state, class-filtered card pools, and the `ClassId` type. Benefits from Plan 1 (Enemy System) for resistance interactions but not strictly required.

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

export const WARRIOR_SWING_COOLDOWN_MS = 1000;
```

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
let warriorCooldown = $state(false);
```

**Step 2:** Create warrior attack override. When `currentClass === 'warrior'`, the `attack()` function:

1. Check cooldown — if `warriorCooldown` is true, return early (1s between taps)
2. Set cooldown, schedule `warriorCooldown = false` after `WARRIOR_SWING_COOLDOWN_MS`
3. Draw a random weapon from `warriorWeapons` via `drawWeapon()`
4. If same as `comboWeapon` → increment `comboCount`
5. If different and `comboWeapon !== null` → fire `calculateComboPayoff()` for the old weapon, apply that damage to enemy, reset combo
6. Set `comboWeapon` to drawn weapon, `currentWeapon` to drawn weapon
7. Deal normal tap damage (base damage + crit check, using existing `calculateAttack`)
8. Play swing animation (weapon-specific)

**Step 3:** Add method to unlock new weapons (called by weapon unlock upgrade cards):

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
get warriorCooldown() { return warriorCooldown; },
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

Passive display near the enemy (no action buttons — Warrior's roulette is automatic on tap):

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
	{#if warriorCooldown}
		<div class="cooldown-indicator">...</div>
	{/if}
</div>
```

Weapon sprite mapping: use existing card art (`sword.png`, `axe.png`, `hammer.png`). Knife can use `sword.png` scaled down or a placeholder.

**Props:**

```typescript
type Props = {
	currentWeapon: WeaponId | null;
	comboCount: number;
	warriorCooldown: boolean;
};
```

**BattleArea integration:** Conditionally render `<WarriorUI>` when `currentClass === 'warrior'`:

```svelte
{#if currentClass === 'warrior'}
	<WarriorUI {currentWeapon} {comboCount} {warriorCooldown} />
{/if}
```

**Swing animation:** On each warrior tap, briefly show the drawn weapon sprite swinging across the enemy (CSS animation, ~0.3s). Use the temporary UI effect pattern — add swing events to an array in the store, auto-remove after animation duration.

**Commit:** `feat: add Warrior battle UI with weapon display, combo counter, and swing animation`

---

### Task 1.4: Warrior Upgrade Cards

**Files:**
- Modify: `src/lib/data/upgrades.ts`
- Modify: `src/lib/data/upgrades.test.ts`

**New warrior-specific cards (all with `classRestriction: 'warrior'`):**

**Weapon Unlock Cards (one-time, adds weapon to roulette pool):**
- `warrior_sword`: "Forge: Sword" (uncommon) — Unlocks Sword in weapon roulette
- `warrior_axe`: "Forge: Axe" (rare) — Unlocks Axe
- `warrior_hammer`: "Forge: Hammer" (epic) — Unlocks Hammer

These use a special `apply` that calls `gameState.unlockWeapon()`. Implementation note: the `apply` function currently only receives `PlayerStats`. Options:
1. Add an `onAcquire` callback to the Upgrade type for side effects (preferred)
2. Or have the weapon unlock set a flag in PlayerStats that gameState reads

**Boost Cards:**
- `warrior_oil1`: "Weapon Oil" (common) — +2 all weapon damage
- `warrior_oil2`: "Master Oil" (uncommon) — +5 all weapon damage
- `warrior_rhythm1`: "Battle Rhythm" (uncommon) — +25% combo payoff damage
- `warrior_rhythm2`: "War Dance" (rare) — +50% combo payoff damage
- `warrior_heavy1`: "Heavy Swing" (common) — +3 base tap damage
- `warrior_heavy2`: "Mighty Blow" (rare) — +8 base tap damage
- `warrior_legendary`: "Berserker Lord" (legendary) — +15 damage, +50% combo payoff, unlock random weapon

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
magic: number;       // Base magic damage for Mage
maxMana: number;     // Maximum mana pool
manaPerTap: number;  // Mana regenerated per enemy tap
manaCostReduction: number; // Flat reduction to element cast costs
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

**Step 4:** Handle save migration — new fields merge safely via `{ ...createDefaultStats(), ...data.playerStats }`.

**Run:** `bun test`

**Commit:** `feat: add Magic, Mana, and Mana/Tap stats for Mage class`

---

### Task 2.3: Mage State Integration

**Files:**
- Modify: `src/lib/stores/gameState.svelte.ts`

**Step 1:** Add mage state:

```typescript
let mana = $state(0);
let activeElements = $state<Map<ElementId, ReturnType<typeof setTimeout>>>(new Map());
```

**Step 2:** Mage tap behavior (when `currentClass === 'mage'`):
- Regenerate mana: `mana = Math.min(playerStats.maxMana, mana + getManaPerTap(playerStats.manaPerTap, 0))`
- Deal base magic damage to enemy (use `playerStats.magic` instead of `playerStats.damage`, or additive)

**Step 3:** Add `castElement(element: ElementId)`:

```typescript
function castElement(element: ElementId) {
	if (currentClass !== 'mage') return;
	const cost = getManaCost(element, playerStats.manaCostReduction);
	if (mana < cost) return;

	mana -= cost;

	// Clear existing timer for this element if active
	const existingTimer = activeElements.get(element);
	if (existingTimer) clearTimeout(existingTimer);

	// Apply element effect to enemy
	applyElementEffect(element);

	// Set expiration timer
	const timer = setTimeout(() => {
		activeElements.delete(element);
		activeElements = new Map(activeElements);
		removeElementEffect(element);
	}, ELEMENT_DURATION_MS);

	activeElements.set(element, timer);
	activeElements = new Map(activeElements);

	// Check for combo
	const combo = checkElementCombo(new Set(activeElements.keys()));
	if (combo) {
		triggerElementCombo(combo);
	}
}
```

**Step 4:** Implement element effects:
- `applyElementEffect('frost')`: set a flag that increases damage taken by enemy (+50%)
- `applyElementEffect('fire')`: start a burn DoT interval
- `applyElementEffect('arcane')`: set a vulnerability flag (+25% damage taken)

**Step 5:** Implement combo triggers:
- `frost_arcane`: instant burst damage (e.g., `magic * 10`)
- `fire_arcane`: enhanced burn (e.g., burn damage * 3 for remaining duration)
- `frost_fire`: defense shatter (e.g., enemy takes +100% damage for 5s)

**Step 6:** Clear all element state on enemy death. Apply Mage starting bonus in `applyClassBonuses`: `playerStats.magic += 1`.

**Step 7:** Expose getters:

```typescript
get mana() { return mana; },
get activeElements() { return new Set(activeElements.keys()); },
castElement,
```

**Step 8:** Persist mana in save data.

**Run:** `bun test`

**Commit:** `feat: integrate Mage mana system with element casting and combo detection`

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
		maxMana={playerStats.maxMana}
		{activeElements}
		frostCost={getManaCost('frost', playerStats.manaCostReduction)}
		fireCost={getManaCost('fire', playerStats.manaCostReduction)}
		arcaneCost={getManaCost('arcane', playerStats.manaCostReduction)}
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

**New mage-specific cards (all with `classRestriction: 'mage'`):**

**Mana Cost Reduction (3 tiers):**
- `mage_cost1`: "Efficient Casting" (common) — -2 mana cost
- `mage_cost2`: "Arcane Flow" (uncommon) — -4 mana cost
- `mage_cost3`: "Mana Mastery" (rare) — -6 mana cost

**Mana Per Tap (3 tiers):**
- `mage_regen1`: "Mana Siphon" (common) — +1 mana per tap
- `mage_regen2`: "Arcane Absorption" (uncommon) — +2 mana per tap
- `mage_regen3`: "Soul Drain" (rare) — +3 mana per tap

**Max Mana (2 tiers):**
- `mage_pool1`: "Mana Well" (common) — +20 max mana
- `mage_pool2`: "Arcane Reservoir" (uncommon) — +40 max mana

**Magic Damage (3 tiers):**
- `mage_magic1`: "Arcane Studies" (common) — +1 magic damage
- `mage_magic2`: "Mystic Power" (uncommon) — +3 magic damage
- `mage_magic3`: "Eldritch Might" (rare) — +5 magic damage

**Element Duration (2 tiers):**
- `mage_duration1`: "Lingering Magic" (uncommon) — +2s element duration
- `mage_duration2`: "Eternal Enchant" (rare) — +4s element duration

**Combo Enhancement (2 tiers):**
- `mage_combo1`: "Elemental Synergy" (rare) — +50% combo damage
- `mage_combo2`: "Harmonic Resonance" (epic) — +100% combo damage

**Legendary:**
- `mage_legendary`: "Archmage" (legendary) — +5 magic, +30 max mana, +3 mana/tap, -5 mana cost

**Total new mage cards: ~17**

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
let poisonCloudCooldownReduction = $state(0);
let carryOverPoisonStacks = $state(0);
```

**Step 2:** Add `deployPoisonCloud()`:

```typescript
function deployPoisonCloud() {
	if (!poisonCloudUnlocked || poisonCloudOnCooldown || poisonCloudActive) return;

	poisonCloudActive = true;
	poisonCloudOnCooldown = true;

	// Apply carried-over stacks from previous enemy
	// Then tick additional stacks every second for duration

	let ticksRemaining = POISON_CLOUD_DURATION_MS / POISON_CLOUD_TICK_INTERVAL_MS;
	const cloudInterval = setInterval(() => {
		if (ticksRemaining <= 0) {
			clearInterval(cloudInterval);
			poisonCloudActive = false;
			return;
		}
		// Add poison stack to enemy
		applyPoisonStack();
		ticksRemaining--;
	}, POISON_CLOUD_TICK_INTERVAL_MS);

	// Cooldown timer
	const effectiveCooldown = getEffectiveCooldown(
		POISON_CLOUD_BASE_COOLDOWN_MS,
		poisonCloudCooldownReduction
	);
	setTimeout(() => {
		poisonCloudOnCooldown = false;
	}, effectiveCooldown);
}
```

**Step 3:** Poison carry-over. When killing an enemy as Rogue:

```typescript
if (currentClass === 'rogue') {
	carryOverPoisonStacks = poisonStacks.length;
}
```

When spawning the next enemy, if rogue and `carryOverPoisonStacks > 0`, pre-apply that many stacks.

**Step 4:** Method to unlock poison cloud (called by upgrade card):

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

**Step 6:** Reset rogue state in `resetGame()`. Persist `poisonCloudUnlocked` in save data.

**Run:** `bun test`

**Commit:** `feat: integrate Rogue Poison Cloud into game state with carry-over stacks`

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

**New rogue-specific cards (all with `classRestriction: 'rogue'`):**

Note: Many rogue cards already exist from the reclassification in Plan 2 (poison, crit, execute). These are additional cards for the Poison Cloud ability and Rogue-specific enhancements.

**Poison Cloud Cards:**
- `rogue_cloud_unlock`: "Poison Cloud" (rare) — Unlocks the Poison Cloud ability. One-time.
- `rogue_cloud_cd1`: "Quick Deploy" (uncommon) — -2s Poison Cloud cooldown
- `rogue_cloud_cd2`: "Rapid Deployment" (rare) — -3s Poison Cloud cooldown
- `rogue_cloud_stacks1`: "Dense Cloud" (uncommon) — +1 stack per cloud tick
- `rogue_cloud_stacks2`: "Toxic Fog" (rare) — +2 stacks per cloud tick
- `rogue_cloud_dur1`: "Lingering Cloud" (uncommon) — +3s cloud duration

**Additional Finisher Cards:**
- `rogue_finisher1`: "Backstab" (rare) — +3% execute chance when enemy has 5+ poison stacks
- `rogue_finisher2`: "Assassinate" (epic) — +5% execute chance when enemy has 10+ poison stacks

**Legendary:**
- `rogue_legendary`: "Shadow Master" (legendary) — Unlock Poison Cloud + -5s cooldown + +3 stacks per tick

**Total new rogue cards: ~9**

**Tests:** Verify all new cards have `classRestriction: 'rogue'` and expected count.

**Run:** `bun test src/lib/data/upgrades.test.ts`

**Commit:** `feat: add Rogue-specific upgrade cards (Poison Cloud unlock, finishers)`

---

## Phase 4: Cross-Class Polish

### Task 4.1: Keyboard Shortcuts for Class Abilities

**Files:**
- Modify: `src/routes/+page.svelte`

**Step 1:** Add `<svelte:window onkeydown={handleKeydown} />` handler:

```typescript
function handleKeydown(e: KeyboardEvent) {
	// Don't handle keys when modals are open
	if (gameState.activeEvent) return;

	// Space = attack (all classes)
	if (e.key === ' ') {
		e.preventDefault();
		gameState.attack();
		return;
	}

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

**Commit:** `feat: add keyboard shortcuts (Q/W/E/Space) for class abilities`

---

### Task 4.2: Class Ability UI Layout (Desktop vs Mobile)

**Files:**
- Modify: `src/lib/components/BattleArea.svelte`
- Modify: `src/lib/components/MageUI.svelte`
- Modify: `src/lib/components/RogueUI.svelte`

Per the design doc:
- **Desktop:** Class ability buttons in a fixed action bar at the bottom of the screen (MOBA-style). Keyboard shortcuts Q, W, E, R.
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
- New PlayerStats fields: `magic`, `maxMana`, `manaPerTap`, `manaCostReduction` (merged via `{ ...createDefaultStats(), ...data.playerStats }`)

All backward-compatible — old saves work without errors.

**Run:** `bun test`

**Commit:** `fix: handle save migration for class mechanics fields`

---

### Task 4.4: Add Changelog Entry

**Files:**
- Modify: `src/lib/changelog.ts`

```typescript
{
	version: '0.30.0', // Check actual current version
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
├─ Task 1.2  Warrior state integration
├─ Task 1.3  Warrior battle UI
└─ Task 1.4  Warrior upgrade cards

Phase 2: Mage
├─ Task 2.1  Mage engine (pure logic + tests)
├─ Task 2.2  Mage stats (magic, mana)
├─ Task 2.3  Mage state integration
├─ Task 2.4  Mage battle UI
└─ Task 2.5  Mage upgrade cards

Phase 3: Rogue
├─ Task 3.1  Rogue engine (pure logic + tests)
├─ Task 3.2  Rogue state integration
├─ Task 3.3  Rogue battle UI
└─ Task 3.4  Rogue upgrade cards

Phase 4: Cross-Class Polish
├─ Task 4.1  Keyboard shortcuts
├─ Task 4.2  Responsive ability UI layout
├─ Task 4.3  Save migration
└─ Task 4.4  Changelog
```

**Note:** Phases 1-3 are independent of each other and can be implemented in any order (or parallelized). Phase 4 depends on all three being complete.

**Total tasks: 17**
**Total commits: ~17**
