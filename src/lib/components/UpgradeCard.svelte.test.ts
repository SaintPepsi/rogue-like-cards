import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import UpgradeCard from './UpgradeCard.svelte';

describe('UpgradeCard', () => {
	test('renders title as heading', async () => {
		const screen = render(UpgradeCard, {
			props: { title: 'Power Strike' }
		});
		await expect.element(screen.getByText('Power Strike')).toBeInTheDocument();
	});

	test('renders stat modifier list items', async () => {
		const screen = render(UpgradeCard, {
			props: {
				title: 'Damage Up',
				modifiers: [
					{ stat: 'damage', value: 5 },
					{ stat: 'critChance', value: 0.1 }
				]
			}
		});
		// Should render list items for the modifiers
		const items = screen.getByRole('listitem');
		await expect.element(items.first()).toBeInTheDocument();
	});

	test('renders with different rarities without crashing', async () => {
		const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
		for (const rarity of rarities) {
			const screen = render(UpgradeCard, {
				props: { title: `${rarity} card`, rarity }
			});
			await expect.element(screen.getByText(`${rarity} card`)).toBeInTheDocument();
			screen.unmount();
		}
	});
});
