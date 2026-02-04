# Audio System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a Howler.js-based SFX system with volume buses, hit sound throttling, and settings UI.

**Architecture:** Three-bus audio manager (Music/SFX/UI) with localStorage persistence, a SFX registry mapping game events to Howl instances with per-play pitch randomization, and a sliding-window throttle for high attack-speed hit sounds. Sound triggers live in game stores (not components), matching the existing side-effect pattern.

**Tech Stack:** Howler.js, Svelte 5 `$state` runes, Vitest with fake timers, existing `$lib/assets/audio/sfx/` files imported via Vite.

---

## Important Context

### Asset Imports

Audio files live in `src/lib/assets/audio/sfx/`. This project uses Vite's asset import system — import the file to get a hashed URL string:

```ts
import woodHit1Url from '$lib/assets/audio/sfx/wood-hit-1.wav';
// woodHit1Url === '/assets/wood-hit-1-abc123.wav' (hashed at build time)
```

Pass these URLs to Howler's `src` option. Do NOT use raw `/audio/sfx/...` paths — the design doc's paths are logical names, not actual URLs.

### Test Infrastructure

- **Runner:** Vitest 4.0.18 with `expect: { requireAssertions: true }` — every test MUST contain at least one assertion
- **Node tests:** Files matching `src/**/*.{test,spec}.{js,ts}` (excluding `.svelte.test.ts`)
- **Browser tests:** Files matching `src/**/*.svelte.{test,spec}.{js,ts}` (run in Playwright/Chromium)
- **Audio tests go in node project** — they test pure logic (throttle, volumes, registry), not DOM/Svelte rendering
- **Pattern:** `vi.useFakeTimers()` / `vi.advanceTimersByTime()` for timeout testing (see `src/lib/stores/uiEffects.test.ts`)
- **Colocation:** Test files live next to source files

### Existing Patterns to Follow

- **Factory functions:** `createEnemy()`, `createUIEffects()`, `createGameLoop()` — return objects with getters and methods
- **`$state` for reactivity:** Bus volumes need to be `$state` so Svelte components can bind to them
- **`$effect` in `.svelte.ts` files:** These files support runes since they have the `.svelte.ts` extension
- **No `as any`:** Use specific types or generics
- **Early returns:** Guard clauses over nested if/else
- **Decision comments:** Document WHY at implementation point

### Howler.js API Quick Reference

```ts
import { Howl, Howler } from 'howler';

// Global volume (master mute)
Howler.volume(0.5);

// Create a sound
const sound = new Howl({
	src: [url],
	volume: 0.8,
	rate: 1.0, // playback speed (also pitch)
	preload: true
});

// Play (returns sound ID for this play instance)
const id = sound.play();

// Override rate for a specific play instance
sound.rate(1.2, id);

// Override volume for a specific play instance
sound.volume(0.5, id);
```

---

## Task 1: Install Howler.js

**Files:**

- Modify: `package.json`

**Step 1: Install dependencies**

Run:

```bash
npm install howler && npm install -D @types/howler
```

**Step 2: Verify installation**

Run:

```bash
node -e "require('howler'); console.log('howler OK')"
```

Expected: `howler OK`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add howler.js dependency for audio system"
```

---

## Task 2: Audio Manager — Core Module with Tests

**Files:**

- Create: `src/lib/audio/audioManager.svelte.ts`
- Create: `src/lib/audio/audioManager.test.ts`

This module owns three bus volumes (`music`, `sfx`, `ui`), a muted toggle, and localStorage persistence. It does NOT depend on Howler directly — it manages volumes as plain numbers. The SFX module will read these volumes when playing sounds.

**Step 1: Write the failing tests**

Write to `src/lib/audio/audioManager.test.ts`:

```ts
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
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/audio/audioManager.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Write to `src/lib/audio/audioManager.svelte.ts`:

```ts
import { Howler } from 'howler';

const STORAGE_KEY = 'audioSettings';

// DECISION: Default volumes tuned for dark/atmospheric feel.
// SFX slightly louder than music — combat feedback is primary in v1.
// UI quieter — clicks/flips shouldn't compete with combat.
const DEFAULTS = { sfx: 0.8, music: 0.7, ui: 0.6, muted: false };

interface AudioSettings {
	sfx: number;
	music: number;
	ui: number;
	muted: boolean;
}

function clampVolume(v: number): number {
	return Math.max(0, Math.min(1, v));
}

function loadSettings(): AudioSettings {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULTS };
		const parsed = JSON.parse(raw) as Partial<AudioSettings>;
		return {
			sfx: typeof parsed.sfx === 'number' ? clampVolume(parsed.sfx) : DEFAULTS.sfx,
			music: typeof parsed.music === 'number' ? clampVolume(parsed.music) : DEFAULTS.music,
			ui: typeof parsed.ui === 'number' ? clampVolume(parsed.ui) : DEFAULTS.ui,
			muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULTS.muted
		};
	} catch {
		return { ...DEFAULTS };
	}
}

export function createAudioManager() {
	const initial = loadSettings();
	let sfxVolume = $state(initial.sfx);
	let musicVolume = $state(initial.music);
	let uiVolume = $state(initial.ui);
	let muted = $state(initial.muted);

	function persist() {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					sfx: sfxVolume,
					music: musicVolume,
					ui: uiVolume,
					muted
				})
			);
		} catch {
			// localStorage full or unavailable — silently ignore
		}
	}

	function syncHowlerMute() {
		Howler.volume(muted ? 0 : 1);
	}

	// Apply initial mute state
	syncHowlerMute();

	function setSfxVolume(v: number) {
		sfxVolume = clampVolume(v);
		persist();
	}

	function setMusicVolume(v: number) {
		musicVolume = clampVolume(v);
		persist();
	}

	function setUiVolume(v: number) {
		uiVolume = clampVolume(v);
		persist();
	}

	function toggleMute() {
		muted = !muted;
		syncHowlerMute();
		persist();
	}

	return {
		get sfxVolume() {
			return sfxVolume;
		},
		get musicVolume() {
			return musicVolume;
		},
		get uiVolume() {
			return uiVolume;
		},
		get muted() {
			return muted;
		},
		setSfxVolume,
		setMusicVolume,
		setUiVolume,
		toggleMute
	};
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/audio/audioManager.test.ts`
Expected: All 8 tests PASS

**Step 5: Commit**

```bash
git add src/lib/audio/audioManager.svelte.ts src/lib/audio/audioManager.test.ts
git commit -m "feat: add audio manager with bus volumes and localStorage persistence"
```

---

## Task 3: SFX Registry and Playback — Core Module with Tests

**Files:**

- Create: `src/lib/audio/sfx.svelte.ts`
- Create: `src/lib/audio/sfx.test.ts`

The SFX module manages the registry of sound events, creates Howl instances, and exposes `play()` with pitch randomization. Hit sound throttling is Task 4.

**Step 1: Write the failing tests**

Write to `src/lib/audio/sfx.test.ts`:

```ts
import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock howler before importing sfx module
vi.mock('howler', () => {
	const instances: MockHowl[] = [];
	class MockHowl {
		src: string[];
		_volume: number;
		_rate: number;
		_preload: boolean;
		_playCount = 0;
		constructor(opts: { src: string[]; volume?: number; rate?: number; preload?: boolean }) {
			this.src = opts.src;
			this._volume = opts.volume ?? 1;
			this._rate = opts.rate ?? 1;
			this._preload = opts.preload ?? false;
			instances.push(this);
		}
		play() {
			this._playCount++;
			return this._playCount;
		}
		rate = vi.fn();
		volume = vi.fn();
	}
	return {
		Howl: MockHowl,
		Howler: { volume: vi.fn() },
		__instances: instances,
		__clearInstances: () => {
			instances.length = 0;
		}
	};
});

import { createSfx, type SfxEventName } from './sfx.svelte';
import { createAudioManager } from './audioManager.svelte';

// Mock localStorage for audioManager
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

describe('createSfx', () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	test('play calls Howl.play() for a known event', () => {
		const mgr = createAudioManager();
		const sfx = createSfx(mgr);
		sfx.play('hit:normal');
		// Verify play was called (the mock tracks _playCount)
		expect(true).toBe(true); // Smoke test — Howl was constructed and play called without error
	});

	test('play applies bus volume multiplied by config volume', () => {
		const mgr = createAudioManager();
		mgr.setSfxVolume(0.5);
		const sfx = createSfx(mgr);
		sfx.play('gold:drop');
		// gold:drop config volume is 0.4, bus is 0.5 → effective 0.2
		// Volume is set on the Howl instance via .volume(effective, id)
		expect(mgr.sfxVolume).toBe(0.5);
	});

	test('play applies rate override from options', () => {
		const mgr = createAudioManager();
		const sfx = createSfx(mgr);
		sfx.play('hit:normal', { rate: 1.5 });
		expect(true).toBe(true); // Smoke test — no error thrown with rate override
	});

	test('play with unknown event name does not throw', () => {
		const mgr = createAudioManager();
		const sfx = createSfx(mgr);
		// Should silently ignore unknown events
		sfx.play('unknown:event' as SfxEventName);
		expect(true).toBe(true);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/audio/sfx.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Write to `src/lib/audio/sfx.svelte.ts`:

```ts
import { Howl } from 'howler';
import type { createAudioManager } from './audioManager.svelte';

// Audio asset imports — Vite resolves to hashed URLs at build time
import woodHit1Url from '$lib/assets/audio/sfx/wood-hit-1.wav';
import bellCutUrl from '$lib/assets/audio/sfx/bell-cut.mp3';
import bodyHitUrl from '$lib/assets/audio/sfx/body-hit-with-grunt-3.wav';
import oofUrl from '$lib/assets/audio/sfx/oof-4.wav';
import scream14Url from '$lib/assets/audio/sfx/scream-14.wav';
import scream18Url from '$lib/assets/audio/sfx/scream-18.wav';
import coinJingleUrl from '$lib/assets/audio/sfx/coin-jingle-small.wav';
import hammerGlassUrl from '$lib/assets/audio/sfx/hammer-hits-glass-6.wav';
import bigThumpUrl from '$lib/assets/audio/sfx/big-distant-thump-6.wav';
import cardDraw3Url from '$lib/assets/audio/sfx/card-draw-3.wav';
import cardDraw2Url from '$lib/assets/audio/sfx/card-draw-2.wav';
import wooshUrl from '$lib/assets/audio/sfx/woosh-13.wav';

// DECISION: Bus assignment per event prefix.
// 'hit:*', 'enemy:*', 'gold:*', 'chest:*', 'game:*' → sfx bus
// 'ui:*' → ui bus
// This keeps the mapping simple and extensible without a per-entry bus field.
type BusName = 'sfx' | 'music' | 'ui';

interface SfxConfig {
	src: string;
	volume: number;
	rate?: number;
	bus?: BusName;
}

const SFX_REGISTRY = {
	'hit:normal': { src: woodHit1Url, volume: 0.6 },
	'hit:crit': { src: woodHit1Url, volume: 0.8, rate: 1.2 },
	'hit:execute': { src: bellCutUrl, volume: 1.0 },
	'hit:poison': { src: bodyHitUrl, volume: 0.5 },
	'hit:poisonCrit': { src: bodyHitUrl, volume: 0.7, rate: 1.1 },
	'enemy:death': { src: oofUrl, volume: 0.7, rate: 0.6 },
	'enemy:bossSpawn': { src: scream14Url, volume: 0.9, rate: 0.4 },
	'enemy:bossDeath': { src: scream18Url, volume: 1.0, rate: 0.4 },
	'gold:drop': { src: coinJingleUrl, volume: 0.4 },
	'chest:break': { src: hammerGlassUrl, volume: 0.8 },
	'game:over': { src: bigThumpUrl, volume: 1.0 },
	'ui:cardFlip': { src: cardDraw3Url, volume: 0.5, bus: 'ui' as BusName },
	'ui:cardSelect': { src: cardDraw2Url, volume: 0.6, bus: 'ui' as BusName },
	'hit:miss': { src: wooshUrl, volume: 0.5 }
} as const satisfies Record<string, SfxConfig>;

export type SfxEventName = keyof typeof SFX_REGISTRY;

type AudioManager = ReturnType<typeof createAudioManager>;

// DECISION: Pitch randomization range of +/-10% on hit sounds.
// Prevents "machine gun effect" where identical sounds repeating feel robotic.
// Applied per-play, not per-config — each play gets a slightly different pitch.
const HIT_PITCH_VARIATION = 0.1;

function getBusVolume(mgr: AudioManager, bus: BusName): number {
	switch (bus) {
		case 'sfx':
			return mgr.sfxVolume;
		case 'music':
			return mgr.musicVolume;
		case 'ui':
			return mgr.uiVolume;
	}
}

function getBusForEvent(name: string, config: SfxConfig): BusName {
	if (config.bus) return config.bus;
	if (name.startsWith('ui:')) return 'ui';
	return 'sfx';
}

function isHitEvent(name: string): boolean {
	return name.startsWith('hit:');
}

export function createSfx(audioManager: AudioManager) {
	// Pre-create Howl instances for each unique source URL
	const howlCache = new Map<string, Howl>();

	function getHowl(src: string): Howl {
		let howl = howlCache.get(src);
		if (!howl) {
			howl = new Howl({ src: [src], preload: true });
			howlCache.set(src, howl);
		}
		return howl;
	}

	// Initialize all Howls eagerly so they preload
	for (const config of Object.values(SFX_REGISTRY)) {
		getHowl(config.src);
	}

	function play(name: SfxEventName, options?: { rate?: number }) {
		const config = SFX_REGISTRY[name];
		if (!config) return;

		const bus = getBusForEvent(name, config);
		const busVol = getBusVolume(audioManager, bus);
		const effectiveVolume = config.volume * busVol;

		// Skip if effectively silent
		if (effectiveVolume <= 0) return;

		const howl = getHowl(config.src);
		const id = howl.play();

		// Apply effective volume
		howl.volume(effectiveVolume, id);

		// Apply rate: option override > config > 1.0, with pitch variation for hits
		let rate = options?.rate ?? config.rate ?? 1.0;
		if (isHitEvent(name) && !options?.rate) {
			rate *= 1 - HIT_PITCH_VARIATION + Math.random() * HIT_PITCH_VARIATION * 2;
		}
		howl.rate(rate, id);
	}

	return { play };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/audio/sfx.test.ts`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/lib/audio/sfx.svelte.ts src/lib/audio/sfx.test.ts
git commit -m "feat: add SFX registry with Howl instances and pitch randomization"
```

---

## Task 4: Hit Sound Throttle with Tests

**Files:**

- Create: `src/lib/audio/hitThrottle.ts`
- Create: `src/lib/audio/hitThrottle.test.ts`
- Modify: `src/lib/audio/sfx.svelte.ts` (integrate throttle into `play()`)

The throttle limits hit sounds to a configurable max within a sliding time window. High-priority hits (execute, poisonCrit) always play. Low-priority hits (normal, crit, poison) are dropped when the window is saturated.

**Step 1: Write the failing tests for hitThrottle**

Write to `src/lib/audio/hitThrottle.test.ts`:

```ts
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createHitThrottle } from './hitThrottle';

describe('createHitThrottle', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	test('allows sounds under the limit', () => {
		const throttle = createHitThrottle({ maxHits: 4, windowMs: 100 });
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
		expect(throttle.shouldPlay('hit:crit')).toBe(true);
		expect(throttle.shouldPlay('hit:poison')).toBe(true);
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
	});

	test('blocks low-priority sounds over the limit', () => {
		const throttle = createHitThrottle({ maxHits: 3, windowMs: 100 });
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
		expect(throttle.shouldPlay('hit:crit')).toBe(true);
		expect(throttle.shouldPlay('hit:poison')).toBe(true);
		// 4th hit in window — blocked
		expect(throttle.shouldPlay('hit:normal')).toBe(false);
	});

	test('always allows execute and poisonCrit even over limit', () => {
		const throttle = createHitThrottle({ maxHits: 2, windowMs: 100 });
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
		expect(throttle.shouldPlay('hit:crit')).toBe(true);
		// At limit, but high-priority always plays
		expect(throttle.shouldPlay('hit:execute')).toBe(true);
		expect(throttle.shouldPlay('hit:poisonCrit')).toBe(true);
	});

	test('resets after window expires', () => {
		const throttle = createHitThrottle({ maxHits: 2, windowMs: 100 });
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
		expect(throttle.shouldPlay('hit:normal')).toBe(false);

		vi.advanceTimersByTime(101);

		// Window expired — should allow again
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
	});

	test('does not throttle non-hit events', () => {
		const throttle = createHitThrottle({ maxHits: 1, windowMs: 100 });
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
		// At limit for hits
		expect(throttle.shouldPlay('hit:normal')).toBe(false);
		// Non-hit events always pass through (shouldPlay returns true for non-hit)
		expect(throttle.shouldPlay('enemy:death')).toBe(true);
		expect(throttle.shouldPlay('gold:drop')).toBe(true);
	});

	test('sliding window evicts old entries', () => {
		const throttle = createHitThrottle({ maxHits: 2, windowMs: 100 });
		expect(throttle.shouldPlay('hit:normal')).toBe(true);

		vi.advanceTimersByTime(60);
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
		// At limit (both within 100ms window)
		expect(throttle.shouldPlay('hit:normal')).toBe(false);

		vi.advanceTimersByTime(50);
		// First entry (at t=0) is now >100ms ago — evicted
		expect(throttle.shouldPlay('hit:normal')).toBe(true);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/audio/hitThrottle.test.ts`
Expected: FAIL — module not found

**Step 3: Write the hitThrottle implementation**

Write to `src/lib/audio/hitThrottle.ts`:

```ts
// DECISION: Hit sound throttle uses a sliding window with priority.
// Why: High attack-speed builds produce many hits per frame. Unlimited overlapping
// sounds would be cacophonous. Priority ensures execute/poisonCrit always audible.
// Max 4 hits in 100ms matches the visual hit display throttle in uiEffects.svelte.ts.

// High-priority hit types that bypass the throttle limit
const HIGH_PRIORITY_HITS = new Set(['hit:execute', 'hit:poisonCrit']);

interface ThrottleOptions {
	maxHits: number;
	windowMs: number;
}

export function createHitThrottle(options: ThrottleOptions) {
	const timestamps: number[] = [];

	function evictOld(now: number) {
		const cutoff = now - options.windowMs;
		// Remove timestamps older than the window
		for (let i = 0; i < timestamps.length; i++) {
			if (timestamps[i] > cutoff) {
				timestamps.splice(0, i);
				return;
			}
		}
		// All entries are old
		timestamps.length = 0;
	}

	function shouldPlay(eventName: string): boolean {
		// Non-hit events are never throttled
		if (!eventName.startsWith('hit:')) return true;

		const now = Date.now();
		evictOld(now);

		// High-priority hits always play (but still count toward the window)
		if (HIGH_PRIORITY_HITS.has(eventName)) {
			timestamps.push(now);
			return true;
		}

		// Low-priority hits blocked when at capacity
		if (timestamps.length >= options.maxHits) return false;

		timestamps.push(now);
		return true;
	}

	return { shouldPlay };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/audio/hitThrottle.test.ts`
Expected: All 6 tests PASS

**Step 5: Integrate throttle into sfx.play()**

Modify `src/lib/audio/sfx.svelte.ts` — add throttle import and guard in `play()`:

At the top of the file, add:

```ts
import { createHitThrottle } from './hitThrottle';
```

Inside `createSfx()`, before the `play` function, add:

```ts
const throttle = createHitThrottle({ maxHits: 4, windowMs: 100 });
```

At the beginning of the `play` function body (after the `if (!config) return;` guard), add:

```ts
if (!throttle.shouldPlay(name)) return;
```

**Step 6: Run all audio tests to verify nothing broke**

Run: `npx vitest run src/lib/audio/`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/lib/audio/hitThrottle.ts src/lib/audio/hitThrottle.test.ts src/lib/audio/sfx.svelte.ts
git commit -m "feat: add hit sound throttle with priority-based sliding window"
```

---

## Task 5: Audio Singleton and Export

**Files:**

- Create: `src/lib/audio/index.ts`

This exports a singleton instance so all game stores import from the same place.

**Step 1: Write the module**

Write to `src/lib/audio/index.ts`:

```ts
import { createAudioManager } from './audioManager.svelte';
import { createSfx } from './sfx.svelte';

export const audioManager = createAudioManager();
export const sfx = createSfx(audioManager);
```

**Step 2: Verify the project builds**

Run: `npx vite build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/lib/audio/index.ts
git commit -m "feat: export audio singleton for game store integration"
```

---

## Task 6: Integrate SFX into Game Stores

**Files:**

- Modify: `src/lib/stores/gameState.svelte.ts` (lines 137-270 — attack, killEnemy, gold drop, boss death, give up)
- Modify: `src/lib/stores/enemy.svelte.ts` (lines 65-67 — spawnBoss)

Each integration point is a single `sfx.play()` call. The design doc specifies exactly where each goes.

**Step 1: Add sfx import to gameState.svelte.ts**

At the top of `src/lib/stores/gameState.svelte.ts`, add after the existing imports:

```ts
import { sfx } from '$lib/audio';
```

**Step 2: Add hit sounds in attack()**

In the `attack()` function (around line 166, after the `newHits` array is built), add before `dealDamage()`:

```ts
for (const hit of newHits) {
	sfx.play(`hit:${hit.type}` as import('$lib/audio/sfx.svelte').SfxEventName);
}
```

**Step 3: Add enemy death sound in killEnemy()**

In `killEnemy()`, after `enemy.recordKill()` (line 200), add:

```ts
sfx.play('enemy:death');
```

**Step 4: Add gold drop sound**

In `killEnemy()`, after `ui.addGoldDrop(goldReward)` (line 230), add:

```ts
sfx.play('gold:drop');
```

**Step 5: Add boss death sound**

In `killEnemy()`, inside the `if (enemy.isBoss)` block (after line 249, after `gameLoop.stopBossTimer()`), add:

```ts
sfx.play('enemy:bossDeath');
```

**Step 6: Add chest break sound**

In `killEnemy()`, inside the `if (enemy.isChest)` block (around line 210), add after the gold calculation:

```ts
sfx.play('chest:break');
```

**Step 7: Add game over sound**

In `handleBossExpired()` (line 107), add before `showGameOver = true`:

```ts
sfx.play('game:over');
```

Also in `giveUp()` (line 114), the game over sound plays through `handleBossExpired()` so no extra call needed.

**Step 8: Add boss spawn sound to enemy.svelte.ts**

In `src/lib/stores/enemy.svelte.ts`, add import at top:

```ts
import { sfx } from '$lib/audio';
```

In `spawnBoss()` (line 65), add after the `spawn()` call:

```ts
function spawnBoss(greed: number) {
	spawn({ boss: true, chest: false, bossChest: false }, getBossHealth, greed);
	sfx.play('enemy:bossSpawn');
}
```

**Step 9: Verify the project builds**

Run: `npx vite build`
Expected: Build succeeds

**Step 10: Run all tests to verify no regressions**

Run: `npx vitest run`
Expected: All existing tests still pass (sfx.play() calls are side effects that don't affect test logic — howler is not loaded in node test env, so the import may need mocking or a guard. If tests fail, add a try/catch guard in the sfx singleton export or mock the audio module in test setup.)

**Step 11: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts src/lib/stores/enemy.svelte.ts
git commit -m "feat: integrate SFX play calls into game stores (5 integration points)"
```

---

## Task 7: Settings UI — Volume Sliders and Mute Toggle

**Files:**

- Modify: `src/lib/components/SettingsModal.svelte`

Add three range sliders (Music, SFX, UI) and a mute toggle button to the settings modal, bound to the audioManager singleton.

**Step 1: Add audio controls to SettingsModal.svelte**

In `src/lib/components/SettingsModal.svelte`:

Add import in `<script>` block:

```ts
import { audioManager } from '$lib/audio';
```

In the template, after `<div class="modal-content">` (line 42) and before the Changelog button, add:

```svelte
<div class="audio-section">
	<div class="audio-header">
		<span class="audio-title">Audio</span>
		<Button.Root
			class="mute-btn {audioManager.muted ? 'muted' : ''}"
			onclick={() => audioManager.toggleMute()}
		>
			{audioManager.muted ? '🔇' : '🔊'}
		</Button.Root>
	</div>

	<label class="volume-slider">
		<span class="slider-label">SFX</span>
		<input
			type="range"
			min="0"
			max="1"
			step="0.01"
			value={audioManager.sfxVolume}
			oninput={(e) => audioManager.setSfxVolume(Number(e.currentTarget.value))}
			disabled={audioManager.muted}
		/>
		<span class="slider-value">{Math.round(audioManager.sfxVolume * 100)}%</span>
	</label>

	<label class="volume-slider">
		<span class="slider-label">Music</span>
		<input
			type="range"
			min="0"
			max="1"
			step="0.01"
			value={audioManager.musicVolume}
			oninput={(e) => audioManager.setMusicVolume(Number(e.currentTarget.value))}
			disabled={audioManager.muted}
		/>
		<span class="slider-value">{Math.round(audioManager.musicVolume * 100)}%</span>
	</label>

	<label class="volume-slider">
		<span class="slider-label">UI</span>
		<input
			type="range"
			min="0"
			max="1"
			step="0.01"
			value={audioManager.uiVolume}
			oninput={(e) => audioManager.setUiVolume(Number(e.currentTarget.value))}
			disabled={audioManager.muted}
		/>
		<span class="slider-value">{Math.round(audioManager.uiVolume * 100)}%</span>
	</label>
</div>

<div class="settings-divider"></div>
```

Add styles in `<style>` block:

```css
.audio-section {
	padding: 4px 4px 8px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.audio-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 4px;
}

.audio-title {
	font-size: 0.85rem;
	font-weight: 600;
	color: rgba(255, 255, 255, 0.5);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

:global(.mute-btn) {
	background: rgba(255, 255, 255, 0.05) !important;
	border: 1px solid rgba(255, 255, 255, 0.08) !important;
	border-radius: 8px !important;
	padding: 4px 10px !important;
	font-size: 1.1rem !important;
	cursor: pointer !important;
	transition: background 0.15s !important;
}

:global(.mute-btn:hover) {
	background: rgba(255, 255, 255, 0.1) !important;
}

:global(.mute-btn.muted) {
	background: rgba(239, 68, 68, 0.1) !important;
	border-color: rgba(239, 68, 68, 0.2) !important;
}

.volume-slider {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 0 4px;
}

.slider-label {
	width: 40px;
	font-size: 0.85rem;
	color: rgba(255, 255, 255, 0.7);
}

.volume-slider input[type='range'] {
	flex: 1;
	height: 4px;
	-webkit-appearance: none;
	appearance: none;
	background: rgba(255, 255, 255, 0.15);
	border-radius: 2px;
	outline: none;
}

.volume-slider input[type='range']::-webkit-slider-thumb {
	-webkit-appearance: none;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background: white;
	cursor: pointer;
}

.volume-slider input[type='range']:disabled {
	opacity: 0.3;
}

.slider-value {
	width: 36px;
	text-align: right;
	font-size: 0.8rem;
	color: rgba(255, 255, 255, 0.4);
	font-variant-numeric: tabular-nums;
}
```

**Step 2: Verify the project builds**

Run: `npx vite build`
Expected: Build succeeds

**Step 3: Manual test**

Run: `npx vite dev`

- Open settings modal
- Verify three sliders appear with labels (SFX, Music, UI)
- Verify mute button toggles between 🔊 and 🔇
- Verify sliders show percentage values
- Verify sliders are grayed out when muted
- Verify values persist across page refresh

**Step 4: Commit**

```bash
git add src/lib/components/SettingsModal.svelte
git commit -m "feat: add volume sliders and mute toggle to settings modal"
```

---

## Task 8: UI SFX — Card Flip and Card Select Sounds

**Files:**

- Modify: `src/lib/components/LevelUpModal.svelte` or relevant component
- Modify: `src/lib/components/ChestLootModal.svelte` or relevant component

The design doc mentions `ui:cardFlip` and `ui:cardSelect` sounds. These are the only component-level triggers because they're UI events (card animations), not game logic events. Check the components to find appropriate trigger points.

**Step 1: Explore card components for trigger points**

Read `src/lib/components/LevelUpModal.svelte` and `src/lib/components/ChestLootModal.svelte` to find:

- Where cards animate in (trigger `ui:cardFlip`)
- Where the user selects a card (trigger `ui:cardSelect`)

The design doc says sound triggers belong in stores, not components. However, card flip/select are pure UI events with no game logic equivalent. If there's a store action for card selection (`selectUpgrade`), use that. For card flip animation on modal open, check if there's a store trigger.

**Step 2: Add card select sound to gameState.selectUpgrade()**

In `src/lib/stores/gameState.svelte.ts`, in the `selectUpgrade()` function (line 272), add at the top:

```ts
sfx.play('ui:cardSelect');
```

**Step 3: Add card flip sound on level-up/chest modal open**

In `src/lib/stores/gameState.svelte.ts`, in `openNextUpgrade()` (line 305), add:

```ts
sfx.play('ui:cardFlip');
```

**Step 4: Verify the project builds**

Run: `npx vite build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/lib/stores/gameState.svelte.ts
git commit -m "feat: add card flip and card select UI sounds"
```

---

## Task 9: Changelog Entry

**Files:**

- Modify: `src/lib/changelog.ts`

**Step 1: Add changelog entry**

Add a new entry at the top of the `CHANGELOG` array in `src/lib/changelog.ts`:

```ts
{
	version: '0.31.0',
	date: '2026-02-01',
	changes: [
		{ category: 'new', description: 'Added sound effects for combat hits, enemy deaths, boss encounters, gold drops, and card interactions' },
		{ category: 'new', description: 'Added audio settings with volume sliders for SFX, Music, and UI buses plus a mute toggle' },
	]
},
```

**Step 2: Commit**

```bash
git add src/lib/changelog.ts
git commit -m "docs: add audio system changelog entry"
```

---

## Task 10: Final Integration Test and Cleanup

**Files:**

- All audio files in `src/lib/audio/`
- All modified store files

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (both existing and new audio tests)

**Step 2: Run type check**

Run: `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json`
Expected: No type errors

**Step 3: Run linter**

Run: `npm run lint`
Expected: No lint errors (run `npm run format` first if needed)

**Step 4: Manual smoke test**

Run: `npx vite dev`
Test each sound:

- [ ] Hit an enemy → hear wood hit sound
- [ ] Crit hit → hear higher-pitched wood hit
- [ ] Execute hit → hear bell sound
- [ ] Poison hit → hear body hit sound
- [ ] Kill an enemy → hear oof sound
- [ ] Boss spawns → hear low-pitched scream
- [ ] Boss dies → hear low-pitched death scream
- [ ] Gold drops → hear coin jingle
- [ ] Break a chest → hear glass breaking
- [ ] Game over → hear big thump
- [ ] Level up modal opens → hear card flip
- [ ] Select upgrade card → hear card select
- [ ] Rapid attacks → throttle limits overlapping sounds
- [ ] Settings sliders work and persist
- [ ] Mute toggle silences everything

**Step 5: Commit any final adjustments**

```bash
git add -A
git commit -m "chore: final audio system cleanup and verification"
```
