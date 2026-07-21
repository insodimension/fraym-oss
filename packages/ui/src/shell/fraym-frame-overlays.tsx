import type { EngineResourceSnapshot, SessionConfig, SessionRef } from "@fraym-ai/driver";
import { type ComponentProps, memo } from "react";
import { CommandPalette, ConfirmDialog, EngineModelMenu } from "../components";
import { PopoverPanel, Scrim } from "../elements";
import {
	ContextPopover,
	contextBreakdownHeader,
	contextBreakdownToRows,
	type PlanLimit,
} from "../features/context-popover";
import { DockSwitchMenu, type DockTab } from "../features/right-dock";
import { McpModal } from "../features/mcp-modal/mcp-modal";
import { PermissionMenu } from "../features/permission-menu/permission-menu";
import type { RepoGroup, SessionItem } from "../features/session-rail/session-rail";
import { useContextBreakdown } from "../hooks/use-context-breakdown";
import { useSessionOptional } from "../hooks/use-session";
import { FilterMenu, ProjectContextMenu, SessionContextMenu, SessionMultiContextMenu, UserMenu } from "./menus";
import { PERMS } from "./shell-data";
import type { MenuState, SessionFilters } from "./types";

type PaletteCategories = ComponentProps<typeof CommandPalette>["categories"];
type EngineModel = NonNullable<EngineResourceSnapshot["models"]>[number];
type Provider = NonNullable<EngineResourceSnapshot["providers"]>[number];
type ContextBreakdown = ComponentProps<typeof ContextPopover>["breakdown"];
type McpServers = ComponentProps<typeof McpModal>["servers"];
type EngineModelSelection = Parameters<NonNullable<ComponentProps<typeof EngineModelMenu>["onSelectModel"]>>[0];
type ThinkingLevel = Parameters<NonNullable<ComponentProps<typeof EngineModelMenu>["onSelectThinking"]>>[0];

interface FilterOverlayProps {
	readonly menu: MenuState;
	readonly filters: SessionFilters;
	readonly baseline: SessionFilters;
	readonly projects: readonly string[];
	readonly onChange: (filters: SessionFilters) => void;
	readonly onClearAll?: () => void;
	readonly onClose: () => void;
}

function FilterOverlay({ menu, filters, baseline, projects, onChange, onClearAll, onClose }: FilterOverlayProps) {
	if (menu.type !== "filter") return null;
	return (
		<FilterMenu
			filters={filters}
			baseline={baseline}
			projects={projects}
			scopedProject={menu.project}
			anchorRect={menu.rect}
			onChange={onChange}
			onClearAll={onClearAll}
			onClose={onClose}
		/>
	);
}

interface PaletteOverlayProps {
	readonly menu: MenuState;
	readonly categories: PaletteCategories;
	readonly onPick: (command: string) => void;
	readonly onClose: () => void;
}

function PaletteOverlay({ menu, categories, onPick, onClose }: PaletteOverlayProps) {
	if (menu.type !== "palette") return null;
	return <CommandPalette categories={categories} onPick={onPick} onClose={onClose} />;
}

interface ModelOverlayProps {
	readonly menu: MenuState;
	readonly models: readonly EngineModel[];
	readonly providers: readonly Provider[] | undefined;
	readonly sessionConfig: SessionConfig | undefined;
	readonly loading: boolean;
	readonly onEngineModelSelect: (selection: EngineModelSelection) => void;
	readonly onThinkingSelect: (level: ThinkingLevel) => void;
	readonly onClose: () => void;
}

function ModelOverlay({
	menu,
	models,
	providers,
	sessionConfig,
	loading,
	onEngineModelSelect,
	onThinkingSelect,
	onClose,
}: ModelOverlayProps) {
	if (menu.type !== "model") return null;
	if (models.length > 0) {
		return (
			<EngineModelMenu
				models={models}
				providers={providers}
				sessionConfig={sessionConfig}
				efforts={sessionConfig?.thinkingLevels ?? ["off", "minimal", "low", "medium", "high", "xhigh"]}
				anchorRect={menu.rect}
				place="above-right"
				onSelectModel={onEngineModelSelect}
				onSelectThinking={onThinkingSelect}
				onClose={onClose}
			/>
		);
	}
	return (
		<>
			<Scrim onClick={onClose} />
			<PopoverPanel anchorRect={menu.rect} place="above-right" width={300}>
				<div className="px-3 py-6 text-center font-secondary text-fr-sm text-fr-text-3">
					{loading ? "Loading models…" : "No models available yet. Add a provider in Settings."}
				</div>
			</PopoverPanel>
		</>
	);
}

interface PermissionOverlayProps {
	readonly menu: MenuState;
	readonly selected: string;
	readonly onSelect: (value: string) => void;
	readonly onClose: () => void;
}

function PermissionOverlay({ menu, selected, onSelect, onClose }: PermissionOverlayProps) {
	if (menu.type !== "perm") return null;
	return (
		<PermissionMenu
			permissions={PERMS}
			selected={selected}
			onSelect={onSelect}
			onClose={onClose}
			anchorRect={menu.rect}
			place="above"
		/>
	);
}

interface ContextOverlayProps {
	readonly menu: MenuState;
	readonly used: number;
	readonly max: number;
	readonly breakdown: ContextBreakdown;
	readonly planLimits: readonly PlanLimit[];
	readonly onClose: () => void;
}

function ContextOverlay({ menu, used, max, breakdown, planLimits, onClose }: ContextOverlayProps) {
	const session = useSessionOptional();
	const open = menu.type === "context";
	const detail = useContextBreakdown(session?.driver, session?.sessionRef, open);
	if (!open) return null;
	// Header MUST track the same object the rows render: the on-demand breakdown
	// carries the real window + tokens, while the `contextUsage`-derived
	// `used`/`max` are null/0 until the first usage event lands (every session
	// open). Fall back to those only while the breakdown is still loading.
	const rows = detail.breakdown ? contextBreakdownToRows(detail.breakdown) : breakdown;
	const header = detail.breakdown ? contextBreakdownHeader(detail.breakdown) : { used, max };
	return (
		<ContextPopover
			used={header.used}
			max={header.max}
			breakdown={rows}
			planLimits={planLimits}
			onClose={onClose}
			anchorRect={menu.rect}
			place="above-right"
		/>
	);
}

function McpOverlay({
	menu,
	servers,
	onClose,
}: {
	readonly menu: MenuState;
	readonly servers: McpServers;
	readonly onClose: () => void;
}) {
	if (menu.type !== "mcp") return null;
	return <McpModal servers={servers} onClose={onClose} />;
}

interface SessionMenuOverlayProps {
	readonly sessionMenu: { readonly item: SessionItem; readonly rect: DOMRect } | null;
	readonly onRenameRequest: (item: SessionItem) => void;
	readonly onToggleArchiveSession?: (sessionRef: SessionRef, archived: boolean) => void;
	readonly onPinSession?: (sessionRef: SessionRef, pinned: boolean) => void;
	readonly onMoveToWorktree?: (sessionRef: SessionRef) => void;
	readonly onDeleteRequest: (item: SessionItem) => void;
	readonly onCopyText: (text: string) => void;
	readonly onRevealPath?: (path: string) => void;
	readonly onClose: () => void;
}

function sessionDeeplink(ref: SessionRef): string {
	return `fraym://sessions/${encodeURIComponent(ref.workspaceId)}/${encodeURIComponent(ref.sessionId)}`;
}

function SessionMenuOverlay({
	sessionMenu,
	onRenameRequest,
	onToggleArchiveSession,
	onPinSession,
	onMoveToWorktree,
	onDeleteRequest,
	onCopyText,
	onRevealPath,
	onClose,
}: SessionMenuOverlayProps) {
	if (!sessionMenu) return null;
	return (
		<SessionContextMenu
			anchorRect={sessionMenu.rect}
			title={sessionMenu.item.title}
			archived={Boolean(sessionMenu.item.archived)}
			onRename={() => {
				onRenameRequest(sessionMenu.item);
				onClose();
			}}
			onToggleArchive={() => {
				if (sessionMenu.item.sessionRef) {
					onToggleArchiveSession?.(sessionMenu.item.sessionRef, Boolean(sessionMenu.item.archived));
				}
				onClose();
			}}
			pinned={Boolean(sessionMenu.item.pinned)}
			onTogglePin={() => {
				if (sessionMenu.item.sessionRef) {
					onPinSession?.(sessionMenu.item.sessionRef, !sessionMenu.item.pinned);
				}
				onClose();
			}}
			onDelete={
				sessionMenu.item.sessionRef
					? () => {
							onDeleteRequest(sessionMenu.item);
							onClose();
						}
					: undefined
			}
			onCopySessionId={() => {
				onCopyText(sessionMenu.item.sessionRef?.sessionId ?? sessionMenu.item.id);
				onClose();
			}}
			onCopyDeeplink={() => {
				const ref = sessionMenu.item.sessionRef;
				if (ref) onCopyText(sessionDeeplink(ref));
				onClose();
			}}
			worktree={Boolean(sessionMenu.item.worktree)}
			onMoveToWorktree={() => {
				if (sessionMenu.item.sessionRef && !sessionMenu.item.worktree) {
					onMoveToWorktree?.(sessionMenu.item.sessionRef);
				}
				onClose();
			}}
			onOpenInExplorer={
				sessionMenu.item.workspacePath && onRevealPath
					? () => {
							onRevealPath(sessionMenu.item.workspacePath!);
							onClose();
						}
					: undefined
			}
			onClose={onClose}
		/>
	);
}
interface ProjectMenuOverlayProps {
	readonly groupMenu: { readonly group: RepoGroup; readonly rect: DOMRect } | null;
	readonly onCopyText: (text: string) => void;
	readonly onRevealPath?: (path: string) => void;
	readonly onClose: () => void;
}

function ProjectMenuOverlay({ groupMenu, onCopyText, onRevealPath, onClose }: ProjectMenuOverlayProps) {
	const path = groupMenu?.group.workspace?.path;
	if (!groupMenu || !path) return null;
	return (
		<ProjectContextMenu
			anchorRect={groupMenu.rect}
			repo={groupMenu.group.repo}
			path={path}
			onCopyPath={() => {
				onCopyText(path);
				onClose();
			}}
			onOpenInExplorer={
				onRevealPath
					? () => {
							onRevealPath(path);
							onClose();
						}
					: undefined
			}
			onClose={onClose}
		/>
	);
}

interface DeleteSessionOverlayProps {
	readonly pendingDeleteSession: SessionItem | null;
	readonly onDeleteSession?: (sessionRef: SessionRef) => void;
	readonly onClose: () => void;
}

function DeleteSessionOverlay({ pendingDeleteSession, onDeleteSession, onClose }: DeleteSessionOverlayProps) {
	if (!pendingDeleteSession?.sessionRef) return null;
	return (
		<ConfirmDialog
			intent="danger"
			icon="trash"
			title={`Delete "${pendingDeleteSession.title}"?`}
			description="This removes the session and its artifacts from disk. This cannot be undone."
			confirmLabel="Delete session"
			onConfirm={() => {
				onDeleteSession?.(pendingDeleteSession.sessionRef!);
				onClose();
			}}
			onClose={onClose}
			details={
				<div className="space-y-1">
					<div className="font-medium text-fr-text">{pendingDeleteSession.title}</div>
					<div className="break-all font-secondary text-fr-2xs text-fr-text-3">
						{pendingDeleteSession.sessionRef.sessionId}
					</div>
				</div>
			}
		/>
	);
}

interface SessionMultiMenuOverlayProps {
	readonly sessionMultiMenu: { readonly selectedItems: readonly SessionItem[]; readonly rect: DOMRect } | null;
	readonly onDeleteSessionsRequest: (items: readonly SessionItem[]) => void;
	readonly onClose: () => void;
}

function SessionMultiMenuOverlay({ sessionMultiMenu, onDeleteSessionsRequest, onClose }: SessionMultiMenuOverlayProps) {
	if (!sessionMultiMenu) return null;
	// Only show deletable items (those with a sessionRef)
	const deletable = sessionMultiMenu.selectedItems.filter(i => i.sessionRef);
	if (deletable.length === 0) return null;
	return (
		<SessionMultiContextMenu
			anchorRect={sessionMultiMenu.rect}
			count={deletable.length}
			onDelete={() => {
				onDeleteSessionsRequest(deletable);
				onClose();
			}}
			onClose={onClose}
		/>
	);
}

interface DeleteSessionsOverlayProps {
	readonly pendingDeleteSessions: readonly SessionItem[] | null;
	readonly onDeleteSession?: (sessionRef: SessionRef) => void;
	readonly onClose: () => void;
	readonly onDeleteSessions?: (refs: readonly SessionRef[]) => void;
}

function DeleteSessionsOverlay({
	pendingDeleteSessions,
	onDeleteSession,
	onDeleteSessions,
	onClose,
}: DeleteSessionsOverlayProps) {
	if (!pendingDeleteSessions?.length) return null;
	const count = pendingDeleteSessions.length;
	return (
		<ConfirmDialog
			title={`Delete ${count} session${count === 1 ? "" : "s"}?`}
			description="This removes the selected sessions and their artifacts from disk. This cannot be undone."
			confirmLabel={`Delete ${count} session${count === 1 ? "" : "s"}`}
			onConfirm={() => {
				const refs = pendingDeleteSessions.flatMap(item => (item.sessionRef ? [item.sessionRef] : []));
				if (onDeleteSessions) onDeleteSessions(refs);
				else for (const ref of refs) onDeleteSession?.(ref);
				onClose();
			}}
			onClose={onClose}
		/>
	);
}
interface DockOverlayProps {
	readonly menu: MenuState;
	readonly dockTab: string;
	readonly dockTabs: readonly DockTab[];
	readonly onPick: (id: string) => void;
	readonly onClose: () => void;
}

function DockOverlay({ menu, dockTab, dockTabs, onPick, onClose }: DockOverlayProps) {
	if (menu.type !== "dock") return null;
	return (
		<DockSwitchMenu tabs={dockTabs} activeTab={dockTab} onPick={onPick} onClose={onClose} anchorRect={menu.rect} />
	);
}

interface UserOverlayProps {
	readonly menu: MenuState;
	readonly userName: string;
	readonly userAvatarUrl?: string;
	readonly userEmail: string;
	readonly planLabel: string;
	readonly productLabel: string;
	readonly onSettings: () => void;
	readonly onClose: () => void;
}

function UserOverlay({
	menu,
	userName,
	userAvatarUrl,
	userEmail,
	planLabel,
	productLabel,
	onSettings,
	onClose,
}: UserOverlayProps) {
	if (menu.type !== "user") return null;
	return (
		<UserMenu
			anchorRect={menu.rect}
			userName={userName}
			userAvatarUrl={userAvatarUrl}
			userEmail={userEmail}
			planLabel={planLabel}
			productLabel={productLabel}
			onSettings={onSettings}
			onClose={onClose}
		/>
	);
}

export interface FraymFrameOverlaysProps {
	readonly menu: MenuState;
	readonly dockTabs: readonly DockTab[];
	readonly filters: SessionFilters;
	readonly filterBaseline: SessionFilters;
	readonly projects: readonly string[];
	readonly paletteCommands: PaletteCategories;
	readonly models: readonly EngineModel[];
	readonly modelsLoading: boolean;
	readonly providers: readonly Provider[] | undefined;
	readonly sessionConfig: SessionConfig | undefined;
	readonly permission: string;
	readonly contextUsed: number;
	readonly contextMax: number;
	readonly contextBreakdown: ContextBreakdown;
	readonly planLimits: readonly PlanLimit[];
	readonly mcpServers: McpServers;
	readonly sessionMenu: { readonly item: SessionItem; readonly rect: DOMRect } | null;
	readonly sessionMultiMenu: { readonly selectedItems: readonly SessionItem[]; readonly rect: DOMRect } | null;
	readonly groupMenu: { readonly group: RepoGroup; readonly rect: DOMRect } | null;
	readonly pendingDeleteSession: SessionItem | null;
	readonly pendingDeleteSessions: readonly SessionItem[] | null;
	readonly dockTab: string;
	readonly userName: string;
	readonly userAvatarUrl?: string;
	readonly userEmail: string;
	readonly planLabel: string;
	readonly productLabel: string;
	readonly onFiltersChange: (filters: SessionFilters) => void;
	readonly onClearProjectOverrides?: () => void;
	readonly onPalettePick: (command: string) => void;
	readonly onEngineModelSelect: (selection: EngineModelSelection) => void;
	readonly onThinkingSelect: (level: ThinkingLevel) => void;
	readonly onPermissionSelect: (permission: string) => void;
	readonly onSessionMenuClose: () => void;
	readonly onSessionMultiMenuClose: () => void;
	readonly onGroupMenuClose: () => void;
	readonly onDeleteRequest: (item: SessionItem) => void;
	readonly onDeleteClose: () => void;
	readonly onDeleteSessionsRequest: (items: readonly SessionItem[]) => void;
	readonly onDeleteSessionsClose: () => void;
	readonly onDeleteSession?: (sessionRef: SessionRef) => void;
	readonly onDeleteSessions?: (refs: readonly SessionRef[]) => void;
	readonly onRenameRequest: (item: SessionItem) => void;
	readonly onToggleArchiveSession?: (sessionRef: SessionRef, archived: boolean) => void;
	readonly onPinSession?: (sessionRef: SessionRef, pinned: boolean) => void;
	readonly onMoveToWorktree?: (sessionRef: SessionRef) => void;
	readonly onRevealPath?: (path: string) => void;
	readonly onCopyText: (text: string) => void;
	readonly onDockPick: (id: string) => void;
	readonly onUserSettings: () => void;
	readonly onClose: () => void;
}

function overlaysClosed(props: FraymFrameOverlaysProps): boolean {
	return (
		props.menu.type == null &&
		props.sessionMenu == null &&
		props.sessionMultiMenu == null &&
		props.groupMenu == null &&
		props.pendingDeleteSession == null &&
		props.pendingDeleteSessions == null
	);
}

function sameFraymFrameOverlaysProps(prev: FraymFrameOverlaysProps, next: FraymFrameOverlaysProps): boolean {
	return overlaysClosed(prev) && overlaysClosed(next);
}

export const FraymFrameOverlays = memo(function FraymFrameOverlays(props: FraymFrameOverlaysProps) {
	return (
		<>
			<FilterOverlay
				menu={props.menu}
				filters={props.filters}
				baseline={props.filterBaseline}
				projects={props.projects}
				onChange={props.onFiltersChange}
				onClearAll={props.onClearProjectOverrides}
				onClose={props.onClose}
			/>
			<PaletteOverlay
				menu={props.menu}
				categories={props.paletteCommands}
				onPick={props.onPalettePick}
				onClose={props.onClose}
			/>
			<ModelOverlay
				menu={props.menu}
				models={props.models}
				providers={props.providers}
				sessionConfig={props.sessionConfig}
				loading={props.modelsLoading}
				onEngineModelSelect={props.onEngineModelSelect}
				onThinkingSelect={props.onThinkingSelect}
				onClose={props.onClose}
			/>
			<PermissionOverlay
				menu={props.menu}
				selected={props.permission}
				onSelect={props.onPermissionSelect}
				onClose={props.onClose}
			/>
			<ContextOverlay
				menu={props.menu}
				used={props.contextUsed}
				max={props.contextMax}
				breakdown={props.contextBreakdown}
				planLimits={props.planLimits}
				onClose={props.onClose}
			/>
			<McpOverlay menu={props.menu} servers={props.mcpServers} onClose={props.onClose} />
			<SessionMenuOverlay
				sessionMenu={props.sessionMenu}
				onRenameRequest={props.onRenameRequest}
				onToggleArchiveSession={props.onToggleArchiveSession}
				onPinSession={props.onPinSession}
				onMoveToWorktree={props.onMoveToWorktree}
				onDeleteRequest={props.onDeleteRequest}
				onCopyText={props.onCopyText}
				onRevealPath={props.onRevealPath}
				onClose={props.onSessionMenuClose}
			/>
			<ProjectMenuOverlay
				groupMenu={props.groupMenu}
				onCopyText={props.onCopyText}
				onRevealPath={props.onRevealPath}
				onClose={props.onGroupMenuClose}
			/>
			<DeleteSessionOverlay
				pendingDeleteSession={props.pendingDeleteSession}
				onDeleteSession={props.onDeleteSession}
				onClose={props.onDeleteClose}
			/>
			<SessionMultiMenuOverlay
				sessionMultiMenu={props.sessionMultiMenu}
				onDeleteSessionsRequest={props.onDeleteSessionsRequest!}
				onClose={props.onSessionMultiMenuClose}
			/>
			<DeleteSessionsOverlay
				pendingDeleteSessions={props.pendingDeleteSessions}
				onDeleteSessions={props.onDeleteSessions}
				onDeleteSession={props.onDeleteSession}
				onClose={props.onDeleteSessionsClose}
			/>
			<DockOverlay
				menu={props.menu}
				dockTab={props.dockTab}
				dockTabs={props.dockTabs}
				onPick={props.onDockPick}
				onClose={props.onClose}
			/>
			<UserOverlay
				menu={props.menu}
				userName={props.userName}
				userAvatarUrl={props.userAvatarUrl}
				userEmail={props.userEmail}
				planLabel={props.planLabel}
				productLabel={props.productLabel}
				onSettings={props.onUserSettings}
				onClose={props.onClose}
			/>
		</>
	);
}, sameFraymFrameOverlaysProps);
