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
	startingStats: null,
	endingStats: null,
	wasDefeatNatural: true,
	onReset: noop,
	onOpenShop: noop,
	attackCounts: { normal: 0, crit: 0, execute: 0, poison: 0 }
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

	test('shows "The boss defeated you!" message when wasDefeatNatural is true', async () => {
		const screen = render(GameOverModal, {
			props: { ...baseProps, show: true, wasDefeatNatural: true }
		});
		await expect.element(screen.getByText('The boss defeated you!')).toBeInTheDocument();
	});

	test('shows "You gave up!" message when wasDefeatNatural is false', async () => {
		const screen = render(GameOverModal, {
			props: { ...baseProps, show: true, wasDefeatNatural: false }
		});
		await expect.element(screen.getByText('You gave up!')).toBeInTheDocument();
	});

	test('renders attack breakdown section with title', async () => {
		const screen = render(GameOverModal, {
			props: { ...baseProps, show: true }
		});
		await expect.element(screen.getByText('Attack Breakdown')).toBeInTheDocument();
	});

	test('renders attack breakdown with zero counts', async () => {
		const screen = render(GameOverModal, {
			props: { ...baseProps, show: true }
		});
		const breakdown = screen.container.querySelector('.attack-breakdown');
		expect(breakdown).not.toBeNull();
		await expect.element(screen.getByText('Normal: 0')).toBeInTheDocument();
		await expect.element(screen.getByText('Crit: 0')).toBeInTheDocument();
		await expect.element(screen.getByText('Execute: 0')).toBeInTheDocument();
		await expect.element(screen.getByText('Poison: 0')).toBeInTheDocument();
	});

	test('renders attack breakdown with non-zero counts', async () => {
		const screen = render(GameOverModal, {
			props: {
				...baseProps,
				show: true,
				attackCounts: { normal: 500, crit: 75, execute: 12, poison: 88 }
			}
		});
		await expect.element(screen.getByText('Normal: 500')).toBeInTheDocument();
		await expect.element(screen.getByText('Crit: 75')).toBeInTheDocument();
		await expect.element(screen.getByText('Execute: 12')).toBeInTheDocument();
		await expect.element(screen.getByText('Poison: 88')).toBeInTheDocument();
	});

	test('attack breakdown has correct color classes', async () => {
		const screen = render(GameOverModal, {
			props: {
				...baseProps,
				show: true,
				attackCounts: { normal: 1, crit: 1, execute: 1, poison: 1 }
			}
		});
		const normalStat = screen.container.querySelector('.attack-stat.normal');
		const critStat = screen.container.querySelector('.attack-stat.crit');
		const executeStat = screen.container.querySelector('.attack-stat.execute');
		const poisonStat = screen.container.querySelector('.attack-stat.poison');

		expect(normalStat).not.toBeNull();
		expect(critStat).not.toBeNull();
		expect(executeStat).not.toBeNull();
		expect(poisonStat).not.toBeNull();
	});
});
