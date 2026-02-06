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
