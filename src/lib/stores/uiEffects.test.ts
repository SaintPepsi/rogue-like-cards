import { describe, test, expect, vi } from 'vitest';
import { createUIEffects } from './uiEffects.svelte';

describe('createUIEffects', () => {
	test('starts with empty hits and gold drops', () => {
		const ui = createUIEffects();
		expect(ui.hits).toEqual([]);
		expect(ui.goldDrops).toEqual([]);
	});

	test('nextHitId returns incrementing IDs', () => {
		const ui = createUIEffects();
		expect(ui.nextHitId()).toBe(1);
		expect(ui.nextHitId()).toBe(2);
		expect(ui.nextHitId()).toBe(3);
	});

	test('addHits appends hits to array', () => {
		vi.useFakeTimers();
		const ui = createUIEffects();

		ui.addHits([
			{ id: 1, damage: 10, type: 'normal', index: 0 },
			{ id: 2, damage: 20, type: 'crit', index: 1 }
		]);

		expect(ui.hits).toHaveLength(2);
		expect(ui.hits[0].damage).toBe(10);
		expect(ui.hits[1].damage).toBe(20);

		vi.useRealTimers();
	});

	test('addHits auto-cleans after timeout', () => {
		vi.useFakeTimers();
		const ui = createUIEffects();

		ui.addHits([{ id: 1, damage: 10, type: 'normal', index: 0 }]);
		expect(ui.hits).toHaveLength(1);

		vi.advanceTimersByTime(1000);
		expect(ui.hits).toHaveLength(0);

		vi.useRealTimers();
	});

	test('addGoldDrop appends gold drop', () => {
		vi.useFakeTimers();
		const ui = createUIEffects();

		ui.addGoldDrop(50);
		expect(ui.goldDrops).toHaveLength(1);
		expect(ui.goldDrops[0].amount).toBe(50);

		vi.useRealTimers();
	});

	test('addGoldDrop auto-cleans after timeout', () => {
		vi.useFakeTimers();
		const ui = createUIEffects();

		ui.addGoldDrop(50);
		expect(ui.goldDrops).toHaveLength(1);

		vi.advanceTimersByTime(1500);
		expect(ui.goldDrops).toHaveLength(0);

		vi.useRealTimers();
	});

	test('multiple hits coexist when added rapidly', () => {
		vi.useFakeTimers();
		const ui = createUIEffects();

		ui.addHits([{ id: 1, damage: 10, type: 'normal', index: 0 }]);
		ui.addHits([{ id: 2, damage: 20, type: 'crit', index: 0 }]);
		ui.addHits([{ id: 3, damage: 30, type: 'normal', index: 0 }]);

		expect(ui.hits).toHaveLength(3);

		vi.useRealTimers();
	});

	test('reset clears all state', () => {
		vi.useFakeTimers();
		const ui = createUIEffects();

		ui.addHits([{ id: 1, damage: 10, type: 'normal', index: 0 }]);
		ui.addGoldDrop(50);

		ui.reset();
		expect(ui.hits).toEqual([]);
		expect(ui.goldDrops).toEqual([]);

		vi.useRealTimers();
	});
});
