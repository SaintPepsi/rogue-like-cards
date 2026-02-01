import { SvelteMap } from 'svelte/reactivity';
import type { PlayerStats, Upgrade } from '$lib/types';
import {
	allUpgrades,
	pickByRarity,
	getExecuteCap,
	getUpgradeById,
	executeCapUpgrade,
	goldPerKillUpgrade
} from '$lib/data/upgrades';
import { getCardPrice as calculateCardPrice } from '$lib/engine/shop';
import type { createPersistence } from './persistence.svelte';

const EXECUTE_CAP_BONUS_PER_LEVEL = 0.005;
const GOLD_PER_KILL_BONUS_PER_LEVEL = 1;

export function createShop(persistence: ReturnType<typeof createPersistence>) {
	let persistentGold = $state(0);
	let purchasedUpgradeCounts = new SvelteMap<string, number>();
	let executeCapBonus = $state(0);
	let goldPerKillBonus = $state(0);
	let showShop = $state(false);
	let shopChoices = $state<Upgrade[]>([]);
	let rerollCost = $state(1);

	function getPrice(upgrade: Upgrade): number {
		if (upgrade.id === 'execute_cap') {
			const level = Math.round(executeCapBonus / EXECUTE_CAP_BONUS_PER_LEVEL);
			return calculateCardPrice(upgrade.rarity, level);
		}
		if (upgrade.id === 'gold_per_kill') {
			const level = Math.round(goldPerKillBonus / GOLD_PER_KILL_BONUS_PER_LEVEL);
			return calculateCardPrice(upgrade.rarity, level);
		}
		return calculateCardPrice(upgrade.rarity, purchasedUpgradeCounts.get(upgrade.id) ?? 0);
	}

	const SHOP_CARD_SLOTS = 3;

	function generateChoices(stats: PlayerStats): Upgrade[] {
		const allCards = [...allUpgrades, executeCapUpgrade, goldPerKillUpgrade];
		return pickByRarity(allCards, SHOP_CARD_SLOTS, stats.luckyChance);
	}

	function open(stats: PlayerStats) {
		if (shopChoices.length === 0) {
			shopChoices = generateChoices(stats);
		}
		showShop = true;
	}

	function reroll(stats: PlayerStats): boolean {
		if (persistentGold < rerollCost) return false;
		persistentGold -= rerollCost;
		rerollCost++;
		shopChoices = generateChoices(stats);
		save();
		return true;
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
			const prev = purchasedUpgradeCounts.get(upgrade.id) ?? 0;
			purchasedUpgradeCounts = new SvelteMap([...purchasedUpgradeCounts, [upgrade.id, prev + 1]]);
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
			purchasedUpgradeCounts: Object.fromEntries(purchasedUpgradeCounts),
			executeCapBonus,
			goldPerKillBonus,
			shopChoiceIds: shopChoices.map((u) => u.id),
			rerollCost
		});
	}

	function load() {
		const data = persistence.loadPersistent();
		if (!data) return;
		persistentGold = data.gold || 0;
		purchasedUpgradeCounts = new SvelteMap(Object.entries(data.purchasedUpgradeCounts || {}));
		executeCapBonus = data.executeCapBonus || 0;
		goldPerKillBonus = data.goldPerKillBonus || 0;
		rerollCost = data.rerollCost ?? 1;

		if (data.shopChoiceIds) {
			const specialCards: Record<string, Upgrade> = {
				execute_cap: executeCapUpgrade,
				gold_per_kill: goldPerKillUpgrade
			};
			shopChoices = data.shopChoiceIds
				.map((id) => specialCards[id] ?? getUpgradeById(id))
				.filter((u): u is Upgrade => u !== undefined);
		}
	}

	function expandPurchasedIds(): string[] {
		const ids: string[] = [];
		for (const [id, count] of purchasedUpgradeCounts) {
			for (let i = 0; i < count; i++) {
				ids.push(id);
			}
		}
		return ids;
	}

	function fullReset() {
		persistentGold = 0;
		purchasedUpgradeCounts = new SvelteMap();
		executeCapBonus = 0;
		goldPerKillBonus = 0;
		shopChoices = [];
		rerollCost = 1;
		persistence.clearPersistent();
	}

	function resetShopUI() {
		showShop = false;
	}

	return {
		get persistentGold() {
			return persistentGold;
		},
		get purchasedUpgradeIds() {
			return expandPurchasedIds();
		},
		get purchasedUpgradeCounts() {
			return purchasedUpgradeCounts;
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
		get rerollCost() {
			return rerollCost;
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
		reroll,
		depositGold,
		save,
		load,
		fullReset,
		resetShopUI
	};
}
