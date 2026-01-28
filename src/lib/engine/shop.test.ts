import { describe, test, expect } from 'vitest';
import { getCardPrice } from './shop';

describe('getCardPrice', () => {
	test('slot 0 base price with 0 purchased', () => {
		expect(getCardPrice(0, 0)).toBe(10);
	});

	test('slot 1 base price with 0 purchased', () => {
		expect(getCardPrice(1, 0)).toBe(15);
	});

	test('slot 2 base price with 0 purchased', () => {
		expect(getCardPrice(2, 0)).toBe(25);
	});

	test('price increases by 5 per purchased upgrade', () => {
		expect(getCardPrice(0, 3)).toBe(25);
		expect(getCardPrice(1, 3)).toBe(30);
		expect(getCardPrice(2, 3)).toBe(40);
	});
});
