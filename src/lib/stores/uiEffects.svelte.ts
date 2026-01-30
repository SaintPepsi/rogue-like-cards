import type { HitInfo, GoldDrop } from '$lib/types';

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
		}, 700);
	}

	function addGoldDrop(amount: number) {
		goldDropId++;
		goldDrops = [...goldDrops, { id: goldDropId, amount }];
		const dropId = goldDropId;
		setTimeout(() => {
			goldDrops = goldDrops.filter((d) => d.id !== dropId);
		}, 1200);
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
