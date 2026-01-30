<script lang="ts">
	import { Tooltip } from 'bits-ui';

	type Props = {
		count: number;
		onclick: () => void;
	};

	let { count, onclick }: Props = $props();
</script>

<Tooltip.Provider delayDuration={0} disableHoverableContent>
	<Tooltip.Root open={count > 0} disableCloseOnTriggerClick>
		<Tooltip.Trigger
			class="ml-auto flex items-center gap-1 px-3 py-1.5 bg-linear-to-br from-[#8b5cf6] to-[#a78bfa] border-2 border-[#a78bfa] rounded-[20px] text-white font-bold text-[0.9rem] cursor-pointer animate-[pulse-badge_1s_ease-in-out_infinite] transition-[transform,box-shadow,opacity] duration-150 shadow-[0_0_12px_rgba(139,92,246,0.5)] hover:not-disabled:scale-[1.08] hover:not-disabled:shadow-[0_0_20px_rgba(139,92,246,0.7)] active:not-disabled:scale-95 disabled:opacity-30 disabled:cursor-default disabled:animate-none disabled:shadow-none"
			onclick={count > 0 ? onclick : undefined}
			disabled={count === 0}
		>
			<span class="badge-icon">⬆</span>
			<span class="badge-text">{count}</span>
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content
				class="tooltip-content"
				side="bottom"
				sideOffset={8}
				onInteractOutside={(e) => e.preventDefault()}
				onEscapeKeydown={(e) => e.preventDefault()}
			>
				Upgrades available!
				<Tooltip.Arrow class="tooltip-arrow" />
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
</Tooltip.Provider>

<style>
	@keyframes pulse-badge {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.05); }
	}

	.badge-icon {
		font-size: 0.85rem;
	}

	:global(.tooltip-content) {
		background: linear-gradient(135deg, #f59e0b, #d97706);
		color: #1a1a2e;
		font-weight: 700;
		font-size: 0.85rem;
		padding: 6px 12px;
		border-radius: 6px;
		white-space: nowrap;
		animation: tooltip-fade-in 0.15s ease-out;
		box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
		z-index: 50;
	}

	:global(.tooltip-arrow) {
		fill: #f59e0b;
	}

	@keyframes tooltip-fade-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
