import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import HitNumber from './HitNumber.svelte';
import type { HitType } from '$lib/types';

const hitTypes: HitType[] = ['normal', 'crit', 'execute', 'poison', 'poisonCrit'];

describe('HitNumber', () => {
	for (const type of hitTypes) {
		test(`renders ${type} hit without crashing`, async () => {
			const screen = render(HitNumber, {
				props: { damage: 42, type, index: 0 }
			});
			await expect.element(screen.getByText('42')).toBeInTheDocument();
		});
	}
});
