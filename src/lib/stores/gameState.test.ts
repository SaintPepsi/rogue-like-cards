import { describe, it, expect, beforeEach } from 'vitest';
import { gameState } from './gameState.svelte';

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
