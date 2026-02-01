import type { PlayerStats } from '$lib/types';

// DECISION: Effective DPS = damage × attackSpeed × critExpectedValue × (1 + multiStrike) × damageMultiplier
// Why: This is the expected damage per second assuming uniform crit distribution.
// The game's actual combat uses the pipeline (systemPipeline.ts) which rolls crits per-hit,
// but for balance visualization we want the statistical expectation.
export function computeEffectiveDps(stats: PlayerStats): number {
	const critExpectedValue = 1 + stats.critChance * (stats.critMultiplier - 1);
	return (
		stats.damage *
		stats.attackSpeed *
		critExpectedValue *
		(1 + stats.multiStrike) *
		stats.damageMultiplier
	);
}

// DECISION: Poison DPS = poison per stack × max stacks (assumes full stacks applied).
// Why: Worst-case sustained poison damage — useful for balance charts.
// Actual poison damage depends on attack timing and stack application rate,
// but full-stacks is the relevant equilibrium for balance analysis.
export function computePoisonDps(stats: PlayerStats): number {
	return stats.poison * stats.poisonMaxStacks;
}
