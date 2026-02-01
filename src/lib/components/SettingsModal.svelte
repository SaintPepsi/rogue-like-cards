<script lang="ts">
	import { Button } from 'bits-ui';
	type Props = {
		show: boolean;
		onClose: () => void;
		onOpenChangelog: () => void;
		onReset: () => void;
	};

	let { show, onClose, onOpenChangelog, onReset }: Props = $props();

	let showResetConfirm = $state(false);

	function handleReset() {
		if (!showResetConfirm) {
			showResetConfirm = true;
			return;
		}
		onReset();
		showResetConfirm = false;
		onClose();
	}

	function handleClose() {
		showResetConfirm = false;
		onClose();
	}

	function handleChangelog() {
		onClose();
		onOpenChangelog();
	}
</script>

{#if show}
	<div
		class="modal-overlay"
		onclick={handleClose}
		onkeydown={(e) => e.key === 'Escape' && handleClose()}
		role="button"
		tabindex="0"
	>
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
			role="dialog"
			tabindex="-1"
		>
			<div class="modal-header">
				<h2>Settings</h2>
				<Button.Root
					class="bg-transparent border-none text-white/60 text-[2rem] cursor-pointer leading-none p-0 hover:text-white"
					onclick={handleClose}>&times;</Button.Root
				>
			</div>
			<div class="modal-content">
				<Button.Root
					class="flex items-center gap-3 w-full py-3.5 px-4 bg-white/5 border border-white/[0.08] rounded-[10px] text-white/90 cursor-pointer text-[0.95rem] text-left transition-[background] duration-150 hover:bg-white/10"
					onclick={handleChangelog}
				>
					<span class="settings-icon">📋</span>
					<span class="settings-label">Changelog</span>
					<span class="settings-arrow">›</span>
				</Button.Root>

				<div class="settings-divider"></div>

				<Button.Root
					class="flex items-center gap-3 w-full py-3.5 px-4 bg-white/5 border border-[rgba(239,68,68,0.15)] rounded-[10px] text-[#f87171] cursor-pointer text-[0.95rem] text-left transition-[background] duration-150 hover:bg-[rgba(239,68,68,0.1)]"
					onclick={handleReset}
				>
					<span class="settings-icon">🗑️</span>
					<span class="settings-label">
						{#if showResetConfirm}
							Are you sure? All progress will be lost.
						{:else}
							Reset All Progress
						{/if}
					</span>
					{#if showResetConfirm}
						<span class="settings-confirm">Confirm</span>
					{/if}
				</Button.Root>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 20px;
	}

	.modal {
		background: #1a1a2e;
		border-radius: 16px;
		max-width: 400px;
		width: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px 24px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.3rem;
		color: white;
		flex: 1;
	}

	.modal-content {
		padding: 12px;
	}

	.settings-icon {
		font-size: 1.1rem;
		flex-shrink: 0;
	}

	.settings-label {
		flex: 1;
	}

	.settings-arrow {
		color: rgba(255, 255, 255, 0.3);
		font-size: 1.3rem;
		font-weight: bold;
	}

	.settings-divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.06);
		margin: 8px 4px;
	}

	.settings-confirm {
		padding: 4px 12px;
		background: #ef4444;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 600;
		color: white;
		flex-shrink: 0;
	}
</style>
