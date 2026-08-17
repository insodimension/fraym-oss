import type {
	AgentChoice,
	SessionAttachment,
	SessionDriver,
	SessionMessageInput,
	SessionRef,
	SessionSnapshot,
	TerminalDriver,
	WorkspaceDriver,
	WorkspaceRef,
} from "@fraym-ai/driver";
import type { AvatarId, AvatarMode, AvatarState } from "@fraym-ai/vibr";
import { type ComponentProps, type MouseEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ModelSelection, PaletteCategory } from "../components";
import type { RailMode } from "../components/app-shell";
import { ComposerChip, type ComposerChipProps, ContextRadial } from "../features/composer/composer";
import { Icon } from "../icons";
import type { RepoGroup, SessionItem } from "../features/session-rail/session-rail";
import type { ToolDefaultOpen } from "../features/tool-card/tool-display-settings-model";
import { useLiveContextPercent } from "../hooks/use-live-context-percent";
import { type RailVibr, useLiveSessionVibrs } from "../hooks/use-live-session-vibrs";
import { useSessionOptional } from "../hooks/use-session";
import type { UsageState } from "../hooks/use-usage";
import type { WorkspaceAnalyticsState } from "../hooks/use-workspace-analytics";
import { useSettings } from "../settings/use-settings";
import { useTheme } from "../theme/use-theme";
import { FRAYM_SHELL_COMMAND_EVENT, type FraymNavigationState, dispatchFraymNavigationState } from "./commands";
import type { EngineConfigState, EngineResourceState } from "./engine-state";
import type { FraymFrameOverlaysProps } from "./fraym-frame-overlays";
import type { FraymFrameRailProps } from "./fraym-frame-rail";
import { commandFromEvent, runFraymShellCommand } from "./fraym-frame-shell-commands";
import { useFraymFrameShortcuts } from "./fraym-frame-shortcuts";
import type { FraymFrameSettingsViewProps } from "./fraym-frame-settings";
import type { FraymFrameWorkspaceProps, WorkspaceSurfaceHostProps } from "./fraym-frame-workspace";
import {
	effectiveFilters,
	filterGroups,
	sessionGroupsFromCatalog,
	sessionGroupsFromSnapshot,
	sessionLifecycle,
	sessionRefKey,
	setProjectOverride,
} from "./session-groups";
import { DEFAULT_FILTERS, modelSelectionFromConfig, PALETTE_CMDS, PERMS, resolveDockTabs, SET_NAV } from "./shell-data";
import { executeIntent } from "./space/executor";
import type { WorkspaceSurfaceFills } from "./space/fills";
import type { ShellIntent } from "./space/intents";
import type { SpaceUiDef } from "./space/space-def";
import { DEFAULT_SPACES, sortSpaceUiDefs, spaceSurfaceRegistry } from "./space/space-defs";
import { initialShellNavState, type ShellRoute, SURFACE, type SurfaceId } from "./space/space-state";
import type { AppMode, FraymSettingsPanel, MenuState, MenuType, ProjectFilters, RailActionDef, SessionFilters } from "./types";

type SettingsConfig = ReturnType<typeof useSettings>["config"];
type SettingsUpdate = ReturnType<typeof useSettings>["update"];
type FrameSession = ReturnType<typeof useSessionOptional>;
type ToolDisplaySettings = FraymFrameSettingsViewProps["toolDisplaySettings"];
type WorkspaceProps = Omit<FraymFrameWorkspaceProps, "rail">;
type ContextBreakdown = FraymFrameOverlaysProps["contextBreakdown"];

const EMPTY_SURFACE_FILLS: WorkspaceSurfaceFills<WorkspaceSurfaceHostProps> = {};
const EMPTY_SESSION_REFS: readonly SessionRef[] = [];

export interface FraymFrameModelArgs {
	readonly sessionRef?: SessionRef | null;
	readonly sessionDriver?: SessionDriver | null;
	readonly workspace?: WorkspaceRef | null;
	readonly workspaces?: readonly WorkspaceRef[];
	readonly workspaceDriver?: WorkspaceDriver | null;
	readonly terminalDriver?: TerminalDriver | null;
	readonly settingsPanels?: readonly FraymSettingsPanel[];
	readonly resources: EngineResourceState;
	readonly engineConfig: EngineConfigState;
	readonly analytics: WorkspaceAnalyticsState;
	readonly usage: UsageState;
	readonly defaultAvatar: AvatarId;
	readonly className?: string;
	readonly userName: string;
	readonly userAvatarUrl?: string;
	readonly userEmail: string;
	readonly planLabel: string;
	readonly productLabel: string;
	readonly version: string;
	/** Host override for the Fraym brand mark rendered in the rail header. */
	readonly brandMarkUrl?: string;
	readonly sessionCatalog?: readonly SessionSnapshot[];
	readonly onSessionSelect?: (sessionRef: SessionRef) => void;
	readonly onSessionPopout?: (sessionRef: SessionRef, title?: string, workspace?: WorkspaceRef) => void | Promise<void>;
	readonly onWorkspaceSelect?: (workspace: WorkspaceRef) => void;
	readonly onAddProject?: () => void;
	readonly onBranchSelect?: (branch: string) => void;
	readonly onRenameSession?: (sessionRef: SessionRef, title: string) => void;
	readonly onToggleArchiveSession?: (sessionRef: SessionRef, archived: boolean) => void;
	readonly onPinSession?: (sessionRef: SessionRef, pinned: boolean) => void;
	readonly onDeleteSession?: (sessionRef: SessionRef) => void;
	readonly onDeleteSessions?: (refs: readonly SessionRef[]) => void;
	readonly onRefreshSessions?: (workspaceId?: string) => void;
	readonly onNewSession?: (workspace?: WorkspaceRef) => void;
	readonly newSessionAgents?: readonly AgentChoice[];
	readonly onNewSessionAs?: (agentName: string, workspace?: WorkspaceRef) => void;
	readonly onNewWorktreeSession?: () => void;
	readonly onMoveToWorktree?: (sessionRef: SessionRef) => void;
	readonly isCreatingSession?: boolean;
	readonly shellCommandTarget?: EventTarget | null;
	readonly workspaceOnly?: boolean;
	readonly enabledModes?: readonly AppMode[];
	readonly visibleSettingsPanelIds?: readonly string[];
	readonly railActions?: readonly RailActionDef[];
	readonly spaces?: readonly SpaceUiDef[];
	readonly surfaceFills?: WorkspaceSurfaceFills<WorkspaceSurfaceHostProps>;
	readonly dockTabs?: readonly string[];
	readonly topBarActions?: readonly string[];
	readonly onAppModeChange?: (mode: AppMode) => void;
	readonly onRevealPath?: (path: string) => void;
}

interface FrameArgs extends Omit<FraymFrameModelArgs, "sessionCatalog" | "settingsPanels" | "workspaces"> {
	readonly sessionCatalog: readonly SessionSnapshot[];
	readonly settingsPanels: readonly FraymSettingsPanel[];
	readonly workspaces: readonly WorkspaceRef[];
}

export interface FraymFrameModel {
	readonly route: ShellRoute;
	readonly toolDisplaySettings: ToolDisplaySettings;
	readonly settingsProps: FraymFrameSettingsViewProps;
	readonly workspaceProps: WorkspaceProps;
	readonly railProps: FraymFrameRailProps;
	readonly overlayProps: FraymFrameOverlaysProps;
	readonly workspaceOnly: boolean;
}

function normalizeArgs(args: FraymFrameModelArgs): FrameArgs {
	return {
		...args,
		sessionCatalog: args.sessionCatalog ?? [],
		settingsPanels: args.settingsPanels ?? [],
		workspaces: args.workspaces ?? [],
	};
}

function sessionBaseGroups(
	catalog: readonly SessionSnapshot[],
	session: FrameSession,
	fallbackWorkspace: WorkspaceRef | null | undefined,
	workspaces: readonly WorkspaceRef[],
): RepoGroup[] {
	const workspacesById = new Map(workspaces.map(workspace => [workspace.workspaceId, workspace]));
	if (catalog.length > 0) return sessionGroupsFromCatalog(catalog, session?.snapshot?.ref, fallbackWorkspace, workspacesById);
	return sessionGroupsFromSnapshot(
		session?.snapshot?.workspace ?? fallbackWorkspace,
		session?.snapshot?.ref,
		session?.snapshot?.title,
		session?.snapshot?.status,
		session?.snapshot?.updatedAt,
	);
}

function identity(props: FrameArgs): { readonly name: string; readonly email: string; readonly avatarUrl?: string } {
	return { name: props.userName, email: props.userEmail, ...(props.userAvatarUrl ? { avatarUrl: props.userAvatarUrl } : {}) };
}

function toolSettings(config: SettingsConfig): ToolDisplaySettings {
	return {
		defaultOpen: config.toolOutputDefault,
		density: config.density,
		collapseMode: config.collapseMode,
		maxVisibleBlocks: config.maxVisibleBlocks,
		maxVisibleTurns: config.maxVisibleTurns,
		groupConsecutiveTools: config.groupConsecutiveTools,
		groupThreshold: config.groupThreshold,
	};
}

function settingsItems(
	panels: readonly FraymSettingsPanel[],
	visibleIds: readonly string[] | undefined,
): FraymFrameSettingsViewProps["settingsNavItems"] {
	const catalog = [...SET_NAV, ...panels.map(panel => ({ id: panel.id, label: panel.label, icon: panel.icon }))];
	const byId = new Map(catalog.map(item => [item.id, item]));
	return (visibleIds ?? catalog.map(item => item.id)).flatMap(id => {
		const item = byId.get(id);
		return item ? [item] : [];
	});
}

function contextModel(session: FrameSession): { readonly used: number; readonly max: number; readonly breakdown: ContextBreakdown } {
	const usage = session?.contextUsage;
	const tokens = usage?.tokens;
	const maxTokens = usage?.contextWindow;
	if (typeof tokens !== "number" || typeof maxTokens !== "number" || maxTokens <= 0) {
		return { used: 0, max: 0, breakdown: [] };
	}
	const used = tokens / 1000;
	const max = maxTokens / 1000;
	return {
		used,
		max,
		breakdown: [{ name: "Used context", k: Number(used.toFixed(1)), pct: Math.min(100, Math.round((used / max) * 100)) }],
	};
}

function useChrome(
	configAvatar: string,
	configVibrEnabled: boolean,
	defaultAvatar: AvatarId,
	update: SettingsUpdate,
	spaces: readonly SpaceUiDef[],
) {
	const [nav, setNav] = useState(initialShellNavState);
	const registry = useMemo(() => spaceSurfaceRegistry(spaces), [spaces]);
	const dispatch = useCallback((intent: ShellIntent) => setNav(state => executeIntent(state, intent, registry)), [registry]);
	const route = nav.route;
	const appMode = nav.space;
	const activeSurface: SurfaceId = nav.bySpace[appMode]?.activeSurface ?? SURFACE.session;
	const [settingsPane, setSettingsPane] = useState("general");
	const [railMode, setRailMode] = useState<RailMode>("expanded");
	const [dockOpen, setDockOpen] = useState(false);
	const [dockTab, setDockTab] = useState("ide");
	const [dockWidth, setDockWidth] = useState(760);
	const [composer, setComposer] = useState("");
	const [menu, setMenu] = useState<MenuState>({ type: null, rect: null });
	const [permission, setPermission] = useState("write");
	const [activeInsight, setActiveInsight] = useState<string | null>(null);
	const [canGoBack] = useState(false);
	const [canGoForward] = useState(false);
	const avatarChoice = (configAvatar || defaultAvatar) as AvatarId;
	const vibrEnabled = configVibrEnabled !== false && avatarChoice !== "none";
	const avatar: AvatarId = vibrEnabled ? avatarChoice : "none";
	const setAvatar = useCallback((next: AvatarId) => update("avatar", next), [update]);
	const setVibrEnabled = useCallback(
		(next: boolean) => {
			update("vibrEnabled", next);
			if (next && avatarChoice === "none") update("avatar", defaultAvatar);
		},
		[avatarChoice, defaultAvatar, update],
	);
	const setAppMode = useCallback(
		(next: AppMode) => setNav(state => executeIntent(state, { t: "space.switch", space: next }, registry)),
		[registry],
	);
	const openDoor = useCallback(() => setNav(state => executeIntent(state, { t: "door", route: "settings" }, registry)), [registry]);
	const leaveToWorkspace = useCallback(() => setNav(state => executeIntent(state, { t: "door.close" }, registry)), [registry]);
	return {
		nav,
		route,
		appMode,
		activeSurface,
		dispatch,
		setAppMode,
		settingsPane,
		setSettingsPane,
		railMode,
		setRailMode,
		toggleRailCompact: () => setRailMode(mode => (mode === "compact" ? "expanded" : "compact")),
		dockOpen,
		setDockOpen,
		dockTab,
		setDockTab,
		dockWidth,
		setDockWidth,
		composer,
		setComposer,
		menu,
		setMenu,
		permission,
		setPermission,
		activeInsight,
		setActiveInsight,
		avatar,
		avatarChoice,
		vibrEnabled,
		setAvatar,
		setVibrEnabled,
		openDoor,
		leaveToWorkspace,
		canGoBack,
		canGoForward,
	};
}

function useSessionMenus() {
	const [sessionMenu, setSessionMenu] = useState<{ readonly item: SessionItem; readonly rect: DOMRect } | null>(null);
	const [sessionMultiMenu, setSessionMultiMenu] = useState<{ readonly selectedItems: readonly SessionItem[]; readonly rect: DOMRect } | null>(null);
	const [groupMenu, setGroupMenu] = useState<{ readonly group: RepoGroup; readonly rect: DOMRect } | null>(null);
	const [pendingDeleteSession, setPendingDeleteSession] = useState<SessionItem | null>(null);
	const [pendingDeleteSessions, setPendingDeleteSessions] = useState<readonly SessionItem[] | null>(null);
	const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
	const copyText = useCallback((text: string) => void navigator.clipboard?.writeText(text), []);
	return {
		sessionMenu,
		setSessionMenu,
		sessionMultiMenu,
		setSessionMultiMenu,
		groupMenu,
		setGroupMenu,
		pendingDeleteSession,
		setPendingDeleteSession,
		pendingDeleteSessions,
		setPendingDeleteSessions,
		renamingItemId,
		setRenamingItemId,
		copyText,
	};
}

function useShellCommandListener(
	target: EventTarget | null | undefined,
	props: FrameArgs,
	chrome: ReturnType<typeof useChrome>,
	searchInputRef: React.RefObject<HTMLInputElement | null>,
	setSearchOpen: (value: boolean) => void,
	setMenu: (value: MenuState) => void,
): void {
	useEffect(() => {
		if (!target) return;
		const handler = (event: Event) => {
			const command = commandFromEvent(event);
			if (!command) return;
			runFraymShellCommand(command, {
				props: {
					onNewSession: props.onNewSession,
					onNewWorktreeSession: props.onNewWorktreeSession,
					onRefreshSessions: props.onRefreshSessions,
				},
				session: null,
				chrome: {
					openDoor: chrome.openDoor,
					leaveToWorkspace: chrome.leaveToWorkspace,
					goBack: () => undefined,
					goForward: () => undefined,
					setAppMode: chrome.setAppMode,
					setSettingsPane: chrome.setSettingsPane,
					setAllSettingsOpen: () => undefined,
					setRailMode: chrome.setRailMode,
					toggleRailCompact: chrome.toggleRailCompact,
					setDockOpen: chrome.setDockOpen,
					setDockTab: chrome.setDockTab,
				},
				menu: {
					openPalette: () => setMenu({ type: "palette", rect: null }),
					openSettings: chrome.openDoor,
					setMenu,
				},
				search: { setSessionSearchOpen: setSearchOpen, searchInputRef },
			});
		};
		target.addEventListener(FRAYM_SHELL_COMMAND_EVENT, handler);
		return () => target.removeEventListener(FRAYM_SHELL_COMMAND_EVENT, handler);
	}, [chrome, props, searchInputRef, setMenu, setSearchOpen, target]);
}

export function useFraymFrameModel(args: FraymFrameModelArgs): FraymFrameModel {
	const props = normalizeArgs(args);
	const session = useSessionOptional();
	const settings = useSettings();
	const theme = useTheme();
	const spaces = useMemo(() => {
		const candidates = props.spaces ?? DEFAULT_SPACES;
		const filtered = props.enabledModes ? candidates.filter(space => props.enabledModes?.includes(space.id)) : candidates;
		const configured = props.railActions
			? filtered.map(space => (space.id === "code" ? { ...space, rail: { ...space.rail, actions: props.railActions! } } : space))
			: filtered;
		return sortSpaceUiDefs(configured.length > 0 ? configured : DEFAULT_SPACES);
	}, [props.enabledModes, props.railActions, props.spaces]);
	const chrome = useChrome(settings.config.avatar, settings.config.vibrEnabled, props.defaultAvatar, settings.update, spaces);
	const sessionMenus = useSessionMenus();
	const [sessionSearch, setSessionSearch] = useState("");
	const [sessionSearchOpen, setSessionSearchOpen] = useState(false);
	const searchInputRef = useRef<HTMLInputElement | null>(null);
	useShellCommandListener(props.shellCommandTarget, props, chrome, searchInputRef, setSessionSearchOpen, chrome.setMenu);
	useEffect(() => {
		if (props.shellCommandTarget) {
			dispatchFraymNavigationState(props.shellCommandTarget, { canGoBack: chrome.canGoBack, canGoForward: chrome.canGoForward } satisfies FraymNavigationState);
		}
	}, [chrome.canGoBack, chrome.canGoForward, props.shellCommandTarget]);
	const openSettings = useCallback(() => {
		chrome.setSettingsPane("general");
		chrome.openDoor();
	}, [chrome]);
	useFraymFrameShortcuts({
		onCloseMenu: () => chrome.setMenu({ type: null, rect: null }),
		onOpenPalette: () => chrome.setMenu({ type: "palette", rect: null }),
		onOpenSettings: openSettings,
		onNewSession: props.onNewSession,
	});
	const baseGroups = useMemo(
		() => sessionBaseGroups(props.sessionCatalog, session, props.workspace, props.workspaces),
		[props.sessionCatalog, props.workspace, props.workspaces, session],
	);
	const filters = settings.config.sessionFilters;
	const projectFilters = settings.config.projectSessionFilters;
	const groups = useMemo(
		() => filterGroups(baseGroups, filters, projectFilters, sessionSearch),
		[baseGroups, filters, projectFilters, sessionSearch],
	);
	const projects = useMemo(() => [...new Set(baseGroups.map(group => group.repo))], [baseGroups]);
	const currentRef = session?.snapshot?.ref ?? props.sessionRef ?? null;
	const liveRefs = useMemo(() => {
		if (!(settings.config.railVibr && settings.config.railVibrAllSessions)) return EMPTY_SESSION_REFS;
		return props.sessionCatalog
			.filter(snapshot => sessionLifecycle(snapshot) === "working" && sessionRefKey(snapshot.ref) !== (currentRef ? sessionRefKey(currentRef) : ""))
			.map(snapshot => snapshot.ref);
	}, [currentRef, props.sessionCatalog, settings.config.railVibr, settings.config.railVibrAllSessions]);
	const sessionVibrs = useLiveSessionVibrs(props.sessionDriver, liveRefs);
	const selectSession = useCallback(
		(item: SessionItem) => {
			if (!item.sessionRef) return;
			chrome.dispatch({ t: "mount", surface: SURFACE.session });
			chrome.setRailMode("compact");
			props.onSessionSelect?.(item.sessionRef);
		},
		[chrome, props.onSessionSelect],
	);
	const submit = useCallback(
		(text: string, attachments: readonly SessionAttachment[] = []): boolean => {
			const trimmed = text.trim();
			if (!trimmed && attachments.length === 0) return false;
			chrome.setComposer("");
			const input: string | SessionMessageInput = attachments.length > 0 ? { text: trimmed, attachments } : trimmed;
			void session?.sendMessage(input);
			return true;
		},
		[chrome, session],
	);
	const palettePick = useCallback(
		(command: string) => {
			chrome.setMenu({ type: null, rect: null });
			if (command === "/model") chrome.setMenu({ type: "model", rect: null });
			else if (command === "/mcp") chrome.setMenu({ type: "mcp", rect: null });
			else void session?.sendMessage(command);
		},
		[chrome, session],
	);
	const activeVibr: { readonly state: AvatarState; readonly mode: AvatarMode; readonly energy: number } = {
		state: session?.vibrState ?? (session?.isStreaming ? "typing" : "idle"),
		mode: session?.vibrMode ?? (session?.isStreaming ? "think" : ""),
		energy: session?.energy ?? 0,
	};
	const inventory = {
		toolDisplaySettings: toolSettings(settings.config),
		settingsNavItems: settingsItems(props.settingsPanels, props.visibleSettingsPanelIds),
		activeSettingsPanel: props.settingsPanels.find(panel => panel.id === chrome.settingsPane),
	};
	const setFilters = useCallback((next: SessionFilters) => settings.update("sessionFilters", next), [settings.update]);
	const setProjectFilters = useCallback(
		(next: ProjectFilters) => settings.update("projectSessionFilters", next),
		[settings.update],
	);
	const scopedProject = chrome.menu.type === "filter" ? chrome.menu.project : undefined;
	const effectiveFilter = scopedProject ? effectiveFilters(filters, projectFilters, scopedProject) : filters;
	const context = contextModel(session);
	const ident = identity(props);
	const model: ModelSelection = modelSelectionFromConfig(session?.snapshot?.config) ?? { name: "Model", effort: "default" };
	const permObj = PERMS.find(permission => permission.id === chrome.permission) ?? PERMS[0];
	const openPermissionMenu = useCallback(
		(event: MouseEvent<HTMLButtonElement>) =>
			chrome.setMenu({ type: "perm", rect: event.currentTarget.getBoundingClientRect() }),
		[chrome.setMenu],
	);
	const openContextMenu = useCallback(
		(event: MouseEvent<HTMLButtonElement>) =>
			chrome.setMenu({ type: "context", rect: event.currentTarget.getBoundingClientRect() }),
		[chrome.setMenu],
	);
	const openModelMenu = useCallback(
		(event: MouseEvent<HTMLButtonElement>) =>
			chrome.setMenu({ type: "model", rect: event.currentTarget.getBoundingClientRect() }),
		[chrome.setMenu],
	);
	const leftSlot: ReactNode = (
		<ComposerChip
			tone={permissionTone(chrome.permission)}
			dot
			data-chip="permission"
			aria-label={permObj?.label ?? chrome.permission}
			onClick={openPermissionMenu}
		>
			{permObj?.label ?? chrome.permission}
		</ComposerChip>
	);
	const renderRightSlot = useCallback(
		() => (
			<ComposerSessionRightSlot
				localModel={model}
				onOpenContext={openContextMenu}
				onOpenModel={openModelMenu}
			/>
		),
		[model.name, model.effort, openContextMenu, openModelMenu],
	);
	const workspaceProps = {
		className: props.className,
		workspaceOnly: props.workspaceOnly ?? false,
		appMode: chrome.appMode,
		dockOpen: chrome.dockOpen,
		railMode: chrome.railMode,
		onToggleRail: chrome.toggleRailCompact,
		dockWidth: chrome.dockWidth,
		dockTab: chrome.dockTab,
		dockTabs: resolveDockTabs(props.dockTabs),
		topBarActions: props.topBarActions,
		activeInsight: chrome.activeInsight,
		sessionRef: props.sessionRef,
		sessionCatalog: props.sessionCatalog,
		sessionDriver: props.sessionDriver,
		repo: session?.snapshot?.workspace.displayName ?? props.workspace?.displayName ?? "Workspace",
		branch: session?.snapshot?.workspace.git?.currentBranch ?? props.workspace?.git?.currentBranch ?? "",
		title: session?.snapshot?.title ?? "New session",
		threadRef: { current: null },
		showStartSurface: !session?.isStreaming && (session?.transcript.length ?? 0) === 0,
		isOpeningSession: Boolean(session?.isOpening || props.isCreatingSession),
		workspace: session?.snapshot?.workspace ?? props.workspace,
		workspaces: props.workspaces,
		workspaceDriver: props.workspaceDriver,
		terminalDriver: props.terminalDriver,
		sessions: props.sessionCatalog,
		analytics: props.analytics,
		composer: chrome.composer,
		placeholder: "Message the agent",
		streaming: session?.isStreaming,
		leftSlot,
		rightSlot: renderRightSlot(),
		renderRightSlot,
		avatar: chrome.avatar,
		vibrState: activeVibr.state,
		vibrMode: activeVibr.mode,
		energy: activeVibr.energy,
		tailVerb: "",
		showTailPresence: chrome.avatar !== "none",
		showAvatars: settings.config.showAvatars,
		agentMeta: `${model.name} - ${model.effort}`,
		tree: session?.tree ?? null,
		tasks: (session?.tasks ?? []).flatMap(phase => phase.tasks.map(task => ({ name: task.content, status: task.status }))),
		runningTools: session?.activeTools.length ?? 0,
		onRefreshSessions: props.onRefreshSessions,
		onToggleDock: () => chrome.setDockOpen(open => !open),
		onOpenDockMenu: (event: MouseEvent<HTMLButtonElement>) => chrome.setMenu({ type: "dock", rect: event.currentTarget.getBoundingClientRect() }),
		onDockTabChange: chrome.setDockTab,
		onCloseDock: () => chrome.setDockOpen(false),
		onDockResizeStart: () => undefined,
		onComposerChange: chrome.setComposer,
		onSubmit: submit,
		onSlash: () => chrome.setMenu({ type: "palette", rect: null }),
		onStop: () => void session?.interruptRunForQueuedMessage(),
		onSessionSelect: props.onSessionSelect,
		onSessionPopout: props.onSessionPopout,
		onWorkspaceSelect: props.onWorkspaceSelect,
		onAddProject: props.onAddProject,
		onBranchSelect: props.onBranchSelect,
		onNewWorktree: props.onNewWorktreeSession,
		onMoveToWorktree: props.onMoveToWorktree,
		activeSpace: spaces.find(space => space.id === chrome.appMode) ?? spaces[0]!,
		surfaceFills: props.surfaceFills ?? EMPTY_SURFACE_FILLS,
		activeSurface: chrome.activeSurface,
		onIntent: chrome.dispatch,
	} as WorkspaceProps;
	const railProps: FraymFrameRailProps = {
		version: props.version,
		brandMarkUrl: props.brandMarkUrl,
		appMode: chrome.appMode,
		railMode: chrome.railMode,
		onToggleCompact: chrome.toggleRailCompact,
		spaces,
		projectLabel: filters.project === "All" ? "Projects" : filters.project,
		menu: chrome.menu,
		sessionSearchOpen,
		sessionSearch,
		searchInputRef,
		groups,
		avatar: chrome.avatar,
		vibrState: activeVibr.state,
		vibrMode: activeVibr.mode,
		energy: activeVibr.energy,
		railVibr: settings.config.railVibr,
		railVibrAllSessions: settings.config.railVibrAllSessions,
		sessionVibrs: sessionVibrs as ReadonlyMap<string, RailVibr>,
		userName: ident.name,
		userAvatarUrl: ident.avatarUrl,
		planLabel: props.planLabel,
		productLabel: props.productLabel,
		onAppModeChange: mode => {
			chrome.setAppMode(mode);
			props.onAppModeChange?.(mode);
		},
		onNewSession: props.onNewSession,
		newSessionAgents: props.newSessionAgents,
		onNewSessionAs: props.onNewSessionAs,
		onIntent: chrome.dispatch,
		activeSurface: chrome.activeSurface,
		onSessionSearchChange: setSessionSearch,
		onSessionSearchOpenChange: next => setSessionSearchOpen(current => (typeof next === "function" ? next(current) : next)),
		onOpenFilterMenu: event => chrome.setMenu({ type: "filter", rect: event.currentTarget.getBoundingClientRect() }),
		onOpenProjectFilter: (project, event) => chrome.setMenu({ type: "filter", rect: event.currentTarget.getBoundingClientRect(), project }),
		onSessionSelect: selectSession,
		onSessionContextMenu: (item, event) => sessionMenus.setSessionMenu({ item, rect: event.currentTarget.getBoundingClientRect() }),
		onSessionMultiContextMenu: (_item, selectedItems, event) => sessionMenus.setSessionMultiMenu({ selectedItems, rect: event.currentTarget.getBoundingClientRect() }),
		onGroupContextMenu: (group, event) => sessionMenus.setGroupMenu({ group, rect: event.currentTarget.getBoundingClientRect() }),
		onOpenUserMenu: event => chrome.setMenu({ type: "user", rect: event.currentTarget.getBoundingClientRect() }),
		renamingItemId: sessionMenus.renamingItemId,
		onRenameItem: (item, value) => {
			sessionMenus.setRenamingItemId(null);
			if (value?.trim() && item.sessionRef) props.onRenameSession?.(item.sessionRef, value.trim());
		},
	};
	const settingsProps: FraymFrameSettingsViewProps = {
		toolDisplaySettings: inventory.toolDisplaySettings,
		settingsNavItems: inventory.settingsNavItems,
		settingsPane: chrome.settingsPane,
		activeSettingsPanel: inventory.activeSettingsPanel,
		userName: ident.name,
		userEmail: ident.email,
		userAvatarUrl: ident.avatarUrl,
		theme: theme.mode,
		accent: theme.accent,
		avatar: chrome.avatarChoice,
		vibrEnabled: chrome.vibrEnabled,
		showAvatars: settings.config.showAvatars,
		toolDefaultOpen: settings.config.toolOutputDefault as ToolDefaultOpen,
		onPaneChange: chrome.setSettingsPane,
		onBack: chrome.leaveToWorkspace,
		onThemeChange: theme.setMode,
		onAccentChange: theme.setAccent,
		onAvatarChange: chrome.setAvatar,
		onVibrEnabledChange: chrome.setVibrEnabled,
		onShowAvatarsChange: value => settings.update("showAvatars", value),
		onToolDefaultOpenChange: value => settings.update("toolOutputDefault", value),
	};
	const overlayProps: FraymFrameOverlaysProps = {
		menu: chrome.menu,
		dockTabs: resolveDockTabs(props.dockTabs),
		filters: effectiveFilter,
		filterBaseline: scopedProject ? filters : DEFAULT_FILTERS,
		projects,
		paletteCommands: PALETTE_CMDS as readonly PaletteCategory[],
		models: props.resources.snapshot?.models ?? [],
		modelsLoading: props.resources.loading,
		providers: props.resources.snapshot?.providers,
		sessionConfig: session?.snapshot?.config,
		permission: chrome.permission,
		contextUsed: context.used,
		contextMax: context.max,
		contextBreakdown: context.breakdown,
		planLimits: [],
		mcpServers: [],
		sessionMenu: sessionMenus.sessionMenu,
		sessionMultiMenu: sessionMenus.sessionMultiMenu,
		groupMenu: sessionMenus.groupMenu,
		pendingDeleteSession: sessionMenus.pendingDeleteSession,
		pendingDeleteSessions: sessionMenus.pendingDeleteSessions,
		dockTab: chrome.dockTab,
		userName: ident.name,
		userAvatarUrl: ident.avatarUrl,
		userEmail: ident.email,
		planLabel: props.planLabel,
		productLabel: props.productLabel,
		onFiltersChange: next => {
			if (scopedProject) setProjectFilters(setProjectOverride(projectFilters, scopedProject, filters, next));
			else setFilters(next);
		},
		onClearProjectOverrides: () => setProjectFilters({}),
		onPalettePick: palettePick,
		onEngineModelSelect: selection => void session?.setModel?.(selection),
		onThinkingSelect: level => void session?.setThinkingLevel?.(level),
		onPermissionSelect: mode => {
			chrome.setPermission(mode);
			void session?.setApprovalMode?.(mode);
		},
		onSessionMenuClose: () => sessionMenus.setSessionMenu(null),
		onSessionMultiMenuClose: () => sessionMenus.setSessionMultiMenu(null),
		onGroupMenuClose: () => sessionMenus.setGroupMenu(null),
		onDeleteRequest: sessionMenus.setPendingDeleteSession,
		onDeleteClose: () => sessionMenus.setPendingDeleteSession(null),
		onDeleteSessionsRequest: items => sessionMenus.setPendingDeleteSessions(items),
		onDeleteSessionsClose: () => sessionMenus.setPendingDeleteSessions(null),
		onDeleteSession: props.onDeleteSession,
		onDeleteSessions: props.onDeleteSessions,
		onRenameRequest: item => sessionMenus.setRenamingItemId(item.id),
		onToggleArchiveSession: props.onToggleArchiveSession,
		onPinSession: props.onPinSession,
		onMoveToWorktree: props.onMoveToWorktree,
		onRevealPath: props.onRevealPath,
		onCopyText: sessionMenus.copyText,
		onDockPick: id => {
			chrome.setDockTab(id);
			chrome.setDockOpen(true);
			chrome.setMenu({ type: null, rect: null });
		},
		onUserSettings: openSettings,
		onClose: () => chrome.setMenu({ type: null, rect: null }),
	};
	return {
		route: chrome.route,
		toolDisplaySettings: inventory.toolDisplaySettings,
		settingsProps,
		workspaceProps,
		railProps,
		overlayProps,
		workspaceOnly: props.workspaceOnly ?? false,
	};
}

function permissionTone(permission: string): NonNullable<ComposerChipProps["tone"]> {
	if (permission === "yolo") return "del";
	if (permission === "always-ask") return "add";
	return "warn";
}

function ComposerSessionRightSlot({
	localModel,
	onOpenContext,
	onOpenModel,
}: {
	readonly localModel: ModelSelection;
	readonly onOpenContext: (event: MouseEvent<HTMLButtonElement>) => void;
	readonly onOpenModel: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
	const session = useSessionOptional();
	const visibleModel = modelSelectionFromConfig(session?.snapshot?.config) ?? localModel;
	const contextPercent = useLiveContextPercent(session) ?? 0;
	return (
		<>
			<ContextRadial percent={contextPercent} onClick={onOpenContext} />
			<ComposerChip
				className="font-secondary text-fr-xs"
				data-chip="model"
				onClick={onOpenModel}
				title="Switch model for this session"
			>
				{/* Phone posture swaps the full label for the short form (theme.css):
				    vendor prefix + effort dropped so narrow widths read the model name
				    without clipping. */}
				<span data-model-label="full">
					{visibleModel.name} - {visibleModel.effort}
				</span>
				<span data-model-label="short">
					{visibleModel.name.replace(/^(claude|gpt|gemini|grok|deepseek|qwen|llama|mistral|o)[-.]/i, "")}
				</span>
			</ComposerChip>
		</>
	);
}
