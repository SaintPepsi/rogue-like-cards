<script lang="ts">
	import type { HitType } from '$lib/types';
	import { sfx } from '$lib/audio';
	import type { SfxEventName } from '$lib/audio/sfx.svelte';
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

	// Map UI hit types back to SFX event names
	const HIT_TYPE_TO_SFX: Record<string, SfxEventName> = {
		normal: 'hit:normal',
		crit: 'hit:crit',
		execute: 'hit:execute',
		poison: 'hit:poison',
		poisonCrit: 'hit:poisonCrit',
		hit: 'hit:normal',
		criticalHit: 'hit:crit',
		executeHit: 'hit:execute'
	};

	// DECISION: Hit audio staggered by 50ms per index, matching the CSS animation-delay
	// (index * 0.05s). Played on mount so audio is tied to the hit actually rendering.
	const HIT_AUDIO_STAGGER_MS = 50;

	function playHitSound(hitType: HitType, hitIndex: number) {
		const eventName = HIT_TYPE_TO_SFX[hitType];
		if (!eventName) return;
		if (hitIndex === 0) {
			sfx.play(eventName);
		} else {
			setTimeout(() => sfx.play(eventName), hitIndex * HIT_AUDIO_STAGGER_MS);
		}
	}

	playHitSound(type, index);
</script>

<Component {damage} {index} />
