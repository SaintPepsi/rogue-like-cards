import { expect, test } from '@playwright/test';
import { VERSION } from '$lib/version';
import { seedRandom } from './_test-helpers';

test.describe('Legendary Selection Modal', () => {
	async function setupGame(page: any) {
		// Seed Math.random() for deterministic test runs
		await seedRandom(page);

		await page.goto('/');
		await page.evaluate((version: string) => {
			localStorage.clear();
			localStorage.setItem('changelog_last_seen_version', version);
		}, VERSION);
		await page.reload();
		await page.locator('.enemy').waitFor({ state: 'visible' });
		// Wait for game loop to initialize
		await page.waitForTimeout(500);
	}

	async function completeFirstRun(page: any) {
		// Force boss timer to expire (natural death)
		await page.evaluate(() => {
			window.gameState?.__test__.triggerBossExpired(true);
		});

		// Close game over modal
		await page.locator('.modal-overlay').waitFor({ state: 'visible' });
		await page.locator('button:has-text("Play Again")').click();

		// After first completion, legendary selection modal appears - skip it
		const legendaryModal = page.locator('[data-testid="legendary-selection-modal"]');
		await legendaryModal.waitFor({ state: 'visible' });
		await page.locator('button:has-text("Skip")').click();
		await legendaryModal.waitFor({ state: 'hidden' });
	}

	test('give up does not show legendary selection modal', async ({ page }) => {
		// Setup and complete first run
		await setupGame(page);
		await completeFirstRun(page);

		// Start second run
		await page.locator('.enemy').waitFor({ state: 'visible' });

		// Give up - click header button to open confirmation
		await page.locator('button:has-text("Give Up")').first().click();

		// Wait for confirmation dialog
		await page.locator('.confirm-dialog').waitFor({ state: 'visible' });

		// Click the actual Give Up button in the confirmation modal
		await page.locator('.confirm-dialog button:has-text("Give Up")').click();

		// Wait for game over modal to appear
		await page.locator('.modal-overlay').waitFor({ state: 'visible' });

		// Verify legendary modal does NOT appear (only game over modal)
		const legendaryModal = page.locator('[data-testid="legendary-selection-modal"]');
		await expect(legendaryModal).not.toBeVisible();

		// Wait for any animations to settle
		await page.waitForTimeout(500);

		// Visual regression: capture game over state without legendary modal
		await expect(page).toHaveScreenshot('legendary-give-up-no-modal.png', { fullPage: true });
	});

	test('boss timeout shows legendary selection modal after first completion', async ({ page }) => {
		// Setup and complete first run
		await setupGame(page);
		await completeFirstRun(page);

		// Start second run
		await page.locator('.enemy').waitFor({ state: 'visible' });

		// Force boss timeout again
		await page.evaluate(() => {
			window.gameState?.__test__.triggerBossExpired(true);
		});

		// Close game over modal
		await page.locator('.modal-overlay').waitFor({ state: 'visible' });
		await page.locator('button:has-text("Play Again")').click();

		// Verify legendary modal DOES appear
		const legendaryModal = page.locator('[data-testid="legendary-selection-modal"]');
		await expect(legendaryModal).toBeVisible();

		// Wait for modal animations to settle
		await page.waitForTimeout(500);

		// Visual regression: capture legendary selection modal visible
		await expect(page).toHaveScreenshot('legendary-boss-timeout-with-modal.png', {
			fullPage: true
		});
	});
});
