import type { PlayerStats, Upgrade } from '$lib/types';
import { getRandomUpgrades, getExecuteCap, executeCapUpgrade, goldPerKillUpgrade } from '$lib/data/upgrades';
import { getCardPrice as calculateCardPrice } from '$lib/engine/shop';
import type { createPersistence } from './persistence.svelte';

const EXECUTE_CAP_BONUS_PER_LEVEL = 0.005;
const GOLD_PER_KILL_BONUS_PER_LEVEL = 1;

export function createShop(persistence: ReturnType<typeof createPersistence>) {
	let persistentGold = $state(0);
	let purchasedUpgrades = $state<Set<string>>(new Set());
	let executeCapBonus = $state(0);
	let goldPerKillBonus = $state(0);
	let showShop = $state(false);
	let shopChoices = $state<Upgrade[]>([]);

	function getPrice(upgrade: Upgrade): number {
		if (upgrade.id === 'execute_cap') {
			const level = Math.round(executeCapBonus / EXECUTE_CAP_BONUS_PER_LEVEL);
			return calculateCardPrice(upgrade.rarity, level);
		}
		if (upgrade.id === 'gold_per_kill') {
			const level = Math.round(goldPerKillBonus / GOLD_PER_KILL_BONUS_PER_LEVEL);
			return calculateCardPrice(upgrade.rarity, level);
		}
		return calculateCardPrice(upgrade.rarity, purchasedUpgrades.size);
	}

	function generateChoices(stats: PlayerStats): Upgrade[] {
		const randomCards = getRandomUpgrades(1, 0.2, stats.executeChance, getExecuteCap(executeCapBonus), stats.poison);
		return [...randomCards, goldPerKillUpgrade, executeCapUpgrade];
	}

	function open(stats: PlayerStats) {
		shopChoices = generateChoices(stats);
		showShop = true;
	}

	function close() {
		showShop = false;
	}

	function buy(upgrade: Upgrade, stats: PlayerStats): boolean {
		const price = getPrice(upgrade);
		if (persistentGold < price) return false;

		persistentGold -= price;

		if (upgrade.id === 'execute_cap') {
			executeCapBonus += EXECUTE_CAP_BONUS_PER_LEVEL;
		} else if (upgrade.id === 'gold_per_kill') {
			goldPerKillBonus += GOLD_PER_KILL_BONUS_PER_LEVEL;
		} else {
			purchasedUpgrades = new Set([...purchasedUpgrades, upgrade.id]);
		}

		save();

		// Refresh shop choices after purchase (delayed to let animation play)
		setTimeout(() => {
			shopChoices = generateChoices(stats);
		}, 400);
		return true;
	}

	function depositGold(amount: number) {
		persistentGold += amount;
		save();
	}

	function getExecuteCapValue(): number {
		return getExecuteCap(executeCapBonus);
	}

	function getGoldPerKillBonus(): number {
		return goldPerKillBonus;
	}

	function save() {
		persistence.savePersistent({
			gold: persistentGold,
			purchasedUpgradeIds: [...purchasedUpgrades],
			executeCapBonus,
			goldPerKillBonus
		});
	}

	function load() {
		const data = persistence.loadPersistent();
		if (!data) return;
		persistentGold = data.gold || 0;
		purchasedUpgrades = new Set(data.purchasedUpgradeIds || []);
		executeCapBonus = data.executeCapBonus || 0;
		goldPerKillBonus = data.goldPerKillBonus || 0;
	}

	function fullReset() {
		persistentGold = 0;
		purchasedUpgrades = new Set();
		executeCapBonus = 0;
		goldPerKillBonus = 0;
		persistence.clearPersistent();
	}

	function resetShopUI() {
		showShop = false;
	}

	return {
		get persistentGold() {
			return persistentGold;
		},
		get purchasedUpgrades() {
			return purchasedUpgrades;
		},
		get executeCapBonus() {
			return executeCapBonus;
		},
		get goldPerKillBonus() {
			return goldPerKillBonus;
		},
		get executeCapLevel() {
			return Math.round(executeCapBonus / EXECUTE_CAP_BONUS_PER_LEVEL);
		},
		get goldPerKillLevel() {
			return Math.round(goldPerKillBonus / GOLD_PER_KILL_BONUS_PER_LEVEL);
		},
		get showShop() {
			return showShop;
		},
		get shopChoices() {
			return shopChoices;
		},
		getPrice,
		getExecuteCapValue,
		getGoldPerKillBonus,
		open,
		close,
		buy,
		depositGold,
		save,
		load,
		fullReset,
		resetShopUI
	};
}
