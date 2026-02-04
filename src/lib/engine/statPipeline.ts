// --- Step functions (monad units) ---

export type StatStep = (value: number) => number;

export const add =
	(n: number): StatStep =>
	(v) =>
		v + n;
export const multiply =
	(n: number): StatStep =>
	(v) =>
		v * n;
export const clampMin =
	(min: number): StatStep =>
	(v) =>
		Math.max(min, v);
export const clampMax =
	(max: number): StatStep =>
	(v) =>
		Math.min(max, v);
export const conditionalAdd = (n: number, condition: boolean): StatStep =>
	condition ? (v) => v + n : (v) => v;

// --- Pipeline layer with memoisation ---

export type PipelineLayer = {
	steps: StatStep[];
};

// Memoisation cache lives outside reactive proxies so writes during
// $derived / template reads don't trigger state_unsafe_mutation.
// PERFORMANCE: Memoises layer computations to avoid recomputing all stat modifiers
// on every read. Without this, each stat access would re-evaluate the full modifier
// pipeline (~20-50 modifiers per tick). WeakMap allows GC of orphaned layers.
type LayerCache = { cachedResult: number; cachedInput: number; dirty: boolean };
const layerCaches = new WeakMap<PipelineLayer, LayerCache>();

function getCache(layer: PipelineLayer): LayerCache {
	let cache = layerCaches.get(layer);
	if (!cache) {
		cache = { cachedResult: 0, cachedInput: NaN, dirty: true };
		layerCaches.set(layer, cache);
	}
	return cache;
}

export function createLayer(steps: StatStep[]): PipelineLayer {
	return { steps };
}

export function dirtyLayer(layers: PipelineLayer[], fromIndex: number): void {
	for (let i = fromIndex; i < layers.length; i++) {
		getCache(layers[i]).dirty = true;
	}
}

// --- Layered computation with per-layer memoisation ---

export function computeLayered(base: number, layers: PipelineLayer[]): number {
	let value = base;

	for (let i = 0; i < layers.length; i++) {
		const layer = layers[i];
		const cache = getCache(layer);
		if (!cache.dirty && cache.cachedInput === value) {
			value = cache.cachedResult;
			continue;
		}

		cache.cachedInput = value;
		for (let j = 0; j < layer.steps.length; j++) {
			value = layer.steps[j](value);
		}
		cache.cachedResult = value;
		cache.dirty = false;
	}

	return value;
}
