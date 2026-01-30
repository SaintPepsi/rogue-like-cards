import { describe, test, expect, vi } from 'vitest';

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

const { getRandomUpgrades, getUpgradeById, allUpgrades, EXECUTE_CHANCE_BASE_CAP } = await import('./upgrades');

describe('getUpgradeById', () => {
	test('returns the correct upgrade for a valid ID', () => {
		const upgrade = getUpgradeById('damage1');
		expect(upgrade).toBeDefined();
		expect(upgrade!.id).toBe('damage1');
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
			'poisondur1', 'poisondur2', 'poisondur3',
			'poisonstack1', 'poisonstack2', 'poisonstack3',
			'poisoncrit1', 'poisoncrit2', 'poisoncrit3',
			'combo3', 'legendary4'
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
			'poisondur1', 'poisondur2', 'poisondur3',
			'poisonstack1', 'poisonstack2', 'poisonstack3',
			'poisoncrit1', 'poisoncrit2', 'poisoncrit3',
			'combo3', 'legendary4'
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
		const executeIds = new Set(['execute1', 'execute2', 'execute3']);

		for (let i = 0; i < 20; i++) {
			const result = getRandomUpgrades(3, 0, EXECUTE_CHANCE_BASE_CAP, EXECUTE_CHANCE_BASE_CAP, 0);
			for (const upgrade of result) {
				expect(executeIds.has(upgrade.id)).toBe(false);
			}
		}
	});

	test('allows execute upgrades when below cap', () => {
		const executeIds = new Set(['execute1', 'execute2', 'execute3']);

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
		const rarityCounts: Record<string, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };

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
			rareCountNoLuck += noLuck.filter((u) => u.rarity === 'rare' || u.rarity === 'epic' || u.rarity === 'legendary').length;

			const highLuck = getRandomUpgrades(3, 1.0, 0, EXECUTE_CHANCE_BASE_CAP, 5);
			rareCountHighLuck += highLuck.filter((u) => u.rarity === 'rare' || u.rarity === 'epic' || u.rarity === 'legendary').length;
		}

		// With max lucky chance, rare+ cards should appear more often
		expect(rareCountHighLuck).toBeGreaterThan(rareCountNoLuck);
	});
});
