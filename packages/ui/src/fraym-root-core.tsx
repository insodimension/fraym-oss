import type { FraymUiConfig, StreamWispPreset, VerberProfileSetting } from "@fraym-ai/config";
import type {
	AgentChoice,
	FraymDrivers,
	SessionDriver,
	SessionRef,
	SessionSnapshot,
	UsageDriver,
	WorkspaceRef,
} from "@fraym-ai/driver";
import type { AvatarId } from "@fraym-ai/vibr";
import { useMemo } from "react";
import { DeploymentGatesProvider } from "./deployment-gates";
import type { ToolDefaultOpen } from "./features";
import { UsageDriverProvider, UsageStateProvider } from "./features/command-dock";
import { SessionProvider } from "./hooks/session-provider";
import { type UsageState, useUsage } from "./hooks/use-usage";
import { useWorkspaceAnalytics, type WorkspaceAnalyticsState } from "./hooks/use-workspace-analytics";
import {
	DEFAULT_SURFACE_RENDERERS,
	MessageBlockProvider,
	type MessageBlockRendererMap,
	SurfaceRendererProvider,
} from "./registries";
import { SettingsProvider } from "./settings/settings-provider";
import { type EngineResourceState, useEngineConfigState, useEngineResourceState } from "./shell/engine-state";
import { FraymFrame } from "./shell/fraym-frame";
import type { WorkspaceSurfaceHostProps } from "./shell/fraym-frame-workspace";
import type { WorkspaceSurfaceFills } from "./shell/space/fills";
import type { SpaceUiDef } from "./shell/space/space-def";
import type { AppMode, FraymSettingsPanel, RailActionDef } from "./shell/types";
import "./theme/theme.css";

const EMPTY_BLOCK_RENDERERS: MessageBlockRendererMap = {};

export interface FraymProps {
	readonly drivers?: FraymDrivers | null;
	/** @deprecated Use drivers.session. */
	readonly driver?: SessionDriver | null;
	readonly sessionRef?: SessionRef | null;
	readonly workspace?: WorkspaceRef | null;
	readonly workspaces?: readonly WorkspaceRef[];
	readonly settingsPanels?: readonly FraymSettingsPanel[];
	readonly defaultAvatar?: AvatarId;
	readonly className?: string;
	readonly userName?: string;
	readonly userAvatarUrl?: string;
	readonly userEmail?: string;
	readonly planLabel?: string;
	readonly productLabel?: string;
	readonly version?: string;
	readonly defaultShowAvatars?: boolean;
	/** Master on/off for the Vibr presence avatar (config `vibrEnabled`); default on. */
	readonly defaultVibrEnabled?: boolean;
	/** Enable the physics stream-wisp caret for this instance (config `streamWisp`). */
	readonly defaultStreamWisp?: boolean;
	/** Which wisp renderer rides the caret; `auto` pairs it with the avatar (config `streamWispPreset`). */
	readonly defaultStreamWispPreset?: StreamWispPreset;
	/** Working-status voice for this instance (config `verberProfile`). */
	readonly defaultVerberProfile?: VerberProfileSetting;
	readonly defaultToolOpen?: ToolDefaultOpen;
	readonly sessionCatalog?: readonly SessionSnapshot[];
	readonly onSessionSelect?: (sessionRef: SessionRef) => void;
	readonly onSessionPopout?: (sessionRef: SessionRef, title?: string) => void | Promise<void>;
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
	/** True while the host is creating a brand-new session — folds into the frame's
	 *  opening labour-illusion so the "New session" click responds instantly instead
	 *  of freezing for the create round-trip. */
	readonly isCreatingSession?: boolean;
	readonly shellCommandTarget?: EventTarget | null;
	readonly workspaceOnly?: boolean;
	/** Workbench modes (chat/design/code) the rail exposes; default all. A
	 *  deployment profile narrows this — e.g. ["code"] for a code-only product. */
	readonly enabledModes?: readonly AppMode[];
	/** Allowlist of Settings nav ids the deployment exposes (built-in + dynamic);
	 *  undefined = all. A profile narrows this (a minimal deployment keeps a curated subset). */
	readonly visibleSettingsPanelIds?: readonly string[];
	/** Rail action buttons (default DEFAULT_RAIL_ACTIONS); a profile supplies its own list. */
	readonly railActions?: readonly RailActionDef[];
	/** Ordered spaces registered by the consuming app and installed boxes. */
	readonly spaces?: readonly SpaceUiDef[];
	readonly surfaceFills?: WorkspaceSurfaceFills<WorkspaceSurfaceHostProps>;
	/** Right-dock tab ids the deployment exposes (default all); a profile narrows them. */
	readonly dockTabs?: readonly string[];
	/** Top-bar action button ids the deployment exposes (default all); a profile narrows them. */
	readonly topBarActions?: readonly string[];
	/** Allowlist of Vibr (avatar) ids selectable in Appearance; default all. A
	 *  profile narrows this — e.g. ["nebula"] to ship a single Vibr. */
	readonly enabledAvatars?: readonly string[];
	/** Allowlist of stream-wisp preset ids selectable in Appearance; default all. */
	readonly enabledWisps?: readonly string[];
	/** Provider ids whose OAuth login is hidden (API-key connection only). */
	readonly apiKeyOnlyProviderIds?: readonly string[];
	/** Show the "bring your own company gateway" setup card on Connections; default shown. */
	readonly enterpriseGatewaySetup?: boolean;
	/** Allowlist of model-provider ids shown in Connections + the model picker;
	 *  default all. Filters the engine resource snapshot the shell renders. */
	readonly visibleProviderIds?: readonly string[];
	readonly onAppModeChange?: (mode: AppMode) => void;
	/** Reveal a mention's absolute path in the OS's native file manager (desktop
	 *  only). Absent → the file-mention pill's right-click menu drops the row. */
	readonly onRevealPath?: (path: string) => void;
}

export type { FraymSettingsPanel } from "./shell/types";

interface NormalizedFraymProps {
	readonly drivers: FraymDrivers | null;
	readonly driver: SessionDriver | null;
	readonly sessionRef: SessionRef | null;
	readonly workspace: WorkspaceRef | null;
	readonly workspaces: readonly WorkspaceRef[];
	readonly settingsPanels: readonly FraymSettingsPanel[];
	readonly defaultAvatar: AvatarId;
	readonly className?: string;
	readonly userName: string;
	readonly userAvatarUrl?: string;
	readonly userEmail: string;
	readonly planLabel: string;
	readonly productLabel: string;
	readonly version: string;
	readonly defaultShowAvatars: boolean;
	readonly defaultVibrEnabled: boolean;
	readonly defaultStreamWisp: boolean;
	readonly defaultStreamWispPreset: StreamWispPreset;
	readonly defaultVerberProfile: VerberProfileSetting;
	readonly defaultToolOpen: ToolDefaultOpen;
	readonly sessionCatalog: readonly SessionSnapshot[];
	readonly onSessionSelect?: (sessionRef: SessionRef) => void;
	readonly onSessionPopout?: (sessionRef: SessionRef, title?: string) => void | Promise<void>;
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
	readonly isCreatingSession: boolean;
	readonly shellCommandTarget: EventTarget | null;
	readonly workspaceOnly: boolean;
	readonly enabledModes?: readonly AppMode[];
	readonly visibleSettingsPanelIds?: readonly string[];
	readonly railActions?: readonly RailActionDef[];
	readonly spaces?: readonly SpaceUiDef[];
	readonly surfaceFills?: WorkspaceSurfaceFills<WorkspaceSurfaceHostProps>;
	readonly dockTabs?: readonly string[];
	readonly topBarActions?: readonly string[];
	readonly enabledAvatars?: readonly string[];
	readonly enabledWisps?: readonly string[];
	readonly apiKeyOnlyProviderIds?: readonly string[];
	readonly enterpriseGatewaySetup?: boolean;
	readonly visibleProviderIds?: readonly string[];
	readonly onAppModeChange?: (mode: AppMode) => void;
	readonly onRevealPath?: (path: string) => void;
}

interface FraymRuntimeState {
	readonly props: NormalizedFraymProps;
	readonly sessionDriver: SessionDriver | null | undefined;
	readonly resources: ReturnType<typeof useEngineResourceState>;
	readonly config: ReturnType<typeof useEngineConfigState>;
	readonly analytics: WorkspaceAnalyticsState;
	readonly usage: UsageState;
	readonly usageDriver: UsageDriver | null;
	readonly settingsPanels: readonly FraymSettingsPanel[];
	readonly settingsDefaults: Partial<FraymUiConfig>;
	readonly selectedCatalogSnapshot: SessionSnapshot | null;
}

function normalizeFraymProps({
	drivers = null,
	driver = null,
	sessionRef = null,
	workspace = null,
	workspaces = [],
	settingsPanels = [],
	defaultAvatar = "nebula",
	className,
	userName = "Local User",
	userAvatarUrl,
	userEmail = "local profile",
	planLabel = "local",
	productLabel = "fraym",
	version = "v0.4",
	defaultShowAvatars = false,
	defaultVibrEnabled = true,
	defaultStreamWisp = false,
	defaultStreamWispPreset = "auto",
	defaultVerberProfile = "tui",
	defaultToolOpen = "none",
	sessionCatalog = [],
	onSessionSelect,
	onSessionPopout,
	onWorkspaceSelect,
	onAddProject,
	onBranchSelect,
	onRenameSession,
	onToggleArchiveSession,
	onPinSession,
	onDeleteSession,
	onDeleteSessions,
	onRefreshSessions,
	onNewSession,
	newSessionAgents,
	onNewSessionAs,
	onNewWorktreeSession,
	onMoveToWorktree,
	isCreatingSession = false,
	shellCommandTarget = null,
	workspaceOnly = false,
	enabledModes,
	visibleSettingsPanelIds,
	railActions,
	spaces,
	surfaceFills,
	dockTabs,
	topBarActions,
	enabledAvatars,
	enabledWisps,
	apiKeyOnlyProviderIds,
	enterpriseGatewaySetup,
	visibleProviderIds,
	onAppModeChange,
	onRevealPath,
}: FraymProps): NormalizedFraymProps {
	return {
		drivers,
		driver,
		sessionRef,
		workspace,
		workspaces,
		settingsPanels,
		defaultAvatar,
		className,
		userName,
		userAvatarUrl,
		userEmail,
		planLabel,
		productLabel,
		version,
		defaultShowAvatars,
		defaultVibrEnabled,
		defaultStreamWisp,
		defaultStreamWispPreset,
		defaultVerberProfile,
		defaultToolOpen,
		sessionCatalog,
		onSessionSelect,
		onSessionPopout,
		onWorkspaceSelect,
		onAddProject,
		onBranchSelect,
		onRenameSession,
		onToggleArchiveSession,
		onPinSession,
		onDeleteSession,
		onDeleteSessions,
		onRefreshSessions,
		onNewSession,
		newSessionAgents,
		onNewSessionAs,
		onNewWorktreeSession,
		onMoveToWorktree,
		isCreatingSession,
		shellCommandTarget,
		workspaceOnly,
		enabledModes,
		visibleSettingsPanelIds,
		railActions,
		spaces,
		surfaceFills,
		dockTabs,
		topBarActions,
		enabledAvatars,
		enabledWisps,
		apiKeyOnlyProviderIds,
		enterpriseGatewaySetup,
		visibleProviderIds,
		onAppModeChange,
		onRevealPath,
	};
}


function fraymResourceDriver(drivers: FraymDrivers | null): FraymDrivers["resources"] {
	return drivers?.resources;
}

function fraymConfigDriver(drivers: FraymDrivers | null): FraymDrivers["config"] {
	return drivers?.config;
}

function fraymAnalyticsDriver(drivers: FraymDrivers | null): FraymDrivers["analytics"] {
	return drivers?.analytics;
}

function fraymUsageDriver(drivers: FraymDrivers | null): FraymDrivers["usage"] {
	return drivers?.usage;
}

function fraymWorkspaceDriver(drivers: FraymDrivers | null): FraymDrivers["workspace"] {
	return drivers?.workspace;
}

function fraymTerminalDriver(drivers: FraymDrivers | null): FraymDrivers["terminal"] {
	return drivers?.terminal;
}

function fraymSessionDriver(
	drivers: FraymDrivers | null,
	driver: SessionDriver | null,
): SessionDriver | null | undefined {
	return drivers?.session ?? driver;
}

function fraymConfigStorageDriver(drivers: FraymDrivers | null): FraymDrivers["fraymConfig"] | null {
	return drivers?.fraymConfig ?? null;
}

function sessionSnapshotMatches(ref: SessionRef, snapshot: SessionSnapshot): boolean {
	return snapshot.ref.workspaceId === ref.workspaceId && snapshot.ref.sessionId === ref.sessionId;
}

function findSelectedCatalogSnapshot(
	sessionRef: SessionRef | null,
	sessionCatalog: readonly SessionSnapshot[],
): SessionSnapshot | null {
	if (sessionRef === null) return null;
	return sessionCatalog.find(snapshot => sessionSnapshotMatches(sessionRef, snapshot)) ?? null;
}

/** Narrow the engine resource snapshot to an allowlist of provider ids — the
 *  single chokepoint that scopes Connections, the model picker and the model
 *  overlay at once. `undefined`/empty ⇒ unchanged; a non-empty allowlist is
 *  authoritative, even when the current engine snapshot has no matching
 *  providers yet. */
function filterResourcesByProviders(
	resources: EngineResourceState,
	visibleProviderIds: readonly string[] | undefined,
): EngineResourceState {
	const snapshot = resources.snapshot;
	if (snapshot === null || !visibleProviderIds || visibleProviderIds.length === 0) return resources;
	const allow = new Set(visibleProviderIds);
	const providers = snapshot.providers.filter(provider => allow.has(provider.id));
	const models = snapshot.models.filter(model => allow.has(model.providerId));
	return { ...resources, snapshot: { ...snapshot, providers, models } };
}

function useFraymRuntimeState(props: NormalizedFraymProps): FraymRuntimeState {
	const {
		drivers,
		driver,
		workspace,
		settingsPanels,
		defaultToolOpen,
		defaultShowAvatars,
		defaultVibrEnabled,
		defaultStreamWisp,
		defaultStreamWispPreset,
		defaultVerberProfile,
		defaultAvatar,
		sessionRef,
		sessionCatalog,
	} = props;
	const resourceDriver = fraymResourceDriver(drivers);
	const configDriver = fraymConfigDriver(drivers);
	const analyticsDriver = fraymAnalyticsDriver(drivers);
	const rawResources = useEngineResourceState(resourceDriver, workspace);
	const resources = useMemo(
		() => filterResourcesByProviders(rawResources, props.visibleProviderIds),
		[rawResources, props.visibleProviderIds],
	);
	const config = useEngineConfigState(configDriver, workspace);
	const analytics = useWorkspaceAnalytics(analyticsDriver, workspace);
	const usageDriver = fraymUsageDriver(drivers) ?? null;
	const usage = useUsage(usageDriver, { sessionId: sessionRef?.sessionId });
	const mergedSettingsPanels = settingsPanels;
	const settingsDefaults = useMemo<Partial<FraymUiConfig>>(
		() => ({
			toolOutputDefault: defaultToolOpen,
			showAvatars: defaultShowAvatars,
			vibrEnabled: defaultVibrEnabled,
			avatar: defaultAvatar,
			streamWisp: defaultStreamWisp,
			streamWispPreset: defaultStreamWispPreset,
			verberProfile: defaultVerberProfile,
		}),
		[
			defaultToolOpen,
			defaultShowAvatars,
			defaultVibrEnabled,
			defaultAvatar,
			defaultStreamWisp,
			defaultStreamWispPreset,
			defaultVerberProfile,
		],
	);
	const selectedCatalogSnapshot = useMemo(
		() => findSelectedCatalogSnapshot(sessionRef, sessionCatalog),
		[sessionRef, sessionCatalog],
	);
	return {
		props,
		sessionDriver: fraymSessionDriver(drivers, driver),
		resources,
		config,
		analytics,
		usage,
		usageDriver,
		settingsPanels: mergedSettingsPanels,
		settingsDefaults,
		selectedCatalogSnapshot,
	};
}

function FraymProviders({ runtime }: { readonly runtime: FraymRuntimeState }) {
	const { props, settingsDefaults, sessionDriver, selectedCatalogSnapshot } = runtime;
	return (
		<SettingsProvider
			defaults={settingsDefaults}
			driver={fraymConfigStorageDriver(props.drivers)}
			workspace={props.workspace}
		>
			<SessionProvider
				driver={sessionDriver}
				sessionRef={props.sessionRef}
				initialSnapshot={selectedCatalogSnapshot}
			>
				<FraymFrameHost runtime={runtime} />
			</SessionProvider>
		</SettingsProvider>
	);
}

function FraymFrameHost({ runtime }: { readonly runtime: FraymRuntimeState }) {
	const { props, resources, config, analytics, usage, usageDriver, settingsPanels, sessionDriver } = runtime;
	return (
		<SurfaceRendererProvider renderers={DEFAULT_SURFACE_RENDERERS}>
			<MessageBlockProvider renderers={EMPTY_BLOCK_RENDERERS}>
				<UsageDriverProvider value={usageDriver}>
					<UsageStateProvider value={usage}>
						<FraymFrame
							sessionRef={props.sessionRef}
							sessionDriver={sessionDriver}
							workspace={props.workspace}
							workspaces={props.workspaces}
							workspaceDriver={fraymWorkspaceDriver(props.drivers)}
							terminalDriver={fraymTerminalDriver(props.drivers)}
							resources={resources}
							engineConfig={config}
							analytics={analytics}
							usage={usage}
							settingsPanels={settingsPanels}
							defaultAvatar={props.defaultAvatar}
							className={props.className}
							userName={props.userName}
							userAvatarUrl={props.userAvatarUrl}
							userEmail={props.userEmail}
							planLabel={props.planLabel}
							productLabel={props.productLabel}
							version={props.version}
							sessionCatalog={props.sessionCatalog}
							onSessionSelect={props.onSessionSelect}
							onSessionPopout={props.onSessionPopout}
							onWorkspaceSelect={props.onWorkspaceSelect}
							onAddProject={props.onAddProject}
							onBranchSelect={props.onBranchSelect}
							onRenameSession={props.onRenameSession}
							onToggleArchiveSession={props.onToggleArchiveSession}
							onPinSession={props.onPinSession}
							onDeleteSession={props.onDeleteSession}
							onDeleteSessions={props.onDeleteSessions}
							onRefreshSessions={props.onRefreshSessions}
							onNewSession={props.onNewSession}
							newSessionAgents={props.newSessionAgents}
							onNewSessionAs={props.onNewSessionAs}
							onNewWorktreeSession={props.onNewWorktreeSession}
							onMoveToWorktree={props.onMoveToWorktree}
							isCreatingSession={props.isCreatingSession}
							shellCommandTarget={props.shellCommandTarget}
							workspaceOnly={props.workspaceOnly}
							enabledModes={props.enabledModes}
							visibleSettingsPanelIds={props.visibleSettingsPanelIds}
							railActions={props.railActions}
							spaces={props.spaces}
							surfaceFills={props.surfaceFills}
							dockTabs={props.dockTabs}
							topBarActions={props.topBarActions}
							onAppModeChange={props.onAppModeChange}
							onRevealPath={props.onRevealPath}
						/>
					</UsageStateProvider>
				</UsageDriverProvider>
			</MessageBlockProvider>
		</SurfaceRendererProvider>
	);
}

export function Fraym(props: FraymProps) {
	const normalized = normalizeFraymProps(props);
	const runtime = useFraymRuntimeState(normalized);
	return (
		<DeploymentGatesProvider
			value={{
				enabledAvatars: normalized.enabledAvatars,
				enabledWisps: normalized.enabledWisps,
				apiKeyOnlyProviderIds: normalized.apiKeyOnlyProviderIds,
				enterpriseGatewaySetup: normalized.enterpriseGatewaySetup,
			}}
		>
			<FraymProviders runtime={runtime} />
		</DeploymentGatesProvider>
	);
}
