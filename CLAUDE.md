## Temporary UI Effects

Use the **store-driven, array-based, self-cleaning** pattern for any on-screen element that appears temporarily (hit numbers, gold drop popups, toast messages, etc.).

### The pattern

**Store** (`gameState.svelte.ts`):

```ts
let items = $state<Item[]>([]);
let itemId = $state(0);

function addItem(data: Omit<Item, 'id'>) {
	itemId++;
	items = [...items, { ...data, id: itemId }];
	const id = itemId;
	setTimeout(() => {
		items = items.filter((i) => i.id !== id);
	}, ANIMATION_DURATION_MS);
}
```

**Component** (pure renderer — no `$effect`, no `$state`, no `setTimeout`):

```svelte
{#each items as item (item.id)}
	<span class="animated-thing">{item.value}</span>
{/each}
```

### Why

- **Store owns lifecycle.** Components only render what the store gives them.
- **Array-based.** Multiple items coexist when rapid actions fire (e.g. fast clicks producing overlapping popups).
- **ID-based self-cleanup.** Each item removes only itself via `setTimeout`, regardless of what else was added or removed.
- **No reactive loops.** IDs are assigned imperatively in game actions, never inside `$effect`.

### Anti-patterns (do not use)

- `$effect` that writes to `$state` it also reads (causes `effect_update_depth_exceeded` — infinite reactive loop).
- Component-local `setTimeout` for show/hide visibility toggles (races with rapid triggers, loses cleanup on unmount).
- Single-slot state (`lastValue = x`) for effects that can overlap (second event overwrites the first).

### Canonical examples

- **Hit numbers:** `addHits()` in `gameState.svelte.ts`, rendered in `BattleArea.svelte`.
- **Gold drops:** `addGoldDrop()` in `gameState.svelte.ts`, rendered in `BattleArea.svelte`.

## Game Loop Timers

Use **game loop timers** instead of `setInterval` or `setTimeout` for any recurring game logic (autoclickers, ability cooldowns, periodic effects, etc.).

### The pattern

**Register a timer** in `gameState.svelte.ts`:

```ts
// Start a repeating timer
gameLoop.timers.register('timer_name', {
	remaining: INTERVAL_MS,
	repeat: INTERVAL_MS,  // Makes it repeat every INTERVAL_MS
	onExpire: () => {
		// Your logic here
	}
});

// Stop the timer
gameLoop.timers.remove('timer_name');
```

**One-shot timer** (no `repeat` field):

```ts
gameLoop.timers.register('one_shot', {
	remaining: DELAY_MS,
	onExpire: () => {
		// Runs once after DELAY_MS
	}
});
```

### Why

- **No tab-away bursts.** `setInterval` queues callbacks when the tab is inactive. Browsers batch-execute them on tab focus, causing a burst of accumulated calls.
- **Game loop integration.** The game loop uses `requestAnimationFrame`, which pauses when the tab is inactive.
- **DeltaMs capping.** The game loop caps `deltaMs` to 200ms (see `gameLoop.svelte.ts:62`) to prevent burst behavior even if the user tabs away for a long time.
- **Consistent timing.** All game mechanics use the same clock, ensuring synchronized behavior.

### Anti-patterns (do not use)

- `setInterval` or `setTimeout` for game logic (causes tab-away bursts and desync from game clock).
- Component-local timers that aren't cleaned up on unmount.
- Timers that don't account for pause state (game loop timers automatically respect pause).

### Canonical examples

- **Boss countdown:** `startBossTimer()` / `stopBossTimer()` in `gameLoop.svelte.ts` (lines 128-151)
- **System tick:** Registered in `gameLoop.svelte.ts:89-94` (repeats every 1000ms)
- **Attack cooldown:** `fireAttack()` in `gameLoop.svelte.ts:44-52` (one-shot timer that re-registers itself)
- **Autoclicker:** `startAutoclicker()` / `stopAutoclicker()` in `gameState.svelte.ts:786-802` (repeating timer)
- **Frenzy decay:** Managed in `frenzy.svelte.ts` via `gameLoop.timers`

### Implementation details

The timer registry (`src/lib/engine/timerRegistry.ts`) provides:
- `register(name, timer)` — Add or replace a timer
- `remove(name)` — Remove a timer
- `has(name)` — Check if a timer exists
- `tick(deltaMs)` — Called by game loop's `requestAnimationFrame` to advance all timers
- `clear()` — Remove all timers (used on reset)

Timers automatically handle overflow (if a timer expires by more than its interval, the overflow is carried forward to the next iteration).

## Code Style

- Do not use `while` loops. They are poor engineering. Use iteration with bounded limits (e.g. `for` loops with a max iteration count) or recursive approaches instead.
- Prefer early returns over nested `if/else` blocks. Guard clauses at the top of a function make the happy path obvious and reduce indentation depth.
- Never use the `any` type. Always use explicit types, whether in function parameters, return types, variable declarations, or type assertions. Use specific type assertions (`as SomeType`), generics, unions, or restructure code to avoid the need for `any`.
- Use descriptive function names. Avoid cryptic abbreviations like `pct`, `num`, `fmt`. Prefer self-explanatory names like `asPercent`, `asPlusNumber`, `formatPrice`.

## Component Reuse

Always explore the codebase before creating new components. Reuse existing patterns and components to maintain consistency.

### Exploration first

Before implementing ANY UI component or pattern:

1. Search for similar existing components (`Glob`, `Grep`, or `Task` tool with `Explore` agent)
2. Check if `bits-ui` provides a suitable primitive
3. Look for existing utility hooks (e.g., `useCardFlip`, `useCardSelect`)
4. Review similar modals/components to match existing patterns

### Use bits-ui by default

For common UI primitives (buttons, dialogs, tooltips, etc.), always use `bits-ui` components first. Do not reinvent wheels.

### Extract reusable components

When creating custom UI patterns:

- Extract them into dedicated components immediately
- Place them in `src/lib/components/`
- Use Svelte 5 snippets to avoid duplicating rendering logic
- Ensure new components match existing design patterns

### Anti-patterns (do not use)

- **Reimplementing existing components from scratch** — Always check if something similar exists first
- **Duplicating rendering logic** — Use `{#snippet}` blocks to define once, render multiple times
- **Ignoring existing patterns** — New modals/forms should match the structure of existing ones
- **Creating custom primitives** — Use `bits-ui` for buttons, dialogs, tooltips, etc.

### Canonical examples

- **Card rendering:** `LevelUpModal` and `LegendarySelectionModal` both use `CardCarousel`, `useCardFlip`, `useCardSelect` hooks
- **Modals:** All modals follow the same overlay + content structure with consistent animations
- **Buttons:** Use `bits-ui`'s `Button.Root` component, not raw `<button>` elements

## Design Document Management

Track the lifecycle of planning documents by moving them to a completed folder once they've been used.

### When to move documents

- **Design documents:** After writing an implementation plan from a design markdown file, move the design file to the completed folder.
- **Implementation plans:** After executing a plan from an implementation markdown file, move it to the completed folder.

### Why

- Clearly separates active work from completed work
- Maintains a historical record of design decisions
- Prevents confusion about which documents are still relevant
- Keeps the active planning directory focused on current tasks

## Code Proximity Principles

Keep related code close together. Fight the natural drift of logic scattering across the codebase.

### Decision archaeology

Document non-obvious decisions at the point of implementation, not in separate docs. Include **why**, alternatives considered, and measurements where applicable.

```ts
// DECISION: 1-hour cache TTL for user data
// Why: Balance between data freshness and API load
// Measured: Reduces API calls by 85% with acceptable staleness
const USER_CACHE_TTL_SECONDS = 3600;
```

### Three-strikes abstraction

Resist abstraction until the third occurrence. Copy-paste is acceptable for the first two uses. Premature abstraction is worse than duplication.

### Test colocation

Place test files next to the code they test (`foo.ts` and `foo.test.ts` in the same directory), not in a separate `test/` tree.

### Error context at the source

Handle and document errors closest to where they are understood. Generic catch-all error messages at call sites are an anti-pattern.

### Configuration near usage

Keep constants and config values near the code that uses them, with a comment explaining the choice. Avoid centralizing unrelated config into a single file.

### Organize by behavior, not by layer

Group files by feature/domain (e.g. `user-authentication/`, `payment-processing/`) rather than by technical layer (e.g. `controllers/`, `models/`, `validators/`).

### Temporal proximity

Code that changes together should live together. If two files always appear in the same commits, they likely belong closer.

### Security and performance annotations

Document security mitigations and performance tradeoffs at their enforcement/implementation point:

```ts
// SECURITY: DOMPurify with strict whitelist to prevent XSS from user HTML
// PERFORMANCE: Using Map for O(1) lookup — benchmarked 50x faster than array.find for n > 500
```

### Deprecation at the source

Deprecation notices, migration paths, and removal timelines belong on the deprecated code itself, not in external docs.

## Changelog Guidelines

All changelog entries live in `src/lib/changelog.ts`. The `ChangelogModal.svelte` component renders them dynamically — never hardcode entries in the modal.

### Data format

Each entry in the `CHANGELOG` array uses this structure:

```ts
{
  version: '0.12.0',
  date: '2026-01-29',
  changes: [
    { category: 'new', description: 'Description of the change' }
  ]
}
```

### Categories

Every change item must have a `category`:

- `new` — New features, mechanics, or content
- `changed` — Modifications to existing behavior
- `fixed` — Bug fixes

### Content rules

- Never list specific upgrade/card names in changelog entries. Keep them a mystery for players to discover.
- Use counts instead (e.g. "Added 8 new poison upgrade cards to discover").
- Describe mechanics changes and bug fixes clearly, but don't spoil card specifics.
- Start descriptions with a verb: "Added", "Fixed", "Redesigned", etc.
- Keep each entry to a single sentence.

### Versioning

- `PATCH` is auto-incremented by the pre-commit hook on every commit.
- `MINOR` is bumped by CI on merge to master.
- Changelog entries track `MAJOR.MINOR.0` versions (the minor release).
- The pre-commit hook enforces that a changelog entry exists for the current minor version.
