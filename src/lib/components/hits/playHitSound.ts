import { sfx } from '$lib/audio';
import type { SfxEventName } from '$lib/audio/sfx.svelte';

// DECISION: Hit audio staggered by 50ms per index, matching the CSS animation-delay
// (index * 0.05s). Each hit component calls this on mount so audio is tied to rendering.
const HIT_AUDIO_STAGGER_MS = 50;

export function playHitSound(eventName: SfxEventName, index: number) {
	if (index === 0) {
		sfx.play(eventName);
	} else {
		setTimeout(() => sfx.play(eventName), index * HIT_AUDIO_STAGGER_MS);
	}
}
