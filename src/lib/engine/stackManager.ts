export type RefreshPolicy = 'refresh-shortest' | 'add-new' | 'unlimited';

export type StackManagerOptions = {
	max: number;
	refreshPolicy: RefreshPolicy;
};

export function createStackManager(opts: StackManagerOptions) {
	function add(stacks: number[], duration: number, count = 1): number[] {
		let result = [...stacks];

		for (let i = 0; i < count; i++) {
			if (result.length < opts.max) {
				result.push(duration);
			} else if (opts.refreshPolicy === 'refresh-shortest') {
				let minIndex = 0;
				for (let j = 1; j < result.length; j++) {
					if (result[j] < result[minIndex]) minIndex = j;
				}
				result[minIndex] = duration;
			} else if (opts.refreshPolicy === 'add-new') {
				result.shift(); // Drop oldest (first)
				result.push(duration);
			}
			// unlimited: max is Infinity, so first branch always applies
		}

		return result;
	}

	function tick(stacks: number[]): number[] {
		return stacks
			.map((remaining) => remaining - 1)
			.filter((remaining) => remaining > 0);
	}

	function clear(): number[] {
		return [];
	}

	return { add, tick, clear };
}
