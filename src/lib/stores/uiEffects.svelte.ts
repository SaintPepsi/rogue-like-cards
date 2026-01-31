import type { HitInfo, GoldDrop } from '$lib/types';

// DECISION: Durations tuned to feel snappy without overlapping too much during rapid combat.
// 700ms for hits — long enough to read the number, short enough to not clutter during multi-strike.
// 1200ms for gold — slightly longer so players notice the reward before it fades.
const HIT_DISPLAY_MS = 700;
const GOLD_DROP_DISPLAY_MS = 1200;

export function createUIEffects() {
	let hits = $state<HitInfo[]>([]);
	let hitId = $state(0);
	let goldDrops = $state<GoldDrop[]>([]);
	let goldDropId = $state(0);

	function nextHitId(): number {
		return ++hitId;
	}

	function addHits(newHits: HitInfo[]) {
		hits = [...hits, ...newHits];
		const hitIds = newHits.map((h) => h.id);
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
