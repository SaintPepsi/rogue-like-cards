import { test, expect, describe } from 'vitest';
import { createTimerRegistry } from '$lib/engine/timerRegistry';
import {
	getEffectiveAttackSpeed,
	getAttackIntervalMs
} from '$lib/engine/attackSpeed';

// These tests simulate game loop scenarios using the timer registry directly,
// without rAF (which requires a browser). This validates the timer-driven
// game loop logic deterministically.

describe('game loop integration', () => {
	test('full encounter: attack until enemy dies', () => {
		const timers = createTimerRegistry();
		let enemyHp = 10;
		const damage = 3;
		let attacks = 0;

		function fireAttack() {
			attacks++;
			enemyHp = Math.max(0, enemyHp - damage);
			if (enemyHp > 0) {
				timers.register('attack_cooldown', {
					remaining: getAttackIntervalMs(0.8),
					onExpire: fireAttack
				});
			}
		}

		// Initial attack
		fireAttack();
		expect(attacks).toBe(1);
		expect(enemyHp).toBe(7);

		// Tick through multiple attack cycles
		for (let i = 0; i < 20 && enemyHp > 0; i++) {
			timers.tick(getAttackIntervalMs(0.8));
		}

		expect(enemyHp).toBe(0);
		expect(attacks).toBe(4); // 3+3+3+3 = 12 > 10, but we stop at 0
	});

	test('poison and attacks run concurrently', () => {
		const timers = createTimerRegistry();
		let attacks = 0;
		let poisonTicks = 0;

		function fireAttack() {
			attacks++;
			timers.register('attack_cooldown', {
				remaining: getAttackIntervalMs(1.0), // 1000ms
				onExpire: fireAttack
			});
		}

		timers.register('poison_tick', {
			remaining: 1000,
			repeat: 1000,
			onExpire: () => {
				poisonTicks++;
			}
		});

		fireAttack(); // immediate first attack
		expect(attacks).toBe(1);

		// Tick 3 seconds
		timers.tick(1000);
		timers.tick(1000);
		timers.tick(1000);

		expect(attacks).toBe(4); // 1 initial + 3 from cooldowns
		expect(poisonTicks).toBe(3);
	});

	test('frenzy decay: stacks expire independently', () => {
		const timers = createTimerRegistry();
		let frenzyCount = 0;
		let frenzyId = 0;

		function addFrenzyStack(duration: number) {
			frenzyId++;
			frenzyCount++;
			const id = frenzyId;
			timers.register(`frenzy_${id}`, {
				remaining: duration,
				onExpire: () => {
					frenzyCount = Math.max(0, frenzyCount - 1);
				}
			});
		}

		// Add 3 stacks at different times
		addFrenzyStack(3000);
		expect(frenzyCount).toBe(1);

		timers.tick(500);
		addFrenzyStack(3000);
		expect(frenzyCount).toBe(2);

		timers.tick(500);
		addFrenzyStack(3000);
		expect(frenzyCount).toBe(3);

		// After 2000ms more, first stack expires (3000 - 0 - 500 - 500 - 2000 = 0)
		timers.tick(2000);
		expect(frenzyCount).toBe(2);

		// After 500ms more, second stack expires
		timers.tick(500);
		expect(frenzyCount).toBe(1);

		// After 500ms more, third stack expires
		timers.tick(500);
		expect(frenzyCount).toBe(0);
	});

	test('tap queuing: queued tap fires after cooldown', () => {
		const timers = createTimerRegistry();
		let attacks = 0;
		let attackQueuedTap = false;
		const pointerHeld = false;
		const frenzyCount = 0;

		function fireAttack() {
			attacks++;
			attackQueuedTap = false;
			timers.register('attack_cooldown', {
				remaining: getAttackIntervalMs(0.8),
				onExpire: () => {
					const canAttack = pointerHeld || frenzyCount > 0;
					if (canAttack || attackQueuedTap) {
						fireAttack();
					}
				}
			});
		}

		// First tap fires immediately
		fireAttack();
		expect(attacks).toBe(1);

		// Second tap during cooldown queues
		attackQueuedTap = true;

		// Cooldown expires, queued tap fires
		timers.tick(getAttackIntervalMs(0.8));
		expect(attacks).toBe(2);

		// No more queued taps, cooldown expires without firing
		timers.tick(getAttackIntervalMs(0.8));
		expect(attacks).toBe(2);
	});

	test('attack speed changes with frenzy stacks', () => {
		const baseSpeed = 0.8;
		const frenzyBonus = 0.05;

		const speed0 = getEffectiveAttackSpeed(baseSpeed, 0, frenzyBonus);
		const speed5 = getEffectiveAttackSpeed(baseSpeed, 5, frenzyBonus);
		const speed10 = getEffectiveAttackSpeed(baseSpeed, 10, frenzyBonus);

		expect(speed0).toBe(0.8);
		expect(speed5).toBe(0.8 * (1 + 5 * 0.05)); // 0.8 * 1.25 = 1.0
		expect(speed10).toBe(0.8 * (1 + 10 * 0.05)); // 0.8 * 1.5 = 1.2

		// Higher speed = lower interval
		expect(getAttackIntervalMs(speed5)).toBeLessThan(getAttackIntervalMs(speed0));
		expect(getAttackIntervalMs(speed10)).toBeLessThan(getAttackIntervalMs(speed5));
	});

	test('boss timer counts down and fires expired callback', () => {
		const timers = createTimerRegistry();
		let bossExpired = false;
		let bossTimeRemaining = 30;

		timers.register('boss_countdown', {
			remaining: 1000,
			repeat: 1000,
			onExpire: () => {
				bossTimeRemaining--;
				if (bossTimeRemaining <= 0) {
					timers.remove('boss_countdown');
					bossExpired = true;
				}
			}
		});

		// Tick 29 seconds
		timers.tick(29000);
		expect(bossTimeRemaining).toBe(1);
		expect(bossExpired).toBe(false);

		// Final second
		timers.tick(1000);
		expect(bossTimeRemaining).toBe(0);
		expect(bossExpired).toBe(true);
		expect(timers.has('boss_countdown')).toBe(false);
	});

	test('boss timer can be stopped early', () => {
		const timers = createTimerRegistry();
		let bossExpired = false;
		let bossTimeRemaining = 30;

		timers.register('boss_countdown', {
			remaining: 1000,
			repeat: 1000,
			onExpire: () => {
				bossTimeRemaining--;
				if (bossTimeRemaining <= 0) {
					timers.remove('boss_countdown');
					bossExpired = true;
				}
			}
		});

		timers.tick(5000);
		expect(bossTimeRemaining).toBe(25);

		// Boss defeated early
		timers.remove('boss_countdown');

		timers.tick(25000);
		expect(bossTimeRemaining).toBe(25);
		expect(bossExpired).toBe(false);
	});

	test('hold-to-attack: pointer held keeps attacking', () => {
		const timers = createTimerRegistry();
		let attacks = 0;
		const pointerHeld = true;
		const frenzyCount = 0;

		function fireAttack() {
			attacks++;
			timers.register('attack_cooldown', {
				remaining: getAttackIntervalMs(1.0),
				onExpire: () => {
					if (pointerHeld || frenzyCount > 0) {
						fireAttack();
					}
				}
			});
		}

		fireAttack(); // initial
		expect(attacks).toBe(1);

		// Hold for 5 seconds at 1.0 attacks/sec = 5 more attacks
		timers.tick(5000);
		expect(attacks).toBe(6);
	});
});
