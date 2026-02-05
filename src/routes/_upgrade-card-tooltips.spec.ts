import { test, expect } from '@playwright/test';
import { VERSION } from '$lib/version';
import { seedRandom } from './_test-helpers';

test('upgrade card tooltips appear on hover', async ({ page }) => {
	const errors: Error[] = [];
	page.on('pageerror', (err) => {
		errors.push(err);
		console.error('PAGE ERROR:', err.message);
	});

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

	// Wait for the game loop to initialize
	await page.waitForTimeout(500);

	// Attack enemy until modal with upgrade cards appears
	for (let i = 0; i < 100; i++) {
		const enemy = page.locator('.enemy');

		// Use pointer down/up sequence to match the game's event handling
		await enemy.dispatchEvent('pointerdown');
		await page.waitForTimeout(30);
		await enemy.dispatchEvent('pointerup');

		// Handle modals (level up, chest loot, shop) if they appear
		const modal = page.locator('.modal-overlay');
		if (await modal.isVisible({ timeout: 100 }).catch(() => false)) {
			// Wait for cards to be visible (they may have flip animations)
			await page.waitForTimeout(1000);

			// Check if this modal has upgrade cards with stats
			const cardWrapper = modal.locator('.desktop-grid .card-wrapper').first();
			if (await cardWrapper.isVisible({ timeout: 100 }).catch(() => false)) {
				// Found a modal with cards - check if they have stats with tooltips
				const upgradeCard = cardWrapper.locator('.UpgradeCard');
				if (await upgradeCard.isVisible({ timeout: 500 }).catch(() => false)) {
					const statsContainer = upgradeCard.locator('.stats');
					if (await statsContainer.isVisible({ timeout: 100 }).catch(() => false)) {
						// Found stats! Now test tooltips
						console.log('Found modal with upgrade cards and stats after', i + 1, 'attacks');

						// Log full card HTML for debugging
						const cardHTML = await upgradeCard.innerHTML();
						console.log('=== UPGRADE CARD HTML ===');
						console.log(cardHTML);
						console.log('=== END CARD HTML ===');

						// Check if stat lines have tooltip triggers
						const statWithTooltip = statsContainer.locator('.stat-tooltip-trigger').first();
						const hasTooltipTrigger = await statWithTooltip
							.isVisible({ timeout: 500 })
							.catch(() => false);

						if (hasTooltipTrigger) {
							console.log('Found stat with tooltip trigger, hovering...');

							// Hover over the stat line
							await statWithTooltip.hover({ force: true });

							// Wait for tooltip to appear
							await page.waitForTimeout(500);

							// Check if tooltip content is visible anywhere on the page
							const tooltipContent = page.locator('.card-stat-tooltip');
							const tooltipVisible = await tooltipContent
								.isVisible({ timeout: 1000 })
								.catch(() => false);

							console.log('Tooltip visible:', tooltipVisible);

							if (!tooltipVisible) {
								// Debug: Log all elements to find tooltips
								const allTooltips = await page
									.locator('[class*="tooltip"]')
									.evaluateAll((els) => els.map((el) => el.outerHTML));
								console.log('All tooltip-like elements:', allTooltips);

								// Check page HTML
								const bodyHTML = await page.locator('body').innerHTML();
								const hasTooltipInBody = bodyHTML.includes('card-stat-tooltip');
								console.log('Has tooltip class in body:', hasTooltipInBody);
							}

							expect(tooltipVisible, 'Tooltip should be visible when hovering over stat').toBe(
								true
							);

							// Verify tooltip has content
							const tooltipText = await tooltipContent.textContent();
							console.log('Tooltip text:', tooltipText);
							expect(tooltipText, 'Tooltip should contain description text').toBeTruthy();
							expect(tooltipText!.length, 'Tooltip text should not be empty').toBeGreaterThan(0);

							// Test completed successfully
							break;
						} else {
							console.log('No tooltip triggers found in stats');
							const statsHTML = await statsContainer.innerHTML();
							console.log('Stats HTML:', statsHTML.substring(0, 1000));

							// This might be a card without stat descriptions, click to dismiss and continue
							await cardWrapper.click();
							await modal.waitFor({ state: 'hidden', timeout: 3000 });
						}
					}
				}
			}

			// If we get here, modal doesn't have what we need - try to close it
			const cardButton = modal.locator('.desktop-grid .card-wrapper button').first();
			if (await cardButton.isVisible({ timeout: 500 }).catch(() => false)) {
				await cardButton.click();
				await modal.waitFor({ state: 'hidden', timeout: 3000 });
			}
		}

		// Let the game loop process (rAF needs time)
		await page.waitForTimeout(50);
	}

	// Assert no uncaught errors occurred
	expect(errors, `Uncaught page errors:\n${errors.map((e) => e.message).join('\n')}`).toHaveLength(
		0
	);
});
