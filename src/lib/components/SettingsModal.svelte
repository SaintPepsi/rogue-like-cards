<script lang="ts">
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
	<div class="modal-overlay" onclick={handleClose} onkeydown={(e) => e.key === 'Escape' && handleClose()} role="button" tabindex="0">
		<div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} role="dialog">
			<div class="modal-header">
				<h2>Settings</h2>
				<button class="close-btn" onclick={handleClose}>&times;</button>
			</div>
			<div class="modal-content">
				<button class="settings-item" onclick={handleChangelog}>
					<span class="settings-icon">📋</span>
					<span class="settings-label">Changelog</span>
					<span class="settings-arrow">›</span>
				</button>

				<div class="settings-divider"></div>

				<button class="settings-item danger" onclick={handleReset}>
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
				</button>
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

	.close-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		font-size: 2rem;
		cursor: pointer;
		line-height: 1;
		padding: 0;
	}

	.close-btn:hover {
		color: white;
	}

	.modal-content {
		padding: 12px;
	}

	.settings-item {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 14px 16px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 10px;
		color: rgba(255, 255, 255, 0.9);
		cursor: pointer;
		font-size: 0.95rem;
		text-align: left;
		transition: background 0.15s;
	}

	.settings-item:hover {
		background: rgba(255, 255, 255, 0.1);
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

	.settings-item.danger {
		color: #f87171;
		border-color: rgba(239, 68, 68, 0.15);
	}

	.settings-item.danger:hover {
		background: rgba(239, 68, 68, 0.1);
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
