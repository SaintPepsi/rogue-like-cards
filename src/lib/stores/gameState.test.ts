import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameState } from './gameState.svelte';
import * as resetVersionStorage from '$lib/utils/resetVersionStorage';
import { RESET_VERSION } from '$lib/version';

// Mock localStorage for testing
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		})
	};
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });
Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true });

// Mock requestAnimationFrame for gameLoop
Object.defineProperty(globalThis, 'requestAnimationFrame', {
	value: vi.fn((cb: FrameRequestCallback) => {
		return setTimeout(() => cb(Date.now()), 16);
	}),
	writable: true
});
Object.defineProperty(globalThis, 'cancelAnimationFrame', {
	value: vi.fn((id: number) => clearTimeout(id)),
	writable: true
});

describe('gameState - legendary selection', () => {
	beforeEach(() => {
		localStorageMock.clear();
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

describe('gameState - reset version behavior', () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	it('sets lastResetVersion for first-time players without triggering reset', () => {
		const setLastResetVersionSpy = vi.spyOn(resetVersionStorage, 'setLastResetVersion');

		// Simulate first-time player (no localStorage data)
		localStorageMock.clear();

		// Initialize game
		gameState.init();

		// Should establish baseline without resetting
		expect(setLastResetVersionSpy).toHaveBeenCalledOnce();
	});

	it('triggers reset when lastResetVersion is behind RESET_VERSION', () => {
		// Set old reset version (player who hasn't experienced the reset)
		localStorage.setItem('roguelike-cards-reset-version', '0.23.0');

		// Set up some existing save data
		localStorage.setItem(
			'roguelike-cards-save',
			JSON.stringify({
				gold: 1000,
				level: 10,
				effects: []
			})
		);
		localStorage.setItem(
			'roguelike-cards-persistent',
			JSON.stringify({
				gold: 5000,
				purchasedUpgradeCounts: { 'upgrade-1': 2 }
			})
		);

		// Initialize game (with RESET_VERSION > 0.23.0)
		gameState.init();

		// Both save keys should be cleared
		expect(localStorage.getItem('roguelike-cards-save')).toBeNull();
		expect(localStorage.getItem('roguelike-cards-persistent')).toBeNull();

		// lastResetVersion should be updated
		expect(localStorage.getItem('roguelike-cards-reset-version')).toBeTruthy();
	});

	it('does not trigger reset when lastResetVersion matches RESET_VERSION', () => {
		// Set current RESET_VERSION (player already experienced the reset)
		localStorage.setItem('roguelike-cards-reset-version', RESET_VERSION);

		// Set up existing save data with required fields
		const saveData = JSON.stringify({
			unlockedUpgradeIds: [],
			effects: [],
			xp: 0,
			level: 1,
			gold: 1000,
			stage: 1,
			waveKills: 0,
			enemiesKilled: 0,
			enemyHealth: 100,
			enemyMaxHealth: 100,
			isBoss: false,
			isChest: false,
			isBossChest: false,
			upgradeQueue: [],
			activeEvent: null,
			timestamp: Date.now(),
			legendaryChoiceIds: [],
			hasSelectedStartingLegendary: false
		});
		localStorage.setItem('roguelike-cards-save', saveData);

		// Initialize game
		gameState.init();

		// Save data should NOT be cleared
		expect(localStorage.getItem('roguelike-cards-save')).toBe(saveData);
	});
});
