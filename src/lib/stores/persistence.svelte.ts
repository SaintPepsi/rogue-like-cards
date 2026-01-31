import type { PlayerStats, Effect } from '$lib/types';

export interface SavedUpgradeEvent {
	type: 'levelup' | 'chest';
	choiceIds: string[];
	gold?: number;
}

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
	upgradeQueue?: SavedUpgradeEvent[];
	activeEvent?: SavedUpgradeEvent | null;
	timestamp: number;
	bossTimeRemaining?: number;
}

export interface PersistentSaveData {
	gold: number;
	purchasedUpgradeIds: string[];
	executeCapBonus: number;
	goldPerKillBonus: number;
}

export function createPersistence(sessionKey: string, persistentKey: string) {
	function safeStorage<T>(fn: () => T, fallback: T, errorMsg: string): T {
		try {
			return fn();
		} catch (e) {
			console.warn(errorMsg, e);
			return fallback;
		}
	}

	function saveSession(data: SessionSaveData): void {
		safeStorage(
			() => localStorage.setItem(sessionKey, JSON.stringify(data)),
			undefined,
			'Failed to save game (localStorage may be full or unavailable in private browsing):'
		);
	}

	function loadSession(): SessionSaveData | null {
		return safeStorage(
			() => {
				const saved = localStorage.getItem(sessionKey);
				if (!saved) return null;
				return JSON.parse(saved) as SessionSaveData;
			},
			null,
			'Failed to load game (corrupted save data or localStorage unavailable):'
		);
	}

	function clearSession(): void {
		safeStorage(
			() => localStorage.removeItem(sessionKey),
			undefined,
			'Failed to clear save data (localStorage unavailable):'
		);
	}

	function savePersistent(data: PersistentSaveData): void {
		safeStorage(
			() => localStorage.setItem(persistentKey, JSON.stringify(data)),
			undefined,
			'Failed to save persistent data (localStorage may be full or unavailable in private browsing):'
		);
	}

	function loadPersistent(): PersistentSaveData | null {
		return safeStorage(
			() => {
				const saved = localStorage.getItem(persistentKey);
				if (!saved) return null;
				return JSON.parse(saved) as PersistentSaveData;
			},
			null,
			'Failed to load persistent data (corrupted data or localStorage unavailable):'
		);
	}

	function clearPersistent(): void {
		safeStorage(
			() => localStorage.removeItem(persistentKey),
			undefined,
			'Failed to clear persistent data (localStorage unavailable):'
		);
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
