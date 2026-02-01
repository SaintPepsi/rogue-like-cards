import type { Rarity } from '$lib/types';

// DECISION: Roughly 2x per rarity tier (25→50→100→175→300).
// Epic/legendary deviate from strict 2x to stay affordable relative to gold income at those stages.
// Players typically earn 50-100g per stage, so common cards are impulse buys and legendaries are aspirational.
const RARITY_BASE_PRICES: Record<Rarity, number> = {
	common: 25,
	uncommon: 50,
	rare: 100,
	epic: 175,
	legendary: 300
};

// DECISION: 1.5x per repeat purchase prevents stockpiling the same cheap card.
// 2x felt too punishing for build-defining commons; 1.25x didn't discourage hoarding.
const PURCHASE_MULTIPLIER = 1.5;

export function getCardPrice(rarity: Rarity, timesBought: number): number {
	const base = RARITY_BASE_PRICES[rarity];
	return Math.round(base * Math.pow(PURCHASE_MULTIPLIER, timesBought));
}
