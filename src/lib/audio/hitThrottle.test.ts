import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createHitThrottle } from './hitThrottle';

describe('createHitThrottle', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	test('allows sounds under the limit', () => {
		const throttle = createHitThrottle({ maxHits: 4, windowMs: 100 });
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
		expect(throttle.shouldPlay('hit:crit')).toBe(true);
		expect(throttle.shouldPlay('hit:poison')).toBe(true);
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
	});

	test('blocks low-priority sounds over the limit', () => {
		const throttle = createHitThrottle({ maxHits: 3, windowMs: 100 });
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
		expect(throttle.shouldPlay('hit:crit')).toBe(true);
		expect(throttle.shouldPlay('hit:poison')).toBe(true);
		// 4th hit in window — blocked
		expect(throttle.shouldPlay('hit:normal')).toBe(false);
	});

	test('always allows execute and poisonCrit even over limit', () => {
		const throttle = createHitThrottle({ maxHits: 2, windowMs: 100 });
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
		expect(throttle.shouldPlay('hit:crit')).toBe(true);
		// At limit, but high-priority always plays
		expect(throttle.shouldPlay('hit:execute')).toBe(true);
		expect(throttle.shouldPlay('hit:poisonCrit')).toBe(true);
	});

	test('resets after window expires', () => {
		const throttle = createHitThrottle({ maxHits: 2, windowMs: 100 });
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
		expect(throttle.shouldPlay('hit:normal')).toBe(false);

		vi.advanceTimersByTime(101);

		// Window expired — should allow again
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
	});

	test('does not throttle non-hit events', () => {
		const throttle = createHitThrottle({ maxHits: 1, windowMs: 100 });
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
		// At limit for hits
		expect(throttle.shouldPlay('hit:normal')).toBe(false);
		// Non-hit events always pass through (shouldPlay returns true for non-hit)
		expect(throttle.shouldPlay('enemy:death')).toBe(true);
		expect(throttle.shouldPlay('gold:drop')).toBe(true);
	});

	test('sliding window evicts old entries', () => {
		const throttle = createHitThrottle({ maxHits: 2, windowMs: 100 });
		expect(throttle.shouldPlay('hit:normal')).toBe(true);

		vi.advanceTimersByTime(60);
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
		// At limit (both within 100ms window)
		expect(throttle.shouldPlay('hit:normal')).toBe(false);

		vi.advanceTimersByTime(50);
		// First entry (at t=0) is now >100ms ago — evicted
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
	});
});
