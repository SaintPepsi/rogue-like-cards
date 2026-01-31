import { test, expect, describe } from 'vitest';
import { createTimerRegistry } from '$lib/engine/timerRegistry';

// Tests frenzy stack decay using the timer registry directly,
// mirroring how createFrenzy() registers per-stack timers.

describe('frenzy stack decay', () => {
	test('stacks expire independently after their duration', () => {
		const timers = createTimerRegistry();
		let frenzyCount = 0;
		let frenzyId = 0;

		function addFrenzyStack(duration: number) {
			frenzyId++;
			frenzyCount++;
			const id = frenzyId;
			timers.register(`frenzy_${id}`, {
				remaining: duration,
				onExpire: () => {
					frenzyCount = Math.max(0, frenzyCount - 1);
				}
			});
		}

		// Add 3 stacks at different times
		addFrenzyStack(3000);
		expect(frenzyCount).toBe(1);

		timers.tick(500);
		addFrenzyStack(3000);
		expect(frenzyCount).toBe(2);

		timers.tick(500);
		addFrenzyStack(3000);
		expect(frenzyCount).toBe(3);

		// After 2000ms more, first stack expires (3000 - 0 - 500 - 500 - 2000 = 0)
		timers.tick(2000);
		expect(frenzyCount).toBe(2);

		// After 500ms more, second stack expires
		timers.tick(500);
		expect(frenzyCount).toBe(1);

		// After 500ms more, third stack expires
		timers.tick(500);
		expect(frenzyCount).toBe(0);
	});

	test('count never goes below zero', () => {
		const timers = createTimerRegistry();
		let frenzyCount = 0;

		timers.register('frenzy_1', {
			remaining: 1000,
			onExpire: () => {
				frenzyCount = Math.max(0, frenzyCount - 1);
			}
		});

		// Manually set count to 0 before expiry (simulating a reset)
		frenzyCount = 0;
		timers.tick(1000);
		expect(frenzyCount).toBe(0);
	});
});
