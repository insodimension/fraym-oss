import type {
	SessionTreeSnapshot,
	TerminalDriver,
	ToolDescriptor,
	WorkspaceDriver,
	WorkspaceFileContent,
	WorkspaceFileStatusEntry,
	WorkspaceRef,
} from "@fraym-ai/driver";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "../components/confirm-dialog";
import { FileTypeIcon } from "../elements/file-type-icon";
import { Skeleton, SkeletonGroup } from "../elements/skeleton";
import { StreamingMarkdown } from "../elements/streaming-markdown";
import {
	ConnectedIde,
	DiffViewer,
	type FileTreeGitStatusEntry,
	FileWorkspace,
	type FileWorkspaceFile,
	McpServerList,
	SubagentBatches,
	TerminalWorkspace,
	useWorkbenchDockState,
} from "../features";
import { useDockMcp, useUsageStateContext } from "../features/command-dock";
import { editorImagesToAttachments, seedSessionComposerDraft } from "../features/composer/session-composer-draft";
import { ConnectedContextBreakdown } from "../features/context-popover";
import { SessionTreeView } from "../features/session-tree";
import { TodoChecklistBody } from "../features/tool-card/tools/bodies/todo-body";
import { UsagePanel } from "../features/usage";
import { usePlanMode, useSessionOptional, useTasks } from "../hooks/use-session";
import { useTaskBatches } from "../hooks/use-task-batches";
import { useTerminalSession } from "../hooks/use-terminal-session";
import { useTools } from "../hooks/use-tools";
import { useWorkspaceFiles } from "../hooks/use-workspace-files";
import { Icon } from "../icons";
import { cn } from "../lib/cn";


/**
 * Plan markdown to render in the dock, in priority order:
 *  1. Live plan-file content from `planMode.content` (engine includes this in
 *     the session snapshot while plan mode is active — auto-updates as the
 *     agent writes the plan).
 *  2. Most recent `renderKind: "plan"` command block (the `/plan` no-args handler
 *     outputs the plan; the chip renderer stashes it in the transcript).
 *  3. Null (fall back to the todo checklist / empty state).
 */
function usePlanText(): string | null {
	const planMode = usePlanMode();
	const fromCommand = useLatestCommandText("plan");
	const liveContent = planMode?.content;
	return liveContent?.trim() ? liveContent : fromCommand;
}

function useLatestCommandText(renderKind: string): string | null {
	const session = useSessionOptional();
	const transcript = session?.transcript;
	return useMemo(() => {
		if (!transcript) return null;
		for (let i = transcript.length - 1; i >= 0; i--) {
			const blocks = transcript[i]?.blocks;
			if (!blocks) continue;
			for (let j = blocks.length - 1; j >= 0; j--) {
				const block = blocks[j];
				if (block?.type === "command" && block.renderKind === renderKind) {
					return block.text.trim() ? block.text : null;
				}
			}
		}
		return null;
	}, [renderKind, transcript]);
}

interface SessionInfoSection {
	readonly title: string;
	readonly rows: readonly string[];
}

function parseSessionInfo(text: string): SessionInfoSection[] {
	const lines = text
		.split(/\r?\n/)
		.map(line => line.trim())
		.filter(Boolean);
	const sections: SessionInfoSection[] = [];
	let current: { title: string; rows: string[] } | null = null;
	for (const line of lines) {
		if (line === "Session Info") {
			current = { title: line, rows: [] };
			sections.push(current);
			continue;
		}
		if (/^(Provider|Messages|Tokens|Cost|LSP Servers|MCP Servers)$/.test(line)) {
			current = { title: line, rows: [] };
			sections.push(current);
			continue;
		}
		if (!current) {
			current = { title: "Session Info", rows: [] };
			sections.push(current);
		}
		current.rows.push(line);
	}
	return sections;
}

function labelValue(row: string): { label: string; value: string } {
	const idx = row.indexOf(":");
	if (idx <= 0) return { label: "", value: row };
	return { label: row.slice(0, idx), value: row.slice(idx + 1).trim() };
}

function SessionInfoSectionCard({ section }: { readonly section: SessionInfoSection }) {
	return (
		<section className="rounded-xl border border-fr-border-soft bg-fr-surface p-3">
			<div className="mb-2 text-fr-xs font-semibold uppercase tracking-[0.16em] text-fr-text-3">{section.title}</div>
			<div className="flex flex-col gap-1.5">
				{section.rows.map((row, idx) => {
					const item = labelValue(row);
					return (
						<div key={`${section.title}-${idx}`} className="grid grid-cols-[96px_1fr] gap-2 text-fr-sm">
							<div className="fr-overflow font-secondary text-fr-text-3">{item.label || "Info"}</div>
							<div className="min-w-0 break-words font-secondary text-fr-text">{item.value}</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

export function DockSessionView() {
	const sessionText = useLatestCommandText("session");
	if (!sessionText) {
		return (
			<DockEmpty icon="list" title="No session report" description="Run /session to render session info here." />
		);
	}
	const sections = parseSessionInfo(sessionText);
	return (
		<div data-slot="dock-session" className="flex h-full min-h-0 flex-col gap-3 overflow-auto p-3">
			{sections.map(section => (
				<SessionInfoSectionCard key={section.title} section={section} />
			))}
		</div>
	);
}

export function DockPlanView({ tasks }: { readonly tasks: readonly { name: string; status: string }[] }) {
	// Prefer the rendered plan markdown (from `/plan`); fall back to the todo checklist.
	const planText = usePlanText();
	if (planText) {
		return (
			<div data-slot="dock-plan" className="h-full min-h-0 overflow-auto p-3">
				<StreamingMarkdown text={planText} />
			</div>
		);
	}
	if (tasks.length === 0) {
		return <DockEmpty icon="list" title="No plan yet" description="Run /plan to render the session plan here." />;
	}
	return (
		<div data-slot="dock-plan" className="p-3">
			{tasks.map(item => {
				const done = item.status === "completed";
				const active = item.status === "in_progress";
				return (
					<div key={item.name} className="flex items-start gap-2.5 py-2.5 text-fr-base">
						<span
							className={cn(
								"mt-px flex size-4 shrink-0 items-center justify-center rounded-[5px] border-[1.5px]",
								done && "border-fr-accent bg-fr-accent text-fr-accent-ink",
								active && "border-fr-accent bg-fr-surface text-fr-accent",
								!done && !active && "border-fr-border text-transparent",
							)}
						>
							{done ? <Icon name="check" size={11} strokeWidth={2.4} /> : null}
						</span>
						<span className={cn(done && "text-fr-text-3 line-through", active && "text-fr-text")}>
							{item.name}
						</span>
					</div>
				);
			})}
		</div>
	);
}

function DockEmpty({
	icon,
	title,
	description,
}: {
	readonly icon: "diff" | "terminal" | "folder" | "grid" | "list" | "branch";
	readonly title: string;
	readonly description: string;
}) {
	return (
		<div className="flex h-full min-h-[220px] flex-col items-center justify-center px-6 text-center">
			<div className="mb-3 flex size-10 items-center justify-center rounded-[12px] border border-fr-border-soft bg-fr-surface text-fr-text-3">
				<Icon name={icon} size={19} strokeWidth={1.7} />
			</div>
			<div className="text-fr-base font-semibold text-fr-text">{title}</div>
			<div className="mt-1 max-w-[240px] text-fr-sm leading-5 text-fr-text-3">{description}</div>
		</div>
	);
}

export function DockTreeView({ tree }: { readonly tree: SessionTreeSnapshot | null }) {
	const session = useSessionOptional();
	const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const driver = session?.driver ?? null;
	const sessionRef = session?.sessionRef ?? null;
	const reload = session?.reload;
	const canNavigate = Boolean(driver && sessionRef);
	// Navigating the tree repositions THIS session's leaf (same session, in place) exactly like
	// Branch — it drops everything after the target off the active branch, and landing on a user
	// node returns that message's text for composer prefill.
	const runNavigate = useCallback(async () => {
		if (!driver || !sessionRef || !pendingNodeId) return;
		setBusy(true);
		try {
			const result = await driver.navigateSessionTree(sessionRef, pendingNodeId);
			await reload?.();
			const images = editorImagesToAttachments(result.editorImages);
			if (result.editorText || images.length > 0) {
				seedSessionComposerDraft(
					`${sessionRef.workspaceId}:${sessionRef.sessionId}`,
					result.editorText ?? "",
					images,
				);
			}
		} finally {
			setBusy(false);
			setPendingNodeId(null);
		}
	}, [driver, sessionRef, reload, pendingNodeId]);
	if (!tree || tree.roots.length === 0) {
		return (
			<DockEmpty
				icon="branch"
				title="No session tree"
				description="Checkpoints and branches appear here as the session grows."
			/>
		);
	}
	return (
		<div data-slot="dock-tree" className="flex h-full min-h-0 flex-col">
			<div className="border-fr-border-soft border-b px-3 py-2">
				<div className="fr-eyebrow">Session tree</div>
				<div className="mt-0.5 text-fr-xs text-fr-text-3">
					Checkpoints &amp; branches in this conversation. The highlighted node is where you are now.
				</div>
			</div>
			<div className="min-h-0 flex-1 overflow-auto p-2">
				<SessionTreeView tree={tree} onNavigate={canNavigate ? id => setPendingNodeId(id) : undefined} />
			</div>
			{pendingNodeId ? (
				<ConfirmDialog
					title="Navigate to this point?"
					description="Moves this session to the selected point in its tree — everything after it drops off the active branch (still reachable from the tree). If the point is one of your messages, its text returns to the composer."
					confirmLabel="Navigate"
					icon="history"
					busy={busy}
					onConfirm={() => void runNavigate()}
					onClose={() => setPendingNodeId(null)}
				/>
			) : null}
		</div>
	);
}

export function DockDiffView() {
	const { diffRequest } = useWorkbenchDockState();
	if (!diffRequest || diffRequest.files.length === 0) {
		return (
			<DockEmpty
				icon="diff"
				title="No diff open"
				description="Open a diff from an edit or ast_edit tool card to view it here."
			/>
		);
	}
	return (
		<div data-slot="dock-diff" className="h-full min-h-0 overflow-auto p-2">
			<DiffViewer files={diffRequest.files} showToolbar disableOpen />
		</div>
	);
}

export function DockTerminalView({
	workspace,
	sessionId,
	terminalDriver,
}: {
	readonly workspace: WorkspaceRef | null | undefined;
	readonly sessionId?: string;
	readonly terminalDriver: TerminalDriver | null | undefined;
}) {
	const terminal = useTerminalSession(terminalDriver, workspace, { sessionId });
	if (!terminal.available) {
		return (
			<DockEmpty
				icon="terminal"
				title="Terminal unavailable"
				description="This workspace cannot open terminals yet."
			/>
		);
	}
	return (
		<div data-slot="dock-terminal" className="h-full min-h-0 p-2">
			<TerminalWorkspace
				session={terminal.session}
				opening={terminal.opening}
				error={terminal.error}
				onOpen={terminal.openTerminal}
				onNew={terminal.newTerminal}
				onWrite={terminal.write}
				onResize={terminal.resize}
				onClose={terminal.close}
				className="h-full rounded-none border-0"
			/>
		</div>
	);
}

function previewContent(file: WorkspaceFileContent): FileWorkspaceFile {
	const suffix = file.truncated ? "\n\n[File preview truncated.]" : "";
	return {
		content: `${file.content}${suffix}`,
		kind: file.kind,
		language: file.language,
	};
}

function previewFiles(
	files: Readonly<Record<string, WorkspaceFileContent>>,
): Readonly<Record<string, FileWorkspaceFile>> {
	return Object.fromEntries(
		Object.entries(files)
			.filter(([, file]) => !file.isDirectory && !file.notFound)
			.map(([path, file]) => [path, previewContent(file)]),
	);
}

// A path is a directory when the tree carries it with a trailing slash, or when it is
// not itself a file path but is the parent prefix of one. Lets the file view reveal a
// folder (tree stays open, folder expanded) instead of trying to read it as a file.
export function isDirectoryPath(target: string, paths: readonly string[]): boolean {
	if (target.endsWith("/")) return true;
	if (paths.includes(target)) return false;
	const prefix = `${target}/`;
	return paths.some(filePath => filePath.startsWith(prefix));
}

function treeGitStatus(entries: readonly WorkspaceFileStatusEntry[]): readonly FileTreeGitStatusEntry[] {
	return entries.map(entry => ({ path: entry.path, status: entry.status as FileTreeGitStatusEntry["status"] }));
}

/** Ambiguous file-open resolver. The engine matched a bare/partial mention (e.g. a
 *  chat file link like `index.ts`) to MANY workspace files and handed back every hit.
 *  Rather than dead-end on "open the tree to pick one", list the matches as one-click
 *  rows — picking one re-reads that exact path (a unique open) and previews it. */
export function AmbiguousFilePicker({
	query,
	matches,
	onPick,
}: {
	readonly query: string;
	readonly matches: readonly string[];
	readonly onPick: (path: string) => void;
}) {
	return (
		<div data-slot="ambiguous-file-picker" className="mx-auto flex w-full max-w-sm flex-col gap-0.5 text-left">
			<p className="px-2 pb-1 text-fr-xs text-fr-text-3">
				{matches.length} files match <span className="font-secondary text-fr-text-2">{query}</span> — pick one:
			</p>
			{matches.map(match => (
				<button
					key={match}
					type="button"
					title={match}
					onClick={() => onPick(match)}
					className={cn(
						"flex w-full items-center gap-1.5 rounded-[6px] px-2 py-1 text-left font-secondary text-fr-xs",
						"text-fr-text-2 transition-colors hover:bg-fr-surface-2 hover:text-fr-text-1",
					)}
				>
					<FileTypeIcon path={match} size={12} className="shrink-0" />
					<span className="fr-overflow">{match}</span>
				</button>
			))}
		</div>
	);
}

export function DockFilesView({
	workspace,
	workspaceDriver,
}: {
	readonly workspace: WorkspaceRef | null | undefined;
	readonly workspaceDriver: WorkspaceDriver | null | undefined;
}) {
	const files = useWorkspaceFiles(workspaceDriver, workspace);
	const { fileRequest } = useWorkbenchDockState();
	const { selectPath } = files;
	const fileRequestPath = fileRequest?.path ?? null;
	// A linked directory (e.g. a `board` folder reference) must reveal the folder in the
	// tree, not be read as a file. Detect it from the tree paths (instant) and the engine's
	// directory marker (authoritative, post-read).
	const requestIsDir = fileRequestPath ? isDirectoryPath(fileRequestPath, files.paths) : false;
	const selectedIsDir =
		files.selectedFile?.isDirectory === true ||
		(files.selectedPath ? isDirectoryPath(files.selectedPath, files.paths) : false);
	// A bare/partial mention (e.g. `SKILL.md`) that matches MANY files can't auto-open one
	// without guessing; the engine reports every match so we say so honestly rather than
	// the misleading "File not found" (the file exists — many times).
	const ambiguousMatches = files.selectedFile?.ambiguousMatches ?? [];
	const [treeCollapseState, setTreeCollapseState] = useState<{
		readonly requestPath: string | null;
		readonly collapsed: boolean;
	}>({ requestPath: null, collapsed: false });
	// A file request collapses the tree to focus the file; a directory keeps it open
	// (the whole point is to show the folder expanded).
	const treeCollapsed =
		treeCollapseState.requestPath === fileRequestPath
			? treeCollapseState.collapsed
			: Boolean(fileRequestPath) && !requestIsDir;
	const handleTreeCollapsedChange = (collapsed: boolean) => {
		setTreeCollapseState({ requestPath: fileRequestPath, collapsed });
	};
	useEffect(() => {
		// Opening a file from a tool card focuses just the file: select it + collapse the tree
		// (the user reveals the tree again via the panel toggle).
		if (fileRequest?.path) {
			selectPath(fileRequest.path);
		}
	}, [fileRequest, selectPath]);
	if (!files.available) {
		return <DockEmpty icon="folder" title="Files unavailable" description="This workspace cannot show files yet." />;
	}
	if (files.loadingTree && files.paths.length === 0) {
		return <DockFilesSkeleton />;
	}
	if (files.error && files.paths.length === 0) {
		return <DockEmpty icon="folder" title="Cannot load files" description={files.error} />;
	}
	if (files.paths.length === 0) {
		return <DockEmpty icon="folder" title="No files" description="The current workspace has no visible files." />;
	}
	return (
		<div data-slot="dock-files" className="h-full min-h-0 p-2">
			<FileWorkspace
				paths={files.paths}
				gitStatus={treeGitStatus(files.gitStatus)}
				files={previewFiles(files.files)}
				selectedPath={files.selectedPath}
				onSelect={files.selectPath}
				loading={files.loadingFile}
				emptyLabel={
					ambiguousMatches.length > 1 ? (
						<AmbiguousFilePicker
							query={files.selectedPath ?? ""}
							matches={ambiguousMatches}
							onPick={files.selectPath}
						/>
					) : files.selectedFile?.notFound ? (
						`File not found: ${files.selectedPath}`
					) : (
						(files.error ??
						(selectedIsDir
							? "Folder opened in the tree — select a file to preview."
							: "Select a file to preview."))
					)
				}
				treeCollapsed={treeCollapsed}
				onTreeCollapsedChange={handleTreeCollapsedChange}
				scopeTreeToFile
				className="h-full rounded-none border-0"
			/>
		</div>
	);
}

/** Bumps a revision so a mounted git view re-polls status: once when the agent's
 *  turn settles (busy → idle) and on a gentle interval while it's busy (paused when
 *  the tab is hidden). Cheap Happier-style liveness — no server stream. */
function useScmLiveRevision(busy: boolean): { readonly revision: number; readonly bump: () => void } {
	const [revision, setRevision] = useState(0);
	const bump = useCallback(() => setRevision(value => value + 1), []);
	// Detect the turn-settle edge (busy → idle) DURING RENDER via a prev-value state —
	// no effect, no stale frame between commits — and bump once so a mounted git view
	// re-polls. (React's "adjust state during render" pattern; converges immediately.)
	const [wasBusy, setWasBusy] = useState(busy);
	if (busy !== wasBusy) {
		setWasBusy(busy);
		if (!busy) bump();
	}
	// Gentle poll while the agent works (paused when the tab is hidden).
	useEffect(() => {
		if (!busy) return;
		const id = setInterval(() => {
			if (typeof document === "undefined" || !document.hidden) bump();
		}, 4000);
		return () => clearInterval(id);
	}, [busy, bump]);
	return { revision, bump };
}

/** Capture a per-session working-tree checkpoint (hidden git ref) once at session
 *  start and again each time the agent's turn settles (busy → idle). No-op turns
 *  are skipped engine-side; a real capture bumps `onCaptured` so the panel re-lists. */
function useTurnCheckpointCapture(
	workspace: WorkspaceRef | null | undefined,
	workspaceDriver: WorkspaceDriver | null | undefined,
	sessionId: string | null,
	busy: boolean,
	onCaptured: () => void,
): void {
	const capture = useCallback(
		(label: string) => {
			if (!workspace || !sessionId || !workspaceDriver?.scmCheckpointCapture) return;
			void workspaceDriver
				.scmCheckpointCapture(workspace, sessionId, label)
				.then(result => {
					if (result.captured) onCaptured();
				})
				.catch(() => {});
		},
		[workspace, workspaceDriver, sessionId, onCaptured],
	);
	const baselinedSession = useRef<string | null>(null);
	useEffect(() => {
		if (!sessionId || baselinedSession.current === sessionId) return;
		baselinedSession.current = sessionId;
		capture("Session start");
	}, [sessionId, capture]);
	const wasBusy = useRef(false);
	useEffect(() => {
		if (wasBusy.current && !busy) capture("Agent edits");
		wasBusy.current = busy;
	}, [busy, capture]);
}

/** The Code (IDE) dock tab: one Folder/Git surface fed by the workspace driver —
 *  file tree + multi-format preview (Folder) and the Source Control changes list +
 *  side-by-side diff (Git), toggled on the activity rail. Replaces the old separate
 *  tree / files / diff tabs. */
export function DockIdeView({
	workspace,
	workspaceDriver,
}: {
	readonly workspace: WorkspaceRef | null | undefined;
	readonly workspaceDriver: WorkspaceDriver | null | undefined;
}) {
	const { fileRequest, diffRequest } = useWorkbenchDockState();
	const session = useSessionOptional();
	const sessionId = session?.sessionRef?.sessionId ?? null;
	const busy = Boolean(session?.workingStatus) || Boolean(session?.isStreaming);
	const { revision, bump } = useScmLiveRevision(busy);
	useTurnCheckpointCapture(workspace, workspaceDriver, sessionId, busy, bump);
	if (!workspace || !workspaceDriver) {
		return <DockEmpty icon="folder" title="Code unavailable" description="This workspace cannot show code yet." />;
	}
	return (
		<ConnectedIde
			workspace={workspace}
			workspaceDriver={workspaceDriver}
			defaultSelectedPath={fileRequest?.path}
			externalDiff={diffRequest ? { files: diffRequest.files, nonce: diffRequest.nonce } : undefined}
			revision={revision}
			sessionId={sessionId ?? undefined}
			className="h-full rounded-none border-0"
		/>
	);
}

/** The live session-todo content: the agent's work plan + subagent dispatches,
 *  or an empty state. The "Tasks" lens of the dock's Tasks tab. */
export function DockTasksSession() {
	const batches = useTaskBatches();
	const tasks = useTasks();
	if (batches.length === 0 && tasks.length === 0) {
		return (
			<DockEmpty
				icon="grid"
				title="No tasks yet"
				description="Subagent dispatches and the work plan appear here as they run, live."
			/>
		);
	}
	return (
		<div data-slot="dock-tasks" className="flex flex-col gap-4 p-3">
			{tasks.length > 0 && (
				<section className="flex flex-col gap-1.5">
					<div className="fr-eyebrow">Work plan</div>
					<TodoChecklistBody phases={tasks} />
				</section>
			)}
			{batches.length > 0 && (
				<section className="flex flex-col gap-2">
					<div className="fr-eyebrow">Subagents</div>
					<SubagentBatches batches={batches} settings={{ density: "compact" }} />
				</section>
			)}
		</div>
	);
}

/** The dock's Tasks tab: a Task | Plan sub-toggle over one pane. "Task" is the
 *  live session todo + subagent dispatches; "Plan" is the finalized work plan.
 *  Controlled — view/onViewChange map to the dock tab id ("tasks"/"plan") so a
 *  plan-created event can open this tab straight to the Plan pane. */
export function DockTasksView({
	tasks,
	view,
	onViewChange,
}: {
	readonly tasks: readonly { name: string; status: string }[];
	readonly view: "task" | "plan";
	readonly onViewChange: (view: "task" | "plan") => void;
}) {
	return (
		<div data-slot="dock-tasks-view" className="flex h-full min-h-0 flex-col">
			<div className="flex shrink-0 items-center border-b border-fr-border-soft px-3 py-2">
				<div
					role="tablist"
					aria-label="Tasks view"
					className="inline-flex items-center gap-0.5 rounded-[8px] border border-fr-border-soft bg-fr-surface p-0.5"
				>
					{(["task", "plan"] as const).map(value => (
						<button
							key={value}
							type="button"
							role="tab"
							aria-selected={view === value}
							onClick={() => onViewChange(value)}
							className={cn(
								"inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-fr-xs font-medium transition-colors",
								view === value ? "bg-fr-accent-dim text-fr-accent" : "text-fr-text-3 hover:text-fr-text",
							)}
						>
							<Icon name={value === "task" ? "grid" : "list"} size={12} strokeWidth={1.9} />
							{value === "task" ? "Task" : "Plan"}
						</button>
					))}
				</div>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto">
				{view === "task" ? <DockTasksSession /> : <DockPlanView tasks={tasks} />}
			</div>
		</div>
	);
}

function DockFilesSkeleton() {
	return (
		<SkeletonGroup label="Loading files…" data-slot="dock-files" className="flex flex-col gap-1.5 p-3">
			{[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
				<div key={i} className="flex items-center gap-2" style={{ paddingLeft: (i % 3) * 12 }}>
					<Skeleton w={12} h={12} rounded="sm" className="shrink-0" />
					<Skeleton h={10} rounded="sm" w={`${42 + ((i * 7) % 44)}%`} />
				</div>
			))}
		</SkeletonGroup>
	);
}

export function DockContextView() {
	return (
		<div data-slot="dock-context" className="h-full min-h-0 overflow-auto p-3">
			<ConnectedContextBreakdown className="max-w-none" />
		</div>
	);
}

export function DockToolsView() {
	const session = useSessionOptional();
	const { tools, loading } = useTools(session?.driver, session?.sessionRef, true);
	if (!tools) {
		return (
			<DockEmpty
				icon="grid"
				title={loading ? "Loading tools…" : "Tools unavailable"}
				description={loading ? "Fetching the agent's tools." : "This session doesn't expose its tools."}
			/>
		);
	}
	if (tools.length === 0) {
		return <DockEmpty icon="grid" title="No tools" description="No tools are available in this session." />;
	}
	return (
		<div data-slot="dock-tools" className="h-full min-h-0 overflow-auto p-3">
			<ul className="grid gap-1.5">
				{tools.map(tool => (
					<li key={tool.name} className="flex items-center gap-2.5 rounded-lg border border-fr-border bg-fr-surface px-3 py-2">
						<Icon name={tool.source === "mcp" ? "globe" : "bolt"} size={14} className="shrink-0 text-fr-text-3" />
						<div className="min-w-0 flex-1">
							<div className="truncate text-fr-sm font-medium text-fr-text">{tool.label ?? tool.name}</div>
							{tool.summary ? (
								<div className="truncate text-fr-xs text-fr-text-3">{tool.summary.replace(/\s+/g, " ").trim()}</div>
							) : null}
						</div>
						<span className="shrink-0 font-mono text-[10px] text-fr-text-3">{tool.source === "mcp" ? "MCP" : "Built-in"}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

export function DockUsageView() {
	const usage = useUsageStateContext();
	if (!usage) {
		return <DockEmpty icon="list" title="Usage unavailable" description="No usage source is connected." />;
	}
	return (
		<div data-slot="dock-usage" className="h-full min-h-0 overflow-auto p-3">
			<UsagePanel
				className="max-w-none"
				snapshot={usage.snapshot}
				available={usage.available}
				loading={usage.loading}
				refreshing={usage.refreshing}
				error={usage.error}
				onRefresh={usage.refresh}
			/>
		</div>
	);
}

export function DockMcpView() {
	const mcp = useDockMcp();
	if (!mcp) {
		return <DockEmpty icon="list" title="MCP unavailable" description="No MCP source is connected." />;
	}
	return (
		<div data-slot="dock-mcp" className="h-full min-h-0 overflow-auto p-3">
			<McpServerList servers={mcp.servers} onToggle={mcp.onToggle} />
		</div>
	);
}

/** The per-project task board tab. This host has no durable project-board
 *  backing, so the tab always renders its empty state. */
export function DockBoardView({ workspace }: { readonly workspace: WorkspaceRef | null | undefined }) {
	void workspace;
	return <DockEmpty icon="grid" title="No board" description="Tasks appear here once this project has a board." />;
}
