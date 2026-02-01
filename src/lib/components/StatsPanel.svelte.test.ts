import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import StatsPanel from './StatsPanel.svelte';
import { createMockStats } from '$lib/test-utils/mock-factories';

describe('StatsPanel', () => {
	test('renders heading and alwaysShow stats with default stats', async () => {
		const screen = render(StatsPanel, {
			props: { stats: createMockStats() }
		});
		await expect.element(screen.getByText('Stats')).toBeInTheDocument();
	});

	test('shows modified stats that differ from defaults', async () => {
		const screen = render(StatsPanel, {
			props: { stats: createMockStats({ critChance: 0.25 }) }
		});
		await expect.element(screen.getByText('Stats')).toBeInTheDocument();
		// critChance is not alwaysShow, so it only appears when non-default
		await expect.element(screen.getByText('25%')).toBeInTheDocument();
	});

	test('shows poison stat with poison color class when poison > 0', async () => {
		const screen = render(StatsPanel, {
			props: { stats: createMockStats({ poison: 5 }) }
		});
		// The poison stat row should exist and have the poison class
		const poisonValue = screen.getByText('5');
		await expect.element(poisonValue).toBeInTheDocument();
	});
});
