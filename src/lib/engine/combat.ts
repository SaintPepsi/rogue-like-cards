import type { PlayerStats, HitInfo, HitType } from '$lib/types';

export interface AttackContext {
	enemyHealth: number;
	enemyMaxHealth: number;
	overkillDamage: number;
	rng: () => number;
	executeCap?: number;
	isBoss?: boolean;
}

export interface AttackResult {
	totalDamage: number;
	hits: Omit<HitInfo, 'id'>[];
	overkillDamageOut: number;
}

export function calculateAttack(stats: PlayerStats, ctx: AttackContext): AttackResult {
	const hits: Omit<HitInfo, 'id'>[] = [];
	let totalDamage = 0;

	// Execute cannot trigger on bosses
	const effectiveExecuteChance = ctx.isBoss ? 0
		: ctx.executeCap != null
			? Math.min(stats.executeChance, ctx.executeCap)
			: stats.executeChance;
	const isExecute = effectiveExecuteChance > 0 && ctx.rng() < effectiveExecuteChance;

	if (isExecute) {
		totalDamage = ctx.enemyHealth;
		hits.push({ damage: totalDamage, type: 'execute', index: 0 });
	} else {
		const strikes = 1 + stats.multiStrike;
		for (let i = 0; i < strikes; i++) {
			const isCrit = ctx.rng() < stats.critChance;
			const hitType: HitType = isCrit ? 'crit' : 'normal';

			let damage = isCrit
				? Math.floor(stats.damage * stats.critMultiplier)
				: stats.damage;

			if (i === 0 && ctx.overkillDamage > 0) {
				damage += ctx.overkillDamage;
			}

			damage = Math.floor(damage * stats.damageMultiplier);

			totalDamage += damage;
			hits.push({ damage, type: hitType, index: i });
		}
	}

	const remainingHealth = ctx.enemyHealth - totalDamage;
	const overkillDamageOut =
		stats.overkill && remainingHealth < 0 ? Math.abs(remainingHealth) : 0;

	return { totalDamage, hits, overkillDamageOut };
}

export interface PoisonContext {
	rng: () => number;
	activeStacks: number;
}

export interface PoisonResult {
	damage: number;
	type: 'poison' | 'poisonCrit';
}

export function calculatePoison(stats: PlayerStats, ctx: PoisonContext): PoisonResult {
	if (stats.poison <= 0 || ctx.activeStacks <= 0) {
		return { damage: 0, type: 'poison' };
	}

	const isPoisonCrit = ctx.rng() < stats.poisonCritChance;
	let perStackDamage = isPoisonCrit
		? Math.floor(stats.poison * stats.critMultiplier)
		: stats.poison;

	perStackDamage = Math.floor(perStackDamage * stats.damageMultiplier);

	const totalDamage = perStackDamage * ctx.activeStacks;

	return {
		damage: totalDamage,
		type: isPoisonCrit ? 'poisonCrit' : 'poison'
	};
}
