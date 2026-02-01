import { describe, test, expect } from 'vitest';
import { createTimerRegistry } from '$lib/engine/timerRegistry';

describe('timer registry', () => {
	test('one-shot timer fires on expiry', () => {
		const registry = createTimerRegistry();
		let fired = false;
		registry.register('test', {
			remaining: 100,
			onExpire: () => {
				fired = true;
			}
		});
		registry.tick(100);
		expect(fired).toBe(true);
		expect(registry.has('test')).toBe(false); // auto-removed
	});

	test('one-shot timer does not fire before expiry', () => {
		const registry = createTimerRegistry();
		let fired = false;
		registry.register('test', {
			remaining: 100,
			onExpire: () => {
				fired = true;
			}
		});
		registry.tick(50);
		expect(fired).toBe(false);
		expect(registry.has('test')).toBe(true);
	});

	test('repeating timer fires and resets', () => {
		const registry = createTimerRegistry();
		let count = 0;
		registry.register('tick', {
			remaining: 1000,
			onExpire: () => {
				count++;
			},
			repeat: 1000
		});

		registry.tick(1000);
		expect(count).toBe(1);
		expect(registry.has('tick')).toBe(true); // still alive

		registry.tick(1000);
		expect(count).toBe(2);
	});

	test('repeating timer carries remainder', () => {
		const registry = createTimerRegistry();
		let count = 0;
		registry.register('tick', {
			remaining: 1000,
			onExpire: () => {
				count++;
			},
			repeat: 1000
		});

		// 2500ms = fires at 1000, 2000, remainder 500
		registry.tick(2500);
		expect(count).toBe(2);

		// 600ms more = 500 + 600 = 1100, fires once more
		registry.tick(600);
		expect(count).toBe(3);
	});

	test('remove cancels a timer', () => {
		const registry = createTimerRegistry();
		let fired = false;
		registry.register('test', {
			remaining: 100,
			onExpire: () => {
				fired = true;
			}
		});
		registry.remove('test');
		registry.tick(200);
		expect(fired).toBe(false);
	});

	test('multiple timers tick independently', () => {
		const registry = createTimerRegistry();
		let a = 0,
			b = 0;
		registry.register('a', {
			remaining: 100,
			onExpire: () => {
				a++;
			}
		});
		registry.register('b', {
			remaining: 200,
			onExpire: () => {
				b++;
			}
		});

		registry.tick(150);
		expect(a).toBe(1);
		expect(b).toBe(0);

		registry.tick(100);
		expect(b).toBe(1);
	});

	test('registering same name replaces existing timer', () => {
		const registry = createTimerRegistry();
		let first = 0,
			second = 0;
		registry.register('test', {
			remaining: 100,
			onExpire: () => {
				first++;
			}
		});
		registry.register('test', {
			remaining: 200,
			onExpire: () => {
				second++;
			}
		});

		registry.tick(150);
		expect(first).toBe(0);
		expect(second).toBe(0);

		registry.tick(100);
		expect(second).toBe(1);
	});

	test('clear removes all timers', () => {
		const registry = createTimerRegistry();
		let fired = false;
		registry.register('a', {
			remaining: 100,
			onExpire: () => {
				fired = true;
			}
		});
		registry.register('b', {
			remaining: 100,
			onExpire: () => {
				fired = true;
			}
		});
		registry.clear();
		registry.tick(200);
		expect(fired).toBe(false);
	});

	test('has returns correct status', () => {
		const registry = createTimerRegistry();
		expect(registry.has('test')).toBe(false);
		registry.register('test', { remaining: 100, onExpire: () => {} });
		expect(registry.has('test')).toBe(true);
	});

	test('getRemaining returns remaining ms', () => {
		const registry = createTimerRegistry();
		registry.register('test', { remaining: 500, onExpire: () => {} });
		registry.tick(200);
		expect(registry.getRemaining('test')).toBe(300);
	});

	test('getRemaining returns 0 for non-existent timer', () => {
		const registry = createTimerRegistry();
		expect(registry.getRemaining('test')).toBe(0);
	});
});

describe('game loop simulation', () => {
	test('simulate poison ticking for 5 seconds deals 5 ticks', () => {
		const registry = createTimerRegistry();
		let poisonTicks = 0;
		registry.register('poison_tick', {
			remaining: 1000,
			onExpire: () => {
				poisonTicks++;
			},
			repeat: 1000
		});

		// Simulate 5 seconds at ~60fps
		for (let frame = 0; frame < 300; frame++) {
			registry.tick(16.67);
		}

		expect(poisonTicks).toBe(5);
	});

	test('simulate boss timer expiring after 30 seconds', () => {
		const registry = createTimerRegistry();
		let bossExpired = false;
		let secondsLeft = 30;

		registry.register('boss_countdown', {
			remaining: 1000,
			repeat: 1000,
			onExpire: () => {
				secondsLeft--;
				if (secondsLeft <= 0) {
					registry.remove('boss_countdown');
					bossExpired = true;
				}
			}
		});

		// Tick 29 seconds — boss should still be alive
		registry.tick(29000);
		expect(bossExpired).toBe(false);
		expect(secondsLeft).toBe(1);

		// Tick final second
		registry.tick(1000);
		expect(bossExpired).toBe(true);
		expect(registry.has('boss_countdown')).toBe(false);
	});

	test('simulate attack cooldown cycle: fire -> wait -> fire', () => {
		const registry = createTimerRegistry();
		let attacks = 0;
		const attackInterval = 1250; // 0.8 attacks/sec

		function fireAttack() {
			attacks++;
			registry.register('attack_cooldown', {
				remaining: attackInterval,
				onExpire: () => {
					fireAttack();
				}
			});
		}

		// First attack
		fireAttack();
		expect(attacks).toBe(1);

		// Tick 1249ms — no second attack yet
		registry.tick(1249);
		expect(attacks).toBe(1);

		// Tick 1ms more — cooldown expires, second attack fires
		registry.tick(1);
		expect(attacks).toBe(2);

		// Tick full interval — third attack
		registry.tick(1250);
		expect(attacks).toBe(3);
	});

	test('simulate concurrent timers: attack + poison + boss all ticking', () => {
		const registry = createTimerRegistry();
		let attacks = 0;
		let poisonTicks = 0;
		let bossSeconds = 30;

		// Attack every 1250ms
		function fireAttack() {
			attacks++;
			registry.register('attack_cooldown', {
				remaining: 1250,
				onExpire: () => {
					fireAttack();
				}
			});
		}

		// Poison every 1000ms
		registry.register('poison_tick', {
			remaining: 1000,
			onExpire: () => {
				poisonTicks++;
			},
			repeat: 1000
		});

		// Boss countdown every 1000ms
		registry.register('boss_countdown', {
			remaining: 1000,
			repeat: 1000,
			onExpire: () => {
				bossSeconds--;
			}
		});

		fireAttack();

		// Simulate 5 seconds
		registry.tick(5000);

		expect(attacks).toBe(5); // 1 initial + 4 from cooldowns (at 1250, 2500, 3750, 5000)
		expect(poisonTicks).toBe(5); // at 1000, 2000, 3000, 4000, 5000
		expect(bossSeconds).toBe(25); // 30 - 5
	});

	test('simulate pausing: timers do not advance when not ticked', () => {
		const registry = createTimerRegistry();
		let fired = false;
		registry.register('test', {
			remaining: 100,
			onExpire: () => {
				fired = true;
			}
		});

		// "Pause" by simply not calling tick for a while
		// Then resume by ticking
		registry.tick(50);
		expect(fired).toBe(false);

		// No tick calls = paused
		// Resume
		registry.tick(50);
		expect(fired).toBe(true);
	});
});
