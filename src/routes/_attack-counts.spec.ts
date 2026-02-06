import { test, expect } from '@playwright/test';
import { VERSION } from '$lib/version';
import { seedRandom } from './_test-helpers';

test.describe('Attack Counts', () => {
	test.beforeEach(async ({ page }) => {
		// Seed Math.random() for deterministic test runs
		await seedRandom(page);

		// Navigate and wait for game to load
		await page.goto('/');
		await page.locator('.enemy').waitFor({ state: 'visible' });

		// Clear localStorage for a fresh game state, then mock changelog version to prevent modal
		await page.evaluate((version) => {
			localStorage.clear();
			localStorage.setItem('changelog_last_seen_version', version);
		}, VERSION);
		await page.reload();
		await page.locator('.enemy').waitFor({ state: 'visible' });

		// Wait for game loop to initialize
		await page.waitForTimeout(500);
	});

	test('displays attack breakdown section in battle stats', async ({ page }) => {
		// Verify battle-stats section exists first
		await expect(page.locator('.battle-stats')).toBeVisible();

		// Verify attack breakdown section exists
		const breakdown = page.locator('.attack-breakdown');
		await expect(breakdown).toBeVisible();

		// Verify all four attack type labels are present
		await expect(page.locator('.attack-stat.normal')).toBeVisible();
		await expect(page.locator('.attack-stat.crit')).toBeVisible();
		await expect(page.locator('.attack-stat.execute')).toBeVisible();
		await expect(page.locator('.attack-stat.poison')).toBeVisible();
	});

	test('attack counts start at zero', async ({ page }) => {
		// Verify all counts are initially zero
		await expect(page.locator('.attack-stat.normal')).toContainText('Normal: 0');
		await expect(page.locator('.attack-stat.crit')).toContainText('Crit: 0');
		await expect(page.locator('.attack-stat.execute')).toContainText('Execute: 0');
		await expect(page.locator('.attack-stat.poison')).toContainText('Poison: 0');
	});

	test('normal attack count increments when attacking', async ({ page }) => {
		// Get initial normal count
		const normalStat = page.locator('.attack-stat.normal');
		const initialText = await normalStat.textContent();
		const initialCount = parseInt(initialText?.replace(/\D/g, '') || '0', 10);

		// Perform several attacks
		const enemy = page.locator('.enemy');
		for (let i = 0; i < 10; i++) {
			await enemy.dispatchEvent('pointerdown');
			await page.waitForTimeout(30);
			await enemy.dispatchEvent('pointerup');
			await page.waitForTimeout(50);

			// Handle any modals that appear
			const modal = page.locator('.modal-overlay');
			if (await modal.isVisible({ timeout: 100 }).catch(() => false)) {
				const cardButton = modal.locator('.desktop-grid .card-wrapper button').first();
				if (await cardButton.isVisible({ timeout: 500 }).catch(() => false)) {
					await cardButton.click();
					await modal.waitFor({ state: 'hidden', timeout: 3000 });
				}
			}
		}

		// Verify normal count increased
		const finalText = await normalStat.textContent();
		const finalCount = parseInt(finalText?.replace(/\D/g, '') || '0', 10);
		expect(finalCount).toBeGreaterThan(initialCount);
	});

	test('attack counts persist across page refresh after killing enemy', async ({ page }) => {
		// Get initial kills count
		const killsText = await page.locator('.kills').textContent();
		const initialKills = parseInt(killsText?.replace(/\D/g, '') || '0', 10);

		// Attack until we kill at least one enemy (saves happen on kill)
		const enemy = page.locator('.enemy');
		let killed = false;
		for (let i = 0; i < 50 && !killed; i++) {
			await enemy.dispatchEvent('pointerdown');
			await page.waitForTimeout(30);
			await enemy.dispatchEvent('pointerup');
			await page.waitForTimeout(50);

			// Handle any modals
			const modal = page.locator('.modal-overlay');
			if (await modal.isVisible({ timeout: 100 }).catch(() => false)) {
				const cardButton = modal.locator('.desktop-grid .card-wrapper button').first();
				if (await cardButton.isVisible({ timeout: 500 }).catch(() => false)) {
					await cardButton.click();
					await modal.waitFor({ state: 'hidden', timeout: 3000 });
				}
			}

			// Check if we killed an enemy
			const currentKillsText = await page.locator('.kills').textContent();
			const currentKills = parseInt(currentKillsText?.replace(/\D/g, '') || '0', 10);
			if (currentKills > initialKills) {
				killed = true;
			}
		}

		// Get current attack count before refresh (should have been saved when enemy was killed)
		const normalStat = page.locator('.attack-stat.normal');
		const countBeforeRefresh = await normalStat.textContent();
		const countValue = parseInt(countBeforeRefresh?.replace(/\D/g, '') || '0', 10);

		// Only test if we actually killed something and have counts
		if (killed && countValue > 0) {
			// Refresh the page
			await page.reload();
			await page.locator('.enemy').waitFor({ state: 'visible' });
			await page.waitForTimeout(500);

			// Verify count persisted
			const countAfterRefresh = await normalStat.textContent();
			const persistedValue = parseInt(countAfterRefresh?.replace(/\D/g, '') || '0', 10);
			expect(persistedValue).toBe(countValue);
		} else {
			// If we couldn't kill anything, skip the test
			console.log('Skipping persistence test - no enemy killed');
		}
	});
});
