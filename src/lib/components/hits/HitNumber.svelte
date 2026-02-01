<script lang="ts">
	import type { HitType } from '$lib/types';
	import NormalHit from './NormalHit.svelte';
	import CritHit from './CritHit.svelte';
	import ExecuteHit from './ExecuteHit.svelte';
	import PoisonHit from './PoisonHit.svelte';
	import PoisonCritHit from './PoisonCritHit.svelte';

	type Props = {
		damage: number;
		type: HitType;
		index: number;
	};

	let { damage, type, index }: Props = $props();

	const components: Record<HitType, typeof NormalHit> = {
		normal: NormalHit,
		crit: CritHit,
		execute: ExecuteHit,
		poison: PoisonHit,
		poisonCrit: PoisonCritHit,
		// Pipeline type aliases (mapped to UI types in gameState, but needed for type completeness)
		hit: NormalHit,
		criticalHit: CritHit,
		executeHit: ExecuteHit
	};

	const Component = $derived(components[type]);
</script>

<Component {damage} {index} />
