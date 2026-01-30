import type { Rarity } from '$lib/types';

const RARITY_BASE_PRICES: Record<Rarity, number> = {
	common: 25,
	uncommon: 50,
	rare: 100,
	epic: 175,
	legendary: 300
};

const PURCHASE_MULTIPLIER = 1.5;

export function getCardPrice(rarity: Rarity, timesBought: number): number {
	const base = RARITY_BASE_PRICES[rarity];
	return Math.round(base * Math.pow(PURCHASE_MULTIPLIER, timesBought));
}
