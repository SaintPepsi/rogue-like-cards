# Enemy Types & Class System Design

## Overview

Add enemy variety with unique mechanics and a class system that gives each run a distinct playstyle. Players choose a class at the start of each run, which determines their card pool. Enemies unlock progressively per stage, each with resistances, weaknesses, and a unique mechanic.

## Classes

### Progression: Adventurer to First Job

Every run starts as **Adventurer** - a classless baseline with access to generic cards only. At **Level 30**, the game pauses and the **First Job** selection screen is presented.

- Teaches base mechanics (tapping, cards, enemies) before adding class complexity
- Makes the choice more informed - the player has seen their card options and enemy types
- Creates a memorable moment each run ("What do I go this time?")
- Mirrors classic RPG job advancement systems

After choosing a class, the player's card pool shifts to include class-specific cards alongside generic ones. Cards already collected remain.

### First Job Selection Screen

The Level 30 class selection is a cinematic moment - the most important decision in the run.

**Screen flow:**

1. Game pauses. Screen dims. A title fades in: "Choose Your Path" (or similar)
2. Three class cards animate in one at a time with a heavy, weighted "UMPF" landing effect (slight screen shake, glow pulse on impact). Staggered timing - each card lands ~0.5s after the previous
3. Cards use the same glowing border treatment as chest loot cards but enhanced (brighter, more particle-like)
4. Each card shows face-up: class name, class icon/art, and rarity-style glow (all 3 use a special "class" tier visual, distinct from normal rarity colors)

**Class card design:**

Class cards are larger than normal upgrade cards with a unique class-specific border color. Instead of a single static image, each card features a **rotating icon carousel** of 3 signature icons that slowly cycle:

- **Warrior** (red border): sword.png → axe.png → hammer.png
- **Mage** (blue border): fire.png → ❄️ (frost emoji, needs art) → ✨ (arcane emoji, needs art)
- **Rogue** (green border): poison.png → 🗡️ (speed/dagger emoji, needs art) → ⚰️ (coffin/execute emoji, needs art)

The rarity gem is replaced with a class icon in the bottom-right corner. See `docs/plans/2026-01-30-art-request.md` for a list of pixel art assets needed.

**Card interaction:**

- **Tap a class card** → card rotates/flips to reveal the back side showing:
  - Starting stats and bonuses (e.g. "Highest base damage, +Boss Timer")
  - Brief description of the playstyle (e.g. "Slow, heavy strikes. Each tap draws a random weapon. Build combos for devastating payoffs.")
  - Economy perk (e.g. "Longer boss timer")
- **Tap again** → card flips back to front
- Player can tap between all 3 cards to compare before deciding
- **"Pick {Class}!" button** appears beneath a card when it is flipped to its info side. Only one button visible at a time (whichever card is currently showing info)
- Pressing the button confirms the selection with a final animation (selected card grows/glows, other two fade out)

Each class has access to weighted card pools during upgrade selection. Shared/generic cards (gold, defense, basic utility) appear in all class pools.

### Warrior - Weapon Roulette

- **Starting bonus**: Highest base damage of all classes, longer boss timer
- **Starting weapon**: Knife (basic, no combo effect)
- **Resource**: None
- **Identity**: Slow, heavy hitter. Each tap has a ~1s cooldown with a **swing animation** showing the drawn weapon. Fewer taps than other classes, but each one hits hard. The roulette and combos add depth on top of raw power.
- **Core mechanic**: Each tap draws a random weapon from the player's unlocked pool. A swing animation plays showing the weapon, then the hit lands. Drawing the same weapon consecutively builds a **combo counter** (visible on screen). When a different weapon is drawn, the combo **auto-fires** a powerful effect based on the weapon that was active:
  - **Sword** combo = **Super Bleed** (massive bleed burst scaled by combo count)
  - **Axe** combo = **Mega Crit** (guaranteed crit with multiplier scaled by combo count)
  - **Hammer** combo = **Shockwave Stun** (long stun duration scaled by combo count)
- **Card pool**: Weapon unlock cards (one-time, adds weapon to roulette pool) + generic Warrior boost cards (e.g. "Weapon Oil" = +all weapon damage, "Battle Rhythm" = +combo effects, "Heavy Swing" = +base tap damage). No per-weapon upgrade tiers - boosts apply broadly.
- **Strategy**: Fewer weapon types in pool = higher combo streaks (more consistent same-weapon draws) with bigger payoffs. More weapon types = more frequent swaps triggering combos, but lower individual combo counts. Players must decide: specialize in 1-2 weapons for big combos, or diversify for frequent smaller payoffs.
- **UI**: Swing animation showing drawn weapon on each tap (~1s). Current weapon icon + combo counter displayed near the enemy.

### Mage - Elemental Combos

- **Starting bonus**: +1 Magic (new stat), bonus base XP multiplier
- **Starting damage**: Slightly higher than Rogue, much lower than Warrior
- **Resource**: **Mana** (regenerated by tapping the enemy; spent on element spell casts)
- **Identity**: Tap-to-build-mana rhythm. Early game is mostly tapping with occasional spell casts (spells are expensive initially). As cards reduce mana costs and boost regen, the Mage transitions into a spell-slinging machine. Strong progression curve.
- **Core mechanic**: 3 element buttons (Frost / Fire / Arcane). Each button casts that element's spell on the enemy, costing mana. Tapping the enemy deals base magic damage AND regenerates mana. If two different elements are active on the enemy simultaneously, a **combo effect triggers automatically** - no queuing needed.
  - **Frost** = enemy takes more damage (debuff)
  - **Fire** = burn DoT
  - **Arcane** = increased vulnerability (debuff)
  - **Frost + Arcane** (both active) = large burst damage
  - **Fire + Arcane** (both active) = empowered burn (really strong burn DoT)
  - **Frost + Fire** (both active) = shatter (reduce enemy defenses / increase damage it takes)
- **Mana economy**: Spells are expensive early (~10+ taps to afford one cast). Cards reduce mana costs and boost mana-per-tap, shifting the Mage from tap-heavy to cast-heavy over a run.
- **Card pool**: Element-specific boost cards, mana cost reduction, mana-per-tap increase, element duration extension, combo enhancement cards
- **Strategy**: Manage mana by tapping to recharge, then spend on the right element for the current enemy's weakness. Keeping two elements active simultaneously triggers powerful combos. Build around preferred elements or stay flexible.
- **UI**: 3 element buttons below or beside the enemy. Mana bar visible. Active element indicators on the enemy (icons showing which elements are currently applied).

### Rogue - Poison Assassin

- **Starting bonus**: +1 Crit Chance (new stat), higher base gold drop chance, lower base damage
- **Resource**: None (cooldown-gated ability)
- **Identity**: Low damage per tap, high volume attacker. Relies on poison stacks and crits to kill. Compensated with better gold generation for stronger shop purchases.
- **Core mechanic**: Every tap adds 1 poison stack to the enemy (up to max stacks). Poison ticks automatically at 1 damage/sec per active stack. Stacks expire after their duration runs out.
  - **Base values**: 1 max stack, 1 damage/tick, short duration
  - **Poison stacks cards** → increase max stacks (more taps = more simultaneous ticks)
  - **Poison duration cards** → stacks last longer, more total damage per application
  - **Poison damage cards** → each tick hits harder
- **Poison Cloud button** (unlocked via upgrade card):
  - Deploys a cloud that adds poison stacks independently (no tapping required)
  - **Carries over poison stacks from the previous enemy** - key differentiator
  - Has a cooldown between uses
  - Strategy: Use Cloud to front-load poison on a new enemy, then tap to stack more on top
- **Crit / Finisher**: Crits deal bonus damage scaled by active poison stacks on the target. Execute-style finisher cards for low-HP poisoned enemies.
- **Card pool**: Poison application, poison duration, poison damage, poison stacks, crit chance, crit multiplier, finisher effects, Poison Cloud unlock and enhancement cards
- **Strategy**: Stack poison to weaken, use Cloud for carryover between enemies, then land devastating crits for the kill. The tension is managing poison uptime and timing Cloud cooldowns.
- **UI**: Poison Cloud button (once unlocked) + cooldown indicator. Poison stack counter on enemy. Crit chance visible in stats.

### Class Summary

| Class                    | UI Elements                                     | Combat Identity                  | Economy Perk          |
| ------------------------ | ----------------------------------------------- | -------------------------------- | --------------------- |
| Adventurer (Levels 1-29) | Tap enemy only                                  | Basic damage                     | None                  |
| Warrior                  | Tap enemy + weapon roulette display (passive)   | Slow heavy hitter, weapon combos | Longer boss timer     |
| Mage                     | Tap enemy + 3 element buttons + mana bar        | Spell caster, element combos     | Bonus XP multiplier   |
| Rogue                    | Tap enemy + Poison Cloud button (once unlocked) | Fast poison stacker, crits       | Higher base gold drop |

## Gameplay Notes

### Pre-Class Enemy Spawns

Enemies spawn from stage 1, before the Level 30 class pick. As Adventurer, enemy resistances and weaknesses exist but are largely irrelevant since the player has no bleed, poison, stun, or elemental damage. This teaches enemy variety early and makes the class choice feel impactful when it arrives ("now I can actually exploit weaknesses").

### Enemy Mechanics Apply Equally to All Classes

All enemy mechanics use the same thresholds and rules regardless of class. No per-class adjustments. For example, Blinking Eyes' 2s idle stat drain applies equally to the Warrior (who has a ~1s swing cooldown) and the Rogue (who taps freely). This is intentional - some enemies are harder for certain classes.

### Class Ability UI (Desktop vs Mobile)

- **Desktop**: Class ability buttons (Mage elements, Rogue Poison Cloud) appear in a fixed action bar at the bottom of the screen (MOBA-style). Keyboard shortcuts: Q, W, E, R.
- **Mobile**: Class ability buttons appear directly below the enemy sprite for easy thumb access.
- **Warrior**: No ability buttons. Weapon roulette display and combo counter are passive UI elements near the enemy.

## Card Classification

### Existing Cards Reclassified

#### Generic (available to all classes, including Adventurer) - 26 cards

- **Damage** (4): Sharpen Blade, Heavy Strike, Devastating Blow, Titan Strength
- **XP** (2): Quick Learner, Wisdom
- **Boss Timer** (2): Borrowed Time, Time Warp
- **Gold/Economy** (8): All gold drop, chest, boss chest cards
- **Lucky** (2): Lucky Charm, Fortune's Favor
- **Damage Multiplier** (2): Power Surge, Overwhelming Force
- **Greed** (2): Greed, Avarice
- **Overkill** (1): Overkill
- **Multi-Strike** (3): Double Tap, Flurry, Blade Storm
- **Legendary** (1): Time Lord

#### Rogue-specific (reclassified from existing) - 21 cards

- **Poison Damage** (3): Toxic Coating, Venomous Strike, Plague Bearer
- **Poison Duration** (3): Lingering Toxin, Slow Rot, Eternal Blight
- **Poison Stacks** (3): Compound Toxin, Venom Cascade, Pandemic
- **Poison Crit** (3): Virulent Toxin, Deadly Venom, Necrotic Touch
- **Crit Chance** (3): Keen Eye, Assassin's Focus, Death Mark
- **Crit Damage** (2): Brutal Force, Executioner
- **Execute** (3): Mercy Kill, Culling Blade, Death Sentence
- **Legendary** (2): Death Incarnate, Toxic Apocalypse

#### Warrior-specific (reclassified from existing) - 2 cards

- **Combo** (1): Berserker
- **Legendary** (1): Dragon's Fury

#### Mage-specific (from existing) - 0 cards

- None naturally fit; all Mage cards need to be new

### New Cards Needed

New class-specific cards are required for mechanics that do not exist yet. These will be designed during implementation:

- **Warrior**: Sword cards (bleed boost), Axe cards (crit/cleave boost), Hammer cards (stun boost), weapon pool management cards
- **Mage**: Frost cards, Fire cards, Arcane cards, mana cost reduction, combo enhancement, element boost cards
- **Rogue**: Poison Cloud unlock card, Poison Cloud cooldown reduction, Poison Cloud stack enhancement, additional finisher cards

### Card Display

Class-specific cards display a class label beneath the card title (e.g. "Warrior", "Rogue", "Mage"). Only cards matching the player's current class (or Generic) appear in upgrade offerings.

## Enemies

5 enemy types for the first pass. Each has a unique mechanic, a resistance (reduced/zero effectiveness), and a weakness (bonus effectiveness). Enemies unlock progressively as stages advance.

### Unlock Schedule

| Stage Introduced | Enemy Types Available |
| ---------------- | --------------------- |
| Stage 1          | Skeleton, Goblin      |
| Stage 2          | + Red Mushroom        |
| Stage 3          | + Blue Mushroom       |
| Stage 4          | + Blinking Eyes       |

### Enemy Definitions

#### 1. Skeleton

- **Sprite**: `skeleton_idle_strip6.png` (existing enemy.png)
- **Resistance**: Bleed immune (no blood - bleed does nothing)
- **Weakness**: Hammer/Stun (brittle bones - stun lasts 2x longer)
- **Mechanic - Reassemble**: When killed, has a chance to revive at 25% HP once. Overkill damage prevents revival.
- **Introduced**: Stage 1

#### 2. Goblin

- **Sprite**: `spr_idle_strip9.png` (from Characters/Goblin/PNG/)
- **Resistance**: Stun (halved duration - too hyperactive)
- **Weakness**: Poison (small body, low tolerance)
- **Mechanic - Nimble**: Every few seconds, the Goblin dodges, nullifying the next tap. A visual tell (hop animation) warns the player. Consistent fast tapping reduces dodge frequency.
- **Introduced**: Stage 1

#### 3. Red Mushroom

- **Sprite**: `spr_deco_mushroom_red_01_strip4.png` (from Elements/Plants/)
- **Resistance**: Poison immune (fungal biology - poison does zero)
- **Weakness**: Fire (burns easily - Fire DoT deals 2x)
- **Mechanic - Spore Cloud**: Periodically releases spores that reduce player Attack by 1 for a short duration. Killing it quickly minimizes exposure.
- **Introduced**: Stage 2

#### 4. Blue Mushroom

- **Sprite**: `spr_deco_mushroom_blue_01_strip4.png` (from Elements/Plants/)
- **Resistance**: Frost immune (frost effects do nothing)
- **Weakness**: Bleed/physical (fragile cap - Sword bleed deals 2x)
- **Mechanic - Frost Aura**: Passively slows all player active DoT tick rates (bleed, poison, burn tick slower) while this enemy is alive.
- **Introduced**: Stage 3

#### 5. Blinking Eyes

- **Sprite**: `spr_deco_blinking_strip12.png` (from Elements/Animals/)
- **Resistance**: Execute immune (cannot be executed - must be killed through full HP)
- **Weakness**: Arcane (magic pierces the darkness)
- **Mechanic - Creeping Darkness**: If the player stops tapping for more than 2 seconds, a random stat is temporarily reduced by 1. Stacks up to 3 times. Stats recover after the enemy dies. Rewards consistent aggression.
- **Introduced**: Stage 4

### Enemy Summary Table

| #   | Enemy         | Immune/Resist  | Weak To             | Mechanic                               | Stage |
| --- | ------------- | -------------- | ------------------- | -------------------------------------- | ----- |
| 1   | Skeleton      | Bleed immune   | Hammer/Stun (2x)    | Reassemble (revive once at 25%)        | 1     |
| 2   | Goblin        | Stun (halved)  | Poison              | Nimble (dodge taps)                    | 1     |
| 3   | Red Mushroom  | Poison immune  | Fire (2x DoT)       | Spore Cloud (reduce Attack)            | 2     |
| 4   | Blue Mushroom | Frost immune   | Bleed/physical (2x) | Frost Aura (slows DoTs)                | 3     |
| 5   | Blinking Eyes | Execute immune | Arcane              | Creeping Darkness (stat drain if idle) | 4     |

### Spawn Rules

- Random enemy type drawn from the unlocked pool each wave
- Boss waves can be any unlocked enemy type (with boss HP scaling + boss visual treatment)
- Chest spawns remain unchanged

## New Stats Introduced

- **Magic**: Base magic damage for Mage class
- **Mana**: Resource for Mage element casting
- **Crit Chance**: Probability of critical hit (Rogue starting bonus)
- **Crit Multiplier**: Damage multiplier on critical hits

## Notes on Bleed vs Poison

Bleed (Warrior) and Poison (Rogue) are separate DoT mechanics:

- **Bleed**: Burst-applied via Warrior's Sword combo payoff. Large damage applied at once that ticks down.
- **Poison**: Steadily stacked per Rogue tap. Scales with number of stacks. Also serves as a crit damage multiplier for Rogue.

Different sources, different scaling, different class identities.

## Future Expansion (out of scope for v1)

- Enemies 6-10: Bandit (parry), Chicken (gold steal), Cow (flat damage reduction), Sheep (pauses DoTs), Pig (obscures UI)
- Additional classes
- Enemy-specific boss variants with enhanced mechanics
