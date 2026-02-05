<script lang="ts">
	import { Button } from 'bits-ui';
	import { audioManager } from '$lib/audio';
	import { codes } from '$lib/stores/codes.svelte';

	type Props = {
		show: boolean;
		onClose: () => void;
		onOpenChangelog: () => void;
		onReset: () => void;
	};

	let { show, onClose, onOpenChangelog, onReset }: Props = $props();

	let showResetConfirm = $state(false);
	let codeInput = $state('');
	let codeMessage = $state('');
	let codeSuccess = $state(false);

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
		codeInput = '';
		codeMessage = '';
		onClose();
	}

	function handleChangelog() {
		onClose();
		onOpenChangelog();
	}

	function handleCodeSubmit() {
		if (!codeInput.trim()) return;
		const accepted = codes.submitCode(codeInput);
		if (accepted) {
			codeMessage = 'Code activated!';
			codeSuccess = true;
			codeInput = '';
		} else {
			codeMessage = 'Invalid code.';
			codeSuccess = false;
		}
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
				<div class="audio-section">
					<div class="audio-header">
						<span class="audio-title">Audio</span>
						<Button.Root
							class="mute-btn {audioManager.muted ? 'muted' : ''}"
							onclick={() => audioManager.toggleMute()}
						>
							{audioManager.muted ? '🔇' : '🔊'}
						</Button.Root>
					</div>

					<label class="volume-slider">
						<span class="slider-label">SFX</span>
						<input
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={audioManager.sfxVolume}
							oninput={(e) => audioManager.setSfxVolume(Number(e.currentTarget.value))}
							disabled={audioManager.muted}
						/>
						<span class="slider-value">{Math.round(audioManager.sfxVolume * 100)}%</span>
					</label>

					<label class="volume-slider">
						<span class="slider-label">Music</span>
						<input
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={audioManager.musicVolume}
							oninput={(e) => audioManager.setMusicVolume(Number(e.currentTarget.value))}
							disabled={audioManager.muted}
						/>
						<span class="slider-value">{Math.round(audioManager.musicVolume * 100)}%</span>
					</label>

					<label class="volume-slider">
						<span class="slider-label">UI</span>
						<input
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={audioManager.uiVolume}
							oninput={(e) => audioManager.setUiVolume(Number(e.currentTarget.value))}
							disabled={audioManager.muted}
						/>
						<span class="slider-value">{Math.round(audioManager.uiVolume * 100)}%</span>
					</label>
				</div>

				<div class="settings-divider"></div>

				<Button.Root
					class="flex items-center gap-3 w-full py-3.5 px-4 bg-white/5 border border-white/[0.08] rounded-[10px] text-white/90 cursor-pointer text-[0.95rem] text-left transition-[background] duration-150 hover:bg-white/10"
					onclick={handleChangelog}
				>
					<span class="settings-icon">📋</span>
					<span class="settings-label">Changelog</span>
					<span class="settings-arrow">›</span>
				</Button.Root>

				<div class="settings-divider"></div>

				<div class="codes-section">
					<span class="codes-title">Codes</span>
					<div class="codes-input-row">
						<input
							class="codes-input"
							type="text"
							placeholder="Enter code..."
							bind:value={codeInput}
							onkeydown={(e) => e.key === 'Enter' && handleCodeSubmit()}
						/>
						<Button.Root class="codes-redeem-btn" onclick={handleCodeSubmit}>Redeem</Button.Root>
					</div>
					{#if codeMessage}
						<span class="code-message" class:success={codeSuccess}>{codeMessage}</span>
					{/if}
				</div>

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

	.audio-section {
		padding: 4px 4px 8px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.audio-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 4px;
	}

	.audio-title {
		font-size: 0.85rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	:global(.mute-btn) {
		background: rgba(255, 255, 255, 0.05) !important;
		border: 1px solid rgba(255, 255, 255, 0.08) !important;
		border-radius: 8px !important;
		padding: 4px 10px !important;
		font-size: 1.1rem !important;
		cursor: pointer !important;
		transition: background 0.15s !important;
	}

	:global(.mute-btn:hover) {
		background: rgba(255, 255, 255, 0.1) !important;
	}

	:global(.mute-btn.muted) {
		background: rgba(239, 68, 68, 0.1) !important;
		border-color: rgba(239, 68, 68, 0.2) !important;
	}

	.volume-slider {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 4px;
	}

	.slider-label {
		width: 40px;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.volume-slider input[type='range'] {
		flex: 1;
		height: 4px;
		-webkit-appearance: none;
		appearance: none;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 2px;
		outline: none;
	}

	.volume-slider input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: white;
		cursor: pointer;
	}

	.volume-slider input[type='range']:disabled {
		opacity: 0.3;
	}

	.slider-value {
		width: 36px;
		text-align: right;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.4);
		font-variant-numeric: tabular-nums;
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

	.codes-section {
		padding: 4px 4px 8px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.codes-title {
		font-size: 0.85rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0 4px;
	}

	.codes-input-row {
		display: flex;
		gap: 8px;
		padding: 0 4px;
	}

	.codes-input {
		flex: 1;
		padding: 8px 12px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: white;
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.15s;
	}

	.codes-input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.codes-input:focus {
		border-color: rgba(139, 92, 246, 0.5);
	}

	:global(.codes-redeem-btn) {
		padding: 8px 16px !important;
		background: rgba(139, 92, 246, 0.2) !important;
		border: 1px solid rgba(139, 92, 246, 0.3) !important;
		border-radius: 8px !important;
		color: #a78bfa !important;
		font-size: 0.85rem !important;
		font-weight: 600 !important;
		cursor: pointer !important;
		transition: background 0.15s !important;
		white-space: nowrap !important;
	}

	:global(.codes-redeem-btn:hover) {
		background: rgba(139, 92, 246, 0.35) !important;
		color: white !important;
	}

	.code-message {
		font-size: 0.8rem;
		color: #f87171;
		padding: 0 4px;
	}

	.code-message.success {
		color: #4ade80;
	}
</style>
