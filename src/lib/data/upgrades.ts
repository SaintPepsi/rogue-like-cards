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
	// DECISION: 0.5% increments with 25% hard cap. At 0.5% per common card, reaching
	// the cap requires ~50 common crit cards — but higher tiers and combos provide
	// larger chunks, so a crit build can cap in ~10-15 targeted picks.
	{
		id: 'crit_chance_1',
		title: 'Keen Eye',
		rarity: 'common',
		image: attackImg,
		modifiers: [{ stat: 'critChance', value: 0.005 }]
	},
	{
		id: 'crit_chance_2',
		title: "Assassin's Focus",
		rarity: 'uncommon',
		image: attackImg,
		modifiers: [{ stat: 'critChance', value: 0.01 }]
	},
	{
		id: 'crit_chance_3',
		title: 'Precision Strike',
		rarity: 'rare',
		image: attackImg,
		modifiers: [{ stat: 'critChance', value: 0.025 }]
	},
	{
		id: 'crit_chance_4',
		title: 'Death Mark',
		rarity: 'epic',
		image: attackImg,
		modifiers: [{ stat: 'critChance', value: 0.05 }]
	},
	{
		id: 'crit_chance_5',
		title: "Assassin's Creed",
		rarity: 'legendary',
		image: attackImg,
		modifiers: [
			{ stat: 'critChance', value: 0.1 },
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
	// DECISION: Lower values spread across all tiers. XP multiplier already has sqrt diminishing
	// returns in the reward formula, so even small bonuses compound meaningfully at high values.
	{
		id: 'xp_1',
		title: 'Quick Learner',
		rarity: 'common',
		image: bookImg,
		modifiers: [{ stat: 'xpMultiplier', value: 0.05 }]
	},
	{
		id: 'xp_2',
		title: 'Wisdom',
		rarity: 'uncommon',
		image: bookImg,
		modifiers: [{ stat: 'xpMultiplier', value: 0.1 }]
	},
	{
		id: 'xp_3',
		title: 'Scholar',
		rarity: 'rare',
		image: bookImg,
		modifiers: [{ stat: 'xpMultiplier', value: 0.15 }]
	},
	{
		id: 'xp_4',
		title: 'Enlightenment',
		rarity: 'epic',
		image: bookImg,
		modifiers: [{ stat: 'xpMultiplier', value: 0.25 }]
	},
	{
		id: 'xp_5',
		title: 'Transcendence',
		rarity: 'legendary',
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
	// DECISION: Multistrike bumped up one rarity tier — multi-hit is too powerful at lower rarities
	// since it multiplies all on-hit effects (execute, poison application, crit rolls).
	{
		id: 'multi_strike_1',
		title: 'Double Tap',
		rarity: 'rare',
		image: swordImg,
		modifiers: [{ stat: 'multiStrike', value: 1 }]
	},
	{
		id: 'multi_strike_2',
		title: 'Flurry',
		rarity: 'epic',
		image: swordImg,
		modifiers: [{ stat: 'multiStrike', value: 2 }]
	},
	{
		id: 'multi_strike_3',
		title: 'Blade Storm',
		rarity: 'legendary',
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
	// DECISION: 5 tiers with lower values, base cap reduced from 10% to 5%.
	// Execute is the most powerful mechanic (instant kill) so per-card values stay tiny.
	{
		id: 'execute_1',
		title: 'Mercy Kill',
		rarity: 'common',
		image: pickaxeImg,
		modifiers: [{ stat: 'executeChance', value: 0.001 }]
	},
	{
		id: 'execute_2',
		title: 'Culling Blade',
		rarity: 'uncommon',
		image: pickaxeImg,
		modifiers: [{ stat: 'executeChance', value: 0.002 }]
	},
	{
		id: 'execute_3',
		title: 'Death Sentence',
		rarity: 'rare',
		image: axeImg,
		modifiers: [{ stat: 'executeChance', value: 0.005 }]
	},
	{
		id: 'execute_4',
		title: "Reaper's Mark",
		rarity: 'epic',
		image: axeImg,
		modifiers: [{ stat: 'executeChance', value: 0.01 }]
	},
	{
		id: 'execute_5',
		title: 'Final Judgment',
		rarity: 'legendary',
		image: axeImg,
		modifiers: [{ stat: 'executeChance', value: 0.025 }]
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
			{ stat: 'xpMultiplier', value: 0.1 }
		]
	},
	{
		id: 'greed_2',
		title: 'Avarice',
		rarity: 'rare',
		image: coinsImg,
		modifiers: [
			{ stat: 'greed', value: 1 },
			{ stat: 'xpMultiplier', value: 0.25 }
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
	// DECISION: 5 tiers with conservative values. Lucky shifts the gaussian focus point
	// toward higher rarities asymptotically. Even small amounts matter — 0.5 total lucky
	// moves focus to ~0.8 (still weighted toward common/uncommon but rare starts appearing).
	{
		id: 'lucky_1',
		title: 'Lucky Charm',
		rarity: 'common',
		image: chestImg,
		modifiers: [{ stat: 'luckyChance', value: 0.05 }]
	},
	{
		id: 'lucky_2',
		title: "Rabbit's Foot",
		rarity: 'uncommon',
		image: chestImg,
		modifiers: [{ stat: 'luckyChance', value: 0.1 }]
	},
	{
		id: 'lucky_3',
		title: "Fortune's Favor",
		rarity: 'rare',
		image: chestImg,
		modifiers: [{ stat: 'luckyChance', value: 0.2 }]
	},
	{
		id: 'lucky_4',
		title: 'Serendipity',
		rarity: 'epic',
		image: chestImg,
		modifiers: [{ stat: 'luckyChance', value: 0.5 }]
	},
	{
		id: 'lucky_5',
		title: 'Fate Weaver',
		rarity: 'legendary',
		image: chestImg,
		modifiers: [{ stat: 'luckyChance', value: 1.0 }]
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

	// === GOLD PER KILL (flat, all tiers) ===
	// DECISION: Flat gold increases the base that goldMultiplier percentage cards multiply.
	// Two-path synergy mirrors the frenzy duration split.
	{
		id: 'gold_per_kill_1',
		title: 'Coin Pouch',
		rarity: 'common',
		image: coinsImg,
		modifiers: [{ stat: 'goldPerKill', value: 1 }]
	},
	{
		id: 'gold_per_kill_2',
		title: 'Bounty Hunter',
		rarity: 'uncommon',
		image: coinsImg,
		modifiers: [{ stat: 'goldPerKill', value: 2 }]
	},
	{
		id: 'gold_per_kill_3',
		title: 'War Profiteer',
		rarity: 'rare',
		image: coinsImg,
		modifiers: [{ stat: 'goldPerKill', value: 3 }]
	},
	{
		id: 'gold_per_kill_4',
		title: "Merchant's Eye",
		rarity: 'epic',
		image: coinsImg,
		modifiers: [{ stat: 'goldPerKill', value: 5 }]
	},
	{
		id: 'gold_per_kill_5',
		title: 'Midas Touch',
		rarity: 'legendary',
		image: coinsImg,
		modifiers: [{ stat: 'goldPerKill', value: 10 }]
	},

	// === GOLD MULTIPLIER (percentage, rare+) ===
	{
		id: 'gold_multiplier_1',
		title: 'Silver Lining',
		rarity: 'rare',
		image: coinsImg,
		modifiers: [{ stat: 'goldMultiplier', value: 0.1 }]
	},
	{
		id: 'gold_multiplier_2',
		title: 'Golden Age',
		rarity: 'epic',
		image: coinsImg,
		modifiers: [{ stat: 'goldMultiplier', value: 0.25 }]
	},
	{
		id: 'gold_multiplier_3',
		title: "Dragon's Treasury",
		rarity: 'legendary',
		image: coinsImg,
		modifiers: [{ stat: 'goldMultiplier', value: 0.5 }]
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
			{ stat: 'critChance', value: 0.03 }
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
			{ stat: 'critChance', value: 0.05 },
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
			{ stat: 'xpMultiplier', value: 0.25 }
		]
	},

	// === ATTACK SPEED ===
	// DECISION: Percentage-based attack speed bonus instead of flat. Base speed (0.8/s) stays
	// fixed, cards add % bonus. This prevents early-game speed from becoming too fast too quickly
	// while still allowing meaningful late-game scaling.
	{
		id: 'attack_speed_1',
		title: 'Quick Hands',
		rarity: 'common',
		image: swordImg,
		modifiers: [{ stat: 'attackSpeedBonus', value: 0.005 }]
	},
	{
		id: 'attack_speed_2',
		title: 'Swift Strikes',
		rarity: 'uncommon',
		image: swordImg,
		modifiers: [{ stat: 'attackSpeedBonus', value: 0.01 }]
	},
	{
		id: 'attack_speed_3',
		title: 'Rapid Assault',
		rarity: 'rare',
		image: swordImg,
		modifiers: [{ stat: 'attackSpeedBonus', value: 0.025 }]
	},
	{
		id: 'attack_speed_4',
		title: 'Lightning Reflexes',
		rarity: 'epic',
		image: swordImg,
		modifiers: [{ stat: 'attackSpeedBonus', value: 0.05 }]
	},
	{
		id: 'attack_speed_5',
		title: 'Blade Storm',
		rarity: 'legendary',
		image: swordImg,
		modifiers: [{ stat: 'attackSpeedBonus', value: 0.25 }]
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
			{ stat: 'attackSpeedBonus', value: 0.02 }
		]
	},

	// === FRENZY DURATION (flat seconds, common/uncommon) ===
	// DECISION: Two paths for frenzy duration — flat seconds for early game,
	// percentage bonus for late game scaling. Base duration is 1s so flat +1s
	// is a massive early boost, while percentage scales with accumulated flat.
	{
		id: 'frenzy_duration_1',
		title: 'Adrenaline Rush',
		rarity: 'common',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyDuration', value: 0.5 }]
	},
	{
		id: 'frenzy_duration_2',
		title: 'Sustained Fury',
		rarity: 'uncommon',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyDuration', value: 1 }]
	},

	// === FRENZY DURATION BONUS (percentage, rare+) ===
	{
		id: 'frenzy_duration_bonus_1',
		title: 'Endless Rage',
		rarity: 'rare',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyDurationBonus', value: 0.25 }]
	},
	{
		id: 'frenzy_duration_bonus_2',
		title: 'Relentless Rage',
		rarity: 'epic',
		image: fireImg,
		modifiers: [
			{ stat: 'tapFrenzyDurationBonus', value: 0.5 },
			{ stat: 'tapFrenzyBonus', value: 0.03 }
		]
	},
	{
		id: 'frenzy_duration_bonus_3',
		title: 'Eternal Fury',
		rarity: 'legendary',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyDurationBonus', value: 1.0 }]
	},

	// === FRENZY BONUS (Epic capstone) ===
	{
		id: 'frenzy_bonus_3',
		title: 'Bloodlust',
		rarity: 'epic',
		image: fireImg,
		modifiers: [
			{ stat: 'tapFrenzyBonus', value: 0.08 },
			{ stat: 'attackSpeedBonus', value: 0.03 }
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

// === EXECUTE CAP (shop-only stackable cards) ===
// DECISION: Tiered execute cap shop cards. Higher rarities give bigger cap increases
// per purchase. All use the same executeCapBonus accumulator.
export const executeCapUpgrades: Record<string, Upgrade> = {
	execute_cap_1: {
		id: 'execute_cap_1',
		title: "Headsman's Contract",
		rarity: 'uncommon',
		image: pickaxeImg,
		modifiers: [] // +0.25% cap per purchase
	},
	execute_cap_2: {
		id: 'execute_cap_2',
		title: "Executioner's Pact",
		rarity: 'rare',
		image: pickaxeImg,
		modifiers: [] // +0.5% cap per purchase
	},
	execute_cap_3: {
		id: 'execute_cap_3',
		title: 'Death Warrant',
		rarity: 'epic',
		image: pickaxeImg,
		modifiers: [] // +1% cap per purchase
	}
};

// === GOLD PER KILL (shop-only stackable card) ===
export const goldPerKillUpgrade: Upgrade = {
	id: 'gold_per_kill',
	title: "Prospector's Pick",
	rarity: 'uncommon',
	image: coinsImg,
	modifiers: [] // Applied via goldPerKillBonus in gameState, not through normal stats
};

// DECISION: Base cap reduced from 10% to 5%. Execute is instant kill, so even 5% is very strong.
// Shop upgrades can raise the cap further.
export const EXECUTE_CHANCE_BASE_CAP = 0.05;

export const EXECUTE_CAP_BONUS_PER_TIER: Record<string, number> = {
	execute_cap_1: 0.0025,
	execute_cap_2: 0.005,
	execute_cap_3: 0.01
};

export const executeCapIds = new Set(Object.keys(executeCapUpgrades));

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

// PERFORMANCE: Map for O(1) lookup by ID — called on every save/load and upgrade acquisition
const upgradeMap = new Map<UpgradeId, Upgrade>(allUpgrades.map((u) => [u.id as UpgradeId, u]));

export function getUpgradeById(id: string): Upgrade | undefined {
	return upgradeMap.get(id as UpgradeId);
}

const executeUpgradeIds: Set<UpgradeId> = new Set([
	'execute_1',
	'execute_2',
	'execute_3',
	'execute_4',
	'execute_5'
]);

// Upgrades that require the player to already have crit chance
const critDependentIds: Set<UpgradeId> = new Set(['crit_damage_1', 'crit_damage_2']);

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

// DECISION: Gaussian rarity distribution centered on a lucky-driven focus point.
// At 0 lucky, focusPoint=0 (common). Lucky pushes it asymptotically toward 4 (legendary).
// The sigma=0.8 gaussian spread means tiers ±1 from focus get significant weight,
// tiers ±2 get small weight, and beyond is negligible.
// This replaces the old linear redistribution system which had a hard ceiling on lucky benefit.
const RARITY_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
const TIER_INDEX: Record<string, number> = {
	common: 0,
	uncommon: 1,
	rare: 2,
	epic: 3,
	legendary: 4
};

const GAUSSIAN_SIGMA = 0.8;

function getFocusPoint(luckyChance: number): number {
	return 4 * (1 - 1 / (1 + luckyChance / 2));
}

function gaussianWeight(tierIndex: number, focusPoint: number): number {
	const distance = tierIndex - focusPoint;
	return Math.exp(-(distance * distance) / (2 * GAUSSIAN_SIGMA * GAUSSIAN_SIGMA));
}

function getRarityWeights(luckyChance: number): Record<string, number> {
	const focusPoint = getFocusPoint(luckyChance);
	const weights: Record<string, number> = {};

	let totalGaussian = 0;
	for (const rarity of RARITY_TIERS) {
		const w = gaussianWeight(TIER_INDEX[rarity], focusPoint);
		weights[rarity] = w;
		totalGaussian += w;
	}

	// Normalize to sum to 100
	for (const rarity of RARITY_TIERS) {
		weights[rarity] = (weights[rarity] / totalGaussian) * 100;
	}

	return weights;
}

// Pick N cards from a pool using rarity-weighted random selection (no duplicates).
// The pool can be any pre-filtered set of upgrades.
export function pickByRarity(pool: Upgrade[], count: number, luckyChance: number = 0): Upgrade[] {
	// Group pool by rarity
	const tiers: Record<string, Upgrade[]> = {};
	for (const upgrade of pool) {
		if (!tiers[upgrade.rarity]) tiers[upgrade.rarity] = [];
		tiers[upgrade.rarity].push(upgrade);
	}

	const tierWeights = getRarityWeights(luckyChance);

	// Build carousel: each tier gets tickets equal to its % weight,
	// distributed evenly across cards in that tier.
	const carousel: Upgrade[] = [];
	for (const [rarity, weight] of Object.entries(tierWeights)) {
		const cards = tiers[rarity];
		if (!cards || cards.length === 0) continue;
		const totalTickets = Math.round(weight);
		if (totalTickets <= 0) continue;
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
	minRarity: string = 'common',
	currentCritChance: number = 0
): Upgrade[] {
	let pool = [...allUpgrades];

	// Filter by minimum rarity
	const minIndex = RARITY_TIERS.indexOf(minRarity as (typeof RARITY_TIERS)[number]);
	if (minIndex > 0) {
		const allowed = new Set(RARITY_TIERS.slice(minIndex));
		pool = pool.filter((u) => allowed.has(u.rarity as (typeof RARITY_TIERS)[number]));
	}

	// Filter out execute upgrades if player has hit their current cap
	if (currentExecuteChance >= executeCap) {
		pool = pool.filter((u) => !executeUpgradeIds.has(u.id as UpgradeId));
	}

	// Filter out poison-dependent upgrades if player has no base poison
	if (currentPoison <= 0) {
		pool = pool.filter((u) => !poisonDependentIds.has(u.id as UpgradeId));
	}

	// Filter out crit damage upgrades if player has no crit chance
	if (currentCritChance <= 0) {
		pool = pool.filter((u) => !critDependentIds.has(u.id as UpgradeId));
	}

	return pickByRarity(pool, count, luckyChance);
}
