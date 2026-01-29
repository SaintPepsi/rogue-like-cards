import { describe, test, expect } from 'vitest';
import { getCardPrice } from './shop';

describe('getCardPrice', () => {
	test('common base price with 0 purchases', () => {
		expect(getCardPrice('common', 0)).toBe(10);
	});

	test('uncommon base price with 0 purchases', () => {
		expect(getCardPrice('uncommon', 0)).toBe(20);
	});

	test('rare base price with 0 purchases', () => {
		expect(getCardPrice('rare', 0)).toBe(35);
	});

	test('epic base price with 0 purchases', () => {
		expect(getCardPrice('epic', 0)).toBe(60);
	});

	test('legendary base price with 0 purchases', () => {
		expect(getCardPrice('legendary', 0)).toBe(100);
	});

	test('price scales with purchase count using 1.5x multiplier', () => {
		// common: 10 * 1.5^1 = 15
		expect(getCardPrice('common', 1)).toBe(15);
		// common: 10 * 1.5^2 = 22.5 -> 23
		expect(getCardPrice('common', 2)).toBe(23);
		// common: 10 * 1.5^3 = 33.75 -> 34
		expect(getCardPrice('common', 3)).toBe(34);
	});

	test('higher rarity scales more steeply', () => {
		// epic: 60 * 1.5^1 = 90
		expect(getCardPrice('epic', 1)).toBe(90);
		// epic: 60 * 1.5^2 = 135
		expect(getCardPrice('epic', 2)).toBe(135);
		// legendary: 100 * 1.5^1 = 150
		expect(getCardPrice('legendary', 1)).toBe(150);
	});
});
