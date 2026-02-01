import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LevelUpModal from './LevelUpModal.svelte';
import { createMockUpgrade, noopArg } from '$lib/test-utils/mock-factories';

const choices = [
	createMockUpgrade({ id: 'u1', title: 'Upgrade A' }),
	createMockUpgrade({ id: 'u2', title: 'Upgrade B' }),
	createMockUpgrade({ id: 'u3', title: 'Upgrade C' })
];

describe('LevelUpModal', () => {
	test('does not render when show=false', async () => {
		const screen = render(LevelUpModal, {
			props: { show: false, choices, pendingCount: 1, onSelect: noopArg }
		});
		expect(screen.container.querySelector('.modal-overlay')).toBeNull();
	});

	test('renders Level Up heading when show=true', async () => {
		vi.useFakeTimers();
		try {
			const screen = render(LevelUpModal, {
				props: { show: true, choices, pendingCount: 1, onSelect: noopArg }
			});
			await expect.element(screen.getByText('Level Up!')).toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});

	test('shows pending badge when pendingCount > 1', async () => {
		vi.useFakeTimers();
		try {
			const screen = render(LevelUpModal, {
				props: { show: true, choices, pendingCount: 3, onSelect: noopArg }
			});
			await expect.element(screen.getByText('+2 more')).toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});

	test('does not crash with exiting=true', async () => {
		vi.useFakeTimers();
		try {
			const screen = render(LevelUpModal, {
				props: { show: true, choices, pendingCount: 1, onSelect: noopArg, exiting: true }
			});
			await expect.element(screen.getByText('Level Up!')).toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});
});
