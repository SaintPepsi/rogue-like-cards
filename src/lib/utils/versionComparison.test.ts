import { describe, test, expect } from 'vitest';
import { isVersionGreaterThan } from './versionComparison';

describe('isVersionGreaterThan', () => {
	test('returns true when major version is greater', () => {
		expect(isVersionGreaterThan('2.0.0', '1.0.0')).toBe(true);
		expect(isVersionGreaterThan('3.5.2', '2.9.9')).toBe(true);
	});

	test('returns false when major version is less', () => {
		expect(isVersionGreaterThan('1.0.0', '2.0.0')).toBe(false);
		expect(isVersionGreaterThan('2.9.9', '3.0.0')).toBe(false);
	});

	test('returns true when major same, minor greater', () => {
		expect(isVersionGreaterThan('1.2.0', '1.1.0')).toBe(true);
		expect(isVersionGreaterThan('1.10.0', '1.9.0')).toBe(true);
	});

	test('returns false when major same, minor less', () => {
		expect(isVersionGreaterThan('1.1.0', '1.2.0')).toBe(false);
		expect(isVersionGreaterThan('1.9.0', '1.10.0')).toBe(false);
	});

	test('returns true when major and minor same, patch greater', () => {
		expect(isVersionGreaterThan('1.1.2', '1.1.1')).toBe(true);
		expect(isVersionGreaterThan('1.1.10', '1.1.9')).toBe(true);
	});

	test('returns false when major and minor same, patch less', () => {
		expect(isVersionGreaterThan('1.1.1', '1.1.2')).toBe(false);
		expect(isVersionGreaterThan('1.1.9', '1.1.10')).toBe(false);
	});

	test('returns false when versions are equal', () => {
		expect(isVersionGreaterThan('1.0.0', '1.0.0')).toBe(false);
		expect(isVersionGreaterThan('2.5.3', '2.5.3')).toBe(false);
	});
});
