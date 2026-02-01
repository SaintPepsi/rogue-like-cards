import { createAudioManager } from './audioManager.svelte';
import { createSfx } from './sfx.svelte';

export const audioManager = createAudioManager();
export const sfx = createSfx(audioManager);
