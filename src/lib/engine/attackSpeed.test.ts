import { describe, test, expect } from 'vitest';
import { getEffectiveAttackSpeed, getAttackIntervalMs } from '$lib/engine/attackSpeed';

describe('getEffectiveAttackSpeed', () => {
	test('returns base speed with 0 frenzy stacks', () => {
		expect(getEffectiveAttackSpeed(0.8, 0, 0.05)).toBe(0.8);
	});

	test('increases speed with frenzy stacks', () => {
		// 0.8 * (1 + 5 * 0.05) = 0.8 * 1.25 = 1.0
		expect(getEffectiveAttackSpeed(0.8, 5, 0.05)).toBe(1.0);
	});

	test('scales linearly with stack count', () => {
		expect(getEffectiveAttackSpeed(0.8, 10, 0.05)).toBeCloseTo(1.2);
	});

	test('handles zero bonus gracefully', () => {
		expect(getEffectiveAttackSpeed(0.8, 10, 0)).toBe(0.8);
	});
});

describe('getAttackIntervalMs', () => {
	test('converts attacks/sec to interval', () => {
		expect(getAttackIntervalMs(0.8)).toBe(1250);
	});

	test('1 attack/sec = 1000ms', () => {
		expect(getAttackIntervalMs(1.0)).toBe(1000);
	});

	test('returns Infinity for 0 speed', () => {
		expect(getAttackIntervalMs(0)).toBe(Infinity);
	});

	test('returns Infinity for negative speed', () => {
		expect(getAttackIntervalMs(-1)).toBe(Infinity);
	});
});
