// DECISION: Simulator must NEVER contain its own stat/damage/wave formulas.
// It calls the real engine functions (applyUpgrade via modifier application,
// getEnemyHealth, getBossHealth, computeEffectiveDps, etc.)
// so that balance changes automatically propagate to the visualization.
// If you need a new derived value here, add it to the engine first, then call it.

import type { PlayerStats } from '$lib/types';
import { createDefaultStats } from './stats';
import { computeEffectiveDps, computePoisonDps } from './dps';
import { getEnemyHealth, getBossHealth, getXpToNextLevel } from './waves';
import { getUpgradeById } from '$lib/data/upgrades';
import type { StatSnapshot, SnapshotEvent } from '$lib/stores/runHistory.svelte';

export type BuildStep = { level: number; upgradeId: string };
export type BuildPlan = BuildStep[];

// DECISION: Pure function that applies upgrade modifiers to a plain PlayerStats object.
// Why: The real statPipeline uses Svelte $state internally and can't run outside component context.
// This replicates the additive modifier logic from statPipeline.rebuildLayer() without duplicating
// any damage/scaling formulas. Only the "apply stat modifier" operation is reproduced here.
// COUPLING: If statPipeline.rebuildLayer() ever gains non-additive modifier types (multiply,
// conditional, etc.), this function must be updated to match. The drift-detection test in
// simulator.test.ts ("matches statPipeline output for same upgrades") will catch this.
export function applyUpgradeToStats(stats: PlayerStats, upgradeId: string): PlayerStats {
	const upgrade = getUpgradeById(upgradeId);
	if (!upgrade) return stats;

	const result = { ...stats };
	for (const mod of upgrade.modifiers) {
		(result[mod.stat] as number) += mod.value;
	}
	return result;
}

export function simulateBuild(plan: BuildPlan, maxStage: number): StatSnapshot[] {
	let stats = createDefaultStats();
	const snapshots: StatSnapshot[] = [];
	const upgradesPicked: string[] = [];

	for (let stage = 1; stage <= maxStage; stage++) {
		// Apply upgrades scheduled for this stage using real upgrade data
		const stageUpgrades = plan.filter((s) => s.level === stage);
		for (const step of stageUpgrades) {
			stats = applyUpgradeToStats(stats, step.upgradeId);
			upgradesPicked.push(step.upgradeId);
		}

		// Compute ALL derived values from real engine functions
		const dps = computeEffectiveDps(stats);
		const poisonDps = computePoisonDps(stats);
		const enemyHp = getEnemyHealth(stage, stats.greed);
		const bossHp = getBossHealth(stage, stats.greed);
		const xpToNext = getXpToNextLevel(stage);

		snapshots.push({
			event: 'stage_transition' as SnapshotEvent,
			stage,
			level: stage, // In simulator, level tracks with stage
			stats: { ...stats },
			computedDps: dps,
			poisonDps,
			enemyHp,
			bossHp,
			timeToKill: dps > 0 ? enemyHp / dps : Infinity,
			xpToNextLevel: xpToNext,
			upgradesPicked: [...upgradesPicked],
			timestamp: 0
		});
	}
	return snapshots;
}
