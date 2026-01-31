import type { SystemDefinition, PipelineHit } from '$lib/engine/systemPipeline';

// Extend HitTypeMap for criticalHit
declare module '$lib/engine/systemPipeline' {
	interface HitTypeMap {
		criticalHit: { damage: number; index: number; critMultiplier: number };
	}
}

export const critSystem: SystemDefinition<{}> = {
	id: 'crit',
	priority: 20,
	initialState: () => ({}),
	transformsFrom: ['hit'],

	transformHit: (state, hit, stats, rng) => {
		const h = hit as PipelineHit & { damage: number; index: number };
		if (rng() >= stats.critChance) return { state, hit };

		return {
			state,
			hit: {
				type: 'criticalHit' as any,
				damage: Math.floor(h.damage * stats.critMultiplier),
				index: h.index,
				critMultiplier: stats.critMultiplier,
			} as PipelineHit,
		};
	},
};
