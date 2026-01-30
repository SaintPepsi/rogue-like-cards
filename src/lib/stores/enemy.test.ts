import { describe, test, expect } from 'vitest';
import { createEnemy } from './enemy.svelte';
import { createDefaultStats } from '$lib/engine/stats';

describe('createEnemy', () => {
	test('spawns enemy with correct health', () => {
		const enemy = createEnemy();
		enemy.spawnEnemy(0);

		expect(enemy.enemyHealth).toBeGreaterThan(0);
		expect(enemy.enemyMaxHealth).toBe(enemy.enemyHealth);
		expect(enemy.isBoss).toBe(false);
		expect(enemy.isChest).toBe(false);
	});

	test('takeDamage reduces health', () => {
		const enemy = createEnemy();
		enemy.spawnEnemy(0);
		const initial = enemy.enemyHealth;

		enemy.takeDamage(5);
		expect(enemy.enemyHealth).toBe(initial - 5);
	});

	test('isDead returns true when health <= 0', () => {
		const enemy = createEnemy();
		enemy.spawnEnemy(0);

		enemy.takeDamage(enemy.enemyHealth + 10);
		expect(enemy.isDead()).toBe(true);
	});

	test('isDead returns false when health > 0', () => {
		const enemy = createEnemy();
		enemy.spawnEnemy(0);

		expect(enemy.isDead()).toBe(false);
	});

	test('recordKill increments enemiesKilled', () => {
		const enemy = createEnemy();
		expect(enemy.enemiesKilled).toBe(0);

		enemy.recordKill();
		expect(enemy.enemiesKilled).toBe(1);

		enemy.recordKill();
		expect(enemy.enemiesKilled).toBe(2);
	});

	test('advanceWave increments waveKills', () => {
		const enemy = createEnemy();
		expect(enemy.waveKills).toBe(0);

		enemy.advanceWave();
		expect(enemy.waveKills).toBe(1);
	});

	test('isWaveComplete returns true at killsPerWave', () => {
		const enemy = createEnemy();
		const needed = enemy.killsPerWave;

		for (let i = 0; i < needed; i++) {
			expect(enemy.isWaveComplete()).toBe(false);
			enemy.advanceWave();
		}
		expect(enemy.isWaveComplete()).toBe(true);
	});

	test('advanceStage increments stage and resets waveKills', () => {
		const enemy = createEnemy();
		expect(enemy.stage).toBe(1);

		enemy.advanceWave();
		enemy.advanceStage();
		expect(enemy.stage).toBe(2);
		expect(enemy.waveKills).toBe(0);
	});

	test('spawnBoss sets isBoss flag', () => {
		const enemy = createEnemy();
		enemy.spawnBoss(0);

		expect(enemy.isBoss).toBe(true);
		expect(enemy.isChest).toBe(false);
	});

	test('spawnChest sets isChest flag', () => {
		const enemy = createEnemy();
		enemy.spawnChest(0);

		expect(enemy.isChest).toBe(true);
		expect(enemy.isBoss).toBe(false);
	});

	test('spawnBossChest sets both boss and chest flags', () => {
		const enemy = createEnemy();
		enemy.spawnBossChest(0);

		expect(enemy.isBossChest).toBe(true);
		expect(enemy.isChest).toBe(true);
		expect(enemy.isBoss).toBe(false);
	});

	test('clearChestFlags resets chest state', () => {
		const enemy = createEnemy();
		enemy.spawnBossChest(0);

		enemy.clearChestFlags();
		expect(enemy.isChest).toBe(false);
		expect(enemy.isBossChest).toBe(false);
	});

	test('reset restores initial state', () => {
		const enemy = createEnemy();
		enemy.spawnBoss(0);
		enemy.recordKill();
		enemy.advanceWave();
		enemy.advanceStage();

		enemy.reset(0);
		expect(enemy.stage).toBe(1);
		expect(enemy.waveKills).toBe(0);
		expect(enemy.enemiesKilled).toBe(0);
		expect(enemy.isBoss).toBe(false);
		expect(enemy.isChest).toBe(false);
		expect(enemy.enemyHealth).toBeGreaterThan(0);
	});

	test('restore sets state from saved data', () => {
		const enemy = createEnemy();

		enemy.restore({
			stage: 5,
			waveKills: 3,
			enemiesKilled: 42,
			enemyHealth: 100,
			enemyMaxHealth: 200,
			isBoss: true,
			isChest: false,
			isBossChest: false
		});

		expect(enemy.stage).toBe(5);
		expect(enemy.waveKills).toBe(3);
		expect(enemy.enemiesKilled).toBe(42);
		expect(enemy.enemyHealth).toBe(100);
		expect(enemy.enemyMaxHealth).toBe(200);
		expect(enemy.isBoss).toBe(true);
	});

	test('greed multiplier increases enemy health', () => {
		const enemy = createEnemy();

		enemy.spawnEnemy(0);
		const baseHealth = enemy.enemyHealth;

		const enemy2 = createEnemy();
		enemy2.spawnEnemy(1);
		const greedHealth = enemy2.enemyHealth;

		expect(greedHealth).toBeGreaterThan(baseHealth);
	});
});
