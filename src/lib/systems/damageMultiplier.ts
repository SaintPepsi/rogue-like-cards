import type { SystemDefinition, PipelineHit } from '$lib/engine/systemPipeline';

export const damageMultiplierSystem: SystemDefinition<{}> = {
	id: 'damageMultiplier',
	priority: 90, // Runs last among transforms — final damage scaling
	initialState: () => ({}),
	transformsFrom: ['hit', 'criticalHit'],

	transformHit: (state, hit, stats, _rng) => {
		const h = hit as PipelineHit & { damage: number };
		return {
			state,
			hit: {
				...hit,
				damage: Math.floor(h.damage * (stats.damageMultiplier ?? 1)),
			} as PipelineHit,
		};
	},
};
