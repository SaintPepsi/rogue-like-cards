import { describe, test, expect, vi } from 'vitest';
import { createLeveling } from './leveling.svelte';
import type { UpgradeContext } from './leveling.svelte';
import type { SavedUpgradeEvent } from './persistence.svelte';

const defaultCtx: UpgradeContext = {
	luckyChance: 0,
	executeChance: 0,
	executeCap: 0.3,
	poison: 0
};

describe('createLeveling', () => {
	test('starts at level 1 with 0 xp', () => {
		const lev = createLeveling();
		expect(lev.level).toBe(1);
		expect(lev.xp).toBe(0);
		expect(lev.pendingUpgrades).toBe(0);
		expect(lev.hasActiveEvent).toBe(false);
	});

	test('addXp accumulates xp', () => {
		const lev = createLeveling();
		lev.addXp(10);
		expect(lev.xp).toBe(10);

		lev.addXp(5);
		expect(lev.xp).toBe(15);
	});

	test('checkLevelUp returns count and queues events when enough xp', () => {
		const lev = createLeveling();
		const needed = lev.xpToNextLevel;
		lev.addXp(needed);

		const result = lev.checkLevelUp(defaultCtx);
		expect(result).toBe(1);
		expect(lev.level).toBe(2);
		expect(lev.pendingUpgrades).toBe(1);
		// Modal not auto-opened — no active event yet
		expect(lev.hasActiveEvent).toBe(false);
	});

	test('checkLevelUp returns 0 when not enough xp', () => {
		const lev = createLeveling();
		lev.addXp(1);

		const result = lev.checkLevelUp(defaultCtx);
		expect(result).toBe(0);
		expect(lev.level).toBe(1);
		expect(lev.pendingUpgrades).toBe(0);
	});

	test('checkLevelUp handles multiple levels at once', () => {
		const lev = createLeveling();
		lev.addXp(10000);

		const result = lev.checkLevelUp(defaultCtx);
		expect(result).toBeGreaterThan(1);
		expect(lev.level).toBeGreaterThan(2);
		expect(lev.pendingUpgrades).toBeGreaterThan(1);
	});

	test('checkLevelUp queues additional events without blocking', () => {
		const lev = createLeveling();
		const needed = lev.xpToNextLevel;
		lev.addXp(needed * 3);

		// First call queues events
		const first = lev.checkLevelUp(defaultCtx);
		expect(first).toBeGreaterThan(0);
		const firstPending = lev.pendingUpgrades;

		// Add more XP and call again — should queue more (no blocking)
		lev.addXp(needed * 10);
		const second = lev.checkLevelUp(defaultCtx);
		expect(second).toBeGreaterThan(0);
		expect(lev.pendingUpgrades).toBeGreaterThan(firstPending);
	});

	test('openNextUpgrade pops from queue and sets active event', () => {
		const lev = createLeveling();
		lev.addXp(10000);
		lev.checkLevelUp(defaultCtx);

		const pending = lev.pendingUpgrades;
		expect(pending).toBeGreaterThan(0);

		const event = lev.openNextUpgrade();
		expect(event).not.toBeNull();
		expect(event!.type).toBe('levelup');
		expect(lev.hasActiveEvent).toBe(true);
		expect(lev.pendingUpgrades).toBe(pending - 1);
		expect(lev.upgradeChoices.length).toBeGreaterThan(0);
	});

	test('closeActiveEvent clears active and returns queue empty status', () => {
		const lev = createLeveling();
		const needed = lev.xpToNextLevel;
		lev.addXp(needed);
		lev.checkLevelUp(defaultCtx);

		expect(lev.pendingUpgrades).toBe(1);
		lev.openNextUpgrade();
		expect(lev.hasActiveEvent).toBe(true);

		const allConsumed = lev.closeActiveEvent();
		expect(allConsumed).toBe(true);
		expect(lev.hasActiveEvent).toBe(false);
	});

	test('closeActiveEvent returns false when more events queued', () => {
		const lev = createLeveling();
		lev.addXp(10000);
		lev.checkLevelUp(defaultCtx);

		expect(lev.pendingUpgrades).toBeGreaterThan(1);
		lev.openNextUpgrade();

		const allConsumed = lev.closeActiveEvent();
		expect(allConsumed).toBe(false);
	});

	test('upgradeChoices populated after openNextUpgrade', () => {
		const lev = createLeveling();
		lev.addXp(lev.xpToNextLevel);
		lev.checkLevelUp(defaultCtx);
		lev.openNextUpgrade();

		expect(lev.upgradeChoices.length).toBeGreaterThan(0);
	});

	test('queueChestLoot adds chest event to queue', () => {
		const lev = createLeveling();
		lev.queueChestLoot(false, defaultCtx, 50);

		expect(lev.pendingUpgrades).toBe(1);
		const event = lev.openNextUpgrade();
		expect(event!.type).toBe('chest');
		expect(event!.gold).toBe(50);
		expect(event!.choices.length).toBeGreaterThan(0);
	});

	test('reset restores initial state', () => {
		const lev = createLeveling();
		lev.addXp(10000);
		lev.checkLevelUp(defaultCtx);
		lev.openNextUpgrade();

		lev.reset();
		expect(lev.level).toBe(1);
		expect(lev.xp).toBe(0);
		expect(lev.pendingUpgrades).toBe(0);
		expect(lev.hasActiveEvent).toBe(false);
		expect(lev.upgradeChoices).toEqual([]);
	});

	test('restore sets xp and level', () => {
		const lev = createLeveling();
		lev.restore({ xp: 50, level: 5 });

		expect(lev.xp).toBe(50);
		expect(lev.level).toBe(5);
	});

	test('restore reconstructs upgradeQueue from saved events', () => {
		const lev = createLeveling();
		const savedQueue: SavedUpgradeEvent[] = [
			{ type: 'levelup', choiceIds: ['damage_1', 'crit_chance_1', 'xp_1'] },
			{ type: 'chest', choiceIds: ['damage_2', 'crit_damage_1', 'poison_1'], gold: 100 }
		];

		lev.restore({ xp: 50, level: 5, upgradeQueue: savedQueue });

		expect(lev.pendingUpgrades).toBe(2);

		// Open first event and check it
		const event1 = lev.openNextUpgrade();
		expect(event1).not.toBeNull();
		expect(event1!.type).toBe('levelup');
		expect(event1!.choices).toHaveLength(3);
		expect(event1!.choices.map(c => c.id)).toEqual(['damage_1', 'crit_chance_1', 'xp_1']);

		lev.closeActiveEvent();

		// Open second event and check it
		const event2 = lev.openNextUpgrade();
		expect(event2).not.toBeNull();
		expect(event2!.type).toBe('chest');
		expect(event2!.gold).toBe(100);
		expect(event2!.choices).toHaveLength(3);
	});

	test('restore reconstructs activeEvent from saved event', () => {
		const lev = createLeveling();
		const savedActive: SavedUpgradeEvent = {
			type: 'levelup',
			choiceIds: ['damage_1', 'crit_chance_1', 'xp_1']
		};

		lev.restore({ xp: 50, level: 5, activeEvent: savedActive });

		expect(lev.hasActiveEvent).toBe(true);
		expect(lev.activeEvent!.type).toBe('levelup');
		expect(lev.upgradeChoices).toHaveLength(3);
		expect(lev.upgradeChoices.map(c => c.id)).toEqual(['damage_1', 'crit_chance_1', 'xp_1']);
	});

	test('restore skips events with invalid upgrade IDs', () => {
		const lev = createLeveling();
		const savedQueue: SavedUpgradeEvent[] = [
			{ type: 'levelup', choiceIds: ['nonexistent1', 'nonexistent2', 'nonexistent3'] },
			{ type: 'levelup', choiceIds: ['damage_1', 'crit_chance_1', 'xp_1'] }
		];

		lev.restore({ xp: 50, level: 5, upgradeQueue: savedQueue });

		// First event should be filtered out (all IDs invalid), only second remains
		expect(lev.pendingUpgrades).toBe(1);
		const event = lev.openNextUpgrade();
		expect(event!.choices.map(c => c.id)).toEqual(['damage_1', 'crit_chance_1', 'xp_1']);
	});

	test('restore with empty upgradeQueue and no activeEvent leaves clean state', () => {
		const lev = createLeveling();
		lev.restore({ xp: 50, level: 5, upgradeQueue: [], activeEvent: null });

		expect(lev.pendingUpgrades).toBe(0);
		expect(lev.hasActiveEvent).toBe(false);
	});
});
