import type {
	EngineArtifactoryRecord,
	EngineDesignSystemRecord,
	EngineEvaluatorRecord,
	EnginePipelineRecord,
	EngineTeamRecord,
	SessionDriver,
	SessionRef,
	SessionSnapshot,
	SessionTreeSnapshot,
	TerminalDriver,
	WorkspaceDriver,
	WorkspaceRef,
} from "@fraym-ai/driver";
import { type AvatarId, Presence } from "@fraym-ai/vibr";
import {
	type ComponentProps,
	type DragEvent,
	Fragment,
	type MouseEvent,
	memo,
	type PointerEvent,
	type ReactNode,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { AppShell, DockSplit, type RailMode, TopBar } from "../components";
import { Button, IconButton } from "../elements";
import {
	Composer,
	type ComposerImageAttachment,
	type ComposerSubmit,
	type ComposerSubmitResult,
	ConnectedHostUiLayer,
	ConnectedJobsBadge,
	ConnectedSelectDialog,
	DockPreview,
	type DockTab,
	EnvironmentPanel,
	FAST_MODE_ID,
	GoalComposerSurface,
	type ModePillItem,
	ModePills,
	modeStatesToPillItems,
	RightDock,
	setActiveComposerDraftKey,
	Thread,
	UsageLimitComposerSurface,
	useComposerDraft,
	useGlobalFileDropGuard,
	useSessionComposerDraft,
} from "../features";
import { ActiveInsightProvider, RENDER_KIND_META } from "../features/command-dock";
import type { ComposerContextTag } from "../features/composer/composer-core";
import {
	applyComposerSeededContext,
	seedSessionComposerContext,
	useSessionComposerContext,
} from "../features/composer/session-composer-draft";
import {
	FRAYM_SESSION_POINTER_DRAG_DROP,
	FRAYM_SESSION_POINTER_DRAG_END,
	FRAYM_SESSION_POINTER_DRAG_MOVE,
	hasSessionDragData,
	readSessionDragData,
	type SessionPointerDragDetail,
} from "../features/session-rail/session-drag";
import { useArgumentCompletions } from "../hooks/use-argument-completions";
import { useFileCompletions } from "../hooks/use-file-completions";
import { useSessionOptional } from "../hooks/use-session";
import { useSlashCommands } from "../hooks/use-slash-commands";
import type { WorkspaceAnalyticsState } from "../hooks/use-workspace-analytics";
import { Icon } from "../icons";
import { cn } from "../lib/cn";
import { ModelsHome, type ModelsHomeProps } from "../pages";
import { PageDockContext, type PageDockHandle } from "../pages/page-dock-context";
import {
	DockBoardView,
	DockDiffView,
	DockFilesView,
	DockIdeView,
	DockTasksView,
	DockTerminalView,
	DockTreeView,
} from "./dock-views";
import { DockInsights } from "./insight-panels";
import { SessionTaskDropZone } from "./session-task-drop";
import { resolveWorkspaceSurfaceFill, type WorkspaceSurfaceFills } from "./space/fills";
import type { ShellIntent } from "./space/intents";
import { SpaceSlotBoundary } from "./space/slot-boundary";
import type { DockImplementation } from "./space/slot-contracts/dock";
import type { WorkspaceHostImplementation } from "./space/slot-contracts/workspace";
import type { SpaceUiDef } from "./space/space-def";
import { SURFACE, type SurfaceId } from "./space/space-state";
import { StartSurface } from "./start-surface";
import type { AppMode } from "./types";
import {
	OpeningThreadSkeleton,
	presenceMode,
	WorkspaceSessionPane,
	workspaceSessionChrome,
} from "./workspace-session-pane";


type PresenceState = ComponentProps<typeof Presence>["state"];

const MAX_WORKSPACE_SPLITS = 4;
const MIN_WORKSPACE_SPLIT_WIDTH = 360;
const WORKSPACE_POPOUT_DRAG_DISTANCE = 24;
const WORKSPACE_POPOUT_STRIP_EXIT = 28;

interface WorkspaceSplitRef {
	readonly sessionRef: SessionRef;
	readonly title: string;
}

interface WorkspacePanePopoutDragState {
	readonly title: string;
	readonly x: number;
	readonly y: number;
	readonly armed: boolean;
}

interface WorkspaceTilingState {
	readonly panes: readonly WorkspaceSplitRef[];
	readonly widths: readonly number[];
	readonly dragOver: boolean;
	readonly dropIndex: number | null;
	readonly dropPreviewCount: number;
	readonly popoutDrag: WorkspacePanePopoutDragState | null;
	readonly dropTargetRef: RefObject<HTMLDivElement | null>;
	readonly activePaneKey: string | null;
	readonly onDragOver: (event: DragEvent<HTMLDivElement>) => void;
	readonly onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
	readonly onDrop: (event: DragEvent<HTMLDivElement>) => void;
	readonly onPaneFocus: (pane: WorkspaceSplitRef, selectSession: boolean) => void;
	readonly onPaneClose: (pane: WorkspaceSplitRef) => void;
	readonly onPanePopoutDragStart: (pane: WorkspaceSplitRef, title: string, event: PointerEvent<HTMLElement>) => void;
	readonly onSplitResizeStart: (index: number, event: PointerEvent<HTMLButtonElement>) => void;
}

function sessionRefKey(ref: SessionRef): string {
	return `${ref.workspaceId}:${ref.sessionId}`;
}

function sameSessionRef(a: SessionRef | null | undefined, b: SessionRef | null | undefined): boolean {
	return Boolean(a && b && a.workspaceId === b.workspaceId && a.sessionId === b.sessionId);
}

function sessionTitleFromCatalog(
	catalog: readonly SessionSnapshot[],
	ref: SessionRef | null | undefined,
	fallback = "Session",
): string {
	if (!ref) return fallback;
	return catalog.find(snapshot => sameSessionRef(snapshot.ref, ref))?.title ?? fallback;
}

function sessionSnapshotFromCatalog(catalog: readonly SessionSnapshot[], ref: SessionRef): SessionSnapshot | null {
	return catalog.find(snapshot => sameSessionRef(snapshot.ref, ref)) ?? null;
}

function equalPaneWidths(count: number): readonly number[] {
	if (count <= 0) return [];
	return Array.from({ length: count }, () => 100 / count);
}

function normalizePaneWidths(widths: readonly number[], count: number): readonly number[] {
	if (widths.length !== count || count === 0) return equalPaneWidths(count);
	const total = widths.reduce((sum, width) => sum + width, 0);
	if (!Number.isFinite(total) || total <= 0) return equalPaneWidths(count);
	return widths.map(width => (width / total) * 100);
}

function resizePaneWidths(
	widths: readonly number[],
	index: number,
	deltaPercent: number,
	minPercent: number,
): readonly number[] {
	const next = [...widths];
	const left = next[index] ?? 0;
	const right = next[index + 1] ?? 0;
	const delta = Math.max(minPercent - left, Math.min(right - minPercent, deltaPercent));
	next[index] = left + delta;
	next[index + 1] = right - delta;
	return next;
}

function dropSlotIndexFromRect(rect: DOMRect, clientX: number, slotCount: number): number {
	if (slotCount <= 0) return 0;
	if (rect.width <= 0) return Math.max(0, slotCount - 1);
	const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
	return Math.max(0, Math.min(slotCount - 1, Math.floor(ratio * slotCount)));
}

function dropSlotIndexFromEvent(event: DragEvent<HTMLDivElement>, slotCount: number): number {
	return dropSlotIndexFromRect(event.currentTarget.getBoundingClientRect(), event.clientX, slotCount);
}

function pointInsideRect(rect: DOMRect, clientX: number, clientY: number): boolean {
	return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function pointerDragDetail(event: Event): SessionPointerDragDetail | null {
	return event instanceof CustomEvent ? ((event.detail as SessionPointerDragDetail | undefined) ?? null) : null;
}

function insertPaneAt(
	panes: readonly WorkspaceSplitRef[],
	pane: WorkspaceSplitRef,
	index: number,
): readonly WorkspaceSplitRef[] {
	const withoutPane = panes.filter(candidate => !sameSessionRef(candidate.sessionRef, pane.sessionRef));
	const insertionIndex = Math.max(0, Math.min(withoutPane.length, index));
	const inserted = [...withoutPane.slice(0, insertionIndex), pane, ...withoutPane.slice(insertionIndex)];
	if (inserted.length <= MAX_WORKSPACE_SPLITS) return inserted;
	return insertionIndex === 0 ? inserted.slice(0, MAX_WORKSPACE_SPLITS) : inserted.slice(-MAX_WORKSPACE_SPLITS);
}

function splitPaneExists(panes: readonly WorkspaceSplitRef[], pane: WorkspaceSplitRef): boolean {
	return panes.some(candidate => sameSessionRef(candidate.sessionRef, pane.sessionRef));
}

function dropPreviewCountFor(baseCount: number, existingPane: boolean): number {
	if (baseCount <= 0) return 0;
	if (existingPane) return baseCount;
	if (baseCount >= MAX_WORKSPACE_SPLITS) return 0;
	return Math.min(MAX_WORKSPACE_SPLITS, baseCount + 1);
}

function shouldSelectSplitPane(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return true;
	// Composer controls are session controls. In split view the model/context
	// chips are buttons, but clicking them must first make that pane the active
	// session; otherwise the global overlays mutate whichever pane was active
	// before and the clicked pane appears to snap back to its old model.
	if (target.closest('[data-slot="composer"]')) return true;
	return !target.closest('[data-split-pane-action="close"],button,a,input,textarea,select,[role="button"]');
}

function shouldArmPanePopoutDrag({
	clientX,
	clientY,
	startX,
	startY,
	stripRect,
}: {
	readonly clientX: number;
	readonly clientY: number;
	readonly startX: number;
	readonly startY: number;
	readonly stripRect: DOMRect;
}): boolean {
	const moved = Math.hypot(clientX - startX, clientY - startY);
	if (moved < WORKSPACE_POPOUT_DRAG_DISTANCE) return false;
	return (
		clientY < stripRect.top - WORKSPACE_POPOUT_STRIP_EXIT ||
		clientY > stripRect.bottom + WORKSPACE_POPOUT_STRIP_EXIT ||
		clientX < stripRect.left - WORKSPACE_POPOUT_STRIP_EXIT ||
		clientX > stripRect.right + WORKSPACE_POPOUT_STRIP_EXIT
	);
}

interface WorkspaceTopActionsProps {
	readonly appMode: AppMode;
	readonly dockTab: string;
	readonly dockTabs: readonly DockTab[];
	readonly topBarActions?: readonly string[];
	readonly environmentOpen: boolean;
	readonly onRefreshSessions?: (workspaceId?: string) => void;
	readonly onToggleDock: () => void;
	readonly onOpenDockMenu: (event: MouseEvent<HTMLButtonElement>) => void;
	readonly onToggleEnvironment: () => void;
}

const WorkspaceTopActions = memo(function WorkspaceTopActions({
	appMode,
	dockTab,
	dockTabs,
	environmentOpen,
	topBarActions,
	onRefreshSessions,
	onToggleDock,
	onOpenDockMenu,
	onToggleEnvironment,
}: WorkspaceTopActionsProps) {
	// Deployment-profile allowlist: omit ⇒ every action; a list ⇒ only those ids.
	const show = (id: string) => !topBarActions || topBarActions.includes(id);
	return (
		<>
			{show("jobs") && <ConnectedJobsBadge />}
			{show("refresh") && (
				<IconButton title="Refresh sessions" onClick={() => onRefreshSessions?.()}>
					<Icon name="history" size={16} />
				</IconButton>
			)}
			{/* The Environment CARD toggle — a floating overlay pinned top-right of
			    the chat column (the locked design), NOT a dock tab. */}
			{appMode === "code" && show("environment") && (
				<IconButton
					title="Environment"
					onClick={onToggleEnvironment}
					className={environmentOpen ? "bg-fr-surface-2 text-fr-text" : undefined}
					aria-pressed={environmentOpen}
				>
					<Icon name="layers" size={15} strokeWidth={1.6} />
				</IconButton>
			)}
			{(appMode === "code" || appMode === "chat") && show("dock") && (
				<DockSplit
					label={
						// Always a real view name — never the word "Dock". An unknown
						// current tab resolves to the first available view (the same
						// fallback DockContent renders).
						dockTabs.find(tab => tab.id === dockTab)?.label ??
						RENDER_KIND_META[dockTab]?.label ??
						dockTabs[0]?.label ??
						"Code"
					}
					onToggle={onToggleDock}
					onCaret={onOpenDockMenu}
					className="max-[520px]:hidden"
				/>
			)}
		</>
	);
});

interface StartSurfaceStageProps {
	readonly workspace: WorkspaceRef | null | undefined;
	readonly workspaces: readonly WorkspaceRef[];
	readonly sessions: readonly SessionSnapshot[];
	readonly analytics: WorkspaceAnalyticsState;
	readonly composer: string;
	readonly streaming?: boolean;
	readonly disabled: boolean;
	readonly leftSlot: ReactNode;
	readonly rightSlot: ReactNode;
	readonly onComposerChange: (value: string) => void;
	readonly onSubmit: ComposerSubmit;
	readonly onSlash: () => void;
	readonly onStop: () => void;
	readonly onWorkspaceSelect?: (workspace: WorkspaceRef) => void;
	readonly onAddProject?: () => void;
	readonly onBranchSelect?: (branch: string) => void;
	readonly onNewWorktree?: () => void;
	readonly onMoveToWorktree?: (sessionRef: SessionRef) => void;
	readonly sessionDriver: SessionDriver | null | undefined;
	readonly sessionRef: SessionRef | null | undefined;
}

function StartSurfaceStage(props: StartSurfaceStageProps) {
	// Hand the raw committed value + handlers straight to the surface; the draft
	// state now lives inside <StartComposer>, so typing re-renders only the
	// composer — not the analytics dashboard sitting beside it on the surface.
	return (
		<StartSurface
			workspace={props.workspace}
			workspaces={props.workspaces}
			sessions={props.sessions}
			analytics={props.analytics}
			committed={props.composer}
			onComposerChange={props.onComposerChange}
			onSubmit={props.onSubmit}
			onSlash={props.onSlash}
			onStop={props.onStop}
			sessionDriver={props.sessionDriver}
			sessionRef={props.sessionRef}
			streaming={props.streaming}
			disabled={props.disabled}
			leftSlot={props.leftSlot}
			rightSlot={props.rightSlot}
			onWorkspaceSelect={props.onWorkspaceSelect}
			onAddProject={props.onAddProject}
			onBranchSelect={props.onBranchSelect}
			onNewWorktree={props.onNewWorktree}
			onMoveToWorktree={props.onMoveToWorktree}
		/>
	);
}

interface ThreadStageProps {
	readonly isOpeningSession: boolean;
	readonly title: string;
	readonly repo: string;
	readonly avatar: AvatarId;
	readonly vibrState: PresenceState;
	readonly vibrMode: string;
	readonly energy: number;
	readonly verb: string;
	readonly showPresence: boolean;
	readonly showAvatar: boolean;
	readonly agentMeta: string;
}

const ThreadStage = memo(function ThreadStage(props: ThreadStageProps) {
	return (
		<Thread
			presence={
				<Presence
					avatar={props.avatar}
					state={props.vibrState}
					mode={presenceMode(props.vibrMode)}
					energy={props.energy}
				/>
			}
			verb={props.verb}
			showPresence={props.showPresence}
			showAvatar={props.showAvatar}
			agentMetaFallback={props.agentMeta}
			emptyState={props.isOpeningSession ? <OpeningThreadSkeleton /> : undefined}
			contentClassName="max-w-[780px] px-7 pt-8 pb-12"
		/>
	);
});

export type WorkspaceSurfaceSubmit = (
	value: string,
	attachments?: readonly ComposerImageAttachment[],
	expansion?: string,
) => ComposerSubmitResult;

export interface WorkspaceSurfaceHostProps {
	readonly appMode: AppMode;
	/** The active space's mounted workspace surface (doc 44 §5). */
	readonly activeSurface: SurfaceId;
	/** ONE navigation channel: workspace affordances emit typed ShellIntents. */
	readonly onIntent: (intent: ShellIntent) => void;
	/** Active definition + code registry are separate by design: manifest data
	 * chooses a fill id; the installed box supplies its React implementation. */
	readonly activeSpace: SpaceUiDef;
	readonly surfaceFills: WorkspaceSurfaceFills<WorkspaceSurfaceHostProps>;
	readonly enginePipelines?: readonly EnginePipelineRecord[];
	readonly engineDesignSystems?: readonly EngineDesignSystemRecord[];
	/** Plugin-contributed artifactory packs + the host's bundle-URL composer. */
	readonly engineArtifactories?: readonly EngineArtifactoryRecord[];
	readonly resolvePluginAssetUrl?: (pluginId: string, path: string) => string | null;
	/** The bundled team (jury) + evaluator catalogs — resolve a pipeline stage's
	 *  critic team + evaluators to human labels in the pipeline detail view. */
	readonly engineTeams?: readonly EngineTeamRecord[];
	readonly engineEvaluators?: readonly EngineEvaluatorRecord[];
	readonly showStartSurface: boolean;
	readonly isOpeningSession: boolean;
	readonly threadRef: RefObject<HTMLDivElement | null>;
	readonly sessionRef: SessionRef | null | undefined;
	readonly sessionCatalog: readonly SessionSnapshot[];
	readonly sessionDriver: SessionDriver | null | undefined;
	readonly workspace: WorkspaceRef | null | undefined;
	readonly workspaceDriver: WorkspaceDriver | null | undefined;
	readonly workspaces: readonly WorkspaceRef[];
	readonly sessions: readonly SessionSnapshot[];
	readonly analytics: WorkspaceAnalyticsState;
	readonly composer: string;
	readonly streaming?: boolean;
	readonly placeholder: string;
	readonly leftSlot: ReactNode;
	readonly rightSlot: ReactNode;
	readonly renderRightSlot: () => ReactNode;
	readonly title: string;
	readonly repo: string;
	readonly avatar: AvatarId;
	readonly vibrState: ThreadStageProps["vibrState"];
	readonly vibrMode: string;
	readonly energy: number;
	readonly tailVerb: string;
	readonly showTailPresence: boolean;
	readonly showAvatars: boolean;
	readonly agentMeta: string;
	readonly onComposerChange: (value: string) => void;
	readonly onSubmit: WorkspaceSurfaceSubmit;
	readonly onSlash: () => void;
	readonly onStop: () => void;
	readonly onSessionSelect?: (sessionRef: SessionRef) => void;
	readonly onSessionPopout?: (
		sessionRef: SessionRef,
		title?: string,
		workspace?: WorkspaceRef,
	) => void | Promise<void>;
	readonly onWorkspaceSelect?: (workspace: WorkspaceRef) => void;
	readonly onAddProject?: () => void;
	readonly onBranchSelect?: (branch: string) => void;
	readonly modelsActive?: boolean;
	readonly modelsHomeProps?: ModelsHomeProps;
	readonly onModelAgent?: (seed: string) => void;
	readonly dockOpen?: boolean;
	/** Nudge the session catalog to re-poll. */
	readonly onRefreshSessions?: (workspaceId?: string) => void;
	readonly onPromoteRun?: (sessionRef: SessionRef, title: string) => void;
	readonly tiling: WorkspaceTilingState;
}



function UnknownWorkspaceFill({ fillId, space }: { readonly fillId: string; readonly space: SpaceUiDef }) {
	return (
		<div
			data-slot="workspace-fill-missing"
			className="flex min-h-0 flex-1 items-center justify-center bg-fr-bg px-6 text-center"
		>
			<div className="max-w-[48ch] rounded-[10px] border border-fr-border bg-fr-surface px-5 py-4">
				<p className="text-fr-sm font-medium text-fr-text">This space surface is not installed</p>
				<p className="mt-1 text-fr-xs leading-relaxed text-fr-text-2">
					{space.label} requested <code className="font-mono text-fr-text">{fillId}</code>, but its surface code is
					unavailable. Reinstall or enable the space plugin, then try again.
				</p>
			</div>
		</div>
	);
}

function WorkspaceStage(props: WorkspaceSurfaceHostProps) {
	if (props.modelsActive && props.modelsHomeProps)
		return <ModelsHome {...props.modelsHomeProps} onModelAgent={props.onModelAgent} />;

	const fillId = props.activeSpace.workspace.fills?.[props.activeSurface];
	if (fillId) {
		const Fill = resolveWorkspaceSurfaceFill(props.surfaceFills, fillId);
		return Fill ? <Fill {...props} /> : <UnknownWorkspaceFill fillId={fillId} space={props.activeSpace} />;
	}

	if (props.tiling.panes.length > 0) return <WorkspaceSplitStage {...props} />;
	if (props.showStartSurface) return <StartSurfaceStage {...props} disabled={props.isOpeningSession} />;
	return (
		<ThreadStage
			isOpeningSession={props.isOpeningSession}
			title={props.title}
			repo={props.repo}
			avatar={props.avatar}
			vibrState={props.vibrState}
			vibrMode={props.vibrMode}
			energy={props.energy}
			verb={props.tailVerb}
			showPresence={props.showTailPresence}
			showAvatar={props.showAvatars}
			agentMeta={props.agentMeta}
		/>
	);
}

function WorkspaceSplitStage(props: WorkspaceSurfaceHostProps) {
	const widths = normalizePaneWidths(props.tiling.widths, props.tiling.panes.length);
	return (
		<div data-slot="workspace-split" className="flex min-h-0 flex-1 overflow-hidden bg-fr-bg">
			{props.tiling.panes.map((pane, index) => (
				<Fragment key={sessionRefKey(pane.sessionRef)}>
					<WorkspaceSplitPane
						pane={pane}
						frame={props}
						width={widths[index] ?? 100 / props.tiling.panes.length}
						active={props.tiling.activePaneKey === sessionRefKey(pane.sessionRef)}
					/>
					{index < props.tiling.panes.length - 1 && (
						<WorkspaceSplitResizeHandle index={index} onResizeStart={props.tiling.onSplitResizeStart} />
					)}
				</Fragment>
			))}
		</div>
	);
}

function WorkspaceSplitPane({
	pane,
	frame,
	width,
	active,
}: {
	readonly pane: WorkspaceSplitRef;
	readonly frame: WorkspaceSurfaceHostProps;
	readonly width: number;
	readonly active: boolean;
}) {
	return (
		<section
			data-slot="workspace-split-pane"
			data-active={active || undefined}
			style={{ flexBasis: `${width}%` }}
			className="relative flex min-h-0 min-w-[var(--fr-workspace-split-min-w,360px)] flex-col overflow-hidden bg-fr-bg"
			onFocusCapture={event => frame.tiling.onPaneFocus(pane, shouldSelectSplitPane(event.target))}
			onPointerDownCapture={event => {
				frame.tiling.onPaneFocus(pane, shouldSelectSplitPane(event.target));
			}}
		>
			<button
				type="button"
				aria-label={`Close ${pane.title}`}
				title="Close split pane"
				data-split-pane-action="close"
				onClick={() => frame.tiling.onPaneClose(pane)}
				className="absolute right-3 top-3 z-20 grid size-6 place-items-center rounded-md text-fr-text-3 opacity-50 transition-colors hover:bg-fr-surface hover:text-fr-text hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fr-accent-line"
			>
				<Icon name="x" size={13} strokeWidth={2} />
			</button>
			<WorkspaceSessionPane
				driver={frame.sessionDriver}
				sessionRef={pane.sessionRef}
				initialSnapshot={sessionSnapshotFromCatalog(frame.sessionCatalog, pane.sessionRef)}
				chrome={workspaceSessionChrome(frame)}
				active={active}
			/>
			{!active && (
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 z-10 bg-black/[0.16] transition-opacity duration-150"
				/>
			)}
		</section>
	);
}

function WorkspaceBodyDropPreview({
	dropIndex,
	previewCount,
}: {
	readonly dropIndex: number | null;
	readonly previewCount: number;
}) {
	if (dropIndex == null || previewCount < 2) return null;
	const slotWidth = 100 / previewCount;
	const slotIndex = Math.max(0, Math.min(previewCount - 1, dropIndex));
	const leftPercent = slotIndex * slotWidth;
	return (
		<div className="pointer-events-none absolute inset-0 z-20">
			<div
				className="absolute inset-y-0 bg-fr-accent/10"
				style={{ left: `${leftPercent}%`, width: `${slotWidth}%` }}
			/>
		</div>
	);
}

function WorkspacePanePopoutDragPreview({ drag }: { readonly drag: WorkspacePanePopoutDragState | null }) {
	if (!drag) return null;
	return (
		<div
			className={cn(
				"pointer-events-none fixed z-50 flex max-w-[280px] items-center gap-2 rounded-[7px] border border-fr-border-soft bg-fr-surface px-3 py-2 text-fr-sm text-fr-text shadow-2xl transition-opacity",
				drag.armed ? "opacity-100" : "opacity-65",
			)}
			style={{ left: drag.x + 12, top: drag.y + 12 }}
		>
			<Icon name="arrowUpRight" size={14} strokeWidth={1.8} className="shrink-0 text-fr-accent" />
			<span className="fr-overflow">{drag.title}</span>
		</div>
	);
}

function WorkspaceSplitResizeHandle({
	index,
	onResizeStart,
}: {
	readonly index: number;
	readonly onResizeStart: (index: number, event: PointerEvent<HTMLButtonElement>) => void;
}) {
	return (
		<button
			type="button"
			aria-label="Resize workspace panes"
			onPointerDown={event => onResizeStart(index, event)}
			className="relative z-10 -mx-2 w-4 shrink-0 cursor-col-resize border-0 bg-transparent p-0 touch-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-fr-border-soft before:transition-[background-color,width] before:duration-[var(--fr-motion-fast)] hover:before:w-0.5 hover:before:bg-fr-accent focus-visible:outline-none focus-visible:before:w-0.5 focus-visible:before:bg-fr-accent"
		/>
	);
}

function WorkspaceMainContent(props: WorkspaceSurfaceHostProps) {
	return (
		<div
			ref={props.threadRef}
			className={cn(
				"relative flex min-h-0 flex-1 flex-col",
				props.showStartSurface && !props.modelsActive && "overflow-y-auto",
			)}
		>
			{/* Crash boundary per mounted surface (doc 44 §12.1): keyed on the
			 * active surface so navigating away and back retries a crashed one. */}
			<SpaceSlotBoundary slot="workspace-surface" key={props.activeSurface}>
				<WorkspaceStage {...props} />
			</SpaceSlotBoundary>
		</div>
	);
}

interface ComposerSlotProps {
	readonly showStartSurface: boolean;
	readonly composer: string;
	readonly streaming?: boolean;
	readonly disabled: boolean;
	readonly placeholder: string;
	readonly leftSlot: ReactNode;
	readonly rightSlot: ReactNode;
	readonly sessionDriver: SessionDriver | null | undefined;
	readonly sessionRef: SessionRef | null | undefined;
	readonly onComposerChange: (value: string) => void;
	readonly onSubmit: ComposerSubmit;
	readonly onSlash: () => void;
	readonly onStop: () => void;
}

function ComposerSlot({
	showStartSurface,
	composer,
	streaming,
	disabled,
	placeholder,
	leftSlot,
	rightSlot,
	sessionDriver,
	sessionRef,
	onComposerChange,
	onSubmit,
	onSlash,
	onStop,
}: ComposerSlotProps) {
	const session = useSessionOptional();
	// Image attachments are persisted per session (mirrors the split-pane composer):
	// the docked composer stays mounted across session switches, so without a
	// session-keyed store an attached image would bleed into the next session.
	const composerAttachments = useSessionComposerDraft(sessionRef ? sessionRefKey(sessionRef) : "");
	// Seeded CONTEXT (loop-agent dock): the purpose stays visible as a badge, and
	// primed skills are rendered as chips then injected into the submitted text.
	const composerContextKey = sessionRef ? sessionRefKey(sessionRef) : "";
	const seededContext = useSessionComposerContext(composerContextKey);
	const submitWithPrimedSkills = useCallback<ComposerSubmit>(
		(value, attachments) => onSubmit(applyComposerSeededContext(value, seededContext), attachments),
		[onSubmit, seededContext],
	);
	const composerDraft = useComposerDraft(composer, onComposerChange, submitWithPrimedSkills);
	const slashCommands = useSlashCommands(composerDraft.value, sessionDriver, sessionRef);
	const fileCompletionSource = useFileCompletions(sessionDriver, sessionRef);
	const argumentCompletionSource = useArgumentCompletions(sessionDriver, sessionRef);
	const contextTag: ComposerContextTag | null = seededContext?.badge
		? {
				label: seededContext.badge.label,
				icon: seededContext.badge.icon as ComposerContextTag["icon"],
				onRemove: () => seedSessionComposerContext(composerContextKey, null),
			}
		: null;
	// Register this session as the drop-anywhere target: a file dropped outside an explicit drop
	// zone routes into THIS composer (see useGlobalFileDropGuard).
	useEffect(() => {
		setActiveComposerDraftKey(sessionRef ? sessionRefKey(sessionRef) : "");
	}, [sessionRef]);
	const submitGoalCommand = useCallback((command: string) => void onSubmit(command), [onSubmit]);
	const pauseGoal = useCallback(() => submitGoalCommand("/goal pause"), [submitGoalCommand]);
	const resumeGoal = useCallback(() => submitGoalCommand("/goal resume"), [submitGoalCommand]);
	const clearGoal = useCallback(() => submitGoalCommand("/goal drop"), [submitGoalCommand]);
	const editGoal = useCallback(
		(objective: string) => submitGoalCommand(`/goal set ${objective}`),
		[submitGoalCommand],
	);
	const ephemeralActive = session?.snapshot?.config?.ephemeral === true;
	const scratchModes = useMemo<ModePillItem[]>(
		() =>
			ephemeralActive
				? [
						{
							id: "scratch",
							label: "Scratch",
							icon: "clock",
							tone: "mute",
							onClose: () => {
								if (sessionDriver && sessionRef) void sessionDriver.setSessionEphemeral(sessionRef, false);
							},
						},
					]
				: [],
		[ephemeralActive, sessionDriver, sessionRef],
	);
	// The generic mode-state channel (`mode_state_changed` -> `modeStateChanged`):
	// any mode the engine publishes (loop, advisor, future modes) renders here with
	// ZERO per-feature code — closing a pill just resubmits its `closeCommand`,
	// identical to the user typing it. "fast" is the one deliberate exception: it
	// renders as a lightning icon beside the model picker (`ComposerSessionRightSlot`
	// in fraym-frame-model-core.tsx), not a pill, per design — excluded here.
	//
	// Dispatched via a DIRECT `sendUserMessage` call (mirrors `scratchModes`'s
	// `onClose` above), never through the shared `onSubmit` — that path wraps
	// prose with the user's composer "send behavior" (steer/follow-up) when a
	// turn is running, which silently turned a pill's deterministic close
	// command into queued/steered TEXT instead of an executed command: the
	// pill never cleared no matter how many times you clicked it, because the
	// underlying `/advisor off` (etc.) never actually ran.
	const genericModes = useMemo<ModePillItem[]>(
		() =>
			modeStatesToPillItems(
				(session?.modes ?? []).filter(mode => mode.id !== FAST_MODE_ID),
				text => {
					if (sessionDriver && sessionRef) void sessionDriver.sendUserMessage(sessionRef, { text });
				},
			),
		[session?.modes, sessionDriver, sessionRef],
	);
	const modePills = useMemo<ModePillItem[]>(() => [...scratchModes, ...genericModes], [scratchModes, genericModes]);
	const goalTopSlot = useMemo(
		() => (
			<>
				<UsageLimitComposerSurface />
				<GoalComposerSurface
					goal={session?.goal}
					disabled={disabled}
					onEditGoal={editGoal}
					onPauseGoal={pauseGoal}
					onResumeGoal={resumeGoal}
					onClearGoal={clearGoal}
				/>
			</>
		),
		[clearGoal, disabled, editGoal, pauseGoal, resumeGoal, session?.goal],
	);
	// Mode pills (scratch + the generic mode-state channel) live in the
	// composer's bottom toolbar, inline beside the permission dropdown
	// (Codex-style), NOT in a floating strip above the input.
	const composerLeftSlot =
		modePills.length > 0 ? (
			<>
				{leftSlot}
				<ModePills modes={modePills} />
			</>
		) : (
			leftSlot
		);
	if (showStartSurface) return null;
	return (
		<Composer
			value={composerDraft.value}
			onChange={composerDraft.onChange}
			onSubmit={composerDraft.onSubmit}
			attachments={composerAttachments.attachments}
			onAttachmentsChange={composerAttachments.setAttachments}
			pasteAttachments={composerAttachments.pasteAttachments}
			onPasteAttachmentsChange={composerAttachments.setPasteAttachments}
			onSlash={onSlash}
			slashCommands={slashCommands}
			fileCompletionSource={fileCompletionSource}
			argumentCompletionSource={argumentCompletionSource}
			onStop={onStop}
			streaming={streaming}
			disabled={disabled}
			placeholder={placeholder}
			contextTag={contextTag}
			primedSkills={seededContext?.skills}
			showTips
			topSlot={goalTopSlot}
			leftSlot={composerLeftSlot}
			rightSlot={rightSlot}
		/>
	);
}
interface PageDockPanel {
	readonly tab: DockTab;
	readonly content: ReactNode;
}

interface DockContentProps {
	readonly open: boolean;
	readonly appMode: AppMode;
	readonly dockTab: string;
	readonly dockTabs: readonly DockTab[];
	readonly tree: SessionTreeSnapshot | null;
	readonly tasks: readonly { readonly name: string; readonly status: string }[];
	readonly runningTools: number;
	readonly workspace: WorkspaceRef | null | undefined;
	readonly sessionId?: string;
	readonly workspaceDriver: WorkspaceDriver | null | undefined;
	readonly terminalDriver: TerminalDriver | null | undefined;
	readonly onTabChange: (tab: string) => void;
	readonly onResizeStart: (event: PointerEvent<HTMLButtonElement>) => void;
	readonly pageDockPanel?: PageDockPanel | null;
}

function dockPanel({
	dockTab,
	pageDockPanel,
	tasks,
	tree,
	workspace,
	sessionId,
	workspaceDriver,
	terminalDriver,
	onTabChange,
}: Pick<
	DockContentProps,
	| "dockTab"
	| "pageDockPanel"
	| "tasks"
	| "tree"
	| "workspace"
	| "sessionId"
	| "workspaceDriver"
	| "terminalDriver"
	| "onTabChange"
>): ReactNode {
	if (pageDockPanel?.tab.id === dockTab) return pageDockPanel.content;
	switch (dockTab) {
		case "preview":
			return <DockPreview />;
		case "plan":
		case "tasks":
			return (
				<DockTasksView
					tasks={tasks}
					view={dockTab === "plan" ? "plan" : "task"}
					onViewChange={v => onTabChange(v === "plan" ? "plan" : "tasks")}
				/>
			);
		case "tree":
			return <DockTreeView tree={tree} />;
		case "terminal":
			return <DockTerminalView workspace={workspace} terminalDriver={terminalDriver} sessionId={sessionId} />;
		case "files":
			return <DockFilesView workspace={workspace} workspaceDriver={workspaceDriver} />;
		case "ide":
			return <DockIdeView workspace={workspace} workspaceDriver={workspaceDriver} />;
		case "board":
			return <DockBoardView workspace={workspace} />;
		case "insights":
			return <DockInsights />;
		default:
			return <DockDiffView />;
	}
}

function sameTasks(
	prev: readonly { readonly name: string; readonly status: string }[],
	next: readonly { readonly name: string; readonly status: string }[],
): boolean {
	return (
		prev.length === next.length &&
		prev.every((task, index) => task.name === next[index]?.name && task.status === next[index]?.status)
	);
}

function workspaceKey(workspace: WorkspaceRef | null | undefined): string {
	return workspace ? `${workspace.workspaceId}:${workspace.path}` : "";
}

function dockChromeChanged(prev: DockContentProps, next: DockContentProps): boolean {
	return (
		prev.open !== next.open ||
		prev.appMode !== next.appMode ||
		prev.dockTab !== next.dockTab ||
		prev.dockTabs !== next.dockTabs ||
		prev.pageDockPanel !== next.pageDockPanel ||
		prev.onTabChange !== next.onTabChange ||
		prev.onResizeStart !== next.onResizeStart
	);
}

function sameWorkspaceDock(
	prev: DockContentProps,
	next: DockContentProps,
	driverKey: "workspaceDriver" | "terminalDriver",
): boolean {
	return prev[driverKey] === next[driverKey] && workspaceKey(prev.workspace) === workspaceKey(next.workspace);
}

function sameDockPanelData(prev: DockContentProps, next: DockContentProps): boolean {
	if (next.dockTab === "plan") return sameTasks(prev.tasks, next.tasks);
	if (next.dockTab === "tasks")
		return (
			prev.runningTools === next.runningTools &&
			workspaceKey(prev.workspace) === workspaceKey(next.workspace)
		);
	if (next.dockTab === "board")
		return workspaceKey(prev.workspace) === workspaceKey(next.workspace);
	if (next.dockTab === "tree") return prev.tree === next.tree;
	if (next.dockTab === "ide") return sameWorkspaceDock(prev, next, "workspaceDriver");
	if (next.dockTab === "files") return sameWorkspaceDock(prev, next, "workspaceDriver");
	if (next.dockTab === "terminal")
		return sameWorkspaceDock(prev, next, "terminalDriver") && prev.sessionId === next.sessionId;
	return true;
}

function sameDockContentProps(prev: DockContentProps, next: DockContentProps): boolean {
	if (dockChromeChanged(prev, next)) return false;
	if (!next.open || next.pageDockPanel || (next.appMode !== "code" && next.appMode !== "chat")) return true;
	return sameDockPanelData(prev, next);
}

const DockContent = memo(function DockContent({
	open,
	appMode,
	dockTab,
	dockTabs,
	tasks,
	tree,
	workspace,
	sessionId,
	workspaceDriver,
	terminalDriver,
	onTabChange,
	onResizeStart,
	pageDockPanel,
}: DockContentProps) {
	if (!open || (!pageDockPanel && appMode !== "code" && appMode !== "chat")) return undefined;
	const activeDockTab = pageDockPanel
		? pageDockPanel.tab.id
		: dockTab === "plan" || dockTabs.some(tab => tab.id === dockTab)
			? dockTab
			: (dockTabs[0]?.id ?? dockTab);
	return (
		<RightDock onResizeStart={onResizeStart}>
			{dockPanel({
				dockTab: activeDockTab,
				pageDockPanel,
				tasks,
				tree,
				workspace,
				sessionId,
				workspaceDriver,
				terminalDriver,
				onTabChange,
			})}
		</RightDock>
	);
}, sameDockContentProps);

export interface FraymFrameWorkspaceProps {
	readonly className?: string;
	readonly rail: ReactNode;
	readonly workspaceOnly?: boolean;
	readonly appMode: AppMode;
	readonly dockOpen: boolean;
	readonly railMode: RailMode;
	/** Toggles the session rail between expanded and compact. Lives on the
	 *  workspace TOP BAR (not the rail) so the control survives every rail state —
	 *  a compact/hidden rail can't offer its own reopen affordance. */
	readonly onToggleRail?: () => void;
	readonly dockWidth: number;
	readonly dockTab: string;
	readonly dockTabs: readonly DockTab[];
	readonly topBarActions?: readonly string[];
	readonly activeInsight: string | null;
	readonly sessionRef: SessionRef | null | undefined;
	readonly sessionCatalog: readonly SessionSnapshot[];
	readonly sessionDriver: SessionDriver | null | undefined;
	readonly repo: string;
	readonly title: string;
	readonly branch: string;
	readonly threadRef: RefObject<HTMLDivElement | null>;
	readonly showStartSurface: boolean;
	readonly isOpeningSession: boolean;
	readonly workspace: WorkspaceRef | null | undefined;
	readonly workspaceDriver: WorkspaceDriver | null | undefined;
	readonly terminalDriver: TerminalDriver | null | undefined;
	readonly activeSpace: SpaceUiDef;
	readonly surfaceFills: WorkspaceSurfaceFills<WorkspaceSurfaceHostProps>;
	/** The active space's mounted workspace surface (doc 44 §5). */
	readonly activeSurface: SurfaceId;
	/** ONE navigation channel: workspace affordances emit typed ShellIntents. */
	readonly onIntent: (intent: ShellIntent) => void;
	/** The engine's live Pipeline catalog (resource snapshot); absent falls back
	 *  to the bundled starter catalog. */
	readonly enginePipelines?: readonly EnginePipelineRecord[];
	readonly engineDesignSystems?: readonly EngineDesignSystemRecord[];
	readonly engineArtifactories?: readonly EngineArtifactoryRecord[];
	readonly resolvePluginAssetUrl?: (pluginId: string, path: string) => string | null;
	readonly engineTeams?: readonly EngineTeamRecord[];
	readonly engineEvaluators?: readonly EngineEvaluatorRecord[];
	readonly workspaces: readonly WorkspaceRef[];
	readonly sessions: readonly SessionSnapshot[];
	readonly analytics: WorkspaceAnalyticsState;
	readonly composer: string;
	readonly streaming?: boolean;
	readonly leftSlot: ReactNode;
	readonly rightSlot: ReactNode;
	readonly renderRightSlot: () => ReactNode;
	readonly placeholder: string;
	readonly avatar: AvatarId;
	readonly vibrState: ThreadStageProps["vibrState"];
	readonly vibrMode: string;
	readonly energy: number;
	readonly tailVerb: string;
	readonly showTailPresence: boolean;
	readonly showAvatars: boolean;
	readonly agentMeta: string;
	readonly tree: SessionTreeSnapshot | null;
	readonly tasks: readonly { readonly name: string; readonly status: string }[];
	readonly runningTools: number;
	readonly onRefreshSessions?: (workspaceId?: string) => void;
	readonly onToggleDock: () => void;
	readonly onOpenDockMenu: (event: MouseEvent<HTMLButtonElement>) => void;
	readonly onDockTabChange: (tab: string) => void;
	readonly onCloseDock: () => void;
	readonly onDockResizeStart: (event: PointerEvent<HTMLButtonElement>) => void;
	readonly onComposerChange: (value: string) => void;
	readonly onSubmit: ComposerSubmit;
	readonly onSlash: () => void;
	readonly onStop: () => void;
	readonly onSessionSelect?: (sessionRef: SessionRef) => void;
	readonly onSessionPopout?: (
		sessionRef: SessionRef,
		title?: string,
		workspace?: WorkspaceRef,
	) => void | Promise<void>;
	readonly onWorkspaceSelect?: (workspace: WorkspaceRef) => void;
	readonly onAddProject?: () => void;
	readonly onBranchSelect?: (branch: string) => void;
	readonly onNewWorktree?: () => void;
	readonly onMoveToWorktree?: (sessionRef: SessionRef) => void;
	readonly modelsActive?: boolean;
	readonly modelsHomeProps?: ModelsHomeProps;
	readonly onModelAgent?: (seed: string) => void;
	readonly onPromoteRun?: (sessionRef: SessionRef, title: string) => void;
}

// The ambient chat backdrop and its state dock were part of a personal-companion
// lane this build does not ship; the chat surface renders on the plain theme
// background instead.

interface WorkspaceSplitCloseResult {
	readonly nextPanes: readonly WorkspaceSplitRef[];
	readonly nextWidths: readonly number[];
	readonly nextSelection: WorkspaceSplitRef | null;
	readonly selectedPane: WorkspaceSplitRef | null;
	readonly clearDropPreview: boolean;
}

function optionalSplitPaneKey(pane: WorkspaceSplitRef | null): string | null {
	return pane ? sessionRefKey(pane.sessionRef) : null;
}

function selectedPaneAfterClose({
	closingPane,
	nextSelection,
	collapseToSingle,
	selectedSessionRef,
}: {
	readonly closingPane: WorkspaceSplitRef;
	readonly nextSelection: WorkspaceSplitRef | null;
	readonly collapseToSingle: boolean;
	readonly selectedSessionRef: SessionRef | null;
}): WorkspaceSplitRef | null {
	if (!nextSelection) return null;
	const shouldSelect = collapseToSingle || sameSessionRef(closingPane.sessionRef, selectedSessionRef);
	return shouldSelect ? nextSelection : null;
}

function selectSplitPaneSession(
	onSessionSelect: FraymFrameWorkspaceProps["onSessionSelect"],
	pane: WorkspaceSplitRef | null,
) {
	if (pane) onSessionSelect?.(pane.sessionRef);
}

function resolveSplitPaneClose({
	current,
	pane,
	widths,
	selectedSessionRef,
}: {
	readonly current: readonly WorkspaceSplitRef[];
	readonly pane: WorkspaceSplitRef;
	readonly widths: readonly number[];
	readonly selectedSessionRef: SessionRef | null;
}): WorkspaceSplitCloseResult {
	const paneIndex = current.findIndex(candidate => sameSessionRef(candidate.sessionRef, pane.sessionRef));
	const remainingPanes = current.filter(candidate => !sameSessionRef(candidate.sessionRef, pane.sessionRef));
	const nextSelectionIndex = Math.max(0, Math.min(remainingPanes.length - 1, paneIndex));
	const nextSelection = remainingPanes[nextSelectionIndex] ?? null;
	const collapseToSingle = remainingPanes.length <= 1;
	return {
		nextPanes: collapseToSingle ? [] : remainingPanes,
		nextWidths: collapseToSingle
			? []
			: normalizePaneWidths(
					widths.filter((_, index) => index !== paneIndex),
					remainingPanes.length,
				),
		nextSelection,
		selectedPane: selectedPaneAfterClose({
			closingPane: pane,
			nextSelection,
			collapseToSingle,
			selectedSessionRef,
		}),
		clearDropPreview: collapseToSingle,
	};
}

function activePaneKeyAfterClose({
	currentKey,
	closingPane,
	nextPanes,
	nextSelection,
}: {
	readonly currentKey: string | null;
	readonly closingPane: WorkspaceSplitRef;
	readonly nextPanes: readonly WorkspaceSplitRef[];
	readonly nextSelection: WorkspaceSplitRef | null;
}): string | null {
	const closingKey = sessionRefKey(closingPane.sessionRef);
	const keepCurrent =
		currentKey !== null &&
		currentKey !== closingKey &&
		nextPanes.some(candidate => sessionRefKey(candidate.sessionRef) === currentKey);
	return keepCurrent ? currentKey : optionalSplitPaneKey(nextSelection);
}

function useWorkspaceTiling(frame: FraymFrameWorkspaceProps): WorkspaceTilingState {
	const [panes, setPanes] = useState<readonly WorkspaceSplitRef[]>([]);
	const [widths, setWidths] = useState<readonly number[]>([]);
	const [dragOver, setDragOver] = useState(false);
	const [dropIndex, setDropIndex] = useState<number | null>(null);
	const [dropPreviewCount, setDropPreviewCount] = useState(0);
	const [popoutDrag, setPopoutDrag] = useState<WorkspacePanePopoutDragState | null>(null);
	const dropTargetRef = useRef<HTMLDivElement | null>(null);
	const [activePaneKey, setActivePaneKey] = useState<string | null>(
		frame.sessionRef ? sessionRefKey(frame.sessionRef) : null,
	);
	useEffect(() => {
		if (!frame.sessionRef) return;
		const key = sessionRefKey(frame.sessionRef);
		setActivePaneKey(current =>
			panes.length === 0 || panes.some(pane => sessionRefKey(pane.sessionRef) === key) ? key : current,
		);
	}, [frame.sessionRef, panes]);
	const activePane = useMemo(
		() =>
			frame.sessionRef
				? {
						sessionRef: frame.sessionRef,
						title: sessionTitleFromCatalog(frame.sessionCatalog, frame.sessionRef, frame.title),
					}
				: null,
		[frame.sessionCatalog, frame.sessionRef, frame.title],
	);
	const addPane = useCallback(
		(pane: WorkspaceSplitRef, index: number | null) => {
			setPanes(current => {
				const base = current.length > 0 ? current : activePane ? [activePane] : [];
				if (base.length >= MAX_WORKSPACE_SPLITS && !splitPaneExists(base, pane)) return current;
				const next = insertPaneAt(base, pane, index ?? base.length);
				setWidths(equalPaneWidths(next.length));
				return next;
			});
			setActivePaneKey(sessionRefKey(pane.sessionRef));
			frame.onSessionSelect?.(pane.sessionRef);
		},
		[activePane, frame.onSessionSelect],
	);
	const clearDropState = useCallback(() => {
		setDragOver(false);
		setDropIndex(null);
		setDropPreviewCount(0);
	}, []);
	const pointerDropFromDetail = useCallback(
		(detail: SessionPointerDragDetail): { readonly pane: WorkspaceSplitRef; readonly index: number } | null => {
			const rect = dropTargetRef.current?.getBoundingClientRect();
			if (!rect || !pointInsideRect(rect, detail.clientX, detail.clientY)) {
				clearDropState();
				return null;
			}
			const pane: WorkspaceSplitRef = detail.data;
			const basePanes = panes.length > 0 ? panes : activePane ? [activePane] : [];
			const previewCount = dropPreviewCountFor(basePanes.length, splitPaneExists(basePanes, pane));
			if (previewCount <= 0) {
				clearDropState();
				return null;
			}
			const index = dropSlotIndexFromRect(rect, detail.clientX, previewCount);
			setDragOver(true);
			setDropPreviewCount(previewCount);
			setDropIndex(index);
			return { pane, index };
		},
		[activePane, clearDropState, panes],
	);
	useEffect(() => {
		const onMove = (event: Event) => {
			const detail = pointerDragDetail(event);
			if (detail) pointerDropFromDetail(detail);
		};
		const onDrop = (event: Event) => {
			const detail = pointerDragDetail(event);
			if (!detail) {
				clearDropState();
				return;
			}
			const drop = pointerDropFromDetail(detail);
			clearDropState();
			if (drop) addPane(drop.pane, drop.index);
		};
		const onEnd = () => clearDropState();
		window.addEventListener(FRAYM_SESSION_POINTER_DRAG_MOVE, onMove);
		window.addEventListener(FRAYM_SESSION_POINTER_DRAG_DROP, onDrop);
		window.addEventListener(FRAYM_SESSION_POINTER_DRAG_END, onEnd);
		return () => {
			window.removeEventListener(FRAYM_SESSION_POINTER_DRAG_MOVE, onMove);
			window.removeEventListener(FRAYM_SESSION_POINTER_DRAG_DROP, onDrop);
			window.removeEventListener(FRAYM_SESSION_POINTER_DRAG_END, onEnd);
		};
	}, [addPane, clearDropState, pointerDropFromDetail]);
	const onPaneClose = useCallback(
		(pane: WorkspaceSplitRef) => {
			setPanes(current => {
				const close = resolveSplitPaneClose({
					current,
					pane,
					widths,
					selectedSessionRef: frame.sessionRef ?? null,
				});
				setWidths(close.nextWidths);
				setDropPreviewCount(currentCount => (close.clearDropPreview ? 0 : currentCount));
				if (close.clearDropPreview) setPopoutDrag(null);
				setActivePaneKey(currentKey =>
					activePaneKeyAfterClose({
						currentKey,
						closingPane: pane,
						nextPanes: close.nextPanes,
						nextSelection: close.nextSelection,
					}),
				);
				selectSplitPaneSession(frame.onSessionSelect, close.selectedPane);
				return close.nextPanes;
			});
		},
		[frame.onSessionSelect, frame.sessionRef, widths],
	);
	const onPaneFocus = useCallback(
		(pane: WorkspaceSplitRef, selectSession: boolean) => {
			const paneKey = sessionRefKey(pane.sessionRef);
			setActivePaneKey(paneKey);
			if (!selectSession) return;
			if (sameSessionRef(pane.sessionRef, frame.sessionRef)) {
				return;
			}
			frame.onSessionSelect?.(pane.sessionRef);
		},
		[frame.onSessionSelect, frame.sessionRef],
	);
	const onPanePopoutDragStart = useCallback(
		(pane: WorkspaceSplitRef, title: string, event: PointerEvent<HTMLElement>) => {
			if (!frame.onSessionPopout || event.button !== 0) return;
			const strip = event.currentTarget.closest('[data-slot="workspace-split-top-bars"],[data-slot="top-bar"]');
			const stripRect = strip?.getBoundingClientRect();
			if (!stripRect) return;
			event.preventDefault();
			event.stopPropagation();
			onPaneFocus(pane, true);

			const handle = event.currentTarget;
			const startX = event.clientX;
			const startY = event.clientY;
			const body = document.body;
			const previousCursor = body.style.cursor;
			const previousUserSelect = body.style.userSelect;
			let armed = false;
			let moved = false;
			body.style.cursor = "grabbing";
			body.style.userSelect = "none";
			handle.setPointerCapture?.(event.pointerId);

			const clear = () => {
				body.style.cursor = previousCursor;
				body.style.userSelect = previousUserSelect;
				setPopoutDrag(null);
				if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture?.(event.pointerId);
				window.removeEventListener("pointermove", onMove);
				window.removeEventListener("pointerup", onEnd);
				window.removeEventListener("pointercancel", onCancel);
			};
			const update = (moveEvent: globalThis.PointerEvent) => {
				moved = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) >= 4;
				armed = shouldArmPanePopoutDrag({
					clientX: moveEvent.clientX,
					clientY: moveEvent.clientY,
					startX,
					startY,
					stripRect,
				});
				setPopoutDrag(moved ? { title, x: moveEvent.clientX, y: moveEvent.clientY, armed } : null);
			};
			const onMove = (moveEvent: globalThis.PointerEvent) => update(moveEvent);
			const onEnd = (upEvent: globalThis.PointerEvent) => {
				update(upEvent);
				clear();
				if (!armed) return;
				const popout = frame.onSessionPopout;
				const workspace = sessionSnapshotFromCatalog(frame.sessionCatalog, pane.sessionRef)?.workspace;
				window.setTimeout(() => {
					void Promise.resolve(popout?.(pane.sessionRef, title, workspace))
						.then(() => onPaneClose(pane))
						.catch(error => console.warn("[fraym:workspace-popout]", error));
				}, 0);
			};
			const onCancel = () => clear();

			window.addEventListener("pointermove", onMove);
			window.addEventListener("pointerup", onEnd);
			window.addEventListener("pointercancel", onCancel);
		},
		[frame.onSessionPopout, frame.sessionCatalog, onPaneClose, onPaneFocus],
	);
	const onSplitResizeStart = useCallback(
		(index: number, event: PointerEvent<HTMLButtonElement>) => {
			if (event.button !== 0) return;
			const container = event.currentTarget.parentElement;
			const rect = container?.getBoundingClientRect();
			if (!rect || rect.width <= 0 || index < 0 || index >= panes.length - 1) return;
			event.preventDefault();
			const handle = event.currentTarget;
			const startX = event.clientX;
			const startWidths = normalizePaneWidths(widths, panes.length);
			const minPercent = Math.min(100 / panes.length, (MIN_WORKSPACE_SPLIT_WIDTH / rect.width) * 100);
			const body = document.body;
			const previousCursor = body.style.cursor;
			const previousUserSelect = body.style.userSelect;
			body.style.cursor = "col-resize";
			body.style.userSelect = "none";
			handle.setPointerCapture?.(event.pointerId);

			const onMove = (moveEvent: globalThis.PointerEvent) => {
				const deltaPercent = ((moveEvent.clientX - startX) / rect.width) * 100;
				setWidths(resizePaneWidths(startWidths, index, deltaPercent, minPercent));
			};
			const onEnd = () => {
				body.style.cursor = previousCursor;
				body.style.userSelect = previousUserSelect;
				if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture?.(event.pointerId);
				window.removeEventListener("pointermove", onMove);
				window.removeEventListener("pointerup", onEnd);
				window.removeEventListener("pointercancel", onEnd);
			};

			window.addEventListener("pointermove", onMove);
			window.addEventListener("pointerup", onEnd);
			window.addEventListener("pointercancel", onEnd);
		},
		[panes.length, widths],
	);
	const onDragOver = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			if (!hasSessionDragData(event.dataTransfer)) return;
			const draggedPane = readSessionDragData(event.dataTransfer);
			const basePanes = panes.length > 0 ? panes : activePane ? [activePane] : [];
			const previewCount = dropPreviewCountFor(
				basePanes.length,
				draggedPane ? splitPaneExists(basePanes, draggedPane) : false,
			);
			if (previewCount <= 0) {
				event.dataTransfer.dropEffect = "none";
				clearDropState();
				return;
			}
			event.preventDefault();
			event.dataTransfer.dropEffect = "copy";
			setDragOver(true);
			setDropPreviewCount(previewCount);
			setDropIndex(dropSlotIndexFromEvent(event, previewCount));
		},
		[activePane, clearDropState, panes],
	);
	const onDragLeave = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
			clearDropState();
		},
		[clearDropState],
	);
	const onDrop = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			const data = readSessionDragData(event.dataTransfer);
			if (!data) {
				clearDropState();
				return;
			}
			event.preventDefault();
			clearDropState();
			const basePanes = panes.length > 0 ? panes : activePane ? [activePane] : [];
			const previewCount = dropPreviewCountFor(basePanes.length, splitPaneExists(basePanes, data));
			if (previewCount <= 0) return;
			addPane(data, dropIndex ?? dropSlotIndexFromEvent(event, previewCount));
		},
		[activePane, addPane, clearDropState, dropIndex, panes],
	);
	return {
		panes,
		widths,
		dragOver,
		dropIndex,
		dropPreviewCount,
		popoutDrag,
		dropTargetRef,
		activePaneKey,
		onDragOver,
		onDragLeave,
		onDrop,
		onPaneFocus,
		onPaneClose,
		onPanePopoutDragStart,
		onSplitResizeStart,
	};
}
/** Surface-identity pill for the session header. The Chat bench runs the
 *  memory-mounted "aether" agent profile while Code/Studio stay pristine, so a
 *  glance at the header should say which one you're talking to. Accent-toned to
 *  read as identity (not a status signal) and sized to sit beside the branch
 *  chip. Rendered only on the Aether surface (appMode === "chat"). */
function AetherBadge() {
	return (
		<span
			data-slot="aether-badge"
			className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[7px] border border-fr-accent-line bg-fr-accent-dim px-[9px] py-1 font-secondary text-fr-xs text-fr-accent"
		>
			<svg
				width="12"
				height="12"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				className="opacity-90"
				aria-hidden="true"
			>
				<path d="M12 2.6 20 7.3 20 16.7 12 21.4 4 16.7 4 7.3Z" />
			</svg>
			Aether
		</span>
	);
}
function WorkspaceChrome({
	frame,
	tiling,
}: {
	readonly frame: FraymFrameWorkspaceProps;
	readonly tiling: WorkspaceTilingState;
}) {
	const { dockHandle: pageDockHandle } = useContext(PageDockContext);
	// Pressed = the page dock is actually VISIBLE (dock open).
	const dockAlreadyOpen = Boolean(frame.dockOpen) && Boolean(pageDockHandle);
	// The Environment CARD — pinned top-right of the chat column as a floating
	// overlay. It never takes a layout column: the transcript keeps the full
	// content width and its scrollbar stays at the window edge (owner-directed
	// 2026-07-17 — the pushed-column treatment stranded the scrollbar mid-screen).
	// Local UI state; toggled from the top bar. Narrow widths boot CLOSED: the
	// floating panel would cover the hero/composer/transcript on load.
	const [environmentOpen, setEnvironmentOpen] = useState(
		() => typeof window !== "undefined" && window.matchMedia("(min-width: 1200px)").matches,
	);
	const onToggleEnvironment = useCallback(() => setEnvironmentOpen(value => !value), []);
	const pageHomeActive = Boolean(frame.modelsActive);
	const fillActive = Boolean(frame.activeSpace.workspace.fills?.[frame.activeSurface]);
	const topActions = frame.workspaceOnly ? undefined : pageHomeActive ? (
		// Both page homes publish their own right-dock action through PageDockContext.
		pageDockHandle ? (
			<Button
				size="sm"
				variant="outline"
				aria-pressed={dockAlreadyOpen}
				className={dockAlreadyOpen ? "bg-fr-surface-2 text-fr-text" : undefined}
				onClick={dockAlreadyOpen ? frame.onCloseDock : pageDockHandle.onOpen}
			>
				<Icon name={pageDockHandle.button.icon} size={13} strokeWidth={2} />
				{pageDockHandle.button.label}
			</Button>
		) : undefined
	) : (
		<WorkspaceTopActions
			appMode={frame.appMode}
			dockTab={frame.dockTab}
			dockTabs={frame.dockTabs}
			topBarActions={frame.topBarActions}
			environmentOpen={environmentOpen}
			onRefreshSessions={frame.onRefreshSessions}
			onToggleDock={frame.onToggleDock}
			onOpenDockMenu={frame.onOpenDockMenu}
			onToggleEnvironment={onToggleEnvironment}
		/>
	);
	const splitTopWidths = normalizePaneWidths(tiling.widths, tiling.panes.length);
	const aetherTitleSlot = frame.appMode === "chat" ? <AetherBadge /> : undefined;
	// The rail toggle lives OUT here on the top bar so it survives every rail
	// state: a compact/hidden rail (e.g. while a loop run borrows its column)
	// offers no reopen affordance of its own.
	const railToggle =
		!frame.workspaceOnly && frame.onToggleRail ? (
			<button
				type="button"
				onClick={frame.onToggleRail}
				aria-label={frame.railMode === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
				title={frame.railMode === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
				className="flex size-7 items-center justify-center rounded-md text-fr-text-3 transition-colors hover:bg-fr-surface-2 hover:text-fr-text"
			>
				<Icon name="panel" size={15} strokeWidth={1.7} />
			</button>
		) : undefined;
	return (
		<div className="relative z-10 flex min-h-0 flex-1 flex-col">
			{tiling.panes.length > 0 && !pageHomeActive ? (
				<div data-slot="workspace-split-top-bars" className="flex h-[52px] shrink-0 overflow-hidden bg-fr-bg">
					{tiling.panes.map((pane, index) => {
						const active = tiling.activePaneKey === sessionRefKey(pane.sessionRef);
						const title = sessionTitleFromCatalog(frame.sessionCatalog, pane.sessionRef, pane.title);
						return (
							<Fragment key={sessionRefKey(pane.sessionRef)}>
								<div
									style={{ flexBasis: `${splitTopWidths[index] ?? 100 / tiling.panes.length}%` }}
									className="min-w-[var(--fr-workspace-split-min-w,360px)] overflow-hidden"
									onPointerDown={() => tiling.onPaneFocus(pane, true)}
								>
									<TopBar
										leadingSlot={index === 0 ? railToggle : undefined}
										repo={frame.repo}
										title={title}
										titleSlot={aetherTitleSlot}
										branch={active ? frame.branch : undefined}
										className="border-b-0 bg-fr-bg"
										titleProps={
											frame.onSessionPopout
												? {
														className: "cursor-grab select-none active:cursor-grabbing",
														onPointerDown: event => tiling.onPanePopoutDragStart(pane, title, event),
														title: "Drag out to open this pane in a new window",
													}
												: undefined
										}
										rightSlot={index === tiling.panes.length - 1 ? topActions : undefined}
									/>
								</div>
								{index < tiling.panes.length - 1 && <div className="w-2 shrink-0" />}
							</Fragment>
						);
					})}
				</div>
			) : (
				<TopBar
					leadingSlot={railToggle}
					repo={pageHomeActive ? undefined : frame.repo}
					title={frame.modelsActive ? "Models" : frame.title}
					titleSlot={pageHomeActive ? undefined : aetherTitleSlot}
					branch={pageHomeActive ? undefined : frame.branch}
					className="border-b-0 bg-fr-bg"
					titleProps={
						!pageHomeActive && frame.sessionRef && frame.onSessionPopout
							? {
									className: "cursor-grab select-none active:cursor-grabbing",
									onPointerDown: event =>
										tiling.onPanePopoutDragStart(
											{ sessionRef: frame.sessionRef as SessionRef, title: frame.title },
											frame.title,
											event,
										),
									title: "Drag out to open this pane in a new window",
								}
							: undefined
					}
					rightSlot={topActions}
				/>
			)}
			<div
				ref={tiling.dropTargetRef}
				onDragOver={tiling.onDragOver}
				onDragLeave={tiling.onDragLeave}
				onDrop={tiling.onDrop}
				data-drop-active={tiling.dragOver || undefined}
				className="relative flex min-h-0 flex-1"
			>
				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					{tiling.panes.length === 0 ? (
						<div className="flex min-h-0 flex-1 max-[760px]:flex-col">
							<div className="flex min-h-0 min-w-0 flex-1 flex-col">
								<SessionTaskDropZone disabled={frame.isOpeningSession || !frame.sessionRef}>
									<WorkspaceMainContent {...frame} tiling={tiling} />
									{/* A workspace fill owns its internal host-UI placement. */}
									{!fillActive && <ConnectedSelectDialog />}
									<ConnectedHostUiLayer />

									{!fillActive && !pageHomeActive && (
										<ComposerSlot
											showStartSurface={frame.showStartSurface}
											composer={frame.composer}
											streaming={frame.streaming}
											disabled={frame.isOpeningSession}
											placeholder={frame.placeholder}
											leftSlot={frame.leftSlot}
											rightSlot={frame.rightSlot}
											sessionDriver={frame.sessionDriver}
											sessionRef={frame.sessionRef}
											onComposerChange={frame.onComposerChange}
											onSubmit={frame.onSubmit}
											onSlash={frame.onSlash}
											onStop={frame.onStop}
										/>
									)}
								</SessionTaskDropZone>
							</div>
						</div>
					) : (
						<WorkspaceMainContent {...frame} tiling={tiling} />
					)}
				</div>
				{environmentOpen && !pageHomeActive && (
					<div
						data-slot="environment-overlay"
						className="pointer-events-none absolute inset-y-0 right-0 z-20 flex flex-col items-end p-3"
					>
						<EnvironmentPanel
							workspace={frame.workspace}
							sessionWorkspace={
								frame.sessionRef
									? sessionSnapshotFromCatalog(frame.sessionCatalog, frame.sessionRef)?.workspace
									: null
							}
							sessionRef={frame.sessionRef}
							sessionScm={
								frame.sessionRef
									? sessionSnapshotFromCatalog(frame.sessionCatalog, frame.sessionRef)?.scmLedger
									: null
							}
							workspaceDriver={frame.workspaceDriver}
							onOpenChanges={() => {
								// Select the Code tab AND open the dock when it's closed — the row
								// must LAND the user in the Git view, not silently pre-select a tab.
								frame.onDockTabChange("ide");
								if (!frame.dockOpen) frame.onToggleDock();
							}}
							recap={
								frame.sessionRef
									? sessionSnapshotFromCatalog(frame.sessionCatalog, frame.sessionRef)?.recap
									: null
							}
							tasks={frame.tasks}
							hasBackgroundWork={
								frame.sessionRef
									? sessionSnapshotFromCatalog(frame.sessionCatalog, frame.sessionRef)?.hasBackgroundWork
									: false
							}
							onOpenTasks={() => {
								frame.onDockTabChange("tasks");
								if (!frame.dockOpen) frame.onToggleDock();
							}}
							className="pointer-events-auto"
						/>
					</div>
				)}
				<WorkspaceBodyDropPreview dropIndex={tiling.dropIndex} previewCount={tiling.dropPreviewCount} />
				<WorkspacePanePopoutDragPreview drag={tiling.popoutDrag} />
			</div>
		</div>
	);
}

const MAIN_FRAME_IGNORED_PROPS: ReadonlySet<keyof FraymFrameWorkspaceProps> = new Set([
	"activeInsight",
	"className",
	"dockOpen",
	"dockWidth",
	"onCloseDock",
	"onDockResizeStart",
	"onDockTabChange",
	"rail",
	"onToggleRail",
	"railMode",
	"runningTools",
	"tasks",
	"terminalDriver",
	"tree",
	"workspaceDriver",
]);

export interface WorkspaceMainPaneProps {
	readonly frame: FraymFrameWorkspaceProps;
	readonly isChat: boolean;
	readonly tiling: WorkspaceTilingState;
}

function sameWorkspaceMainFrame(prev: FraymFrameWorkspaceProps, next: FraymFrameWorkspaceProps): boolean {
	const keys = new Set<keyof FraymFrameWorkspaceProps>([
		...(Object.keys(prev) as Array<keyof FraymFrameWorkspaceProps>),
		...(Object.keys(next) as Array<keyof FraymFrameWorkspaceProps>),
	]);
	for (const key of keys) {
		if (MAIN_FRAME_IGNORED_PROPS.has(key)) continue;
		if (prev[key] !== next[key]) return false;
	}
	return true;
}

function sameWorkspaceTiling(prev: WorkspaceTilingState, next: WorkspaceTilingState): boolean {
	return (
		prev.panes === next.panes &&
		prev.widths === next.widths &&
		prev.dragOver === next.dragOver &&
		prev.dropIndex === next.dropIndex &&
		prev.dropPreviewCount === next.dropPreviewCount &&
		prev.popoutDrag === next.popoutDrag &&
		prev.dropTargetRef === next.dropTargetRef &&
		prev.activePaneKey === next.activePaneKey &&
		prev.onDragOver === next.onDragOver &&
		prev.onDragLeave === next.onDragLeave &&
		prev.onDrop === next.onDrop &&
		prev.onPaneFocus === next.onPaneFocus &&
		prev.onPaneClose === next.onPaneClose &&
		prev.onPanePopoutDragStart === next.onPanePopoutDragStart &&
		prev.onSplitResizeStart === next.onSplitResizeStart
	);
}

function sameWorkspaceMainPaneProps(prev: WorkspaceMainPaneProps, next: WorkspaceMainPaneProps): boolean {
	return (
		prev.isChat === next.isChat &&
		sameWorkspaceTiling(prev.tiling, next.tiling) &&
		sameWorkspaceMainFrame(prev.frame, next.frame)
	);
}



function workspaceOverlayChat(frame: FraymFrameWorkspaceProps) {
	if (!(frame.sessionDriver && frame.sessionRef && frame.workspace && frame.workspaceDriver?.ensureManagedWorkspace)) {
		return null;
	}
	return {
		sessionDriver: frame.sessionDriver,
		workspaceDriver: frame.workspaceDriver,
		vaultWorkspace: frame.workspace,
		sessionRef: frame.sessionRef,
		initialSnapshot: sessionSnapshotFromCatalog(frame.sessionCatalog, frame.sessionRef),
		chrome: workspaceSessionChrome(frame),
	};
}

const WorkspaceMainPane = memo(function WorkspaceMainPane({ frame, isChat, tiling }: WorkspaceMainPaneProps) {
	return (
		<main className={cn("relative flex min-w-0 flex-col", !isChat && "bg-fr-bg")}>
			<WorkspaceChrome frame={frame} tiling={tiling} />
		</main>
	);
}, sameWorkspaceMainPaneProps);



function WorkspaceDock({ frame }: { readonly frame: FraymFrameWorkspaceProps }) {
	const { dockHandle } = useContext(PageDockContext);
	// The page dock (a page-published session dock) — active when a page registered
	// a handle and the dock is open.
	const pageDockPanel = dockHandle && frame.dockOpen
		? {
				tab: {
					id: "page-dock",
					label: dockHandle.button.label,
					icon: dockHandle.button.icon,
				},
				content: (
					<div className="flex h-full min-h-0 flex-col">
						<div className="min-h-0 flex-1 px-7 pt-8">
							<OpeningThreadSkeleton />
						</div>
					</div>
				),
			}
		: null;
	return (
		<ActiveInsightProvider value={frame.activeInsight}>
			<DockContent
				open={frame.dockOpen}
				appMode={frame.appMode}
				dockTab={frame.dockTab}
				dockTabs={frame.dockTabs}
				pageDockPanel={pageDockPanel}
				tasks={frame.tasks}
				tree={frame.tree}
				runningTools={frame.runningTools}
				workspace={frame.workspace}
				sessionId={frame.sessionRef?.sessionId}
				workspaceDriver={frame.workspaceDriver}
				terminalDriver={frame.terminalDriver}
				onTabChange={frame.onDockTabChange}
				onResizeStart={frame.onDockResizeStart}
			/>
		</ActiveInsightProvider>
	);
}

export function FraymFrameWorkspace(props: FraymFrameWorkspaceProps) {
	const isChat = props.appMode === "chat";
	const [pageDockHandle, setPageDockHandle] = useState<PageDockHandle | null>(null);
	// Loop-proof registration: pages re-derive their handle every render (the opener
	// closes over per-render state), and a naive setState here re-renders the whole
	// workspace subtree, which re-derives the handle — an infinite loop. Keep the
	// LIVE opener in a ref (always current, never re-renders) and only setState when
	// the VISIBLE button (label/icon) or presence actually changes.
	const pageDockOpenRef = useRef<(() => void) | null>(null);
	const registerPageDock = useCallback((handle: PageDockHandle | null) => {
		pageDockOpenRef.current = handle?.onOpen ?? null;
		setPageDockHandle(prev => {
			if (handle === null) return prev === null ? prev : null;
			if (prev && prev.button.label === handle.button.label && prev.button.icon === handle.button.icon) return prev;
			return { button: handle.button, onOpen: () => pageDockOpenRef.current?.() };
		});
	}, []);
	const pageDockCtx = useMemo(
		() => ({ dockHandle: pageDockHandle, registerDock: registerPageDock }),
		[pageDockHandle, registerPageDock],
	);
	const tiling = useWorkspaceTiling(props);
	// One window-level guard: a file dropped anywhere never navigates the webview to the file
	// (the P0), and routes into the active session's composer instead.
	useGlobalFileDropGuard();

	const railMode = props.workspaceOnly ? "hidden" : props.railMode;
	const dockOpen =
		!props.workspaceOnly &&
		Boolean(props.dockOpen) &&
		(props.appMode === "code" || props.appMode === "chat");
	// The loop dock IS the real dock — same width, same resize handle. No cap,
	// no special-casing. Resizing it changes the shared dockWidth, same as
	// resizing the diff/files/terminal dock tabs does.
	return (
		<PageDockContext.Provider value={pageDockCtx}>
			<AppShell
				className={props.className}
				dockOpen={dockOpen}
				railMode={railMode}
				dockWidth={props.dockWidth}
				onCollapseRail={props.onToggleRail}
				rail={props.workspaceOnly ? null : props.rail}
				main={
					<SpaceSlotBoundary slot="workspace">
						<HOST_SPLITS.component frame={props} isChat={isChat} tiling={tiling} />
					</SpaceSlotBoundary>
				}
				dock={
					props.workspaceOnly ? undefined : (
						<SpaceSlotBoundary slot="dock">
							<DOCK_CLASSIC.component frame={props} />
						</SpaceSlotBoundary>
					)
				}
			/>
		</PageDockContext.Provider>
	);
}

/** Implementation #1 of the dock kind — the shipped Fraym dock:
 *  space dock tabs + the page dock, resize plumbing included. */
export const DOCK_CLASSIC: DockImplementation = {
	specVersion: 1,
	id: "dock-classic",
	slot: "dock",
	component: WorkspaceDock,
};

/** Implementation #1 of the workspace-host kind — the shipped pane container:
 *  splits/tiling, chat presence backdrop, room overlays. */
export const HOST_SPLITS: WorkspaceHostImplementation = {
	specVersion: 1,
	id: "host-splits",
	slot: "workspace",
	component: WorkspaceMainPane,
};
