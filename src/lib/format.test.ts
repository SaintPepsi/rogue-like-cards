import { describe, test, expect } from 'vitest';
// @ts-expect-error - TDD: formatAttackType doesn't exist yet
import { formatNumber, formatAttackType } from './format';

describe('formatNumber', () => {
	describe('small numbers (< 1000)', () => {
		test('zero', () => {
			expect(formatNumber(0)).toBe('0');
		});

		test('single digit', () => {
			expect(formatNumber(5)).toBe('5');
		});

		test('floors decimals', () => {
			expect(formatNumber(9.99)).toBe('9');
		});

		test('999', () => {
			expect(formatNumber(999)).toBe('999');
		});
	});

	describe('thousands (K)', () => {
		test('1,000', () => {
			expect(formatNumber(1000)).toBe('1.00K');
		});

		test('1,500', () => {
			expect(formatNumber(1500)).toBe('1.50K');
		});

		test('15,000', () => {
			expect(formatNumber(15000)).toBe('15.0K');
		});

		test('150,000', () => {
			expect(formatNumber(150000)).toBe('150K');
		});

		test('999,999', () => {
			// floor(999999 / 1000) = 999
			expect(formatNumber(999999)).toBe('999K');
		});
	});

	describe('millions (M)', () => {
		test('1 million', () => {
			expect(formatNumber(1e6)).toBe('1.00M');
		});

		test('5.5 million', () => {
			expect(formatNumber(5.5e6)).toBe('5.50M');
		});

		test('999 million', () => {
			expect(formatNumber(999e6)).toBe('999M');
		});
	});

	describe('billions (B)', () => {
		test('1 billion', () => {
			expect(formatNumber(1e9)).toBe('1.00B');
		});

		test('42.5 billion', () => {
			expect(formatNumber(42.5e9)).toBe('42.5B');
		});
	});

	describe('trillions (T)', () => {
		test('1 trillion', () => {
			expect(formatNumber(1e12)).toBe('1.00T');
		});
	});

	describe('quadrillions through decillions', () => {
		test('Qa - quadrillion (1e15)', () => {
			expect(formatNumber(1e15)).toBe('1.00Qa');
		});

		test('Qi - quintillion (1e18)', () => {
			expect(formatNumber(1e18)).toBe('1.00Qi');
		});

		test('Sx - sextillion (1e21)', () => {
			expect(formatNumber(1e21)).toBe('1.00Sx');
		});

		test('Sp - septillion (1e24)', () => {
			expect(formatNumber(1e24)).toBe('1.00Sp');
		});

		test('Oc - octillion (1e27)', () => {
			expect(formatNumber(1e27)).toBe('1.00Oc');
		});

		test('No - nonillion (1e30)', () => {
			expect(formatNumber(1e30)).toBe('1.00No');
		});

		test('Dc - decillion (1e33)', () => {
			expect(formatNumber(1e33)).toBe('1.00Dc');
		});
	});

	describe('beyond decillion - extended suffixes', () => {
		test('UDc - undecillion (1e36)', () => {
			expect(formatNumber(1e36)).toBe('1.00UDc');
		});

		test('DDc - duodecillion (1e39)', () => {
			expect(formatNumber(1e39)).toBe('1.00DDc');
		});

		test('Vg - vigintillion (1e63)', () => {
			expect(formatNumber(1e63)).toBe('1.00Vg');
		});

		test('Ce - centillion (1e303)', () => {
			expect(formatNumber(1e303)).toBe('1.00Ce');
		});
	});

	describe('scientific notation fallback for extreme numbers', () => {
		test('beyond centillion uses scientific notation', () => {
			const result = formatNumber(1e306);
			expect(result).toMatch(/^\d\.\d{2}e\d+$/);
			expect(result).toBe('1.00e306');
		});
	});

	describe('edge cases', () => {
		test('Infinity', () => {
			expect(formatNumber(Infinity)).toBe('∞');
		});

		test('negative Infinity', () => {
			expect(formatNumber(-Infinity)).toBe('∞');
		});

		test('NaN', () => {
			expect(formatNumber(NaN)).toBe('∞');
		});
	});

	describe('no scientific notation leaks at any scale', () => {
		// This is the key bug test: previously numbers like 5e54 would display as "5.04e+21Dc"
		const testScales = [
			1e3, 1e6, 1e9, 1e12, 1e15, 1e18, 1e21, 1e24, 1e27, 1e30, 1e33, 1e36, 1e39, 1e42, 1e45, 1e48,
			1e51, 1e54, 1e57, 1e60, 1e63, 1e66, 1e69, 1e72, 1e75, 1e78, 1e81, 1e84, 1e87, 1e90, 1e93,
			1e96, 1e99, 1e102, 1e150, 1e200, 1e250, 1e300, 1e303
		];

		for (const n of testScales) {
			test(`${n.toExponential()} does not contain 'e+' in formatted output`, () => {
				const result = formatNumber(n);
				// Should not contain JavaScript scientific notation (e+)
				expect(result).not.toMatch(/e\+/);
				// Should be a reasonable length
				expect(result.length).toBeLessThan(20);
			});
		}
	});

	describe('values between tiers display correctly', () => {
		test('5.04e54 formats with correct suffix', () => {
			// This was the exact value from the bug report screenshot
			const result = formatNumber(5.04e54);
			expect(result).not.toMatch(/e\+/);
			expect(result).toBe('5.04SpDc');
		});

		test('3.36e21 formats as sextillions', () => {
			const result = formatNumber(3.36e21);
			expect(result).toBe('3.36Sx');
		});
	});
});

/**
 * formatAttackType Tests
 *
 * Tests for the attack type display label formatting function.
 * This function will be used in BattleArea and GameOverModal to display
 * human-readable labels for attack categories.
 *
 * These tests are written BEFORE the function exists (TDD) and should FAIL initially.
 */
describe('formatAttackType', () => {
	test('formats normal as "Normal Hits"', () => {
		// Test 5.1: Format normal
		expect(formatAttackType('normal')).toBe('Normal Hits');
	});

	test('formats crit as "Critical Hits"', () => {
		// Test 5.2: Format crit
		expect(formatAttackType('crit')).toBe('Critical Hits');
	});

	test('formats execute as "Executes"', () => {
		// Test 5.3: Format execute
		expect(formatAttackType('execute')).toBe('Executes');
	});

	test('formats poison as "Poison Ticks"', () => {
		// Test 5.4: Format poison
		expect(formatAttackType('poison')).toBe('Poison Ticks');
	});

	test('formats poisonCrit as "Poison Crits"', () => {
		// Test 5.5: Format poisonCrit
		expect(formatAttackType('poisonCrit')).toBe('Poison Crits');
	});

	test('returns unknown type as passthrough', () => {
		// Test 5.6: Format unknown type
		expect(formatAttackType('unknown')).toBe('unknown');
	});

	test('handles empty string by returning it', () => {
		// Edge case: empty string
		expect(formatAttackType('')).toBe('');
	});
});
