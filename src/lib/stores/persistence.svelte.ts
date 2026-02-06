import type { Effect, PlayerStats } from '$lib/types';

export interface SavedUpgradeEvent {
	type: 'levelup' | 'chest';
	choiceIds: string[];
	gold?: number;
}

export interface SessionSaveData {
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
	legendaryChoiceIds?: string[];
	hasSelectedStartingLegendary?: boolean;
	startingStats?: PlayerStats;
	endingStats?: PlayerStats;
	attackCounts?: Record<string, number>;
}

export interface PersistentSaveData {
	gold: number;
	purchasedUpgradeCounts: Record<string, number>;
	executeCapBonus: number;
	shopChoiceIds?: string[];
	rerollCost?: number;
	hasCompletedFirstRun: boolean;
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
				const parsed = JSON.parse(saved);
				// Default hasCompletedFirstRun to false for legacy saves
				return {
					gold: parsed.gold ?? 0,
					purchasedUpgradeCounts: parsed.purchasedUpgradeCounts ?? {},
					executeCapBonus: parsed.executeCapBonus ?? 0,
					shopChoiceIds: parsed.shopChoiceIds,
					rerollCost: parsed.rerollCost,
					hasCompletedFirstRun: parsed.hasCompletedFirstRun ?? false
				};
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
