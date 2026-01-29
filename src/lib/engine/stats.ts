import type { PlayerStats } from '$lib/types';

export function createDefaultStats(): PlayerStats {
	return {
		damage: 1,
		critChance: 0,
		critMultiplier: 1.5,
		xpMultiplier: 1,
		damageMultiplier: 1,
		poison: 0,
		poisonCritChance: 0,
		poisonMaxStacks: 5,
		poisonDuration: 5,
		multiStrike: 0,
		overkill: false,
		executeChance: 0,
		bonusBossTime: 0,
		greed: 0,
		luckyChance: 0,
		chestChance: 0.05,
		goldMultiplier: 1
	};
}
