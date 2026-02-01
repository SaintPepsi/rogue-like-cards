import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChestLootModal from './ChestLootModal.svelte';
import { createMockUpgrade, noopArg } from '$lib/test-utils/mock-factories';

const choices = [
	createMockUpgrade({ id: 'c1', title: 'Chest Reward A' }),
	createMockUpgrade({ id: 'c2', title: 'Chest Reward B' }),
	createMockUpgrade({ id: 'c3', title: 'Chest Reward C' })
];

describe('ChestLootModal', () => {
	test('does not render when show=false', async () => {
		const screen = render(ChestLootModal, {
			props: { show: false, gold: 100, choices, onSelect: noopArg }
		});
		expect(screen.container.querySelector('.modal-overlay')).toBeNull();
	});

	test('renders Treasure Found heading and gold amount', async () => {
		vi.useFakeTimers();
		try {
			const screen = render(ChestLootModal, {
				props: { show: true, gold: 250, choices, onSelect: noopArg }
			});
			await expect.element(screen.getByText('Treasure Found!')).toBeInTheDocument();
			await expect.element(screen.getByText('+250 Gold')).toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});

	test('does not crash with exiting=true', async () => {
		vi.useFakeTimers();
		try {
			const screen = render(ChestLootModal, {
				props: { show: true, gold: 100, choices, onSelect: noopArg, exiting: true }
			});
			await expect.element(screen.getByText('Treasure Found!')).toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});
});
