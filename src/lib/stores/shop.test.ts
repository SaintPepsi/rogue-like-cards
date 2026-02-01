import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createShop } from './shop.svelte';
import { createDefaultStats } from '$lib/engine/stats';
import type { createPersistence } from './persistence.svelte';

function mockPersistence(): ReturnType<typeof createPersistence> {
	return {
		saveSession: vi.fn(),
		loadSession: vi.fn(() => null),
		clearSession: vi.fn(),
		savePersistent: vi.fn(),
		loadPersistent: vi.fn(() => null),
		clearPersistent: vi.fn()
	};
}

describe('createShop', () => {
	let persistence: ReturnType<typeof createPersistence>;

	beforeEach(() => {
		persistence = mockPersistence();
	});

	test('starts with zero gold and empty upgrades', () => {
		const shop = createShop(persistence);
		expect(shop.persistentGold).toBe(0);
		expect(shop.purchasedUpgradeIds).toEqual([]);
		expect(shop.showShop).toBe(false);
	});

	test('depositGold increases persistent gold', () => {
		const shop = createShop(persistence);
		shop.depositGold(100);
		expect(shop.persistentGold).toBe(100);
		expect(persistence.savePersistent).toHaveBeenCalled();
	});

	test('depositGold accumulates', () => {
		const shop = createShop(persistence);
		shop.depositGold(50);
		shop.depositGold(30);
		expect(shop.persistentGold).toBe(80);
	});

	test('open sets showShop and generates choices when gold available', () => {
		const shop = createShop(persistence);
		shop.depositGold(10000);
		const stats = createDefaultStats();
		shop.open(stats);

		expect(shop.showShop).toBe(true);
		expect(shop.shopChoices.length).toBeGreaterThan(0);
	});

	test('open with no gold still shows cards', () => {
		const shop = createShop(persistence);
		shop.open(createDefaultStats());

		expect(shop.showShop).toBe(true);
		expect(shop.shopChoices.length).toBe(3);
	});

	test('open preserves existing choices across visits', () => {
		const shop = createShop(persistence);
		shop.depositGold(10000);
		const stats = createDefaultStats();

		shop.open(stats);
		const firstChoices = [...shop.shopChoices];
		shop.close();

		shop.open(stats);
		expect(shop.shopChoices.map((c) => c.id)).toEqual(firstChoices.map((c) => c.id));
	});

	test('close hides shop', () => {
		const shop = createShop(persistence);
		shop.depositGold(10000);
		shop.open(createDefaultStats());
		shop.close();

		expect(shop.showShop).toBe(false);
	});

	test('buy returns false when insufficient gold', () => {
		vi.useFakeTimers();
		const shop = createShop(persistence);
		shop.depositGold(10000);
		const stats = createDefaultStats();
		shop.open(stats);

		// Spend all gold
		const upgrade = shop.shopChoices[0];
		shop.depositGold(-shop.persistentGold + 1); // leave 1 gold
		const result = shop.buy(upgrade, stats);
		expect(result).toBe(false);

		vi.useRealTimers();
	});

	test('buy succeeds with sufficient gold', () => {
		vi.useFakeTimers();
		const shop = createShop(persistence);
		shop.depositGold(10000);

		const stats = createDefaultStats();
		shop.open(stats);

		const upgrade = shop.shopChoices[0];
		const price = shop.getPrice(upgrade);
		const result = shop.buy(upgrade, stats);

		expect(result).toBe(true);
		expect(shop.persistentGold).toBe(10000 - price);

		vi.useRealTimers();
	});

	test('buying same card twice increases its count and price', () => {
		vi.useFakeTimers();
		const shop = createShop(persistence);
		shop.depositGold(100000);

		const stats = createDefaultStats();
		shop.open(stats);

		const upgrade = shop.shopChoices[0];
		if (upgrade.id === 'execute_cap' || upgrade.id === 'gold_per_kill') return;

		const firstPrice = shop.getPrice(upgrade);
		shop.buy(upgrade, stats);
		vi.advanceTimersByTime(500);

		const secondPrice = shop.getPrice(upgrade);
		expect(secondPrice).toBeGreaterThan(firstPrice);
		expect(shop.purchasedUpgradeIds.filter((id) => id === upgrade.id)).toHaveLength(1);

		shop.buy(upgrade, stats);
		vi.advanceTimersByTime(500);
		expect(shop.purchasedUpgradeIds.filter((id) => id === upgrade.id)).toHaveLength(2);

		vi.useRealTimers();
	});

	test('generateChoices returns cards regardless of gold', () => {
		const shop = createShop(persistence);
		shop.open(createDefaultStats());

		expect(shop.shopChoices.length).toBe(3);
		expect(shop.persistentGold).toBe(0);
	});

	test('rerollCost starts at 1', () => {
		const shop = createShop(persistence);
		expect(shop.rerollCost).toBe(1);
	});

	test('reroll regenerates choices and increases cost', () => {
		const shop = createShop(persistence);
		shop.depositGold(100);
		const stats = createDefaultStats();
		shop.open(stats);
		shop.reroll(stats);
		expect(shop.rerollCost).toBe(2);
		// Choices were regenerated (may or may not differ due to randomness, but function ran)
		expect(shop.shopChoices.length).toBe(3);
	});

	test('reroll deducts gold', () => {
		const shop = createShop(persistence);
		shop.depositGold(100);
		const stats = createDefaultStats();
		shop.open(stats);

		shop.reroll(stats);
		expect(shop.persistentGold).toBe(99);

		shop.reroll(stats);
		expect(shop.persistentGold).toBe(97);
	});

	test('reroll fails with insufficient gold', () => {
		const shop = createShop(persistence);
		const stats = createDefaultStats();
		shop.open(stats);
		const originalChoiceIds = shop.shopChoices.map((c) => c.id);

		const result = shop.reroll(stats);
		expect(result).toBe(false);
		expect(shop.rerollCost).toBe(1);
		expect(shop.shopChoices.map((c) => c.id)).toEqual(originalChoiceIds);
	});

	test('rerollCost persists across load', () => {
		const p = mockPersistence();
		(p.loadPersistent as ReturnType<typeof vi.fn>).mockReturnValue({
			gold: 500,
			purchasedUpgradeCounts: {},
			executeCapBonus: 0,
			goldPerKillBonus: 0,
			rerollCost: 5
		});

		const shop = createShop(p);
		shop.load();

		expect(shop.rerollCost).toBe(5);
	});

	test('fullReset resets rerollCost to 1', () => {
		const shop = createShop(persistence);
		shop.depositGold(100);
		shop.reroll(createDefaultStats());
		shop.reroll(createDefaultStats());

		shop.fullReset();
		expect(shop.rerollCost).toBe(1);
	});

	test('getPrice returns positive number', () => {
		const shop = createShop(persistence);
		shop.depositGold(10000);
		shop.open(createDefaultStats());

		const upgrade = shop.shopChoices[0];
		expect(shop.getPrice(upgrade)).toBeGreaterThan(0);
	});

	test('load restores from persistence', () => {
		const p = mockPersistence();
		(p.loadPersistent as ReturnType<typeof vi.fn>).mockReturnValue({
			gold: 500,
			purchasedUpgradeCounts: { upgrade1: 2 },
			executeCapBonus: 0.05,
			goldPerKillBonus: 2
		});

		const shop = createShop(p);
		shop.load();

		expect(shop.persistentGold).toBe(500);
		expect(shop.purchasedUpgradeIds).toEqual(['upgrade1', 'upgrade1']);
	});

	test('load restores shop choices from saved IDs', () => {
		const p = mockPersistence();
		(p.loadPersistent as ReturnType<typeof vi.fn>).mockReturnValue({
			gold: 10000,
			purchasedUpgradeCounts: {},
			executeCapBonus: 0,
			goldPerKillBonus: 0,
			shopChoiceIds: ['execute_cap', 'gold_per_kill']
		});

		const shop = createShop(p);
		shop.load();

		expect(shop.shopChoices.map((c) => c.id)).toEqual(['execute_cap', 'gold_per_kill']);
	});

	test('fullReset clears all persistent state', () => {
		const shop = createShop(persistence);
		shop.depositGold(500);

		shop.fullReset();
		expect(shop.persistentGold).toBe(0);
		expect(shop.purchasedUpgradeIds).toEqual([]);
		expect(shop.shopChoices).toEqual([]);
		expect(persistence.clearPersistent).toHaveBeenCalled();
	});

	test('resetShopUI hides shop without clearing data', () => {
		const shop = createShop(persistence);
		shop.depositGold(10000);
		shop.open(createDefaultStats());

		shop.resetShopUI();
		expect(shop.showShop).toBe(false);
		expect(shop.persistentGold).toBe(10000);
	});

	test('executeCapLevel starts at 0', () => {
		const shop = createShop(persistence);
		expect(shop.executeCapLevel).toBe(0);
	});

	test('goldPerKillLevel starts at 0', () => {
		const shop = createShop(persistence);
		expect(shop.goldPerKillLevel).toBe(0);
	});

	test('getExecuteCapValue returns base cap initially', () => {
		const shop = createShop(persistence);
		expect(shop.getExecuteCapValue()).toBeGreaterThan(0);
	});

	test('getGoldPerKillBonus starts at 0', () => {
		const shop = createShop(persistence);
		expect(shop.getGoldPerKillBonus()).toBe(0);
	});
});
