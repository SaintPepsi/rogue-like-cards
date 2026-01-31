import {
	getEffectiveAttackSpeed,
	getAttackIntervalMs
} from '$lib/engine/gameLoop';
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

	// Frenzy — tracked as named timers, count derived
	let frenzyCount = $state(0);
	let frenzyId = $state(0);

	// Callbacks (set by gameState during start())
	let callbacks = {
		onAttack: () => {},
		onPoisonTick: () => {},
		onBossExpired: () => {},
		onFrenzyChanged: (_count: number) => {}
	};

	// Stat readers (set by gameState, read from pipeline)
	let getAttackSpeed = () => 0.8;
	let getTapFrenzyBonus = () => 0.05;
	let getTapFrenzyDuration = () => 3;

	function addFrenzyStack() {
		frenzyId++;
		frenzyCount++;
		const id = frenzyId;
		const name = `frenzy_${id}`;
		const duration = getTapFrenzyDuration() * 1000;

		timers.register(name, {
			remaining: duration,
			onExpire: () => {
				frenzyCount = Math.max(0, frenzyCount - 1);
				callbacks.onFrenzyChanged(frenzyCount);
			}
		});

		callbacks.onFrenzyChanged(frenzyCount);
	}

	function fireAttack() {
		callbacks.onAttack();
		addFrenzyStack();
		attackQueuedTap = false;

		// Re-register attack cooldown
		const effectiveSpeed = getEffectiveAttackSpeed(
			getAttackSpeed(),
			frenzyCount,
			getTapFrenzyBonus()
		);
		const interval = getAttackIntervalMs(effectiveSpeed);
		timers.register('attack_cooldown', {
			remaining: interval,
			onExpire: () => {
				const canAttack = pointerHeld || frenzyCount > 0;
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
		onPoisonTick: () => void;
		onBossExpired: () => void;
		onFrenzyChanged?: (count: number) => void;
		getAttackSpeed: () => number;
		getTapFrenzyBonus: () => number;
		getTapFrenzyDuration: () => number;
	}) {
		callbacks = {
			onAttack: cbs.onAttack,
			onPoisonTick: cbs.onPoisonTick,
			onBossExpired: cbs.onBossExpired,
			onFrenzyChanged: cbs.onFrenzyChanged ?? (() => {})
		};
		getAttackSpeed = cbs.getAttackSpeed;
		getTapFrenzyBonus = cbs.getTapFrenzyBonus;
		getTapFrenzyDuration = cbs.getTapFrenzyDuration;

		// Register poison tick (repeating 1000ms)
		timers.register('poison_tick', {
			remaining: 1000,
			onExpire: () => callbacks.onPoisonTick(),
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
			// No cooldown active — fire immediately
			fireAttack();
		} else {
			attackQueuedTap = true;
		}
	}

	function pointerUp() {
		pointerHeld = false;
	}

	function startBossTimer(maxTime: number) {
		let bossTimeRemaining = maxTime;
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
	}

	function reset() {
		stop();
		timers.clear();
		paused = false;
		pointerHeld = false;
		attackQueuedTap = false;
		frenzyCount = 0;
		frenzyId = 0;
		lastFrameTime = 0;
	}

	return {
		// Timer registry access (for Plans 1-3 to register enemy/ability timers)
		get timers() { return timers; },

		get frenzyStacks() { return frenzyCount; },
		get paused() { return paused; },
		get pointerHeld() { return pointerHeld; },

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
