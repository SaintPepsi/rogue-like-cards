import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChangelogModal from './ChangelogModal.svelte';
import type { ChangelogEntry } from '$lib/changelog';

const noop = () => {};

const mockEntries: ChangelogEntry[] = [
	{
		version: '0.42.0',
		date: '2026-02-02',
		changes: [
			{
				category: 'new',
				description: 'Test feature A'
			}
		]
	},
	{
		version: '0.38.0',
		date: '2026-02-01',
		changes: [
			{
				category: 'fixed',
				description: 'Test fix B'
			}
		]
	}
];

describe('ChangelogModal', () => {
	test('does not render when show=false', async () => {
		const screen = render(ChangelogModal, {
			props: { show: false, onClose: noop }
		});
		expect(screen.container.querySelector('.modal-overlay')).toBeNull();
	});

	test('renders Changelog heading when show=true', async () => {
		const screen = render(ChangelogModal, {
			props: { show: true, onClose: noop }
		});
		await expect.element(screen.getByRole('heading', { name: 'Changelog' })).toBeInTheDocument();
	});

	test('renders filtered entries when provided', async () => {
		const screen = render(ChangelogModal, {
			props: { show: true, onClose: noop, entries: mockEntries }
		});
		await expect.element(screen.getByText('v0.42.0')).toBeInTheDocument();
		await expect.element(screen.getByText('Test feature A')).toBeInTheDocument();
	});

	test('renders only provided entries, not all CHANGELOG', async () => {
		const screen = render(ChangelogModal, {
			props: { show: true, onClose: noop, entries: mockEntries }
		});
		// Should find the mock entries
		await expect.element(screen.getByText('v0.42.0')).toBeInTheDocument();
		await expect.element(screen.getByText('v0.38.0')).toBeInTheDocument();

		// Should NOT find entries from full CHANGELOG that aren't in mockEntries
		expect(screen.container.querySelector('.version-entry')).not.toBeNull();
		const versionEntries = screen.container.querySelectorAll('.version-entry');
		expect(versionEntries.length).toBe(2);
	});
});
