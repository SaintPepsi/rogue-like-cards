import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BattleArea from './BattleArea.svelte';
import { createMockHit, noop } from '$lib/test-utils/mock-factories';

const baseProps = {
	isBoss: false,
	isChest: false,
	isBossChest: false,
	enemyHealth: 50,
	enemyMaxHealth: 100,
	enemiesKilled: 5,
	gold: 42,
	goldDrops: [],
	hits: [],
	poisonStacks: 0,
	onPointerDown: noop,
	onPointerUp: noop,
	frenzyStacks: 0,
	attackCounts: {}
};

describe('BattleArea', () => {
	test('renders regular enemy with health text', async () => {
		const screen = render(BattleArea, { props: baseProps });
		await expect.element(screen.getByRole('button')).toBeInTheDocument();
		await expect.element(screen.getByText('50/100')).toBeInTheDocument();
	});

	test('renders boss enemy with boss class', async () => {
		const screen = render(BattleArea, {
			props: { ...baseProps, isBoss: true }
		});
		const enemy = screen.getByRole('button');
		await expect.element(enemy).toBeInTheDocument();
		await expect.element(enemy).toHaveClass('boss');
	});

	test('renders chest with chest class', async () => {
		const screen = render(BattleArea, {
			props: { ...baseProps, isChest: true }
		});
		const enemy = screen.getByRole('button');
		await expect.element(enemy).toBeInTheDocument();
		await expect.element(enemy).toHaveClass('chest');
	});

	test('shows poison counter when poisonStacks > 0', async () => {
		const screen = render(BattleArea, {
			props: { ...baseProps, poisonStacks: 3 }
		});
		await expect.element(screen.getByText('3')).toBeInTheDocument();
	});

	test('shows frenzy counter when frenzyStacks > 0', async () => {
		const screen = render(BattleArea, {
			props: { ...baseProps, frenzyStacks: 2 }
		});
		const frenzyCount = screen.container.querySelector('.frenzy-count');
		expect(frenzyCount).not.toBeNull();
		expect(frenzyCount!.textContent).toBe('2');
	});

	test('renders hit numbers from hits array', async () => {
		const hits = [
			createMockHit({ id: 1, damage: 25, type: 'normal', index: 0 }),
			createMockHit({ id: 2, damage: 999, type: 'crit', index: 1 })
		];
		const screen = render(BattleArea, {
			props: { ...baseProps, hits }
		});
		await expect.element(screen.getByText('25')).toBeInTheDocument();
		await expect.element(screen.getByText('999')).toBeInTheDocument();
	});

	test('calls onPointerDown on click', async () => {
		const onPointerDown = vi.fn();
		const screen = render(BattleArea, {
			props: { ...baseProps, onPointerDown }
		});
		await screen.getByRole('button').click();
		expect(onPointerDown).toHaveBeenCalled();
	});
});
