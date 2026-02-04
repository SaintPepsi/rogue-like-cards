import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CardSelectionModal from './CardSelectionModal.svelte';
import { createMockUpgrade, noopArg } from '$lib/test-utils/mock-factories';

const mockCards = [
	createMockUpgrade({ id: 'c1', title: 'Card A' }),
	createMockUpgrade({ id: 'c2', title: 'Card B' }),
	createMockUpgrade({ id: 'c3', title: 'Card C' })
];

describe('CardSelectionModal', () => {
	test('renders cards with default card backs', async () => {
		vi.useFakeTimers();
		try {
			const screen = render(CardSelectionModal, {
				props: { cards: mockCards, onSelect: noopArg }
			});
			// Card backs use '?' symbol for default theme
			const cardBacks = screen.container.querySelectorAll('.card-back-inner');
			expect(cardBacks.length).toBeGreaterThan(0);
			expect(cardBacks[0].textContent?.trim()).toBe('?');
		} finally {
			vi.useRealTimers();
		}
	});

	test('renders cards with legendary card backs when theme=legendary', async () => {
		vi.useFakeTimers();
		try {
			const screen = render(CardSelectionModal, {
				props: { cards: mockCards, onSelect: noopArg, theme: 'legendary' }
			});
			const cardBacks = screen.container.querySelectorAll('.card-back-inner');
			expect(cardBacks[0].textContent?.trim()).toBe('★');
		} finally {
			vi.useRealTimers();
		}
	});

	test('uses custom getCardTitle function', async () => {
		vi.useFakeTimers();
		try {
			const screen = render(CardSelectionModal, {
				props: {
					cards: mockCards,
					onSelect: noopArg,
					getCardTitle: (card) => `Custom: ${card.title}`
				}
			});
			// Use .first() since card appears in both desktop and mobile views
			await expect.element(screen.getByText('Custom: Card A').first()).toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});

	test('respects isCardDisabled function', async () => {
		vi.useFakeTimers();
		try {
			const screen = render(CardSelectionModal, {
				props: {
					cards: mockCards,
					onSelect: noopArg,
					isCardDisabled: (card, index) => index === 1
				}
			});
			const buttons = screen.container.querySelectorAll('.card-wrapper');
			expect(buttons[1]).toHaveAttribute('disabled');
		} finally {
			vi.useRealTimers();
		}
	});

	test('invokes onSelect callback with card and index', async () => {
		vi.useFakeTimers();
		const onSelect = vi.fn();

		try {
			const screen = render(CardSelectionModal, {
				props: { cards: mockCards, onSelect }
			});

			// Wait for flip to enable cards
			await vi.advanceTimersByTimeAsync(1000);

			const buttons = screen.container.querySelectorAll('.card-wrapper');
			await (buttons[0] as HTMLElement).click();

			// Wait for selection animation
			await vi.advanceTimersByTimeAsync(500);

			expect(onSelect).toHaveBeenCalledWith(mockCards[0], 0);
		} finally {
			vi.useRealTimers();
		}
	});

	test('applies custom overlay class', async () => {
		vi.useFakeTimers();
		try {
			const screen = render(CardSelectionModal, {
				props: { cards: mockCards, onSelect: noopArg, class: 'exiting' }
			});
			const overlay = screen.container.querySelector('.modal-overlay');
			expect(overlay).toHaveClass('exiting');
		} finally {
			vi.useRealTimers();
		}
	});

	test('applies custom modal class', async () => {
		vi.useFakeTimers();
		try {
			const screen = render(CardSelectionModal, {
				props: { cards: mockCards, onSelect: noopArg, modalClass: 'custom-modal' }
			});
			const modal = screen.container.querySelector('.modal');
			expect(modal).toHaveClass('custom-modal');
		} finally {
			vi.useRealTimers();
		}
	});
});
