import type { Rarity } from '$lib/types';

const RARITY_BASE_PRICES: Record<Rarity, number> = {
	common: 10,
	uncommon: 20,
	rare: 35,
	epic: 60,
	legendary: 100
};

const PURCHASE_MULTIPLIER = 1.5;

export function getCardPrice(rarity: Rarity, timesBought: number): number {
	const base = RARITY_BASE_PRICES[rarity];
	return Math.round(base * Math.pow(PURCHASE_MULTIPLIER, timesBought));
}
