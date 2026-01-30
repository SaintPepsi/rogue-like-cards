import { describe, test, expect } from 'vitest';
import { createLeveling } from './leveling.svelte';
import type { UpgradeContext } from './leveling.svelte';

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
		expect(lev.pendingLevelUps).toBe(0);
		expect(lev.showLevelUp).toBe(false);
	});

	test('addXp accumulates xp', () => {
		const lev = createLeveling();
		lev.addXp(10);
		expect(lev.xp).toBe(10);

		lev.addXp(5);
		expect(lev.xp).toBe(15);
	});

	test('checkLevelUp returns true when enough xp to level', () => {
		const lev = createLeveling();
		const needed = lev.xpToNextLevel;
		lev.addXp(needed);

		const result = lev.checkLevelUp(defaultCtx);
		expect(result).toBe(true);
		expect(lev.level).toBe(2);
		expect(lev.showLevelUp).toBe(true);
		expect(lev.pendingLevelUps).toBe(1);
	});

	test('checkLevelUp returns false when not enough xp', () => {
		const lev = createLeveling();
		lev.addXp(1);

		const result = lev.checkLevelUp(defaultCtx);
		expect(result).toBe(false);
		expect(lev.level).toBe(1);
		expect(lev.showLevelUp).toBe(false);
	});

	test('checkLevelUp handles multiple levels at once', () => {
		const lev = createLeveling();
		// Add way more than needed for level 1
		lev.addXp(10000);

		const result = lev.checkLevelUp(defaultCtx);
		expect(result).toBe(true);
		expect(lev.level).toBeGreaterThan(2);
		expect(lev.pendingLevelUps).toBeGreaterThan(1);
	});

	test('checkLevelUp returns false if modal already showing', () => {
		const lev = createLeveling();
		const needed = lev.xpToNextLevel;
		lev.addXp(needed * 3);

		// First call opens modal
		const first = lev.checkLevelUp(defaultCtx);
		expect(first).toBe(true);

		// Add more XP and try again — modal already showing
		lev.addXp(needed * 3);
		const second = lev.checkLevelUp(defaultCtx);
		expect(second).toBe(false);
	});

	test('consumeLevelUp decrements pendingLevelUps', () => {
		const lev = createLeveling();
		lev.addXp(10000);
		lev.checkLevelUp(defaultCtx);

		const pending = lev.pendingLevelUps;
		expect(pending).toBeGreaterThan(1);

		const allConsumed = lev.consumeLevelUp(defaultCtx);
		expect(allConsumed).toBe(false);
		expect(lev.pendingLevelUps).toBe(pending - 1);
	});

	test('consumeLevelUp returns true when last level consumed', () => {
		const lev = createLeveling();
		const needed = lev.xpToNextLevel;
		lev.addXp(needed);
		lev.checkLevelUp(defaultCtx);

		expect(lev.pendingLevelUps).toBe(1);
		const allConsumed = lev.consumeLevelUp(defaultCtx);
		expect(allConsumed).toBe(true);
		expect(lev.showLevelUp).toBe(false);
	});

	test('upgradeChoices populated after checkLevelUp', () => {
		const lev = createLeveling();
		lev.addXp(lev.xpToNextLevel);
		lev.checkLevelUp(defaultCtx);

		expect(lev.upgradeChoices.length).toBeGreaterThan(0);
	});

	test('reset restores initial state', () => {
		const lev = createLeveling();
		lev.addXp(10000);
		lev.checkLevelUp(defaultCtx);

		lev.reset();
		expect(lev.level).toBe(1);
		expect(lev.xp).toBe(0);
		expect(lev.pendingLevelUps).toBe(0);
		expect(lev.showLevelUp).toBe(false);
		expect(lev.upgradeChoices).toEqual([]);
	});

	test('restore sets xp and level', () => {
		const lev = createLeveling();
		lev.restore({ xp: 50, level: 5 });

		expect(lev.xp).toBe(50);
		expect(lev.level).toBe(5);
	});
});
