import type { SystemDefinition, PipelineHit } from '$lib/engine/systemPipeline';

// Extend HitTypeMap for executeHit
declare module '$lib/engine/systemPipeline' {
	interface HitTypeMap {
		executeHit: { damage: number; index: number };
	}
}

export const executeSystem: SystemDefinition<{}> = {
	id: 'execute',
	initialState: () => ({}),
	isActive: (stats) => stats.executeChance > 0,

	beforeAttack: (state, ctx, stats) => {
		if (ctx.isBoss) return { state, skip: false };

		const effectiveChance = stats.executeCap != null
			? Math.min(stats.executeChance, stats.executeCap)
			: stats.executeChance;

		if (effectiveChance <= 0) return { state, skip: false };
		if (ctx.rng() >= effectiveChance) return { state, skip: false };

		return {
			state,
			skip: true,
			hits: [{
				type: 'executeHit',
				damage: ctx.enemyHealth,
				index: 0,
			} as PipelineHit<'executeHit'>],
		};
	},
};
