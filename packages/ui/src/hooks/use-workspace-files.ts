import type {
	WorkspaceDriver,
	WorkspaceFileContent,
	WorkspaceFileStatusEntry,
	WorkspaceFileTreeSnapshot,
	WorkspaceRef,
} from "@fraym-ai/driver";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface WorkspaceFilesState {
	readonly available: boolean;
	readonly tree: WorkspaceFileTreeSnapshot | null;
	readonly paths: readonly string[];
	readonly gitStatus: readonly WorkspaceFileStatusEntry[];
	readonly files: Readonly<Record<string, WorkspaceFileContent>>;
	readonly selectedPath: string | undefined;
	readonly selectedFile: WorkspaceFileContent | undefined;
	readonly loadingTree: boolean;
	readonly loadingFile: boolean;
	readonly error: string | null;
	readonly selectPath: (path: string) => void;
}

export interface UseWorkspaceFilesOptions {
	readonly enabled?: boolean;
}

type StateSetter<T> = (next: T | ((current: T) => T)) => void;

interface WorkspaceFileData {
	readonly tree: WorkspaceFileTreeSnapshot | null;
	readonly files: Readonly<Record<string, WorkspaceFileContent>>;
	readonly selectedPath: string | undefined;
	readonly error: string | null;
	readonly setTree: StateSetter<WorkspaceFileTreeSnapshot | null>;
	readonly setFiles: StateSetter<Readonly<Record<string, WorkspaceFileContent>>>;
	readonly setSelectedPath: StateSetter<string | undefined>;
	readonly setError: StateSetter<string | null>;
}

interface WorkspaceTreeLoaderOptions {
	readonly available: boolean;
	readonly driver: WorkspaceDriver | null | undefined;
	readonly enabled: boolean;
	readonly workspace: WorkspaceRef | null | undefined;
	readonly setError: StateSetter<string | null>;
	readonly setSelectedPath: StateSetter<string | undefined>;
	readonly setTree: StateSetter<WorkspaceFileTreeSnapshot | null>;
}

interface WorkspaceFileLoaderOptions {
	readonly available: boolean;
	readonly driver: WorkspaceDriver | null | undefined;
	readonly enabled: boolean;
	readonly files: Readonly<Record<string, WorkspaceFileContent>>;
	readonly selectedPath: string | undefined;
	readonly workspace: WorkspaceRef | null | undefined;
	readonly setError: StateSetter<string | null>;
	readonly setFiles: StateSetter<Readonly<Record<string, WorkspaceFileContent>>>;
}

function workspaceKey(workspace: WorkspaceRef | null | undefined): string {
	return workspace ? `${workspace.workspaceId}:${workspace.path}` : "none";
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function firstSelectablePath(paths: readonly string[]): string | undefined {
	return paths[0];
}

/**
 * Reconcile the selected path when a (re)loaded tree arrives. Default-select the
 * first entry ONLY when nothing is selected. A selection absent from the tree
 * list is NOT invalid — the list is truncated (maxFiles) and file-mention clicks
 * select paths the engine resolves (or reports notFound) independently of the
 * tree; stomping it used to open paths[0] (alphabetically first, e.g.
 * `.agentic-scaffold.json`) instead of the requested file or its clean
 * "File not found" state.
 */
export function reconcileSelectedPath(current: string | undefined, paths: readonly string[]): string | undefined {
	return current ?? firstSelectablePath(paths);
}

function useResetWorkspaceFileData(key: string, reset: () => void): void {
	const [dataWorkspaceKey, setDataWorkspaceKey] = useState(key);

	useEffect(() => {
		if (dataWorkspaceKey === key) return;
		setDataWorkspaceKey(key);
		reset();
	}, [dataWorkspaceKey, key, reset]);
}

function useWorkspaceFileData(key: string): WorkspaceFileData {
	const [tree, setTree] = useState<WorkspaceFileTreeSnapshot | null>(null);
	const [files, setFiles] = useState<Readonly<Record<string, WorkspaceFileContent>>>({});
	const [selectedPath, setSelectedPath] = useState<string | undefined>();
	const [error, setError] = useState<string | null>(null);

	const reset = useCallback(() => {
		setTree(null);
		setFiles({});
		setSelectedPath(undefined);
		setError(null);
	}, []);

	useResetWorkspaceFileData(key, reset);

	return {
		tree,
		files,
		selectedPath,
		error,
		setTree,
		setFiles,
		setSelectedPath,
		setError,
	};
}

function useWorkspaceTreeLoader({
	available,
	driver,
	enabled,
	workspace,
	setError,
	setSelectedPath,
	setTree,
}: WorkspaceTreeLoaderOptions): boolean {
	const [loadingTree, setLoadingTree] = useState(false);

	useEffect(() => {
		if (!enabled || !available || !workspace || !driver?.getFileTree) return;
		let cancelled = false;
		setLoadingTree(true);
		setError(null);
		void driver
			.getFileTree(workspace)
			.then(nextTree => {
				if (cancelled) return;
				setTree(nextTree);
				// See reconcileSelectedPath: never stomp an existing selection with paths[0].
				setSelectedPath(current => reconcileSelectedPath(current, nextTree.paths));
			})
			.catch(nextError => {
				if (!cancelled) setError(errorMessage(nextError));
			})
			.finally(() => {
				if (!cancelled) setLoadingTree(false);
			});
		return () => {
			cancelled = true;
		};
	}, [available, driver, enabled, setError, setSelectedPath, setTree, workspace]);

	return loadingTree;
}

function useSelectedWorkspaceFileLoader({
	available,
	driver,
	enabled,
	files,
	selectedPath,
	workspace,
	setError,
	setFiles,
}: WorkspaceFileLoaderOptions): boolean {
	const [loadingFile, setLoadingFile] = useState(false);

	useEffect(() => {
		if (!enabled || !available || !workspace || !driver?.readFile || !selectedPath || files[selectedPath]) return;
		let cancelled = false;
		setLoadingFile(true);
		setError(null);
		void driver
			.readFile(workspace, selectedPath)
			.then(content => {
				if (cancelled) return;
				// Key by the REQUESTED path (what the guard above and the view selector look
				// up by), not content.path — the engine may return a normalized/absolute path
				// that no longer matches the request, which would refetch-loop and blank the view.
				setFiles(current => ({ ...current, [selectedPath]: content }));
			})
			.catch(nextError => {
				if (!cancelled) setError(errorMessage(nextError));
			})
			.finally(() => {
				if (!cancelled) setLoadingFile(false);
			});
		return () => {
			cancelled = true;
		};
	}, [available, driver, enabled, files, selectedPath, setError, setFiles, workspace]);

	return loadingFile;
}

function useWorkspaceFilesView(
	data: WorkspaceFileData,
	available: boolean,
	loadingTree: boolean,
	loadingFile: boolean,
): WorkspaceFilesState {
	const selectedFile = data.selectedPath ? data.files[data.selectedPath] : undefined;
	const paths = data.tree?.paths ?? [];
	const gitStatus = data.tree?.gitStatus ?? [];
	const selectPath = useCallback((path: string) => data.setSelectedPath(path), [data.setSelectedPath]);

	return useMemo(
		() => ({
			available,
			tree: data.tree,
			paths,
			gitStatus,
			files: data.files,
			selectedPath: data.selectedPath,
			selectedFile,
			loadingTree,
			loadingFile,
			error: data.error,
			selectPath,
		}),
		[
			available,
			data.error,
			data.files,
			data.selectedPath,
			data.tree,
			gitStatus,
			loadingFile,
			loadingTree,
			paths,
			selectPath,
			selectedFile,
		],
	);
}

export function useWorkspaceFiles(
	driver: WorkspaceDriver | null | undefined,
	workspace: WorkspaceRef | null | undefined,
	options: UseWorkspaceFilesOptions = {},
): WorkspaceFilesState {
	const enabled = options.enabled ?? true;
	const available = Boolean(driver?.getFileTree && driver?.readFile);
	const data = useWorkspaceFileData(workspaceKey(workspace));
	const loadingTree = useWorkspaceTreeLoader({
		available,
		driver,
		enabled,
		workspace,
		setError: data.setError,
		setSelectedPath: data.setSelectedPath,
		setTree: data.setTree,
	});
	const loadingFile = useSelectedWorkspaceFileLoader({
		available,
		driver,
		enabled,
		files: data.files,
		selectedPath: data.selectedPath,
		workspace,
		setError: data.setError,
		setFiles: data.setFiles,
	});

	return useWorkspaceFilesView(data, available, loadingTree, loadingFile);
}
