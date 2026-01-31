import type { SystemDefinition, PipelineHit, KillContext, TickContext } from '$lib/engine/systemPipeline';
import { createStackManager } from '$lib/engine/stackManager';

// Extend HitTypeMap for poison hit types
declare module '$lib/engine/systemPipeline' {
	interface HitTypeMap {
		poison: { damage: number; index: number };
		poisonCrit: { damage: number; index: number };
	}
}

export type PoisonState = {
	stacks: number[];
};

const stackMgr = createStackManager({ max: 5, refreshPolicy: 'refresh-shortest' });

export const poisonSystem: SystemDefinition<PoisonState> = {
	id: 'poison',
	initialState: () => ({ stacks: [] }),
	isActive: (stats) => stats.poison > 0,

	reactsTo: ['hit', 'criticalHit'],
	onHit: (state, hit, stats) => {
		// Defensive guard — pipeline indexes by reactsTo, but direct calls may pass other types
		if (hit.type !== 'hit' && hit.type !== 'criticalHit') return null;
		const maxStacks = stats.poisonMaxStacks ?? 5;
		const duration = stats.poisonDuration ?? 5;
		const mgr = createStackManager({ max: maxStacks, refreshPolicy: 'refresh-shortest' });
		return {
			state: { stacks: mgr.add(state.stacks, duration) },
		};
	},

	onTick: (state, stats, _ctx) => {
		if (state.stacks.length === 0) return { state, damage: 0 };

		const perStack = Math.floor(stats.poison * (stats.damageMultiplier ?? 1));
		const damage = perStack * state.stacks.length;

		return {
			state: { stacks: stackMgr.tick(state.stacks) },
			damage,
			hitType: 'poison',
		};
	},

	onKill: (_state, _ctx) => ({ stacks: [] }),

	handleEffect: (state, action, payload) => {
		if (action === 'addStacks') {
			const duration = payload.duration ?? 5;
			const count = payload.count ?? 1;
			let stacks = [...state.stacks];
			for (let i = 0; i < count; i++) {
				stacks = stackMgr.add(stacks, duration);
			}
			return { stacks };
		}
		return state;
	},
};
