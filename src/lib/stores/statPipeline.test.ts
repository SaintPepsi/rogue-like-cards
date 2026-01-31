import { test, expect, describe } from 'vitest';
import {
	computeLayered,
	createLayer,
	dirtyLayer,
	add,
	multiply,
	clampMin,
	type PipelineLayer
} from '$lib/engine/statPipeline';
import { BASE_STATS } from '$lib/engine/stats';
import { allUpgrades } from '$lib/data/upgrades';

// Helper: build a mini pipeline for a single stat with LAYER_COUNT=5
function buildPipeline(): PipelineLayer[] {
	return Array.from({ length: 5 }, () => createLayer([])).map((layer, i) =>
		i === 4 ? createLayer([clampMin(0)]) : layer
	);
}

describe('stat pipeline integration', () => {
	test('base stats match defaults without any modifiers', () => {
		const pipeline = buildPipeline();
		expect(computeLayered(BASE_STATS.damage, pipeline)).toBe(BASE_STATS.damage);
		expect(computeLayered(BASE_STATS.attackSpeed, pipeline)).toBe(BASE_STATS.attackSpeed);
		expect(computeLayered(BASE_STATS.critChance, pipeline)).toBe(BASE_STATS.critChance);
	});

	test('acquiring an upgrade adds to the stat', () => {
		const pipeline = buildPipeline();
		// Simulate acquiring damage1 (damage +1)
		const damage1 = allUpgrades.find((u) => u.id === 'damage1')!;
		const steps = damage1.modifiers
			.filter((m) => m.stat === 'damage')
			.map((m) => add(m.value));
		pipeline[1] = createLayer(steps);
		dirtyLayer(pipeline, 1);

		expect(computeLayered(BASE_STATS.damage, pipeline)).toBe(BASE_STATS.damage + 1);
	});

	test('same upgrade stacks additively', () => {
		const pipeline = buildPipeline();
		// Two damage1 cards
		pipeline[1] = createLayer([add(1), add(1)]);
		dirtyLayer(pipeline, 1);

		expect(computeLayered(BASE_STATS.damage, pipeline)).toBe(BASE_STATS.damage + 2);
	});

	test('transient modifier affects stat (layer 3)', () => {
		const pipeline = buildPipeline();
		// Add transient +5 damage
		pipeline[3] = createLayer([add(5)]);
		dirtyLayer(pipeline, 3);

		expect(computeLayered(BASE_STATS.damage, pipeline)).toBe(BASE_STATS.damage + 5);
	});

	test('clamp prevents negative values', () => {
		const pipeline = buildPipeline();
		// Subtract more than base
		pipeline[1] = createLayer([add(-100)]);
		dirtyLayer(pipeline, 1);

		expect(computeLayered(BASE_STATS.damage, pipeline)).toBe(0);
	});

	test('multi-stat upgrade modifies multiple stats', () => {
		// frenzy2 has both tapFrenzyBonus and attackSpeed
		const frenzy2 = allUpgrades.find((u) => u.id === 'frenzy2')!;
		expect(frenzy2.modifiers.length).toBe(2);

		const atkPipeline = buildPipeline();
		const frenzyPipeline = buildPipeline();

		const atkSteps = frenzy2.modifiers
			.filter((m) => m.stat === 'attackSpeed')
			.map((m) => add(m.value));
		const frenzySteps = frenzy2.modifiers
			.filter((m) => m.stat === 'tapFrenzyBonus')
			.map((m) => add(m.value));

		atkPipeline[1] = createLayer(atkSteps);
		dirtyLayer(atkPipeline, 1);
		frenzyPipeline[1] = createLayer(frenzySteps);
		dirtyLayer(frenzyPipeline, 1);

		expect(computeLayered(BASE_STATS.attackSpeed, atkPipeline)).toBe(
			BASE_STATS.attackSpeed + 0.2
		);
		expect(computeLayered(BASE_STATS.tapFrenzyBonus, frenzyPipeline)).toBe(
			BASE_STATS.tapFrenzyBonus + 0.05
		);
	});

	test('layers compose: base + permanent + transient', () => {
		const pipeline = buildPipeline();
		// Layer 0: base override +2
		pipeline[0] = createLayer([add(2)]);
		// Layer 1: permanent +3
		pipeline[1] = createLayer([add(3)]);
		// Layer 3: transient multiply x2
		pipeline[3] = createLayer([multiply(2)]);
		dirtyLayer(pipeline, 0);

		// (1 + 2 + 3) * 2 = 12
		expect(computeLayered(BASE_STATS.damage, pipeline)).toBe(12);
	});

	test('memoisation returns same value when pipeline unchanged', () => {
		const pipeline = buildPipeline();
		pipeline[1] = createLayer([add(5)]);
		dirtyLayer(pipeline, 1);

		const result1 = computeLayered(BASE_STATS.damage, pipeline);
		const result2 = computeLayered(BASE_STATS.damage, pipeline);
		expect(result1).toBe(result2);
		expect(result1).toBe(BASE_STATS.damage + 5);
	});

	test('all attack speed cards have valid attackSpeed modifier', () => {
		const atkCards = allUpgrades.filter((u) => u.id.startsWith('atkspd'));
		expect(atkCards.length).toBeGreaterThanOrEqual(3);

		for (const card of atkCards) {
			const atkMod = card.modifiers.find((m) => m.stat === 'attackSpeed');
			expect(atkMod).toBeDefined();
			expect(atkMod!.value).toBeGreaterThan(0);
		}
	});

	test('frenzy bonus cards have valid tapFrenzyBonus modifier', () => {
		const frenzyBonusIds = ['frenzy1', 'frenzy2', 'frenzy3'];
		const frenzyCards = allUpgrades.filter((u) => frenzyBonusIds.includes(u.id));
		expect(frenzyCards.length).toBe(3);

		for (const card of frenzyCards) {
			const frenzyMod = card.modifiers.find((m) => m.stat === 'tapFrenzyBonus');
			expect(frenzyMod).toBeDefined();
			expect(frenzyMod!.value).toBeGreaterThan(0);
		}
	});
});
