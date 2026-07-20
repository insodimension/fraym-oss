"use client";

// ConnectedIde — binds the presentational IdeWorkspace to a live WorkspaceDriver.
// Folder: getFileTree → tree; readFile/readFileBytes → preview (on open). Git:
// scmSnapshot → changes; scmDiffFile → diff (on open); scm* mutations refresh the
// snapshot. Fetches are lazy + cached (open callbacks drive them) so we never
// pull content the user hasn't asked for.

import type { WorkspaceDriver, WorkspaceRef, WorkspaceScmArea } from "@fraym/driver";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FileTreeGitStatusEntry } from "../file-tree";
import { resolveFileKind } from "../file-view";
import type { ScmBranch, ScmChangeEntry, ScmCheckpoint, ScmFileDiff, ScmNotice, ScmSnapshot } from "../source-control";
import { type IdeFile, IdeWorkspace, type IdeWorkspaceProps } from "./ide-workspace";

const EMPTY_SCM: ScmSnapshot = {
	branch: { current: null, upstream: null, ahead: 0, behind: 0 },
	staged: [],
	unstaged: [],
	conflicts: [],
	totals: { files: 0, additions: 0, deletions: 0 },
};

export interface ConnectedIdeProps {
	readonly workspace: WorkspaceRef | null | undefined;
	readonly workspaceDriver: WorkspaceDriver | null | undefined;
	readonly defaultSelectedPath?: string;
	/** Bump to re-poll status + tree — e.g. after the agent edits the working tree. */
	readonly revision?: number;
	/** Current session id — scopes the per-session checkpoint timeline. */
	readonly sessionId?: string;
	readonly externalDiff?: IdeWorkspaceProps["externalDiff"];
	readonly className?: string;
}

export function ConnectedIde({
	workspace,
	workspaceDriver,
	defaultSelectedPath,
	externalDiff,
	revision,
	sessionId,
	className,
}: ConnectedIdeProps) {
	const [paths, setPaths] = useState<readonly string[]>([]);
	const [gitStatus, setGitStatus] = useState<readonly FileTreeGitStatusEntry[]>([]);
	const [scm, setScm] = useState<ScmSnapshot>(EMPTY_SCM);
	const [files, setFiles] = useState<Record<string, IdeFile>>({});
	const [diffs, setDiffs] = useState<Record<string, ScmFileDiff>>({});
	const [commitMessage, setCommitMessage] = useState("");
	const [committing, setCommitting] = useState(false);
	const [branches, setBranches] = useState<readonly ScmBranch[]>([]);
	const [notice, setNotice] = useState<ScmNotice | null>(null);
	const [checkpoints, setCheckpoints] = useState<readonly ScmCheckpoint[]>([]);
	const seededDefault = useRef<string | null>(null);

	const refreshTree = useCallback(async () => {
		if (!workspace || !workspaceDriver?.getFileTree) return;
		const tree = await workspaceDriver.getFileTree(workspace);
		setPaths(tree.paths);
		setGitStatus(tree.gitStatus as readonly FileTreeGitStatusEntry[]);
	}, [workspace, workspaceDriver]);

	const refreshScm = useCallback(async () => {
		if (!workspace || !workspaceDriver?.scmSnapshot) {
			setScm(EMPTY_SCM);
			return;
		}
		const snap = await workspaceDriver.scmSnapshot(workspace);
		setScm({
			branch: snap.branch,
			staged: snap.staged as readonly ScmChangeEntry[],
			unstaged: snap.unstaged as readonly ScmChangeEntry[],
			conflicts: snap.conflicts as readonly ScmChangeEntry[],
			totals: snap.totals,
		});
	}, [workspace, workspaceDriver]);

	const refreshBranches = useCallback(async () => {
		if (!workspace || !workspaceDriver?.scmBranchList) {
			setBranches([]);
			return;
		}
		setBranches(await workspaceDriver.scmBranchList(workspace));
	}, [workspace, workspaceDriver]);

	const refreshCheckpoints = useCallback(async () => {
		if (!workspace || !sessionId || !workspaceDriver?.scmCheckpointList) {
			setCheckpoints([]);
			return;
		}
		setCheckpoints(await workspaceDriver.scmCheckpointList(workspace, sessionId));
	}, [workspace, workspaceDriver, sessionId]);

	// Reset caches + reload when the workspace changes.
	useEffect(() => {
		setFiles({});
		setDiffs({});
		setNotice(null);
		seededDefault.current = null;
		void refreshTree();
		void refreshScm();
		void refreshBranches();
		void refreshCheckpoints();
	}, [refreshTree, refreshScm, refreshBranches, refreshCheckpoints]);

	// Host-driven liveness: when `revision` bumps (the agent's turn settled or a poll
	// tick while it works), re-poll status + tree so the panel reflects the agent's
	// edits — without disturbing the current selection, diff caches, or notice.
	useEffect(() => {
		if (!revision) return;
		void refreshScm();
		void refreshTree();
		void refreshCheckpoints();
	}, [revision, refreshScm, refreshTree, refreshCheckpoints]);

	const openFile = useCallback(
		async (path: string) => {
			if (!workspace || !workspaceDriver) return;
			const kind = resolveFileKind(path);
			if ((kind === "image" || kind === "pdf") && workspaceDriver.readFileBytes) {
				const bytes = await workspaceDriver.readFileBytes(workspace, path);
				if (bytes.notFound || !bytes.base64) {
					setFiles(prev => ({ ...prev, [path]: { kind: "binary" } }));
					return;
				}
				const src = `data:${bytes.mime ?? "application/octet-stream"};base64,${bytes.base64}`;
				setFiles(prev => ({ ...prev, [path]: { kind, src } }));
				return;
			}
			if (kind === "binary") {
				setFiles(prev => ({ ...prev, [path]: { kind: "binary" } }));
				return;
			}
			if (!workspaceDriver.readFile) return;
			const content = await workspaceDriver.readFile(workspace, path);
			setFiles(prev => ({ ...prev, [path]: { kind, content: content.content } }));
		},
		[workspace, workspaceDriver],
	);

	// Seed the default file once the tree is available.
	useEffect(() => {
		if (!defaultSelectedPath || seededDefault.current === defaultSelectedPath) return;
		if (!paths.includes(defaultSelectedPath)) return;
		seededDefault.current = defaultSelectedPath;
		void openFile(defaultSelectedPath);
	}, [defaultSelectedPath, paths, openFile]);

	const openChange = useCallback(
		async (entry: ScmChangeEntry, area: "staged" | "unstaged") => {
			if (!workspace || !workspaceDriver) return;
			const kind = resolveFileKind(entry.path);
			// Binary / image / PDF changes have no useful text diff — fetch the file
			// bytes so the right pane previews it (matches IdeWorkspace's media branch).
			if (entry.kind !== "deleted" && (kind === "image" || kind === "pdf" || kind === "binary")) {
				await openFile(entry.path);
				return;
			}
			if (!workspaceDriver.scmDiffFile) return;
			const key = `${area}:${entry.path}`;
			const patch = await workspaceDriver.scmDiffFile(workspace, entry.path, area as WorkspaceScmArea);
			setDiffs(prev => ({ ...prev, [key]: { patch } }));
		},
		[workspace, workspaceDriver, openFile],
	);

	const getDiff = useCallback(
		(entry: ScmChangeEntry, area: "staged" | "unstaged"): ScmFileDiff | undefined => diffs[`${area}:${entry.path}`],
		[diffs],
	);

	// Mutations run against the driver, then refresh the snapshot (+ tree when the
	// working tree changed) and drop stale diff caches.
	const mutate = useCallback(
		async (run: () => Promise<unknown> | undefined, touchesTree = false) => {
			let failure: string | null = null;
			try {
				const result = await run();
				// A git mutation resolves to { ok, message? } — surface a failure.
				if (result && typeof result === "object" && "ok" in result && result.ok === false) {
					failure =
						"message" in result && typeof result.message === "string" && result.message
							? result.message
							: "Git operation failed.";
				}
			} catch (err) {
				failure = err instanceof Error ? err.message : "Git operation failed.";
			}
			setNotice(failure ? { tone: "error", text: failure } : null);
			setDiffs({});
			await refreshScm();
			if (touchesTree) {
				await refreshTree();
				await refreshBranches();
			}
		},
		[refreshScm, refreshTree, refreshBranches],
	);

	const handlers = useMemo(
		() => ({
			onStage: (entry: ScmChangeEntry) =>
				void mutate(() => workspaceDriver?.scmStage?.(workspace as WorkspaceRef, [entry.path])),
			onUnstage: (entry: ScmChangeEntry) =>
				void mutate(() => workspaceDriver?.scmUnstage?.(workspace as WorkspaceRef, [entry.path])),
			onDiscard: (entry: ScmChangeEntry) =>
				void mutate(() => workspaceDriver?.scmDiscard?.(workspace as WorkspaceRef, [entry.path]), true),
			onStageAll: () =>
				void mutate(() =>
					workspaceDriver?.scmStage?.(
						workspace as WorkspaceRef,
						[...scm.unstaged, ...(scm.conflicts ?? [])].map(e => e.path),
					),
				),
			onUnstageAll: () =>
				void mutate(() =>
					workspaceDriver?.scmUnstage?.(
						workspace as WorkspaceRef,
						scm.staged.map(e => e.path),
					),
				),
			onCommit: (message: string) => {
				setCommitting(true);
				void mutate(() => workspaceDriver?.scmCommit?.(workspace as WorkspaceRef, message), true).finally(() => {
					setCommitting(false);
					setCommitMessage("");
				});
			},
			onRefresh: () => {
				void refreshScm();
				void refreshTree();
			},
			onCommitAndPush: () =>
				void mutate(async () => {
					await workspaceDriver?.scmCommit?.(workspace as WorkspaceRef, commitMessage.trim() || "update");
					await workspaceDriver?.scmPush?.(workspace as WorkspaceRef);
				}, true),
			onPull: () => void mutate(() => workspaceDriver?.scmPull?.(workspace as WorkspaceRef), true),
			onPush: () => void mutate(() => workspaceDriver?.scmPush?.(workspace as WorkspaceRef)),
			onCreatePr: () => {
				const createPr = workspaceDriver?.scmCreatePr;
				if (!workspace || !createPr) return;
				const ws = workspace;
				void (async () => {
					try {
						const res = await createPr(ws);
						if (res.ok) {
							setNotice({ tone: "success", text: "Pull request created", href: res.url });
						} else {
							setNotice({
								tone: "error",
								text: res.message || "Could not create PR — is `gh` installed and authenticated?",
							});
						}
					} catch (err) {
						setNotice({ tone: "error", text: err instanceof Error ? err.message : "Could not create PR." });
					}
				})();
			},
			onCreateBranch: (name: string) =>
				void mutate(() => workspaceDriver?.scmCreateBranch?.(workspace as WorkspaceRef, name), true),
			onCheckout: (name: string) =>
				void mutate(() => workspaceDriver?.scmCheckout?.(workspace as WorkspaceRef, name), true),
			onRestoreCheckpoint: (ref: string) => {
				if (!workspace || !sessionId) return;
				const ws = workspace;
				void mutate(() => workspaceDriver?.scmCheckpointRestore?.(ws, sessionId, ref), true).then(() =>
					refreshCheckpoints(),
				);
			},
		}),
		[mutate, workspaceDriver, workspace, scm, commitMessage, refreshScm, refreshTree, sessionId, refreshCheckpoints],
	);

	return (
		<IdeWorkspace
			className={className}
			paths={paths}
			gitStatus={gitStatus}
			files={files}
			defaultSelectedPath={defaultSelectedPath}
			externalDiff={externalDiff}
			onOpenFile={openFile}
			onOpenChange={openChange}
			scm={scm}
			getDiff={getDiff}
			commitMessage={commitMessage}
			onCommitMessageChange={setCommitMessage}
			committing={committing}
			branches={branches}
			notice={notice}
			onDismissNotice={() => setNotice(null)}
			checkpoints={checkpoints}
			{...handlers}
		/>
	);
}
