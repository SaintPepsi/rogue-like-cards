<script lang="ts">
	import { Button } from 'bits-ui';
	import { CHANGELOG, type ChangeCategory, type ChangelogEntry } from '$lib/changelog';

	type Props = {
		show: boolean;
		onClose: () => void;
		entries?: ChangelogEntry[];
	};

	let { show, onClose, entries }: Props = $props();

	const displayEntries = $derived(entries ?? CHANGELOG);

	const tagLabel: Record<ChangeCategory, string> = {
		new: 'New',
		changed: 'Changed',
		fixed: 'Fixed'
	};

	type ParsedPart = {
		type: 'text' | 'code';
		content: string;
		variant?: 'old' | 'new' | 'default' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
	};

	// Parse description to render backtick-wrapped content with code styling
	// Supports: `value` (gold), `-value` (red/old), `+value` (green/new), rarity names
	function parseDescription(text: string): ParsedPart[] {
		const parts: ParsedPart[] = [];
		const regex = /`([^`]+)`/g;
		const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
		let lastIndex = 0;
		let match;

		while ((match = regex.exec(text)) !== null) {
			if (match.index > lastIndex) {
				parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
			}

			const content = match[1];
			let variant: ParsedPart['variant'] = 'default';
			let displayContent = content;

			// Check for old/new values first
			if (content.startsWith('-')) {
				variant = 'old';
				displayContent = content.slice(1);
			} else if (content.startsWith('+')) {
				variant = 'new';
				displayContent = content.slice(1);
			}
			// Check for rarity names
			else if (rarities.includes(content.toLowerCase() as (typeof rarities)[number])) {
				variant = content.toLowerCase() as (typeof rarities)[number];
			}

			parts.push({ type: 'code', content: displayContent, variant });
			lastIndex = regex.lastIndex;
		}

		if (lastIndex < text.length) {
			parts.push({ type: 'text', content: text.slice(lastIndex) });
		}

		return parts.length > 0 ? parts : [{ type: 'text', content: text }];
	}
</script>

{#if show}
	<div
		class="modal-overlay"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
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
				<h2>Changelog</h2>
				<Button.Root
					class="bg-transparent border-none text-white/60 text-[2rem] cursor-pointer leading-none p-0 hover:text-white"
					onclick={onClose}>&times;</Button.Root
				>
			</div>
			<div class="modal-content">
				{#each displayEntries as entry (entry.version)}
					<div class="version-entry">
						<h3>v{entry.version} <span class="version-date">{entry.date}</span></h3>
						<ul>
							{#each entry.changes as change, i (i)}
								<li>
									<span class="tag tag-{change.category}">{tagLabel[change.category]}</span>
									<span class="change-description">
										{#each parseDescription(change.description) as part, j (j)}
											{#if part.type === 'code'}
												<code class="stat-value stat-value-{part.variant}">{part.content}</code>
											{:else}
												{part.content}
											{/if}
										{/each}
									</span>
								</li>
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
		flex: 1;
	}

	.modal-content {
		padding: 24px;
		overflow-y: auto;
	}

	.version-entry {
		margin-bottom: 24px;
	}

	.version-entry:last-child {
		margin-bottom: 0;
	}

	.version-entry h3 {
		margin: 0 0 8px;
		font-size: 1.1rem;
		color: #a78bfa;
	}

	.version-date {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.4);
		font-weight: normal;
	}

	.version-entry ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.version-entry li {
		display: flex;
		align-items: baseline;
		gap: 8px;
		padding: 6px 0;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.4;
	}

	.tag {
		display: inline-block;
		padding: 1px 6px;
		border-radius: 3px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		flex-shrink: 0;
	}

	.change-description {
		flex: 1;
		min-width: 0;
	}

	.tag-new {
		background: rgba(34, 197, 94, 0.2);
		color: #4ade80;
	}

	.tag-changed {
		background: rgba(251, 191, 36, 0.2);
		color: #fbbf24;
	}

	.tag-fixed {
		background: rgba(239, 68, 68, 0.2);
		color: #f87171;
	}

	.stat-value {
		display: inline;
		padding: 2px 6px;
		border-radius: 4px;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.85em;
		font-weight: 600;
	}

	.stat-value-default {
		background: rgba(251, 191, 36, 0.15);
		color: #fbbf24;
		border: 1px solid rgba(251, 191, 36, 0.2);
	}

	.stat-value-old {
		background: rgba(239, 68, 68, 0.15);
		color: #f87171;
		border: 1px solid rgba(239, 68, 68, 0.2);
		text-decoration: line-through;
	}

	.stat-value-new {
		background: rgba(34, 197, 94, 0.15);
		color: #4ade80;
		border: 1px solid rgba(34, 197, 94, 0.2);
	}

	.stat-value-common {
		background: rgba(107, 114, 128, 0.15);
		color: #9ca3af;
		border: 1px solid rgba(107, 114, 128, 0.2);
	}

	.stat-value-uncommon {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
		border: 1px solid rgba(34, 197, 94, 0.2);
	}

	.stat-value-rare {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
		border: 1px solid rgba(59, 130, 246, 0.2);
	}

	.stat-value-epic {
		background: rgba(168, 85, 247, 0.15);
		color: #a855f7;
		border: 1px solid rgba(168, 85, 247, 0.2);
	}

	.stat-value-legendary {
		background: rgba(234, 179, 8, 0.15);
		color: #eab308;
		border: 1px solid rgba(234, 179, 8, 0.2);
	}
</style>
