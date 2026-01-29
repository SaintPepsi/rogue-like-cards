import type { Upgrade } from '$lib/types';

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
		stats: [{ icon: '⚔️', label: 'Damage', value: '+1' }],
		apply: (s) => (s.damage += 1)
	},
	{
		id: 'damage2',
		title: 'Heavy Strike',
		rarity: 'uncommon',
		image: swordImg,
		stats: [{ icon: '⚔️', label: 'Damage', value: '+3' }],
		apply: (s) => (s.damage += 3)
	},
	{
		id: 'damage3',
		title: 'Devastating Blow',
		rarity: 'rare',
		image: axeImg,
		stats: [{ icon: '⚔️', label: 'Damage', value: '+5' }],
		apply: (s) => (s.damage += 5)
	},
	{
		id: 'damage4',
		title: 'Titan Strength',
		rarity: 'epic',
		image: hammerImg,
		stats: [{ icon: '⚔️', label: 'Damage', value: '+10' }],
		apply: (s) => (s.damage += 10)
	},

	// === CRIT CHANCE UPGRADES ===
	{
		id: 'crit1',
		title: 'Keen Eye',
		rarity: 'common',
		image: attackImg,
		stats: [{ icon: '🎯', label: 'Crit Chance', value: '+5%' }],
		apply: (s) => (s.critChance += 0.05)
	},
	{
		id: 'crit2',
		title: "Assassin's Focus",
		rarity: 'uncommon',
		image: attackImg,
		stats: [{ icon: '🎯', label: 'Crit Chance', value: '+10%' }],
		apply: (s) => (s.critChance += 0.1)
	},
	{
		id: 'crit3',
		title: 'Death Mark',
		rarity: 'rare',
		image: attackImg,
		stats: [
			{ icon: '🎯', label: 'Crit Chance', value: '+15%' },
			{ icon: '💥', label: 'Crit Damage', value: '+0.5x' }
		],
		apply: (s) => {
			s.critChance += 0.15;
			s.critMultiplier += 0.5;
		}
	},

	// === CRIT DAMAGE UPGRADES ===
	{
		id: 'critdmg1',
		title: 'Brutal Force',
		rarity: 'uncommon',
		image: fireImg,
		stats: [{ icon: '💥', label: 'Crit Damage', value: '+0.5x' }],
		apply: (s) => (s.critMultiplier += 0.5)
	},
	{
		id: 'critdmg2',
		title: 'Executioner',
		rarity: 'epic',
		image: fireImg,
		stats: [{ icon: '💥', label: 'Crit Damage', value: '+1x' }],
		apply: (s) => (s.critMultiplier += 1)
	},

	// === XP UPGRADES ===
	{
		id: 'xp1',
		title: 'Quick Learner',
		rarity: 'common',
		image: bookImg,
		stats: [{ icon: '✨', label: 'XP Gain', value: '+25%' }],
		apply: (s) => (s.xpMultiplier += 0.25)
	},
	{
		id: 'xp2',
		title: 'Wisdom',
		rarity: 'uncommon',
		image: bookImg,
		stats: [{ icon: '✨', label: 'XP Gain', value: '+50%' }],
		apply: (s) => (s.xpMultiplier += 0.5)
	},

	// === POISON UPGRADES ===
	{
		id: 'poison1',
		title: 'Toxic Coating',
		rarity: 'common',
		image: poisonImg,
		stats: [{ icon: '☠️', label: 'Poison', value: '+1/sec' }],
		apply: (s) => (s.poison += 1)
	},
	{
		id: 'poison2',
		title: 'Venomous Strike',
		rarity: 'uncommon',
		image: poisonImg,
		stats: [{ icon: '☠️', label: 'Poison', value: '+3/sec' }],
		apply: (s) => (s.poison += 3)
	},
	{
		id: 'poison3',
		title: 'Plague Bearer',
		rarity: 'rare',
		image: poisonImg,
		stats: [{ icon: '☠️', label: 'Poison', value: '+5/sec' }],
		apply: (s) => (s.poison += 5)
	},

	// === POISON DURATION UPGRADES ===
	{
		id: 'poisondur1',
		title: 'Lingering Toxin',
		rarity: 'common',
		image: poisonImg,
		stats: [{ icon: '🕐', label: 'Poison Duration', value: '+2s' }],
		apply: (s) => (s.poisonDuration += 2)
	},
	{
		id: 'poisondur2',
		title: 'Slow Rot',
		rarity: 'uncommon',
		image: poisonImg,
		stats: [{ icon: '🕐', label: 'Poison Duration', value: '+4s' }],
		apply: (s) => (s.poisonDuration += 4)
	},
	{
		id: 'poisondur3',
		title: 'Eternal Blight',
		rarity: 'rare',
		image: poisonImg,
		stats: [{ icon: '🕐', label: 'Poison Duration', value: '+8s' }],
		apply: (s) => (s.poisonDuration += 8)
	},

	// === POISON MAX STACKS UPGRADES ===
	{
		id: 'poisonstack1',
		title: 'Compound Toxin',
		rarity: 'uncommon',
		image: poisonImg,
		stats: [{ icon: '🧪', label: 'Max Poison Stacks', value: '+3' }],
		apply: (s) => (s.poisonMaxStacks += 3)
	},
	{
		id: 'poisonstack2',
		title: 'Venom Cascade',
		rarity: 'rare',
		image: poisonImg,
		stats: [{ icon: '🧪', label: 'Max Poison Stacks', value: '+5' }],
		apply: (s) => (s.poisonMaxStacks += 5)
	},
	{
		id: 'poisonstack3',
		title: 'Pandemic',
		rarity: 'epic',
		image: poisonImg,
		stats: [{ icon: '🧪', label: 'Max Poison Stacks', value: '+10' }],
		apply: (s) => (s.poisonMaxStacks += 10)
	},

	// === POISON CRIT UPGRADES ===
	{
		id: 'poisoncrit1',
		title: 'Virulent Toxin',
		rarity: 'uncommon',
		image: poisonImg,
		stats: [{ icon: '💀', label: 'Poison Crit', value: '+10%' }],
		apply: (s) => (s.poisonCritChance += 0.1)
	},
	{
		id: 'poisoncrit2',
		title: 'Deadly Venom',
		rarity: 'rare',
		image: poisonImg,
		stats: [{ icon: '💀', label: 'Poison Crit', value: '+20%' }],
		apply: (s) => (s.poisonCritChance += 0.2)
	},
	{
		id: 'poisoncrit3',
		title: 'Necrotic Touch',
		rarity: 'epic',
		image: poisonImg,
		stats: [{ icon: '💀', label: 'Poison Crit', value: '+30%' }],
		apply: (s) => (s.poisonCritChance += 0.3)
	},

	// === MULTI-STRIKE UPGRADES ===
	{
		id: 'multi1',
		title: 'Double Tap',
		rarity: 'uncommon',
		image: swordImg,
		stats: [{ icon: '⚡', label: 'Multi-Strike', value: '+1' }],
		apply: (s) => (s.multiStrike += 1)
	},
	{
		id: 'multi2',
		title: 'Flurry',
		rarity: 'rare',
		image: swordImg,
		stats: [{ icon: '⚡', label: 'Multi-Strike', value: '+2' }],
		apply: (s) => (s.multiStrike += 2)
	},
	{
		id: 'multi3',
		title: 'Blade Storm',
		rarity: 'epic',
		image: axeImg,
		stats: [{ icon: '⚡', label: 'Multi-Strike', value: '+3' }],
		apply: (s) => (s.multiStrike += 3)
	},

	// === OVERKILL ===
	{
		id: 'overkill1',
		title: 'Overkill',
		rarity: 'rare',
		image: hammerImg,
		stats: [{ icon: '💀', label: 'Overkill', value: 'Enabled' }],
		apply: (s) => (s.overkill = true)
	},

	// === EXECUTE ===
	{
		id: 'execute1',
		title: 'Mercy Kill',
		rarity: 'uncommon',
		image: pickaxeImg,
		stats: [{ icon: '⚰️', label: 'Execute', value: '+0.5% chance' }],
		apply: (s) => (s.executeChance += 0.005)
	},
	{
		id: 'execute2',
		title: 'Culling Blade',
		rarity: 'rare',
		image: axeImg,
		stats: [{ icon: '⚰️', label: 'Execute', value: '+1% chance' }],
		apply: (s) => (s.executeChance += 0.01)
	},
	{
		id: 'execute3',
		title: 'Death Sentence',
		rarity: 'epic',
		image: axeImg,
		stats: [{ icon: '⚰️', label: 'Execute', value: '+2% chance' }],
		apply: (s) => (s.executeChance += 0.02)
	},

	// === BOSS TIMER ===
	{
		id: 'timer1',
		title: 'Borrowed Time',
		rarity: 'common',
		image: timerImg,
		stats: [{ icon: '⏱️', label: 'Boss Timer', value: '+5s' }],
		apply: (s) => (s.bonusBossTime += 5)
	},
	{
		id: 'timer2',
		title: 'Time Warp',
		rarity: 'uncommon',
		image: timerImg,
		stats: [{ icon: '⏱️', label: 'Boss Timer', value: '+10s' }],
		apply: (s) => (s.bonusBossTime += 10)
	},

	// === GREED (Risk/Reward) ===
	{
		id: 'greed1',
		title: 'Greed',
		rarity: 'uncommon',
		image: coinsImg,
		stats: [
			{ icon: '💰', label: 'Enemy HP', value: '+50%' },
			{ icon: '✨', label: 'XP Gain', value: '+100%' }
		],
		apply: (s) => {
			s.greed += 0.5;
			s.xpMultiplier += 1;
		}
	},
	{
		id: 'greed2',
		title: 'Avarice',
		rarity: 'rare',
		image: coinsImg,
		stats: [
			{ icon: '💰', label: 'Enemy HP', value: '+100%' },
			{ icon: '✨', label: 'XP Gain', value: '+200%' }
		],
		apply: (s) => {
			s.greed += 1;
			s.xpMultiplier += 2;
		}
	},

	// === CHEST SPAWN ===
	{
		id: 'chest1',
		title: 'Keen Nose',
		rarity: 'uncommon',
		image: chestImg,
		stats: [{ icon: '📦', label: 'Chest Chance', value: '+0.1%' }],
		apply: (s) => (s.chestChance += 0.001)
	},
	{
		id: 'chest2',
		title: 'Treasure Sense',
		rarity: 'rare',
		image: chestImg,
		stats: [{ icon: '📦', label: 'Chest Chance', value: '+0.1%' }],
		apply: (s) => (s.chestChance += 0.001)
	},
	{
		id: 'chest3',
		title: 'Hoarder',
		rarity: 'epic',
		image: chestImg,
		stats: [
			{ icon: '📦', label: 'Chest Chance', value: '+0.1%' },
			{ icon: '💰', label: 'Gold Mult', value: '+0.5x' }
		],
		apply: (s) => {
			s.chestChance += 0.001;
			s.goldMultiplier += 0.5;
		}
	},

	// === BOSS CHEST SPAWN (Legendary only) ===
	{
		id: 'bosschest1',
		title: "Mimic's Blessing",
		rarity: 'legendary',
		image: chestImg,
		stats: [
			{ icon: '👑', label: 'Boss Chest', value: '+0.1%' },
			{ icon: '📦', label: 'Chest Chance', value: '+0.1%' }
		],
		apply: (s) => {
			s.bossChestChance += 0.001;
			s.chestChance += 0.001;
		}
	},
	{
		id: 'bosschest2',
		title: "Dragon's Hoard",
		rarity: 'legendary',
		image: chestImg,
		stats: [
			{ icon: '👑', label: 'Boss Chest', value: '+0.1%' },
			{ icon: '💰', label: 'Gold Mult', value: '+1x' }
		],
		apply: (s) => {
			s.bossChestChance += 0.001;
			s.goldMultiplier += 1;
		}
	},

	// === LUCKY ===
	{
		id: 'lucky1',
		title: 'Lucky Charm',
		rarity: 'uncommon',
		image: chestImg,
		stats: [{ icon: '🍀', label: 'Rare Chance', value: '+10%' }],
		apply: (s) => (s.luckyChance += 0.1)
	},
	{
		id: 'lucky2',
		title: "Fortune's Favor",
		rarity: 'rare',
		image: chestImg,
		stats: [{ icon: '🍀', label: 'Rare Chance', value: '+25%' }],
		apply: (s) => (s.luckyChance += 0.25)
	},

	// === DAMAGE MULTIPLIER ===
	{
		id: 'dmgmult1',
		title: 'Power Surge',
		rarity: 'epic',
		image: fireImg,
		stats: [{ icon: '🔥', label: 'Damage Mult', value: '+25%' }],
		apply: (s) => (s.damageMultiplier += 0.25)
	},
	{
		id: 'dmgmult2',
		title: 'Overwhelming Force',
		rarity: 'legendary',
		image: fireImg,
		stats: [{ icon: '🔥', label: 'Damage Mult', value: '+50%' }],
		apply: (s) => (s.damageMultiplier += 0.5)
	},

	// === COMBO/LEGENDARY ===
	{
		id: 'combo1',
		title: 'Berserker',
		rarity: 'epic',
		image: axeImg,
		stats: [
			{ icon: '⚔️', label: 'Damage', value: '+8' },
			{ icon: '🎯', label: 'Crit Chance', value: '+10%' }
		],
		apply: (s) => {
			s.damage += 8;
			s.critChance += 0.1;
		}
	},
	{
		id: 'combo2',
		title: 'Poison Master',
		rarity: 'epic',
		image: poisonImg,
		stats: [
			{ icon: '☠️', label: 'Poison', value: '+8/sec' },
			{ icon: '⚔️', label: 'Damage', value: '+5' }
		],
		apply: (s) => {
			s.poison += 8;
			s.damage += 5;
		}
	},
	{
		id: 'combo3',
		title: 'Plague Doctor',
		rarity: 'epic',
		image: poisonImg,
		stats: [
			{ icon: '☠️', label: 'Poison', value: '+5/stack' },
			{ icon: '🧪', label: 'Max Stacks', value: '+5' },
			{ icon: '🕐', label: 'Duration', value: '+3s' }
		],
		apply: (s) => {
			s.poison += 5;
			s.poisonMaxStacks += 5;
			s.poisonDuration += 3;
		}
	},
	{
		id: 'legendary4',
		title: 'Toxic Apocalypse',
		rarity: 'legendary',
		image: poisonImg,
		stats: [
			{ icon: '☠️', label: 'Poison', value: '+12/stack' },
			{ icon: '🧪', label: 'Max Stacks', value: '+10' },
			{ icon: '🕐', label: 'Duration', value: '+5s' },
			{ icon: '💀', label: 'Poison Crit', value: '+15%' }
		],
		apply: (s) => {
			s.poison += 12;
			s.poisonMaxStacks += 10;
			s.poisonDuration += 5;
			s.poisonCritChance += 0.15;
		}
	},
	{
		id: 'legendary1',
		title: "Dragon's Fury",
		rarity: 'legendary',
		image: chestImg,
		stats: [
			{ icon: '⚔️', label: 'Damage', value: '+15' },
			{ icon: '🎯', label: 'Crit Chance', value: '+20%' },
			{ icon: '💥', label: 'Crit Damage', value: '+1x' }
		],
		apply: (s) => {
			s.damage += 15;
			s.critChance += 0.2;
			s.critMultiplier += 1;
		}
	},
	{
		id: 'legendary2',
		title: 'Death Incarnate',
		rarity: 'legendary',
		image: fireImg,
		stats: [
			{ icon: '☠️', label: 'Poison', value: '+10/sec' },
			{ icon: '⚰️', label: 'Execute', value: '+2% chance' },
			{ icon: '⚡', label: 'Multi-Strike', value: '+2' }
		],
		apply: (s) => {
			s.poison += 10;
			s.executeChance += 0.02;
			s.multiStrike += 2;
		}
	},
	{
		id: 'legendary3',
		title: 'Time Lord',
		rarity: 'legendary',
		image: timerImg,
		stats: [
			{ icon: '⏱️', label: 'Boss Timer', value: '+20s' },
			{ icon: '⚡', label: 'Multi-Strike', value: '+3' },
			{ icon: '✨', label: 'XP Gain', value: '+100%' }
		],
		apply: (s) => {
			s.bonusBossTime += 20;
			s.multiStrike += 3;
			s.xpMultiplier += 1;
		}
	}
];

// === EXECUTE CAP (shop-only stackable card) ===
export const executeCapUpgrade: Upgrade = {
	id: 'execute_cap',
	title: "Executioner's Pact",
	rarity: 'epic',
	image: pickaxeImg,
	stats: [{ icon: '⚰️', label: 'Execute Cap', value: '+0.5%' }],
	apply: () => {
		// Applied via executeCapBonus in gameState, not through normal stats
	}
};

export const EXECUTE_CHANCE_BASE_CAP = 0.1;
export const EXECUTE_CAP_BONUS_PER_LEVEL = 0.005;

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

export function getRandomUpgrades(
	count: number,
	luckyChance: number = 0,
	currentExecuteChance: number = 0,
	executeCap: number = EXECUTE_CHANCE_BASE_CAP,
	currentPoison: number = 0
): Upgrade[] {
	let pool = [...allUpgrades];

	// Filter out execute upgrades if player has hit their current cap
	if (currentExecuteChance >= executeCap) {
		pool = pool.filter((u) => !executeUpgradeIds.has(u.id));
	}

	// Filter out poison-dependent upgrades if player has no base poison
	if (currentPoison <= 0) {
		pool = pool.filter((u) => !poisonDependentIds.has(u.id));
	}

	const shuffled = [...pool].sort(() => Math.random() - 0.5);

	// Apply lucky chance - boost rarer items
	const weighted = shuffled.sort((a, b) => {
		const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
		const aScore = rarityOrder[a.rarity] + (Math.random() < luckyChance ? 2 : 0);
		const bScore = rarityOrder[b.rarity] + (Math.random() < luckyChance ? 2 : 0);
		return aScore - bScore + (Math.random() - 0.3);
	});

	return weighted.slice(0, count);
}
