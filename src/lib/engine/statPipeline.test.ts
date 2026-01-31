import { describe, test, expect } from 'vitest';
import {
	add, multiply, clampMin, conditionalAdd,
	computeLayered, createLayer, dirtyLayer,
	type PipelineLayer
} from '$lib/engine/statPipeline';

describe('step functions', () => {
	test('add creates additive step', () => {
		expect(add(3)(10)).toBe(13);
	});

	test('multiply creates multiplicative step', () => {
		expect(multiply(1.5)(10)).toBe(15);
	});

	test('clampMin enforces floor', () => {
		expect(clampMin(0)(-5)).toBe(0);
		expect(clampMin(0)(5)).toBe(5);
	});

	test('conditionalAdd applies when true', () => {
		expect(conditionalAdd(5, true)(10)).toBe(15);
	});

	test('conditionalAdd skips when false', () => {
		expect(conditionalAdd(5, false)(10)).toBe(10);
	});
});

describe('computeLayered', () => {
	test('computes through all layers', () => {
		const layers: PipelineLayer[] = [
			createLayer([add(5)]),       // 1 + 5 = 6
			createLayer([multiply(2)]),  // 6 * 2 = 12
			createLayer([clampMin(0)])   // 12 (no change)
		];
		expect(computeLayered(1, layers)).toBe(12);
	});

	test('returns cached result when not dirty and input unchanged', () => {
		const layers: PipelineLayer[] = [
			createLayer([add(5)]),
			createLayer([multiply(2)])
		];

		// First computation
		computeLayered(1, layers);

		// All layers should now be clean
		expect(layers[0].dirty).toBe(false);
		expect(layers[1].dirty).toBe(false);

		// Second computation — hits cache
		expect(computeLayered(1, layers)).toBe(12);
	});

	test('recomputes only dirty layers', () => {
		const layers: PipelineLayer[] = [
			createLayer([add(5)]),       // Layer 0: permanent
			createLayer([add(0)]),       // Layer 1: transient (will be modified)
		];

		// First computation: 1 + 5 + 0 = 6
		expect(computeLayered(1, layers)).toBe(6);

		// Change transient layer (e.g., frenzy stack added)
		layers[1] = createLayer([add(3)]);

		// Recompute: Layer 0 cached (6), Layer 1 dirty: 6 + 3 = 9
		expect(computeLayered(1, layers)).toBe(9);

		// Layer 0 still has its cache intact
		expect(layers[0].dirty).toBe(false);
	});

	test('dirtying an earlier layer forces recomputation of later layers', () => {
		const layers: PipelineLayer[] = [
			createLayer([add(5)]),
			createLayer([multiply(2)])
		];

		// First: (1 + 5) * 2 = 12
		expect(computeLayered(1, layers)).toBe(12);

		// Dirty Layer 0 (e.g., new upgrade acquired)
		dirtyLayer(layers, 0);
		layers[0] = createLayer([add(10)]);

		// Both recompute: (1 + 10) * 2 = 22
		expect(computeLayered(1, layers)).toBe(22);
	});

	test('handles empty layers', () => {
		expect(computeLayered(5, [])).toBe(5);
	});

	test('handles multiple steps in one layer', () => {
		const layers: PipelineLayer[] = [
			createLayer([add(2), add(3), multiply(2)])  // (5 + 2 + 3) * 2 = 20
		];
		expect(computeLayered(5, layers)).toBe(20);
	});
});
