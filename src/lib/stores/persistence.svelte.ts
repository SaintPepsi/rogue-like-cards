import type { PlayerStats, Effect } from '$lib/types';

export interface SessionSaveData {
	playerStats: PlayerStats;
	effects: Effect[];
	unlockedUpgradeIds: string[];
	xp: number;
	level: number;
	gold: number;
	stage: number;
	waveKills: number;
	enemiesKilled: number;
	enemyHealth: number;
	enemyMaxHealth: number;
	isBoss: boolean;
	isChest: boolean;
	isBossChest: boolean;
	timestamp: number;
}

export interface PersistentSaveData {
	gold: number;
	purchasedUpgradeIds: string[];
	executeCapBonus: number;
	goldPerKillBonus: number;
}

export function createPersistence(sessionKey: string, persistentKey: string) {
	function saveSession(data: SessionSaveData): void {
		try {
			localStorage.setItem(sessionKey, JSON.stringify(data));
		} catch (e) {
			console.warn('Failed to save game:', e);
		}
	}

	function loadSession(): SessionSaveData | null {
		try {
			const saved = localStorage.getItem(sessionKey);
			if (!saved) return null;
			return JSON.parse(saved) as SessionSaveData;
		} catch (e) {
			console.warn('Failed to load game:', e);
			return null;
		}
	}

	function clearSession(): void {
		try {
			localStorage.removeItem(sessionKey);
		} catch (e) {
			console.warn('Failed to clear save:', e);
		}
	}

	function savePersistent(data: PersistentSaveData): void {
		try {
			localStorage.setItem(persistentKey, JSON.stringify(data));
		} catch (e) {
			console.warn('Failed to save persistent data:', e);
		}
	}

	function loadPersistent(): PersistentSaveData | null {
		try {
			const saved = localStorage.getItem(persistentKey);
			if (!saved) return null;
			return JSON.parse(saved) as PersistentSaveData;
		} catch (e) {
			console.warn('Failed to load persistent data:', e);
			return null;
		}
	}

	function clearPersistent(): void {
		try {
			localStorage.removeItem(persistentKey);
		} catch (e) {
			console.warn('Failed to clear persistent data:', e);
		}
	}

	return {
		saveSession,
		loadSession,
		clearSession,
		savePersistent,
		loadPersistent,
		clearPersistent
	};
}
