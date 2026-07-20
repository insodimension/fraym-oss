import { SESSION_COLLAPSE_ALL, SESSION_COLLAPSE_LIMITS } from "@fraym/config";
import { useState } from "react";
import { PopoverDivider, PopoverHeading, PopoverPanel, PopoverRow, revealLabel, Scrim, Slider } from "../elements";
import { Icon } from "../icons";
import { cn } from "../lib/cn";
import type { SessionFilters } from "./types";

type FilterKey = keyof SessionFilters;

interface FilterRowDef {
	readonly key: FilterKey;
	readonly label: string;
	readonly value: string;
	readonly changed: boolean;
	readonly options: readonly {
		readonly key: string;
		readonly label: string;
		readonly selected: boolean;
		readonly apply: () => void;
	}[];
}

const ACTIVITY_OPTIONS: readonly SessionFilters["activity"][] = ["1h", "6h", "12h", "1d", "3d", "7d", "30d", "All"];

const SORT_OPTIONS: readonly SessionFilters["sort"][] = ["Activity", "Updated", "Created", "Name"];
/** Menu labels for sort modes — the union values stay terse; the rail surfaces these. */
const SORT_LABELS: Record<SessionFilters["sort"], string> = {
	Activity: "Activity",
	Updated: "Last updated",
	Created: "Created",
	Name: "Name",
};
/** Collapse-limit label: the "All" sentinel reads as "All", every other preset as its count. */
const collapseLabel = (value: number): string => (value >= SESSION_COLLAPSE_ALL ? "All" : String(value));

const SUBMENU_WIDTH = 176;
const SUBMENU_MAX_HEIGHT = 360;

/** Position a fly-out submenu just past the right edge of its parent row, clamped
 *  into the viewport. A 2px overlap keeps a continuous hover target (no dead gap). */
function submenuStyle(rect: DOMRect | null): React.CSSProperties {
	if (!rect) return {};
	return {
		left: Math.max(8, Math.min(rect.right - 2, window.innerWidth - SUBMENU_WIDTH - 8)),
		top: Math.max(8, Math.min(rect.top - 6, window.innerHeight - SUBMENU_MAX_HEIGHT - 8)),
		maxHeight: SUBMENU_MAX_HEIGHT,
	};
}

export function FilterMenu({
	filters,
	baseline,
	projects,
	scopedProject,
	anchorRect,
	onChange,
	onClearAll,
	onClose,
}: {
	readonly filters: SessionFilters;
	readonly baseline: SessionFilters;
	readonly projects: readonly string[];
	/** When set, the menu is scoped to one project: the project/group-by rows are hidden
	 *  and the menu edits that project's OVERRIDE (Clear reverts the override to global). */
	readonly scopedProject?: string;
	readonly anchorRect: DOMRect | null;
	readonly onChange: (filters: SessionFilters) => void;
	/** Global (non-scoped) menu only: also wipe ALL per-project overrides on "Clear filters" —
	 *  the escape hatch for a project stranded by its own scoped override. Omitted when scoped. */
	readonly onClearAll?: () => void;
	readonly onClose: () => void;
}) {
	const [open, setOpen] = useState<{ key: FilterKey; rect: DOMRect } | null>(null);

	const buildRow = <K extends FilterKey>(
		key: K,
		label: string,
		options: readonly SessionFilters[K][],
		format: (value: SessionFilters[K]) => string = value => String(value),
	): FilterRowDef => ({
		key,
		label,
		value: format(filters[key]),
		changed: filters[key] !== baseline[key],
		options: options.map(option => ({
			key: String(option),
			label: format(option),
			selected: filters[key] === option,
			apply: () => {
				if (filters[key] !== option) onChange({ ...filters, [key]: option } as SessionFilters);
			},
		})),
	});

	const scoped = scopedProject != null && scopedProject !== "All";
	const rows: readonly FilterRowDef[] = [
		buildRow("status", "Status", ["Active", "Done", "Archived", "All"]),
		...(scoped ? [] : [buildRow("project", "Project", ["All", ...projects])]),
		buildRow("activity", "Last activity", ACTIVITY_OPTIONS),
		...(scoped ? [] : [buildRow("group", "Group by", ["Project", "Flat"])]),
		buildRow("sort", "Sort by", SORT_OPTIONS, value => SORT_LABELS[value]),
		// Display density, not a filter: a second branch/worktree line per row.
		// Global-only (like Group by) — per-project overrides exclude it.
		...(scoped ? [] : [buildRow("metadata", "Metadata", ["Hide", "Show"])]),
		buildRow("collapseAfter", "Show", SESSION_COLLAPSE_LIMITS, collapseLabel),
	];

	const activeRow = open ? rows.find(row => row.key === open.key) : undefined;

	return (
		<>
			<Scrim onClick={onClose} />
			<PopoverPanel data-slot="filter-menu" width={236} anchorRect={anchorRect} place="below">
				<PopoverHeading>{scoped ? scopedProject : "Filters"}</PopoverHeading>
				{rows.map(row => (
					<PopoverRow
						key={row.key}
						label={row.label}
						value={row.value}
						valueAccent={row.changed || open?.key === row.key}
						chevron
						className={open?.key === row.key ? "bg-fr-surface-2" : undefined}
						onMouseEnter={event => setOpen({ key: row.key, rect: event.currentTarget.getBoundingClientRect() })}
						onClick={event => setOpen({ key: row.key, rect: event.currentTarget.getBoundingClientRect() })}
					/>
				))}
				<PopoverDivider />
				<PopoverRow
					label="Clear filters"
					onMouseEnter={() => setOpen(null)}
					onClick={() => {
						onChange(baseline);
						onClearAll?.();
						setOpen(null);
					}}
				/>
			</PopoverPanel>
			{activeRow && open && (
				<PopoverPanel
					data-slot="filter-submenu"
					width={SUBMENU_WIDTH}
					style={submenuStyle(open.rect)}
					className="overflow-y-auto"
				>
					{activeRow.key === "activity" ? (
						<div className="px-2 py-2.5">
							<div className="mb-2 flex items-center justify-between px-0.5 text-fr-2xs">
								<span className="text-fr-text-3">Last activity</span>
								<span className="text-fr-text-2">
									{filters.activity === "All" ? "Any time" : `Within ${filters.activity}`}
								</span>
							</div>
							<Slider
								aria-label="Last activity window"
								steps={ACTIVITY_OPTIONS.map(option => ({ value: option, label: option }))}
								value={filters.activity}
								onValueChange={(value: string) =>
									onChange({ ...filters, activity: value as SessionFilters["activity"] })
								}
								startLabel="1h"
								endLabel="All"
							/>
						</div>
					) : (
						activeRow.options.map(option => (
							<PopoverRow
								key={option.key}
								label={option.label}
								selected={option.selected}
								onClick={option.apply}
							/>
						))
					)}
				</PopoverPanel>
			)}
		</>
	);
}

export function SessionContextMenu({
	anchorRect,
	title,
	archived,
	onRename,
	onToggleArchive,
	pinned,
	onTogglePin,
	onDelete,
	onCopySessionId,
	onCopyDeeplink,
	worktree,
	onMoveToWorktree,
	onOpenInExplorer,
	onClose,
}: {
	readonly anchorRect: DOMRect | null;
	readonly title: string;
	readonly archived: boolean;
	readonly onRename: () => void;
	readonly onToggleArchive: () => void;
	readonly pinned: boolean;
	readonly onTogglePin: () => void;
	readonly onDelete?: () => void;
	readonly onCopySessionId: () => void;
	readonly onCopyDeeplink: () => void;
	readonly worktree?: boolean;
	readonly onMoveToWorktree?: () => void;
	readonly onOpenInExplorer?: () => void;
	readonly onClose: () => void;
}) {
	return (
		<>
			<Scrim onClick={onClose} />
			<PopoverPanel data-slot="session-context-menu" width={236} anchorRect={anchorRect} place="below">
				<div className="fr-overflow px-2.5 pt-2 pb-[5px] font-secondary text-fr-2xs uppercase tracking-fr-label text-fr-text-3">
					{title}
				</div>
				<PopoverRow icon={<Icon name="edit" size={15} />} label="Rename session" onClick={onRename} />
				<PopoverRow
					icon={<Icon name="archive" size={15} />}
					label={archived ? "Unarchive session" : "Archive session"}
					onClick={onToggleArchive}
				/>
				<PopoverDivider />
				<PopoverRow icon={<Icon name="copy" size={15} />} label="Copy session ID" onClick={onCopySessionId} />
				<PopoverRow icon={<Icon name="link" size={15} />} label="Copy deeplink" onClick={onCopyDeeplink} />
				<PopoverDivider />
				<PopoverRow
					icon={<Icon name="pin" size={15} />}
					label={pinned ? "Unpin session" : "Pin session"}
					onClick={onTogglePin}
				/>
				{!worktree && onMoveToWorktree && (
					<PopoverRow
						icon={<Icon name="git-branch" size={15} />}
						label="Move to worktree"
						onClick={onMoveToWorktree}
					/>
				)}
				{onOpenInExplorer && (
					<PopoverRow icon={<Icon name="folder" size={15} />} label={revealLabel()} onClick={onOpenInExplorer} />
				)}
				{onDelete && (
					<>
						<PopoverDivider />
						<PopoverRow
							icon={<Icon name="trash" size={15} />}
							label="Delete session"
							className="text-fr-del hover:bg-fr-del-bg"
							onClick={onDelete}
						/>
					</>
				)}
			</PopoverPanel>
		</>
	);
}

/** Context menu shown when right-clicking a multi-selection of sessions.
 *  Only shows "Delete N sessions" — other actions don't apply to bulk selection. */
export function SessionMultiContextMenu({
	anchorRect,
	count,
	onDelete,
	onClose,
}: {
	readonly anchorRect: DOMRect | null;
	readonly count: number;
	readonly onDelete: () => void;
	readonly onClose: () => void;
}) {
	return (
		<>
			<Scrim onClick={onClose} />
			<PopoverPanel data-slot="session-context-menu" width={236} anchorRect={anchorRect} place="below">
				<PopoverHeading className="fr-overflow">{count} sessions selected</PopoverHeading>
				<PopoverRow
					icon={<Icon name="trash" size={15} />}
					label={`Delete ${count} session${count === 1 ? "" : "s"}`}
					className="text-fr-del hover:bg-fr-del-bg"
					onClick={onDelete}
				/>
			</PopoverPanel>
		</>
	);
}
/** Context menu shown when right-clicking a project group header in the session
 *  rail: copy the workspace path, and (desktop) reveal it in Finder/Explorer. */
export function ProjectContextMenu({
	anchorRect,
	repo,
	path,
	onCopyPath,
	onOpenInExplorer,
	onClose,
}: {
	readonly anchorRect: DOMRect | null;
	readonly repo: string;
	readonly path: string;
	readonly onCopyPath: () => void;
	readonly onOpenInExplorer?: () => void;
	readonly onClose: () => void;
}) {
	return (
		<>
			<Scrim onClick={onClose} />
			<PopoverPanel data-slot="project-context-menu" width={236} anchorRect={anchorRect} place="below">
				<div className="fr-overflow px-2.5 pt-2 pb-[5px] font-secondary text-fr-2xs uppercase tracking-fr-label text-fr-text-3">
					{repo}
				</div>
				<div className="fr-overflow break-all px-2.5 pb-1.5 font-secondary text-fr-2xs text-fr-text-3" title={path}>
					{path}
				</div>
				<PopoverRow icon={<Icon name="copy" size={15} />} label="Copy path" onClick={onCopyPath} />
				{onOpenInExplorer && (
					<PopoverRow icon={<Icon name="folder" size={15} />} label={revealLabel()} onClick={onOpenInExplorer} />
				)}
			</PopoverPanel>
		</>
	);
}

export function UserAvatar({
	userName,
	userAvatarUrl,
	className,
	fallback = "U",
}: {
	readonly userName: string;
	readonly userAvatarUrl?: string;
	readonly className?: string;
	readonly fallback?: string;
}) {
	const [failed, setFailed] = useState(false);
	const initial = userName.trim()[0]?.toUpperCase() ?? fallback;
	if (userAvatarUrl && !failed) {
		return (
			<img
				src={userAvatarUrl}
				alt=""
				className={cn("shrink-0 rounded-lg object-cover", className)}
				onError={() => setFailed(true)}
			/>
		);
	}
	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#3a2d57] to-fr-accent text-xs font-semibold text-white",
				className,
			)}
		>
			{initial}
		</div>
	);
}

export function UserMenu({
	anchorRect,
	userName,
	userAvatarUrl,
	userEmail,
	planLabel,
	productLabel,
	onSettings,
	onClose,
}: {
	readonly anchorRect: DOMRect | null;
	readonly userName: string;
	readonly userAvatarUrl?: string;
	readonly userEmail: string;
	readonly planLabel: string;
	readonly productLabel: string;
	readonly onSettings: () => void;
	readonly onClose: () => void;
}) {
	const style = anchorRect
		? {
				left: Math.max(8, anchorRect.left),
				bottom: Math.max(8, window.innerHeight - anchorRect.top + 8),
			}
		: undefined;
	return (
		<>
			<div className="fixed inset-0 z-40" onClick={onClose} />
			<div
				data-slot="user-menu"
				className="fixed bottom-16 left-2 z-50 w-[252px] rounded-xl border border-fr-border bg-fr-surface p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.5)] animate-[fr-pop-in_0.12s_ease]"
				style={style}
			>
				<div className="flex items-center gap-2.5 px-2.5 py-2">
					<UserAvatar userName={userName} userAvatarUrl={userAvatarUrl} className="size-[30px]" fallback="U" />
					<div>
						<div className="text-fr-sm">{userEmail}</div>
						<div className="font-secondary text-fr-2xs text-fr-text-3">
							{productLabel} - {planLabel}
						</div>
					</div>
				</div>
				<PopoverDivider />
				<PopoverRow icon={<Icon name="gear" size={15} />} label="Settings" kbd="Cmd+," onClick={onSettings} />
			</div>
		</>
	);
}
