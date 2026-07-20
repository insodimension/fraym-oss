import type { SessionDriver, SessionRef, SessionSnapshot, SessionTreeSnapshot, TerminalDriver, WorkspaceDriver, WorkspaceRef } from "@fraym/driver";
import type { AvatarId } from "@fraym/vibr";
import type { MouseEvent, PointerEvent, ReactNode, RefObject } from "react";
import { DockDiffView, DockFilesView, DockIdeView, DockPlanView, DockTasksView, DockTerminalView, DockTreeView } from "./dock-views";
import { WorkspaceSessionPane, workspaceSessionChrome } from "./workspace-session-pane";
import type { DockImplementation } from "./space/slot-contracts/dock";
import type { WorkspaceHostImplementation } from "./space/slot-contracts/workspace";

export type WorkspaceSurfaceSubmit = (value: string, attachments?: readonly unknown[], expansion?: string) => unknown;

export interface WorkspaceSurfaceHostProps {
	readonly appMode: string;
	readonly activeSurface: string;
	readonly onIntent: (intent: unknown) => void;
	readonly activeSpace: unknown;
	readonly surfaceFills: unknown;
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
	readonly composer: string;
	readonly streaming?: boolean;
	readonly placeholder: string;
	readonly leftSlot: ReactNode;
	readonly rightSlot: ReactNode;
	readonly renderRightSlot: () => ReactNode;
	readonly title: string;
	readonly repo: string;
	readonly avatar: AvatarId;
	readonly showTailPresence: boolean;
	readonly showAvatars: boolean;
	readonly agentMeta: string;
	readonly onComposerChange: (value: string) => void;
	readonly onSubmit: WorkspaceSurfaceSubmit;
	readonly onSlash: () => void;
	readonly onStop: () => void;
	readonly tiling: unknown;
}

export interface FraymFrameWorkspaceProps extends Omit<WorkspaceSurfaceHostProps, "tiling"> {
	readonly className?: string;
	readonly rail: ReactNode;
	readonly workspaceOnly?: boolean;
	readonly dockOpen: boolean;
	readonly railMode: string;
	readonly onToggleRail?: () => void;
	readonly dockWidth: number;
	readonly dockTab: string;
	readonly dockTabs: readonly { readonly id: string; readonly label: string; readonly icon?: string }[];
	readonly activeInsight: string | null;
	readonly branch: string;
	readonly terminalDriver: TerminalDriver | null | undefined;
	readonly tree: SessionTreeSnapshot | null;
	readonly tasks: readonly { readonly name: string; readonly status: string }[];
	readonly runningTools: number;
	readonly onToggleDock: () => void;
	readonly onOpenDockMenu: (event: MouseEvent<HTMLButtonElement>) => void;
	readonly onDockTabChange: (tab: string) => void;
	readonly onCloseDock: () => void;
	readonly onDockResizeStart: (event: PointerEvent<HTMLButtonElement>) => void;
	readonly onSessionSelect?: (sessionRef: SessionRef) => void;
	readonly onSessionPopout?: (sessionRef: SessionRef, title?: string, workspace?: WorkspaceRef) => void | Promise<void>;
	readonly onWorkspaceSelect?: (workspace: WorkspaceRef) => void;
	readonly onAddProject?: () => void;
	readonly onBranchSelect?: (branch: string) => void;
	readonly onNewWorktree?: () => void;
	readonly onMoveToWorktree?: (sessionRef: SessionRef) => void;
}

export interface WorkspaceMainPaneProps {
	readonly frame: FraymFrameWorkspaceProps;
	readonly isChat: boolean;
}

function WorkspaceMainPane({ frame }: WorkspaceMainPaneProps) {
	if (!frame.sessionRef) return <div ref={frame.threadRef} className="flex min-h-0 flex-1 items-center justify-center text-fr-sm text-fr-text-3">Start a session to begin.</div>;
	return (
		<div ref={frame.threadRef} className="flex min-h-0 flex-1 flex-col">
			<WorkspaceSessionPane
				driver={frame.sessionDriver}
				sessionRef={frame.sessionRef}
				initialSnapshot={frame.sessionCatalog.find(snapshot => snapshot.ref.sessionId === frame.sessionRef?.sessionId) ?? null}
				chrome={workspaceSessionChrome(frame)}
			/>
		</div>
	);
}

function WorkspaceDock({ frame }: { readonly frame: FraymFrameWorkspaceProps }) {
	if (!frame.dockOpen) return null;
	const content = (() => {
		switch (frame.dockTab) {
			case "tasks": return <DockTasksView tasks={frame.tasks} view="task" onViewChange={view => frame.onDockTabChange(view === "task" ? "tasks" : "plan")} />;
			case "plan": return <DockPlanView tasks={frame.tasks} />;
			case "tree": return <DockTreeView tree={frame.tree} />;
			case "terminal": return <DockTerminalView workspace={frame.workspace} terminalDriver={frame.terminalDriver} sessionId={frame.sessionRef?.sessionId} />;
			case "files": return <DockFilesView workspace={frame.workspace} workspaceDriver={frame.workspaceDriver} />;
			case "ide": return <DockIdeView workspace={frame.workspace} workspaceDriver={frame.workspaceDriver} />;
			default: return <DockDiffView />;
		}
	})();
	return <aside className="min-h-0 shrink-0 border-fr-border-soft border-l" style={{ width: frame.dockWidth }}>{content}</aside>;
}

export function FraymFrameWorkspace(props: FraymFrameWorkspaceProps) {
	return (
		<div className={props.className} data-slot="workspace-frame">
			<div className="flex min-h-0 flex-1">
				{props.workspaceOnly ? null : props.rail}
				<WorkspaceMainPane frame={props} isChat={props.appMode === "chat"} />
				{props.workspaceOnly ? null : <WorkspaceDock frame={props} />}
			</div>
		</div>
	);
}

export const DOCK_CLASSIC: DockImplementation = { specVersion: 1, id: "dock-classic", slot: "dock", component: WorkspaceDock };
export const HOST_SPLITS: WorkspaceHostImplementation = { specVersion: 1, id: "host-splits", slot: "workspace", component: WorkspaceMainPane };
