import type { PlayerStats } from '$lib/types';
import {
	KILLS_PER_WAVE,
	getEnemyHealth,
	getBossHealth,
	getChestHealth,
	getBossChestHealth,
	shouldSpawnChest,
	shouldSpawnBossChest
} from '$lib/engine/waves';

export function createEnemy() {
	let enemyHealth = $state(10);
	let enemyMaxHealth = $state(10);
	let enemiesKilled = $state(0);
	let overkillDamage = $state(0);
	let isBoss = $state(false);
	let isChest = $state(false);
	let isBossChest = $state(false);
	let stage = $state(1);
	let waveKills = $state(0);

	function takeDamage(amount: number) {
		enemyHealth -= amount;
	}

	function isDead(): boolean {
		return enemyHealth <= 0;
	}

	function recordKill() {
		enemiesKilled++;
	}

	function advanceWave() {
		waveKills++;
	}

	function isWaveComplete(): boolean {
		return waveKills >= KILLS_PER_WAVE;
	}

	function advanceStage() {
		stage++;
		waveKills = 0;
		isBoss = false;
	}

	function spawnEnemy(greed: number) {
		isBoss = false;
		isChest = false;
		isBossChest = false;
		enemyMaxHealth = getEnemyHealth(stage, greed);
		enemyHealth = enemyMaxHealth;
	}

	function spawnBoss(greed: number) {
		isBoss = true;
		isChest = false;
		isBossChest = false;
		enemyMaxHealth = getBossHealth(stage, greed);
		enemyHealth = enemyMaxHealth;
	}

	function spawnChest(greed: number) {
		isChest = true;
		isBossChest = false;
		enemyMaxHealth = getChestHealth(stage, greed);
		enemyHealth = enemyMaxHealth;
	}

	function spawnBossChest(greed: number) {
		isChest = true;
		isBossChest = true;
		enemyMaxHealth = getBossChestHealth(stage, greed);
		enemyHealth = enemyMaxHealth;
	}

	function spawnNextTarget(stats: PlayerStats) {
		if (shouldSpawnChest(stats.chestChance, Math.random)) {
			spawnChest(stats.greed);
		} else {
			spawnEnemy(stats.greed);
		}
	}

	function shouldSpawnBossChestTarget(stats: PlayerStats): boolean {
		return shouldSpawnBossChest(stats.chestChance, stats.bossChestChance, Math.random);
	}

	function clearChestFlags() {
		isChest = false;
		isBossChest = false;
	}

	function setOverkillDamage(value: number) {
		overkillDamage = value;
	}

	function reset(greed: number) {
		stage = 1;
		waveKills = 0;
		enemiesKilled = 0;
		overkillDamage = 0;
		isBoss = false;
		isChest = false;
		isBossChest = false;
		spawnEnemy(greed);
	}

	function restore(data: {
		stage: number;
		waveKills: number;
		enemiesKilled: number;
		enemyHealth: number;
		enemyMaxHealth: number;
		isBoss: boolean;
		isChest: boolean;
		isBossChest: boolean;
	}) {
		stage = data.stage;
		waveKills = data.waveKills;
		enemiesKilled = data.enemiesKilled;
		enemyHealth = data.enemyHealth;
		enemyMaxHealth = data.enemyMaxHealth;
		isBoss = data.isBoss;
		isChest = data.isChest;
		isBossChest = data.isBossChest;
	}

	return {
		get enemyHealth() {
			return enemyHealth;
		},
		get enemyMaxHealth() {
			return enemyMaxHealth;
		},
		get enemiesKilled() {
			return enemiesKilled;
		},
		get overkillDamage() {
			return overkillDamage;
		},
		get isBoss() {
			return isBoss;
		},
		get isChest() {
			return isChest;
		},
		get isBossChest() {
			return isBossChest;
		},
		get stage() {
			return stage;
		},
		get waveKills() {
			return waveKills;
		},
		get killsPerWave() {
			return KILLS_PER_WAVE;
		},
		takeDamage,
		isDead,
		recordKill,
		advanceWave,
		isWaveComplete,
		advanceStage,
		spawnEnemy,
		spawnBoss,
		spawnChest,
		spawnBossChest,
		spawnNextTarget,
		shouldSpawnBossChestTarget,
		clearChestFlags,
		setOverkillDamage,
		reset,
		restore
	};
}
