import type { HitInfo, HitType, GoldDrop } from '$lib/types';
import { sfx } from '$lib/audio';
import type { SfxEventName } from '$lib/audio/sfx.svelte';

// DECISION: Durations tuned to feel snappy without overlapping too much during rapid combat.
// 700ms for hits — long enough to read the number, short enough to not clutter during multi-strike.
// 1200ms for gold — slightly longer so players notice the reward before it fades.
const HIT_DISPLAY_MS = 700;
const GOLD_DROP_DISPLAY_MS = 1200;

// PERFORMANCE: Cap on-screen hits to prevent DOM thrashing during high attack-speed builds.
// Low-priority hits (normal, crit) are dropped when at capacity; high-priority hits
// (execute, poison, poisonCrit) always display since they convey important gameplay info.
const MAX_HITS_ON_SCREEN = 100;

// DECISION: Stagger hit audio by 50ms per hit index, matching the visual
// animation-delay (index * 0.05s) in hit components. Without this, multi-strike
// sounds all fire simultaneously which sounds like a single hit.
const HIT_AUDIO_STAGGER_MS = 50;
const LOW_PRIORITY_HIT_TYPES: Set<HitType> = new Set(['normal', 'crit', 'hit', 'criticalHit']);

export function createUIEffects() {
	let hits = $state<HitInfo[]>([]);
	let hitId = $state(0);
	let goldDrops = $state<GoldDrop[]>([]);
	let goldDropId = $state(0);

	function nextHitId(): number {
		return ++hitId;
	}

	function addHits(newHits: HitInfo[]) {
		let remaining = MAX_HITS_ON_SCREEN - hits.length;
		const accepted = newHits.filter((h) => {
			if (!LOW_PRIORITY_HIT_TYPES.has(h.type)) return true;
			if (remaining <= 0) return false;
			remaining--;
			return true;
		});
		if (accepted.length === 0) return;
		hits = [...hits, ...accepted];

		// Play hit audio staggered to match the visual animation delay per hit
		for (const hit of accepted) {
			const eventName = `hit:${hit.type}` as SfxEventName;
			if (hit.index === 0) {
				sfx.play(eventName);
			} else {
				setTimeout(() => sfx.play(eventName), hit.index * HIT_AUDIO_STAGGER_MS);
			}
		}
		const hitIds = accepted.map((h) => h.id);
		setTimeout(() => {
			hits = hits.filter((h) => !hitIds.includes(h.id));
		}, HIT_DISPLAY_MS);
	}

	function addGoldDrop(amount: number) {
		goldDropId++;
		goldDrops = [...goldDrops, { id: goldDropId, amount }];
		const dropId = goldDropId;
		setTimeout(() => {
			goldDrops = goldDrops.filter((d) => d.id !== dropId);
		}, GOLD_DROP_DISPLAY_MS);
	}

	function reset() {
		hits = [];
		goldDrops = [];
		hitId = 0;
		goldDropId = 0;
	}

	return {
		get hits() {
			return hits;
		},
		get goldDrops() {
			return goldDrops;
		},
		nextHitId,
		addHits,
		addGoldDrop,
		reset
	};
}
