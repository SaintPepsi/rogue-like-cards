import { Howl } from 'howler';
import type { createAudioManager } from './audioManager.svelte';
import { createHitThrottle } from './hitThrottle';

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
	'enemy:death': { src: oofUrl, volume: 0.7, rate: 1.2 },
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
	// DECISION: Plain Map (not SvelteMap) — this cache is internal to createSfx,
	// never read reactively by Svelte components. No reactivity needed.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
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

	const throttle = createHitThrottle({ maxHits: 4, windowMs: 100 });

	function play(name: SfxEventName, options?: { rate?: number }) {
		const config = SFX_REGISTRY[name];
		if (!config) return;
		if (!throttle.shouldPlay(name)) return;

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
		let rate = options?.rate ?? ('rate' in config ? config.rate : undefined) ?? 1.0;
		if (isHitEvent(name) && !options?.rate) {
			rate *= 1 - HIT_PITCH_VARIATION + Math.random() * HIT_PITCH_VARIATION * 2;
		}
		howl.rate(rate, id);
	}

	return { play };
}
