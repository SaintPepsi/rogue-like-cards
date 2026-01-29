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

const { getRandomUpgrades, EXECUTE_CHANCE_BASE_CAP } = await import('./upgrades');

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
});
