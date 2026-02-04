import { expect, test } from '@playwright/test';
import { VERSION } from '$lib/version';

test.describe('Legendary Selection Modal', () => {
	async function setupGame(page: any) {
		await page.goto('/');
		await page.evaluate((version: string) => {
			localStorage.clear();
			localStorage.setItem('changelog_last_seen_version', version);
		}, VERSION);
		await page.reload();
		await page.locator('.enemy').waitFor({ state: 'visible' });
	}

	async function completeFirstRun(page: any) {
		// Force boss timer to expire (natural death)
		await page.evaluate(() => {
			window.gameState?.__test__.triggerBossExpired(true);
		});

		// Close game over modal
		await page.locator('.modal-overlay').waitFor({ state: 'visible' });
		await page.locator('button:has-text("Play Again")').click();
		await page.locator('.modal-overlay').waitFor({ state: 'hidden' });
	}

	// Tests will go here
});
