/**
 * Environment card — the active session's working environment at a glance,
 * in the locked v4 "ledger" design: a typographic header whose BRANCH IS A
 * CONTROL (opens the search/switch/create picker), a Changes row that
 * NAVIGATES to the Code dock (single source of truth for diffs), a Repos
 * section with STATE-DEPENDENT prominence (quiet one-line summary when every
 * submodule pin is healthy; auto-opened + escalated on pin drift), a
 * Worktrees listing, and a dialog-style footer (quiet meta left, ONE
 * context-dependent primary right).
 *
 * Every section renders REAL driver data (`scmSnapshot`, `scmRepoTree`,
 * `listAllWorktrees`, `scmBranchList`) and REAL actions (`scmCheckout`,
 * `scmCreateBranch`, `syncSessionWorktree`, `finishSessionWorktree`,
 * `relocateSessionToWorktree`, `scmPush`, `scmCreatePr`). There is
 * intentionally NO "Local Servers" or "Recap" section: no engine surface
 * reports dev servers or session recaps yet, and a section ships functional
 * or is omitted — never stubbed.
 */

import type {
	RepoWorktree,
	SessionRef,
	SessionScmConfidence,
	SessionScmLedger,
	WorkspaceDriver,
	WorkspaceRef,
	WorkspaceRepoTree,
	WorkspaceScmBranch,
	WorkspaceScmSnapshot,
	WorktreeMergeMode,
} from "@fraym/driver";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "../../elements/badge";
import { BranchName } from "../../elements/branch-name";
import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";

export interface EnvironmentPanelProps {
	/** The active PROJECT workspace (the main checkout the rail groups under). */
	readonly workspace: WorkspaceRef | null | undefined;
	/** The active SESSION's own workspace — its path is the worktree checkout
	 *  when the session runs in one. Preferred over `workspace` when present. */
	readonly sessionWorkspace: WorkspaceRef | null | undefined;
	readonly sessionRef: SessionRef | null | undefined;
	readonly workspaceDriver: WorkspaceDriver | null | undefined;
	/** Open the Code dock (hosts the Git surface) — the Changes row navigates
	 *  there instead of duplicating a file list. Row hidden when absent. */
	readonly onOpenChanges?: () => void;
	/** Latest per-run recap from the session snapshot (`snapshot.recap`) — the
	 *  agent's `recap.perRun` smol completion. Section hidden when absent. */
	readonly recap?: { readonly text: string; readonly generatedAt: string } | null;
	/** Durable SCM facts attributed to this session's journal only. The panel
	 * keeps this visibly distinct from the checkout-wide Changes section. */
	readonly sessionScm?: SessionScmLedger | null;
	/** Live plan/tasks from the session frame — powers the Activity row (pulsing
	 *  while a task runs). Row hidden when idle. */
	readonly tasks?: readonly { readonly name: string; readonly status: string }[] | null;
	/** Session has detached background work (jobs / subagents still running). */
	readonly hasBackgroundWork?: boolean;
	/** Open the Tasks dock — the Activity row navigates there. */
	readonly onOpenTasks?: () => void;
	readonly className?: string;
}

interface ActionNotice {
	readonly tone: "info" | "warn";
	readonly text: string;
}

const ROW_CLASS =
	"flex h-8 w-full items-center gap-2 rounded-[8px] px-2 text-left text-fr-sm outline-none transition-colors hover:bg-fr-surface-2 focus-visible:bg-fr-surface-2";

function Hairline() {
	return <div className="mx-2 my-1 border-t border-fr-border-soft" />;
}

/** DESIGN.md chip spec: surface-3 fill, mono caption, rounded.sm — on the
 *  shared Badge metrics (fixed h-5 + leading-none + flex centering) so the
 *  chip glyphs sit on the exact row axis next to the larger label text
 *  instead of drifting by the half-leading of a content-height box. */
function Chip({ children, tone }: { readonly children: ReactNode; readonly tone?: "warn" | "del" | "add" }) {
	return (
		<Badge
			variant="soft"
			tone="mute"
			className={cn(
				"rounded-[6px] px-1.5 tabular-nums",
				tone === "warn"
					? "text-fr-warn"
					: tone === "del"
						? "text-fr-del"
						: tone === "add"
							? "text-fr-add"
							: "text-fr-text-2",
			)}
		>
			{children}
		</Badge>
	);
}

/** One "This session" pipeline stage: state dot + connector, unit-labelled meta. */
function PipelineStage({
	tone,
	title,
	meta,
	last,
	children,
}: {
	readonly tone: "add" | "warn" | "idle";
	readonly title: string;
	readonly meta: string;
	readonly last?: boolean;
	readonly children?: ReactNode;
}) {
	return (
		<div className="relative pr-4 pb-1.5 pl-10">
			{!last && (
				<span aria-hidden="true" className="absolute top-[15px] -bottom-0.5 left-4 w-px bg-fr-border-soft" />
			)}
			<span
				aria-hidden="true"
				className={cn(
					"absolute top-[7px] left-[13px] size-[7px] rounded-full",
					tone === "add"
						? "bg-fr-add"
						: tone === "warn"
							? "bg-fr-warn"
							: "border border-fr-border bg-fr-surface-3",
				)}
			/>
			<div className="flex items-baseline gap-2 text-fr-xs leading-5">
				<span className="font-medium text-fr-text-2">{title}</span>
				<span className="text-fr-2xs tabular-nums text-fr-text-3">{meta}</span>
			</div>
			{children}
		</div>
	);
}

/** Attribution confidence as a human footnote — never a scary header badge. */
const SESSION_ATTRIBUTION_NOTE: Record<SessionScmConfidence, string> = {
	exclusive: "Runs in its own worktree — attribution is exact.",
	shared: "Shared checkout — other sessions can edit the same files.",
	inferred: "Attribution approximate — git state was only partially observable.",
};

/** ONE verdict for the collapsed header: the work remaining, or the landing. */
function sessionScmVerdict(
	ledger: SessionScmLedger,
	uncommittedCount: number | null,
): { readonly label: string; readonly tone?: "warn" | "add" } {
	if ((uncommittedCount ?? 0) > 0) return { label: `${uncommittedCount} to commit`, tone: "warn" };
	if (ledger.unpushedCount > 0) return { label: `${ledger.unpushedCount} to push`, tone: "warn" };
	if (ledger.committedCount > 0) return { label: "✓ all pushed", tone: "add" };
	if (ledger.touchedPaths.length === 0) return { label: "no changes" };
	// Touched paths exist, none dirty, nothing committed: either the checkout
	// was unreadable (null) or the session's edits left no residue.
	return uncommittedCount === null ? { label: `${ledger.touchedPaths.length} touched` } : { label: "nothing pending" };
}

function SectionRow({
	icon,
	label,
	trailing,
	children,
	open,
	onToggle,
}: {
	readonly icon: IconName;
	readonly label: string;
	readonly trailing?: ReactNode;
	readonly children: ReactNode;
	readonly open: boolean;
	readonly onToggle: () => void;
}) {
	return (
		<div>
			<button type="button" className={ROW_CLASS} onClick={onToggle} aria-expanded={open}>
				<span className="flex size-4 shrink-0 items-center justify-center">
					<Icon name={icon} size={14} strokeWidth={1.6} className="text-fr-text-3" aria-hidden="true" />
				</span>
				<span className="min-w-0 flex-1 fr-overflow font-medium text-fr-text-2">{label}</span>
				{trailing != null && (
					<span className="flex shrink-0 items-center gap-1.5 text-fr-xs leading-none tabular-nums text-fr-text-3">
						{trailing}
					</span>
				)}
				<Icon
					name="caretD"
					size={11}
					strokeWidth={1.8}
					className={cn("shrink-0 text-fr-text-3 transition-transform duration-200", !open && "-rotate-90")}
					aria-hidden="true"
				/>
			</button>
			{open && <div className="flex flex-col pb-1.5">{children}</div>}
		</div>
	);
}

/** Small ghost action row inside an expanded section (the lifecycle verbs). */
function ActionRow({
	icon,
	label,
	hint,
	disabled,
	onClick,
}: {
	readonly icon: IconName;
	readonly label: string;
	readonly hint?: string;
	readonly disabled?: boolean;
	readonly onClick: () => void;
}) {
	return (
		<button
			type="button"
			className={cn(
				ROW_CLASS,
				"h-7 pl-4 text-fr-xs text-fr-text-2 disabled:pointer-events-none disabled:opacity-50",
			)}
			onClick={onClick}
			disabled={disabled}
		>
			<span className="flex size-4 shrink-0 items-center justify-center">
				<Icon name={icon} size={12} strokeWidth={1.6} aria-hidden="true" />
			</span>
			<span className="min-w-0 flex-1 fr-overflow">{label}</span>
			{hint && <span className="shrink-0 text-fr-2xs text-fr-text-3">{hint}</span>}
		</button>
	);
}

/** Codex-style branch picker: search · switch (✓ current) · create. */
function BranchPicker({
	branches,
	current,
	busy,
	dirtyFiles,
	onPick,
	onCreate,
}: {
	readonly branches: readonly WorkspaceScmBranch[];
	readonly current: string | null;
	readonly busy: boolean;
	readonly dirtyFiles: number;
	readonly onPick: (branch: string) => void;
	readonly onCreate: (name: string) => void;
}) {
	const [query, setQuery] = useState("");
	const [creating, setCreating] = useState(false);
	const filtered = branches.filter(branch => branch.name.toLowerCase().includes(query.toLowerCase()));
	return (
		<div
			className="absolute top-10 left-2 z-10 flex max-h-80 w-64 flex-col overflow-y-auto rounded-[12px] border border-fr-border bg-fr-surface p-1.5 shadow-[0_4px_18px_rgba(0,0,0,0.3)]"
			role="listbox"
			data-slot="environment-branch-picker"
		>
			<div className="flex items-center gap-1.5 px-2 py-1">
				<Icon name="search" size={11} strokeWidth={1.7} className="shrink-0 text-fr-text-3" aria-hidden="true" />
				<input
					value={query}
					onChange={event => setQuery(event.target.value)}
					placeholder="Search branches"
					className="w-full bg-transparent text-fr-xs text-fr-text outline-none placeholder:text-fr-text-3"
				/>
			</div>
			<div className="mx-2 my-1 border-t border-fr-border-soft" />
			{filtered.length === 0 && <div className="px-2 py-1 text-fr-xs text-fr-text-3">No branches match.</div>}
			{filtered.map(branch => {
				const active = branch.name === current;
				return (
					<button
						key={branch.name}
						type="button"
						disabled={busy}
						onClick={() => onPick(branch.name)}
						className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1 text-left transition-colors hover:bg-fr-surface-2 disabled:opacity-50"
						aria-selected={active}
						role="option"
					>
						<Icon
							name="branch"
							size={11}
							strokeWidth={1.7}
							className="shrink-0 text-fr-text-3"
							aria-hidden="true"
						/>
						<span className="flex min-w-0 flex-1 flex-col">
							<BranchName name={branch.name} className="min-w-0 text-fr-xs text-fr-text-2" />
							{active && dirtyFiles > 0 && (
								<span className="text-fr-2xs text-fr-text-3">
									Uncommitted: {dirtyFiles} file{dirtyFiles === 1 ? "" : "s"}
								</span>
							)}
						</span>
						{active && (
							<Icon
								name="check"
								size={11}
								strokeWidth={2}
								className="shrink-0 text-fr-text-2"
								aria-hidden="true"
							/>
						)}
					</button>
				);
			})}
			<div className="mx-2 my-1 border-t border-fr-border-soft" />
			{creating ? (
				<form
					className="flex items-center gap-1.5 px-2 py-1"
					onSubmit={event => {
						event.preventDefault();
						const name = new FormData(event.currentTarget).get("branch");
						if (typeof name === "string" && name.trim()) onCreate(name.trim());
					}}
				>
					<Icon name="plus" size={11} strokeWidth={1.8} className="shrink-0 text-fr-text-3" aria-hidden="true" />
					<input
						name="branch"
						autoFocus
						placeholder="new-branch-name"
						className="w-full bg-transparent text-fr-xs text-fr-text outline-none placeholder:text-fr-text-3"
					/>
				</form>
			) : (
				<button
					type="button"
					disabled={busy}
					onClick={() => setCreating(true)}
					className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1 text-left text-fr-xs text-fr-text-2 transition-colors hover:bg-fr-surface-2 disabled:opacity-50"
				>
					<Icon name="plus" size={11} strokeWidth={1.8} className="shrink-0 text-fr-text-3" aria-hidden="true" />
					Create and checkout new branch…
				</button>
			)}
		</div>
	);
}

const GHOST_BUTTON_CLASS =
	"whitespace-nowrap rounded-[8px] px-2 py-1 text-fr-xs text-fr-text-2 transition-colors hover:bg-fr-surface-2 hover:text-fr-text active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export function EnvironmentPanel({
	workspace,
	sessionWorkspace,
	sessionRef,
	workspaceDriver,
	onOpenChanges,
	recap,
	sessionScm,
	tasks,
	hasBackgroundWork,
	onOpenTasks,
	className,
}: EnvironmentPanelProps) {
	// The environment is the SESSION's checkout when known (a worktree session's
	// scm state lives in its own checkout), else the project workspace.
	const env = sessionWorkspace ?? workspace ?? null;
	const isWorktree = Boolean(env?.git?.worktree);
	const [snapshot, setSnapshot] = useState<WorkspaceScmSnapshot | null>(null);
	const [repoTree, setRepoTree] = useState<WorkspaceRepoTree | null>(null);
	const [worktrees, setWorktrees] = useState<readonly RepoWorktree[] | null>(null);
	const [branches, setBranches] = useState<readonly WorkspaceScmBranch[] | null>(null);
	const [busy, setBusy] = useState<string | null>(null);
	const [notice, setNotice] = useState<ActionNotice | null>(null);
	const [refreshNonce, setRefreshNonce] = useState(0);
	const [openSection, setOpenSection] = useState<string | null>(null);
	const [reposOpen, setReposOpen] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);

	const envPath = env?.path;
	const sessionScmRevision = sessionScm?.updatedAt;
	// envPath (not the env object identity) keys the load: snapshot emissions
	// re-create the ref object; the data changes with the checkout or when the
	// session's SCM recorder reports a completed repository mutation.
	// biome-ignore lint/correctness/useExhaustiveDependencies: env is intentionally keyed by its stable path; sessionScmRevision is the external checkout invalidation signal.
	useEffect(() => {
		if (!workspaceDriver || !env || !envPath) return;
		let cancelled = false;
		void (async () => {
			const [scm, tree, trees] = await Promise.all([
				workspaceDriver.scmSnapshot?.(env).catch(() => null) ?? Promise.resolve(null),
				workspaceDriver.scmRepoTree?.(env).catch(() => null) ?? Promise.resolve(null),
				workspaceDriver.listAllWorktrees?.(env).catch(() => null) ?? Promise.resolve(null),
			]);
			if (cancelled) return;
			setSnapshot(scm ?? null);
			setRepoTree(tree ?? null);
			setWorktrees(trees ?? null);
		})();
		return () => {
			cancelled = true;
		};
	}, [workspaceDriver, envPath, refreshNonce, sessionScmRevision]);

	// Branch list loads lazily, when the picker opens.
	// biome-ignore lint/correctness/useExhaustiveDependencies: env is keyed by envPath on purpose
	useEffect(() => {
		if (!pickerOpen || !workspaceDriver?.scmBranchList || !env) return;
		let cancelled = false;
		void workspaceDriver
			.scmBranchList(env)
			.then(list => {
				if (!cancelled) setBranches(list);
			})
			.catch(() => {
				if (!cancelled) setBranches([]);
			});
		return () => {
			cancelled = true;
		};
	}, [pickerOpen, workspaceDriver, envPath, refreshNonce]);

	const refresh = useCallback(() => setRefreshNonce(nonce => nonce + 1), []);

	const runAction = useCallback(
		async (id: string, work: () => Promise<ActionNotice | null>) => {
			setBusy(id);
			setNotice(null);
			try {
				const result = await work();
				if (result) setNotice(result);
			} catch (error) {
				setNotice({ tone: "warn", text: error instanceof Error ? error.message : String(error) });
			} finally {
				setBusy(null);
				refresh();
			}
		},
		[refresh],
	);

	const checkout = useCallback(
		(branch: string) => {
			if (!workspaceDriver?.scmCheckout || !env) return;
			setPickerOpen(false);
			void runAction("checkout", async () => {
				const result = await workspaceDriver.scmCheckout?.(env, branch);
				if (!result) return null;
				return result.ok ? null : { tone: "warn", text: result.message ?? "Checkout failed." };
			});
		},
		[env, runAction, workspaceDriver],
	);

	const createBranch = useCallback(
		(name: string) => {
			if (!workspaceDriver?.scmCreateBranch || !env) return;
			setPickerOpen(false);
			void runAction("create-branch", async () => {
				const result = await workspaceDriver.scmCreateBranch?.(env, name);
				if (!result) return null;
				return result.ok ? null : { tone: "warn", text: result.message ?? "Branch creation failed." };
			});
		},
		[env, runAction, workspaceDriver],
	);

	const sync = useCallback(() => {
		if (!workspaceDriver?.syncSessionWorktree || !env) return;
		void runAction("sync", async () => {
			const result = await workspaceDriver.syncSessionWorktree?.(env);
			if (!result) return null;
			return { tone: result.conflict ? "warn" : "info", text: result.message ?? "Synced." };
		});
	}, [env, runAction, workspaceDriver]);

	const finish = useCallback(
		(merge: WorktreeMergeMode) => {
			if (!workspaceDriver?.finishSessionWorktree || !env || !sessionRef) return;
			// (no menu to close — the Finish landings are structured action rows)
			void runAction(`finish-${merge}`, async () => {
				const result = await workspaceDriver.finishSessionWorktree?.(env, sessionRef.sessionId, merge);
				if (!result) return null;
				return { tone: result.ok ? "info" : "warn", text: result.text };
			});
		},
		[env, runAction, sessionRef, workspaceDriver],
	);

	const push = useCallback(() => {
		if (!workspaceDriver?.scmPush || !env) return;
		void runAction("push", async () => {
			const result = await workspaceDriver.scmPush?.(env);
			if (!result) return null;
			return { tone: result.ok ? "info" : "warn", text: result.message ?? (result.ok ? "Pushed." : "Push failed.") };
		});
	}, [env, runAction, workspaceDriver]);

	const moveToWorktree = useCallback(() => {
		if (!workspaceDriver?.relocateSessionToWorktree || !env || !sessionRef) return;
		void runAction("relocate", async () => {
			await workspaceDriver.relocateSessionToWorktree?.(env, sessionRef.sessionId);
			return { tone: "info", text: "Session moved to its own worktree." };
		});
	}, [env, runAction, sessionRef, workspaceDriver]);

	const branch = snapshot?.branch;
	const totals = snapshot?.totals;
	const changedFiles = useMemo(
		() => (snapshot ? snapshot.staged.length + snapshot.unstaged.length + snapshot.conflicts.length : 0),
		[snapshot],
	);
	// Per-file breakdown for the Changes expansion: staged + unstaged merged by
	// path (a file can appear on both sides of the index), biggest churn first.
	const changeEntries = useMemo(() => {
		if (!snapshot) return [];
		const byPath = new Map<string, { path: string; additions: number; deletions: number; conflicted: boolean }>();
		for (const entry of [...snapshot.staged, ...snapshot.unstaged, ...snapshot.conflicts]) {
			const existing = byPath.get(entry.path);
			if (existing) {
				existing.additions += entry.additions;
				existing.deletions += entry.deletions;
				existing.conflicted ||= entry.kind === "conflicted";
			} else {
				byPath.set(entry.path, {
					path: entry.path,
					additions: entry.additions,
					deletions: entry.deletions,
					conflicted: entry.kind === "conflicted",
				});
			}
		}
		return [...byPath.values()].sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions));
	}, [snapshot]);
	// The checkout snapshot is deliberately only used to answer the narrow
	// "which session-touched paths remain uncommitted?" question. Its complete
	// Changes section remains checkout-wide, especially for shared checkouts.
	const sessionUncommittedPaths = useMemo(() => {
		if (!sessionScm?.available || !snapshot?.available) return null;
		const changedPaths = new Set(changeEntries.map(entry => entry.path));
		return sessionScm.touchedPaths.filter(path => changedPaths.has(path));
	}, [changeEntries, sessionScm, snapshot?.available]);
	const sessionVerdict =
		sessionScm?.available === true
			? sessionScmVerdict(sessionScm, sessionUncommittedPaths === null ? null : sessionUncommittedPaths.length)
			: null;
	const normalizedEnvPath = envPath?.replace(/\\/g, "/").toLowerCase();
	const repos = repoTree?.available ? repoTree.repos : [];
	const troubled = repos.filter(repo => repo.pin?.state === "ahead" || repo.pin?.state === "drift");
	const hasDrift = troubled.some(repo => repo.pin?.state === "drift");
	const reposExpanded = reposOpen || hasDrift;
	const remote = repos[0]?.remote;

	if (!env || !workspaceDriver) {
		return (
			<div
				className={cn(
					"flex w-72 items-center justify-center rounded-[14px] border border-fr-border bg-fr-surface px-4 py-6 text-fr-sm text-fr-text-3 shadow-[0_2px_12px_rgba(0,0,0,0.22)]",
					className,
				)}
			>
				No workspace connected.
			</div>
		);
	}

	return (
		<div
			className={cn(
				"relative flex max-h-full w-72 flex-col overflow-y-auto rounded-[14px] border border-fr-border bg-fr-surface p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.22)]",
				className,
			)}
			data-slot="environment-panel"
		>
			{/* ── Typographic header: the branch is a CONTROL (opens the picker) ── */}
			<div className="px-2 pt-1.5 pb-2">
				<div className="flex items-center gap-2">
					<span className="flex size-4 shrink-0 items-center justify-center">
						<Icon name="git-branch" size={14} strokeWidth={1.7} className="text-fr-text-3" aria-hidden="true" />
					</span>
					<button
						type="button"
						onClick={() => setPickerOpen(value => !value)}
						aria-expanded={pickerOpen}
						aria-haspopup="listbox"
						className="-mx-1 flex min-w-0 flex-1 items-center gap-1 rounded-[6px] px-1 py-0.5 text-left transition-colors hover:bg-fr-surface-2"
						title="Switch branch"
					>
						<BranchName
							name={branch?.current ?? "(detached)"}
							className="min-w-0 flex-1 text-fr-sm font-semibold text-fr-text"
						/>
						<Icon
							name="caretD"
							size={10}
							strokeWidth={1.8}
							className="shrink-0 text-fr-text-3"
							aria-hidden="true"
						/>
					</button>
					{branch && branch.ahead > 0 && (
						<span className="shrink-0 text-fr-xs leading-none text-fr-text-3">{branch.ahead} ahead</span>
					)}
					{branch && branch.behind > 0 && (
						<span className="shrink-0 text-fr-xs leading-none text-fr-text-3">{branch.behind} behind</span>
					)}
					<button
						type="button"
						onClick={refresh}
						className="rounded p-1 text-fr-text-3 transition-colors hover:bg-fr-surface-2 hover:text-fr-text"
						aria-label="Refresh environment"
					>
						<Icon name="refresh" size={11} strokeWidth={1.6} aria-hidden="true" />
					</button>
				</div>
				<div className="fr-overflow pl-6 text-fr-xs text-fr-text-3" title={env.path}>
					{env.path}
				</div>
			</div>
			{pickerOpen && (
				<BranchPicker
					branches={branches ?? []}
					current={branch?.current ?? null}
					busy={busy !== null}
					dirtyFiles={changedFiles}
					onPick={checkout}
					onCreate={createBranch}
				/>
			)}
			<Hairline />

			{notice && (
				<div
					className={cn(
						"mx-1 mb-1 whitespace-pre-wrap rounded-[7px] border border-fr-border px-2 py-1.5 text-fr-2xs",
						notice.tone === "warn" ? "text-fr-del" : "text-fr-text-2",
					)}
					data-slot="environment-notice"
				>
					{notice.text}
				</div>
			)}

			{/* ── This session: durable journal attribution. It stays above the
			     checkout-wide Changes section so a shared checkout is never read as
			     exclusively owned by this session. ── */}
			{sessionScm?.available && (
				<SectionRow
					icon="git-branch"
					label="This session"
					trailing={sessionVerdict && <Chip tone={sessionVerdict.tone}>{sessionVerdict.label}</Chip>}
					open={openSection === "session-scm"}
					onToggle={() => setOpenSection(value => (value === "session-scm" ? null : "session-scm"))}
				>
					{sessionScm.touchedPaths.length === 0 && sessionScm.committedCount === 0 ? (
						<p className="px-4 pt-0.5 pb-1 pl-10 text-fr-2xs leading-4 text-fr-text-3">
							No files touched by this session yet.
						</p>
					) : (
						<>
							<p className="px-4 pb-1.5 pl-10 text-fr-2xs leading-4 text-fr-text-3">
								{sessionScm.touchedPaths.length} file{sessionScm.touchedPaths.length === 1 ? "" : "s"} touched
								by this session
							</p>
							<PipelineStage
								tone={
									sessionUncommittedPaths === null
										? "idle"
										: sessionUncommittedPaths.length > 0
											? "warn"
											: "add"
								}
								title="Uncommitted"
								meta={
									sessionUncommittedPaths === null
										? "unknown"
										: sessionUncommittedPaths.length > 0
											? `${sessionUncommittedPaths.length} file${sessionUncommittedPaths.length === 1 ? "" : "s"}`
											: "none"
								}
							>
								{(sessionUncommittedPaths ?? sessionScm.touchedPaths).slice(0, 6).map(path => (
									<div
										key={path}
										className="fr-overflow py-px text-fr-2xs leading-4 text-fr-text-2"
										title={path}
									>
										{path}
									</div>
								))}
							</PipelineStage>
							<PipelineStage
								tone={sessionScm.committedCount === 0 ? "idle" : sessionScm.unpushedCount > 0 ? "warn" : "add"}
								title="Committed"
								meta={
									sessionScm.committedCount === 0
										? "none yet"
										: `${sessionScm.committedCount} commit${sessionScm.committedCount === 1 ? "" : "s"}`
								}
							>
								{sessionScm.commits.slice(0, 4).map(commit => (
									<div key={commit.sha} className="flex items-center gap-2 py-px text-fr-2xs leading-4">
										<code className="shrink-0 font-secondary text-fr-text-3">{commit.sha.slice(0, 7)}</code>
										<span
											className="fr-overflow min-w-0 flex-1 text-fr-text-2"
											title={commit.subject ?? "commit"}
										>
											{commit.subject ?? "commit"}
										</span>
										{commit.pushed ? (
											<Icon
												name="check"
												size={10}
												strokeWidth={2}
												className="shrink-0 text-fr-add"
												aria-label="Pushed"
											/>
										) : (
											<span className="shrink-0 text-fr-warn">unpushed</span>
										)}
									</div>
								))}
							</PipelineStage>
							<PipelineStage
								tone={
									sessionScm.committedCount > 0 && sessionScm.unpushedCount === 0
										? "add"
										: sessionScm.committedCount > 0
											? "warn"
											: "idle"
								}
								title="Pushed"
								meta={
									sessionScm.committedCount === 0
										? "—"
										: `${sessionScm.pushedCount} of ${sessionScm.committedCount} on origin`
								}
								last
							/>
						</>
					)}
					<p className="px-4 pt-1 pl-10 text-fr-2xs leading-4 text-fr-text-3">
						{SESSION_ATTRIBUTION_NOTE[sessionScm.confidence]}
					</p>
					{sessionScm.finished && (
						<div className="px-4 pt-0.5 pb-0.5 pl-10 text-fr-2xs text-fr-text-3">Session finished</div>
					)}
				</SectionRow>
			)}

			{/* ── Changes: expandable per-file breakdown; the Code dock stays the
			     full diff/staging surface (reachable from the closing action row). ── */}
			{snapshot?.available ? (
				<SectionRow
					icon="diff"
					label="Changes"
					trailing={
						changedFiles === 0 ? (
							<span>clean</span>
						) : (
							<>
								<Chip>
									{changedFiles} file{changedFiles === 1 ? "" : "s"}
								</Chip>
								{totals && (totals.additions > 0 || totals.deletions > 0) && (
									<span className="flex items-center gap-1 tabular-nums">
										<span className="text-fr-add">+{totals.additions}</span>
										<span className="text-fr-del">−{totals.deletions}</span>
									</span>
								)}
							</>
						)
					}
					open={openSection === "changes"}
					onToggle={() => setOpenSection(value => (value === "changes" ? null : "changes"))}
				>
					{(() => {
						const shown = changeEntries.slice(0, 12);
						const nameCounts = new Map<string, number>();
						for (const entry of shown) {
							const name = entry.path.split("/").pop() ?? entry.path;
							nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
						}
						return shown.map(entry => {
							const parts = entry.path.split("/");
							const name = parts.pop() ?? entry.path;
							// A colliding basename shows its parent dir for disambiguation.
							const display =
								(nameCounts.get(name) ?? 0) > 1 && parts.length > 0 ? `${parts.pop()}/${name}` : name;
							return (
								<div
									key={entry.path}
									className="flex items-center gap-2 py-0.5 pr-4 pl-10 text-fr-xs"
									title={entry.path}
								>
									<span
										className={cn(
											"min-w-0 flex-1 fr-overflow",
											entry.conflicted ? "text-fr-del" : "text-fr-text-2",
										)}
									>
										{display}
									</span>
									<span className="shrink-0 text-fr-2xs tabular-nums">
										<span className="text-fr-add">+{entry.additions}</span>{" "}
										<span className="text-fr-del">−{entry.deletions}</span>
									</span>
								</div>
							);
						});
					})()}
					{changeEntries.length > 12 && (
						<div className="py-0.5 pr-4 pl-10 text-fr-2xs text-fr-text-3">
							…and {changeEntries.length - 12} more
						</div>
					)}
					{onOpenChanges && (
						<ActionRow icon="code" label="Open in Code dock" hint="full diff" onClick={onOpenChanges} />
					)}
				</SectionRow>
			) : (
				<div className={cn(ROW_CLASS, "hover:bg-transparent")}>
					<span className="flex size-4 shrink-0 items-center justify-center">
						<Icon name="diff" size={14} strokeWidth={1.6} className="text-fr-text-3" aria-hidden="true" />
					</span>
					<span className="min-w-0 flex-1 fr-overflow font-medium text-fr-text-2">Changes</span>
					<span className="shrink-0 text-fr-xs text-fr-text-3">not a git repository</span>
				</div>
			)}

			{/* ── Where the session runs — the structured home for lifecycle actions
			     (Codex's "Local ⌄ / Continue in" pattern): Local expands to
			     Move-to-worktree; a Worktree expands to Sync + the Finish landings. ── */}
			<SectionRow
				icon={isWorktree ? "git-branch" : "folder"}
				label={isWorktree ? "Worktree" : "Local"}
				trailing={
					busy === "sync" ? (
						<span>Syncing…</span>
					) : busy?.startsWith("finish") ? (
						<span>Finishing…</span>
					) : busy === "relocate" ? (
						<span>Moving…</span>
					) : undefined
				}
				open={openSection === "where"}
				onToggle={() => setOpenSection(value => (value === "where" ? null : "where"))}
			>
				{isWorktree ? (
					<>
						{workspaceDriver.syncSessionWorktree && (
							<ActionRow
								icon="refresh"
								label="Sync from main"
								hint="merge main in"
								disabled={busy !== null}
								onClick={sync}
							/>
						)}
						{workspaceDriver.finishSessionWorktree && sessionRef && (
							<>
								<ActionRow
									icon="check"
									label="Finish · Merge into main"
									hint="land + remove"
									disabled={busy !== null}
									onClick={() => finish("merge")}
								/>
								<ActionRow
									icon="arrowUpRight"
									label="Finish · Push for a PR"
									disabled={busy !== null}
									onClick={() => finish("pr")}
								/>
								<ActionRow
									icon="logout"
									label="Finish · Leave branch"
									hint="keep branch"
									disabled={busy !== null}
									onClick={() => finish("leave")}
								/>
							</>
						)}
					</>
				) : (
					workspaceDriver.relocateSessionToWorktree &&
					sessionRef && (
						<ActionRow
							icon="git-branch"
							label="Move to worktree"
							hint="isolate this session"
							disabled={busy !== null}
							onClick={moveToWorktree}
						/>
					)
				)}
			</SectionRow>

			{/* ── Repos: quiet when healthy, auto-opened + escalated on pin drift ── */}
			{repos.length > 0 && (
				<SectionRow
					icon="layers"
					label="Repos"
					trailing={
						troubled.length === 0 ? (
							<span>{repos.length} in sync</span>
						) : (
							<Chip tone={hasDrift ? "del" : "warn"}>{hasDrift ? "pin drift" : "bump pending"}</Chip>
						)
					}
					open={reposExpanded}
					onToggle={() => setReposOpen(value => !value)}
				>
					{repos.map(repo => {
						const pin = repo.pin;
						const danger = pin?.state === "drift";
						const warn = pin?.state === "ahead";
						return (
							<div
								key={repo.path || repo.name}
								className={cn(
									"py-0.5 pr-4 pl-10",
									danger && "mr-3 ml-8 rounded-[8px] border border-fr-del/30 bg-fr-del/5 px-[7px] py-1",
								)}
							>
								<div className="flex h-5 items-center gap-2">
									<span
										className={cn(
											"min-w-0 shrink-0 fr-overflow text-fr-xs",
											pin ? "text-fr-text-2" : "font-medium text-fr-text",
										)}
									>
										{repo.name}
									</span>
									<BranchName
										name={repo.branch ?? "(detached)"}
										className="min-w-0 flex-1 text-fr-2xs text-fr-text-3"
									/>
									{/* Right-aligned status, git conventions: ●N modified, ↑↓ sync, pin chip when troubled. */}
									{pin?.state === "ahead" && <Chip tone="warn">pin +{pin.aheadBy ?? "?"}</Chip>}
									{pin?.state === "drift" && <Chip tone="del">pin drift</Chip>}
									{pin?.state === "missing" && <Chip>not initialized</Chip>}
									{repo.dirty > 0 && (
										<span
											className="flex shrink-0 items-center gap-1 text-fr-2xs text-fr-text-2 tabular-nums"
											title={`${repo.dirty} uncommitted file${repo.dirty === 1 ? "" : "s"}`}
										>
											<span className="size-1.5 rounded-full bg-fr-warn/80" aria-hidden="true" />
											{repo.dirty}
										</span>
									)}
									{repo.ahead > 0 && (
										<span
											className="shrink-0 text-fr-2xs text-fr-text-3 tabular-nums"
											title={`${repo.ahead} ahead of upstream`}
										>
											↑{repo.ahead}
										</span>
									)}
									{repo.behind > 0 && (
										<span
											className="shrink-0 text-fr-2xs text-fr-text-3 tabular-nums"
											title={`${repo.behind} behind upstream`}
										>
											↓{repo.behind}
										</span>
									)}
								</div>
								{(danger || warn) && pin && (
									<div className="pt-0.5 pb-0.5 text-fr-2xs text-fr-text-3">
										pinned <code className="text-fr-text-2">{pin.recorded}</code> · checkout{" "}
										<code className={danger ? "text-fr-del" : "text-fr-warn"}>{repo.head ?? "?"}</code>
										{danger && <span className="text-fr-del">: does not descend, rebase onto the pin</span>}
									</div>
								)}
							</div>
						);
					})}
				</SectionRow>
			)}

			{/* ── Worktrees: every checkout of the repo, two-line rows ── */}
			{worktrees && worktrees.length > 0 && (
				<SectionRow
					icon="git-branch"
					label="Worktrees"
					trailing={<span>{worktrees.length}</span>}
					open={openSection === "worktrees"}
					onToggle={() => setOpenSection(value => (value === "worktrees" ? null : "worktrees"))}
				>
					{worktrees.map(tree => {
						const here = tree.path.replace(/\\/g, "/").toLowerCase() === normalizedEnvPath;
						const kind = tree.main ? "main" : tree.session ? "session" : "foreign";
						return (
							<div key={tree.path} className="py-1 pr-4 pl-10 text-fr-xs">
								<div className="flex items-center gap-2">
									<BranchName
										name={tree.branch || "(detached)"}
										className={cn("min-w-0 flex-1", here ? "text-fr-text" : "text-fr-text-2")}
									/>
									<span className={cn("shrink-0", here ? "text-fr-accent" : "text-fr-text-3")}>
										{here ? "here" : kind}
									</span>
								</div>
								<div className="fr-overflow text-fr-2xs leading-4 text-fr-text-3" title={tree.path}>
									{tree.path}
								</div>
							</div>
						);
					})}
				</SectionRow>
			)}

			{/* ── Activity: live plan/tasks + background work, pulsing while running.
			     Click lands in the Tasks dock (the full plan/subagent surface). ── */}
			{(() => {
				const running = tasks?.find(task => task.status === "in_progress" || task.status === "running");
				const pending = tasks?.filter(task => task.status === "pending").length ?? 0;
				if (!running && !hasBackgroundWork) return null;
				const label = running ? running.name : "Background work running";
				return (
					<button
						type="button"
						className={cn(ROW_CLASS, !onOpenTasks && "pointer-events-none")}
						onClick={onOpenTasks}
						title={
							running
								? "Plan task in progress — open Tasks dock"
								: "Jobs/subagents still running — open Tasks dock"
						}
					>
						<span className="flex size-4 shrink-0 items-center justify-center">
							<span className="relative flex size-2" aria-hidden="true">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fr-accent opacity-60" />
								<span className="relative inline-flex size-2 rounded-full bg-fr-accent" />
							</span>
						</span>
						<span className="min-w-0 flex-1 fr-overflow font-medium text-fr-text-2">{label}</span>
						{pending > 0 && <Chip>{pending} queued</Chip>}
						{onOpenTasks && (
							<Icon
								name="caretR"
								size={11}
								strokeWidth={1.8}
								className="shrink-0 text-fr-text-3"
								aria-hidden="true"
							/>
						)}
					</button>
				);
			})()}

			{/* ── Recap: the agent's per-run "where the session stands" (smol tier),
			     anchored as the card's bottom block (synara's Recap placement). ── */}
			{recap?.text && (
				<>
					<Hairline />
					<div className="px-2 pt-0.5 pb-1">
						<div className="flex h-6 items-center gap-2">
							<span className="flex size-4 shrink-0 items-center justify-center">
								<Icon name="spark" size={13} strokeWidth={1.7} className="text-fr-text-3" aria-hidden="true" />
							</span>
							<span className="text-fr-xs font-medium text-fr-text-2">Recap</span>
						</div>
						<p className="pl-6 text-fr-xs leading-5 text-fr-text-3" title={recap.generatedAt}>
							{recap.text}
						</p>
					</div>
				</>
			)}

			<Hairline />

			{/* ── Footer: quiet meta only (remote · editor · push) — lifecycle
			     actions live in the structured Local/Worktree row above. ── */}
			<div className="relative flex items-center gap-1 px-1 pt-0.5 pb-0.5">
				{remote && (
					<a
						href={remote}
						target="_blank"
						rel="noreferrer"
						className="rounded-[8px] p-1.5 text-fr-text-3 transition-colors hover:bg-fr-surface-2 hover:text-fr-text-2"
						title={`Open ${remote}`}
						aria-label="Open repository remote"
					>
						<Icon name="markGithub" size={12} filled viewBox="0 0 16 16" aria-hidden="true" />
					</a>
				)}
				<a
					href={`vscode://file/${encodeURI(env.path.replace(/\\/g, "/"))}`}
					className="rounded-[8px] p-1.5 text-fr-text-3 transition-colors hover:bg-fr-surface-2 hover:text-fr-text-2"
					title="Open in VS Code"
					aria-label="Open in VS Code"
				>
					<Icon name="cursor" size={12} strokeWidth={1.6} aria-hidden="true" />
				</a>
				<span className="flex-1" />
				{workspaceDriver.scmPush && snapshot?.available && (
					<button type="button" className={GHOST_BUTTON_CLASS} onClick={push} disabled={busy !== null}>
						{busy === "push" ? "Pushing…" : "Push"}
					</button>
				)}
			</div>
		</div>
	);
}
