# Frenzy Build Archetype

## Overview

Expand frenzy from a 2-card side mechanic into a viable build archetype centered on the "tap fast, attack fast" fantasy. All frenzy cards amplify attack speed through different scaling axes. No cross-system interactions (crit, poison, etc.) — pure speed.

## New Stat

**`tapFrenzyStackMultiplier`** (base: 1)

- Multiplier on frenzy stacks added per tap: `stacks = 1 * tapFrenzyStackMultiplier`
- Floored to integer after multiplication
- Exclusive to legendary tier
- Each generated stack gets its own independent decay timer
- Wired into `frenzy.svelte.ts` `addStack()` — reads from pipeline, loops to add N stacks

### Stat Registry Entry

Add to `stats.ts`:

- Key: `tapFrenzyStackMultiplier`
- Label: "Frenzy Stacks"
- Format: "Nx" multiplier display
- Only shown when > 1

## Card Definitions

### Existing (unchanged)

| ID        | Title          | Rarity   | Modifiers                                  |
| --------- | -------------- | -------- | ------------------------------------------ |
| `frenzy1` | Battle Rage    | uncommon | `tapFrenzyBonus +0.05`                     |
| `frenzy2` | Berserker Fury | rare     | `tapFrenzyBonus +0.05`, `attackSpeed +0.2` |

### New — Duration axis

| ID           | Title           | Rarity   | Modifiers                                      | Fantasy                                                           |
| ------------ | --------------- | -------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| `frenzydur1` | Adrenaline Rush | uncommon | `tapFrenzyDuration +1`                         | Stacks linger a bit longer                                        |
| `frenzydur2` | Sustained Fury  | rare     | `tapFrenzyDuration +2`                         | Much easier to maintain high stacks                               |
| `frenzydur3` | Relentless Rage | epic     | `tapFrenzyDuration +3`, `tapFrenzyBonus +0.03` | Epic capstone — long-lasting stacks with a bonus-per-stack kicker |

### New — Bonus axis

| ID        | Title     | Rarity | Modifiers                                  | Fantasy                          |
| --------- | --------- | ------ | ------------------------------------------ | -------------------------------- |
| `frenzy3` | Bloodlust | epic   | `tapFrenzyBonus +0.08`, `attackSpeed +0.3` | Epic capstone — raw frenzy power |

### New — Legendary capstone

| ID                 | Title         | Rarity    | Modifiers                     | Fantasy                 |
| ------------------ | ------------- | --------- | ----------------------------- | ----------------------- |
| `frenzylegendary1` | GOTTA GO FAST | legendary | `tapFrenzyStackMultiplier +2` | Each tap adds 3x stacks |

### Full build summary

7 total frenzy cards (2 existing + 5 new). Rarity spread: 2 uncommon, 2 rare, 2 epic, 1 legendary.

## Implementation Changes

1. **`stats.ts`** — Add `tapFrenzyStackMultiplier` to `PlayerStats` (default: 1), add stat registry entry
2. **`frenzy.svelte.ts`** — `addStack()` reads `tapFrenzyStackMultiplier` from pipeline, adds that many stacks (each with own timer)
3. **`upgrades.ts`** — Add 5 new upgrade definitions with card images
4. **`statPipeline.svelte.ts`** — No changes needed (standard modifier flow handles the new stat)
5. **No filtering needed** — Frenzy cards are always available in the upgrade pool

## Design Decisions

- **Pure attack speed focus:** Frenzy does not interact with crit, poison, or other systems. Keeps the fantasy clean and distinct from other build archetypes.
- **Uncommon floor:** No common-tier frenzy cards. Matches the "advanced active mechanic" feel while keeping entry accessible.
- **Stack multiplier is legendary-only:** Prevents multiplicative scaling from appearing too early. "GOTTA GO FAST" is a build-defining capstone.
- **Always available in pool:** Unlike poison cards (gated behind base poison > 0), frenzy cards need no prerequisite since every player has access to frenzy by tapping.
- **Two scaling axes:** Duration (sustain) and bonus-per-stack (burst) give meaningful choices within the archetype. Duration lets casual tappers maintain stacks; bonus rewards frantic tapping.
