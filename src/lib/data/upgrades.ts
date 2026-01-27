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
		stats: [{ icon: '⚰️', label: 'Execute', value: '<10% HP' }],
		apply: (s) => (s.executeThreshold = Math.max(s.executeThreshold, 0.1))
	},
	{
		id: 'execute2',
		title: 'Culling Blade',
		rarity: 'rare',
		image: axeImg,
		stats: [{ icon: '⚰️', label: 'Execute', value: '<20% HP' }],
		apply: (s) => (s.executeThreshold = Math.max(s.executeThreshold, 0.2))
	},
	{
		id: 'execute3',
		title: 'Death Sentence',
		rarity: 'epic',
		image: axeImg,
		stats: [{ icon: '⚰️', label: 'Execute', value: '<30% HP' }],
		apply: (s) => (s.executeThreshold = Math.max(s.executeThreshold, 0.3))
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
			{ icon: '⚰️', label: 'Execute', value: '<25% HP' },
			{ icon: '⚡', label: 'Multi-Strike', value: '+2' }
		],
		apply: (s) => {
			s.poison += 10;
			s.executeThreshold = Math.max(s.executeThreshold, 0.25);
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

export function getRandomUpgrades(count: number, luckyChance: number = 0): Upgrade[] {
	const shuffled = [...allUpgrades].sort(() => Math.random() - 0.5);

	// Apply lucky chance - boost rarer items
	const weighted = shuffled.sort((a, b) => {
		const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
		const aScore = rarityOrder[a.rarity] + (Math.random() < luckyChance ? 2 : 0);
		const bScore = rarityOrder[b.rarity] + (Math.random() < luckyChance ? 2 : 0);
		return aScore - bScore + (Math.random() - 0.3);
	});

	return weighted.slice(0, count);
}
