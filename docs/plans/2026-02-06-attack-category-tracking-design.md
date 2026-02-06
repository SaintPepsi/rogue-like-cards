# Attack Category Tracking Design

Track the total number of individual attacks by category per run, displayed in battle-stats and game over modal.

## Categories Tracked

- **Normal** — Standard, non-crit attacks
- **Crit** — Attacks that trigger crit chance
- **Execute** — Instant-kill triggers
- **Poison** — Damage ticks from poison over time

## Data Model

### State (`gameState.svelte.ts`)

```ts
type AttackCounts = {
	normal: number;
	crit: number;
	execute: number;
	poison: number;
};

let attackCounts = $state<AttackCounts>({
	normal: 0,
	crit: 0,
	execute: 0,
	poison: 0
});
```

### Increment Logic

Two integration points:

1. **In `attack()`** — after `pipeline.runAttack()` returns, iterate over `result.hits` and increment based on hit type:
   - `hit` / `normal` → `attackCounts.normal++`
   - `criticalHit` / `crit` → `attackCounts.crit++`
   - `executeHit` / `execute` → `attackCounts.execute++`

2. **In `tickSystems()`** — for poison damage, increment `attackCounts.poison++` for each poison tick.

### Hit Type Mapping

```ts
function mapHitType(type: string): keyof AttackCounts | null {
	switch (type) {
		case 'hit':
		case 'normal':
			return 'normal';
		case 'criticalHit':
		case 'crit':
			return 'crit';
		case 'executeHit':
		case 'execute':
			return 'execute';
		case 'poison':
		case 'poisonCrit': // counts as poison for now
			return 'poison';
		default:
			return null; // unknown types ignored
	}
}
```

### Persistence

- Add `attackCounts?: AttackCounts` to `SessionSaveData` interface
- Save in `saveGame()`
- Restore in `loadGame()`
- Reset to zeros in `resetGame()`

### Getter

```ts
get attackCounts() { return attackCounts; }
```

## Display

### BattleArea.svelte

Add below existing stats (Enemies Killed, Gold):

```svelte
<p>Normal: {formatNumber(attackCounts.normal)}</p>
<p>Crit: {formatNumber(attackCounts.crit)}</p>
<p>Executes: {formatNumber(attackCounts.execute)}</p>
<p>Poison: {formatNumber(attackCounts.poison)}</p>
```

### GameOverModal.svelte

Add a new section after existing stats, before "Run Progression":

```svelte
<div class="attack-breakdown">
	<h3>Attack Breakdown</h3>
	<p>Normal: {formatNumber(attackCounts.normal)}</p>
	<p>Crit: {formatNumber(attackCounts.crit)}</p>
	<p>Executes: {formatNumber(attackCounts.execute)}</p>
	<p>Poison: {formatNumber(attackCounts.poison)}</p>
</div>
```

## Edge Cases

### Multi-strike

Each individual hit in a multi-strike attack increments the counter separately. If you have +2 multi-strike and land 3 hits, that's 3 increments to normal/crit counters.

### Reset Points

`attackCounts` resets to all zeros in:

- `resetGame()` — when starting a new run
- `loadGame()` with no saved data — fresh session

### Not Tracked

- Overkill damage — doesn't generate extra hits
- Damage amounts — we count hits, not damage values
