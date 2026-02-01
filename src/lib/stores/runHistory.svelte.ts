import type { PlayerStats } from '$lib/types';
import { computeEffectiveDps, computePoisonDps } from '$lib/engine/dps';
import { getEnemyHealth, getBossHealth, getXpToNextLevel } from '$lib/engine/waves';

export type SnapshotEvent = 'stage_transition' | 'level_up';

export type StatSnapshot = {
	event: SnapshotEvent;
	stage: number;
	level: number;
	stats: PlayerStats;
	computedDps: number;
	poisonDps: number;
	timeToKill: number;
	enemyHp: number;
	bossHp: number;
	xpToNextLevel: number;
	upgradesPicked: string[];
	timestamp: number;
};

type AddSnapshotParams = {
	event: SnapshotEvent;
	stats: PlayerStats;
	stage: number;
	level: number;
	upgradesPicked: string[];
};

export function createRunHistory() {
	let snapshots = $state<StatSnapshot[]>([]);
	let runStartTime = $state(Date.now());

	function addSnapshot(params: AddSnapshotParams): void {
		const { event, stats, stage, level, upgradesPicked } = params;

		// All derived values computed from real engine functions — no formulas here
		const dps = computeEffectiveDps(stats);
		const poisonDps = computePoisonDps(stats);
		const enemyHp = getEnemyHealth(stage, stats.greed);
		const bossHp = getBossHealth(stage, stats.greed);
		const xpToNext = getXpToNextLevel(level);
		const timeToKill = dps > 0 ? enemyHp / dps : Infinity;

		snapshots = [
			...snapshots,
			{
				event,
				stage,
				level,
				stats: { ...stats },
				computedDps: dps,
				poisonDps,
				timeToKill,
				enemyHp,
				bossHp,
				xpToNextLevel: xpToNext,
				upgradesPicked: [...upgradesPicked],
				timestamp: Date.now() - runStartTime
			}
		];
	}

	function reset(): void {
		snapshots = [];
		runStartTime = Date.now();
	}

	return {
		get snapshots() {
			return snapshots;
		},
		addSnapshot,
		reset
	};
}
