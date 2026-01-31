import { multiply } from '$lib/engine/statPipeline';
import type { createTimerRegistry } from '$lib/engine/timerRegistry';
import type { createStatPipeline } from './statPipeline.svelte';

type TimerRegistry = ReturnType<typeof createTimerRegistry>;
type StatPipeline = ReturnType<typeof createStatPipeline>;

// DECISION: Frenzy owns its stat pipeline interaction directly
// Why: Frenzy is the only thing that adds/removes the 'frenzy' transient.
// It reads tapFrenzyBonus and tapFrenzyDuration from the pipeline itself —
// no callbacks or stat reader closures needed.
export function createFrenzy(pipeline: StatPipeline, timers: TimerRegistry) {
	let count = $state(0);
	let nextId = $state(0);

	function syncPipeline() {
		pipeline.removeTransient('frenzy');
		if (count > 0) {
			pipeline.addTransientStep(
				'frenzy',
				'attackSpeed',
				multiply(1 + count * pipeline.get('tapFrenzyBonus'))
			);
		}
	}

	function addStack() {
		const stacksToAdd = Math.floor(pipeline.get('tapFrenzyStackMultiplier') as number);
		const duration = pipeline.get('tapFrenzyDuration') * 1000;

		for (let i = 0; i < stacksToAdd; i++) {
			nextId++;
			count++;
			const id = nextId;

			timers.register(`frenzy_${id}`, {
				remaining: duration,
				onExpire: () => {
					// Math.max guard: reset() zeroes count while pending timers may still fire
					count = Math.max(0, count - 1);
					syncPipeline();
				}
			});
		}

		syncPipeline();
	}

	function reset() {
		count = 0;
		nextId = 0;
	}

	return {
		get count() { return count; },
		addStack,
		reset
	};
}
