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
