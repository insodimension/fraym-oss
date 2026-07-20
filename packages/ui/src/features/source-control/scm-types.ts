// Source-control (git) surface types — the UI-facing shape of a workspace's
// git state. This mirrors the engine's future `WorkspaceScmSnapshot` (a superset
// of the existing `WorkspaceFileStatusEntry`), so the same component renders in
// the kitchen-sink (mock data) and the real dock (driver data) unchanged.

import type { DiffViewerFile } from "../diff";

export type ScmChangeKind = "modified" | "added" | "deleted" | "renamed" | "untracked" | "conflicted";

/** One changed path in the working tree or the index. */
export interface ScmChangeEntry {
	readonly path: string;
	readonly kind: ScmChangeKind;
	readonly additions: number;
	readonly deletions: number;
	/** Prior path for a rename (`kind === "renamed"`). */
	readonly oldPath?: string;
}

export interface ScmBranchInfo {
	readonly current: string | null;
	readonly upstream?: string | null;
	readonly ahead: number;
	readonly behind: number;
}

/** A branch in the workspace repo (for the branch picker). */
export interface ScmBranch {
	readonly name: string;
	readonly current: boolean;
	readonly upstream?: string;
}

/** A transient status line the SCM panel shows — a mutation error or a PR result. */
export interface ScmNotice {
	readonly tone: "error" | "success";
	readonly text: string;
	/** Optional link (e.g. a created PR's URL). */
	readonly href?: string;
}

export interface ScmTotals {
	readonly files: number;
	readonly additions: number;
	readonly deletions: number;
}

/** One working-tree snapshot in the per-session checkpoint timeline (turn
 *  time-travel). `ref` is the opaque handle passed to restore. */
export interface ScmCheckpoint {
	readonly ref: string;
	readonly seq: number;
	readonly label: string;
	readonly createdAt: string;
	readonly totals: ScmTotals;
}

/** The whole source-control picture for one workspace — one round-trip. */
export interface ScmSnapshot {
	readonly branch: ScmBranchInfo;
	/** Changes in the index (`git add`-ed), ready to commit. */
	readonly staged: readonly ScmChangeEntry[];
	/** Working-tree changes not yet staged (includes untracked). */
	readonly unstaged: readonly ScmChangeEntry[];
	/** Unmerged paths while a merge/rebase is in progress. */
	readonly conflicts?: readonly ScmChangeEntry[];
	readonly totals: ScmTotals;
}

/** Which side of the index a change row lives on. */
export type ScmArea = "staged" | "unstaged";

/** A file's diff, in whichever form the data source has it. Passed straight
 *  through to `DiffViewer` — supply exactly one of these. */
export interface ScmFileDiff {
	readonly files?: readonly DiffViewerFile[];
	readonly patch?: string;
	readonly oldText?: string;
	readonly newText?: string;
}
