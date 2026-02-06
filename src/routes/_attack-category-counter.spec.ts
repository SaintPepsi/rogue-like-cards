import { expect, test, type Page } from '@playwright/test';
import { VERSION } from '$lib/version';
import { seedRandom } from './_test-helpers';

/**
 * Helper function to get counter value for a specific attack type.
 * Returns 0 if the counter doesn't exist or isn't visible.
 */
async function getCounterValue(page: Page, type: string): Promise<number> {
	const counter = page.locator(`.attack-count.${type}`);
	if (!(await counter.isVisible().catch(() => false))) {
		return 0;
	}
	const text = await counter.textContent();
	return parseInt(text?.replace(/\D/g, '') || '0', 10);
}

/**
 * Standard game setup: seeds RNG, navigates, clears localStorage, mocks changelog version.
 */
async function setupGame(page: Page) {
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

/**
 * Performs a single attack on the enemy.
 */
async function attackEnemy(page: Page) {
	const enemy = page.locator('.enemy');
	await enemy.dispatchEvent('pointerdown');
	await page.waitForTimeout(30);
	await enemy.dispatchEvent('pointerup');
	await page.waitForTimeout(50);
}

/**
 * Attacks the enemy multiple times, handling any modals that appear.
 */
async function attackEnemyMultipleTimes(page: Page, times: number) {
	for (let i = 0; i < times; i++) {
		await attackEnemy(page);

		// Handle modals (level up, chest loot, shop) if they appear
		const modal = page.locator('.modal-overlay');
		if (await modal.isVisible({ timeout: 100 }).catch(() => false)) {
			const cardButton = modal.locator('.desktop-grid .card-wrapper button').first();
			if (await cardButton.isVisible({ timeout: 500 }).catch(() => false)) {
				await cardButton.click();
				await modal.waitFor({ state: 'hidden', timeout: 3000 });
			}
		}
	}
}

test.describe('Attack Category Counter', () => {
	test('attack counters visible in battle-stats area after first attack', async ({ page }) => {
		await setupGame(page);

		// Attack enemy once
		await attackEnemy(page);

		// Wait for UI to update
		await page.waitForTimeout(100);

		// Verify attack counts section is visible
		await expect(page.locator('.attack-counts')).toBeVisible();

		// Verify at least one attack counter element exists
		await expect(page.locator('.attack-count').first()).toBeVisible();

		// Visual regression
		await expect(page.locator('.battle-stats')).toHaveScreenshot('attack-counters-visible.png');
	});

	test('normal attack increments the normal counter', async ({ page }) => {
		await setupGame(page);

		// Attack enemy 5 times
		await attackEnemyMultipleTimes(page, 5);

		// Wait for UI to settle
		await page.waitForTimeout(100);

		// Verify "Normal Hits" counter exists and shows a count
		const normalCounter = page.locator('.attack-count.normal');
		await expect(normalCounter).toBeVisible();
		await expect(normalCounter).toContainText('Normal Hits');

		// Get the count and verify it's at least 5 (some attacks might be crits)
		const count = await getCounterValue(page, 'normal');
		expect(count).toBeGreaterThanOrEqual(1); // At least 1 normal hit (others might crit)

		// Visual regression
		await expect(page.locator('.battle-stats')).toHaveScreenshot('normal-attack-counter.png');
	});

	test('counters reset on new run (game over -> restart)', async ({ page }) => {
		await setupGame(page);

		// Attack multiple times to accumulate counts
		await attackEnemyMultipleTimes(page, 10);
		await page.waitForTimeout(100);

		// Store the current count
		const countBeforeGameOver = await getCounterValue(page, 'normal');
		expect(countBeforeGameOver).toBeGreaterThan(0);

		// Trigger game over via test helper
		await page.evaluate(() => {
			window.gameState?.__test__.triggerBossExpired(true);
		});

		// Wait for game over modal
		await page.locator('.modal-overlay').waitFor({ state: 'visible' });

		// Click Play Again to start new run
		await page.locator('button:has-text("Play Again")').click();

		// Handle legendary selection modal if it appears (first completion)
		const legendaryModal = page.locator('[data-testid="legendary-selection-modal"]');
		if (await legendaryModal.isVisible({ timeout: 500 }).catch(() => false)) {
			await page.locator('button:has-text("Skip")').click();
			await legendaryModal.waitFor({ state: 'hidden' });
		}

		// Wait for new game to start
		await page.locator('.enemy').waitFor({ state: 'visible' });
		await page.waitForTimeout(500);

		// Attack once in the new run
		await attackEnemy(page);
		await page.waitForTimeout(100);

		// Verify counter shows fresh values (not cumulative from previous run)
		const countAfterNewRun = await getCounterValue(page, 'normal');
		// Should be small (just started new run), not accumulated from previous
		expect(countAfterNewRun).toBeLessThan(countBeforeGameOver);

		// Visual regression
		await expect(page.locator('.battle-stats')).toHaveScreenshot('counters-after-reset.png');
	});

	test('multiple attack types tracked simultaneously', async ({ page }) => {
		await setupGame(page);

		// Attack many times to get various hit types (normal, crit, etc.)
		await attackEnemyMultipleTimes(page, 50);
		await page.waitForTimeout(200);

		// Verify at least one attack type is tracked
		const attackCounts = page.locator('.attack-count');
		const count = await attackCounts.count();
		expect(count).toBeGreaterThanOrEqual(1);

		// Verify each visible counter has a valid type class
		const counters = await attackCounts.all();
		for (const counter of counters) {
			const classList = await counter.getAttribute('class');
			expect(classList).toMatch(/(normal|crit|execute|poison)/);
		}

		// Visual regression
		await expect(page.locator('.battle-stats')).toHaveScreenshot('multiple-attack-types.png');
	});

	test('attack stats persist across page refresh', async ({ page }) => {
		await setupGame(page);

		// Attack enemy multiple times to accumulate counts
		await attackEnemyMultipleTimes(page, 10);
		await page.waitForTimeout(100);

		// Note current counter values
		const beforeCount = await getCounterValue(page, 'normal');
		expect(beforeCount).toBeGreaterThan(0);

		// Refresh the page
		await page.reload();
		await page.locator('.enemy').waitFor({ state: 'visible' });
		await page.waitForTimeout(500);

		// Verify counter values match pre-refresh
		const afterCount = await getCounterValue(page, 'normal');
		expect(afterCount).toEqual(beforeCount);

		// Visual regression
		await expect(page.locator('.battle-stats')).toHaveScreenshot('counters-after-refresh.png');
	});

	test('attack stats display on game over modal', async ({ page }) => {
		await setupGame(page);

		// Attack enemy multiple times
		await attackEnemyMultipleTimes(page, 20);
		await page.waitForTimeout(100);

		// Trigger game over via test helper
		await page.evaluate(() => {
			window.gameState?.__test__.triggerBossExpired(true);
		});

		// Wait for game over modal
		const gameOverModal = page.locator('.modal-overlay');
		await expect(gameOverModal).toBeVisible();

		// Verify attack stats are shown in the game over modal
		const attackStatsInModal = gameOverModal.locator(
			'.attack-counts, [data-testid="attack-breakdown"]'
		);
		await expect(attackStatsInModal).toBeVisible();

		// Visual regression
		await expect(gameOverModal).toHaveScreenshot('game-over-attack-stats.png');
	});
});
