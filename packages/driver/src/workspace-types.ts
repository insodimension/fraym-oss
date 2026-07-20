import type { WorkspaceRef } from "./session-driver";

export type WorkspaceFileStatus = "modified" | "added" | "deleted" | "renamed" | "untracked";
export type WorkspaceFileContentKind = "auto" | "markdown" | "code";

export interface WorkspaceFileStatusEntry {
	readonly path: string;
	readonly status: WorkspaceFileStatus;
}

export interface WorkspaceFileTreeOptions {
	readonly maxFiles?: number;
}

export interface WorkspaceFileTreeSnapshot {
	readonly workspace: WorkspaceRef;
	readonly paths: readonly string[];
	readonly gitStatus: readonly WorkspaceFileStatusEntry[];
	readonly generatedAt: string;
	readonly truncated?: boolean;
}

export interface WorkspaceFileReadOptions {
	readonly maxBytes?: number;
}

export interface WorkspaceFileContent {
	readonly workspace: WorkspaceRef;
	readonly path: string;
	readonly content: string;
	readonly kind?: WorkspaceFileContentKind;
	readonly language?: string;
	readonly sizeBytes?: number;
	readonly truncated?: boolean;
	/** True when `path` resolves to a directory — the client reveals/opens it in the tree
	 *  instead of rendering code (a directory is not a file-read error). */
	readonly isDirectory?: boolean;
	/** True when the requested path does not exist / is unreadable — the viewer shows a
	 *  clean "not found" state instead of falling back to another file. */
	readonly notFound?: boolean;
	/** When a bare/partial path (e.g. `SKILL.md`) matched MANY workspace files, the list
	 *  of matching paths — nothing was read (`notFound` is still true), but the viewer
	 *  shows an honest "N files match — pick one" instead of a misleading "not found". */
	readonly ambiguousMatches?: readonly string[];
	/** True when `path` is absolute and resolved OUTSIDE the workspace root; the viewer
	 *  loads it but the tree does not try to reveal it (`path` is absolute here). */
	readonly outsideWorkspace?: boolean;
	readonly binary?: boolean;
}

export interface WorkspaceSeedFile {
	readonly path: string;
	readonly content: string;
	/** Also backfill into an EXISTING vault when missing (never overwrites). Default: fresh-vault-only. */
	readonly writeIfAbsent?: boolean;
	/**
	 * Do not seed this file when any listed workspace-relative compatibility path
	 * already exists. Prevents a new primary path from shadowing an existing
	 * legacy file.
	 */
	readonly skipIfExists?: readonly string[];
}

export interface EnsureManagedWorkspaceInput {
	readonly workspaceId: string;
	readonly displayName?: string;
	/** Explicit folder; when omitted the engine resolves the host's default vault path. */
	readonly path?: string;
	/** Files written only when the target directory is newly created / still empty. */
	readonly seed?: readonly WorkspaceSeedFile[];
}

export type WorktreeMergeMode = "merge" | "pr" | "leave";
export type WorktreePromoteMode = "copy" | "move";

export interface WorktreeMergeResult {
	readonly mode: WorktreeMergeMode;
	readonly branch: string;
	readonly merged: boolean;
	readonly conflict?: boolean;
	readonly message?: string;
}

/** Outcome of finishing a worktree session (land + move home + remove). A merge
 *  conflict is a legitimate outcome: `ok: false, conflict: true`, worktree kept. */
export interface WorktreeFinishResult {
	readonly ok: boolean;
	readonly text: string;
	readonly branch?: string;
	/** The main checkout the session moved back to (set on success). */
	readonly mainRoot?: string;
	readonly merged?: boolean;
	readonly conflict?: boolean;
	/** False when checkout removal was deferred to the engine's prune sweep. */
	readonly removed?: boolean;
}

/** Outcome of syncing a worktree (pulling the main checkout's branch into it).
 *  A conflict is a legitimate outcome: `conflict: true`, merge aborted, worktree
 *  intact. `merged: false` without conflict = already up to date. */
export interface WorktreeSyncResult {
	readonly branch: string;
	readonly baseBranch?: string;
	readonly merged: boolean;
	readonly conflict?: boolean;
	readonly message?: string;
}

/** One checkout of a repo: the main checkout, one of the engine's session
 *  worktrees, or a FOREIGN worktree made by hand (listable, never auto-pruned). */
export interface RepoWorktree {
	readonly path: string;
	/** Checked-out branch; empty for a detached worktree. */
	readonly branch: string;
	readonly session: boolean;
	readonly main: boolean;
}

export interface WorktreePruneResult {
	readonly pruned: readonly string[];
}

// ── Source Control (workspace git) ──────────────────────────────────────────
export type WorkspaceScmChangeKind = "modified" | "added" | "deleted" | "renamed" | "untracked" | "conflicted";
export type WorkspaceScmArea = "staged" | "unstaged";

export interface WorkspaceScmChangeEntry {
	readonly path: string;
	readonly kind: WorkspaceScmChangeKind;
	readonly additions: number;
	readonly deletions: number;
	readonly oldPath?: string;
}

export interface WorkspaceScmBranchInfo {
	readonly current: string | null;
	readonly upstream: string | null;
	readonly ahead: number;
	readonly behind: number;
}

export interface WorkspaceScmSnapshot {
	readonly workspace: WorkspaceRef;
	/** git present + the workspace is a repo. */
	readonly available: boolean;
	readonly branch: WorkspaceScmBranchInfo;
	readonly staged: readonly WorkspaceScmChangeEntry[];
	readonly unstaged: readonly WorkspaceScmChangeEntry[];
	readonly conflicts: readonly WorkspaceScmChangeEntry[];
	readonly totals: { readonly files: number; readonly additions: number; readonly deletions: number };
	readonly generatedAt: string;
}

export interface WorkspaceScmBranch {
	readonly name: string;
	readonly current: boolean;
	readonly upstream?: string;
}

export interface WorkspaceScmCommitResult {
	readonly committed: boolean;
	readonly sha: string | null;
	readonly reason?: string;
}

export interface WorkspaceScmActionResult {
	readonly ok: boolean;
	readonly message?: string;
}

export interface WorkspaceScmPullRequestResult {
	readonly ok: boolean;
	readonly url?: string;
	readonly message?: string;
}

/** Pin status of a submodule checkout vs the gitlink recorded in the parent.
 *  `sync` = equal · `ahead` = checkout descends (pointer bump pending) ·
 *  `drift` = NOT a descendant (parent commit would drop sibling commits) ·
 *  `missing` = submodule not initialized. */
export type WorkspaceRepoPinState = "sync" | "ahead" | "drift" | "missing";

export interface WorkspaceRepoTreeEntry {
	/** Directory name (superproject = basename of the repo root). */
	readonly name: string;
	/** Normalized https remote URL of `origin` (superproject only). */
	readonly remote?: string;
	readonly path: string;
	readonly branch: string | null;
	readonly head: string | null;
	readonly ahead: number;
	readonly behind: number;
	/** Changed-file count. */
	readonly dirty: number;
	/** Submodule-only pin facts; absent on the superproject. */
	readonly pin?: {
		readonly recorded: string;
		readonly state: WorkspaceRepoPinState;
		readonly aheadBy?: number;
	};
}

/** Superproject + every submodule, one entry each ([0] = superproject). */
export interface WorkspaceRepoTree {
	readonly workspace: WorkspaceRef;
	readonly available: boolean;
	readonly repos: readonly WorkspaceRepoTreeEntry[];
	readonly generatedAt: string;
}

// ── Turn Checkpoints (per-session working-tree snapshots; hidden git refs) ──
export interface WorkspaceScmCheckpoint {
	readonly ref: string;
	readonly seq: number;
	readonly label: string;
	readonly createdAt: string;
	readonly totals: { readonly files: number; readonly additions: number; readonly deletions: number };
}

export interface WorkspaceScmCheckpointResult {
	readonly captured: boolean;
	readonly checkpoint: WorkspaceScmCheckpoint | null;
	readonly reason?: string;
}

export interface WorkspaceScmCheckpointRestoreResult {
	readonly ok: boolean;
	readonly safety: WorkspaceScmCheckpoint | null;
	readonly restoredFiles: number;
	readonly message?: string;
}

export interface WorkspaceFileBytes {
	readonly workspace: WorkspaceRef;
	readonly path: string;
	/** base64-encoded contents (empty when notFound). */
	readonly base64: string;
	readonly mime?: string;
	readonly sizeBytes: number;
	readonly notFound?: boolean;
	readonly truncated?: boolean;
}

export interface WorkspaceDriver {
	listWorkspaces(): Promise<readonly WorkspaceRef[]>;
	getCurrentWorkspace?(): Promise<WorkspaceRef | null>;
	switchBranch?(workspace: WorkspaceRef, branch: string): Promise<WorkspaceRef>;
	getFileTree?(workspace: WorkspaceRef, options?: WorkspaceFileTreeOptions): Promise<WorkspaceFileTreeSnapshot>;
	readFile?(workspace: WorkspaceRef, path: string, options?: WorkspaceFileReadOptions): Promise<WorkspaceFileContent>;
	/** Register a new project by absolute folder path; the registry makes it active. */
	addWorkspace?(path: string): Promise<WorkspaceRef>;
	/** Mark an already-registered project active in the shared registry. */
	setActiveWorkspace?(workspace: WorkspaceRef): Promise<WorkspaceRef>;
	/** Forget a project; resolves to the remaining registered workspaces. */
	removeWorkspace?(workspace: WorkspaceRef): Promise<readonly WorkspaceRef[]>;
	ensureManagedWorkspace?(input: EnsureManagedWorkspaceInput): Promise<WorkspaceRef>;
	/** Wipe a managed workspace folder and re-provision it from the seed
	 *  (engine-guarded: vault-marker folders only). Dev/test reset door. */
	resetManagedWorkspace?(input: EnsureManagedWorkspaceInput): Promise<WorkspaceRef>;
	// ── per-session git worktrees (worktree epic) ──────────────────────────
	/** Create a dedicated git worktree on its own branch for a NEW session; the
	 *  returned ref's path is the worktree checkout (becomes the session cwd). */
	createSessionWorktree?(workspace: WorkspaceRef): Promise<WorkspaceRef>;
	/** Promote a LIVE session's checkout into a worktree, carrying uncommitted
	 *  work; returns the worktree ref to re-point the session at. */
	promoteSessionWorktree?(workspace: WorkspaceRef, mode?: WorktreePromoteMode): Promise<WorkspaceRef>;
	/** Move a session into its own worktree: create it, carry uncommitted work,
	 *  and repoint the session at it. The engine relocates the LIVE session in
	 *  place when its sidecar owns it (SessionManager.moveTo), else the closed
	 *  session file — callers need no close/reopen dance either way. */
	relocateSessionToWorktree?(workspace: WorkspaceRef, sessionId: string, mode?: WorktreePromoteMode): Promise<void>;
	/** Land a session worktree's work: merge to main / push for a PR / leave. */
	mergeSessionWorktree?(workspace: WorkspaceRef, mode: WorktreeMergeMode): Promise<WorktreeMergeResult>;
	/** Finish a worktree session: land its work (merge|pr|leave), move the session
	 *  back to the main checkout, remove the worktree. `workspace` is the session's
	 *  worktree workspace (path = the worktree checkout). A merge conflict returns
	 *  `{ ok: false, conflict: true }` with the worktree kept intact. */
	finishSessionWorktree?(
		workspace: WorkspaceRef,
		sessionId: string,
		merge?: WorktreeMergeMode,
	): Promise<WorktreeFinishResult>;
	/** Pull the main checkout's branch into a worktree session's branch (mid-life
	 *  drift relief). `workspace` is the session's worktree workspace. A conflict
	 *  returns `{ conflict: true }` with the merge aborted, worktree intact. */
	syncSessionWorktree?(workspace: WorkspaceRef): Promise<WorktreeSyncResult>;
	/** Every checkout of the repo owning `workspace.path` — main, session, foreign. */
	listAllWorktrees?(workspace: WorkspaceRef): Promise<readonly RepoWorktree[]>;
	/** Remove a session worktree (e.g. on session delete). */
	removeSessionWorktree?(workspace: WorkspaceRef, options?: { readonly deleteBranch?: boolean }): Promise<void>;
	/** Sweep stale session worktrees; `liveWorktreePaths` are never pruned. */
	pruneSessionWorktrees?(liveWorktreePaths?: readonly string[]): Promise<WorktreePruneResult>;
	// ── source control (full git) + binary file reads ─────────────────────
	/** One-round-trip snapshot: branch, staged/unstaged/conflict entries, totals. */
	scmSnapshot?(workspace: WorkspaceRef): Promise<WorkspaceScmSnapshot>;
	/** Superproject + submodules: branch, ahead/behind, dirty, pin ancestry. */
	scmRepoTree?(workspace: WorkspaceRef): Promise<WorkspaceRepoTree>;
	/** Unified diff for one path on the staged or unstaged side of the index. */
	scmDiffFile?(workspace: WorkspaceRef, path: string, area: WorkspaceScmArea): Promise<string>;
	scmStage?(workspace: WorkspaceRef, paths: readonly string[]): Promise<WorkspaceScmActionResult>;
	scmUnstage?(workspace: WorkspaceRef, paths: readonly string[]): Promise<WorkspaceScmActionResult>;
	scmDiscard?(workspace: WorkspaceRef, paths: readonly string[]): Promise<WorkspaceScmActionResult>;
	scmCommit?(workspace: WorkspaceRef, message: string): Promise<WorkspaceScmCommitResult>;
	scmBranchList?(workspace: WorkspaceRef): Promise<readonly WorkspaceScmBranch[]>;
	scmCheckout?(workspace: WorkspaceRef, branch: string): Promise<WorkspaceScmActionResult>;
	scmCreateBranch?(workspace: WorkspaceRef, name: string): Promise<WorkspaceScmActionResult>;
	scmPull?(workspace: WorkspaceRef): Promise<WorkspaceScmActionResult>;
	scmPush?(workspace: WorkspaceRef): Promise<WorkspaceScmActionResult>;
	scmCreatePr?(
		workspace: WorkspaceRef,
		options?: { readonly title?: string; readonly body?: string },
	): Promise<WorkspaceScmPullRequestResult>;
	// ── turn checkpoints (working-tree time-travel; hidden refs) ───────────
	/** Snapshot the working tree to a hidden ref for this session; skipped when
	 *  nothing changed since the last checkpoint. */
	scmCheckpointCapture?(
		workspace: WorkspaceRef,
		sessionId: string,
		label: string,
	): Promise<WorkspaceScmCheckpointResult>;
	/** Every checkpoint for the session, newest-first. */
	scmCheckpointList?(workspace: WorkspaceRef, sessionId: string): Promise<readonly WorkspaceScmCheckpoint[]>;
	/** Files changed by the turn that produced a checkpoint (vs the previous one). */
	scmCheckpointDiff?(workspace: WorkspaceRef, ref: string): Promise<readonly WorkspaceScmChangeEntry[]>;
	/** Rewrite the working tree to a checkpoint (auto-captures a safety snapshot first). */
	scmCheckpointRestore?(
		workspace: WorkspaceRef,
		sessionId: string,
		ref: string,
	): Promise<WorkspaceScmCheckpointRestoreResult>;
	/** Raw file bytes (base64) for image / PDF / binary previews. */
	readFileBytes?(workspace: WorkspaceRef, path: string): Promise<WorkspaceFileBytes>;
}
