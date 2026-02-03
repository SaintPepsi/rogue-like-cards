import { describe, test, expect } from 'vitest';
import {
	isVersionGreaterThan,
	getNewChangelogEntries,
	getPreviousMinorVersion
} from './versionComparison';
import type { ChangelogEntry } from '$lib/changelog';

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

describe('getNewChangelogEntries', () => {
	const mockChangelog: ChangelogEntry[] = [
		{
			version: '0.5.0',
			date: '2026-01-29',
			changes: [{ category: 'new', description: 'Latest feature' }]
		},
		{
			version: '0.4.0',
			date: '2026-01-28',
			changes: [{ category: 'changed', description: 'Some change' }]
		},
		{
			version: '0.3.0',
			date: '2026-01-27',
			changes: [{ category: 'fixed', description: 'Bug fix' }]
		},
		{
			version: '0.2.0',
			date: '2026-01-26',
			changes: [{ category: 'new', description: 'Old feature' }]
		}
	];

	test('returns entries newer than last seen version', () => {
		const result = getNewChangelogEntries(mockChangelog, '0.3.0');
		expect(result).toHaveLength(2);
		expect(result[0].version).toBe('0.5.0');
		expect(result[1].version).toBe('0.4.0');
	});

	test('returns empty array when no new entries', () => {
		const result = getNewChangelogEntries(mockChangelog, '0.5.0');
		expect(result).toEqual([]);
	});

	test('returns all entries when last seen is very old', () => {
		const result = getNewChangelogEntries(mockChangelog, '0.1.0');
		expect(result).toHaveLength(4);
		expect(result[0].version).toBe('0.5.0');
		expect(result[3].version).toBe('0.2.0');
	});
});

describe('getPreviousMinorVersion', () => {
	test('decrements minor version by 1', () => {
		expect(getPreviousMinorVersion('0.5.0')).toBe('0.4.0');
		expect(getPreviousMinorVersion('1.10.0')).toBe('1.9.0');
	});

	test('handles version with patch number', () => {
		expect(getPreviousMinorVersion('0.5.3')).toBe('0.4.0');
		expect(getPreviousMinorVersion('2.8.12')).toBe('2.7.0');
	});

	test('handles minor version 0', () => {
		expect(getPreviousMinorVersion('1.0.0')).toBe('0.0.0');
		expect(getPreviousMinorVersion('2.0.5')).toBe('1.0.0');
	});

	test('handles major version rollover', () => {
		expect(getPreviousMinorVersion('0.0.0')).toBe('0.0.0');
	});
});
