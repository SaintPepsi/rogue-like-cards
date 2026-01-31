export type GameTimer = {
	remaining: number;
	onExpire: () => void;
	repeat?: number;
};

export function createTimerRegistry() {
	const timers = new Map<string, GameTimer>();

	function register(name: string, timer: GameTimer): void {
		timers.set(name, { ...timer });
	}

	function remove(name: string): void {
		timers.delete(name);
	}

	function has(name: string): boolean {
		return timers.has(name);
	}

	function getRemaining(name: string): number {
		return timers.get(name)?.remaining ?? 0;
	}

	function tick(deltaMs: number): void {
		// Process in rounds to handle one-shot timers that re-register themselves
		let maxRounds = 50;
		let isFirstRound = true;

		for (let round = 0; round < maxRounds; round++) {
			const names = Array.from(timers.keys());
			let anyFired = false;

			for (const name of names) {
				const timer = timers.get(name);
				if (!timer) continue;

				// Only subtract delta on the first round
				if (isFirstRound) {
					timer.remaining -= deltaMs;
				}

				if (timer.remaining > 0) continue;

				// Process expirations
				let maxIterations = 100;
				for (let i = 0; i < maxIterations && timer.remaining <= 0; i++) {
					const overflow = -timer.remaining;
					timer.onExpire();
					anyFired = true;

					if (timer.repeat != null) {
						timer.remaining += timer.repeat;
					} else {
						// One-shot: check if onExpire re-registered the same name
						const replacement = timers.get(name);
						if (replacement && replacement !== timer) {
							// Apply overflow to the newly registered timer
							replacement.remaining -= overflow;
						} else if (replacement === timer) {
							// Same object, wasn't re-registered — delete it
							timers.delete(name);
						}
						break;
					}
				}
			}

			isFirstRound = false;
			if (!anyFired) break;
		}
	}

	function clear(): void {
		timers.clear();
	}

	return { register, remove, has, getRemaining, tick, clear };
}
