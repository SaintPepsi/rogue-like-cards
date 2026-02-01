import { test, expect } from '@playwright/test';

test('attack enemy 100 times without crashing', async ({ page }) => {
	const errors: Error[] = [];
	page.on('pageerror', (err) => {
		errors.push(err);
		console.error('PAGE ERROR:', err.message);
	});

	// Navigate and wait for game to load
	await page.goto('/');
	await page.locator('.enemy').waitFor({ state: 'visible' });

	// Clear localStorage for a fresh game state, then reload
	await page.evaluate(() => localStorage.clear());
	await page.reload();
	await page.locator('.enemy').waitFor({ state: 'visible' });

	// Wait a moment for the game loop to initialize (onMount + rAF)
	await page.waitForTimeout(500);

	// Read initial kills count
	const killsText = await page.locator('.kills').textContent();
	const initialKills = parseInt(killsText?.replace(/\D/g, '') || '0', 10);

	// Attack 100 times
	for (let i = 0; i < 100; i++) {
		const enemy = page.locator('.enemy');

		// Use pointer down/up sequence to match the game's event handling
		await enemy.dispatchEvent('pointerdown');
		await page.waitForTimeout(30);
		await enemy.dispatchEvent('pointerup');

		// Handle modals (level up, chest loot, shop) if they appear
		const modal = page.locator('.modal-overlay');
		if (await modal.isVisible({ timeout: 100 }).catch(() => false)) {
			const cardButton = modal.locator('.desktop-grid .card-wrapper button').first();
			if (await cardButton.isVisible({ timeout: 500 }).catch(() => false)) {
				await cardButton.click();
				await modal.waitFor({ state: 'hidden', timeout: 3000 });
			}
		}

		// Let the game loop process (rAF needs time)
		await page.waitForTimeout(50);
	}

	// Assert enemies were killed
	const finalKillsText = await page.locator('.kills').textContent();
	const finalKills = parseInt(finalKillsText?.replace(/\D/g, '') || '0', 10);
	expect(finalKills).toBeGreaterThan(initialKills);

	// Assert no uncaught errors occurred
	expect(errors, `Uncaught page errors:\n${errors.map((e) => e.message).join('\n')}`).toHaveLength(
		0
	);
});
