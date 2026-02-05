import { test, expect } from '@playwright/test';
import { VERSION } from '$lib/version';
import { seedRandom } from './_test-helpers';

test.describe('Upgrade Statistics Tracking', () => {
	test.beforeEach(async ({ page }) => {
		// Set up error logging
		page.on('pageerror', (err) => {
			console.error('PAGE ERROR:', err.message);
		});

		// Seed for deterministic behavior
		await seedRandom(page);

		// Navigate and wait for game to load
		await page.goto('/');
		await page.locator('.enemy').waitFor({ state: 'visible' });

		// Clear localStorage and mock changelog to prevent modal
		await page.evaluate((version) => {
			localStorage.clear();
			localStorage.setItem('changelog_last_seen_version', version);
		}, VERSION);
		await page.reload();
		await page.locator('.enemy').waitFor({ state: 'visible' });
		await page.waitForTimeout(500);
	});

	test('shop purchases are tracked and persist across runs', async ({ page }) => {
		// Set up persistent gold for shop purchases
		await page.evaluate(() => {
			const persistentData = {
				gold: 1000,
				purchasedUpgradeCounts: {},
				lifetimePickCounts: {},
				unlockedUpgradeIds: [],
				executeCapBonus: 0,
				rerollCost: 1,
				hasCompletedFirstRun: false
			};
			localStorage.setItem('persistent-save', JSON.stringify(persistentData));
		});
		await page.reload();
		await page.locator('.enemy').waitFor({ state: 'visible' });

		// Open shop
		const shopButton = page.locator('button:has-text("Shop")');
		await shopButton.click();
		await page.waitForTimeout(500);

		// Buy first upgrade
		const firstCard = page.locator('.shop-modal .desktop-grid .card-wrapper button').first();
		await firstCard.click();
		await page.waitForTimeout(500);

		// Close shop
		const closeButton = page.locator('.shop-modal .modal-header button').first();
		await closeButton.click();
		await page.waitForTimeout(300);

		// Open upgrades collection modal
		const collectionButton = page.locator('button[aria-label="View upgrades collection"]');
		await collectionButton.click();
		await page.waitForTimeout(500);

		// Check that at least one card has a shop purchase badge
		const shopBadge = page.locator('.stat-badge.shop').first();
		await expect(shopBadge).toBeVisible();
		const badgeText = await shopBadge.textContent();
		expect(badgeText).toContain('1');

		// Close collection modal
		const closeCollectionButton = page
			.locator('.modal-overlay:visible .modal-header button')
			.first();
		await closeCollectionButton.click();
		await page.waitForTimeout(300);

		// Reset game (give up)
		const giveUpButton = page.locator('button:has-text("Give Up")');
		await giveUpButton.click();
		await page.waitForTimeout(300);

		// Confirm game over modal appears
		const gameOverModal = page.locator('.modal-overlay:visible');
		await expect(gameOverModal).toBeVisible();

		// Click "New Run" to start fresh run
		const newRunButton = page.locator('button:has-text("New Run")');
		await newRunButton.click();
		await page.waitForTimeout(500);

		// Open upgrades collection again
		await collectionButton.click();
		await page.waitForTimeout(500);

		// Verify shop purchase count is still present
		const shopBadgeAfterReset = page.locator('.stat-badge.shop').first();
		await expect(shopBadgeAfterReset).toBeVisible();
		const badgeTextAfterReset = await shopBadgeAfterReset.textContent();
		expect(badgeTextAfterReset).toContain('1');
	});

	test('run picks are tracked during current run', async ({ page }) => {
		// Attack enemies until we get a level up
		let leveledUp = false;
		for (let i = 0; i < 50 && !leveledUp; i++) {
			const enemy = page.locator('.enemy');
			await enemy.dispatchEvent('pointerdown');
			await page.waitForTimeout(30);
			await enemy.dispatchEvent('pointerup');
			await page.waitForTimeout(50);

			// Check for level up modal
			const modal = page.locator('.modal-overlay:visible');
			if (await modal.isVisible({ timeout: 100 }).catch(() => false)) {
				leveledUp = true;
			}
		}

		expect(leveledUp).toBe(true);

		// Select first upgrade
		const modal = page.locator('.modal-overlay:visible');
		const cardButton = modal.locator('.desktop-grid .card-wrapper button').first();
		await cardButton.click();
		await modal.waitFor({ state: 'hidden', timeout: 3000 });

		// Open upgrades collection
		const collectionButton = page.locator('button[aria-label="View upgrades collection"]');
		await collectionButton.click();
		await page.waitForTimeout(500);

		// Check that at least one card has a run pick badge
		const runBadge = page.locator('.stat-badge.run').first();
		await expect(runBadge).toBeVisible();
		const badgeText = await runBadge.textContent();
		expect(badgeText).toContain('1');
	});

	test('lifetime picks are tracked and persist across runs', async ({ page }) => {
		// Attack enemies until we get a level up
		let leveledUp = false;
		for (let i = 0; i < 50 && !leveledUp; i++) {
			const enemy = page.locator('.enemy');
			await enemy.dispatchEvent('pointerdown');
			await page.waitForTimeout(30);
			await enemy.dispatchEvent('pointerup');
			await page.waitForTimeout(50);

			const modal = page.locator('.modal-overlay:visible');
			if (await modal.isVisible({ timeout: 100 }).catch(() => false)) {
				leveledUp = true;
			}
		}

		// Select first upgrade
		const modal = page.locator('.modal-overlay:visible');
		const cardButton = modal.locator('.desktop-grid .card-wrapper button').first();
		await cardButton.click();
		await modal.waitFor({ state: 'hidden', timeout: 3000 });

		// Give up to end the run (this should merge run picks into lifetime picks)
		const giveUpButton = page.locator('button:has-text("Give Up")');
		await giveUpButton.click();
		await page.waitForTimeout(300);

		// Click "New Run"
		const newRunButton = page.locator('button:has-text("New Run")');
		await newRunButton.click();
		await page.waitForTimeout(500);

		// Open upgrades collection
		const collectionButton = page.locator('button[aria-label="View upgrades collection"]');
		await collectionButton.click();
		await page.waitForTimeout(500);

		// Check that at least one card has a lifetime pick badge
		const lifetimeBadge = page.locator('.stat-badge.lifetime').first();
		await expect(lifetimeBadge).toBeVisible();
		const badgeText = await lifetimeBadge.textContent();
		expect(badgeText).toContain('1');

		// Verify the run pick badge is NOT present (since we started a new run)
		const runBadge = page.locator('.stat-badge.run');
		await expect(runBadge).not.toBeVisible();
	});

	test('card flip shows detailed statistics', async ({ page }) => {
		// Set up some statistics
		await page.evaluate(() => {
			const persistentData = {
				gold: 1000,
				purchasedUpgradeCounts: {},
				lifetimePickCounts: {},
				unlockedUpgradeIds: ['double_damage'],
				executeCapBonus: 0,
				rerollCost: 1,
				hasCompletedFirstRun: false
			};
			localStorage.setItem('persistent-save', JSON.stringify(persistentData));
		});
		await page.reload();
		await page.locator('.enemy').waitFor({ state: 'visible' });
		await page.waitForTimeout(500);

		// Open upgrades collection
		const collectionButton = page.locator('button[aria-label="View upgrades collection"]');
		await collectionButton.click();
		await page.waitForTimeout(500);

		// Find an unlocked card (not grayed out)
		const unlockedCard = page.locator('.upgrade-wrapper:not(.locked) .card-flip-wrapper').first();
		await expect(unlockedCard).toBeVisible();

		// Click to flip the card
		await unlockedCard.click();
		await page.waitForTimeout(700); // Wait for flip animation

		// Verify the card back is showing
		const cardBack = page.locator('.card-back .stats-explanation').first();
		await expect(cardBack).toBeVisible();

		// Verify stat labels are present
		await expect(page.locator('text=Shop Purchases')).toBeVisible();
		await expect(page.locator('text=Current Run Picks')).toBeVisible();
		await expect(page.locator('text=Lifetime Picks')).toBeVisible();

		// Click again to flip back
		await unlockedCard.click();
		await page.waitForTimeout(700);

		// Verify we're back to the front
		const cardFront = page.locator('.card-front').first();
		await expect(cardFront).toBeVisible();
	});
});
