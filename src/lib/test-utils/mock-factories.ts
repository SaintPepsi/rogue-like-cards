import { createDefaultStats } from '$lib/engine/stats';
import type { PlayerStats, Upgrade, HitInfo, GoldDrop } from '$lib/types';

export function createMockStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
	return { ...createDefaultStats(), ...overrides };
}

export function createMockUpgrade(overrides: Partial<Upgrade> = {}): Upgrade {
	return {
		id: 'test-upgrade-1',
		title: 'Test Upgrade',
		rarity: 'common',
		image: 'https://picsum.photos/400/300',
		modifiers: [],
		...overrides
	};
}

export function createMockHit(overrides: Partial<HitInfo> = {}): HitInfo {
	return {
		damage: 10,
		type: 'normal',
		id: 1,
		index: 0,
		...overrides
	};
}

export function createMockGoldDrop(overrides: Partial<GoldDrop> = {}): GoldDrop {
	return {
		id: 1,
		amount: 5,
		...overrides
	};
}

export const noop = () => {};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const noopArg = (_: unknown) => {};
