<script lang="ts">
	import { CHANGELOG } from '$lib/changelog';

	type Props = {
		show: boolean;
		onClose: () => void;
	};

	let { show, onClose }: Props = $props();
</script>

{#if show}
	<div class="modal-overlay" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()} role="button" tabindex="0">
		<div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} role="dialog" tabindex="-1">
			<div class="modal-header">
				<h2>Changelog</h2>
				<button class="close-btn" onclick={onClose}>&times;</button>
			</div>
			<div class="modal-content">
				{#each CHANGELOG as entry (entry.version)}
					<div class="entry">
						<div class="entry-header">
							<span class="entry-version">v{entry.version}</span>
							<span class="entry-date">{entry.date}</span>
						</div>
						<ul>
							{#each entry.changes as change}
								<li>{change}</li>
							{/each}
						</ul>
					</div>
				{/each}
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
		max-width: 600px;
		max-height: 80vh;
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
		font-size: 1.5rem;
		color: #fbbf24;
	}

	.close-btn {
		margin-left: auto;
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
		padding: 24px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.entry {
		border-left: 3px solid #8b5cf6;
		padding-left: 16px;
	}

	.entry-header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 8px;
	}

	.entry-version {
		font-weight: bold;
		font-size: 1.1rem;
		color: #a78bfa;
	}

	.entry-date {
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.85rem;
	}

	ul {
		margin: 0;
		padding-left: 20px;
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.95rem;
	}

	li {
		margin-bottom: 4px;
	}
</style>
