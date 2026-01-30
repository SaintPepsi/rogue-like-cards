import type { PlayerStats } from '$lib/types';
import { formatNumber } from '$lib/format';

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
		bossChestChance: 0.001,
		goldMultiplier: 1,
		goldDropChance: 0.10,
		goldPerKill: 0
	};
}

export type StatEntry = {
	key: keyof PlayerStats;
	icon: string;
	label: string;
	format: (value: number | boolean) => string;
	colorClass?: string;
	alwaysShow?: boolean;
};

const pct = (v: number | boolean) => `${Math.round((v as number) * 100)}%`;
const bonusPct = (v: number | boolean) => `+${Math.round(((v as number) - 1) * 100)}%`;
const plusPct = (v: number | boolean) => `+${Math.round((v as number) * 100)}%`;
const plusNum = (v: number | boolean) => `+${formatNumber(v as number)}`;
const num = (v: number | boolean) => formatNumber(v as number);
const plusSec = (v: number | boolean) => `+${v}s`;

export const statRegistry: StatEntry[] = [
	{ key: 'damage', icon: '⚔️', label: 'Damage', format: num, alwaysShow: true },
	{ key: 'damageMultiplier', icon: '⚔️', label: 'Damage Bonus', format: bonusPct },
	{ key: 'critChance', icon: '🎯', label: 'Crit Chance', format: pct },
	{ key: 'critMultiplier', icon: '💥', label: 'Crit Damage', format: (v) => `${(v as number).toFixed(1)}x` },
	{ key: 'poison', icon: '☠️', label: 'Poison', format: (v) => `${formatNumber(v as number)}/stack`, colorClass: 'poison' },
	{ key: 'poisonMaxStacks', icon: '🧪', label: 'Max Stacks', format: (v) => `${v}`, colorClass: 'poison' },
	{ key: 'poisonDuration', icon: '🕐', label: 'Duration', format: (v) => `${v}s`, colorClass: 'poison' },
	{ key: 'poisonCritChance', icon: '💀', label: 'Poison Crit', format: pct, colorClass: 'poison' },
	{ key: 'multiStrike', icon: '⚡', label: 'Multi-Strike', format: plusNum },
	{ key: 'executeChance', icon: '⚰️', label: 'Execute', format: pct },
	{ key: 'overkill', icon: '💀', label: 'Overkill', format: () => 'Active' },
	{ key: 'xpMultiplier', icon: '✨', label: 'XP Bonus', format: bonusPct },
	{ key: 'bonusBossTime', icon: '⏱️', label: 'Boss Time', format: plusSec },
	{ key: 'luckyChance', icon: '🍀', label: 'Lucky', format: plusPct },
	{ key: 'chestChance', icon: '📦', label: 'Chest Chance', format: pct },
	{ key: 'bossChestChance', icon: '👑', label: 'Boss Chest', format: pct },
	{ key: 'goldDropChance', icon: '🪙', label: 'Gold Drop', format: pct, colorClass: 'gold' },
	{ key: 'goldPerKill', icon: '💵', label: 'Gold/Kill', format: plusNum, colorClass: 'gold' },
	{ key: 'goldMultiplier', icon: '🏆', label: 'Gold Bonus', format: bonusPct, colorClass: 'gold' },
	{ key: 'greed', icon: '💰', label: 'Greed', format: plusPct, colorClass: 'greed' },
];
