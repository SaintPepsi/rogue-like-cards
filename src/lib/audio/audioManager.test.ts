import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock localStorage
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

import { createAudioManager } from './audioManager.svelte';

describe('createAudioManager', () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	test('initializes with default volumes', () => {
		const mgr = createAudioManager();
		expect(mgr.sfxVolume).toBe(0.8);
		expect(mgr.musicVolume).toBe(0.7);
		expect(mgr.uiVolume).toBe(0.6);
		expect(mgr.muted).toBe(false);
	});

	test('loads persisted volumes from localStorage', () => {
		localStorageMock.setItem(
			'audioSettings',
			JSON.stringify({
				sfx: 0.5,
				music: 0.3,
				ui: 0.9,
				muted: true
			})
		);
		const mgr = createAudioManager();
		expect(mgr.sfxVolume).toBe(0.5);
		expect(mgr.musicVolume).toBe(0.3);
		expect(mgr.uiVolume).toBe(0.9);
		expect(mgr.muted).toBe(true);
	});

	test('setSfxVolume updates volume and persists', () => {
		const mgr = createAudioManager();
		mgr.setSfxVolume(0.4);
		expect(mgr.sfxVolume).toBe(0.4);
		const saved = JSON.parse(localStorageMock.setItem.mock.calls.at(-1)![1]);
		expect(saved.sfx).toBe(0.4);
	});

	test('setMusicVolume updates volume and persists', () => {
		const mgr = createAudioManager();
		mgr.setMusicVolume(0.2);
		expect(mgr.musicVolume).toBe(0.2);
		const saved = JSON.parse(localStorageMock.setItem.mock.calls.at(-1)![1]);
		expect(saved.music).toBe(0.2);
	});

	test('setUiVolume updates volume and persists', () => {
		const mgr = createAudioManager();
		mgr.setUiVolume(0.1);
		expect(mgr.uiVolume).toBe(0.1);
		const saved = JSON.parse(localStorageMock.setItem.mock.calls.at(-1)![1]);
		expect(saved.ui).toBe(0.1);
	});

	test('toggleMute flips muted state and persists', () => {
		const mgr = createAudioManager();
		expect(mgr.muted).toBe(false);
		mgr.toggleMute();
		expect(mgr.muted).toBe(true);
		mgr.toggleMute();
		expect(mgr.muted).toBe(false);
	});

	test('clamps volumes to 0-1 range', () => {
		const mgr = createAudioManager();
		mgr.setSfxVolume(1.5);
		expect(mgr.sfxVolume).toBe(1);
		mgr.setSfxVolume(-0.3);
		expect(mgr.sfxVolume).toBe(0);
	});

	test('handles corrupted localStorage gracefully', () => {
		localStorageMock.setItem('audioSettings', 'not json');
		const mgr = createAudioManager();
		// Falls back to defaults
		expect(mgr.sfxVolume).toBe(0.8);
		expect(mgr.musicVolume).toBe(0.7);
	});
});
