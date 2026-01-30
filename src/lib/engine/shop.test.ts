import { describe, test, expect } from 'vitest';
import { getCardPrice } from './shop';

describe('getCardPrice', () => {
	test('common base price with 0 purchases', () => {
		expect(getCardPrice('common', 0)).toBe(25);
	});

	test('uncommon base price with 0 purchases', () => {
		expect(getCardPrice('uncommon', 0)).toBe(50);
	});

	test('rare base price with 0 purchases', () => {
		expect(getCardPrice('rare', 0)).toBe(100);
	});

	test('epic base price with 0 purchases', () => {
		expect(getCardPrice('epic', 0)).toBe(175);
	});

	test('legendary base price with 0 purchases', () => {
		expect(getCardPrice('legendary', 0)).toBe(300);
	});

	test('price scales with purchase count using 1.5x multiplier', () => {
		// common: 25 * 1.5^1 = 37.5 -> 38
		expect(getCardPrice('common', 1)).toBe(38);
		// common: 25 * 1.5^2 = 56.25 -> 56
		expect(getCardPrice('common', 2)).toBe(56);
		// common: 25 * 1.5^3 = 84.375 -> 84
		expect(getCardPrice('common', 3)).toBe(84);
	});

	test('higher rarity scales more steeply', () => {
		// epic: 175 * 1.5^1 = 262.5 -> 263
		expect(getCardPrice('epic', 1)).toBe(263);
		// epic: 175 * 1.5^2 = 393.75 -> 394
		expect(getCardPrice('epic', 2)).toBe(394);
		// legendary: 300 * 1.5^1 = 450
		expect(getCardPrice('legendary', 1)).toBe(450);
	});
});
