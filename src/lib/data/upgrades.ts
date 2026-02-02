import type { Upgrade, StatModifier } from '$lib/types';
import { statRegistry } from '$lib/engine/stats';

// Card images
import swordImg from '$lib/assets/images/cards/sword.png';
import axeImg from '$lib/assets/images/cards/axe.png';
import attackImg from '$lib/assets/images/cards/attack.png';
import fireImg from '$lib/assets/images/cards/fire.png';
import bookImg from '$lib/assets/images/cards/book.png';
import chestImg from '$lib/assets/images/cards/chest.png';
import poisonImg from '$lib/assets/images/cards/poison.png';
import timerImg from '$lib/assets/images/cards/timer.png';
import coinsImg from '$lib/assets/images/cards/coins.png';
import hammerImg from '$lib/assets/images/cards/hammer.png';
import pickaxeImg from '$lib/assets/images/cards/pickaxe.png';
import mimicImg from '$lib/assets/images/mimic-closed.png';

const _allUpgrades = [
	// === DAMAGE UPGRADES ===
	{
		id: 'damage_1',
		title: 'Sharpen Blade',
		rarity: 'common',
		image: swordImg,
		modifiers: [{ stat: 'damage', value: 1 }]
	},
	{
		id: 'damage_2',
		title: 'Heavy Strike',
		rarity: 'uncommon',
		image: swordImg,
		modifiers: [{ stat: 'damage', value: 3 }]
	},
	{
		id: 'damage_3',
		title: 'Devastating Blow',
		rarity: 'rare',
		image: axeImg,
		modifiers: [{ stat: 'damage', value: 5 }]
	},
	{
		id: 'damage_4',
		title: 'Titan Strength',
		rarity: 'epic',
		image: hammerImg,
		modifiers: [{ stat: 'damage', value: 10 }]
	},

	// === CRIT CHANCE UPGRADES ===
	{
		id: 'crit_chance_1',
		title: 'Keen Eye',
		rarity: 'common',
		image: attackImg,
		modifiers: [{ stat: 'critChance', value: 0.05 }]
	},
	{
		id: 'crit_chance_2',
		title: "Assassin's Focus",
		rarity: 'uncommon',
		image: attackImg,
		modifiers: [{ stat: 'critChance', value: 0.1 }]
	},
	{
		id: 'crit_chance_3',
		title: 'Death Mark',
		rarity: 'rare',
		image: attackImg,
		modifiers: [
			{ stat: 'critChance', value: 0.15 },
			{ stat: 'critMultiplier', value: 0.5 }
		]
	},

	// === CRIT DAMAGE UPGRADES ===
	{
		id: 'crit_damage_1',
		title: 'Brutal Force',
		rarity: 'uncommon',
		image: fireImg,
		modifiers: [{ stat: 'critMultiplier', value: 0.5 }]
	},
	{
		id: 'crit_damage_2',
		title: 'Executioner',
		rarity: 'epic',
		image: fireImg,
		modifiers: [{ stat: 'critMultiplier', value: 1 }]
	},

	// === XP UPGRADES ===
	{
		id: 'xp_1',
		title: 'Quick Learner',
		rarity: 'common',
		image: bookImg,
		modifiers: [{ stat: 'xpMultiplier', value: 0.25 }]
	},
	{
		id: 'xp_2',
		title: 'Wisdom',
		rarity: 'uncommon',
		image: bookImg,
		modifiers: [{ stat: 'xpMultiplier', value: 0.5 }]
	},

	// === POISON UPGRADES ===
	{
		id: 'poison_1',
		title: 'Toxic Coating',
		rarity: 'common',
		image: poisonImg,
		modifiers: [{ stat: 'poison', value: 1 }]
	},
	{
		id: 'poison_2',
		title: 'Venomous Strike',
		rarity: 'uncommon',
		image: poisonImg,
		modifiers: [{ stat: 'poison', value: 3 }]
	},
	{
		id: 'poison_3',
		title: 'Plague Bearer',
		rarity: 'rare',
		image: poisonImg,
		modifiers: [{ stat: 'poison', value: 5 }]
	},

	// === POISON DURATION UPGRADES ===
	{
		id: 'poison_duration_1',
		title: 'Lingering Toxin',
		rarity: 'common',
		image: poisonImg,
		modifiers: [{ stat: 'poisonDuration', value: 2 }]
	},
	{
		id: 'poison_duration_2',
		title: 'Slow Rot',
		rarity: 'uncommon',
		image: poisonImg,
		modifiers: [{ stat: 'poisonDuration', value: 4 }]
	},
	{
		id: 'poison_duration_3',
		title: 'Eternal Blight',
		rarity: 'rare',
		image: poisonImg,
		modifiers: [{ stat: 'poisonDuration', value: 8 }]
	},

	// === POISON MAX STACKS UPGRADES ===
	{
		id: 'poison_stacks_1',
		title: 'Compound Toxin',
		rarity: 'uncommon',
		image: poisonImg,
		modifiers: [{ stat: 'poisonMaxStacks', value: 3 }]
	},
	{
		id: 'poison_stacks_2',
		title: 'Venom Cascade',
		rarity: 'rare',
		image: poisonImg,
		modifiers: [{ stat: 'poisonMaxStacks', value: 5 }]
	},
	{
		id: 'poison_stacks_3',
		title: 'Pandemic',
		rarity: 'epic',
		image: poisonImg,
		modifiers: [{ stat: 'poisonMaxStacks', value: 10 }]
	},

	// === POISON CRIT UPGRADES ===
	{
		id: 'poison_crit_1',
		title: 'Virulent Toxin',
		rarity: 'uncommon',
		image: poisonImg,
		modifiers: [{ stat: 'poisonCritChance', value: 0.1 }]
	},
	{
		id: 'poison_crit_2',
		title: 'Deadly Venom',
		rarity: 'rare',
		image: poisonImg,
		modifiers: [{ stat: 'poisonCritChance', value: 0.2 }]
	},
	{
		id: 'poison_crit_3',
		title: 'Necrotic Touch',
		rarity: 'epic',
		image: poisonImg,
		modifiers: [{ stat: 'poisonCritChance', value: 0.3 }]
	},

	// === MULTI-STRIKE UPGRADES ===
	{
		id: 'multi_strike_1',
		title: 'Double Tap',
		rarity: 'uncommon',
		image: swordImg,
		modifiers: [{ stat: 'multiStrike', value: 1 }]
	},
	{
		id: 'multi_strike_2',
		title: 'Flurry',
		rarity: 'rare',
		image: swordImg,
		modifiers: [{ stat: 'multiStrike', value: 2 }]
	},
	{
		id: 'multi_strike_3',
		title: 'Blade Storm',
		rarity: 'epic',
		image: axeImg,
		modifiers: [{ stat: 'multiStrike', value: 3 }]
	},

	// === OVERKILL === (disabled — needs redesign before release)
	// {
	// 	id: 'overkill_1',
	// 	title: 'Overkill',
	// 	rarity: 'rare',
	// 	image: hammerImg,
	// 	modifiers: [{ stat: 'overkill', value: 1 }]
	// },

	// === EXECUTE ===
	{
		id: 'execute_1',
		title: 'Mercy Kill',
		rarity: 'uncommon',
		image: pickaxeImg,
		modifiers: [{ stat: 'executeChance', value: 0.005 }]
	},
	{
		id: 'execute_2',
		title: 'Culling Blade',
		rarity: 'rare',
		image: axeImg,
		modifiers: [{ stat: 'executeChance', value: 0.01 }]
	},
	{
		id: 'execute_3',
		title: 'Death Sentence',
		rarity: 'epic',
		image: axeImg,
		modifiers: [{ stat: 'executeChance', value: 0.02 }]
	},

	// === BOSS TIMER ===
	{
		id: 'boss_time_1',
		title: 'Borrowed Time',
		rarity: 'common',
		image: timerImg,
		modifiers: [{ stat: 'bonusBossTime', value: 5 }]
	},
	{
		id: 'boss_time_2',
		title: 'Time Warp',
		rarity: 'uncommon',
		image: timerImg,
		modifiers: [{ stat: 'bonusBossTime', value: 10 }]
	},

	// === GREED (Risk/Reward) ===
	{
		id: 'greed_1',
		title: 'Greed',
		rarity: 'uncommon',
		image: coinsImg,
		modifiers: [
			{ stat: 'greed', value: 0.5 },
			{ stat: 'xpMultiplier', value: 1 }
		]
	},
	{
		id: 'greed_2',
		title: 'Avarice',
		rarity: 'rare',
		image: coinsImg,
		modifiers: [
			{ stat: 'greed', value: 1 },
			{ stat: 'xpMultiplier', value: 2 }
		]
	},

	// === CHEST SPAWN ===
	{
		id: 'chest_chance_1',
		title: 'Keen Nose',
		rarity: 'uncommon',
		image: chestImg,
		modifiers: [{ stat: 'chestChance', value: 0.001 }]
	},
	{
		id: 'chest_chance_2',
		title: 'Treasure Sense',
		rarity: 'rare',
		image: chestImg,
		modifiers: [{ stat: 'chestChance', value: 0.001 }]
	},
	{
		id: 'chest_chance_3',
		title: 'Hoarder',
		rarity: 'epic',
		image: chestImg,
		modifiers: [
			{ stat: 'chestChance', value: 0.001 },
			{ stat: 'goldMultiplier', value: 0.5 }
		]
	},

	// === BOSS CHEST SPAWN (Legendary only) ===
	{
		id: 'boss_chest_1',
		title: "Mimic's Blessing",
		rarity: 'legendary',
		image: mimicImg,
		modifiers: [
			{ stat: 'bossChestChance', value: 0.001 },
			{ stat: 'chestChance', value: 0.001 }
		]
	},
	{
		id: 'boss_chest_2',
		title: "Dragon's Hoard",
		rarity: 'legendary',
		image: chestImg,
		modifiers: [
			{ stat: 'bossChestChance', value: 0.001 },
			{ stat: 'goldMultiplier', value: 1 }
		]
	},

	// === LUCKY ===
	{
		id: 'lucky_1',
		title: 'Lucky Charm',
		rarity: 'uncommon',
		image: chestImg,
		modifiers: [{ stat: 'luckyChance', value: 0.1 }]
	},
	{
		id: 'lucky_2',
		title: "Fortune's Favor",
		rarity: 'rare',
		image: chestImg,
		modifiers: [{ stat: 'luckyChance', value: 0.25 }]
	},

	// === GOLD DROP CHANCE ===
	{
		id: 'gold_drop_1',
		title: 'Keen Scavenger',
		rarity: 'common',
		image: coinsImg,
		modifiers: [{ stat: 'goldDropChance', value: 0.05 }]
	},
	{
		id: 'gold_drop_2',
		title: 'Treasure Hunter',
		rarity: 'uncommon',
		image: coinsImg,
		modifiers: [{ stat: 'goldDropChance', value: 0.1 }]
	},
	{
		id: 'gold_drop_3',
		title: 'Golden Touch',
		rarity: 'rare',
		image: coinsImg,
		modifiers: [
			{ stat: 'goldDropChance', value: 0.15 },
			{ stat: 'goldMultiplier', value: 0.25 }
		]
	},

	// === DAMAGE MULTIPLIER ===
	{
		id: 'damage_multiplier_1',
		title: 'Power Surge',
		rarity: 'epic',
		image: fireImg,
		modifiers: [{ stat: 'damageMultiplier', value: 0.25 }]
	},
	{
		id: 'damage_multiplier_2',
		title: 'Overwhelming Force',
		rarity: 'legendary',
		image: fireImg,
		modifiers: [{ stat: 'damageMultiplier', value: 0.5 }]
	},

	// === COMBO/LEGENDARY ===
	{
		id: 'combo_1',
		title: 'Berserker',
		rarity: 'epic',
		image: axeImg,
		modifiers: [
			{ stat: 'damage', value: 8 },
			{ stat: 'critChance', value: 0.1 }
		]
	},
	{
		id: 'combo_2',
		title: 'Poison Master',
		rarity: 'epic',
		image: poisonImg,
		modifiers: [
			{ stat: 'poison', value: 8 },
			{ stat: 'damage', value: 5 }
		]
	},
	{
		id: 'combo_3',
		title: 'Plague Doctor',
		rarity: 'epic',
		image: poisonImg,
		modifiers: [
			{ stat: 'poison', value: 5 },
			{ stat: 'poisonMaxStacks', value: 5 },
			{ stat: 'poisonDuration', value: 3 }
		]
	},
	{
		id: 'legendary_4',
		title: 'Toxic Apocalypse',
		rarity: 'legendary',
		image: poisonImg,
		modifiers: [
			{ stat: 'poison', value: 12 },
			{ stat: 'poisonMaxStacks', value: 10 },
			{ stat: 'poisonDuration', value: 5 },
			{ stat: 'poisonCritChance', value: 0.15 }
		]
	},
	{
		id: 'legendary_1',
		title: "Dragon's Fury",
		rarity: 'legendary',
		image: chestImg,
		modifiers: [
			{ stat: 'damage', value: 15 },
			{ stat: 'critChance', value: 0.2 },
			{ stat: 'critMultiplier', value: 1 }
		]
	},
	{
		id: 'legendary_2',
		title: 'Death Incarnate',
		rarity: 'legendary',
		image: fireImg,
		modifiers: [
			{ stat: 'poison', value: 10 },
			{ stat: 'executeChance', value: 0.02 },
			{ stat: 'multiStrike', value: 2 }
		]
	},
	{
		id: 'legendary_3',
		title: 'Time Lord',
		rarity: 'legendary',
		image: timerImg,
		modifiers: [
			{ stat: 'bonusBossTime', value: 20 },
			{ stat: 'multiStrike', value: 3 },
			{ stat: 'xpMultiplier', value: 1 }
		]
	},

	// === ATTACK SPEED ===
	{
		id: 'attack_speed_1',
		title: 'Quick Hands',
		rarity: 'common',
		image: swordImg,
		modifiers: [{ stat: 'attackSpeed', value: 0.1 }]
	},
	{
		id: 'attack_speed_2',
		title: 'Swift Strikes',
		rarity: 'uncommon',
		image: swordImg,
		modifiers: [{ stat: 'attackSpeed', value: 0.2 }]
	},
	{
		id: 'attack_speed_3',
		title: 'Blade Storm',
		rarity: 'rare',
		image: swordImg,
		modifiers: [{ stat: 'attackSpeed', value: 0.4 }]
	},

	// === FRENZY ===
	{
		id: 'frenzy_bonus_1',
		title: 'Battle Rage',
		rarity: 'uncommon',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyBonus', value: 0.05 }]
	},
	{
		id: 'frenzy_bonus_2',
		title: 'Berserker Fury',
		rarity: 'rare',
		image: fireImg,
		modifiers: [
			{ stat: 'tapFrenzyBonus', value: 0.05 },
			{ stat: 'attackSpeed', value: 0.2 }
		]
	},

	// === FRENZY DURATION ===
	{
		id: 'frenzy_duration_1',
		title: 'Adrenaline Rush',
		rarity: 'uncommon',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyDuration', value: 1 }]
	},
	{
		id: 'frenzy_duration_2',
		title: 'Sustained Fury',
		rarity: 'rare',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyDuration', value: 2 }]
	},
	{
		id: 'frenzy_duration_3',
		title: 'Relentless Rage',
		rarity: 'epic',
		image: fireImg,
		modifiers: [
			{ stat: 'tapFrenzyDuration', value: 3 },
			{ stat: 'tapFrenzyBonus', value: 0.03 }
		]
	},

	// === FRENZY BONUS (Epic capstone) ===
	{
		id: 'frenzy_bonus_3',
		title: 'Bloodlust',
		rarity: 'epic',
		image: fireImg,
		modifiers: [
			{ stat: 'tapFrenzyBonus', value: 0.08 },
			{ stat: 'attackSpeed', value: 0.3 }
		]
	},

	// === FRENZY LEGENDARY ===
	{
		id: 'frenzy_legendary_1',
		title: 'GOTTA GO FAST',
		rarity: 'legendary',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyStackMultiplier', value: 2 }]
	}
] as const satisfies readonly Upgrade[];

export type UpgradeId = (typeof _allUpgrades)[number]['id'];
export const allUpgrades: readonly Upgrade[] = _allUpgrades;

// === EXECUTE CAP (shop-only stackable card) ===
export const executeCapUpgrade: Upgrade = {
	id: 'execute_cap',
	title: "Executioner's Pact",
	rarity: 'epic',
	image: pickaxeImg,
	modifiers: [] // Applied via executeCapBonus in gameState, not through normal stats
};

// === GOLD PER KILL (shop-only stackable card) ===
export const goldPerKillUpgrade: Upgrade = {
	id: 'gold_per_kill',
	title: "Prospector's Pick",
	rarity: 'uncommon',
	image: coinsImg,
	modifiers: [] // Applied via goldPerKillBonus in gameState, not through normal stats
};

export const EXECUTE_CHANCE_BASE_CAP = 0.1;

export function getModifierDisplay(mod: StatModifier): {
	icon: string;
	label: string;
	value: string;
} {
	const entry = statRegistry.find((s) => s.key === mod.stat);
	if (!entry) return { icon: '', label: mod.stat, value: `+${mod.value}` };
	const formatter = entry.formatMod ?? entry.format;
	return { icon: entry.icon, label: entry.label, value: formatter(mod.value) };
}

export function getModifierDisplayWithTotal(
	mod: StatModifier,
	currentStats: Partial<import('$lib/types').PlayerStats>
): {
	icon: string;
	label: string;
	value: string;
	total?: string;
} {
	const base = getModifierDisplay(mod);
	const entry = statRegistry.find((s) => s.key === mod.stat);
	if (!entry) return base;

	const currentValue = currentStats[mod.stat];
	if (currentValue === undefined) return base;

	// Calculate new total (current + modifier)
	const newTotal = (currentValue as number) + (mod.value as number);
	const totalFormatted = entry.format(newTotal);

	return { ...base, total: totalFormatted };
}

// PERFORMANCE: Map for O(1) lookup by ID — called on every save/load and upgrade acquisition
const upgradeMap = new Map<UpgradeId, Upgrade>(allUpgrades.map((u) => [u.id as UpgradeId, u]));

export function getUpgradeById(id: string): Upgrade | undefined {
	return upgradeMap.get(id as UpgradeId);
}

const executeUpgradeIds: Set<UpgradeId> = new Set(['execute_1', 'execute_2', 'execute_3']);

// Upgrades that require the player to already have base poison
const poisonDependentIds: Set<UpgradeId> = new Set([
	'poison_duration_1',
	'poison_duration_2',
	'poison_duration_3',
	'poison_stacks_1',
	'poison_stacks_2',
	'poison_stacks_3',
	'poison_crit_1',
	'poison_crit_2',
	'poison_crit_3',
	'combo_3',
	'legendary_4'
]);

export function getExecuteCap(executeCapBonus: number): number {
	return EXECUTE_CHANCE_BASE_CAP + executeCapBonus;
}

export function getRandomLegendaryUpgrades(count: number): Upgrade[] {
	const legendaries = allUpgrades.filter((u) => u.rarity === 'legendary');
	const shuffled = [...legendaries].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

// DECISION: Each tier is roughly 1/3 the previous (67→22→7→3→1), summing to 100.
// This gives ~1 legendary per 100 draws and ~1 epic per 33 draws.
// The 1/3 ratio keeps higher tiers exciting without making them unobtainable.
const RARITY_TIER_CHANCES: Record<string, number> = {
	common: 67, // 67% chance per pick
	uncommon: 22, // 22% chance per pick  (~1/3 of common)
	rare: 7, //  7% chance per pick  (~1/3 of uncommon)
	epic: 3, //  3% chance per pick  (~1/3 of rare)
	legendary: 1 //  1% chance per pick  (~1/3 of epic)
};

// DECISION: Lucky redistributes 20% points from common into higher tiers.
// The split (5/7/5/3) favors rare slightly, keeping legendaries special even with full luck.
// At max lucky (1.0): common drops from 67% to 47%, legendary rises from 1% to 4%.
const LUCKY_TIER_BONUS: Record<string, number> = {
	common: -20, // loses 20% points
	uncommon: 5, // gains 5% points
	rare: 7, // gains 7% points
	epic: 5, // gains 5% points
	legendary: 3 // gains 3% points
};

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

// Pick N cards from a pool using rarity-weighted random selection (no duplicates).
// The pool can be any pre-filtered set of upgrades.
export function pickByRarity(pool: Upgrade[], count: number, luckyChance: number = 0): Upgrade[] {
	// Group pool by rarity
	const tiers: Record<string, Upgrade[]> = {};
	for (const upgrade of pool) {
		if (!tiers[upgrade.rarity]) tiers[upgrade.rarity] = [];
		tiers[upgrade.rarity].push(upgrade);
	}

	// Build effective tier chances (base + lucky bonus)
	const tierChances: Record<string, number> = {};
	for (const rarity of Object.keys(RARITY_TIER_CHANCES)) {
		const base = RARITY_TIER_CHANCES[rarity] ?? 0;
		const bonus = (LUCKY_TIER_BONUS[rarity] ?? 0) * luckyChance;
		tierChances[rarity] = Math.max(0, base + bonus);
	}

	// Build carousel: each tier gets tickets equal to its % chance,
	// distributed evenly across cards in that tier.
	// Use 100 total tickets so 1 ticket = 1% chance.
	const carousel: Upgrade[] = [];
	for (const [rarity, chance] of Object.entries(tierChances)) {
		const cards = tiers[rarity];
		if (!cards || cards.length === 0) continue;
		// Round up tickets so every non-empty tier gets representation
		const totalTickets = Math.max(1, Math.round(chance));
		// Spread tickets across cards in the tier
		for (let t = 0; t < totalTickets; t++) {
			carousel.push(cards[t % cards.length]);
		}
	}

	// Pick randomly from the carousel without duplicates
	const selected: Upgrade[] = [];
	const usedIds = new Set<string>();

	for (let i = 0; i < count && carousel.length > 0; i++) {
		let pick: Upgrade | null = null;
		for (let attempt = 0; attempt < carousel.length; attempt++) {
			const idx = Math.floor(Math.random() * carousel.length);
			const candidate = carousel[idx];
			if (!usedIds.has(candidate.id)) {
				pick = candidate;
				break;
			}
		}
		// Fallback: linear scan for any remaining card not yet picked
		if (!pick) {
			for (const candidate of carousel) {
				if (!usedIds.has(candidate.id)) {
					pick = candidate;
					break;
				}
			}
		}
		if (pick) {
			selected.push(pick);
			usedIds.add(pick.id);
		}
	}

	return selected;
}

export function getRandomUpgrades(
	count: number,
	luckyChance: number = 0,
	currentExecuteChance: number = 0,
	executeCap: number = EXECUTE_CHANCE_BASE_CAP,
	currentPoison: number = 0,
	minRarity: string = 'common'
): Upgrade[] {
	let pool = [...allUpgrades];

	// Filter by minimum rarity
	const minIndex = RARITY_ORDER.indexOf(minRarity as (typeof RARITY_ORDER)[number]);
	if (minIndex > 0) {
		const allowed = new Set(RARITY_ORDER.slice(minIndex));
		pool = pool.filter((u) => allowed.has(u.rarity as (typeof RARITY_ORDER)[number]));
	}

	// Filter out execute upgrades if player has hit their current cap
	if (currentExecuteChance >= executeCap) {
		pool = pool.filter((u) => !executeUpgradeIds.has(u.id as UpgradeId));
	}

	// Filter out poison-dependent upgrades if player has no base poison
	if (currentPoison <= 0) {
		pool = pool.filter((u) => !poisonDependentIds.has(u.id as UpgradeId));
	}

	return pickByRarity(pool, count, luckyChance);
}
