import type { Page } from '@playwright/test';

/**
 * Seeds Math.random() for deterministic test runs.
 * Call this before navigating to the page.
 */
export async function seedRandom(page: Page, seed: number = 12345) {
	await page.addInitScript((initialSeed: number) => {
		let currentSeed = initialSeed;
		Math.random = () => {
			currentSeed = (currentSeed * 9301 + 49297) % 233280;
			return currentSeed / 233280;
		};
	}, seed);
}
