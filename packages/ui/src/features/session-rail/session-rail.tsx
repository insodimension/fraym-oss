import type { SessionRailStyle } from "@fraym/config";
import type { SessionRef, WorkspaceRef } from "@fraym/driver";
import { type AvatarId, type AvatarMode, type AvatarState, Presence } from "@fraym/vibr";
import {
	createContext,
	memo,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Collapsible } from "../../components/collapsible";
import { PopoverHeading, PopoverPanel } from "../../elements/popover";
import { Shimmer } from "../../elements/shimmer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../elements/tooltip";
import { Icon } from "../../icons/icon";
import type { IconName } from "../../icons/paths";
import { cn } from "../../lib/cn";
import { ActivityDot, type ActivityState } from "../activity-state";
import { writeSessionDragData } from "./session-drag";

/** Rail compact context: slotted leaf controls (RailButton, MiniButton, SessionBar)
 *  read this to fade their labels and show tooltips when the rail is compact. Stays
 *  false outside a SessionRail, so RailButtons reused elsewhere (lab rail) are unaffected. */
const RailCompactContext = createContext(false);
export function useRailCompact(): boolean {
	return useContext(RailCompactContext);
}

export interface SessionItem {
	readonly id: string;
	readonly sessionRef?: SessionRef;
	readonly title: string;
	/** A pending background session with no catalog row yet. It renders as a
	 * non-clickable locating shimmer until the next refresh finds the row. */
	readonly locating?: boolean;
	readonly source?: "user" | "autonomy";
	/** Leading glyph shown in place of the status dot. Absent → the normal status
	 *  dot / presence avatar renders. */
	readonly icon?: IconName;
	/** Explicit activity state for this row's dot. It wins over `icon` and the
	 * derived status dot: `needs-you` awaits input, `background` is active,
	 * `off` is paused or unknown, and `ok` is healthy. */
	readonly dotState?: ActivityState;
	readonly time: string;
	/** The rail dot's semantic state, derived once in `sessionDot` from the
	 *  session's lifecycle. Renders via the shared {@link ActivityDot}. */
	readonly status: ActivityState;
	readonly active?: boolean;
	readonly preview?: string;
	readonly updatedAt?: string;
	/** Session creation time (ISO), derived from the UUIDv7 session id. Powers the
	 *  Created sort and the stable "oldest live work on top" order in Activity sort. */
	readonly createdAt?: string;
	/** Pinned to the top of its group/list, above every sort mode. Engine-backed (`pinnedAt`). */
	readonly pinned?: boolean;
	readonly archived?: boolean;
	/** This session runs in its OWN git worktree (its workspace is a linked
	 *  worktree); drives the per-row worktree icon. */
	readonly worktree?: boolean;
	/** The worktree's branch (e.g. `fraym/feature/rail-badge`), shown on row hover. */
	readonly worktreeBranch?: string;
	/** The session workspace's current branch (worktree or not) — metadata line fuel. */
	readonly branch?: string;
	/** Pre-composed second metadata line (branch · worktree). Present ONLY when the
	 *  Filters "Metadata" density is Show — the rail renders it verbatim. */
	readonly meta?: string;
	/** Absolute filesystem path of the session's workspace root — powers "Reveal
	 *  in Finder/Explorer" on the session context menu (desktop only). */
	readonly workspacePath?: string;
}

export interface RepoGroup {
	readonly repo: string;
	readonly branch: string;
	/** True when this group's checkout is a linked git worktree (not the main one);
	 *  drives the rail's worktree badge. Sourced from `workspace.git.worktree`. */
	readonly worktree?: boolean;
	readonly dot: string;
	/** Header glyph for the group (default `folder`). The lifted Autonomy group sets
	 *  `orbit` so loop ticks read as a distinct, non-project surface. */
	readonly icon?: IconName;
	/** Per-project rail image src (data:/http URL). Wins over `icon`/`emoji`. */
	readonly image?: string;
	/** Per-project emoji marker (rendered as text). Wins over `icon`, loses to `image`. */
	readonly emoji?: string;
	readonly items: readonly SessionItem[];
	/** Per-group "Show more" limit (from the effective per-project/global filter). Falls back
	 *  to the rail's `collapseAfter` prop when unset. */
	readonly collapseAfter?: number;
	/** The workspace this group belongs to — powers the per-group "new session here" action. */
	readonly workspace?: WorkspaceRef;
}

export interface SessionRailProps {
	readonly brand?: React.ReactNode;
	readonly tabs?: React.ReactNode;
	readonly actions?: React.ReactNode;
	readonly sessionBar?: React.ReactNode;
	readonly groups: readonly RepoGroup[];
	/** Show only this many sessions per group before a "Show more" toggle (default 5). */
	readonly collapseAfter?: number;
	/** Collapse to a 56px icon rail: labels fade, project groups become folder icons with hover flyouts. */
	readonly compact?: boolean;
	/** Visual rail treatment. Defaults to the unchanged classic treatment. */
	readonly style?: SessionRailStyle;
	readonly footer?: React.ReactNode;
	readonly onSessionClick?: (item: SessionItem) => void;
	readonly onSessionContextMenu?: (item: SessionItem, event: React.MouseEvent<HTMLButtonElement>) => void;
	readonly onSessionMultiContextMenu?: (
		item: SessionItem,
		selectedItems: readonly SessionItem[],
		event: React.MouseEvent<HTMLButtonElement>,
	) => void;
	/** Right-click on a project group header — opens the project context menu. */
	readonly onGroupContextMenu?: (group: RepoGroup, event: React.MouseEvent<HTMLButtonElement>) => void;
	readonly groupAction?: (group: RepoGroup) => React.ReactNode;
	readonly sessionPresence?: (item: SessionItem) => React.ReactNode;
	readonly renamingItemId?: string | null;
	readonly onRenameItem?: (item: SessionItem, value: string | null) => void;
	readonly className?: string;
}

function repoGroupKey(group: RepoGroup, index: number): string {
	return `${group.repo}:${group.branch}:${index}`;
}

function sameSessionRef(a: SessionRef | undefined, b: SessionRef | undefined): boolean {
	if (a === b) return true;
	if (!a || !b) return false;
	return a.workspaceId === b.workspaceId && a.sessionId === b.sessionId;
}

function sameSessionItem(a: SessionItem, b: SessionItem): boolean {
	return (
		a.id === b.id &&
		sameSessionRef(a.sessionRef, b.sessionRef) &&
		a.title === b.title &&
		a.icon === b.icon &&
		a.dotState === b.dotState &&
		a.locating === b.locating &&
		a.time === b.time &&
		a.status === b.status &&
		a.active === b.active &&
		a.preview === b.preview &&
		a.updatedAt === b.updatedAt &&
		a.archived === b.archived &&
		a.worktree === b.worktree &&
		a.meta === b.meta
	);
}

function sameStringList(a: readonly string[], b: readonly string[]): boolean {
	if (a === b) return true;
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

interface SessionRailGroupProps {
	readonly group: RepoGroup;
	readonly groupKey: string;
	readonly open: boolean;
	readonly onToggleGroup: (key: string) => void;
	readonly expanded: boolean;
	readonly onToggleExpanded: (key: string) => void;
	readonly collapseAfter: number;
	readonly onSessionClick?: (item: SessionItem, event: React.MouseEvent<HTMLButtonElement>) => void;
	readonly onSessionContextMenu?: (item: SessionItem, event: React.MouseEvent<HTMLButtonElement>) => void;
	readonly onGroupContextMenu?: (group: RepoGroup, event: React.MouseEvent<HTMLButtonElement>) => void;
	readonly selectedIds: ReadonlySet<string>;
	readonly groupAction?: (group: RepoGroup) => React.ReactNode;
	readonly sessionPresence?: (item: SessionItem) => React.ReactNode;
	readonly renamingItemId?: string | null;
	readonly onRenameItem?: (item: SessionItem, value: string | null) => void;
	readonly style: SessionRailStyle;
}

function visibleSessionItems(
	items: readonly SessionItem[],
	expanded: boolean,
	collapseAfter: number,
): readonly SessionItem[] {
	const limit = Math.max(1, collapseAfter);
	if (expanded || items.length <= limit) return items;
	const visible = items.slice(0, limit);
	if (visible.some(item => item.active)) return visible;
	const active = items.find(item => item.active);
	if (!active) return visible;
	return [...visible.slice(0, limit - 1), active];
}

/** Connector from the stronger threaded folder node to the first visible session. */
function ThreadedGroupConnector({ lastSessionId }: { readonly lastSessionId: string }) {
	return (
		<span
			aria-hidden="true"
			data-slot="session-rail-connector"
			data-last-session-id={lastSessionId}
			className="pointer-events-none absolute left-[18px] top-4 z-0 h-4 w-[0.5px] -translate-x-1/2 bg-fr-border"
		/>
	);
}

/** Each visible row draws the threaded connector in TWO segments that stop
 *  short of its leading node — a clear circular void around every dot/vibr
 *  (the line is never visible behind them, on any row background). The final
 *  row draws only the segment above its dot. */
function ThreadedSessionConnector({ last }: { readonly last: boolean }) {
	return (
		<>
			<span
				aria-hidden="true"
				className="pointer-events-none absolute top-0 left-[18px] z-0 h-[calc(50%-6px)] w-[0.5px] -translate-x-1/2 bg-fr-border"
			/>
			{!last && (
				<span
					aria-hidden="true"
					className="pointer-events-none absolute bottom-0 left-[18px] z-0 h-[calc(50%-6px)] w-[0.5px] -translate-x-1/2 bg-fr-border"
				/>
			)}
		</>
	);
}

const SessionRailGroup = memo(function SessionRailGroup({
	group,
	groupKey,
	open,
	onToggleGroup,
	expanded,
	onToggleExpanded,
	collapseAfter,
	onSessionClick,
	onSessionContextMenu,
	onGroupContextMenu,
	selectedIds,
	groupAction,
	sessionPresence,
	renamingItemId,
	onRenameItem,
	style,
}: SessionRailGroupProps) {
	const threaded = style === "threaded";
	const handleToggle = useCallback(() => onToggleGroup(groupKey), [groupKey, onToggleGroup]);
	const handleToggleExpanded = useCallback(() => onToggleExpanded(groupKey), [groupKey, onToggleExpanded]);
	const handleHeaderContextMenu = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			onGroupContextMenu?.(group, event);
		},
		[group, onGroupContextMenu],
	);
	const groupCollapseAfter = group.collapseAfter ?? collapseAfter;
	const overflow = group.items.length - groupCollapseAfter;
	const hasMore = overflow > 0;
	const visibleItems = visibleSessionItems(group.items, expanded, groupCollapseAfter);
	const leading = useMemo(
		// Both styles share the fixed size-4 slot so the project glyph/image sits on
		// the same 18px column as every session dot beneath it. Precedence:
		// image > emoji > icon > default folder.
		() => (
			<span className="flex size-4 shrink-0 items-center justify-center">
				{group.image ? (
					<img src={group.image} alt="" className="size-4 rounded-[4px] object-cover" />
				) : group.emoji ? (
					<span className="text-[13px] leading-none">{group.emoji}</span>
				) : (
					<Icon
						name={group.icon ?? "folder"}
						size={15}
						strokeWidth={threaded ? 2 : 1.7}
						className={threaded ? "text-fr-text-2" : "text-fr-text-3 opacity-90"}
					/>
				)}
			</span>
		),
		[group.image, group.emoji, group.icon, threaded],
	);
	// The classic project name inherits the trigger's sans (the pre-f163b35 look;
	// that restyle's mono/xs/tracking demotion is reverted — owner-directed).
	// Threaded promotes the name (medium, ink) without changing data grouping.
	const title = useMemo(
		() =>
			threaded ? (
				// Deliberately NOT `.repo-name`: theme.css pins that class to font-weight 400
				// for the muted classic label. Threaded promotes the project name (medium, ink).
				<span className="fr-overflow font-primary text-fr-base font-medium text-fr-text">{group.repo}</span>
			) : (
				<span className="repo-name fr-overflow">{group.repo}</span>
			),
		[group.repo, threaded],
	);
	const actions = useMemo(() => groupAction?.(group), [groupAction, group]);
	return (
		<Collapsible
			open={open}
			onToggle={handleToggle}
			className={cn("repo-group mt-2", threaded && "relative")}
			triggerClassName={cn(
				"repo-head justify-start gap-1.5 rounded-[7px] px-2.5 py-2 font-normal text-fr-text-3 hover:text-fr-text-2",
				threaded && "relative z-[1] text-fr-text-2 hover:text-fr-text",
			)}
			contentClassName="flex flex-col"
			leading={leading}
			title={title}
			actions={actions}
			onContextMenu={onGroupContextMenu ? handleHeaderContextMenu : undefined}
		>
			{threaded && visibleItems.length > 0 && (
				<ThreadedGroupConnector lastSessionId={visibleItems[visibleItems.length - 1]!.id} />
			)}
			{visibleItems.map((item, index) =>
				threaded ? (
					<div key={item.id} className="relative">
						<ThreadedSessionConnector last={index === visibleItems.length - 1} />
						<SessionRailItem
							item={item}
							selected={selectedIds.has(item.id)}
							renaming={renamingItemId === item.id}
							onSessionClick={onSessionClick}
							onSessionContextMenu={onSessionContextMenu}
							onRenameItem={onRenameItem}
							sessionPresence={sessionPresence}
							threaded
						/>
					</div>
				) : (
					<SessionRailItem
						key={item.id}
						item={item}
						selected={selectedIds.has(item.id)}
						renaming={renamingItemId === item.id}
						onSessionClick={onSessionClick}
						onSessionContextMenu={onSessionContextMenu}
						onRenameItem={onRenameItem}
						sessionPresence={sessionPresence}
					/>
				),
			)}
			{hasMore && (
				<button
					type="button"
					onClick={handleToggleExpanded}
					className="show-more flex w-full items-center gap-[9px] rounded-[7px] px-2.5 py-[7px] text-left text-fr-xs text-fr-text-3 transition-colors duration-[120ms] hover:bg-fr-surface-2 hover:text-fr-text-2 focus-visible:bg-fr-surface-2 focus-visible:text-fr-text-2 focus-visible:outline-none"
				>
					<span className="w-4 shrink-0" aria-hidden="true" />
					<span className="flex-1 fr-overflow">{expanded ? "Show less" : "Show more"}</span>
				</button>
			)}
		</Collapsible>
	);
}, sameSessionRailGroupProps);

interface CompactRailGroupProps {
	readonly group: RepoGroup;
	readonly onSessionClick?: (item: SessionItem, event: React.MouseEvent<HTMLButtonElement>) => void;
	readonly onSessionContextMenu?: (item: SessionItem, event: React.MouseEvent<HTMLButtonElement>) => void;
	readonly selectedIds: ReadonlySet<string>;
	readonly sessionPresence?: (item: SessionItem) => React.ReactNode;
	readonly threaded?: boolean;
}

/** Estimated max flyout height; also the bottom clamp for its top edge. */
const FLYOUT_MAX_PX = 360;
/** Grace period so the cursor can travel from folder icon into the portaled flyout. */
const FLYOUT_CLOSE_MS = 90;

/**
 * A project group when the rail is compact: one folder icon carries an active
 * accent and a running-session indicator. Hover or focus opens a portaled
 * flyout with the same session rows as the expanded rail.
 */
const CompactRailGroup = memo(function CompactRailGroup({
	group,
	onSessionClick,
	onSessionContextMenu,
	selectedIds,
	sessionPresence,
	threaded = false,
}: CompactRailGroupProps) {
	const btnRef = useRef<HTMLButtonElement>(null);
	const [rect, setRect] = useState<DOMRect | null>(null);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const open = useCallback(() => {
		if (closeTimer.current) clearTimeout(closeTimer.current);
		if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
	}, []);
	const close = useCallback(() => {
		if (closeTimer.current) clearTimeout(closeTimer.current);
		closeTimer.current = setTimeout(() => setRect(null), FLYOUT_CLOSE_MS);
	}, []);
	useEffect(
		() => () => {
			if (closeTimer.current) clearTimeout(closeTimer.current);
		},
		[],
	);
	const hasActive = group.items.some(i => i.active);
	const hasRunning = group.items.some(i => i.status === "working");
	return (
		<>
			<button
				ref={btnRef}
				type="button"
				aria-label={group.worktree ? `${group.repo} (git worktree)` : group.repo}
				data-slot="rail-group-compact"
				className={cn(
					"relative mt-1 flex h-9 w-full items-center justify-center rounded-[7px] text-fr-text-3 transition-colors duration-[120ms]",
					"hover:bg-fr-surface hover:text-fr-text focus-visible:bg-fr-surface focus-visible:text-fr-text focus-visible:outline-none",
					rect && "bg-fr-surface text-fr-text",
				)}
				onMouseEnter={open}
				onMouseLeave={close}
				onFocus={open}
				onBlur={close}
				onClick={open}
			>
				{group.image ? (
					<img
						src={group.image}
						alt=""
						className={cn("rounded-[5px] object-cover", threaded ? "size-[17px]" : "size-4")}
					/>
				) : group.emoji ? (
					<span className={threaded ? "text-[15px] leading-none" : "text-[14px] leading-none"}>{group.emoji}</span>
				) : (
					<Icon name={group.icon ?? "folder"} size={threaded ? 17 : 16} strokeWidth={threaded ? 2 : 1.7} />
				)}
				{hasActive && (
					<span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-0.5 rounded-[2px] bg-fr-accent" />
				)}
				{hasRunning && (
					<span
						aria-hidden="true"
						className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-fr-accent shadow-[0_0_0_3px_var(--fr-rail)] animate-ping"
					/>
				)}
				{group.worktree && (
					<span
						aria-hidden="true"
						className="absolute bottom-1 right-1 text-fr-text-3"
						title="Linked git worktree"
					>
						<Icon name="branch" size={9} strokeWidth={2} />
					</span>
				)}
			</button>
			{rect && (
				<PopoverPanel
					width={236}
					style={{
						left: rect.right + 6,
						top: Math.max(8, Math.min(rect.top - 6, window.innerHeight - FLYOUT_MAX_PX)),
					}}
					className="max-h-[360px] overflow-y-auto"
					onMouseEnter={open}
					onMouseLeave={close}
				>
					<PopoverHeading>{group.repo}</PopoverHeading>
					<div className="flex flex-col">
						{group.items.map(item => (
							<SessionRailItem
								key={item.id}
								item={item}
								selected={selectedIds.has(item.id)}
								onSessionClick={onSessionClick}
								onSessionContextMenu={onSessionContextMenu}
								sessionPresence={sessionPresence}
								threaded={threaded}
							/>
						))}
					</div>
				</PopoverPanel>
			)}
		</>
	);
});

interface SessionRailItemProps {
	readonly item: SessionItem;
	readonly selected: boolean;
	readonly onSessionClick?: (item: SessionItem, event: React.MouseEvent<HTMLButtonElement>) => void;
	readonly onSessionContextMenu?: (item: SessionItem, event: React.MouseEvent<HTMLButtonElement>) => void;
	readonly sessionPresence?: (item: SessionItem) => React.ReactNode;
	readonly renaming?: boolean;
	readonly onRenameItem?: (item: SessionItem, value: string | null) => void;
	readonly threaded?: boolean;
}

/** Inline session-title editor shown in place of the row label while renaming.
 *  Commits on Enter/blur, cancels on Escape; a one-shot guard stops the blur that
 *  fires after Escape unmounts the input from also committing. */
function RenameInput({
	initial,
	onCommit,
	onCancel,
}: {
	readonly initial: string;
	readonly onCommit: (value: string) => void;
	readonly onCancel: () => void;
}) {
	const [value, setValue] = useState(initial);
	const doneRef = useRef(false);
	const finish = useCallback(
		(commit: boolean) => {
			if (doneRef.current) return;
			doneRef.current = true;
			if (commit) onCommit(value);
			else onCancel();
		},
		[value, onCommit, onCancel],
	);
	return (
		<input
			autoFocus
			aria-label="Rename session"
			className="s-title min-w-0 flex-1 rounded-[4px] bg-fr-surface-2 px-1 text-fr-base text-fr-text outline-none ring-1 ring-fr-accent-line"
			value={value}
			onChange={event => setValue(event.target.value)}
			onFocus={event => event.currentTarget.select()}
			onMouseDown={event => event.stopPropagation()}
			onClick={event => event.stopPropagation()}
			onKeyDown={event => {
				event.stopPropagation();
				if (event.key === "Enter") {
					event.preventDefault();
					finish(true);
				} else if (event.key === "Escape") {
					event.preventDefault();
					finish(false);
				}
			}}
			onBlur={() => finish(true)}
		/>
	);
}

const SessionRailItem = memo(function SessionRailItem({
	item,
	selected,
	onSessionClick,
	onSessionContextMenu,
	sessionPresence,
	renaming,
	onRenameItem,
	threaded = false,
}: SessionRailItemProps) {
	const handledRef = useRef(false);
	const handleClick = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			if (handledRef.current) {
				handledRef.current = false;
				return;
			}
			onSessionClick?.(item, event);
		},
		[item, onSessionClick],
	);
	const handleMouseDown = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			if (event.ctrlKey || event.metaKey || event.shiftKey) {
				event.preventDefault();
				event.stopPropagation();
				handledRef.current = true;
				onSessionClick?.(item, event);
			}
		},
		[item, onSessionClick],
	);
	const handleContextMenu = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			onSessionContextMenu?.(item, event);
		},
		[item, onSessionContextMenu],
	);
	const handleDragStart = useCallback(
		(event: React.DragEvent<HTMLButtonElement>) => {
			if (!writeSessionDragData(event.dataTransfer, item)) event.preventDefault();
		},
		[item],
	);
	const statusNode = item.dotState ? (
		<span className="flex size-4 shrink-0 items-center justify-center">
			<ActivityDot state={item.dotState} />
		</span>
	) : item.icon ? (
		<span className="flex size-4 shrink-0 items-center justify-center text-fr-text-3">
			<Icon name={item.icon} size={14} strokeWidth={1.8} aria-hidden="true" />
		</span>
	) : sessionPresence ? (
		<SessionPresenceDot item={item} sessionPresence={sessionPresence} />
	) : (
		// The same fixed slot every other leading node uses — a bare dot centers
		// 3px off the avatar/icon column and shifts the title indent per row.
		<span className="flex size-4 shrink-0 items-center justify-center">
			<ActivityDot state={item.status} />
		</span>
	);
	const title = item.title;
	const time = item.locating ? (
		<Shimmer className="text-[length:inherit] font-normal">{item.time}</Shimmer>
	) : (
		item.time
	);
	if (renaming) {
		return (
			<div data-slot="session-rail-item" data-renaming="" className={sessionItemClass(item, selected, threaded)}>
				{statusNode}
				<RenameInput
					initial={item.title}
					onCommit={value => onRenameItem?.(item, value)}
					onCancel={() => onRenameItem?.(item, null)}
				/>
				<span className="s-time shrink-0 text-fr-2xs text-fr-text-3">{time}</span>
			</div>
		);
	}
	return (
		<button
			type="button"
			disabled={item.locating}
			title={item.locating ? "The run is live — locating its session so this row can open it." : undefined}
			data-session-id={item.sessionRef?.sessionId ?? item.id}
			data-workspace-id={item.sessionRef?.workspaceId}
			className={sessionItemClass(item, selected, threaded)}
			onMouseDown={handleMouseDown}
			onClick={handleClick}
			onContextMenu={handleContextMenu}
			draggable={item.sessionRef !== undefined}
			onDragStart={handleDragStart}
		>
			{statusNode}
			{item.meta ? (
				<span className="flex min-w-0 flex-1 flex-col">
					{threaded ? (
						<ThreadedSessionTitle>{title}</ThreadedSessionTitle>
					) : (
						<span className="s-title fr-overflow">{title}</span>
					)}
					<span className="flex items-center gap-1 text-fr-2xs text-fr-text-3">
						<Icon name="git-branch" size={10} strokeWidth={1.5} aria-hidden="true" />
						<span className="fr-overflow">{item.meta}</span>
					</span>
				</span>
			) : threaded ? (
				<ThreadedSessionTitle className="flex-1">{title}</ThreadedSessionTitle>
			) : (
				<span className="s-title fr-overflow flex-1">{title}</span>
			)}
			{item.worktree ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<span
							className="flex size-4 shrink-0 items-center justify-center text-fr-text-3"
							aria-label={item.worktreeBranch ? `Worktree ${item.worktreeBranch}` : "Runs in a git worktree"}
						>
							<Icon name="git-branch" size={12} strokeWidth={1.5} aria-hidden="true" />
						</span>
					</TooltipTrigger>
					<TooltipContent side="right">
						{item.worktreeBranch ? `Worktree · ${item.worktreeBranch}` : "Git worktree"}
					</TooltipContent>
				</Tooltip>
			) : null}
			<span className="s-time shrink-0 text-fr-2xs text-fr-text-3">{time}</span>
		</button>
	);
}, sameSessionRailItemProps);

/** The threaded title ends in the right-edge fade BY DESIGN (not policy-driven):
 *  `.fr-fade-end`, the explicit variant of the shared overflow primitive. */
function ThreadedSessionTitle({
	children,
	className,
}: {
	readonly children: React.ReactNode;
	readonly className?: string;
}) {
	return (
		<span data-slot="session-title-fade" className={cn("s-title fr-fade-end min-w-0", className)}>
			{children}
		</span>
	);
}

function sessionItemClass(item: SessionItem, selected: boolean, threaded = false): string {
	return cn(
		"sess relative flex w-full items-center gap-[9px] rounded-[7px] px-2.5 py-[7px] text-left text-fr-base text-fr-text-2 transition-colors duration-[120ms]",
		threaded && "z-[1]",
		item.status === "working" && "running",
		item.status === "background" && "background",
		item.status === "failed" && "failed",
		"hover:bg-fr-surface-2 hover:text-fr-text focus-visible:bg-fr-surface-2 focus-visible:text-fr-text focus-visible:outline-none",
		item.active && "active bg-fr-surface-2 text-fr-text",
		item.active &&
			"before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-[2px] before:bg-fr-accent before:content-['']",
		selected && "selected bg-fr-add/15 text-fr-text",
	);
}
function SessionPresenceDot({
	item,
	sessionPresence,
}: {
	readonly item: SessionItem;
	readonly sessionPresence: (item: SessionItem) => React.ReactNode;
}) {
	// When the presence resolver returns nothing (idle / not vibing / no avatar),
	// fall back to the default state dot instead of an empty slot.
	const node = item.status === "working" ? sessionPresence(item) : null;
	// EVERY return renders inside the fixed size-4 slot all leading nodes share:
	// a bare dot centers 5px off the icon/avatar column, shifts the title indent
	// per row, and misses the threaded connector line entirely.
	if (node != null)
		return <span className="s-av -my-px flex size-4 shrink-0 items-center justify-center">{node}</span>;
	return (
		<span className="flex size-4 shrink-0 items-center justify-center">
			<ActivityDot state={item.status} />
		</span>
	);
}

/** Largest visual size (px) the rail mini-vibr is allowed to occupy. */
const RAIL_MAX_PX = 30;
// Natural display sizes (px) of each avatar, mirroring packages/vibr/src/css/avatars.css.
// A single fixed scale can't normalize the rail mini-vibr: avatars span 15px→46px, and
// some (e.g. `duel` — a small figure in a big dojo canvas) collapse to a speck when
// shrunk. So each avatar is scaled down to RAIL_MAX_PX only if it is larger.
const AVATAR_PX: Partial<Record<AvatarId, number>> = {
	blob: 20,
	static: 24,
	rorschach: 26,
	inkblot: 26,
	aurora: 26,
	nebula: 26,
	siri: 26,
	orbit: 26,
	quasar: 40,
	matrix: 32,
	lattice: 15,
	liquid: 30,
	koi: 30,
	duel: 30,
	ember: 46,
	blackhole: 42,
};

/**
 * The session rail's mini vibr. Avatars self-size from 15px to 46px, so each is
 * scaled to at most RAIL_MAX_PX and absolutely-centered inside the fixed dot slot:
 * the scaled glyph never reflows the row, and small-figure avatars like `duel`
 * stay legible instead of collapsing to a speck (the old fixed 0.58 scale).
 */
export function RailPresence({
	avatar,
	state,
	mode,
	energy,
}: {
	readonly avatar: AvatarId;
	readonly state?: AvatarState;
	readonly mode?: AvatarMode;
	readonly energy?: number;
}) {
	const scale = Math.min(1, RAIL_MAX_PX / (AVATAR_PX[avatar] ?? RAIL_MAX_PX));
	return (
		<span className="relative flex size-full items-center justify-center" aria-hidden="true">
			<span
				className="absolute left-1/2 top-1/2 flex"
				style={{ transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: "center" }}
			>
				<Presence avatar={avatar} state={state} mode={mode} energy={energy} />
			</span>
		</span>
	);
}

function sameSessionRailItemProps(prev: SessionRailItemProps, next: SessionRailItemProps): boolean {
	return (
		sameSessionItem(prev.item, next.item) &&
		prev.selected === next.selected &&
		prev.onSessionClick === next.onSessionClick &&
		prev.onSessionContextMenu === next.onSessionContextMenu &&
		prev.sessionPresence === next.sessionPresence &&
		prev.renaming === next.renaming &&
		prev.onRenameItem === next.onRenameItem &&
		prev.threaded === next.threaded
	);
}

function sameRepoGroup(prev: RepoGroup, next: RepoGroup): boolean {
	if (prev === next) return true;
	if (prev.repo !== next.repo || prev.branch !== next.branch || prev.dot !== next.dot) return false;
	if (prev.worktree !== next.worktree) return false;
	if (prev.collapseAfter !== next.collapseAfter) return false;
	if (prev.items.length !== next.items.length) return false;
	for (let i = 0; i < prev.items.length; i++) {
		if (!sameSessionItem(prev.items[i]!, next.items[i]!)) return false;
	}
	return true;
}

function sameGroupSelection(prev: SessionRailGroupProps, next: SessionRailGroupProps): boolean {
	if (prev.selectedIds === next.selectedIds) return true;
	if (prev.group.items.length !== next.group.items.length) return false;
	for (let i = 0; i < prev.group.items.length; i++) {
		const prevItem = prev.group.items[i]!;
		const nextItem = next.group.items[i]!;
		if (prevItem.id !== nextItem.id) return false;
		if (prev.selectedIds.has(prevItem.id) !== next.selectedIds.has(nextItem.id)) return false;
	}
	return true;
}

function sameSessionRailGroupProps(prev: SessionRailGroupProps, next: SessionRailGroupProps): boolean {
	return (
		prev.groupKey === next.groupKey &&
		sameRepoGroup(prev.group, next.group) &&
		prev.open === next.open &&
		prev.expanded === next.expanded &&
		prev.onToggleExpanded === next.onToggleExpanded &&
		prev.collapseAfter === next.collapseAfter &&
		prev.onToggleGroup === next.onToggleGroup &&
		prev.onSessionClick === next.onSessionClick &&
		prev.onSessionContextMenu === next.onSessionContextMenu &&
		prev.onGroupContextMenu === next.onGroupContextMenu &&
		prev.groupAction === next.groupAction &&
		prev.sessionPresence === next.sessionPresence &&
		prev.renamingItemId === next.renamingItemId &&
		prev.onRenameItem === next.onRenameItem &&
		prev.style === next.style &&
		sameGroupSelection(prev, next)
	);
}

/** Build a flat ordered list of all item IDs from all groups. */
function flattenItemIds(groups: readonly RepoGroup[]): readonly string[] {
	const ids: string[] = [];
	for (const g of groups) {
		for (const item of g.items) {
			ids.push(item.id);
		}
	}
	return ids;
}

function flattenItems(groups: readonly RepoGroup[]): readonly SessionItem[] {
	return groups.flatMap(g => g.items);
}
const DEFAULT_COLLAPSE_AFTER = 5;
const EXPANDED_STORE_KEY = "fraym.session-rail.expanded-groups";

function loadExpandedGroups(): Record<string, boolean> {
	if (typeof window === "undefined") return {};
	try {
		return JSON.parse(window.localStorage.getItem(EXPANDED_STORE_KEY) ?? "{}") as Record<string, boolean>;
	} catch {
		return {};
	}
}

function storeExpandedGroups(map: Record<string, boolean>): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(EXPANDED_STORE_KEY, JSON.stringify(map));
	} catch {
		// storage unavailable (private mode) — expansion still holds in-session
	}
}

export function SessionRail({
	brand,
	tabs,
	actions,
	sessionBar,
	groups,
	collapseAfter,
	compact,
	style = "classic",
	footer,
	onSessionClick,
	onSessionContextMenu,
	onSessionMultiContextMenu,
	onGroupContextMenu,
	groupAction,
	sessionPresence,
	renamingItemId,
	onRenameItem,
	className,
}: SessionRailProps) {
	const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
	const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(loadExpandedGroups);
	const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
	const lastClickedId = useRef<string | null>(null);
	const selectedRef = useRef(selectedIds);
	selectedRef.current = selectedIds;
	const groupsRef = useRef(groups);
	groupsRef.current = groups;
	const computedAllIds = useMemo(() => flattenItemIds(groups), [groups]);
	const allIdsRef = useRef(computedAllIds);
	if (!sameStringList(allIdsRef.current, computedAllIds)) {
		allIdsRef.current = computedAllIds;
	}
	const allIds = allIdsRef.current;

	// Prune selection when groups change — items may have been filtered out
	const prevAllIds = useRef(allIds);
	if (prevAllIds.current !== allIds) {
		prevAllIds.current = allIds;
		setSelectedIds(prev => {
			const next = new Set(prev);
			let changed = false;
			for (const id of prev) {
				if (!allIds.includes(id)) {
					next.delete(id);
					changed = true;
				}
			}
			if (lastClickedId.current && !allIds.includes(lastClickedId.current)) {
				lastClickedId.current = null;
			}
			return changed ? next : prev;
		});
	}

	const handleSessionClick = useCallback(
		(item: SessionItem, event: React.MouseEvent<HTMLButtonElement>) => {
			const isModifier = event.ctrlKey || event.metaKey || event.shiftKey;
			if (isModifier) {
				event.preventDefault();
			}

			if (event.ctrlKey || event.metaKey) {
				// Ctrl/Cmd+Click: toggle this item in/out of selection
				setSelectedIds(prev => {
					const next = new Set(prev);
					if (next.has(item.id)) {
						next.delete(item.id);
					} else {
						next.add(item.id);
					}
					return next;
				});
				lastClickedId.current = item.id;
				return;
			}

			if (event.shiftKey && lastClickedId.current) {
				// Shift+Click: select range from last-clicked item to this item
				const currentAllIds = allIdsRef.current;
				const lastIndex = currentAllIds.indexOf(lastClickedId.current);
				const thisIndex = currentAllIds.indexOf(item.id);
				if (lastIndex !== -1 && thisIndex !== -1) {
					const [start, end] = lastIndex <= thisIndex ? [lastIndex, thisIndex] : [thisIndex, lastIndex];
					setSelectedIds(prev => {
						const next = new Set(prev);
						let changed = false;
						for (let i = start; i <= end; i++) {
							if (!next.has(currentAllIds[i]!)) {
								next.add(currentAllIds[i]!);
								changed = true;
							}
						}
						return changed ? next : prev;
					});
				}
				return;
			}

			// Plain click: clear multi-selection if any, then normal select
			const currentSelected = selectedRef.current;
			if (currentSelected.size > 0) {
				setSelectedIds(new Set());
			}
			lastClickedId.current = item.id;
			onSessionClick?.(item);
		},
		[onSessionClick],
	);

	const handleSessionContextMenu = useCallback(
		(item: SessionItem, event: React.MouseEvent<HTMLButtonElement>) => {
			const currentSelectedIds = selectedRef.current;
			if (currentSelectedIds.size > 1 && currentSelectedIds.has(item.id) && onSessionMultiContextMenu) {
				const allItems = flattenItems(groupsRef.current);
				const selectedItems = allItems.filter(i => currentSelectedIds.has(i.id));
				onSessionMultiContextMenu(item, selectedItems, event);
				return;
			}
			onSessionContextMenu?.(item, event);
		},
		[onSessionContextMenu, onSessionMultiContextMenu],
	);

	const toggleGroup = useCallback((key: string) => {
		setClosedGroups(current => ({ ...current, [key]: !current[key] }));
	}, []);
	const toggleGroupExpanded = useCallback((key: string) => {
		setExpandedGroups(current => {
			const next = { ...current, [key]: !current[key] };
			storeExpandedGroups(next);
			return next;
		});
	}, []);
	const effectiveCollapseAfter = collapseAfter ?? DEFAULT_COLLAPSE_AFTER;
	// Preserve the list's scroll offset across re-renders. Selecting a session
	// recreates the group/item objects, and with `content-visibility: auto` on each
	// row (theme.css) the browser can drop its scroll anchor and snap the list back
	// to the top — the "click a session and I lose my place" bug. We record the last
	// user scroll offset and restore it in a layout effect (before paint, so there's
	// no visible jump) whenever a render reset it.
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const scrollTopRef = useRef(0);
	const rememberScroll = useCallback(() => {
		const el = scrollContainerRef.current;
		if (el) scrollTopRef.current = el.scrollTop;
	}, []);
	useLayoutEffect(() => {
		const el = scrollContainerRef.current;
		if (el && el.scrollTop !== scrollTopRef.current) el.scrollTop = scrollTopRef.current;
	});
	const content = (
		<>
			{brand}
			{tabs}
			{actions}
			<div className="h-px mx-4 my-2.5 bg-fr-border-soft" />
			{sessionBar}
			<div ref={scrollContainerRef} onScroll={rememberScroll} className="flex-1 overflow-y-auto px-2 pb-3 min-h-0">
				{groups.map((g, gi) => {
					const key = repoGroupKey(g, gi);
					if (compact) {
						return (
							<CompactRailGroup
								key={key}
								group={g}
								onSessionClick={handleSessionClick}
								onSessionContextMenu={handleSessionContextMenu}
								selectedIds={selectedIds}
								sessionPresence={sessionPresence}
								threaded={style === "threaded"}
							/>
						);
					}
					const open = !closedGroups[key];
					return (
						<SessionRailGroup
							key={key}
							group={g}
							groupKey={key}
							open={open}
							onToggleGroup={toggleGroup}
							expanded={!!expandedGroups[key]}
							onToggleExpanded={toggleGroupExpanded}
							collapseAfter={effectiveCollapseAfter}
							onSessionClick={handleSessionClick}
							onSessionContextMenu={handleSessionContextMenu}
							onGroupContextMenu={onGroupContextMenu}
							selectedIds={selectedIds}
							groupAction={groupAction}
							sessionPresence={sessionPresence}
							renamingItemId={renamingItemId}
							onRenameItem={onRenameItem}
							style={style}
						/>
					);
				})}
			</div>
			{footer}
		</>
	);
	return (
		<RailCompactContext.Provider value={!!compact}>
			<aside
				data-slot="session-rail"
				data-compact={compact ? "" : undefined}
				className={cn("flex flex-col border-r border-fr-border-soft bg-fr-rail min-h-0", className)}
			>
				<TooltipProvider delayDuration={compact ? 350 : 700}>{content}</TooltipProvider>
			</aside>
		</RailCompactContext.Provider>
	);
}

export interface SessionBarProps {
	readonly scope: React.ReactNode;
	readonly icon?: IconName | null;
	readonly actions?: React.ReactNode;
	readonly className?: string;
}

export function SessionBar({ scope, icon = "code", actions, className }: SessionBarProps) {
	const compact = useRailCompact();
	return (
		<div
			data-slot="session-bar"
			className={cn(
				"flex items-center gap-1.5 px-2.5 pt-1 pb-0.5 text-fr-text-2",
				compact && "justify-center",
				className,
			)}
		>
			<span className={cn("rail-label flex min-w-0 flex-1 items-center gap-1.5 text-fr-xs", compact && "hidden")}>
				{icon && <Icon name={icon} size={11} strokeWidth={1.8} className="shrink-0 opacity-70" />}
				<span className="fr-overflow">{scope}</span>
			</span>
			{actions}
		</div>
	);
}

export interface MiniButtonProps extends React.ComponentProps<"button"> {
	readonly icon: IconName;
	readonly active?: boolean;
	readonly strokeWidth?: number;
}

export function MiniButton({ icon, active, strokeWidth = 1.8, className, children, ...props }: MiniButtonProps) {
	const compact = useRailCompact();
	const label = props["aria-label"];
	const button = (
		<button
			type="button"
			data-slot="mini-button"
			className={cn(
				"flex size-6 shrink-0 items-center justify-center rounded-md text-fr-text-3 transition-colors duration-[120ms]",
				"hover:bg-fr-surface hover:text-fr-text",
				active && "bg-fr-surface-2 text-fr-accent",
				className,
			)}
			{...props}
		>
			<Icon name={icon} size={14} strokeWidth={strokeWidth} />
			{children}
		</button>
	);
	if (compact && label) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>{button}</TooltipTrigger>
				<TooltipContent side="right">{label}</TooltipContent>
			</Tooltip>
		);
	}
	return button;
}

export interface RailButtonProps extends React.ComponentProps<"button"> {
	readonly icon: IconName;
	readonly kbd?: string;
	readonly primary?: boolean;
	readonly active?: boolean;
	readonly strokeWidth?: number;
}

export function RailButton({
	icon,
	kbd,
	primary,
	active,
	strokeWidth = 1.7,
	className,
	children,
	...props
}: RailButtonProps) {
	const compact = useRailCompact();
	const button = (
		<button
			type="button"
			data-slot="rail-button"
			className={cn(
				"rail-btn flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-fr-base text-fr-text-2 transition-colors duration-[120ms]",
				"hover:bg-fr-surface hover:text-fr-text",
				primary && "primary font-medium text-fr-text",
				active && "bg-fr-surface-2 text-fr-accent",
				compact && "h-9 justify-center gap-0",
				className,
			)}
			{...props}
		>
			<Icon name={icon} size={15} strokeWidth={strokeWidth} className="shrink-0 opacity-[0.85]" />
			<span className="rail-label flex min-w-0 flex-1 items-center">{children}</span>
			{kbd && <span className="kbd rail-label ml-auto text-fr-2xs text-fr-text-3">{kbd}</span>}
		</button>
	);
	if (compact) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>{button}</TooltipTrigger>
				<TooltipContent side="right">{children}</TooltipContent>
			</Tooltip>
		);
	}
	return button;
}
