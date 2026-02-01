import type { PlayerStats } from '$lib/types';
import { sfx } from '$lib/audio';
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

	function spawn(
		flags: { boss: boolean; chest: boolean; bossChest: boolean },
		healthFn: (stage: number, greed: number) => number,
		greed: number
	) {
		isBoss = flags.boss;
		isChest = flags.chest;
		isBossChest = flags.bossChest;
		enemyMaxHealth = healthFn(stage, greed);
		enemyHealth = enemyMaxHealth;
	}

	function spawnEnemy(greed: number) {
		spawn({ boss: false, chest: false, bossChest: false }, getEnemyHealth, greed);
	}

	function spawnBoss(greed: number) {
		spawn({ boss: true, chest: false, bossChest: false }, getBossHealth, greed);
		sfx.play('enemy:bossSpawn');
	}

	function spawnChest(greed: number) {
		spawn({ boss: false, chest: true, bossChest: false }, getChestHealth, greed);
	}

	function spawnBossChest(greed: number) {
		spawn({ boss: false, chest: true, bossChest: true }, getBossChestHealth, greed);
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
