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

export const allUpgrades: Upgrade[] = [
	// === DAMAGE UPGRADES ===
	{
		id: 'damage1',
		title: 'Sharpen Blade',
		rarity: 'common',
		image: swordImg,
		modifiers: [{ stat: 'damage', value: 1 }]
	},
	{
		id: 'damage2',
		title: 'Heavy Strike',
		rarity: 'uncommon',
		image: swordImg,
		modifiers: [{ stat: 'damage', value: 3 }]
	},
	{
		id: 'damage3',
		title: 'Devastating Blow',
		rarity: 'rare',
		image: axeImg,
		modifiers: [{ stat: 'damage', value: 5 }]
	},
	{
		id: 'damage4',
		title: 'Titan Strength',
		rarity: 'epic',
		image: hammerImg,
		modifiers: [{ stat: 'damage', value: 10 }]
	},

	// === CRIT CHANCE UPGRADES ===
	{
		id: 'crit1',
		title: 'Keen Eye',
		rarity: 'common',
		image: attackImg,
		modifiers: [{ stat: 'critChance', value: 0.05 }]
	},
	{
		id: 'crit2',
		title: "Assassin's Focus",
		rarity: 'uncommon',
		image: attackImg,
		modifiers: [{ stat: 'critChance', value: 0.1 }]
	},
	{
		id: 'crit3',
		title: 'Death Mark',
		rarity: 'rare',
		image: attackImg,
		modifiers: [{ stat: 'critChance', value: 0.15 }, { stat: 'critMultiplier', value: 0.5 }]
	},

	// === CRIT DAMAGE UPGRADES ===
	{
		id: 'critdmg1',
		title: 'Brutal Force',
		rarity: 'uncommon',
		image: fireImg,
		modifiers: [{ stat: 'critMultiplier', value: 0.5 }]
	},
	{
		id: 'critdmg2',
		title: 'Executioner',
		rarity: 'epic',
		image: fireImg,
		modifiers: [{ stat: 'critMultiplier', value: 1 }]
	},

	// === XP UPGRADES ===
	{
		id: 'xp1',
		title: 'Quick Learner',
		rarity: 'common',
		image: bookImg,
		modifiers: [{ stat: 'xpMultiplier', value: 0.25 }]
	},
	{
		id: 'xp2',
		title: 'Wisdom',
		rarity: 'uncommon',
		image: bookImg,
		modifiers: [{ stat: 'xpMultiplier', value: 0.5 }]
	},

	// === POISON UPGRADES ===
	{
		id: 'poison1',
		title: 'Toxic Coating',
		rarity: 'common',
		image: poisonImg,
		modifiers: [{ stat: 'poison', value: 1 }]
	},
	{
		id: 'poison2',
		title: 'Venomous Strike',
		rarity: 'uncommon',
		image: poisonImg,
		modifiers: [{ stat: 'poison', value: 3 }]
	},
	{
		id: 'poison3',
		title: 'Plague Bearer',
		rarity: 'rare',
		image: poisonImg,
		modifiers: [{ stat: 'poison', value: 5 }]
	},

	// === POISON DURATION UPGRADES ===
	{
		id: 'poisondur1',
		title: 'Lingering Toxin',
		rarity: 'common',
		image: poisonImg,
		modifiers: [{ stat: 'poisonDuration', value: 2 }]
	},
	{
		id: 'poisondur2',
		title: 'Slow Rot',
		rarity: 'uncommon',
		image: poisonImg,
		modifiers: [{ stat: 'poisonDuration', value: 4 }]
	},
	{
		id: 'poisondur3',
		title: 'Eternal Blight',
		rarity: 'rare',
		image: poisonImg,
		modifiers: [{ stat: 'poisonDuration', value: 8 }]
	},

	// === POISON MAX STACKS UPGRADES ===
	{
		id: 'poisonstack1',
		title: 'Compound Toxin',
		rarity: 'uncommon',
		image: poisonImg,
		modifiers: [{ stat: 'poisonMaxStacks', value: 3 }]
	},
	{
		id: 'poisonstack2',
		title: 'Venom Cascade',
		rarity: 'rare',
		image: poisonImg,
		modifiers: [{ stat: 'poisonMaxStacks', value: 5 }]
	},
	{
		id: 'poisonstack3',
		title: 'Pandemic',
		rarity: 'epic',
		image: poisonImg,
		modifiers: [{ stat: 'poisonMaxStacks', value: 10 }]
	},

	// === POISON CRIT UPGRADES ===
	{
		id: 'poisoncrit1',
		title: 'Virulent Toxin',
		rarity: 'uncommon',
		image: poisonImg,
		modifiers: [{ stat: 'poisonCritChance', value: 0.1 }]
	},
	{
		id: 'poisoncrit2',
		title: 'Deadly Venom',
		rarity: 'rare',
		image: poisonImg,
		modifiers: [{ stat: 'poisonCritChance', value: 0.2 }]
	},
	{
		id: 'poisoncrit3',
		title: 'Necrotic Touch',
		rarity: 'epic',
		image: poisonImg,
		modifiers: [{ stat: 'poisonCritChance', value: 0.3 }]
	},

	// === MULTI-STRIKE UPGRADES ===
	{
		id: 'multi1',
		title: 'Double Tap',
		rarity: 'uncommon',
		image: swordImg,
		modifiers: [{ stat: 'multiStrike', value: 1 }]
	},
	{
		id: 'multi2',
		title: 'Flurry',
		rarity: 'rare',
		image: swordImg,
		modifiers: [{ stat: 'multiStrike', value: 2 }]
	},
	{
		id: 'multi3',
		title: 'Blade Storm',
		rarity: 'epic',
		image: axeImg,
		modifiers: [{ stat: 'multiStrike', value: 3 }]
	},

	// === OVERKILL ===
	{
		id: 'overkill1',
		title: 'Overkill',
		rarity: 'rare',
		image: hammerImg,
		modifiers: [{ stat: 'overkill', value: 1 }]
	},

	// === EXECUTE ===
	{
		id: 'execute1',
		title: 'Mercy Kill',
		rarity: 'uncommon',
		image: pickaxeImg,
		modifiers: [{ stat: 'executeChance', value: 0.005 }]
	},
	{
		id: 'execute2',
		title: 'Culling Blade',
		rarity: 'rare',
		image: axeImg,
		modifiers: [{ stat: 'executeChance', value: 0.01 }]
	},
	{
		id: 'execute3',
		title: 'Death Sentence',
		rarity: 'epic',
		image: axeImg,
		modifiers: [{ stat: 'executeChance', value: 0.02 }]
	},

	// === BOSS TIMER ===
	{
		id: 'timer1',
		title: 'Borrowed Time',
		rarity: 'common',
		image: timerImg,
		modifiers: [{ stat: 'bonusBossTime', value: 5 }]
	},
	{
		id: 'timer2',
		title: 'Time Warp',
		rarity: 'uncommon',
		image: timerImg,
		modifiers: [{ stat: 'bonusBossTime', value: 10 }]
	},

	// === GREED (Risk/Reward) ===
	{
		id: 'greed1',
		title: 'Greed',
		rarity: 'uncommon',
		image: coinsImg,
		modifiers: [{ stat: 'greed', value: 0.5 }, { stat: 'xpMultiplier', value: 1 }]
	},
	{
		id: 'greed2',
		title: 'Avarice',
		rarity: 'rare',
		image: coinsImg,
		modifiers: [{ stat: 'greed', value: 1 }, { stat: 'xpMultiplier', value: 2 }]
	},

	// === CHEST SPAWN ===
	{
		id: 'chest1',
		title: 'Keen Nose',
		rarity: 'uncommon',
		image: chestImg,
		modifiers: [{ stat: 'chestChance', value: 0.001 }]
	},
	{
		id: 'chest2',
		title: 'Treasure Sense',
		rarity: 'rare',
		image: chestImg,
		modifiers: [{ stat: 'chestChance', value: 0.001 }]
	},
	{
		id: 'chest3',
		title: 'Hoarder',
		rarity: 'epic',
		image: chestImg,
		modifiers: [{ stat: 'chestChance', value: 0.001 }, { stat: 'goldMultiplier', value: 0.5 }]
	},

	// === BOSS CHEST SPAWN (Legendary only) ===
	{
		id: 'bosschest1',
		title: "Mimic's Blessing",
		rarity: 'legendary',
		image: chestImg,
		modifiers: [{ stat: 'bossChestChance', value: 0.001 }, { stat: 'chestChance', value: 0.001 }]
	},
	{
		id: 'bosschest2',
		title: "Dragon's Hoard",
		rarity: 'legendary',
		image: chestImg,
		modifiers: [{ stat: 'bossChestChance', value: 0.001 }, { stat: 'goldMultiplier', value: 1 }]
	},

	// === LUCKY ===
	{
		id: 'lucky1',
		title: 'Lucky Charm',
		rarity: 'uncommon',
		image: chestImg,
		modifiers: [{ stat: 'luckyChance', value: 0.1 }]
	},
	{
		id: 'lucky2',
		title: "Fortune's Favor",
		rarity: 'rare',
		image: chestImg,
		modifiers: [{ stat: 'luckyChance', value: 0.25 }]
	},

	// === GOLD DROP CHANCE ===
	{
		id: 'golddrop1',
		title: 'Keen Scavenger',
		rarity: 'common',
		image: coinsImg,
		modifiers: [{ stat: 'goldDropChance', value: 0.05 }]
	},
	{
		id: 'golddrop2',
		title: 'Treasure Hunter',
		rarity: 'uncommon',
		image: coinsImg,
		modifiers: [{ stat: 'goldDropChance', value: 0.1 }]
	},
	{
		id: 'golddrop3',
		title: 'Golden Touch',
		rarity: 'rare',
		image: coinsImg,
		modifiers: [{ stat: 'goldDropChance', value: 0.15 }, { stat: 'goldMultiplier', value: 0.25 }]
	},

	// === DAMAGE MULTIPLIER ===
	{
		id: 'dmgmult1',
		title: 'Power Surge',
		rarity: 'epic',
		image: fireImg,
		modifiers: [{ stat: 'damageMultiplier', value: 0.25 }]
	},
	{
		id: 'dmgmult2',
		title: 'Overwhelming Force',
		rarity: 'legendary',
		image: fireImg,
		modifiers: [{ stat: 'damageMultiplier', value: 0.5 }]
	},

	// === COMBO/LEGENDARY ===
	{
		id: 'combo1',
		title: 'Berserker',
		rarity: 'epic',
		image: axeImg,
		modifiers: [{ stat: 'damage', value: 8 }, { stat: 'critChance', value: 0.1 }]
	},
	{
		id: 'combo2',
		title: 'Poison Master',
		rarity: 'epic',
		image: poisonImg,
		modifiers: [{ stat: 'poison', value: 8 }, { stat: 'damage', value: 5 }]
	},
	{
		id: 'combo3',
		title: 'Plague Doctor',
		rarity: 'epic',
		image: poisonImg,
		modifiers: [{ stat: 'poison', value: 5 }, { stat: 'poisonMaxStacks', value: 5 }, { stat: 'poisonDuration', value: 3 }]
	},
	{
		id: 'legendary4',
		title: 'Toxic Apocalypse',
		rarity: 'legendary',
		image: poisonImg,
		modifiers: [{ stat: 'poison', value: 12 }, { stat: 'poisonMaxStacks', value: 10 }, { stat: 'poisonDuration', value: 5 }, { stat: 'poisonCritChance', value: 0.15 }]
	},
	{
		id: 'legendary1',
		title: "Dragon's Fury",
		rarity: 'legendary',
		image: chestImg,
		modifiers: [{ stat: 'damage', value: 15 }, { stat: 'critChance', value: 0.2 }, { stat: 'critMultiplier', value: 1 }]
	},
	{
		id: 'legendary2',
		title: 'Death Incarnate',
		rarity: 'legendary',
		image: fireImg,
		modifiers: [{ stat: 'poison', value: 10 }, { stat: 'executeChance', value: 0.02 }, { stat: 'multiStrike', value: 2 }]
	},
	{
		id: 'legendary3',
		title: 'Time Lord',
		rarity: 'legendary',
		image: timerImg,
		modifiers: [{ stat: 'bonusBossTime', value: 20 }, { stat: 'multiStrike', value: 3 }, { stat: 'xpMultiplier', value: 1 }]
	},

	// === ATTACK SPEED ===
	{
		id: 'atkspd1',
		title: 'Quick Hands',
		rarity: 'common',
		image: swordImg,
		modifiers: [{ stat: 'attackSpeed', value: 0.1 }]
	},
	{
		id: 'atkspd2',
		title: 'Swift Strikes',
		rarity: 'uncommon',
		image: swordImg,
		modifiers: [{ stat: 'attackSpeed', value: 0.2 }]
	},
	{
		id: 'atkspd3',
		title: 'Blade Storm',
		rarity: 'rare',
		image: swordImg,
		modifiers: [{ stat: 'attackSpeed', value: 0.4 }]
	},

	// === FRENZY ===
	{
		id: 'frenzy1',
		title: 'Battle Rage',
		rarity: 'uncommon',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyBonus', value: 0.05 }]
	},
	{
		id: 'frenzy2',
		title: 'Berserker Fury',
		rarity: 'rare',
		image: fireImg,
		modifiers: [{ stat: 'tapFrenzyBonus', value: 0.05 }, { stat: 'attackSpeed', value: 0.2 }]
	}
];

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

export const GOLD_PER_KILL_BONUS_PER_LEVEL = 1;

export const EXECUTE_CHANCE_BASE_CAP = 0.1;
export const EXECUTE_CAP_BONUS_PER_LEVEL = 0.005;

export function getModifierDisplay(mod: StatModifier): { icon: string; label: string; value: string } {
	const entry = statRegistry.find((s) => s.key === mod.stat);
	if (!entry) return { icon: '', label: mod.stat, value: `+${mod.value}` };
	return { icon: entry.icon, label: entry.label, value: entry.format(mod.value) };
}

const upgradeMap = new Map<string, Upgrade>(allUpgrades.map((u) => [u.id, u]));

export function getUpgradeById(id: string): Upgrade | undefined {
	return upgradeMap.get(id);
}

const executeUpgradeIds = new Set(['execute1', 'execute2', 'execute3']);

// Upgrades that require the player to already have base poison
const poisonDependentIds = new Set([
	'poisondur1', 'poisondur2', 'poisondur3',
	'poisonstack1', 'poisonstack2', 'poisonstack3',
	'poisoncrit1', 'poisoncrit2', 'poisoncrit3',
	'combo3', 'legendary4'
]);

export function getExecuteCap(executeCapBonus: number): number {
	return EXECUTE_CHANCE_BASE_CAP + executeCapBonus;
}

export function getRandomLegendaryUpgrades(count: number): Upgrade[] {
	const legendaries = allUpgrades.filter((u) => u.rarity === 'legendary');
	const shuffled = [...legendaries].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

// Percent chance per pick that the ENTIRE rarity tier is chosen.
// Within the chosen tier, each card has equal probability.
// Each tier is roughly 1/3 the previous. These must sum to 100.
const RARITY_TIER_CHANCES: Record<string, number> = {
	common: 67,    // 67% chance per pick
	uncommon: 22,  // 22% chance per pick  (~1/3 of common)
	rare: 7,       //  7% chance per pick  (~1/3 of uncommon)
	epic: 3,       //  3% chance per pick  (~1/3 of rare)
	legendary: 1   //  1% chance per pick  (~1/3 of epic)
};

// Lucky chance shifts % points from common into higher tiers.
// At luckyChance=1.0, the full bonus is applied.
const LUCKY_TIER_BONUS: Record<string, number> = {
	common: -20,    // loses 20% points
	uncommon: 5,    // gains 5% points
	rare: 7,        // gains 7% points
	epic: 5,        // gains 5% points
	legendary: 3    // gains 3% points
};

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

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
	const minIndex = RARITY_ORDER.indexOf(minRarity as typeof RARITY_ORDER[number]);
	if (minIndex > 0) {
		const allowed = new Set(RARITY_ORDER.slice(minIndex));
		pool = pool.filter((u) => allowed.has(u.rarity as typeof RARITY_ORDER[number]));
	}

	// Filter out execute upgrades if player has hit their current cap
	if (currentExecuteChance >= executeCap) {
		pool = pool.filter((u) => !executeUpgradeIds.has(u.id));
	}

	// Filter out poison-dependent upgrades if player has no base poison
	if (currentPoison <= 0) {
		pool = pool.filter((u) => !poisonDependentIds.has(u.id));
	}

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
