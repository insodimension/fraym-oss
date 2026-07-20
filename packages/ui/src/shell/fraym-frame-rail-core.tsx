import { type BenchId, type LayoutConfig, resolveBenchLayout, sortRailItems } from "@fraym/config";
import type { AgentChoice, WorkspaceRef } from "@fraym/driver";
import type { AvatarId, AvatarMode, AvatarState } from "@fraym/vibr";
import { type MouseEvent, memo, type RefObject, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RailMode } from "../components/app-shell";
import { FraymBrandMark } from "../components/fraym-brand-mark";
import { PopoverHeading, PopoverPanel, PopoverRow, Scrim } from "../elements";
import { Tabs, TabsList, TabsTrigger } from "../elements/tabs";
import {
	MiniButton,
	RailButton,
	RailPresence,
	type RepoGroup,
	SessionBar,
	type SessionItem,
	SessionRail,
	useRailCompact,
} from "../features/session-rail/session-rail";
import type { RailVibr } from "../hooks/use-live-session-vibrs";
import { Icon } from "../icons/icon";
import { cn } from "../lib/cn";
import { useSettings } from "../settings/use-settings";
import { UserAvatar } from "./menus";
import type { ShellIntent } from "./space/intents";
import type { SpaceUiDef } from "./space/space-def";
import { SURFACE, type SurfaceId } from "./space/space-state";
import type { AppMode, MenuState, RailActionDef } from "./types";

export interface FraymFrameRailProps {
	readonly version: string;
	readonly appMode: AppMode;
	readonly railMode: RailMode;
	readonly onToggleCompact: () => void;
	/** The registered spaces, ordered and already deployment-filtered — the
	 *  space switcher renders from it; the active def's `rail.actions` is the
	 *  content-layer action registry (step ③: data replaced the arrays). */
	readonly spaces: readonly SpaceUiDef[];
	readonly projectLabel: string;
	readonly menu: MenuState;
	readonly sessionSearchOpen: boolean;
	readonly sessionSearch: string;
	readonly searchInputRef: RefObject<HTMLInputElement | null>;
	readonly groups: readonly RepoGroup[];
	readonly avatar: AvatarId;
	/** Live vibr of the active session — the rail mirrors it onto that session's dot. */
	readonly vibrState: AvatarState;
	readonly vibrMode: AvatarMode;
	readonly energy: number;
	/** Master rail-vibr toggle: when false, every row uses the colored radiating status dot. */
	readonly railVibr: boolean;
	/** Opt-in: animate the live vibr for EVERY running row, not just the active one. */
	readonly railVibrAllSessions: boolean;
	/** Live vibr of background running sessions, keyed by `SessionItem.id`. Empty unless opted in. */
	readonly sessionVibrs: ReadonlyMap<string, RailVibr>;
	readonly userName: string;
	readonly userAvatarUrl?: string;
	readonly planLabel: string;
	readonly productLabel: string;
	readonly onAppModeChange: (mode: AppMode) => void;
	readonly onNewSession?: (workspace?: WorkspaceRef) => void;
	/** Discovered agents for the secret creation-time picker (ctrl/⌘-click New Session).
	 *  Empty/absent → the gesture just creates a normal session. */
	readonly newSessionAgents?: readonly AgentChoice[];
	/** Create a new session AS a chosen agent (ctrl/⌘-click New Session → pick). */
	readonly onNewSessionAs?: (agentName: string, workspace?: WorkspaceRef) => void;
	/** ONE navigation channel: every rail action emits a typed ShellIntent
	 *  (doc 44 §5); the shell's executor is the single writer. */
	readonly onIntent: (intent: ShellIntent) => void;
	/** The active space's mounted workspace surface — active-state highlighting
	 *  is an identity match (doc 44 §12.2). */
	readonly activeSurface: SurfaceId;
	readonly onSessionSearchChange: (value: string) => void;
	readonly onSessionSearchOpenChange: (open: boolean | ((current: boolean) => boolean)) => void;
	readonly onOpenFilterMenu: (event: MouseEvent<HTMLButtonElement>) => void;
	readonly onOpenProjectFilter?: (project: string, event: MouseEvent<HTMLButtonElement>) => void;
	readonly onSessionSelect?: (item: SessionItem) => void;
	readonly onSessionContextMenu: (item: SessionItem, event: MouseEvent<HTMLButtonElement>) => void;
	readonly onSessionMultiContextMenu?: (
		item: SessionItem,
		selectedItems: readonly SessionItem[],
		event: MouseEvent<HTMLButtonElement>,
	) => void;
	/** Right-click on a project group header — opens the project context menu. */
	readonly onGroupContextMenu?: (group: RepoGroup, event: MouseEvent<HTMLButtonElement>) => void;
	readonly onOpenUserMenu: (event: MouseEvent<HTMLButtonElement>) => void;
	readonly renamingItemId?: string | null;
	readonly onRenameItem?: (item: SessionItem, value: string | null) => void;
}

const FraymRailBrand = memo(function FraymRailBrand({
	version,
	compact,
	onToggle,
}: {
	readonly version: string;
	readonly compact: boolean;
	readonly onToggle: () => void;
}) {
	if (compact) {
		return (
			<div className="flex items-center justify-center px-2 pt-4 pb-3">
				<button
					type="button"
					aria-label="Expand sidebar"
					onClick={onToggle}
					className="flex size-8 items-center justify-center rounded-md text-fr-text-3 transition-colors duration-[120ms] hover:bg-fr-surface hover:text-fr-text"
				>
					<FraymBrandMark size={22} />
				</button>
			</div>
		);
	}
	return (
		<div className="flex h-[52px] shrink-0 items-center px-4">
			<FraymBrandMark size={24} />
			<span
				className="rail-label ml-auto max-w-[140px] fr-overflow rounded-md border border-fr-border px-1.5 py-px text-fr-2xs text-fr-text-3"
				title={version}
			>
				{version}
			</span>
		</div>
	);
});

/**
 * Full-width segmented control of equal thirds, aligned with the rail rows
 * below. The active highlight is a single "thumb" element measured to the live
 * tab and CSS-transitioned, so switching slides the light across instead of
 * re-toggling per-tab backgrounds — nothing remounts, the highlight just moves.
 */
const FraymModeTabs = memo(function FraymModeTabs({
	appMode,
	spaces,
	compact,
	onAppModeChange,
}: {
	readonly appMode: AppMode;
	readonly spaces: readonly SpaceUiDef[];
	readonly compact: boolean;
	readonly onAppModeChange: (mode: AppMode) => void;
}) {
	const tabs = spaces;
	const wrapRef = useRef<HTMLDivElement>(null);
	const [thumb, setThumb] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
	const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
	const activeTab = tabs.find(tab => tab.id === appMode) ?? tabs[0];

	// Track the active trigger with a single highlight element. Re-runs on tab
	// switch (appMode), tab-set change (tabs.length), and the compact flip (the
	// list turns vertical); a ResizeObserver keeps it aligned through rail/window
	// resizes, including the width morph.
	// biome-ignore lint/correctness/useExhaustiveDependencies: compact drives the list orientation via CSS (horizontal↔vertical), so the thumb must re-measure when it flips — a DOM-layout dependency the analyzer can't infer.
	useLayoutEffect(() => {
		if (tabs.length === 0) return;
		if (tabs.length > 4) {
			setThumb(null);
			return;
		}
		const update = () => {
			const list = wrapRef.current?.querySelector<HTMLElement>('[data-slot="tabs-list"]');
			const active = list?.querySelector<HTMLElement>(`[data-value="${appMode}"]`);
			if (!list || !active) return;
			const lr = list.getBoundingClientRect();
			const ar = active.getBoundingClientRect();
			setThumb({
				x: ar.left - lr.left - list.clientLeft,
				y: ar.top - lr.top - list.clientTop,
				w: ar.width,
				h: ar.height,
			});
		};
		update();
		if (typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(update);
		const wrap = wrapRef.current;
		if (wrap) ro.observe(wrap);
		return () => ro.disconnect();
	}, [appMode, compact, tabs.length]);

	if (tabs.length <= 1) return null;
	if (tabs.length > 4 && activeTab) {
		return (
			<div data-slot="rail-mode-menu" className={cn("mb-2.5", compact ? "mx-1" : "mx-3")}>
				<button
					type="button"
					aria-label={`Switch space. Current space: ${activeTab.label}`}
					aria-haspopup="menu"
					aria-expanded={Boolean(menuRect)}
					onClick={event => setMenuRect(current => (current ? null : event.currentTarget.getBoundingClientRect()))}
					className={cn(
						"flex w-full items-center rounded-[8px] border border-fr-border bg-fr-surface px-2.5 text-fr-text transition-colors duration-[var(--fr-motion-fast)] hover:bg-fr-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fr-accent-line",
						compact ? "h-9 justify-center px-0" : "h-8 gap-2",
					)}
				>
					<Icon name={activeTab.icon} size={16} strokeWidth={2} />
					<span className={cn("rail-label min-w-0 flex-1 text-left text-fr-xs font-medium", compact && "hidden")}>
						{activeTab.label}
					</span>
					<Icon
						name="arrowR"
						size={14}
						strokeWidth={2}
						className={cn("rail-label rotate-90", compact && "hidden")}
					/>
				</button>
				{menuRect ? (
					<>
						<Scrim onClick={() => setMenuRect(null)} />
						<PopoverPanel
							data-slot="space-switcher-menu"
							role="menu"
							aria-label="Spaces"
							anchorRect={menuRect}
							place="below"
							width={compact ? 220 : 240}
						>
							<PopoverHeading>Spaces</PopoverHeading>
							{tabs.map(tab => {
								const selected = tab.id === appMode;
								return (
									<button
										key={tab.id}
										type="button"
										role="menuitemradio"
										aria-checked={selected}
										onClick={() => {
											setMenuRect(null);
											onAppModeChange(tab.id);
										}}
										className={cn(
											"flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-fr-sm text-fr-text transition-colors duration-[var(--fr-motion-fast)] hover:bg-fr-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fr-accent-line",
											selected && "bg-fr-surface-2",
										)}
									>
										<Icon name={tab.icon} size={15} strokeWidth={2} className="shrink-0 text-fr-text-2" />
										<span className="min-w-0 flex-1 fr-overflow">{tab.label}</span>
										{selected ? (
											<Icon name="check" size={14} strokeWidth={2} className="shrink-0 text-fr-accent" />
										) : null}
									</button>
								);
							})}
						</PopoverPanel>
					</>
				) : null}
			</div>
		);
	}
	return (
		<div ref={wrapRef} data-slot="rail-mode-tabs" className={cn("mb-2.5", compact ? "mx-1" : "mx-3")}>
			<Tabs value={appMode} onValueChange={value => onAppModeChange(value as AppMode)}>
				<TabsList className={cn("relative w-full gap-1", compact && "flex-col")}>
					{thumb && (
						<span
							aria-hidden
							className="pointer-events-none absolute left-0 top-0 rounded-[6px] bg-fr-surface-3 transition-[transform,width,height] duration-200 ease-out"
							style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)`, width: thumb.w, height: thumb.h }}
						/>
					)}
					{tabs.map(tab => (
						<TabsTrigger
							key={tab.id}
							value={tab.id}
							data-value={tab.id}
							className={cn(
								"relative z-10 gap-1.5 [&_svg]:size-4 data-[state=active]:bg-transparent",
								compact ? "h-9 w-full justify-center gap-0" : "h-7 flex-1",
							)}
						>
							<Icon name={tab.icon} strokeWidth={2} />
							<span className="rail-label">{tab.label}</span>
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>
		</div>
	);
});

/** Build the next user-layer {@link LayoutConfig} with one rail item's enable state
 *  toggled for `bench`. Deep-copies the existing document so other benches, the global
 *  layer, and sibling rail items are preserved; merges onto any existing state for `id`
 *  (keeping its `order`). The rail-customize popover is the only writer of this facet. */
function nextRailLayout(current: LayoutConfig | undefined, bench: BenchId, id: string, enabled: boolean): LayoutConfig {
	const benches = { ...current?.benches };
	const benchLayout = benches[bench] ?? {};
	const rail = benchLayout.rail ? [...benchLayout.rail] : [];
	const index = rail.findIndex(item => item.id === id);
	if (index >= 0) rail[index] = { ...rail[index], id, enabled };
	else rail.push({ id, enabled });
	benches[bench] = { ...benchLayout, rail };
	return { ...current, benches };
}

/** Map a rail action's target onto its navigation intent. */
function railActionClick(
	action: RailActionDef,
	onIntent: (intent: ShellIntent) => void,
	onNewSession?: () => void,
): (() => void) | undefined {
	if (action.disabled) return undefined;
	switch (action.target) {
		case "new-session":
			return () => {
				onIntent({ t: "create" });
				onNewSession?.();
			};
		case "surface":
			return action.surface ? () => onIntent({ t: "mount", surface: action.surface! }) : undefined;
		default:
			return () => onIntent({ t: "door", route: "settings" });
	}
}

/** The New Session rail button with a SECRET agent picker: a plain click starts
 *  a normal session; ctrl/⌘/shift-click opens an anchored dropdown of discovered
 *  agents (when the host supplied any) and creates the session AS the picked one.
 *  The manifest applies at creation, so this is the honest, lossless place to
 *  choose an agent — no mid-session capability shift. */
function NewSessionRailButton({
	action,
	agents,
	onNewSession,
	onNewSessionAs,
}: {
	readonly action: RailActionDef;
	readonly agents: readonly AgentChoice[];
	readonly onNewSession?: () => void;
	readonly onNewSessionAs?: (agentName: string) => void;
}) {
	const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
	const hasPicker = agents.length > 0 && onNewSessionAs !== undefined;
	const handleClick = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			if (hasPicker && (event.ctrlKey || event.metaKey || event.shiftKey)) {
				event.preventDefault();
				setAnchorRect(event.currentTarget.getBoundingClientRect());
				return;
			}
			onNewSession?.();
		},
		[hasPicker, onNewSession],
	);
	const close = useCallback(() => setAnchorRect(null), []);
	return (
		<>
			<RailButton icon={action.icon} kbd={action.kbd} primary={action.primary} onClick={handleClick}>
				{action.label}
			</RailButton>
			{anchorRect && (
				<>
					<Scrim onClick={close} />
					<PopoverPanel anchorRect={anchorRect} place="below" width={264}>
						<div className="px-2.5 pt-2 pb-[5px] fr-eyebrow">New session as</div>
						{agents.map(agent => (
							<button
								key={agent.name}
								type="button"
								onClick={() => {
									onNewSessionAs?.(agent.name);
									close();
								}}
								className="flex w-full flex-col items-start gap-0.5 rounded-[8px] px-2.5 py-1.5 text-left transition-colors duration-[120ms] hover:bg-fr-surface-2"
							>
								<span className="text-fr-sm text-fr-text">{agent.name}</span>
								<span className="line-clamp-2 text-fr-2xs text-fr-text-3">{agent.description}</span>
							</button>
						))}
					</PopoverPanel>
				</>
			)}
		</>
	);
}

function FraymRailActions({
	actions,
	baseActions,
	onNewSession,
	newSessionAgents,
	onNewSessionAs,
	onIntent,
	onToggleRailItem,
	activeSurface,
}: {
	readonly actions: readonly RailActionDef[];
	/** The bench's full base action registry — the customize popover's toggle menu. */
	readonly baseActions: readonly RailActionDef[];
	readonly onNewSession?: () => void;
	readonly newSessionAgents?: readonly AgentChoice[];
	readonly onNewSessionAs?: (agentName: string) => void;
	readonly onIntent: (intent: ShellIntent) => void;
	/** Persist a rail item's user-layer enable/disable into LayoutConfig. */
	readonly onToggleRailItem: (id: string, enabled: boolean) => void;
	readonly activeSurface: SurfaceId;
}) {
	// Local anchor for the "Customize rail" tick menu. Reuses the shared Popover
	// primitives (Scrim + PopoverPanel/PopoverRow), not a new popover system, and
	// stays local because this is a rail-owned surface, not a shell MenuState menu.
	const [customizeRect, setCustomizeRect] = useState<DOMRect | null>(null);
	// Checkbox truth = RESOLVED visibility (persona preset + user ticks): an item's
	// membership in the rendered `actions`, never just the raw user layer.
	const renderedIds = useMemo(() => new Set(actions.map(action => action.id)), [actions]);
	// Only non-primary items are tickable: the box's primary create action is
	// structural and never droppable (doc 37 §7).
	const toggleable = baseActions.filter(action => !action.primary);
	return (
		<div data-slot="rail-actions" className="flex flex-col gap-px px-2">
			{actions.map(action => {
				if (action.target === "new-session") {
					return (
						<NewSessionRailButton
							key={action.id}
							action={action}
							agents={newSessionAgents ?? []}
							onNewSession={railActionClick(action, onIntent, onNewSession)}
							onNewSessionAs={
								onNewSessionAs
									? agentName => {
											// Same navigate-then-mint order as the plain click.
											onIntent({ t: "create" });
											onNewSessionAs(agentName);
										}
									: undefined
							}
						/>
					);
				}
				const onClick = railActionClick(action, onIntent, onNewSession);
				return (
					<RailButton
						key={action.id}
						icon={action.icon}
						kbd={action.kbd}
						primary={action.primary}
						disabled={action.disabled}
						active={action.target === "surface" && action.surface === activeSurface}
						className={action.disabled ? "cursor-not-allowed opacity-55" : undefined}
						onClick={onClick}
					>
						{action.label}
					</RailButton>
				);
			})}
			{toggleable.length > 0 && (
				<RailButton
					icon="sliders"
					active={customizeRect != null}
					onClick={event => setCustomizeRect(event.currentTarget.getBoundingClientRect())}
				>
					Customize
				</RailButton>
			)}
			{customizeRect && (
				<>
					<Scrim onClick={() => setCustomizeRect(null)} />
					<PopoverPanel data-slot="rail-customize-menu" width={236} anchorRect={customizeRect} place="below">
						<PopoverHeading>Customize rail</PopoverHeading>
						{toggleable.map(action => {
							const checked = renderedIds.has(action.id);
							return (
								<PopoverRow
									key={action.id}
									label={action.label}
									selected={checked}
									onClick={() => onToggleRailItem(action.id, !checked)}
								/>
							);
						})}
					</PopoverPanel>
				</>
			)}
		</div>
	);
}

function FraymSessionScope({
	projectLabel,
	searchOpen,
	search,
	inputRef,
	onSearchChange,
	onSearchOpenChange,
}: {
	readonly projectLabel: string;
	readonly searchOpen: boolean;
	readonly search: string;
	readonly inputRef: RefObject<HTMLInputElement | null>;
	readonly onSearchChange: (value: string) => void;
	readonly onSearchOpenChange: (open: boolean) => void;
}) {
	if (!searchOpen) return projectLabel;
	return (
		<input
			aria-label="Search sessions"
			ref={inputRef}
			value={search}
			onChange={event => onSearchChange(event.target.value)}
			onKeyDown={event => {
				if (event.key === "Escape") {
					onSearchChange("");
					onSearchOpenChange(false);
				}
			}}
			placeholder="Search sessions"
			className="min-w-0 flex-1 bg-transparent text-fr-xs text-fr-text outline-none placeholder:text-fr-text-3"
		/>
	);
}

function FraymSessionActions({
	searchOpen,
	filterActive,
	inputRef,
	onSearchChange,
	onSearchOpenChange,
	onOpenFilterMenu,
}: {
	readonly searchOpen: boolean;
	readonly filterActive: boolean;
	readonly inputRef: RefObject<HTMLInputElement | null>;
	readonly onSearchChange: (value: string) => void;
	readonly onSearchOpenChange: (open: (current: boolean) => boolean) => void;
	readonly onOpenFilterMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
	const compact = useRailCompact();
	return (
		<>
			{!compact && (
				<MiniButton
					icon={searchOpen ? "x" : "search"}
					aria-label={searchOpen ? "Close session search" : "Search sessions"}
					title={searchOpen ? "Close session search" : "Search sessions"}
					active={searchOpen}
					className="text-fr-text-2"
					onClick={() => {
						if (searchOpen) {
							onSearchChange("");
							onSearchOpenChange(() => false);
							return;
						}
						onSearchOpenChange(() => true);
						window.requestAnimationFrame(() => inputRef.current?.focus());
					}}
				/>
			)}
			<MiniButton
				icon="sliders"
				aria-label="Filter sessions"
				title="Filter sessions"
				active={filterActive}
				className="text-fr-text-2"
				onClick={onOpenFilterMenu}
			/>
		</>
	);
}

const FraymRailFooter = memo(function FraymRailFooter({
	userName,
	userAvatarUrl,
	planLabel,
	productLabel,
	compact,
	onOpenUserMenu,
}: {
	readonly userName: string;
	readonly userAvatarUrl?: string;
	readonly planLabel: string;
	readonly productLabel: string;
	readonly compact: boolean;
	readonly onOpenUserMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
	return (
		<div className="border-t border-fr-border-soft p-2">
			<button
				type="button"
				aria-label={compact ? `${userName} — ${productLabel} ${planLabel}` : undefined}
				className={cn(
					"flex w-full items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-left transition-colors hover:bg-fr-surface",
					compact && "justify-center gap-0 px-0",
				)}
				onClick={onOpenUserMenu}
			>
				<UserAvatar userName={userName} userAvatarUrl={userAvatarUrl} className="size-7" fallback="A" />
				<div className="rail-label min-w-0">
					<div className="fr-overflow text-fr-sm font-medium">{userName}</div>
					<div className="fr-overflow text-fr-2xs text-fr-text-3">
						{productLabel} - {planLabel}
					</div>
				</div>
				<Icon name="caretD" size={14} strokeWidth={2} className="rail-label ml-auto text-fr-text-3" />
			</button>
		</div>
	);
});

interface FraymRailSessionBarProps {
	readonly projectLabel: string;
	readonly menu: MenuState;
	readonly sessionSearchOpen: boolean;
	readonly sessionSearch: string;
	readonly searchInputRef: RefObject<HTMLInputElement | null>;
	readonly onSessionSearchChange: (value: string) => void;
	readonly onSessionSearchOpenChange: (open: boolean | ((current: boolean) => boolean)) => void;
	readonly onOpenFilterMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}

const FraymRailSessionBar = memo(function FraymRailSessionBar({
	projectLabel,
	menu,
	sessionSearchOpen,
	sessionSearch,
	searchInputRef,
	onSessionSearchChange,
	onSessionSearchOpenChange,
	onOpenFilterMenu,
}: FraymRailSessionBarProps) {
	const scope = useMemo(
		() => (
			<FraymSessionScope
				projectLabel={projectLabel}
				searchOpen={sessionSearchOpen}
				search={sessionSearch}
				inputRef={searchInputRef}
				onSearchChange={onSessionSearchChange}
				onSearchOpenChange={onSessionSearchOpenChange}
			/>
		),
		[
			projectLabel,
			sessionSearchOpen,
			sessionSearch,
			searchInputRef,
			onSessionSearchChange,
			onSessionSearchOpenChange,
		],
	);
	const actions = useMemo(
		() => (
			<FraymSessionActions
				searchOpen={sessionSearchOpen}
				filterActive={menu.type === "filter"}
				inputRef={searchInputRef}
				onSearchChange={onSessionSearchChange}
				onSearchOpenChange={onSessionSearchOpenChange}
				onOpenFilterMenu={onOpenFilterMenu}
			/>
		),
		[
			sessionSearchOpen,
			menu.type,
			searchInputRef,
			onSessionSearchChange,
			onSessionSearchOpenChange,
			onOpenFilterMenu,
		],
	);
	return <SessionBar scope={scope} icon={null} actions={actions} />;
});

function RailGroupAction({
	workspace,
	project,
	onNewSession,
	onOpenProjectFilter,
}: {
	readonly workspace?: WorkspaceRef;
	readonly project?: string;
	readonly onNewSession?: (workspace?: WorkspaceRef) => void;
	readonly onOpenProjectFilter?: (project: string, event: MouseEvent<HTMLButtonElement>) => void;
}) {
	return (
		<>
			{workspace && project && onOpenProjectFilter && (
				<MiniButton
					icon="sliders"
					title={`Filter ${project}`}
					onClick={event => {
						event.stopPropagation();
						onOpenProjectFilter(project, event);
					}}
					className="size-6 text-fr-text-2 hover:bg-fr-surface-2 hover:text-fr-text"
				/>
			)}
			<MiniButton
				icon="plus"
				title="New session in this workspace"
				onClick={event => {
					event.stopPropagation();
					onNewSession?.(workspace);
				}}
				className="size-6 text-fr-text-2 hover:bg-fr-surface-2 hover:text-fr-text"
			/>
		</>
	);
}

function FraymFrameRailView({
	version,
	appMode,
	railMode,
	onToggleCompact,
	spaces,
	projectLabel,
	menu,
	sessionSearchOpen,
	sessionSearch,
	searchInputRef,
	groups,
	avatar,
	vibrState,
	vibrMode,
	energy,
	railVibr,
	railVibrAllSessions,
	sessionVibrs,
	userName,
	userAvatarUrl,
	planLabel,
	productLabel,
	onAppModeChange,
	onNewSession,
	newSessionAgents,
	onNewSessionAs,
	onIntent,
	activeSurface,
	onSessionSearchChange,
	onSessionSearchOpenChange,
	onOpenFilterMenu,
	onOpenProjectFilter,
	onSessionSelect,
	onSessionContextMenu,
	onSessionMultiContextMenu,
	onGroupContextMenu,
	onOpenUserMenu,
	renamingItemId,
	onRenameItem,
}: FraymFrameRailProps) {
	const compact = railMode === "compact";
	const renderGroupAction = useCallback(
		(group: RepoGroup) => (
			<RailGroupAction
				workspace={group.workspace}
				project={group.repo}
				onNewSession={onNewSession}
				onOpenProjectFilter={onOpenProjectFilter}
			/>
		),
		[onNewSession, onOpenProjectFilter],
	);
	const renderSessionPresence = useCallback(
		(item: SessionItem) => {
			// Rail vibr off (or no avatar configured) → every row uses the colored
			// radiating status dot. Returning null lets SessionPresenceDot fall back to it.
			if (!railVibr || avatar === "none") return null;
			// The active (foreground) session always carries a live vibr signal, so
			// mirror its exact state/mode/energy. Idle → null → fall back to the dot.
			if (item.active) {
				if (vibrState === "idle") return null;
				return <RailPresence avatar={avatar} state={vibrState} mode={vibrMode} energy={energy} />;
			}
			// Background running sessions: only animate when the user opted into live
			// state for all sessions AND we have a live vibr for this row; otherwise the
			// honest colored radiating dot reads "still running" without a fake animation.
			if (!railVibrAllSessions) return null;
			const live = sessionVibrs.get(item.id);
			if (!live || live.state === "idle") return null;
			return <RailPresence avatar={avatar} state={live.state} mode={live.mode} energy={live.energy} />;
		},
		[avatar, vibrState, vibrMode, energy, railVibr, railVibrAllSessions, sessionVibrs],
	);
	const brand = useMemo(
		() => <FraymRailBrand version={version} compact={compact} onToggle={onToggleCompact} />,
		[version, compact, onToggleCompact],
	);
	const tabs = useMemo(
		() => <FraymModeTabs appMode={appMode} spaces={spaces} compact={compact} onAppModeChange={onAppModeChange} />,
		[appMode, spaces, compact, onAppModeChange],
	);
	// Bench layout resolution: the base action registry per bench, shaped by the
	// user's rail-customize ticks, through the one LayoutConfig mechanism (doc 37 §7).
	const { config, update } = useSettings();
	const bench = (
		appMode === "chat" ? "aether" : appMode in (config.layout?.benches ?? {}) ? appMode : "code"
	) as BenchId;
	const baseActions = useMemo(() => spaces.find(def => def.id === appMode)?.rail.actions ?? [], [spaces, appMode]);
	const renderedActions = useMemo(() => {
		const layout = resolveBenchLayout({
			config: config.layout,
			bench,
		});
		const sorted = sortRailItems(baseActions, layout);
		// Structural guarantee: a primary create action is fixed and never
		// droppable; if a layout layer removed it, re-insert it at the front.
		const primary = baseActions.find(action => action.primary);
		if (primary && !sorted.some(action => action.id === primary.id)) return [primary, ...sorted];
		return sorted;
	}, [bench, baseActions, config.layout]);
	const onToggleRailItem = useCallback(
		(id: string, enabled: boolean) => update("layout", nextRailLayout(config.layout, bench, id, enabled)),
		[update, config.layout, bench],
	);
	const actions = useMemo(
		() => (
			<FraymRailActions
				actions={renderedActions}
				baseActions={baseActions}
				onNewSession={onNewSession}
				newSessionAgents={newSessionAgents}
				onNewSessionAs={onNewSessionAs}
				onIntent={onIntent}
				onToggleRailItem={onToggleRailItem}
				activeSurface={activeSurface}
			/>
		),
		[
			renderedActions,
			baseActions,
			onNewSession,
			newSessionAgents,
			onNewSessionAs,
			onIntent,
			onToggleRailItem,
			activeSurface,
		],
	);
	const sessionBar = useMemo(
		() => (
			<FraymRailSessionBar
				projectLabel={projectLabel}
				menu={menu}
				sessionSearchOpen={sessionSearchOpen}
				sessionSearch={sessionSearch}
				searchInputRef={searchInputRef}
				onSessionSearchChange={onSessionSearchChange}
				onSessionSearchOpenChange={onSessionSearchOpenChange}
				onOpenFilterMenu={onOpenFilterMenu}
			/>
		),
		[
			projectLabel,
			menu,
			sessionSearchOpen,
			sessionSearch,
			searchInputRef,
			onSessionSearchChange,
			onSessionSearchOpenChange,
			onOpenFilterMenu,
		],
	);

	return (
		<SessionRail
			brand={brand}
			tabs={tabs}
			actions={actions}
			sessionBar={sessionBar}
			groups={groups}
			compact={compact}
			style={config.sessionRailStyle}
			onSessionClick={onSessionSelect}
			onSessionContextMenu={onSessionContextMenu}
			onSessionMultiContextMenu={onSessionMultiContextMenu}
			onGroupContextMenu={onGroupContextMenu}
			groupAction={renderGroupAction}
			sessionPresence={renderSessionPresence}
			renamingItemId={renamingItemId}
			onRenameItem={onRenameItem}
			footer={
				<FraymRailFooter
					userName={userName}
					userAvatarUrl={userAvatarUrl}
					planLabel={planLabel}
					productLabel={productLabel}
					compact={compact}
					onOpenUserMenu={onOpenUserMenu}
				/>
			}
		/>
	);
}

export const FraymFrameRail = memo(FraymFrameRailView);
