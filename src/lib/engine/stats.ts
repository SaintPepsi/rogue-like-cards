import type { PlayerStats } from '$lib/types';
import { formatNumber } from '$lib/format';

// DECISION: Base stats establish the starting power level and feel of the game.
// Key design rationale for non-obvious defaults:
//   attackSpeed: 0.8 attacks/sec — fast enough to feel responsive, slow enough that speed upgrades matter
//   critMultiplier: 1.5x — standard ARPG crit bonus; higher base would devalue crit-damage cards
//   chestChance: 5% — roughly 1 chest per wave (5 kills), keeps gold income predictable
//   bossChestChance: 0.1% — ultra-rare windfall event (~1 per 1000 boss kills), legendary-gated
//   executeCap: 10% — hard floor prevents execute from trivializing bosses
//   poisonMaxStacks/Duration: 5/5 — conservative base so poison-build cards feel impactful when stacked
//   tapFrenzyBonus: 5% per tap — requires rapid tapping to meaningfully boost DPS (~20 taps = double speed)
//   tapFrenzyDuration: 3s — short window forces active engagement, decays fast if player stops
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
		goldPerKill: 0,
		attackSpeed: 0.8,
		tapFrenzyBonus: 0.05,
		tapFrenzyDuration: 3,
		tapFrenzyStackMultiplier: 1,
		executeCap: 0.1
	};
}

export const BASE_STATS: Readonly<PlayerStats> = Object.freeze(createDefaultStats());

export type StatEntry = {
	key: keyof PlayerStats;
	icon: string;
	label: string;
	// format: displays the total stat value (e.g. 1.5 → "+50%")
	format: (value: number | boolean) => string;
	// formatMod: displays the modifier delta on upgrade cards (e.g. 0.5 → "+50%")
	// Falls back to format when absent. Needed for stats where the base is non-zero
	// (multipliers with base 1) so the delta formatter differs from the total formatter.
	formatMod?: (value: number | boolean) => string;
	colorClass?: string;
	alwaysShow?: boolean;
};

const smartPercent = (n: number) => Number.isInteger(n) ? `${n}` : `${n.toFixed(1)}`;
const asPercent = (v: number | boolean) => `${smartPercent((v as number) * 100)}%`;
const asBonusPercent = (v: number | boolean) => `+${smartPercent(((v as number) - 1) * 100)}%`;
const asPlusPercent = (v: number | boolean) => `+${smartPercent((v as number) * 100)}%`;
const asPlusNumber = (v: number | boolean) => `+${formatNumber(v as number)}`;
const asNumber = (v: number | boolean) => formatNumber(v as number);
const asPlusSeconds = (v: number | boolean) => `+${v}s`;

// UI display concern colocated with stat defaults for convenience — both change together when stats are added/removed.
export const statRegistry: StatEntry[] = [
	{ key: 'damage', icon: '⚔️', label: 'Damage', format: asNumber, alwaysShow: true },
	{ key: 'damageMultiplier', icon: '⚔️', label: 'Damage Bonus', format: asBonusPercent, formatMod: asPlusPercent },
	{ key: 'critChance', icon: '🎯', label: 'Crit Chance', format: asPercent },
	{ key: 'critMultiplier', icon: '💥', label: 'Crit Damage', format: (v) => `${(v as number).toFixed(1)}x`, formatMod: (v) => `+${(v as number).toFixed(1)}x` },
	{ key: 'poison', icon: '☠️', label: 'Poison', format: (v) => `${formatNumber(v as number)}/stack`, colorClass: 'poison' },
	{ key: 'poisonMaxStacks', icon: '🧪', label: 'Max Stacks', format: (v) => `${v}`, colorClass: 'poison' },
	{ key: 'poisonDuration', icon: '🕐', label: 'Duration', format: (v) => `${v}s`, colorClass: 'poison' },
	{ key: 'poisonCritChance', icon: '💀', label: 'Poison Crit', format: asPercent, colorClass: 'poison' },
	{ key: 'multiStrike', icon: '⚡', label: 'Multi-Strike', format: asPlusNumber },
	{ key: 'executeChance', icon: '⚰️', label: 'Execute', format: asPercent },
	{ key: 'overkill', icon: '💀', label: 'Overkill', format: () => 'Active' },
	{ key: 'xpMultiplier', icon: '✨', label: 'XP Bonus', format: asBonusPercent, formatMod: asPlusPercent },
	{ key: 'bonusBossTime', icon: '⏱️', label: 'Boss Time', format: asPlusSeconds },
	{ key: 'luckyChance', icon: '🍀', label: 'Lucky', format: asPlusPercent },
	{ key: 'chestChance', icon: '📦', label: 'Chest Chance', format: asPercent },
	{ key: 'bossChestChance', icon: '👑', label: 'Mimic', format: asPercent },
	{ key: 'goldDropChance', icon: '🪙', label: 'Gold Drop', format: asPercent, colorClass: 'gold' },
	{ key: 'goldPerKill', icon: '💵', label: 'Gold/Kill', format: asPlusNumber, colorClass: 'gold' },
	{ key: 'goldMultiplier', icon: '🏆', label: 'Gold Bonus', format: asBonusPercent, formatMod: asPlusPercent, colorClass: 'gold' },
	{ key: 'greed', icon: '💰', label: 'Greed', format: asPlusPercent, colorClass: 'greed' },
	{ key: 'attackSpeed', icon: '🗡️', label: 'Attack Speed', format: (v) => `${(v as number).toFixed(2)}/s`, alwaysShow: true },
	{ key: 'tapFrenzyBonus', icon: '✨', label: 'Frenzy Bonus', format: asPlusPercent },
	{ key: 'tapFrenzyDuration', icon: '⏳', label: 'Frenzy Duration', format: asPlusSeconds },
	{ key: 'tapFrenzyStackMultiplier', icon: '🔥', label: 'Frenzy Stacks', format: (v) => `${v}x`, formatMod: (v) => `+${v}x` },
];
