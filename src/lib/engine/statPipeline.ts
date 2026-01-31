// --- Step functions (monad units) ---

export type StatStep = (value: number) => number;

export const add = (n: number): StatStep => (v) => v + n;
export const multiply = (n: number): StatStep => (v) => v * n;
export const clampMin = (min: number): StatStep => (v) => Math.max(min, v);
export const conditionalAdd = (n: number, condition: boolean): StatStep =>
	condition ? (v) => v + n : (v) => v;

// --- Pipeline layer with memoisation ---

export type PipelineLayer = {
	steps: StatStep[];
	cachedResult: number;
	cachedInput: number;
	dirty: boolean;
};

export function createLayer(steps: StatStep[]): PipelineLayer {
	return { steps, cachedResult: 0, cachedInput: NaN, dirty: true };
}

export function dirtyLayer(layers: PipelineLayer[], fromIndex: number): void {
	for (let i = fromIndex; i < layers.length; i++) {
		layers[i].dirty = true;
	}
}

// --- Layered computation with per-layer memoisation ---

export function computeLayered(base: number, layers: PipelineLayer[]): number {
	let value = base;

	for (let i = 0; i < layers.length; i++) {
		const layer = layers[i];
		if (!layer.dirty && layer.cachedInput === value) {
			value = layer.cachedResult;
			continue;
		}

		layer.cachedInput = value;
		for (let j = 0; j < layer.steps.length; j++) {
			value = layer.steps[j](value);
		}
		layer.cachedResult = value;
		layer.dirty = false;
	}

	return value;
}
