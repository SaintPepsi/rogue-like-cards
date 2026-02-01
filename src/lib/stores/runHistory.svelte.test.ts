import { describe, it, expect, beforeEach } from 'vitest';
import { createRunHistory } from './runHistory.svelte';
import { createDefaultStats } from '$lib/engine/stats';

describe('runHistory', () => {
	let history: ReturnType<typeof createRunHistory>;

	beforeEach(() => {
		history = createRunHistory();
	});

	it('starts with empty snapshots', () => {
		expect(history.snapshots).toEqual([]);
	});

	it('adds a stage_transition snapshot with derived fields', () => {
		const stats = createDefaultStats();
		history.addSnapshot({
			event: 'stage_transition',
			stats,
			stage: 1,
			level: 1,
			upgradesPicked: []
		});
		expect(history.snapshots).toHaveLength(1);
		const snap = history.snapshots[0];
		expect(snap.event).toBe('stage_transition');
		expect(snap.stage).toBe(1);
		expect(snap.level).toBe(1);
		expect(snap.computedDps).toBeCloseTo(0.8); // default DPS
		expect(snap.poisonDps).toBe(0);
		expect(snap.enemyHp).toBeGreaterThan(0);
		expect(snap.bossHp).toBeGreaterThan(0);
		expect(snap.xpToNextLevel).toBeGreaterThan(0);
		expect(snap.timeToKill).toBeGreaterThan(0);
	});

	it('adds a level_up snapshot', () => {
		const stats = { ...createDefaultStats(), damage: 5 };
		history.addSnapshot({
			event: 'level_up',
			stats,
			stage: 2,
			level: 3,
			upgradesPicked: ['damage_1']
		});
		expect(history.snapshots).toHaveLength(1);
		expect(history.snapshots[0].event).toBe('level_up');
		expect(history.snapshots[0].upgradesPicked).toEqual(['damage_1']);
	});

	it('resets snapshots', () => {
		const stats = createDefaultStats();
		history.addSnapshot({
			event: 'stage_transition',
			stats,
			stage: 1,
			level: 1,
			upgradesPicked: []
		});
		expect(history.snapshots).toHaveLength(1);
		history.reset();
		expect(history.snapshots).toEqual([]);
	});

	it('records timestamp relative to run start', () => {
		const stats = createDefaultStats();
		history.addSnapshot({
			event: 'stage_transition',
			stats,
			stage: 1,
			level: 1,
			upgradesPicked: []
		});
		expect(history.snapshots[0].timestamp).toBeGreaterThanOrEqual(0);
	});
});
