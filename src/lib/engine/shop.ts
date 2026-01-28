const BASE_PRICES = [10, 15, 25];

export function getCardPrice(cardIndex: number, purchasedCount: number): number {
	return BASE_PRICES[cardIndex] + purchasedCount * 5;
}
