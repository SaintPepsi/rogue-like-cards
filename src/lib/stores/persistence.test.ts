import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPersistence } from './persistence.svelte';

// Mock localStorage for Node environment
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		}
	};
})();

vi.stubGlobal('localStorage', localStorageMock);

describe('persistence - hasCompletedFirstRun', () => {
	const persistence = createPersistence('test-session', 'test-persistent');

	beforeEach(() => {
		localStorageMock.clear();
	});

	it('saves and loads hasCompletedFirstRun flag', () => {
		persistence.savePersistent({
			gold: 0,
			purchasedUpgradeCounts: {},
			executeCapBonus: 0,
			hasCompletedFirstRun: true
		});

		const loaded = persistence.loadPersistent();
		expect(loaded?.hasCompletedFirstRun).toBe(true);
	});

	it('returns null when no save data exists', () => {
		const loaded = persistence.loadPersistent();
		expect(loaded).toBe(null);
	});

	it('defaults hasCompletedFirstRun to false for legacy saves without the flag', () => {
		// Simulate a legacy save without hasCompletedFirstRun
		localStorage.setItem(
			'test-persistent',
			JSON.stringify({
				gold: 100,
				purchasedUpgradeCounts: { 'some-upgrade': 1 },
				executeCapBonus: 5
			})
		);

		const loaded = persistence.loadPersistent();
		expect(loaded?.hasCompletedFirstRun).toBe(false);
	});
});
