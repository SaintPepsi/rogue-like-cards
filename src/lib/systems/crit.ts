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
		if (rng() >= stats.critChance) return { state, hit };

		return {
			state,
			hit: {
				type: 'criticalHit',
				damage: Math.max(hit.damage + 1, Math.floor(hit.damage * stats.critMultiplier)),
				index: hit.index,
				critMultiplier: stats.critMultiplier
			} as PipelineHit<'criticalHit'>
		};
	}
};
