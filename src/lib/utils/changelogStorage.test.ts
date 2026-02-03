import { describe, test, expect, beforeEach, vi } from 'vitest';
import { getLastSeenVersion, setLastSeenVersion, STORAGE_KEY } from './changelogStorage';

// Mock localStorage for testing
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		})
	};
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });
Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true });

describe('changelogStorage', () => {
	beforeEach(() => {
		// Clear localStorage before each test
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	describe('getLastSeenVersion', () => {
		test('returns null when no version stored', () => {
			expect(getLastSeenVersion()).toBe(null);
		});

		test('returns stored version', () => {
			localStorage.setItem(STORAGE_KEY, '0.12.0');
			expect(getLastSeenVersion()).toBe('0.12.0');
		});
	});

	describe('setLastSeenVersion', () => {
		test('stores version in localStorage', () => {
			setLastSeenVersion('0.13.0');
			expect(localStorage.getItem(STORAGE_KEY)).toBe('0.13.0');
		});

		test('overwrites existing version', () => {
			localStorage.setItem(STORAGE_KEY, '0.12.0');
			setLastSeenVersion('0.14.0');
			expect(localStorage.getItem(STORAGE_KEY)).toBe('0.14.0');
		});
	});
});
