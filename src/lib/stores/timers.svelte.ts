export function createTimers() {
	let bossTimer = $state(0);
	let bossInterval: ReturnType<typeof setInterval> | null = null;
	let poisonInterval: ReturnType<typeof setInterval> | null = null;

	function startBossTimer(maxTime: number, onExpire: () => void) {
		bossTimer = maxTime;
		if (bossInterval) clearInterval(bossInterval);
		bossInterval = setInterval(() => {
			bossTimer--;
			if (bossTimer <= 0) {
				stopBossTimer();
				onExpire();
			}
		}, 1000);
	}

	function stopBossTimer() {
		if (bossInterval) {
			clearInterval(bossInterval);
			bossInterval = null;
		}
		bossTimer = 0;
	}

	function pauseBossTimer() {
		if (bossInterval) {
			clearInterval(bossInterval);
			bossInterval = null;
		}
		// bossTimer value preserved for resume
	}

	function resumeBossTimer(onExpire: () => void) {
		if (bossTimer > 0 && !bossInterval) {
			bossInterval = setInterval(() => {
				bossTimer--;
				if (bossTimer <= 0) {
					stopBossTimer();
					onExpire();
				}
			}, 1000);
		}
	}

	function startPoisonTick(onTick: () => void) {
		if (poisonInterval) clearInterval(poisonInterval);
		poisonInterval = setInterval(onTick, 1000);
	}

	function stopPoisonTick() {
		if (poisonInterval) {
			clearInterval(poisonInterval);
			poisonInterval = null;
		}
	}

	function stopAll() {
		stopBossTimer();
		stopPoisonTick();
	}

	return {
		get bossTimer() {
			return bossTimer;
		},
		startBossTimer,
		stopBossTimer,
		pauseBossTimer,
		resumeBossTimer,
		startPoisonTick,
		stopPoisonTick,
		stopAll
	};
}
