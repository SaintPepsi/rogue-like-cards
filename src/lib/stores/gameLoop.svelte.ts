import { getAttackIntervalMs } from '$lib/engine/attackSpeed';
import { createTimerRegistry } from '$lib/engine/timerRegistry';

export function createGameLoop() {
	const timers = createTimerRegistry();

	// rAF state
	let rafId: number | null = null;
	let lastFrameTime = $state(0);

	// Input state
	let paused = $state(false);
	let pointerHeld = $state(false);
	let attackQueuedTap = $state(false);

	// Boss countdown — exposed for UI display
	let bossTimeRemaining = $state(0);

	// Callbacks (set by gameState during start())
	let callbacks = {
		onAttack: () => {},
		onSystemTick: () => {},
		onBossExpired: () => {}
	};

	// Stat readers (set by gameState, read from pipeline)
	let getAttackSpeed = () => 0.8;
	let getFrenzyCount = () => 0;

	function fireAttack() {
		callbacks.onAttack();
		attackQueuedTap = false;

		// DECISION: Read pipeline attackSpeed directly, not getEffectiveAttackSpeed()
		// Why: The stat pipeline already includes the frenzy transient multiplier
		// (added by frenzy.onChanged → statPipeline.addTransientStep). Calling
		// getEffectiveAttackSpeed() here would double-count the frenzy bonus.
		const interval = getAttackIntervalMs(getAttackSpeed());
		timers.register('attack_cooldown', {
			remaining: interval,
			onExpire: () => {
				const canAttack = pointerHeld || getFrenzyCount() > 0;
				if (canAttack || attackQueuedTap) {
					fireAttack();
				}
			}
		});
	}

	function frame(timestamp: number) {
		if (lastFrameTime === 0) {
			lastFrameTime = timestamp;
			rafId = requestAnimationFrame(frame);
			return;
		}

		const deltaMs = Math.min(timestamp - lastFrameTime, 200); // cap to prevent tab-switch bursts
		lastFrameTime = timestamp;

		if (!paused) {
			timers.tick(deltaMs);
		}

		rafId = requestAnimationFrame(frame);
	}

	function start(cbs: {
		onAttack: () => void;
		onSystemTick: () => void;
		onBossExpired: () => void;
		getAttackSpeed: () => number;
		getFrenzyCount: () => number;
	}) {
		callbacks = {
			onAttack: cbs.onAttack,
			onSystemTick: cbs.onSystemTick,
			onBossExpired: cbs.onBossExpired
		};
		getAttackSpeed = cbs.getAttackSpeed;
		getFrenzyCount = cbs.getFrenzyCount;

		// Register system tick (repeating 1000ms) — runs all pipeline onTick handlers
		timers.register('system_tick', {
			remaining: 1000,
			onExpire: () => callbacks.onSystemTick(),
			repeat: 1000
		});

		lastFrameTime = 0;
		rafId = requestAnimationFrame(frame);
	}

	function stop() {
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	function pause() {
		paused = true;
	}

	function resume() {
		paused = false;
	}

	function pointerDown() {
		pointerHeld = true;
		if (!timers.has('attack_cooldown')) {
			fireAttack();
		} else {
			attackQueuedTap = true;
		}
	}

	function pointerUp() {
		pointerHeld = false;
	}

	function startBossTimer(maxTime: number) {
		bossTimeRemaining = maxTime;
		timers.register('boss_countdown', {
			remaining: 1000,
			repeat: 1000,
			onExpire: () => {
				bossTimeRemaining--;
				if (bossTimeRemaining <= 0) {
					timers.remove('boss_countdown');
					callbacks.onBossExpired();
				}
			}
		});
	}

	function stopBossTimer() {
		timers.remove('boss_countdown');
		bossTimeRemaining = 0;
	}

	function reset() {
		stop();
		timers.clear();
		paused = false;
		pointerHeld = false;
		attackQueuedTap = false;
		bossTimeRemaining = 0;
		lastFrameTime = 0;
	}

	return {
		// Timer registry access (for Plans 1-3 to register enemy/ability timers)
		get timers() {
			return timers;
		},

		get bossTimeRemaining() {
			return bossTimeRemaining;
		},
		get paused() {
			return paused;
		},
		get pointerHeld() {
			return pointerHeld;
		},

		start,
		stop,
		pause,
		resume,
		pointerDown,
		pointerUp,
		startBossTimer,
		stopBossTimer,
		reset
	};
}
