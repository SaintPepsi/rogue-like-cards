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
		goldDropChance: 0.1,
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
	description: string; // mechanical tooltip text
	// format: displays the total stat value (e.g. 1.5 → "+50%")
	format: (value: number | boolean) => string;
	// formatMod: displays the modifier delta on upgrade cards (e.g. 0.5 → "+50%")
	// Falls back to format when absent. Needed for stats where the base is non-zero
	// (multipliers with base 1) so the delta formatter differs from the total formatter.
	formatMod?: (value: number | boolean) => string;
	colorClass?: string;
	alwaysShow?: boolean;
};

const smartPercent = (n: number) => (Number.isInteger(n) ? `${n}` : `${n.toFixed(1)}`);
const asPercent = (v: number | boolean) => `${smartPercent((v as number) * 100)}%`;
const asBonusPercent = (v: number | boolean) => `+${smartPercent(((v as number) - 1) * 100)}%`;
const asPlusPercent = (v: number | boolean) => `+${smartPercent((v as number) * 100)}%`;
const asPlusNumber = (v: number | boolean) => `+${formatNumber(v as number)}`;
const asNumber = (v: number | boolean) => formatNumber(v as number);
const asPlusSeconds = (v: number | boolean) => `+${v}s`;

// UI display concern colocated with stat defaults for convenience — both change together when stats are added/removed.
export const statRegistry: StatEntry[] = [
	{
		key: 'damage',
		icon: '⚔️',
		label: 'Damage',
		description: 'Base damage dealt per attack.',
		format: asNumber,
		formatMod: asPlusNumber,
		alwaysShow: true
	},
	{
		key: 'damageMultiplier',
		icon: '⚔️',
		label: 'Damage Bonus',
		description: 'Percentage bonus applied to all damage.',
		format: asBonusPercent,
		formatMod: asPlusPercent
	},
	{
		key: 'critChance',
		icon: '🎯',
		label: 'Crit Chance',
		description: 'Probability of landing a critical hit.',
		format: asPercent,
		formatMod: asPlusPercent
	},
	{
		key: 'critMultiplier',
		icon: '💥',
		label: 'Crit Damage',
		description: 'Damage multiplier applied on critical hits.',
		format: (v) => `${(v as number).toFixed(1)}x`,
		formatMod: (v) => `+${(v as number).toFixed(1)}x`
	},
	{
		key: 'poison',
		icon: '☠️',
		label: 'Poison',
		description: 'Damage dealt per poison stack per tick.',
		format: (v) => `${formatNumber(v as number)}/stk`,
		formatMod: (v) => `+${formatNumber(v as number)}/stk`,
		colorClass: 'poison'
	},
	{
		key: 'poisonMaxStacks',
		icon: '🧪',
		label: 'Max Stacks',
		description: 'Maximum number of concurrent poison stacks on a target.',
		format: (v) => `${v}`,
		formatMod: (v) => `+${v}`,
		colorClass: 'poison'
	},
	{
		key: 'poisonDuration',
		icon: '🕐',
		label: 'Duration',
		description: 'How long each poison stack lasts.',
		format: (v) => `${v}s`,
		formatMod: asPlusSeconds,
		colorClass: 'poison'
	},
	{
		key: 'poisonCritChance',
		icon: '💀',
		label: 'Poison Crit',
		description: 'Chance for poison ticks to critically strike.',
		format: asPercent,
		formatMod: asPlusPercent,
		colorClass: 'poison'
	},
	{
		key: 'multiStrike',
		icon: '⚡',
		label: 'Multi-Strike',
		description: 'Extra attacks dealt per click.',
		format: asNumber,
		formatMod: asPlusNumber
	},
	{
		key: 'executeChance',
		icon: '⚰️',
		label: 'Execute',
		description: 'Chance to instantly kill an enemy. Capped at 10% against bosses.',
		format: asPercent,
		formatMod: asPlusPercent
	},
	// { key: 'overkill', icon: '💀', label: 'Overkill', format: () => 'Active' }, // disabled — needs redesign
	{
		key: 'xpMultiplier',
		icon: '✨',
		label: 'XP Bonus',
		description: 'Percentage bonus applied to all XP gained.',
		format: asBonusPercent,
		formatMod: asPlusPercent
	},
	{
		key: 'bonusBossTime',
		icon: '⏱️',
		label: 'Boss Time',
		description: 'Extra seconds added to boss fight timers.',
		format: (v) => `${v}s`,
		formatMod: asPlusSeconds
	},
	{
		key: 'luckyChance',
		icon: '🍀',
		label: 'Lucky',
		description: 'Bonus chance to be offered rare upgrades.',
		format: asPercent,
		formatMod: asPlusPercent
	},
	{
		key: 'chestChance',
		icon: '📦',
		label: 'Chest Chance',
		description: 'Probability of a chest spawning after a kill.',
		format: asPercent,
		formatMod: asPlusPercent
	},
	{
		key: 'bossChestChance',
		icon: '👑',
		label: 'Mimic',
		description: 'Probability of a boss dropping a mimic chest.',
		format: asPercent,
		formatMod: asPlusPercent
	},
	{
		key: 'goldDropChance',
		icon: '🪙',
		label: 'Gold Drop',
		description: 'Probability of gold dropping from a kill.',
		format: asPercent,
		formatMod: asPlusPercent,
		colorClass: 'gold'
	},
	{
		key: 'goldPerKill',
		icon: '💵',
		label: 'Gold/Kill',
		description: 'Flat gold earned per enemy killed.',
		format: asNumber,
		formatMod: asPlusNumber,
		colorClass: 'gold'
	},
	{
		key: 'goldMultiplier',
		icon: '🏆',
		label: 'Gold Bonus',
		description: 'Percentage bonus applied to all gold earned.',
		format: asBonusPercent,
		formatMod: asPlusPercent,
		colorClass: 'gold'
	},
	{
		key: 'greed',
		icon: '💰',
		label: 'Greed',
		description: 'Increases gold earned but also increases enemy health.',
		format: asPercent,
		formatMod: asPlusPercent,
		colorClass: 'greed'
	},
	{
		key: 'attackSpeed',
		icon: '🗡️',
		label: 'Attack Speed',
		description: 'Number of automatic attacks per second.',
		format: (v) => `${(v as number).toFixed(2)}/s`,
		formatMod: (v) => `+${(v as number).toFixed(2)}/s`,
		alwaysShow: true
	},
	{
		key: 'tapFrenzyBonus',
		icon: '✨',
		label: 'Frenzy Bonus',
		description: 'Attack speed bonus gained per frenzy tap.',
		format: asPercent,
		formatMod: asPlusPercent
	},
	{
		key: 'tapFrenzyDuration',
		icon: '⏳',
		label: 'Frenzy Duration',
		description: 'How long the frenzy effect lasts.',
		format: (v) => `${v}s`,
		formatMod: asPlusSeconds
	},
	{
		key: 'tapFrenzyStackMultiplier',
		icon: '🔥',
		label: 'Frenzy Stacks',
		description: 'Multiplier applied to frenzy stack accumulation.',
		format: (v) => `${v}x`,
		formatMod: (v) => `+${v}x`
	}
];
