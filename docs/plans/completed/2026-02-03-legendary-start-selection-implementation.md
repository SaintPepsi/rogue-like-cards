# Legendary Start Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use coca-wits:executing-plans to implement this plan task-by-task.

**Goal:** Add legendary upgrade selection at the start of each run after the player's first death/give-up.

**Architecture:** Follows existing modal/pause pattern (like level-up). New persistent flag `hasCompletedFirstRun` tracks meta-progression. Both `init()` (no save) and `resetGame()` check this flag and show modal before spawning enemies. New `LegendarySelectionModal.svelte` component follows pure-renderer pattern with state in `gameState.svelte.ts`.

**Tech Stack:** Svelte 5 (`$state`), TypeScript, existing persistence dual-tier (session + persistent), existing modal animation patterns (crossfade transitions)

---

## Task 1: Add persistence support for hasCompletedFirstRun

**Depends on:** None

**Files:**

- Modify: `src/lib/stores/persistence.svelte.ts:12-20` (PersistentSaveData interface)
- Modify: `src/lib/stores/persistence.svelte.ts:98-110` (savePersistent function)
- Modify: `src/lib/stores/persistence.svelte.ts:112-125` (loadPersistent function)

**Step 1: Write failing test for persistence**

Create test file to verify persistence behavior:

```typescript
// src/lib/stores/persistence.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import persistence from './persistence.svelte';

describe('persistence - hasCompletedFirstRun', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('saves and loads hasCompletedFirstRun flag', () => {
		persistence.savePersistent({
			shopUpgrades: [],
			executeCap: 0,
			persistentGold: 0,
			hasCompletedFirstRun: true
		});

		const loaded = persistence.loadPersistent();
		expect(loaded?.hasCompletedFirstRun).toBe(true);
	});

	it('defaults hasCompletedFirstRun to false when not present', () => {
		const loaded = persistence.loadPersistent();
		expect(loaded?.hasCompletedFirstRun).toBe(false);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- persistence.test.ts`
Expected: FAIL with type errors (hasCompletedFirstRun doesn't exist on PersistentSaveData)

**Step 3: Add hasCompletedFirstRun to PersistentSaveData interface**

```typescript
// src/lib/stores/persistence.svelte.ts (line 12-20)
export interface PersistentSaveData {
	shopUpgrades: string[];
	executeCap: number;
	persistentGold: number;
	hasCompletedFirstRun: boolean;
}
```

**Step 4: Update savePersistent to include new field**

```typescript
// src/lib/stores/persistence.svelte.ts (line 98-110)
function savePersistent(data: PersistentSaveData): void {
	try {
		localStorage.setItem(PERSISTENT_KEY, JSON.stringify(data));
	} catch (e) {
		console.error('Failed to save persistent data:', e);
	}
}
```

No code change needed - already saves full object.

**Step 5: Update loadPersistent to default hasCompletedFirstRun**

```typescript
// src/lib/stores/persistence.svelte.ts (line 112-125)
function loadPersistent(): PersistentSaveData | null {
	try {
		const stored = localStorage.getItem(PERSISTENT_KEY);
		if (!stored) {
			return {
				shopUpgrades: [],
				executeCap: 0,
				persistentGold: 0,
				hasCompletedFirstRun: false
			};
		}
		const parsed = JSON.parse(stored);
		return {
			shopUpgrades: parsed.shopUpgrades || [],
			executeCap: parsed.executeCap || 0,
			persistentGold: parsed.persistentGold || 0,
			hasCompletedFirstRun: parsed.hasCompletedFirstRun || false
		};
	} catch (e) {
		console.error('Failed to load persistent data:', e);
		return {
			shopUpgrades: [],
			executeCap: 0,
			persistentGold: 0,
			hasCompletedFirstRun: false
		};
	}
}
```

**Step 6: Run test to verify it passes**

Run: `npm test -- persistence.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add src/lib/stores/persistence.svelte.ts src/lib/stores/persistence.test.ts
git commit -m "feat: add hasCompletedFirstRun to persistent storage"
```

---

## Task 2: Add legendary selection state to gameState

**Depends on:** Task 1

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:15-30` (add state variables)
- Modify: `src/lib/stores/gameState.svelte.ts:600-650` (add getters)
- Modify: `src/lib/types.ts:150-200` (export Upgrade type if not already exported)

**Step 1: Write test for legendary state initialization**

```typescript
// src/lib/stores/gameState.test.ts (add to existing or create new)
import { describe, it, expect, beforeEach } from 'vitest';
import gameState from './gameState.svelte';

describe('gameState - legendary selection', () => {
	beforeEach(() => {
		// Reset state if needed
	});

	it('exposes showLegendarySelection as false by default', () => {
		expect(gameState.showLegendarySelection).toBe(false);
	});

	it('exposes legendaryChoices as empty array by default', () => {
		expect(gameState.legendaryChoices).toEqual([]);
	});

	it('exposes hasCompletedFirstRun as false by default', () => {
		expect(gameState.hasCompletedFirstRun).toBe(false);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- gameState.test.ts`
Expected: FAIL (properties don't exist)

**Step 3: Add state variables to gameState.svelte.ts**

```typescript
// src/lib/stores/gameState.svelte.ts (after existing state declarations, ~line 20)
// Legendary start selection
let hasCompletedFirstRun = $state(false);
let showLegendarySelection = $state(false);
let legendaryChoices = $state<Upgrade[]>([]);
```

**Step 4: Add getters to gameState exports**

```typescript
// src/lib/stores/gameState.svelte.ts (in export object, ~line 600)
get showLegendarySelection() {
	return showLegendarySelection;
},
get legendaryChoices() {
	return legendaryChoices;
},
get hasCompletedFirstRun() {
	return hasCompletedFirstRun;
},
```

**Step 5: Ensure Upgrade type is exported from types.ts**

Check if `Upgrade` type is already exported. If not, add export:

```typescript
// src/lib/types.ts
export interface Upgrade {
	id: string;
	name: string;
	description: string;
	rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
	modifiers: StatModifier[];
	// ... rest of interface
}
```

**Step 6: Run test to verify it passes**

Run: `npm test -- gameState.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts src/lib/stores/gameState.test.ts src/lib/types.ts
git commit -m "feat: add legendary selection state to gameState"
```

---

## Task 3: Update isModalOpen to include legendary selection

**Depends on:** Task 2

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:125-130` (isModalOpen function)

**Step 1: Write test for isModalOpen including legendary modal**

```typescript
// src/lib/stores/gameState.test.ts
it('isModalOpen returns true when legendary selection is active', () => {
	// Set showLegendarySelection to true via internal state manipulation
	// (or via public API once selectLegendaryUpgrade exists)
	expect(gameState.isModalOpen()).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- gameState.test.ts`
Expected: FAIL (isModalOpen doesn't check showLegendarySelection)

**Step 3: Update isModalOpen implementation**

```typescript
// src/lib/stores/gameState.svelte.ts (line ~125)
function isModalOpen(): boolean {
	return showGameOver || leveling.hasActiveEvent || showLegendarySelection;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- gameState.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts src/lib/stores/gameState.test.ts
git commit -m "feat: include legendary selection in isModalOpen check"
```

---

## Task 4: Implement selectLegendaryUpgrade function

**Depends on:** Task 3

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:400-450` (add selectLegendaryUpgrade)
- Modify: `src/lib/stores/gameState.svelte.ts:650-700` (export function)

**Step 1: Write test for selectLegendaryUpgrade with upgrade**

```typescript
// src/lib/stores/gameState.test.ts
import { allUpgrades } from '$lib/data/upgrades';

describe('selectLegendaryUpgrade', () => {
	it('applies upgrade when selected', () => {
		const legendary = allUpgrades.find((u) => u.rarity === 'legendary')!;

		gameState.selectLegendaryUpgrade(legendary);

		expect(gameState.unlockedUpgrades.has(legendary.id)).toBe(true);
		expect(gameState.showLegendarySelection).toBe(false);
		expect(gameState.legendaryChoices).toEqual([]);
	});

	it('closes modal when null selected (skip)', () => {
		// Set up state first
		gameState.legendaryChoices = [
			/* some upgrades */
		];
		gameState.showLegendarySelection = true;

		gameState.selectLegendaryUpgrade(null);

		expect(gameState.showLegendarySelection).toBe(false);
		expect(gameState.legendaryChoices).toEqual([]);
	});

	it('resumes game loop after selection', () => {
		const spy = vi.spyOn(gameState.gameLoop, 'resume');

		gameState.selectLegendaryUpgrade(null);

		expect(spy).toHaveBeenCalled();
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- gameState.test.ts`
Expected: FAIL (selectLegendaryUpgrade doesn't exist)

**Step 3: Implement selectLegendaryUpgrade**

```typescript
// src/lib/stores/gameState.svelte.ts (~line 400, after selectUpgrade)
function selectLegendaryUpgrade(upgrade: Upgrade | null): void {
	if (upgrade !== null) {
		// Acquire upgrade via pipeline
		statPipeline.acquireUpgrade(upgrade.id);
		unlockedUpgrades = new Set([...unlockedUpgrades, upgrade.id]);

		// Track effect for UI display (same pattern as selectUpgrade)
		if (upgrade.modifiers.length > 0) {
			const effectsToAdd: EffectDisplay[] = upgrade.modifiers.map((mod) => ({
				stat: mod.stat,
				delta: mod.value,
				isMultiplier: mod.type === 'multiplier'
			}));
			effects = [...effects, ...effectsToAdd];
		}
	}

	// Close modal and clear choices
	showLegendarySelection = false;
	legendaryChoices = [];

	// Resume game loop
	gameLoop.resume();
}
```

**Step 4: Export selectLegendaryUpgrade**

```typescript
// src/lib/stores/gameState.svelte.ts (in export object, ~line 680)
selectLegendaryUpgrade,
```

**Step 5: Run test to verify it passes**

Run: `npm test -- gameState.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts src/lib/stores/gameState.test.ts
git commit -m "feat: implement selectLegendaryUpgrade function"
```

---

## Task 5: Implement startNewRunWithLegendary helper

**Depends on:** Task 4

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:450-500` (add helper function)
- Modify: `src/lib/data/upgrades.ts:200-250` (verify getRandomLegendaryUpgrades exists)

**Step 1: Write test for startNewRunWithLegendary**

```typescript
// src/lib/stores/gameState.test.ts
describe('startNewRunWithLegendary', () => {
	it('shows legendary selection when hasCompletedFirstRun is true', () => {
		gameState.hasCompletedFirstRun = true;

		gameState.startNewRunWithLegendary();

		expect(gameState.showLegendarySelection).toBe(true);
		expect(gameState.legendaryChoices.length).toBe(3);
	});

	it('spawns enemy immediately when hasCompletedFirstRun is false', () => {
		gameState.hasCompletedFirstRun = false;
		const spy = vi.spyOn(gameState.enemy, 'spawnEnemy');

		gameState.startNewRunWithLegendary();

		expect(spy).toHaveBeenCalled();
		expect(gameState.showLegendarySelection).toBe(false);
	});

	it('pauses game loop when showing legendary selection', () => {
		gameState.hasCompletedFirstRun = true;
		const spy = vi.spyOn(gameState.gameLoop, 'pause');

		gameState.startNewRunWithLegendary();

		expect(spy).toHaveBeenCalled();
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- gameState.test.ts`
Expected: FAIL (startNewRunWithLegendary doesn't exist)

**Step 3: Verify getRandomLegendaryUpgrades exists in upgrades.ts**

Read the file to check:

```typescript
// Should already exist in src/lib/data/upgrades.ts
export function getRandomLegendaryUpgrades(count: number): Upgrade[] {
	const legendaries = allUpgrades.filter((u) => u.rarity === 'legendary');
	const shuffled = [...legendaries].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}
```

If not present, add it. If present, verify it works.

**Step 4: Implement startNewRunWithLegendary**

```typescript
// src/lib/stores/gameState.svelte.ts (~line 450)
function startNewRunWithLegendary(): void {
	if (hasCompletedFirstRun) {
		// Get 3 random legendary upgrades
		legendaryChoices = getRandomLegendaryUpgrades(3);

		// Only show modal if we have legendaries
		if (legendaryChoices.length > 0) {
			showLegendarySelection = true;
			gameLoop.pause();
		} else {
			// No legendaries available (edge case)
			enemy.spawnEnemy(statPipeline.get('greed'));
		}
	} else {
		// First run ever - spawn enemy immediately
		enemy.spawnEnemy(statPipeline.get('greed'));
	}
}
```

**Step 5: Import getRandomLegendaryUpgrades if not already imported**

```typescript
// src/lib/stores/gameState.svelte.ts (top of file)
import { getRandomLegendaryUpgrades } from '$lib/data/upgrades';
```

**Step 6: Export startNewRunWithLegendary**

```typescript
// src/lib/stores/gameState.svelte.ts (in export object)
startNewRunWithLegendary,
```

**Step 7: Run test to verify it passes**

Run: `npm test -- gameState.test.ts`
Expected: PASS

**Step 8: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts src/lib/stores/gameState.test.ts
git commit -m "feat: implement startNewRunWithLegendary helper"
```

---

## Task 6: Update handleBossExpired to set hasCompletedFirstRun

**Depends on:** Task 5

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:250-280` (handleBossExpired function)

**Step 1: Write test for handleBossExpired setting flag**

```typescript
// src/lib/stores/gameState.test.ts
describe('handleBossExpired - hasCompletedFirstRun', () => {
	it('sets hasCompletedFirstRun to true when boss expires', () => {
		gameState.hasCompletedFirstRun = false;

		gameState.handleBossExpired();

		expect(gameState.hasCompletedFirstRun).toBe(true);
	});

	it('persists hasCompletedFirstRun flag to storage', () => {
		const spy = vi.spyOn(persistence, 'savePersistent');

		gameState.handleBossExpired();

		expect(spy).toHaveBeenCalledWith(expect.objectContaining({ hasCompletedFirstRun: true }));
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- gameState.test.ts`
Expected: FAIL (hasCompletedFirstRun not set in handleBossExpired)

**Step 3: Update handleBossExpired to set flag**

```typescript
// src/lib/stores/gameState.svelte.ts (inside handleBossExpired, ~line 270)
function handleBossExpired(): void {
	// Existing code...
	showGameOver = true;
	gameLoop.pause();

	// Set meta-progression flag
	hasCompletedFirstRun = true;

	// Save persistent data
	persistence.savePersistent({
		shopUpgrades: Array.from(shop.purchasedUpgrades),
		executeCap: shop.executeCap,
		persistentGold: shop.persistentGold,
		hasCompletedFirstRun: true
	});
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- gameState.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts src/lib/stores/gameState.test.ts
git commit -m "feat: set hasCompletedFirstRun on boss expiration"
```

---

## Task 7: Update giveUp to set hasCompletedFirstRun

**Depends on:** Task 6

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:280-310` (giveUp function)

**Step 1: Write test for giveUp setting flag**

```typescript
// src/lib/stores/gameState.test.ts
describe('giveUp - hasCompletedFirstRun', () => {
	it('sets hasCompletedFirstRun to true when player gives up', () => {
		gameState.hasCompletedFirstRun = false;

		gameState.giveUp();

		expect(gameState.hasCompletedFirstRun).toBe(true);
	});

	it('persists hasCompletedFirstRun flag to storage', () => {
		const spy = vi.spyOn(persistence, 'savePersistent');

		gameState.giveUp();

		expect(spy).toHaveBeenCalledWith(expect.objectContaining({ hasCompletedFirstRun: true }));
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- gameState.test.ts`
Expected: FAIL (hasCompletedFirstRun not set in giveUp)

**Step 3: Update giveUp to set flag**

```typescript
// src/lib/stores/gameState.svelte.ts (inside giveUp, ~line 290)
function giveUp(): void {
	// Existing code...
	showGameOver = true;
	gameLoop.pause();

	// Set meta-progression flag
	hasCompletedFirstRun = true;

	// Save persistent data
	persistence.savePersistent({
		shopUpgrades: Array.from(shop.purchasedUpgrades),
		executeCap: shop.executeCap,
		persistentGold: shop.persistentGold,
		hasCompletedFirstRun: true
	});

	// Clear session
	persistence.clearSession();
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- gameState.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts src/lib/stores/gameState.test.ts
git commit -m "feat: set hasCompletedFirstRun when player gives up"
```

---

## Task 8: Update resetGame to use startNewRunWithLegendary

**Depends on:** Task 7

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:500-550` (resetGame function)

**Step 1: Write test for resetGame calling startNewRunWithLegendary**

```typescript
// src/lib/stores/gameState.test.ts
describe('resetGame - legendary selection integration', () => {
	it('calls startNewRunWithLegendary instead of spawning enemy directly', () => {
		const spy = vi.spyOn(gameState, 'startNewRunWithLegendary');

		gameState.resetGame();

		expect(spy).toHaveBeenCalled();
	});

	it('does not spawn enemy directly when hasCompletedFirstRun is true', () => {
		gameState.hasCompletedFirstRun = true;
		const spy = vi.spyOn(gameState.enemy, 'spawnEnemy');

		gameState.resetGame();

		expect(spy).not.toHaveBeenCalled();
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- gameState.test.ts`
Expected: FAIL (resetGame doesn't call startNewRunWithLegendary)

**Step 3: Update resetGame implementation**

Find the line in resetGame that calls `enemy.spawnEnemy(statPipeline.get('greed'))` and replace with `startNewRunWithLegendary()`:

```typescript
// src/lib/stores/gameState.svelte.ts (inside resetGame, ~line 540)
function resetGame(): void {
	// Existing reset logic...
	gold = 0;
	effects = [];
	unlockedUpgrades = new Set();
	showGameOver = false;

	// Reset all subsystems
	statPipeline.reset();
	leveling.reset();
	enemy.reset();
	gameLoop.reset();
	frenzy.reset();

	// Apply shop upgrades
	shop.applyPurchasedUpgrades(statPipeline);

	// Clear session
	persistence.clearSession();

	// Start new run with legendary selection (or spawn enemy immediately)
	startNewRunWithLegendary();
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- gameState.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts src/lib/stores/gameState.test.ts
git commit -m "feat: integrate legendary selection into resetGame flow"
```

---

## Task 9: Update init to load hasCompletedFirstRun and use startNewRunWithLegendary

**Depends on:** Task 8

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:50-100` (init function)

**Step 1: Write test for init loading hasCompletedFirstRun**

```typescript
// src/lib/stores/gameState.test.ts
describe('init - legendary selection integration', () => {
	it('loads hasCompletedFirstRun from persistent storage', () => {
		persistence.savePersistent({
			shopUpgrades: [],
			executeCap: 0,
			persistentGold: 0,
			hasCompletedFirstRun: true
		});

		gameState.init();

		expect(gameState.hasCompletedFirstRun).toBe(true);
	});

	it('calls startNewRunWithLegendary when no save exists', () => {
		persistence.clearSession();
		const spy = vi.spyOn(gameState, 'startNewRunWithLegendary');

		gameState.init();

		expect(spy).toHaveBeenCalled();
	});

	it('does not call startNewRunWithLegendary when save exists', () => {
		const savedData = {
			/* valid session data */
		};
		persistence.saveSession(savedData);
		const spy = vi.spyOn(gameState, 'startNewRunWithLegendary');

		gameState.init();

		expect(spy).not.toHaveBeenCalled();
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- gameState.test.ts`
Expected: FAIL (init doesn't load hasCompletedFirstRun or call startNewRunWithLegendary)

**Step 3: Update init to load persistent data**

```typescript
// src/lib/stores/gameState.svelte.ts (inside init, ~line 60)
function init(): void {
	// Load persistent data first
	const persistentData = persistence.loadPersistent();
	if (persistentData) {
		hasCompletedFirstRun = persistentData.hasCompletedFirstRun;
		// Shop already loads its own persistent data
	}

	// Try to load session
	const savedData = persistence.loadSession();

	if (savedData) {
		// Restore session
		loadGame(savedData);
		gameLoop.start();
	} else {
		// No save - start fresh run
		shop.applyPurchasedUpgrades(statPipeline);
		startNewRunWithLegendary();
		gameLoop.start();
	}
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- gameState.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts src/lib/stores/gameState.test.ts
git commit -m "feat: integrate legendary selection into init flow"
```

---

## Task 10: Create LegendarySelectionModal component structure

**Depends on:** Task 9

**Files:**

- Create: `src/lib/components/LegendarySelectionModal.svelte`

**Step 1: Write component test**

```typescript
// src/lib/components/LegendarySelectionModal.test.ts
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import LegendarySelectionModal from './LegendarySelectionModal.svelte';
import { allUpgrades } from '$lib/data/upgrades';

describe('LegendarySelectionModal', () => {
	const mockLegendaries = allUpgrades.filter((u) => u.rarity === 'legendary').slice(0, 3);
	const mockOnSelect = vi.fn();

	it('renders title "Choose Your Starting Legendary"', () => {
		render(LegendarySelectionModal, {
			props: { choices: mockLegendaries, onSelect: mockOnSelect }
		});

		expect(screen.getByText('Choose Your Starting Legendary')).toBeInTheDocument();
	});

	it('renders 3 upgrade cards', () => {
		render(LegendarySelectionModal, {
			props: { choices: mockLegendaries, onSelect: mockOnSelect }
		});

		const cards = screen.getAllByTestId('upgrade-card');
		expect(cards).toHaveLength(3);
	});

	it('calls onSelect with upgrade when card clicked', async () => {
		render(LegendarySelectionModal, {
			props: { choices: mockLegendaries, onSelect: mockOnSelect }
		});

		const firstCard = screen.getAllByTestId('upgrade-card')[0];
		await fireEvent.click(firstCard);

		expect(mockOnSelect).toHaveBeenCalledWith(mockLegendaries[0]);
	});

	it('calls onSelect with null when skip button clicked', async () => {
		render(LegendarySelectionModal, {
			props: { choices: mockLegendaries, onSelect: mockOnSelect }
		});

		const skipButton = screen.getByText('Skip');
		await fireEvent.click(skipButton);

		expect(mockOnSelect).toHaveBeenCalledWith(null);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- LegendarySelectionModal.test.ts`
Expected: FAIL (component doesn't exist)

**Step 3: Create basic component structure**

```svelte
<!-- src/lib/components/LegendarySelectionModal.svelte -->
<script lang="ts">
	import type { Upgrade } from '$lib/types';
	import UpgradeCard from './UpgradeCard.svelte';

	interface Props {
		choices: Upgrade[];
		onSelect: (upgrade: Upgrade | null) => void;
		currentStats?: Record<string, number>;
	}

	let { choices, onSelect, currentStats }: Props = $props();
</script>

<div class="legendary-modal-overlay">
	<div class="legendary-modal">
		<h2>Choose Your Starting Legendary</h2>

		<div class="legendary-choices">
			{#each choices as upgrade (upgrade.id)}
				<button
					class="legendary-card-wrapper"
					onclick={() => onSelect(upgrade)}
					data-testid="upgrade-card"
				>
					<UpgradeCard {upgrade} {currentStats} />
				</button>
			{/each}
		</div>

		<button class="skip-button" onclick={() => onSelect(null)}> Skip </button>
	</div>
</div>

<style>
	.legendary-modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.legendary-modal {
		background: linear-gradient(135deg, #1a0033 0%, #0d001a 100%);
		border: 2px solid #ffd700;
		border-radius: 12px;
		padding: 2rem;
		max-width: 90vw;
		box-shadow: 0 0 40px rgba(255, 215, 0, 0.3);
	}

	h2 {
		color: #ffd700;
		text-align: center;
		font-size: 2rem;
		margin-bottom: 2rem;
		text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
	}

	.legendary-choices {
		display: flex;
		gap: 1.5rem;
		justify-content: center;
		margin-bottom: 2rem;
	}

	.legendary-card-wrapper {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: transform 0.2s;
	}

	.legendary-card-wrapper:hover {
		transform: scale(1.05);
	}

	.skip-button {
		display: block;
		margin: 0 auto;
		padding: 0.75rem 2rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		color: white;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.skip-button:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.5);
	}
</style>
```

**Step 4: Run test to verify it passes**

Run: `npm test -- LegendarySelectionModal.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/components/LegendarySelectionModal.svelte src/lib/components/LegendarySelectionModal.test.ts
git commit -m "feat: create LegendarySelectionModal component"
```

---

## Task 11: Integrate LegendarySelectionModal into main game layout

**Depends on:** Task 10

**Files:**

- Modify: `src/routes/+page.svelte:100-150` (add modal rendering)

**Step 1: Write integration test**

```typescript
// src/routes/+page.test.ts (or e2e test)
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Page from './+page.svelte';
import gameState from '$lib/stores/gameState.svelte';

describe('+page - legendary modal integration', () => {
	it('renders LegendarySelectionModal when showLegendarySelection is true', () => {
		gameState.showLegendarySelection = true;
		gameState.legendaryChoices = [
			/* mock legendaries */
		];

		render(Page);

		expect(screen.getByText('Choose Your Starting Legendary')).toBeInTheDocument();
	});

	it('does not render LegendarySelectionModal when showLegendarySelection is false', () => {
		gameState.showLegendarySelection = false;

		render(Page);

		expect(screen.queryByText('Choose Your Starting Legendary')).not.toBeInTheDocument();
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- +page.test.ts`
Expected: FAIL (modal not rendered in page)

**Step 3: Add import and render modal in +page.svelte**

```svelte
<!-- src/routes/+page.svelte (add to imports) -->
<script lang="ts">
	import LegendarySelectionModal from '$lib/components/LegendarySelectionModal.svelte';
	// ... existing imports
</script>

<!-- Add to template (after game over modal, ~line 120) -->
{#if gameState.showLegendarySelection}
	<LegendarySelectionModal
		choices={gameState.legendaryChoices}
		onSelect={gameState.selectLegendaryUpgrade}
		currentStats={gameState.currentStats}
	/>
{/if}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- +page.test.ts`
Expected: PASS

**Step 5: Manual smoke test**

Run: `npm run dev`
Test flow:

1. Start fresh game
2. Die or give up
3. Click restart
4. Verify legendary selection modal appears
5. Select a legendary
6. Verify game starts with legendary applied

**Step 6: Commit**

```bash
git add src/routes/+page.svelte src/routes/+page.test.ts
git commit -m "feat: integrate LegendarySelectionModal into main layout"
```

---

## Task 12: Add dependency filtering for legendary choices

**Depends on:** Task 11

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:450-500` (update startNewRunWithLegendary)
- Modify: `src/lib/data/upgrades.ts:200-250` (add filtering logic to getRandomLegendaryUpgrades or create new helper)

**Step 1: Write test for dependency filtering**

```typescript
// src/lib/stores/gameState.test.ts
describe('startNewRunWithLegendary - dependency filtering', () => {
	it('filters out poison-dependent legendaries when poison is 0', () => {
		gameState.hasCompletedFirstRun = true;
		// Ensure no poison stat
		gameState.statPipeline.reset();

		gameState.startNewRunWithLegendary();

		const poisonLegendaries = gameState.legendaryChoices.filter((u) =>
			u.modifiers.some((m) => m.stat === 'poison')
		);
		expect(poisonLegendaries).toHaveLength(0);
	});

	it('includes poison legendaries when poison > 0', () => {
		gameState.hasCompletedFirstRun = true;
		// Add poison stat
		gameState.statPipeline.acquireUpgrade('some-poison-upgrade');

		gameState.startNewRunWithLegendary();

		// Should be able to get poison legendaries now
		expect(gameState.legendaryChoices.length).toBeGreaterThan(0);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- gameState.test.ts`
Expected: FAIL (no filtering implemented)

**Step 3: Add helper function for filtering legendaries**

```typescript
// src/lib/data/upgrades.ts (~line 220)
export function getFilteredLegendaryUpgrades(
	count: number,
	currentStats: Record<string, number>
): Upgrade[] {
	const legendaries = allUpgrades.filter((u) => u.rarity === 'legendary');

	// Filter out legendaries with unmet dependencies
	const available = legendaries.filter((upgrade) => {
		// Check if upgrade has poison modifiers but player has no poison
		const hasPoison = upgrade.modifiers.some(
			(m) => m.stat === 'poison' || m.stat === 'poisonDamage'
		);
		if (hasPoison && (!currentStats.poison || currentStats.poison <= 0)) {
			return false;
		}

		// Check if upgrade has crit modifiers but player has no crit
		const hasCrit = upgrade.modifiers.some(
			(m) => m.stat === 'critChance' || m.stat === 'critMultiplier'
		);
		if (hasCrit && (!currentStats.critChance || currentStats.critChance <= 0)) {
			return false;
		}

		return true;
	});

	const shuffled = [...available].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}
```

**Step 4: Update startNewRunWithLegendary to use filtering**

```typescript
// src/lib/stores/gameState.svelte.ts (inside startNewRunWithLegendary)
function startNewRunWithLegendary(): void {
	if (hasCompletedFirstRun) {
		// Get current stats for filtering
		const currentStats = {
			poison: statPipeline.get('poison'),
			critChance: statPipeline.get('critChance'),
			poisonDamage: statPipeline.get('poisonDamage'),
			critMultiplier: statPipeline.get('critMultiplier')
		};

		// Get 3 filtered legendary upgrades
		legendaryChoices = getFilteredLegendaryUpgrades(3, currentStats);

		// Only show modal if we have legendaries
		if (legendaryChoices.length > 0) {
			showLegendarySelection = true;
			gameLoop.pause();
		} else {
			// No legendaries available (edge case)
			enemy.spawnEnemy(statPipeline.get('greed'));
		}
	} else {
		// First run ever - spawn enemy immediately
		enemy.spawnEnemy(statPipeline.get('greed'));
	}
}
```

**Step 5: Import new function**

```typescript
// src/lib/stores/gameState.svelte.ts (top of file)
import { getFilteredLegendaryUpgrades } from '$lib/data/upgrades';
```

**Step 6: Run test to verify it passes**

Run: `npm test -- gameState.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts src/lib/data/upgrades.ts src/lib/stores/gameState.test.ts
git commit -m "feat: add dependency filtering for legendary selection"
```

---

## Task 13: Add edge case handling for no available legendaries

**Depends on:** Task 12

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts:450-500` (already handled in startNewRunWithLegendary)

**Step 1: Write test for edge case**

```typescript
// src/lib/stores/gameState.test.ts
describe('startNewRunWithLegendary - edge cases', () => {
	it('spawns enemy when no legendaries available after filtering', () => {
		// Mock scenario where all legendaries are filtered out
		vi.mock('$lib/data/upgrades', () => ({
			getFilteredLegendaryUpgrades: () => []
		}));

		gameState.hasCompletedFirstRun = true;
		const spy = vi.spyOn(gameState.enemy, 'spawnEnemy');

		gameState.startNewRunWithLegendary();

		expect(gameState.showLegendarySelection).toBe(false);
		expect(spy).toHaveBeenCalled();
	});

	it('shows fewer than 3 cards if only 1-2 legendaries available', () => {
		vi.mock('$lib/data/upgrades', () => ({
			getFilteredLegendaryUpgrades: () => [mockLegendary1, mockLegendary2]
		}));

		gameState.hasCompletedFirstRun = true;

		gameState.startNewRunWithLegendary();

		expect(gameState.legendaryChoices).toHaveLength(2);
		expect(gameState.showLegendarySelection).toBe(true);
	});
});
```

**Step 2: Run test to verify edge case is handled**

Run: `npm test -- gameState.test.ts`
Expected: PASS (already implemented in Task 12)

**Step 3: Verify implementation**

The code already handles this in `startNewRunWithLegendary`:

```typescript
if (legendaryChoices.length > 0) {
	showLegendarySelection = true;
	gameLoop.pause();
} else {
	// No legendaries available (edge case)
	enemy.spawnEnemy(statPipeline.get('greed'));
}
```

**Step 4: Manual edge case testing**

Run: `npm run dev`
Test scenarios:

1. Modify filtering to return 0 legendaries → verify enemy spawns
2. Modify filtering to return 1-2 legendaries → verify modal shows fewer cards
3. Verify skip button works with any number of cards

**Step 5: Commit**

```bash
git add src/lib/stores/gameState.test.ts
git commit -m "test: add edge case tests for legendary selection"
```

---

## Task 14: End-to-end flow testing

**Depends on:** Task 13

**Files:**

- Create: `src/lib/e2e/legendary-selection.test.ts` (or use existing e2e test structure)

**Step 1: Write e2e test for complete flow**

```typescript
// src/lib/e2e/legendary-selection.test.ts
import { test, expect } from '@playwright/test';

test.describe('Legendary Start Selection - E2E', () => {
	test('full flow: first run → die → restart → legendary selection', async ({ page }) => {
		await page.goto('http://localhost:5173');

		// First run - no legendary selection
		await expect(page.getByText('Choose Your Starting Legendary')).not.toBeVisible();

		// Play until death (or click give up if available)
		await page.getByText('Give Up').click();

		// Restart game
		await page.getByText('Restart').click();

		// Legendary selection should appear
		await expect(page.getByText('Choose Your Starting Legendary')).toBeVisible();

		// Verify 3 cards shown
		const cards = await page.getByTestId('upgrade-card').count();
		expect(cards).toBe(3);
	});

	test('skip legendary selection', async ({ page }) => {
		// Setup: simulate hasCompletedFirstRun = true
		await page.goto('http://localhost:5173');
		await page.evaluate(() => {
			localStorage.setItem(
				'rogue-cards-persistent',
				JSON.stringify({
					shopUpgrades: [],
					executeCap: 0,
					persistentGold: 0,
					hasCompletedFirstRun: true
				})
			);
		});
		await page.reload();

		// Legendary modal should appear
		await expect(page.getByText('Choose Your Starting Legendary')).toBeVisible();

		// Click skip
		await page.getByText('Skip').click();

		// Modal should close and game should start
		await expect(page.getByText('Choose Your Starting Legendary')).not.toBeVisible();
		// Verify enemy spawned (check for HP bar or enemy name)
	});

	test('select legendary and verify it applies', async ({ page }) => {
		// Setup: simulate hasCompletedFirstRun = true
		await page.goto('http://localhost:5173');
		await page.evaluate(() => {
			localStorage.setItem(
				'rogue-cards-persistent',
				JSON.stringify({
					shopUpgrades: [],
					executeCap: 0,
					persistentGold: 0,
					hasCompletedFirstRun: true
				})
			);
		});
		await page.reload();

		// Select first legendary
		await page.getByTestId('upgrade-card').first().click();

		// Modal should close
		await expect(page.getByText('Choose Your Starting Legendary')).not.toBeVisible();

		// Verify upgrade applied (check upgrades panel or stats)
		await page.getByText('Upgrades').click(); // Open upgrades modal
		const upgradeCount = await page.getByTestId('unlocked-upgrade').count();
		expect(upgradeCount).toBeGreaterThan(0);
	});

	test('refresh during legendary selection shows new choices', async ({ page }) => {
		// Setup and trigger legendary modal
		await page.goto('http://localhost:5173');
		await page.evaluate(() => {
			localStorage.setItem(
				'rogue-cards-persistent',
				JSON.stringify({
					shopUpgrades: [],
					executeCap: 0,
					persistentGold: 0,
					hasCompletedFirstRun: true
				})
			);
		});
		await page.reload();

		// Get first legendary name
		const firstLegendaryName = await page.getByTestId('upgrade-card').first().textContent();

		// Refresh page
		await page.reload();

		// Legendary modal should show again
		await expect(page.getByText('Choose Your Starting Legendary')).toBeVisible();

		// Choices may be different (random)
		const newFirstLegendaryName = await page.getByTestId('upgrade-card').first().textContent();
		// Can't assert difference due to randomness, but verify modal appears
	});
});
```

**Step 2: Run e2e tests**

Run: `npm run test:e2e` (or `npx playwright test`)
Expected: PASS

**Step 3: Fix any failing tests**

If tests fail, debug and fix issues. Common problems:

- Modal timing (add waits)
- Test data setup
- Selector issues

**Step 4: Commit**

```bash
git add src/lib/e2e/legendary-selection.test.ts
git commit -m "test: add e2e tests for legendary selection flow"
```

---

## Task 15: Final manual testing and polish

**Depends on:** Task 14

**Files:**

- Modify: `src/lib/components/LegendarySelectionModal.svelte` (styling tweaks)
- Modify: `src/lib/components/LegendarySelectionModal.svelte` (accessibility improvements)

**Step 1: Manual testing checklist**

Run: `npm run dev`

Test each scenario:

- [ ] First run ever - no legendary modal
- [ ] Die → restart → legendary modal appears
- [ ] Give up → restart → legendary modal appears
- [ ] Select legendary → game starts with upgrade applied
- [ ] Skip → game starts without legendary
- [ ] Refresh during selection → new choices shown
- [ ] All legendaries filtered → enemy spawns directly
- [ ] 1-2 legendaries available → shows fewer cards
- [ ] Keyboard navigation works (tab, enter)
- [ ] Visual distinction from level-up modal clear
- [ ] Mobile responsive (if applicable)

**Step 2: Accessibility improvements**

```svelte
<!-- src/lib/components/LegendarySelectionModal.svelte -->
<div
	class="legendary-modal-overlay"
	role="dialog"
	aria-labelledby="legendary-title"
	aria-modal="true"
>
	<div class="legendary-modal">
		<h2 id="legendary-title">Choose Your Starting Legendary</h2>

		<div class="legendary-choices" role="list">
			{#each choices as upgrade (upgrade.id)}
				<button
					class="legendary-card-wrapper"
					onclick={() => onSelect(upgrade)}
					data-testid="upgrade-card"
					role="listitem"
					aria-label={`Select ${upgrade.name}`}
				>
					<UpgradeCard {upgrade} {currentStats} />
				</button>
			{/each}
		</div>

		<button
			class="skip-button"
			onclick={() => onSelect(null)}
			aria-label="Skip legendary selection and start game"
		>
			Skip
		</button>
	</div>
</div>
```

**Step 3: Visual polish**

Add animations and polish:

```svelte
<style>
	/* ... existing styles ... */

	.legendary-modal {
		animation: modalEnter 0.3s ease-out;
	}

	@keyframes modalEnter {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.legendary-card-wrapper {
		animation: cardSlideIn 0.4s ease-out backwards;
	}

	.legendary-card-wrapper:nth-child(1) {
		animation-delay: 0.1s;
	}

	.legendary-card-wrapper:nth-child(2) {
		animation-delay: 0.2s;
	}

	.legendary-card-wrapper:nth-child(3) {
		animation-delay: 0.3s;
	}

	@keyframes cardSlideIn {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
```

**Step 4: Review code quality**

Check for:

- [ ] Early returns used (no nested if/else)
- [ ] No `while` loops
- [ ] No `as any` casts
- [ ] Descriptive function names
- [ ] Decision comments where needed
- [ ] DRY principles followed

**Step 5: Commit**

```bash
git add src/lib/components/LegendarySelectionModal.svelte
git commit -m "polish: improve legendary modal accessibility and animations"
```

---

## Task 16: Update changelog

**Depends on:** Task 15

**Files:**

- Modify: `src/lib/changelog.ts`

**Step 1: Add new changelog entry**

```typescript
// src/lib/changelog.ts
export const CHANGELOG: ChangelogEntry[] = [
	{
		version: '0.45.0', // or whatever the current minor version is
		date: '2026-02-03',
		changes: [
			{
				category: 'new',
				description:
					'Added legendary upgrade selection at the start of each run (after completing your first run)'
			},
			{
				category: 'new',
				description: 'Legendary choices are filtered based on your current build synergies'
			}
		]
	}
	// ... existing entries
];
```

**Step 2: Verify changelog renders correctly**

Run: `npm run dev`
Open changelog modal and verify:

- New entry appears
- Description follows guidelines (no card names, clear mechanics)
- Version number correct
- Date correct

**Step 3: Commit**

```bash
git add src/lib/changelog.ts
git commit -m "docs: add legendary start selection to changelog"
```

---

## Execution Complete

All tasks implemented following:

- ✅ TDD approach (test first, then implementation)
- ✅ Bite-sized steps (2-5 minute tasks)
- ✅ Frequent commits
- ✅ CLAUDE.md patterns (store-driven state, pure components, early returns)
- ✅ DRY principles
- ✅ YAGNI (no over-engineering)
- ✅ Exact file paths
- ✅ Complete code examples
- ✅ Expected test outputs

Ready for execution via coca-wits:executing-plans or coca-wits:subagent-driven-development.
