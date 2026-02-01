import { describe, test, expect, vi } from 'vitest';
import type { PlayerStats } from '$lib/types';

// Mock image imports so upgrades.ts can load in node environment
vi.mock('$lib/assets/images/cards/sword.png', () => ({ default: '' }));
vi.mock('$lib/assets/images/cards/axe.png', () => ({ default: '' }));
vi.mock('$lib/assets/images/cards/attack.png', () => ({ default: '' }));
vi.mock('$lib/assets/images/cards/fire.png', () => ({ default: '' }));
vi.mock('$lib/assets/images/cards/book.png', () => ({ default: '' }));
vi.mock('$lib/assets/images/cards/chest.png', () => ({ default: '' }));
vi.mock('$lib/assets/images/cards/poison.png', () => ({ default: '' }));
vi.mock('$lib/assets/images/cards/timer.png', () => ({ default: '' }));
vi.mock('$lib/assets/images/cards/coins.png', () => ({ default: '' }));
vi.mock('$lib/assets/images/cards/hammer.png', () => ({ default: '' }));
vi.mock('$lib/assets/images/cards/pickaxe.png', () => ({ default: '' }));

const {
	getRandomUpgrades,
	getUpgradeById,
	allUpgrades,
	EXECUTE_CHANCE_BASE_CAP,
	getModifierDisplay
} = await import('./upgrades');
const { createDefaultStats } = await import('$lib/engine/stats');

describe('getUpgradeById', () => {
	test('returns the correct upgrade for a valid ID', () => {
		const upgrade = getUpgradeById('damage_1');
		expect(upgrade).toBeDefined();
		expect(upgrade!.id).toBe('damage_1');
		expect(upgrade!.title).toBe('Sharpen Blade');
	});

	test('returns undefined for an invalid ID', () => {
		const upgrade = getUpgradeById('nonexistent');
		expect(upgrade).toBeUndefined();
	});

	test('returns correct upgrade for every ID in allUpgrades', () => {
		for (const u of allUpgrades) {
			const found = getUpgradeById(u.id);
			expect(found).toBeDefined();
			expect(found!.id).toBe(u.id);
			expect(found!.title).toBe(u.title);
		}
	});
});

describe('getRandomUpgrades', () => {
	test('returns the requested number of upgrades', () => {
		const result = getRandomUpgrades(3);
		expect(result).toHaveLength(3);
	});

	test('filters out poison-dependent upgrades when player has no poison', () => {
		const poisonDependentIds = new Set([
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

		for (let i = 0; i < 20; i++) {
			const result = getRandomUpgrades(3, 0, 0, EXECUTE_CHANCE_BASE_CAP, 0);
			for (const upgrade of result) {
				expect(poisonDependentIds.has(upgrade.id)).toBe(false);
			}
		}
	});

	test('allows poison-dependent upgrades when player has poison', () => {
		const poisonDependentIds = new Set([
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

		let foundPoisonDependent = false;
		for (let i = 0; i < 500; i++) {
			const result = getRandomUpgrades(10, 0, 0, EXECUTE_CHANCE_BASE_CAP, 5);
			if (result.some((u) => poisonDependentIds.has(u.id))) {
				foundPoisonDependent = true;
				break;
			}
		}
		expect(foundPoisonDependent).toBe(true);
	});

	test('filters out execute upgrades when at cap', () => {
		const executeIds = new Set(['execute_1', 'execute_2', 'execute_3', 'execute_4', 'execute_5']);

		for (let i = 0; i < 20; i++) {
			const result = getRandomUpgrades(3, 0, EXECUTE_CHANCE_BASE_CAP, EXECUTE_CHANCE_BASE_CAP, 0);
			for (const upgrade of result) {
				expect(executeIds.has(upgrade.id)).toBe(false);
			}
		}
	});

	test('allows execute upgrades when below cap', () => {
		const executeIds = new Set(['execute_1', 'execute_2', 'execute_3', 'execute_4', 'execute_5']);

		let foundExecute = false;
		for (let i = 0; i < 500; i++) {
			const result = getRandomUpgrades(10, 0, 0, EXECUTE_CHANCE_BASE_CAP, 0);
			if (result.some((u) => executeIds.has(u.id))) {
				foundExecute = true;
				break;
			}
		}
		expect(foundExecute).toBe(true);
	});

	test('returns unique upgrades (no duplicates)', () => {
		for (let i = 0; i < 50; i++) {
			const result = getRandomUpgrades(5, 0, 0, EXECUTE_CHANCE_BASE_CAP, 5);
			const ids = result.map((u) => u.id);
			expect(new Set(ids).size).toBe(ids.length);
		}
	});

	test('rare+ cards can appear with zero lucky chance', () => {
		const rarityCounts: Record<string, number> = {
			common: 0,
			uncommon: 0,
			rare: 0,
			epic: 0,
			legendary: 0
		};

		for (let i = 0; i < 1000; i++) {
			const result = getRandomUpgrades(3, 0, 0, EXECUTE_CHANCE_BASE_CAP, 5);
			for (const u of result) {
				rarityCounts[u.rarity]++;
			}
		}

		// With 3000 total picks and proper weighting, uncommon and rare should both appear
		expect(rarityCounts.uncommon).toBeGreaterThan(0);
		expect(rarityCounts.rare).toBeGreaterThan(0);
	});

	test('lucky chance increases rate of higher-rarity cards', () => {
		let rareCountNoLuck = 0;
		let rareCountHighLuck = 0;

		for (let i = 0; i < 2000; i++) {
			const noLuck = getRandomUpgrades(3, 0, 0, EXECUTE_CHANCE_BASE_CAP, 5);
			rareCountNoLuck += noLuck.filter(
				(u) => u.rarity === 'rare' || u.rarity === 'epic' || u.rarity === 'legendary'
			).length;

			const highLuck = getRandomUpgrades(3, 1.0, 0, EXECUTE_CHANCE_BASE_CAP, 5);
			rareCountHighLuck += highLuck.filter(
				(u) => u.rarity === 'rare' || u.rarity === 'epic' || u.rarity === 'legendary'
			).length;
		}

		// With max lucky chance, rare+ cards should appear more often
		expect(rareCountHighLuck).toBeGreaterThan(rareCountNoLuck);
	});
});

describe('upgrade card modifiers', () => {
	test('every card has at least one modifier (except shop-only cards)', () => {
		for (const card of allUpgrades) {
			expect(card.modifiers.length, `${card.id} has no modifiers`).toBeGreaterThan(0);
		}
	});

	test('all modifier stats reference valid PlayerStats keys', () => {
		const validKeys = Object.keys(createDefaultStats());
		for (const card of allUpgrades) {
			for (const mod of card.modifiers) {
				expect(validKeys, `${card.id} references unknown stat: ${mod.stat}`).toContain(mod.stat);
			}
		}
	});

	test('no card has apply() or stats[] property', () => {
		for (const card of allUpgrades) {
			expect(
				(card as Record<string, unknown>).apply,
				`${card.id} still has apply()`
			).toBeUndefined();
			expect(
				(card as Record<string, unknown>).stats,
				`${card.id} still has stats[]`
			).toBeUndefined();
		}
	});

	test('getModifierDisplay returns display info for known stats', () => {
		const display = getModifierDisplay({ stat: 'damage', value: 5 });
		expect(display.icon).toBeTruthy();
		expect(display.label).toBe('Damage');
		expect(display.value).toBeTruthy();
	});

	test('getModifierDisplay handles unknown stats gracefully', () => {
		const display = getModifierDisplay({ stat: 'unknownStat' as keyof PlayerStats, value: 3 });
		expect(display.label).toBe('unknownStat');
		expect(display.value).toBe('+3');
	});
});

describe('frenzy upgrade cards', () => {
	const frenzyIds = [
		'frenzy_bonus_1',
		'frenzy_bonus_2',
		'frenzy_bonus_3',
		'frenzy_duration_1',
		'frenzy_duration_2',
		'frenzy_duration_3',
		'frenzy_legendary_1'
	];

	test('all frenzy cards exist', () => {
		for (const id of frenzyIds) {
			expect(getUpgradeById(id), `${id} not found`).toBeDefined();
		}
	});

	test('frenzy cards have correct rarities', () => {
		expect(getUpgradeById('frenzy_duration_1')!.rarity).toBe('uncommon');
		expect(getUpgradeById('frenzy_duration_2')!.rarity).toBe('rare');
		expect(getUpgradeById('frenzy_duration_3')!.rarity).toBe('epic');
		expect(getUpgradeById('frenzy_bonus_3')!.rarity).toBe('epic');
		expect(getUpgradeById('frenzy_legendary_1')!.rarity).toBe('legendary');
	});

	test('GOTTA GO FAST modifies tapFrenzyStackMultiplier', () => {
		const card = getUpgradeById('frenzy_legendary_1')!;
		const stackMod = card.modifiers.find((m) => m.stat === 'tapFrenzyStackMultiplier');
		expect(stackMod).toBeDefined();
		expect(stackMod!.value).toBe(2);
	});

	test('frenzy cards are always available (no filtering)', () => {
		let foundFrenzyNew = false;
		for (let i = 0; i < 500; i++) {
			const result = getRandomUpgrades(
				10,
				1.0,
				EXECUTE_CHANCE_BASE_CAP,
				EXECUTE_CHANCE_BASE_CAP,
				0
			);
			if (result.some((u) => frenzyIds.includes(u.id))) {
				foundFrenzyNew = true;
				break;
			}
		}
		expect(foundFrenzyNew).toBe(true);
	});
});

describe('gaussian lucky system', () => {
	test('at 0 lucky, common dominates', () => {
		const counts: Record<string, number> = {
			common: 0,
			uncommon: 0,
			rare: 0,
			epic: 0,
			legendary: 0
		};
		for (let i = 0; i < 2000; i++) {
			const result = getRandomUpgrades(1, 0, 0, 0.05, 5);
			counts[result[0].rarity]++;
		}
		expect(counts.common / 2000).toBeGreaterThan(0.5);
	});

	test('at 200% lucky, rare tier is more common than common and legendary', () => {
		const counts: Record<string, number> = {
			common: 0,
			uncommon: 0,
			rare: 0,
			epic: 0,
			legendary: 0
		};
		for (let i = 0; i < 2000; i++) {
			const result = getRandomUpgrades(1, 2.0, 0, 0.05, 5);
			counts[result[0].rarity]++;
		}
		expect(counts.rare).toBeGreaterThan(counts.common);
		expect(counts.rare).toBeGreaterThan(counts.legendary);
	});

	test('at 1000% lucky, epic tier dominates over common and uncommon', () => {
		const counts: Record<string, number> = {
			common: 0,
			uncommon: 0,
			rare: 0,
			epic: 0,
			legendary: 0
		};
		for (let i = 0; i < 2000; i++) {
			const result = getRandomUpgrades(1, 10.0, 0, 0.05, 5);
			counts[result[0].rarity]++;
		}
		expect(counts.epic).toBeGreaterThan(counts.common);
		expect(counts.epic).toBeGreaterThan(counts.uncommon);
	});

	test('legendary is never 100% even at extreme lucky', () => {
		const counts: Record<string, number> = {
			common: 0,
			uncommon: 0,
			rare: 0,
			epic: 0,
			legendary: 0
		};
		for (let i = 0; i < 2000; i++) {
			const result = getRandomUpgrades(1, 100.0, 0, 0.05, 5);
			counts[result[0].rarity]++;
		}
		expect(counts.legendary / 2000).toBeLessThan(1.0);
		expect(counts.legendary / 2000).toBeGreaterThan(0.5);
	});

	test('focus point calculation matches design breakpoints', () => {
		const fp = (lucky: number) => 4 * (1 - 1 / (1 + lucky / 2));
		expect(fp(0)).toBeCloseTo(0.0);
		expect(fp(0.5)).toBeCloseTo(0.8, 0);
		expect(fp(1.0)).toBeCloseTo(1.33, 1);
		expect(fp(2.0)).toBeCloseTo(2.0, 1);
		expect(fp(5.0)).toBeCloseTo(2.86, 1);
		expect(fp(10.0)).toBeCloseTo(3.33, 1);
	});
});

describe('lucky cards (all tiers)', () => {
	const luckyCards = [
		{ id: 'lucky_1', rarity: 'common', value: 0.05 },
		{ id: 'lucky_2', rarity: 'uncommon', value: 0.1 },
		{ id: 'lucky_3', rarity: 'rare', value: 0.2 },
		{ id: 'lucky_4', rarity: 'epic', value: 0.5 },
		{ id: 'lucky_5', rarity: 'legendary', value: 1.0 }
	];

	test('5 lucky cards exist across all tiers', () => {
		for (const { id, rarity, value } of luckyCards) {
			const card = getUpgradeById(id)!;
			expect(card, `${id} should exist`).toBeDefined();
			expect(card.rarity).toBe(rarity);
			expect(card.modifiers[0].stat).toBe('luckyChance');
			expect(card.modifiers[0].value).toBe(value);
		}
	});

	test('values increase with rarity', () => {
		for (let i = 1; i < luckyCards.length; i++) {
			expect(luckyCards[i].value).toBeGreaterThan(luckyCards[i - 1].value);
		}
	});
});

describe('multistrike rarity bump', () => {
	test('multi_strike_1 is rare with +1', () => {
		const card = getUpgradeById('multi_strike_1')!;
		expect(card.rarity).toBe('rare');
		expect(card.modifiers[0].value).toBe(1);
	});
	test('multi_strike_2 is epic with +2', () => {
		const card = getUpgradeById('multi_strike_2')!;
		expect(card.rarity).toBe('epic');
		expect(card.modifiers[0].value).toBe(2);
	});
	test('multi_strike_3 is legendary with +3', () => {
		const card = getUpgradeById('multi_strike_3')!;
		expect(card.rarity).toBe('legendary');
		expect(card.modifiers[0].value).toBe(3);
	});
});

describe('execute rework', () => {
	test('EXECUTE_CHANCE_BASE_CAP is 0.05', () => {
		expect(EXECUTE_CHANCE_BASE_CAP).toBe(0.05);
	});

	const executeCards = [
		{ id: 'execute_1', rarity: 'common', value: 0.001 },
		{ id: 'execute_2', rarity: 'uncommon', value: 0.002 },
		{ id: 'execute_3', rarity: 'rare', value: 0.005 },
		{ id: 'execute_4', rarity: 'epic', value: 0.01 },
		{ id: 'execute_5', rarity: 'legendary', value: 0.025 }
	];

	for (const { id, rarity, value } of executeCards) {
		test(`${id} exists with rarity ${rarity} and executeChance ${value}`, () => {
			const card = getUpgradeById(id);
			expect(card).toBeDefined();
			expect(card!.rarity).toBe(rarity);
			const mod = card!.modifiers.find((m) => m.stat === 'executeChance');
			expect(mod).toBeDefined();
			expect(mod!.value).toBe(value);
		});
	}
});

describe('gold per kill cards (two paths)', () => {
	const flatGoldCards = [
		{ id: 'gold_per_kill_1', rarity: 'common', value: 1 },
		{ id: 'gold_per_kill_2', rarity: 'uncommon', value: 2 },
		{ id: 'gold_per_kill_3', rarity: 'rare', value: 3 },
		{ id: 'gold_per_kill_4', rarity: 'epic', value: 5 },
		{ id: 'gold_per_kill_5', rarity: 'legendary', value: 10 }
	];

	for (const { id, rarity, value } of flatGoldCards) {
		test(`${id} exists with rarity ${rarity} and goldPerKill ${value}`, () => {
			const card = getUpgradeById(id);
			expect(card).toBeDefined();
			expect(card!.rarity).toBe(rarity);
			const mod = card!.modifiers.find((m) => m.stat === 'goldPerKill');
			expect(mod).toBeDefined();
			expect(mod!.value).toBe(value);
		});
	}

	const pctGoldCards = [
		{ id: 'gold_multiplier_1', rarity: 'rare', value: 0.1 },
		{ id: 'gold_multiplier_2', rarity: 'epic', value: 0.25 },
		{ id: 'gold_multiplier_3', rarity: 'legendary', value: 0.5 }
	];

	for (const { id, rarity, value } of pctGoldCards) {
		test(`${id} exists with rarity ${rarity} and goldMultiplier ${value}`, () => {
			const card = getUpgradeById(id);
			expect(card).toBeDefined();
			expect(card!.rarity).toBe(rarity);
			const mod = card!.modifiers.find((m) => m.stat === 'goldMultiplier');
			expect(mod).toBeDefined();
			expect(mod!.value).toBe(value);
		});
	}
});

describe('attack speed cards (percentage-based)', () => {
	const speedCards = [
		{ id: 'attack_speed_1', rarity: 'common', value: 0.005 },
		{ id: 'attack_speed_2', rarity: 'uncommon', value: 0.01 },
		{ id: 'attack_speed_3', rarity: 'rare', value: 0.025 },
		{ id: 'attack_speed_4', rarity: 'epic', value: 0.05 },
		{ id: 'attack_speed_5', rarity: 'legendary', value: 0.25 }
	];

	for (const { id, rarity, value } of speedCards) {
		test(`${id} uses attackSpeedBonus (not flat attackSpeed)`, () => {
			const card = getUpgradeById(id)!;
			expect(card).toBeDefined();
			expect(card.rarity).toBe(rarity);
			expect(card.modifiers[0].stat).toBe('attackSpeedBonus');
			expect(card.modifiers[0].value).toBe(value);
		});
	}

	test('no upgrade cards use flat attackSpeed stat', () => {
		const flatSpeedCards = allUpgrades.filter((u) =>
			u.modifiers.some((m) => m.stat === 'attackSpeed')
		);
		expect(flatSpeedCards).toHaveLength(0);
	});
});

describe('xp multiplier cards (all tiers)', () => {
	const xpCards = [
		{ id: 'xp_1', rarity: 'common', value: 0.05 },
		{ id: 'xp_2', rarity: 'uncommon', value: 0.1 },
		{ id: 'xp_3', rarity: 'rare', value: 0.15 },
		{ id: 'xp_4', rarity: 'epic', value: 0.25 },
		{ id: 'xp_5', rarity: 'legendary', value: 0.5 }
	];

	for (const { id, rarity, value } of xpCards) {
		test(`${id} exists with rarity ${rarity} and xpMultiplier ${value}`, () => {
			const card = getUpgradeById(id);
			expect(card).toBeDefined();
			expect(card!.rarity).toBe(rarity);
			const mod = card!.modifiers.find((m) => m.stat === 'xpMultiplier');
			expect(mod).toBeDefined();
			expect(mod!.value).toBe(value);
		});
	}
});
