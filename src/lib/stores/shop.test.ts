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
		expect(shop.purchasedUpgrades.size).toBe(0);
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

	test('open sets showShop and generates choices', () => {
		const shop = createShop(persistence);
		const stats = createDefaultStats();
		shop.open(stats);

		expect(shop.showShop).toBe(true);
		expect(shop.shopChoices.length).toBeGreaterThan(0);
	});

	test('close hides shop', () => {
		const shop = createShop(persistence);
		shop.open(createDefaultStats());
		shop.close();

		expect(shop.showShop).toBe(false);
	});

	test('buy returns false when insufficient gold', () => {
		const shop = createShop(persistence);
		const stats = createDefaultStats();
		shop.open(stats);

		const upgrade = shop.shopChoices[0];
		const result = shop.buy(upgrade, stats);
		expect(result).toBe(false);
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

	test('getPrice returns positive number', () => {
		const shop = createShop(persistence);
		shop.open(createDefaultStats());

		const upgrade = shop.shopChoices[0];
		expect(shop.getPrice(upgrade)).toBeGreaterThan(0);
	});

	test('load restores from persistence', () => {
		const p = mockPersistence();
		(p.loadPersistent as ReturnType<typeof vi.fn>).mockReturnValue({
			gold: 500,
			purchasedUpgradeIds: ['upgrade1'],
			executeCapBonus: 0.05,
			goldPerKillBonus: 2
		});

		const shop = createShop(p);
		shop.load();

		expect(shop.persistentGold).toBe(500);
		expect(shop.purchasedUpgrades.has('upgrade1')).toBe(true);
	});

	test('fullReset clears all persistent state', () => {
		const shop = createShop(persistence);
		shop.depositGold(500);

		shop.fullReset();
		expect(shop.persistentGold).toBe(0);
		expect(shop.purchasedUpgrades.size).toBe(0);
		expect(persistence.clearPersistent).toHaveBeenCalled();
	});

	test('resetShopUI hides shop without clearing data', () => {
		const shop = createShop(persistence);
		shop.depositGold(100);
		shop.open(createDefaultStats());

		shop.resetShopUI();
		expect(shop.showShop).toBe(false);
		expect(shop.persistentGold).toBe(100);
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

	test('applyPurchasedUpgrades returns updated unlocked set', () => {
		const shop = createShop(persistence);
		const stats = createDefaultStats();
		const unlocked = new Set<string>();

		const result = shop.applyPurchasedUpgrades(stats, unlocked);
		// With no purchased upgrades, should return same set (possibly empty)
		expect(result).toBeDefined();
	});
});
