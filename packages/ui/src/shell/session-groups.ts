import type { SessionRef, SessionSnapshot, WorkspaceAppearance, WorkspaceRef } from "@fraym/driver";
import type { ActivityState } from "../features/activity-state";
import type { RepoGroup, SessionItem } from "../features/session-rail/session-rail";
import { iconPaths } from "../icons/paths";
import { SESSIONS } from "./shell-data";
import type { ProjectFilterOverride, ProjectFilters, SessionFilters } from "./types";


/** Compact relative age for a session timestamp, e.g. `now`, `5m`, `2h`, `3d`. */
export function relativeTime(value: string | undefined): string {
	if (!value) return "now";
	const time = Date.parse(value);
	if (Number.isNaN(time)) return "now";
	const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
	return relativeMinutes(minutes);
}

function relativeMinutes(minutes: number): string {
	if (minutes < 2) return "now";
	return minutes < 60 ? `${minutes}m` : relativeHours(Math.round(minutes / 60));
}

function relativeHours(hours: number): string {
	return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

export function sessionRefKey(ref: SessionRef): string {
	return `${ref.workspaceId}:${ref.sessionId}`;
}

function workspaceLabel(workspace: WorkspaceRef): string {
	const basename = workspace.path.split(/[\\/]/).filter(Boolean).at(-1);
	// A worktree-pathed workspace keeps its PARENT project's displayName (the
	// tagged listing preserves it): the checkout dir must not rename the project
	// group when a worktree session happens to be the group's first/only row.
	if (workspace.git?.worktree) return workspace.displayName ?? basename ?? workspace.workspaceId;
	return basename ?? workspace.displayName ?? workspace.workspaceId;
}

/** Engine mints session ids as UUIDv7, whose first 48 bits are the unix-ms creation
 *  time. We read that embedded timestamp for the Created sort and the stable
 *  "oldest live work on top" Activity order — no engine round-trip, immutable,
 *  never reshuffles. A non-v7 id (e.g. the engine-script test client) returns
 *  undefined and callers fall back to updatedAt. */
const UUID_V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/i;
function createdAtFromSessionId(sessionId: string): string | undefined {
	if (!UUID_V7_RE.test(sessionId)) return undefined;
	const ms = Number.parseInt(sessionId.slice(0, 8) + sessionId.slice(9, 13), 16);
	return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}

/** The single source of truth for a session's lifecycle, derived from the only
 *  ground-truth signals the engine reports (`status` = idle|running|failed,
 *  `archivedAt`, `hasBackgroundWork`). Every status-dependent surface — the rail
 *  dot and the Status filter — derives from this, so they can never disagree.
 *  (The catalog-level "blocked on your input" signal (`snapshot.blockedOnInput`)
 *  surfaces as the rail's `needs-you` dot via the seam in {@link sessionDot}, not
 *  as a lifecycle here.) */
export type SessionLifecycle = "working" | "attached" | "idle" | "failed" | "archived";

export function sessionLifecycle(snapshot: SessionSnapshot): SessionLifecycle {
	if (snapshot.archivedAt) return "archived";
	if (snapshot.status === "running" || snapshot.hasBackgroundWork) return "working";
	if (snapshot.status === "failed") return "failed";
	if (snapshot.loaded) return "attached";
	return "idle";
}

/** Rail dot maps a session lifecycle to the shared activity vocabulary. */
function sessionDot(snapshot: SessionSnapshot): ActivityState {
	// A session PARKED on YOUR input — the engine reports a pending host-UI
	// request (permission / ask / elicitation) awaiting a human response — pings
	// User input takes precedence over active work in the rail.
	if (snapshot.blockedOnInput) return "needs-you";
	if (snapshot.status === "running") return "working";
	if (snapshot.hasBackgroundWork) return "background";
	if (snapshot.status === "failed") return "failed";
	if (snapshot.loaded) return "attached";
	return "idle";
}

/** The lifecycle reconstructed from a rail item (dot state + archived flag) —
 *  keeps the Status filter aligned with what the dot shows, without a parallel
 *  field. `needs-you`/`background` both read as live work. */
function itemLifecycle(item: SessionItem): SessionLifecycle {
	if (item.archived) return "archived";
	if (item.status === "working" || item.status === "background" || item.status === "needs-you") return "working";
	if (item.status === "failed") return "failed";
	if (item.status === "attached") return "attached";
	return "idle";
}

function matchesActivity(updatedAt: string | undefined, activity: SessionFilters["activity"]): boolean {
	if (activity === "All") return true;
	const updated = Date.parse(updatedAt ?? "");
	if (!Number.isFinite(updated)) return true;
	const hours = ACTIVITY_HOURS[activity] ?? 720;
	return Date.now() - updated <= hours * 60 * 60 * 1000;
}

const ACTIVITY_HOURS: Partial<Record<SessionFilters["activity"], number>> = {
	"1h": 1,
	"6h": 6,
	"12h": 12,
	"1d": 24,
	"3d": 72,
	"7d": 168,
	"30d": 720,
};

function repoGroup(
	workspace: WorkspaceRef,
	items: readonly SessionItem[],
	appearance?: WorkspaceAppearance,
): RepoGroup {
	// Per-project appearance: the workspaces-list ref (authoritative, engine-enriched)
	// wins; fall back to the ref's own appearance. An unknown icon name is dropped
	// so the rail never renders a missing glyph (Icon throws on unknown names).
	const look = appearance ?? workspace.appearance;
	return {
		repo: workspaceLabel(workspace),
		dot: look?.color?.trim() || "var(--fr-accent)",
		branch: workspace.git?.currentBranch ?? workspace.workspaceId,
		items,
		workspace,
		...(look?.icon && look.icon in iconPaths ? { icon: look.icon as RepoGroup["icon"] } : {}),
		...(look?.image ? { image: look.image } : {}),
		...(look?.emoji ? { emoji: look.emoji } : {}),
	};
}

function fallbackSessionGroup(workspace: WorkspaceRef, appearance?: WorkspaceAppearance): RepoGroup {
	return repoGroup(workspace, [], appearance);
}

function sessionItem(snapshot: SessionSnapshot, activeRef: SessionRef | null | undefined): SessionItem {
	return {
		id: sessionRefKey(snapshot.ref),
		sessionRef: snapshot.ref,
		title: snapshot.title,
		source: snapshot.source,
		time: sessionLifecycle(snapshot) === "working" ? "now" : relativeTime(snapshot.updatedAt),
		status: sessionDot(snapshot),
		active: activeRef ? sessionRefKey(snapshot.ref) === sessionRefKey(activeRef) : false,
		preview: snapshot.preview,
		updatedAt: snapshot.updatedAt,
		createdAt: createdAtFromSessionId(snapshot.ref.sessionId),
		pinned: Boolean(snapshot.pinnedAt),
		archived: Boolean(snapshot.archivedAt),
		worktree: snapshot.workspace.git?.worktree,
		worktreeBranch: snapshot.workspace.git?.worktree ? snapshot.workspace.git?.currentBranch : undefined,
		branch: snapshot.workspace.git?.currentBranch,
		workspacePath: snapshot.workspace.path,
	};
}

function catalogGroup(snapshot: SessionSnapshot, item: SessionItem, appearance?: WorkspaceAppearance): RepoGroup {
	return repoGroup(snapshot.workspace, [item], appearance);
}

function appendSessionItem(
	group: RepoGroup | undefined,
	snapshot: SessionSnapshot,
	item: SessionItem,
	appearance?: WorkspaceAppearance,
): RepoGroup {
	return group ? { ...group, items: [...group.items, item] } : catalogGroup(snapshot, item, appearance);
}

const SNAPSHOT_STATUS: Partial<Record<string, ActivityState>> = {
	running: "working",
	failed: "failed",
};

function snapshotSessionStatus(status: string | undefined): ActivityState {
	return SNAPSHOT_STATUS[status ?? ""] ?? "idle";
}

function snapshotSessionItem(
	sessionRef: SessionRef,
	title: string | undefined,
	status: string | undefined,
	updatedAt: string | undefined,
	worktree?: boolean,
): SessionItem {
	return {
		id: sessionRef.sessionId,
		sessionRef,
		title: title ?? "Current session",
		time: relativeTime(updatedAt),
		status: snapshotSessionStatus(status),
		active: true,
		createdAt: createdAtFromSessionId(sessionRef.sessionId),
		worktree,
	};
}

function snapshotSessionGroup(
	workspace: WorkspaceRef,
	sessionRef: SessionRef,
	title: string | undefined,
	status: string | undefined,
	updatedAt: string | undefined,
): RepoGroup {
	return repoGroup(workspace, [snapshotSessionItem(sessionRef, title, status, updatedAt, workspace.git?.worktree)]);
}

export function sessionGroupsFromCatalog(
	sessions: readonly SessionSnapshot[],
	activeRef: SessionRef | null | undefined,
	fallbackWorkspace?: WorkspaceRef | null,
	workspacesById?: ReadonlyMap<string, WorkspaceRef>,
): RepoGroup[] {
	// The session snapshot's embedded workspace ref may predate appearance
	// enrichment; the workspaces list (from listWorkspaces → workspaceWithGit) is
	// the authoritative per-project appearance source, looked up by workspaceId.
	const appearanceFor = (id: string): WorkspaceAppearance | undefined => workspacesById?.get(id)?.appearance;
	if (sessions.length === 0 && fallbackWorkspace) {
		return [fallbackSessionGroup(fallbackWorkspace, appearanceFor(fallbackWorkspace.workspaceId))];
	}

	const byWorkspace = new Map<string, RepoGroup>();
	for (const snapshot of sessions) {
		const key = snapshot.workspace.workspaceId;
		const group = byWorkspace.get(key);
		byWorkspace.set(key, appendSessionItem(group, snapshot, sessionItem(snapshot, activeRef), appearanceFor(key)));
	}
	return [...byWorkspace.values()];
}

export function sessionGroupsFromSnapshot(
	workspace: WorkspaceRef | null | undefined,
	sessionRef: SessionRef | null | undefined,
	title: string | undefined,
	status: string | undefined,
	updatedAt: string | undefined,
): RepoGroup[] {
	if (!workspace) return SESSIONS;
	if (!sessionRef) return [];
	return [snapshotSessionGroup(workspace, sessionRef, title, status, updatedAt)];
}

/** Status filter buckets, lifecycle-backed. `Active` = currently working;
 *  `Done` = settled (idle or failed last run); `Archived` = explicitly closed;
 *  `All` = the non-archived working set (archived has its own bucket). */
function matchesStatus(item: SessionItem, filter: SessionFilters["status"]): boolean {
	const state = itemLifecycle(item);
	if (filter === "Active") return state === "working" || state === "attached";
	if (filter === "Done") return state === "idle" || state === "failed";
	if (filter === "Archived") return state === "archived";
	return state !== "archived";
}

function searchableSessionText(item: SessionItem, group: RepoGroup): string {
	return [item.title, item.preview, group.repo, group.branch].filter(Boolean).join(" ").toLowerCase();
}

function matchesQuery(item: SessionItem, group: RepoGroup, normalizedQuery: string): boolean {
	return !normalizedQuery || searchableSessionText(item, group).includes(normalizedQuery);
}

function matchesSessionItem(
	item: SessionItem,
	group: RepoGroup,
	filters: SessionFilters,
	normalizedQuery: string,
): boolean {
	// A working session is active THIS instant — the "last activity" window must
	// never hide it on a stale `updatedAt` (a long streaming turn never bumps it,
	// and the live snapshot of the open session carries that stale time). Mirrors
	// `recencyValue`, which already sorts working as "now"; the window only gates
	// SETTLED sessions. (Re-applied — the v16 upstream merge reverted this guard.)
	// "attached" (loaded/warm-but-idle) joins "working": both have a live engine
	// child, so the "last activity" window must never hide them on a stale time.
	const live = itemLifecycle(item) === "working" || itemLifecycle(item) === "attached";
	return (
		matchesStatus(item, filters.status) &&
		(live || matchesActivity(item.updatedAt, filters.activity)) &&
		matchesQuery(item, group, normalizedQuery)
	);
}

function filteredGroup(group: RepoGroup, filters: SessionFilters, normalizedQuery: string): RepoGroup {
	return {
		...group,
		items: group.items.filter(item => matchesSessionItem(item, group, filters, normalizedQuery)),
	};
}

export function effectiveFilters(
	filters: SessionFilters,
	projectFilters: ProjectFilters,
	project: string,
): SessionFilters {
	const override = projectFilters[project];
	return override ? { ...filters, ...override } : filters;
}

/** Override = the per-project filter fields whose effective value differs from global; a
 *  field equal to global is dropped so it keeps inheriting later global changes. */
export function projectOverrideFromEffective(global: SessionFilters, next: SessionFilters): ProjectFilterOverride {
	return {
		...(next.status !== global.status ? { status: next.status } : {}),
		...(next.activity !== global.activity ? { activity: next.activity } : {}),
		...(next.sort !== global.sort ? { sort: next.sort } : {}),
		...(next.collapseAfter !== global.collapseAfter ? { collapseAfter: next.collapseAfter } : {}),
	};
}

export function setProjectOverride(
	prev: ProjectFilters,
	project: string,
	global: SessionFilters,
	next: SessionFilters,
): ProjectFilters {
	const override = projectOverrideFromEffective(global, next);
	if (Object.keys(override).length === 0) {
		if (!(project in prev)) return prev;
		const { [project]: _removed, ...rest } = prev;
		return rest;
	}
	return { ...prev, [project]: override };
}

function parseTime(value: string | undefined): number {
	const time = Date.parse(value ?? "");
	return Number.isFinite(time) ? time : 0;
}

/** A working session's effective last-activity is NOW — it is active this instant,
 *  even though storage `updatedAt` only records the last persisted message (a streaming
 *  turn never bumps it). The rail therefore shows it as "now" and sorts it with live
 *  work, never letting a running session display a stale time or sink under Updated. */
function recencyValue(item: SessionItem): number {
	return itemLifecycle(item) === "working" ? Date.now() : parseTime(item.updatedAt);
}

/** Pinned sessions form a block at the top of every sort, ordered among themselves
 *  by the active mode. */
function pinRank(item: SessionItem): number {
	return item.pinned ? 0 : 1;
}

/** Activity sort splits each pin block into working-on-top, settled-below. */
function activityRank(item: SessionItem): number {
	return itemLifecycle(item) === "working" ? 0 : 1;
}

/** Order within one pin block for the chosen mode. Activity keeps live work pinned
 *  atop its block in a STABLE order (oldest-started first, by createdAt) so streaming
 *  tokens never reshuffle it, and settles the rest by most-recent activity. With zero
 *  working sessions Activity collapses to plain last-updated. */
function modeCompare(a: SessionItem, b: SessionItem, sort: SessionFilters["sort"]): number {
	if (sort === "Name") return a.title.localeCompare(b.title);
	if (sort === "Updated") return recencyValue(b) - recencyValue(a);
	if (sort === "Created") return parseTime(b.createdAt) - parseTime(a.createdAt);
	const rank = activityRank(a) - activityRank(b);
	if (rank !== 0) return rank;
	return activityRank(a) === 0
		? parseTime(a.createdAt) - parseTime(b.createdAt)
		: parseTime(b.updatedAt) - parseTime(a.updatedAt);
}

/** Deterministic order: pinned block first, then the chosen mode, then a stable
 *  tiebreak on the session ref key so equal/missing keys never reshuffle between renders. */
function sortItems(items: readonly SessionItem[], sort: SessionFilters["sort"]): SessionItem[] {
	return [...items].sort((a, b) => pinRank(a) - pinRank(b) || modeCompare(a, b, sort) || a.id.localeCompare(b.id));
}

/** A project has an active per-project override when its entry carries at least one
 *  filter field. A group its OWN override empties must still render (header + gear) so the
 *  override stays editable — otherwise it hides the group AND the only control that could
 *  clear it, permanently stranding the project (the Status=Archived P0: unarchive the last
 *  archived session and the project vanishes with no reachable gear). Global filters never strand
 *  — the top-level Projects gear is always present. */
function hasProjectOverride(projectFilters: ProjectFilters, repo: string): boolean {
	const override = projectFilters[repo];
	return override != null && Object.keys(override).length > 0;
}

/** Second-line row metadata (the Filters "Metadata: Show" density): the session's
 *  branch with a worktree affix. Stamped onto the DATA here so the rail stays
 *  display-dumb — it renders `item.meta` verbatim when present. */
function stampSessionMetadata(items: readonly SessionItem[]): SessionItem[] {
	return items.map(item => {
		const meta = item.branch
			? `${item.branch}${item.worktree ? " · worktree" : ""}`
			: item.worktree
				? "worktree"
				: undefined;
		return meta ? { ...item, meta } : item;
	});
}

export function filterGroups(
	groups: readonly RepoGroup[],
	filters: SessionFilters,
	projectFilters: ProjectFilters,
	query = "",
): RepoGroup[] {
	const normalizedQuery = query.trim().toLowerCase();
	const eff = (group: RepoGroup) => effectiveFilters(filters, projectFilters, group.repo);
	const filtered = groups
		.filter(g => filters.project === "All" || g.repo === filters.project)
		.map(g => filteredGroup(g, eff(g), normalizedQuery))
		// Keep a group its own override emptied so the gear stays reachable; a search query still hides empties.
		.filter(g => g.items.length > 0 || (!normalizedQuery && hasProjectOverride(projectFilters, g.repo)));

	const withMeta = (items: readonly SessionItem[]) =>
		filters.metadata === "Show" ? stampSessionMetadata(items) : items;

	if (filters.group === "Flat") {
		return [
			{
				repo: "sessions",
				branch: filters.sort.toLowerCase(),
				dot: "var(--fr-accent)",
				collapseAfter: filters.collapseAfter,
				items: withMeta(
					sortItems(
						filtered.flatMap(g => g.items.map(item => ({ ...item, title: `${g.repo}: ${item.title}` }))),
						filters.sort,
					),
				),
			},
		];
	}

	return filtered.map(g => {
		const e = eff(g);
		return { ...g, collapseAfter: e.collapseAfter, items: withMeta(sortItems(g.items, e.sort)) };
	});
}

