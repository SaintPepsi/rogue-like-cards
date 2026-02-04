#!/usr/bin/env bash
# Create GitHub issues for each active plan document.
# Run with: bash scripts/create-plan-issues.sh
#
# Prerequisites: gh CLI authenticated (gh auth login)

set -euo pipefail

REPO="SaintPepsi/rogue-like-cards"

echo "Creating issues for all active plans in $REPO..."
echo ""

# --------------------------------------------------------------------------
# 1. System Architecture: Pipelines, Transforms, and Reactors
# --------------------------------------------------------------------------
gh issue create --repo "$REPO" \
  --title "System Architecture: Pipelines, Transforms, and Reactors" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary

Refactor the game engine to use a pipeline-based architecture with transforms and reactors. This is the foundational system (Plan 0) that Plans 1-3 depend on.

## Key Changes

- **Pipeline contract**: Minimal `PipelineHit` interface (`{ type: string }`) — the pipeline never imports concrete hit types
- **Accept/decline pattern**: Systems decide at call time whether to handle a hit (return result or `null`), no registration arrays
- **Priority-ordered transforms**: Dodge (0) → Block (10) → Crit (20) → Armor (30) → Resistance (40)
- **Unordered reactors**: Respond to events after transforms, produce side-state (poison stacks, gold, XP)
- **Layered Stat Pipeline**: Stats computed through step functions (monad pattern), never mutated directly
- **Timer Registry**: Centralized timer management for all gameplay timing
- **Cross-system effects**: Systems communicate through pipeline effects, never direct imports

## Attack Pipeline Flow

1. `beforeAttack` transforms (execute short-circuit)
2. `generateHits(stats)` → hit array
3. Per hit: transforms by priority
4. Per hit: apply damage
5. Per hit: offer to reactors
6. `afterAllHits` (overkill carry)
7. `checkKill` → kill pipeline

## Design Documents

- `docs/plans/2026-01-31-system-architecture.md`
- `docs/plans/2026-01-31-plan-alignment-and-gaps.md` (catalogues conflicts between Plans 0-3, specifies Layered Stat Pipeline and Timer Registry)
EOF
)"
echo "✓ Created: System Architecture"

# --------------------------------------------------------------------------
# 2. Enemy Types System (Plan 1)
# --------------------------------------------------------------------------
gh issue create --repo "$REPO" \
  --title "Enemy Types System: 5 enemies with unique mechanics and resistances" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary

Add 5 enemy types with unique sprites, resistances/weaknesses, stage-based unlock schedule, and per-enemy mechanics. Fully independent and shippable without the class system.

## Enemy Types

| Enemy | Stage | Resistance | Weakness | Mechanic |
|-------|-------|-----------|----------|----------|
| Skeleton | 1 | Bleed immune | Hammer/Stun (2x) | Reassemble: chance to revive at 25% HP once |
| Goblin | 1 | Stun (halved) | Poison | Nimble: periodically dodges taps |
| Red Mushroom | 2 | Poison immune | Fire (2x DoT) | Spore Cloud: reduces player Attack |
| Blue Mushroom | 3 | Frost immune | Bleed/physical (2x) | Frost Aura: slows all DoT tick rates |
| Blinking Eyes | 4 | Execute immune | Arcane | Creeping Darkness: stat drain if idle >2s |

## Implementation Phases

1. **Enemy Data Layer**: Type definitions, sprite loading, `enemies.ts` data file
2. **Spawn Integration**: Type-aware spawning from unlocked pool, stage-based unlocks
3. **Enemy UI**: Name/type display, sprite rendering per enemy type
4. **Enemy Mechanics Engine**: Per-enemy mechanic implementations
5. **Combat Integration**: Resistances/weaknesses applied in damage pipeline

## Dependencies

- Requires System Architecture (Plan 0) for stat pipeline and timer registry

## Design Documents

- `docs/plans/2026-01-30-enemy-types-and-class-system-design.md` (enemy sections)
- `docs/plans/2026-01-31-plan1-enemy-system.md`
- `docs/plans/2026-01-30-enemy-types-and-class-system-implementation.md` (Pillars 1 & 2)
EOF
)"
echo "✓ Created: Enemy Types System"

# --------------------------------------------------------------------------
# 3. Class Foundation (Plan 2)
# --------------------------------------------------------------------------
gh issue create --repo "$REPO" \
  --title "Class Foundation: data model, card reclassification, Level 30 selection UI" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary

Add the class system foundation: Adventurer → First Job at Level 30. Includes class data model, reclassification of all existing cards into class pools, class-filtered upgrade selection, Level 30 selection modal, and persistence.

## Classes

| Class | Combat Identity | Economy Perk |
|-------|----------------|-------------|
| Adventurer (Levels 1-29) | Basic damage, tap only | None |
| Warrior | Slow heavy hitter, weapon combos | Longer boss timer |
| Mage | Spell caster, element combos | Bonus XP multiplier |
| Rogue | Fast poison stacker, crits | Higher base gold drop |

## Card Reclassification

- **Generic** (all classes): 26 cards — damage, XP, boss timer, gold/economy, lucky, multipliers, multi-strike
- **Rogue-specific**: 21 cards — poison, crit, execute
- **Warrior-specific**: 2 cards — combo, Dragon's Fury
- **Mage-specific**: 0 existing cards (all need to be new)

## Implementation Phases

1. Class data model with base stat overrides
2. Card reclassification + class-filtered upgrade pools
3. Class state in game store + persistence
4. Level 30 First Job selection UI (cinematic moment with card animations)

## Dependencies

- Requires System Architecture (Plan 0) for stat pipeline

## Design Documents

- `docs/plans/2026-01-30-enemy-types-and-class-system-design.md` (class sections)
- `docs/plans/2026-01-31-plan2-class-foundation.md`
- `docs/plans/2026-01-30-enemy-types-and-class-system-implementation.md` (Pillar 3)
EOF
)"
echo "✓ Created: Class Foundation"

# --------------------------------------------------------------------------
# 4. Class Mechanics (Plan 3)
# --------------------------------------------------------------------------
gh issue create --repo "$REPO" \
  --title "Class Mechanics: Warrior roulette, Mage elements, Rogue poison cloud" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary

Implement the three class ability systems with their battle UI, new class-specific upgrade cards, and keyboard shortcuts. Each class gets a distinct combat identity.

## Warrior — Weapon Roulette

- Each tap draws a random weapon from unlocked pool (knife, sword, axe, hammer)
- ~1s swing animation per tap, slower but harder hitting
- Consecutive same-weapon draws build a combo counter
- Drawing a different weapon auto-fires combo effect (Super Bleed, Mega Crit, Shockwave Stun)
- Strategy: fewer weapon types = higher combos; more types = more frequent but smaller payoffs

## Mage — Elemental Combos

- 3 element buttons: Frost, Fire, Arcane (cost mana)
- Tapping enemy deals magic damage + regenerates mana
- Two active elements on enemy trigger combo effects automatically
- Frost+Arcane = burst damage, Fire+Arcane = empowered burn, Frost+Fire = shatter
- Progression: tap-heavy early → spell-slinging late as mana costs reduce

## Rogue — Poison Assassin

- Every tap adds 1 poison stack, ticks at 1 dmg/sec per stack
- Poison Cloud button: deploys cloud that stacks independently, carries stacks between enemies
- Crits deal bonus damage scaled by active poison stacks
- Execute-style finishers for low-HP poisoned enemies

## Dependencies

- Requires System Architecture (Plan 0) and Class Foundation (Plan 2)
- Benefits from Enemy Types (Plan 1) for resistance interactions

## Design Documents

- `docs/plans/2026-01-30-enemy-types-and-class-system-design.md` (class ability sections)
- `docs/plans/2026-01-31-plan3-class-mechanics.md`
- `docs/plans/2026-01-30-enemy-types-and-class-system-implementation.md` (Pillar 4)
EOF
)"
echo "✓ Created: Class Mechanics"

# --------------------------------------------------------------------------
# 5. Card Stat Tooltips
# --------------------------------------------------------------------------
gh issue create --repo "$REPO" \
  --title "Card Stat Tooltips: hover/tap descriptions on upgrade card stats" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary

Add hover/tap tooltips to upgrade card stats that display mechanical descriptions from the stat registry. Helps players understand what each stat does directly from the card selection interface.

## Implementation

- **New component**: `CardStatTooltip.svelte` wrapping stat lines with bits-ui `Tooltip`
- **Integration**: Wrap each stat `<li>` in `UpgradeCard.svelte` with `CardStatTooltip`
- **Provider**: Add `Tooltip.Provider` to `CardSelectionModal.svelte`
- **Data source**: Existing `statRegistry` descriptions — no new data needed

## Behavior

- **Desktop**: Hover shows tooltip above stat, hover away hides it
- **Mobile**: Tap shows tooltip, tap outside dismisses
- `stopPropagation` prevents card selection when tapping stats
- Graceful degradation if description is missing

## Design Documents

- `docs/plans/2026-02-04-card-stat-tooltips-design.md`
- `docs/plans/2026-02-04-card-stat-tooltips-implementation.md`
EOF
)"
echo "✓ Created: Card Stat Tooltips"

# --------------------------------------------------------------------------
# 6. Stats Progression Page
# --------------------------------------------------------------------------
gh issue create --repo "$REPO" \
  --title "Stats Progression Page: dev-only balance visualization at /stats" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary

Create a dev-only page at `/stats` for visualizing game balance through stat progression charts. Two modes: Live Run (records actual gameplay data) and Balance Simulator (projects curves from theoretical build plans).

Gated behind `import.meta.env.DEV` — not accessible in production.

## Core Constraint

The stats page and simulator must **never contain their own stat/damage/wave formulas**. All derived values are computed by calling real engine functions (`getWaveConfig`, `xpToNextLevel`, `applyUpgrade`, etc.).

## Chart Groups

1. **Offensive Stats**: Base damage, crit chance/multiplier, attack speed, multi-strike, effective DPS
2. **Poison Stats**: Poison per stack, max stacks, duration, poison DPS
3. **Execute & Multipliers**: Execute chance/cap, damage multiplier, XP multiplier
4. **Economy**: Gold per kill, drop chance, gold multiplier, rarity distribution
5. **Enemy Scaling**: Enemy/Boss HP per stage, XP to next level
6. **Composite Views**: Player DPS vs Enemy HP (dual-axis), time-to-kill, gold income vs shop prices

## Key Components

- `runHistory.svelte.ts` — Snapshot store recording stats at stage transitions and level-ups
- `simulator.ts` — Thin loop driving real engine functions for build projections
- `StatChart.svelte` — Chart.js line chart wrapper
- `LiveRunView.svelte` / `SimulatorView.svelte`

## Design Documents

- `docs/plans/2026-02-01-stats-progression-page-design.md`
EOF
)"
echo "✓ Created: Stats Progression Page"

# --------------------------------------------------------------------------
# 7. Upgrade Collection Statistics
# --------------------------------------------------------------------------
gh issue create --repo "$REPO" \
  --title "Upgrade Collection Statistics: shop purchases, run picks, lifetime picks" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary

Add three statistics counters to each upgrade card in the collection view:

- **Shop Purchases** 🛒 — Times bought from shop (persistent, already tracked)
- **Run Picks** ▶ — Times picked this run from level-ups/chests (session-only)
- **Lifetime Picks** 🏆 — Total times picked across all runs (persistent)

Display as small badge pills on each unlocked card (e.g., "🛒 5 • ▶ 2 • 🏆 23").

## Implementation Phases

1. **Data Layer**: `runPickCounts` Map in gameState, increment on select, merge on game over
2. **Persistent Storage**: `lifetimePickCounts` SvelteMap in shop store, save/load/reset
3. **Persistence Types**: Add `lifetimePickCounts?` optional field to `PersistentSaveData`
4. **UI Component**: Extend `UpgradeCard.svelte` with badge props and pill styling
5. **Component Integration**: Pass stats through `UpgradesModal.svelte` and `+page.svelte`

## Design Documents

- `docs/plans/2026-02-03-upgrade-collection-statistics-implementation.md`
EOF
)"
echo "✓ Created: Upgrade Collection Statistics"

# --------------------------------------------------------------------------
# 8. bits-ui Component Toolkit
# --------------------------------------------------------------------------
gh issue create --repo "$REPO" \
  --title "bits-ui Component Toolkit: 6 wrapper components for project UI primitives" \
  --label "enhancement" \
  --body "$(cat <<'EOF'
## Summary

Establish 6 thin wrapper components around bits-ui primitives in `src/lib/components/ui/`, then migrate all existing hand-rolled UI to use them. Each wrapper bakes in the project's visual defaults (dark theme, border-radius, colors) while exposing props for variations that actually exist.

## Components

1. **Separator** — Horizontal divider with configurable opacity and margin
2. **Tooltip** — Dark-themed tooltip wrapper with consistent styling
3. **Dialog** — Modal dialog with overlay, animations, and dark theme
4. **Button** — Styled button with variant support (primary, secondary, ghost)
5. **Toggle** — Toggle switch with on/off states
6. **Select** — Dropdown select with dark theme styling

## Migration

After creating wrappers, migrate existing hand-rolled UI instances to use the new components for consistency.

## Design Documents

- `docs/plans/2026-02-01-bits-ui-toolkit-design.md`
EOF
)"
echo "✓ Created: bits-ui Component Toolkit"

# --------------------------------------------------------------------------
# 9. Reset Versioning E2E Test
# --------------------------------------------------------------------------
gh issue create --repo "$REPO" \
  --title "Reset Versioning E2E Test: verify data clearing on version mismatch" \
  --label "testing" \
  --body "$(cat <<'EOF'
## Summary

Create a comprehensive E2E test that verifies the reset versioning flow clears all game data when `lastResetVersion` is outdated. Includes visual verification through screenshot comparisons.

## Test Approach

- TDD: Write tests first, then add missing test infrastructure
- Uses localStorage manipulation to trigger reset conditions
- Verifies results through UI elements and screenshot comparisons
- Follows pattern from existing `_legendary-selection.spec.ts`

## Test Cases

1. Fresh game starts correctly with clean state
2. Outdated `lastResetVersion` triggers full data clear
3. Current `lastResetVersion` preserves existing data
4. Visual state matches expected screenshots after reset

## Design Documents

- `docs/plans/2026-02-04-reset-versioning-e2e-test-implementation.md`
EOF
)"
echo "✓ Created: Reset Versioning E2E Test"

# --------------------------------------------------------------------------
# 10. Art Request: Enemy Types & Class System Assets
# --------------------------------------------------------------------------
gh issue create --repo "$REPO" \
  --title "Art Request: pixel art assets for enemy types and class system" \
  --label "art" \
  --body "$(cat <<'EOF'
## Summary

Pixel art assets needed for the enemy types and class system feature. All icons should match existing style: 16x16 pixel art, transparent background, Sunnyside World palette.

## Assets Needed

### Mage Icons
- **Frost icon** — Snowflake/ice crystal, blue tones (class card carousel + spell button)
- **Arcane icon** — Magic star/rune/orb, purple tones (class card carousel + spell button)

### Rogue Icons
- **Dagger icon** — Small dagger/stiletto, metallic tones (class card carousel)
- **Coffin/skull icon** — Coffin/skull/crossbones, dark tones (class card carousel)
- **Poison cloud icon** — Green/purple gas cloud (Poison Cloud ability button)

### Class Icons (card labels and UI badges)
- **Warrior class icon** — Crossed swords or shield emblem
- **Mage class icon** — Staff, crystal ball, or spell book
- **Rogue class icon** — Dagger with drip or mask

### Weapon Sprites (Warrior swing animation)
- Knife, Sword, Axe, Hammer swing sprites

### Already Available (no new art)
- Skeleton, Goblin, Red Mushroom, Blue Mushroom, Blinking Eyes sprites from Sunnyside World pack

## Design Documents

- `docs/plans/2026-01-30-art-request.md`
EOF
)"
echo "✓ Created: Art Request"

echo ""
echo "Done! Created 10 issues."
