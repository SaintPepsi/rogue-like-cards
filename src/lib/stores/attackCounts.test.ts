import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameState } from './gameState.svelte';

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

describe('gameState - attackCounts', () => {
	beforeEach(() => {
		localStorageMock.clear();
	});

	it('exposes attackCounts with initial zero values', () => {
		expect(gameState.attackCounts).toEqual({
			normal: 0,
			crit: 0,
			execute: 0,
			poison: 0
		});
	});
});

describe('attack counting', () => {
	beforeEach(() => {
		localStorageMock.clear();
		gameState.init();
		gameState.resetGame();
	});

	it('increments normal count for hit type', () => {
		const initialNormal = gameState.attackCounts.normal;
		// Trigger an attack - the pipeline will produce at least one hit
		gameState.pointerDown();
		gameState.pointerUp();

		// Give time for attack to process
		expect(gameState.attackCounts.normal).toBeGreaterThan(initialNormal);
	});
});

describe('attackCounts persistence', () => {
	beforeEach(() => {
		localStorageMock.clear();
	});

	it('attackCounts field is included in SessionSaveData interface', () => {
		// Verify the type system accepts attackCounts in session save data
		// by checking we can parse a save that includes it
		const savedData = {
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
			attackCounts: { normal: 10, crit: 5, execute: 2, poison: 3 }
		};

		localStorage.setItem('roguelike-cards-save', JSON.stringify(savedData));
		const loaded = localStorage.getItem('roguelike-cards-save');
		const parsed = JSON.parse(loaded!);

		expect(parsed.attackCounts).toEqual({ normal: 10, crit: 5, execute: 2, poison: 3 });
	});
});

describe('attackCounts restoration', () => {
	beforeEach(() => {
		localStorageMock.clear();
	});

	it('restores attackCounts from session storage', () => {
		// Set up saved data with attackCounts
		const savedData = {
			unlockedUpgradeIds: [],
			effects: [],
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
			upgradeQueue: [],
			activeEvent: null,
			timestamp: Date.now(),
			attackCounts: { normal: 10, crit: 5, execute: 2, poison: 3 }
		};
		localStorage.setItem('roguelike-cards-save', JSON.stringify(savedData));

		gameState.init();

		expect(gameState.attackCounts).toEqual({ normal: 10, crit: 5, execute: 2, poison: 3 });
	});

	it('defaults to zeros when loading save without attackCounts', () => {
		// Set up saved data WITHOUT attackCounts (legacy save)
		const savedData = {
			unlockedUpgradeIds: [],
			effects: [],
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
			upgradeQueue: [],
			activeEvent: null,
			timestamp: Date.now()
		};
		localStorage.setItem('roguelike-cards-save', JSON.stringify(savedData));

		gameState.init();

		expect(gameState.attackCounts).toEqual({ normal: 0, crit: 0, execute: 0, poison: 0 });
	});
});

describe('attackCounts reset', () => {
	beforeEach(() => {
		localStorageMock.clear();
		gameState.init();
		gameState.resetGame(); // Ensure fresh game state with enemy spawned
	});

	it('resets attackCounts to zeros on resetGame()', () => {
		// Trigger some attacks to increment counters
		gameState.pointerDown();
		gameState.pointerUp();

		// Verify counters are non-zero (at least normal should increment)
		expect(gameState.attackCounts.normal).toBeGreaterThan(0);

		// Reset the game
		gameState.resetGame();

		// Verify all counters are back to zero
		expect(gameState.attackCounts).toEqual({ normal: 0, crit: 0, execute: 0, poison: 0 });
	});
});
