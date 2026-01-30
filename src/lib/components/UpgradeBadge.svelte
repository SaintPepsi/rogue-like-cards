<script lang="ts">
	import { Button } from 'bits-ui';

	type Props = {
		count: number;
		onclick: () => void;
	};

	let { count, onclick }: Props = $props();
</script>

<Button.Root
	class="flex items-center gap-1 px-3 py-1.5 bg-linear-to-br from-[#8b5cf6] to-[#a78bfa] border-2 border-[#a78bfa] rounded-[20px] text-white font-bold text-[0.9rem] cursor-pointer animate-[pulse-badge_1s_ease-in-out_infinite] transition-[transform,box-shadow,opacity] duration-150 shadow-[0_0_12px_rgba(139,92,246,0.5)] hover:not-disabled:scale-[1.08] hover:not-disabled:shadow-[0_0_20px_rgba(139,92,246,0.7)] active:not-disabled:scale-95 disabled:opacity-30 disabled:cursor-default disabled:animate-none disabled:shadow-none"
	onclick={count > 0 ? onclick : undefined}
	disabled={count === 0}
>
	<span class="badge-icon">⬆</span>
	<span class="badge-text">{count}</span>
</Button.Root>

<style>
	.badge-icon {
		font-size: 0.85rem;
	}

	@keyframes pulse-badge {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.05); }
	}
</style>
