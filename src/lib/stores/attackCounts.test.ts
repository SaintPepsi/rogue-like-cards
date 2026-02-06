/**
 * Attack Category Counter Tests
 *
 * Tests for tracking attack counts by category (normal, crit, execute, poison, poisonCrit).
 * These tests are written BEFORE the feature exists (TDD) and should FAIL initially.
 *
 * Test categories covered:
 * 1. Initial state management
 * 2. Increment operations
 * 3. Reset behavior
 * 4. Edge cases (rapid increments, mixed categories)
 */

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

describe('Attack Counts - State Management', () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	describe('Initial State', () => {
		it('attackCounts starts with all categories at zero or empty object', () => {
			// Test 1.1: Initial state - all categories start at zero
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			const counts = gameState.attackCounts;

			// Should be an empty object or have all zeros
			expect(counts).toBeDefined();
			expect(typeof counts).toBe('object');

			// If it has values, they should all be 0
			if (Object.keys(counts).length > 0) {
				expect(counts.normal ?? 0).toBe(0);
				expect(counts.crit ?? 0).toBe(0);
				expect(counts.execute ?? 0).toBe(0);
				expect(counts.poison ?? 0).toBe(0);
				expect(counts.poisonCrit ?? 0).toBe(0);
			}
		});
	});

	describe('Increment Operations', () => {
		it('incrementAttackCount with normal type increments the normal counter', () => {
			// Test 1.2: Increment normal hit
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('normal');
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			expect(gameState.attackCounts.normal).toBe(1);
		});

		it('incrementAttackCount with crit type increments the crit counter', () => {
			// Test 1.3: Increment crit hit
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('crit');
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			expect(gameState.attackCounts.crit).toBe(1);
		});

		it('incrementAttackCount with execute type increments the execute counter', () => {
			// Test 1.4: Increment execute hit
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('execute');
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			expect(gameState.attackCounts.execute).toBe(1);
		});

		it('incrementAttackCount with poison type increments the poison counter', () => {
			// Test 1.5: Increment poison hit
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('poison');
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			expect(gameState.attackCounts.poison).toBe(1);
		});

		it('incrementAttackCount with poisonCrit type increments the poisonCrit counter', () => {
			// Test 1.6: Increment poisonCrit hit
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('poisonCrit');
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			expect(gameState.attackCounts.poisonCrit).toBe(1);
		});

		it('multiple increments of the same category accumulate correctly', () => {
			// Test 1.7: Multiple increments same category
			for (let i = 0; i < 5; i++) {
				// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
				gameState.incrementAttackCount('normal');
			}
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			expect(gameState.attackCounts.normal).toBe(5);
		});

		it('different categories are tracked independently', () => {
			// Test 1.8: Multiple categories independently tracked
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('normal');
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('normal');
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('normal');
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('crit');
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('crit');
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('poison');
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			expect(gameState.attackCounts.normal).toBe(3);
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			expect(gameState.attackCounts.crit).toBe(2);
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			expect(gameState.attackCounts.poison).toBe(1);
		});
	});

	describe('Reset Behavior', () => {
		it('resetAttackCounts clears all counters', () => {
			// Test 1.9: Reset clears all counts
			// First add some counts
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('normal');
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('crit');
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('execute');
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('poison');

			// Reset
			// @ts-expect-error - TDD: resetAttackCounts doesn't exist yet
			gameState.resetAttackCounts();

			// All should be 0 or empty
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			const counts = gameState.attackCounts;
			expect(counts.normal ?? 0).toBe(0);
			expect(counts.crit ?? 0).toBe(0);
			expect(counts.execute ?? 0).toBe(0);
			expect(counts.poison ?? 0).toBe(0);
		});

		it('counts correctly after reset when new attacks are tracked', () => {
			// Test 1.10: Reset preserves structure for new counting
			// Add initial counts
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('normal');
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('normal');
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('normal');

			// Reset
			// @ts-expect-error - TDD: resetAttackCounts doesn't exist yet
			gameState.resetAttackCounts();

			// Increment after reset
			// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
			gameState.incrementAttackCount('normal');

			// Should be 1, not 4
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			expect(gameState.attackCounts.normal).toBe(1);
		});
	});

	describe('Edge Cases', () => {
		it('handles 100 rapid increments of the same category', () => {
			// Test 1.11: Rapid increments - 100 normal hits
			for (let i = 0; i < 100; i++) {
				// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
				gameState.incrementAttackCount('normal');
			}
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			expect(gameState.attackCounts.normal).toBe(100);
		});

		it('handles interleaved rapid increments across categories', () => {
			// Test 1.12: Mixed rapid increments
			for (let i = 0; i < 50; i++) {
				// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
				gameState.incrementAttackCount('normal');
			}
			for (let i = 0; i < 30; i++) {
				// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
				gameState.incrementAttackCount('crit');
			}
			for (let i = 0; i < 20; i++) {
				// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
				gameState.incrementAttackCount('execute');
			}
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			expect(gameState.attackCounts.normal).toBe(50);
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			expect(gameState.attackCounts.crit).toBe(30);
			// @ts-expect-error - TDD: attackCounts doesn't exist yet
			expect(gameState.attackCounts.execute).toBe(20);
		});
	});
});

describe('Attack Counts - Reset Integration', () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	it('resetGame clears attackCounts', () => {
		// Test 4.1: resetGame clears attackCounts
		// Setup: add some counts
		// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
		gameState.incrementAttackCount('normal');
		// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
		gameState.incrementAttackCount('crit');

		// Action: call resetGame (this triggers a full run reset)
		gameState.resetGame();

		// Assert: counts should be cleared
		// @ts-expect-error - TDD: attackCounts doesn't exist yet
		const counts = gameState.attackCounts;
		expect(counts.normal ?? 0).toBe(0);
		expect(counts.crit ?? 0).toBe(0);
	});

	it('counts accumulate correctly after a reset', () => {
		// Test 4.3: Counts accumulate after reset
		// Setup initial counts
		// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
		gameState.incrementAttackCount('normal');
		// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
		gameState.incrementAttackCount('normal');

		// Reset
		gameState.resetGame();

		// New attacks after reset
		// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
		gameState.incrementAttackCount('crit');
		// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
		gameState.incrementAttackCount('crit');
		// @ts-expect-error - TDD: incrementAttackCount doesn't exist yet
		gameState.incrementAttackCount('crit');

		// Should have new counts only
		// @ts-expect-error - TDD: attackCounts doesn't exist yet
		expect(gameState.attackCounts.normal ?? 0).toBe(0);
		// @ts-expect-error - TDD: attackCounts doesn't exist yet
		expect(gameState.attackCounts.crit).toBe(3);
	});
});
