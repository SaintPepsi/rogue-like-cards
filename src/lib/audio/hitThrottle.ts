// DECISION: Hit sound throttle uses a sliding window with priority.
// Why: High attack-speed builds produce many hits per frame. Unlimited overlapping
// sounds would be cacophonous. Priority ensures execute/poisonCrit always audible.
// Max 4 hits in 100ms matches the visual hit display throttle in uiEffects.svelte.ts.

// High-priority hit types that bypass the throttle limit
const HIGH_PRIORITY_HITS = new Set(['hit:execute', 'hit:poisonCrit']);

interface ThrottleOptions {
	maxHits: number;
	windowMs: number;
}

export function createHitThrottle(options: ThrottleOptions) {
	const timestamps: number[] = [];

	function evictOld(now: number) {
		const cutoff = now - options.windowMs;
		// Remove timestamps older than the window
		for (let i = 0; i < timestamps.length; i++) {
			if (timestamps[i] > cutoff) {
				timestamps.splice(0, i);
				return;
			}
		}
		// All entries are old
		timestamps.length = 0;
	}

	function shouldPlay(eventName: string): boolean {
		// Non-hit events are never throttled
		if (!eventName.startsWith('hit:')) return true;

		const now = Date.now();
		evictOld(now);

		// High-priority hits always play (but still count toward the window)
		if (HIGH_PRIORITY_HITS.has(eventName)) {
			timestamps.push(now);
			return true;
		}

		// Low-priority hits blocked when at capacity
		if (timestamps.length >= options.maxHits) return false;

		timestamps.push(now);
		return true;
	}

	return { shouldPlay };
}
