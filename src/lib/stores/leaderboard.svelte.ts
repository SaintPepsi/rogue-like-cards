import { supabase } from '$lib/supabase';

export type TimeFilter = 'today' | 'week' | 'month' | 'all';

export interface LeaderboardEntry {
	id: string;
	displayName: string;
	stage: number;
	level: number;
	enemiesKilled: number;
	goldEarned: number;
	createdAt: string;
	isCurrentUser: boolean;
}

// DECISION: 50-entry limit per fetch. Covers top-50 which is sufficient for
// a competitive leaderboard without excessive data transfer on mobile.
const LEADERBOARD_PAGE_SIZE = 50;

function getFilterDate(filter: TimeFilter): string | null {
	if (filter === 'all') return null;

	const now = new Date();
	if (filter === 'today') {
		now.setHours(0, 0, 0, 0);
	} else if (filter === 'week') {
		now.setDate(now.getDate() - 7);
	} else if (filter === 'month') {
		now.setDate(now.getDate() - 30);
	}
	return now.toISOString();
}

function createLeaderboard() {
	let entries = $state<LeaderboardEntry[]>([]);
	let loading = $state(false);
	let activeFilter = $state<TimeFilter>('week');
	let showLeaderboardModal = $state(false);

	async function fetchEntries(currentUserId: string | null) {
		loading = true;
		const filterDate = getFilterDate(activeFilter);

		let query = supabase
			.from('leaderboard_entries')
			.select('id, user_id, display_name, stage, level, enemies_killed, gold_earned, created_at')
			.order('stage', { ascending: false })
			.order('level', { ascending: false })
			.limit(LEADERBOARD_PAGE_SIZE);

		if (filterDate) {
			query = query.gte('created_at', filterDate);
		}

		const { data, error } = await query;

		if (error) {
			console.warn('Failed to fetch leaderboard:', error.message);
			entries = [];
			loading = false;
			return;
		}

		entries = (data ?? []).map((row) => ({
			id: row.id,
			displayName: row.display_name,
			stage: row.stage,
			level: row.level,
			enemiesKilled: row.enemies_killed,
			goldEarned: row.gold_earned,
			createdAt: row.created_at,
			isCurrentUser: row.user_id === currentUserId
		}));
		loading = false;
	}

	async function submitScore(params: {
		userId: string;
		displayName: string;
		stage: number;
		level: number;
		enemiesKilled: number;
		goldEarned: number;
	}): Promise<string | null> {
		const { error } = await supabase.from('leaderboard_entries').insert({
			user_id: params.userId,
			display_name: params.displayName,
			stage: params.stage,
			level: params.level,
			enemies_killed: params.enemiesKilled,
			gold_earned: params.goldEarned
		});

		if (error) return error.message;
		return null;
	}

	function setFilter(filter: TimeFilter, currentUserId: string | null) {
		activeFilter = filter;
		fetchEntries(currentUserId);
	}

	return {
		get entries() {
			return entries;
		},
		get loading() {
			return loading;
		},
		get activeFilter() {
			return activeFilter;
		},
		get showLeaderboardModal() {
			return showLeaderboardModal;
		},
		set showLeaderboardModal(v: boolean) {
			showLeaderboardModal = v;
		},

		fetchEntries,
		submitScore,
		setFilter
	};
}

export const leaderboard = createLeaderboard();
