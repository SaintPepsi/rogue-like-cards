import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPersistence } from './persistence.svelte';

// Mock localStorage for Node environment
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		}
	};
})();

vi.stubGlobal('localStorage', localStorageMock);

describe('persistence - hasCompletedFirstRun', () => {
	const persistence = createPersistence('test-session', 'test-persistent');

	beforeEach(() => {
		localStorageMock.clear();
	});

	it('saves and loads hasCompletedFirstRun flag', () => {
		persistence.savePersistent({
			gold: 0,
			purchasedUpgradeCounts: {},
			executeCapBonus: 0,
			hasCompletedFirstRun: true
		});

		const loaded = persistence.loadPersistent();
		expect(loaded?.hasCompletedFirstRun).toBe(true);
	});

	it('returns null when no save data exists', () => {
		const loaded = persistence.loadPersistent();
		expect(loaded).toBe(null);
	});

	it('defaults hasCompletedFirstRun to false for legacy saves without the flag', () => {
		// Simulate a legacy save without hasCompletedFirstRun
		localStorage.setItem(
			'test-persistent',
			JSON.stringify({
				gold: 100,
				purchasedUpgradeCounts: { 'some-upgrade': 1 },
				executeCapBonus: 5
			})
		);

		const loaded = persistence.loadPersistent();
		expect(loaded?.hasCompletedFirstRun).toBe(false);
	});
});

// TDD: These tests are written before attackCounts exists on SessionSaveData.
// We use type assertions to bypass TypeScript errors.
// When the feature is implemented, remove the type assertions.
describe('persistence - attackCounts', () => {
	const persistence = createPersistence('test-session-attacks', 'test-persistent-attacks');

	// Helper to create a session with attackCounts (bypasses TypeScript until feature is implemented)
	const createSessionWithAttackCounts = (attackCounts: Record<string, number>) =>
		({
			effects: [],
			unlockedUpgradeIds: [],
			xp: 0,
			level: 1,
			gold: 0,
			stage: 1,
			waveKills: 0,
			enemiesKilled: 0,
			enemyHealth: 100,
			enemyMaxHealth: 100,
			isBoss: false,
			isChest: false,
			isBossChest: false,
			timestamp: Date.now(),
			attackCounts
		}) as Parameters<typeof persistence.saveSession>[0];

	beforeEach(() => {
		localStorageMock.clear();
	});

	it('saves attackCounts to session data', () => {
		// Test 3.1: Save attackCounts to session
		const attackCounts = { normal: 100, crit: 25, execute: 5 };

		persistence.saveSession(createSessionWithAttackCounts(attackCounts));

		const saved = localStorage.getItem('test-session-attacks');
		expect(saved).not.toBeNull();
		const parsed = JSON.parse(saved!);
		expect(parsed.attackCounts).toEqual(attackCounts);
	});

	it('loads attackCounts from session data', () => {
		// Test 3.2: Load attackCounts from session
		const attackCounts = { normal: 50, crit: 10, poison: 30 };

		localStorage.setItem(
			'test-session-attacks',
			JSON.stringify({
				effects: [],
				unlockedUpgradeIds: [],
				xp: 0,
				level: 1,
				gold: 0,
				stage: 1,
				waveKills: 0,
				enemiesKilled: 0,
				enemyHealth: 100,
				enemyMaxHealth: 100,
				isBoss: false,
				isChest: false,
				isBossChest: false,
				timestamp: Date.now(),
				attackCounts: attackCounts
			})
		);

		const loaded = persistence.loadSession();
		expect(loaded?.attackCounts).toEqual(attackCounts);
	});

	it('defaults to empty object for legacy saves without attackCounts', () => {
		// Test 3.3: Load missing attackCounts (legacy save)
		localStorage.setItem(
			'test-session-attacks',
			JSON.stringify({
				effects: [],
				unlockedUpgradeIds: [],
				xp: 0,
				level: 1,
				gold: 0,
				stage: 1,
				waveKills: 0,
				enemiesKilled: 0,
				enemyHealth: 100,
				enemyMaxHealth: 100,
				isBoss: false,
				isChest: false,
				isBossChest: false,
				timestamp: Date.now()
				// Note: no attackCounts field
			})
		);

		const loaded = persistence.loadSession();
		// Should default to empty object or undefined (implementation decides)
		expect(loaded?.attackCounts ?? {}).toEqual({});
	});

	it('saves empty attackCounts when no attacks have occurred', () => {
		// Test 3.4: Save empty attackCounts
		persistence.saveSession(createSessionWithAttackCounts({}));

		const saved = localStorage.getItem('test-session-attacks');
		const parsed = JSON.parse(saved!);
		expect(parsed.attackCounts).toEqual({});
	});

	it('round-trip save/load preserves all categories', () => {
		// Test 3.5: Round-trip save/load preserves all categories
		const attackCounts = {
			normal: 1000,
			crit: 250,
			execute: 15,
			poison: 500,
			poisonCrit: 25
		};

		persistence.saveSession(createSessionWithAttackCounts(attackCounts));

		const loaded = persistence.loadSession();
		expect(loaded?.attackCounts).toEqual(attackCounts);
	});

	it('clearSession removes attackCounts data', () => {
		// Test 3.6: Session clear removes attackCounts
		persistence.saveSession(createSessionWithAttackCounts({ normal: 100 }));

		persistence.clearSession();

		const loaded = persistence.loadSession();
		expect(loaded).toBeNull();
	});
});
