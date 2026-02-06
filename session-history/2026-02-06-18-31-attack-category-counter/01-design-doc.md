# Attack Category Counter Design

## Problem Statement

Players currently see only a single "Enemies Killed" counter during runs. There is no visibility into how different attack types contribute to their damage output. This makes it difficult to:

1. **Evaluate build effectiveness**: Players cannot see if their crit-focused or poison-focused builds are performing as expected.
2. **Make informed upgrade decisions**: Without knowing how often they land crits or executes, players choose upgrades blindly.
3. **Appreciate combat diversity**: The variety of attack mechanics (normal, crit, execute, poison) goes unnoticed since there's no feedback on their frequency.

Tracking individual attack counts by category provides valuable run statistics and helps players understand their build's performance.

## Proposed Solution

Add a per-run counter that tracks the total number of individual attacks by category. Display these statistics in the battle-stats section of the BattleArea component, alongside the existing "Enemies Killed" and "Gold" displays.

### Attack Categories to Track

Based on the existing `HitType` definitions in `src/lib/types.ts`:

| Category  | Description                              | Source                                              |
| --------- | ---------------------------------------- | --------------------------------------------------- |
| `normal`  | Standard attacks (non-crit, non-execute) | `attack()` in gameState via pipeline                |
| `crit`    | Critical hit attacks                     | `critSystem` transforms `hit` -> `criticalHit`      |
| `execute` | Instant-kill attacks                     | `executeSystem` short-circuits with `executeHit`    |
| `poison`  | Poison tick damage                       | `poisonSystem.onTick()` returns `hitType: 'poison'` |

Note: `poisonCrit` exists in types but is not currently implemented in the poison system (poison ticks don't crit yet). We will track it for future-proofing but it will remain at 0 until poison crits are implemented.

## Scope Declaration

- **Type**: `atomic-feature`
- **Estimated Complexity**: `small`
- **Dependencies**:
  - Existing `HitType` type definitions
  - Existing `uiEffects.svelte.ts` pattern for tracking hits
  - Existing battle-stats UI in `BattleArea.svelte`
  - Existing persistence layer (`SessionSaveData`)
- **Can Be Split**: `no` (small enough to implement in one pass)

## User Stories

### Story 1: View Attack Breakdown During Run

**As a** player
**I want to** see how many attacks of each type I've landed during my current run
**So that** I can evaluate how well my build is performing

**Acceptance Criteria:**

- Attack counts by category are displayed in the battle-stats section
- Counts update in real-time as attacks land
- Only non-zero categories are displayed (avoid clutter for builds that don't use certain mechanics)
- Numbers use the existing `formatNumber()` utility for consistency

### Story 2: Attack Stats Persist Across Page Refresh

**As a** player
**I want** my attack statistics to persist if I refresh the page mid-run
**So that** I don't lose my run statistics

**Acceptance Criteria:**

- Attack category counts are saved to `SessionSaveData`
- Counts are restored on page load
- Counts reset to zero when starting a new run

### Story 3: View Attack Stats on Game Over

**As a** player
**I want to** see my total attack breakdown when my run ends
**So that** I can compare different builds across runs

**Acceptance Criteria:**

- Attack category totals are visible on the Game Over screen
- Stats are shown in a clear, readable format
- Zero-count categories may be hidden or shown differently

## Technical Approach

### 1. Data Storage

Add attack counts to the existing game state structure. The counts should be stored in `gameState.svelte.ts` as session-scoped state (reset each run).

```ts
// In gameState.svelte.ts
type AttackCounts = Record<string, number>;
let attackCounts = $state<AttackCounts>({});
```

DECISION: Use `Record<string, number>` keyed by HitType string rather than a fixed object.
Why: Future-proofs for new attack types without code changes. The existing `HitType` union can grow without requiring changes to the counter structure.

### 2. Increment Logic

Attacks are processed in two places:

**A. Direct attacks via `attack()` function (lines 192-233):**

- After `pipeline.runAttack()` returns, iterate over `result.hits` and increment counters by hit type
- Map pipeline types to UI types (already done for hit display): `criticalHit` -> `crit`, `executeHit` -> `execute`, `hit` -> `normal`

**B. Tick damage via `tickSystems()` function (lines 235-254):**

- The `runTick()` returns hits with `hitType` field (e.g., `'poison'`)
- Increment counter for each tick damage hit

Location for increment logic:

```ts
// After creating newHits in attack()
for (const hit of newHits) {
	attackCounts[hit.type] = (attackCounts[hit.type] ?? 0) + 1;
}

// After each tick hit in tickSystems()
attackCounts[hitType] = (attackCounts[hitType] ?? 0) + 1;
```

### 3. Persistence

Extend `SessionSaveData` interface in `persistence.svelte.ts`:

```ts
export interface SessionSaveData {
	// ... existing fields
	attackCounts?: Record<string, number>;
}
```

Save and restore in `saveGame()` / `loadGame()` functions.

### 4. UI Display

Extend the battle-stats section in `BattleArea.svelte`:

```svelte
<div class="battle-stats">
	<p class="kills">Enemies Killed: {formatNumber(enemiesKilled)}</p>
	<p class="gold">Gold: {formatNumber(gold)}</p>

	<!-- New attack breakdown section -->
	{#if Object.keys(attackCounts).length > 0}
		<div class="attack-counts">
			{#each Object.entries(attackCounts) as [type, count]}
				{#if count > 0}
					<p class="attack-count {type}">{formatAttackType(type)}: {formatNumber(count)}</p>
				{/if}
			{/each}
		</div>
	{/if}
</div>
```

Add a helper function to format attack type names for display:

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
```

### 5. Game Over Display

Extend `GameOverModal.svelte` props to receive attack counts and display them in the game-over-stats section:

```svelte
<div class="game-over-stats">
	<!-- existing stats -->
	<p>Stage Reached: <strong>{stage}</strong></p>
	<p>Enemies Killed: <strong>{formatNumber(enemiesKilled)}</strong></p>

	<!-- attack breakdown -->
	{#each Object.entries(attackCounts) as [type, count]}
		{#if count > 0}
			<p>{formatAttackType(type)}: <strong>{formatNumber(count)}</strong></p>
		{/if}
	{/each}
</div>
```

### 6. Reset Logic

In `resetGame()`, reset the attack counts:

```ts
attackCounts = {};
```

## File Changes Summary

| File                                      | Change                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `src/lib/stores/gameState.svelte.ts`      | Add `attackCounts` state, increment logic, expose getter, save/load, reset |
| `src/lib/stores/persistence.svelte.ts`    | Add `attackCounts` to `SessionSaveData` interface                          |
| `src/lib/components/BattleArea.svelte`    | Add `attackCounts` prop, render attack breakdown section                   |
| `src/lib/components/GameOverModal.svelte` | Add `attackCounts` prop, render in game-over-stats                         |
| `src/routes/+page.svelte`                 | Pass `attackCounts` to BattleArea and GameOverModal                        |

## Risks & Assumptions

### Risks

1. **UI Clutter**: If all attack types are shown, the battle-stats section may become crowded.
   - Mitigation: Only show non-zero categories. Consider collapsible section for lower-priority stats.

2. **Performance**: High attack-speed builds may increment counters rapidly.
   - Mitigation: Simple integer increments are O(1) and have negligible overhead. No concern here.

3. **Type Safety**: Using `Record<string, number>` trades some type safety for flexibility.
   - Mitigation: The keys come directly from existing HitType values, which are well-defined.

### Assumptions

1. **Display location**: Attack stats will be shown in the existing battle-stats section. If the section becomes too crowded, a separate "Stats" panel could be considered in a future iteration.

2. **Granularity**: We track individual hits, not total damage by category. Damage tracking could be a separate feature enhancement.

3. **Multi-strike handling**: Each strike in a multi-strike attack counts as a separate hit. This is intentional and matches how hits are currently displayed.

4. **Poison tick counting**: Each poison tick (1 per second per stack) counts as one "hit" for statistics purposes. This may result in high poison counts for poison-focused builds.

5. **No cross-run persistence**: Attack stats are per-run only. Lifetime statistics could be a future feature using `PersistentSaveData`.

## Visual Mockup (Text)

```
Battle Stats Panel (during run):
+---------------------------+
| Enemies Killed: 1,234     |
| Gold: 5,678               |
|                           |
| Attack Breakdown:         |
| Normal Hits: 8,421        |
| Critical Hits: 2,156      |
| Executes: 89              |
| Poison Ticks: 4,532       |
+---------------------------+
```

```
Game Over Modal:
+---------------------------+
| GAME OVER                 |
| The boss defeated you!    |
|                           |
| Stage Reached: 12         |
| Level: 25                 |
| Enemies Killed: 1,234     |
| Gold Earned: 5,678        |
|                           |
| Attack Breakdown:         |
| Normal Hits: 8,421        |
| Critical Hits: 2,156      |
| Executes: 89              |
| Poison Ticks: 4,532       |
+---------------------------+
```

## Out of Scope

- Damage tracking by category (could be a future enhancement)
- DPS calculations
- Lifetime/cross-run statistics
- Attack rate calculations (attacks per second)
- Detailed breakdown charts or graphs
