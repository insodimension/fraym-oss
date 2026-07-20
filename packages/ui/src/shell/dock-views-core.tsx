import type { SessionTreeSnapshot, TerminalDriver, WorkspaceDriver, WorkspaceRef } from "@fraym/driver";
import type { ReactNode } from "react";

function DockEmpty({ title, description }: { readonly title: string; readonly description: string }) {
	return (
		<div className="flex h-full min-h-0 flex-col items-center justify-center gap-1 p-6 text-center">
			<p className="text-fr-sm font-medium text-fr-text">{title}</p>
			<p className="max-w-[32ch] text-fr-xs text-fr-text-3">{description}</p>
		</div>
	);
}

export function DockSessionView() {
	return <DockEmpty title="Session details" description="Session details are not available." />;
}

export function DockPlanView({ tasks }: { readonly tasks: readonly { readonly name: string; readonly status: string }[] }) {
	if (tasks.length === 0) return <DockEmpty title="No plan" description="Tasks appear here when the session publishes them." />;
	return <TaskList tasks={tasks} />;
}

export function DockTreeView({ tree }: { readonly tree: SessionTreeSnapshot | null }) {
	return tree ? <DockEmpty title="Session tree" description="Session tree navigation is not available." /> : <DockEmpty title="No tree" description="This session has no recorded branches." />;
}

export function DockDiffView() {
	return <DockEmpty title="No diff selected" description="Open a diff from a tool result to inspect it here." />;
}

export function DockTerminalView({ workspace, terminalDriver }: { readonly workspace: WorkspaceRef | null | undefined; readonly sessionId?: string; readonly terminalDriver: TerminalDriver | null | undefined }) {
	return workspace && terminalDriver ? <DockEmpty title="Terminal" description="Terminal rendering is unavailable in this build." /> : <DockEmpty title="Terminal unavailable" description="This workspace cannot open terminals yet." />;
}

export function DockFilesView({ workspace, workspaceDriver }: { readonly workspace: WorkspaceRef | null | undefined; readonly workspaceDriver: WorkspaceDriver | null | undefined }) {
	return workspace && workspaceDriver ? <DockEmpty title="Files" description="File browsing is unavailable in this build." /> : <DockEmpty title="Files unavailable" description="This workspace cannot show files yet." />;
}

export function DockIdeView({ workspace, workspaceDriver }: { readonly workspace: WorkspaceRef | null | undefined; readonly workspaceDriver: WorkspaceDriver | null | undefined }) {
	return workspace && workspaceDriver ? <DockEmpty title="Code" description="Code preview is unavailable in this build." /> : <DockEmpty title="Code unavailable" description="This workspace cannot show code yet." />;
}

export function DockTasksSession() {
	return <DockEmpty title="No tasks" description="Tasks appear here when the session publishes them." />;
}

export function DockTasksView({ tasks, view, onViewChange }: { readonly tasks: readonly { readonly name: string; readonly status: string }[]; readonly view: "task" | "plan"; readonly onViewChange: (view: "task" | "plan") => void }) {
	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex gap-1 border-b border-fr-border-soft p-2">
				<button type="button" className="text-fr-xs text-fr-text-2" onClick={() => onViewChange("task")}>Tasks</button>
				<button type="button" className="text-fr-xs text-fr-text-2" onClick={() => onViewChange("plan")}>Plan</button>
			</div>
			<div className="min-h-0 flex-1 overflow-auto">{view === "plan" ? <DockPlanView tasks={tasks} /> : <TaskList tasks={tasks} />}</div>
		</div>
	);
}

function TaskList({ tasks }: { readonly tasks: readonly { readonly name: string; readonly status: string }[] }) {
	if (tasks.length === 0) return <DockEmpty title="No tasks" description="Tasks appear here when the session publishes them." />;
	return <ul className="space-y-1 p-3">{tasks.map(task => <li key={`${task.name}-${task.status}`} className="rounded border border-fr-border-soft px-3 py-2 text-fr-sm text-fr-text"><span>{task.name}</span><span className="ml-2 text-fr-xs text-fr-text-3">{task.status}</span></li>)}</ul>;
}

export function DockContextView() {
	return <DockEmpty title="Context unavailable" description="No context source is connected." />;
}

export function DockToolsView() {
	return <DockEmpty title="Tools unavailable" description="This session does not expose tools." />;
}

export function DockUsageView() {
	return <DockEmpty title="Usage unavailable" description="No usage source is connected." />;
}

export function DockMcpView() {
	return <DockEmpty title="MCP unavailable" description="No MCP source is connected." />;
}

export function DockBoardView({ workspace }: { readonly workspace: WorkspaceRef | null | undefined }) {
	return workspace ? <DockEmpty title="Task board" description="Project tasks are not available from the current driver." /> : <DockEmpty title="No board" description="Select a workspace to view its tasks." />;
}

export function AmbiguousFilePicker({ matches, onPick }: { readonly query: string; readonly matches: readonly string[]; readonly onPick: (path: string) => void }) {
	return <div>{matches.map(path => <button type="button" key={path} onClick={() => onPick(path)}>{path}</button>)}</div>;
}

export function isDirectoryPath(target: string, paths: readonly string[]): boolean {
	return target.endsWith("/") || paths.some(path => path.startsWith(`${target}/`));
}

export type DockContent = ReactNode;
