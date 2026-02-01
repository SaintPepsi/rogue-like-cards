import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GameOverModal from './GameOverModal.svelte';
import { noop } from '$lib/test-utils/mock-factories';

const baseProps = {
	show: false,
	stage: 7,
	level: 13,
	enemiesKilled: 42,
	goldEarned: 89,
	totalGold: 320,
	onReset: noop,
	onOpenShop: noop
};

describe('GameOverModal', () => {
	test('does not render when show=false', async () => {
		const screen = render(GameOverModal, { props: baseProps });
		expect(screen.container.querySelector('.modal-overlay')).toBeNull();
	});

	test('renders stats when show=true', async () => {
		const screen = render(GameOverModal, {
			props: { ...baseProps, show: true }
		});
		await expect.element(screen.getByText('Game Over')).toBeInTheDocument();
		await expect.element(screen.getByText('7')).toBeInTheDocument();
		await expect.element(screen.getByText('13')).toBeInTheDocument();
		await expect.element(screen.getByText('42')).toBeInTheDocument();
		await expect.element(screen.getByText('89')).toBeInTheDocument();
		await expect.element(screen.getByText('320')).toBeInTheDocument();
	});

	test('calls onReset and onOpenShop on button clicks', async () => {
		const onReset = vi.fn();
		const onOpenShop = vi.fn();
		const screen = render(GameOverModal, {
			props: { ...baseProps, show: true, onReset, onOpenShop }
		});
		await screen.getByText('Play Again').click();
		expect(onReset).toHaveBeenCalled();

		await screen.getByText('Buy Cards').click();
		expect(onOpenShop).toHaveBeenCalled();
	});
});
