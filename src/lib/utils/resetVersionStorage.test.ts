import { describe, test, expect, beforeEach, vi } from 'vitest';
import { getLastResetVersion, setLastResetVersion, RESET_STORAGE_KEY } from './resetVersionStorage';

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

describe('resetVersionStorage', () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	test('getLastResetVersion returns null when no version is stored', () => {
		expect(getLastResetVersion()).toBe(null);
	});

	test('setLastResetVersion stores version in localStorage', () => {
		setLastResetVersion('0.42.0');
		expect(localStorage.getItem(RESET_STORAGE_KEY)).toBe('0.42.0');
	});

	test('getLastResetVersion returns stored version', () => {
		localStorage.setItem(RESET_STORAGE_KEY, '0.50.0');
		expect(getLastResetVersion()).toBe('0.50.0');
	});

	test('setLastResetVersion overwrites existing version', () => {
		setLastResetVersion('0.42.0');
		setLastResetVersion('0.50.0');
		expect(getLastResetVersion()).toBe('0.50.0');
	});
});
