import { describe, test, expect } from 'vitest';
import { createStackManager } from './stackManager';

describe('refresh-shortest policy', () => {
	const mgr = createStackManager({ max: 3, refreshPolicy: 'refresh-shortest' });

	test('add creates new stack', () => {
		const stacks = mgr.add([], 5);
		expect(stacks).toEqual([5]);
	});

	test('add multiple stacks up to max', () => {
		let stacks = mgr.add([], 5);
		stacks = mgr.add(stacks, 5);
		stacks = mgr.add(stacks, 5);
		expect(stacks).toHaveLength(3);
	});

	test('add at max refreshes shortest stack', () => {
		const stacks = [3, 5, 4]; // shortest is index 0 (3)
		const result = mgr.add(stacks, 6);
		expect(result).toHaveLength(3);
		expect(result).toContain(6); // new stack
		expect(result).not.toContain(3); // shortest was replaced
	});

	test('tick decrements all stacks', () => {
		const result = mgr.tick([3, 5, 4]);
		expect(result).toEqual([2, 4, 3]);
	});

	test('tick removes expired stacks', () => {
		const result = mgr.tick([1, 5, 1]);
		expect(result).toEqual([4]); // 1s expired
	});

	test('tick on empty returns empty', () => {
		expect(mgr.tick([])).toEqual([]);
	});

	test('clear returns empty', () => {
		expect(mgr.clear()).toEqual([]);
	});

	test('add with count adds multiple', () => {
		const stacks = mgr.add([], 5, 2);
		expect(stacks).toEqual([5, 5]);
	});

	test('add with count respects max', () => {
		const stacks = mgr.add([], 5, 10); // max is 3
		expect(stacks).toHaveLength(3);
	});
});

describe('add-new policy', () => {
	const mgr = createStackManager({ max: 3, refreshPolicy: 'add-new' });

	test('drops oldest when at cap', () => {
		const stacks = [5, 4, 3]; // oldest is first
		const result = mgr.add(stacks, 6);
		expect(result).toHaveLength(3);
		expect(result[0]).toBe(4); // oldest (5) dropped
		expect(result[2]).toBe(6); // new added at end
	});
});

describe('unlimited policy', () => {
	const mgr = createStackManager({ max: Infinity, refreshPolicy: 'unlimited' });

	test('grows without limit', () => {
		let stacks: number[] = [];
		for (let i = 0; i < 100; i++) {
			stacks = mgr.add(stacks, 5);
		}
		expect(stacks).toHaveLength(100);
	});
});
