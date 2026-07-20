import type {
	FileTreeDragAndDropConfig,
	FileTreeInitialExpansion,
	FileTreeRenamingConfig,
	GitStatus,
	GitStatusEntry,
} from "@pierre/trees";
import { FileTree as PierreFileTree, useFileTree } from "@pierre/trees/react";
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef } from "react";
import { cn } from "../../lib/cn";
import type { FraymSurfaceConfig } from "../surface-kit";

export type FileTreeStatus = GitStatus;
export type FileTreeGitStatusEntry = GitStatusEntry;
export type { FileTreeInitialExpansion } from "@pierre/trees";

export interface FileTreeProps {
	readonly paths: readonly string[];
	readonly gitStatus?: readonly FileTreeGitStatusEntry[];
	readonly selectedPath?: string;
	readonly defaultSelectedPath?: string;
	readonly onSelect?: (path: string) => void;
	readonly initialExpandedPaths?: readonly string[];
	readonly initialExpansion?: FileTreeInitialExpansion;
	readonly search?: boolean;
	readonly dragAndDrop?: boolean | FileTreeDragAndDropConfig;
	readonly renaming?: boolean | FileTreeRenamingConfig;
	readonly header?: ReactNode;
	readonly settings?: FraymSurfaceConfig;
	readonly emptyLabel?: ReactNode;
	readonly className?: string;
	readonly style?: CSSProperties;
}

type PierreTreeModel = ReturnType<typeof useFileTree>["model"];
type PierreDensity = ReturnType<typeof pierreDensity>;
type TreeCssProperties = CSSProperties & Record<`--${string}`, string | number | undefined>;

function pierreDensity(settings: FraymSurfaceConfig | undefined) {
	switch (settings?.density) {
		case "compact":
			return "compact";
		case "spacious":
			return "relaxed";
		default:
			return "default";
	}
}

function initialSelectedPath(selectedPath: string | undefined, defaultSelectedPath: string | undefined) {
	return selectedPath ?? defaultSelectedPath;
}

/** True when `path` is a node the tree actually renders — an exact file entry, or a
 *  directory that is the parent prefix of one. A path that is NOT a node (an
 *  out-of-project absolute path, or a file that no longer exists) must never be
 *  handed to the tree as a selection: pierre-tree responds to an unknown initial
 *  selection by falling back to its FIRST row and emitting that as a selection
 *  change — which silently opened whatever sorts first (e.g. `.agentic-scaffold.json`)
 *  instead of the file the user clicked. */
function pathInTree(path: string | undefined, paths: readonly string[]): boolean {
	if (!path) return false;
	if (paths.includes(path)) return true;
	const prefix = `${path}/`;
	return paths.some(entry => entry.startsWith(prefix));
}

function clearTreeSelection(model: PierreTreeModel) {
	for (const previous of model.getSelectedPaths()) model.getItem(previous)?.deselect();
}

function expandAncestors(model: PierreTreeModel, path: string) {
	const segments = path.split("/");
	let prefix = "";
	for (let i = 0; i < segments.length - 1; i++) {
		const seg = segments[i] ?? "";
		prefix = prefix ? `${prefix}/${seg}` : seg;
		const item = model.getItem(prefix);
		if (item && "expand" in item && !item.isExpanded()) item.expand();
	}
}

function syncSingleSelection(model: PierreTreeModel, path: string | undefined) {
	if (!path) return;
	const selected = model.getSelectedPaths();
	if (selected.length === 1 && selected[0] === path) return;
	for (const previous of selected) model.getItem(previous)?.deselect();
	expandAncestors(model, path);
	const item = model.getItem(path);
	item?.select();
	// Revealing a FOLDER (not a file) opens it so its contents show — the file view
	// links a directory here and expects the folder expanded, not just highlighted.
	if (item && "expand" in item && !item.isExpanded()) item.expand();
	model.scrollToPath(path, { focus: false, offset: "nearest" });
}

function useFraymTreeModel({
	paths,
	gitStatus,
	selectedPath,
	defaultSelectedPath,
	initialExpandedPaths,
	initialExpansion,
	search,
	dragAndDrop,
	renaming,
	onSelect,
	density,
}: Pick<
	FileTreeProps,
	| "paths"
	| "gitStatus"
	| "selectedPath"
	| "defaultSelectedPath"
	| "initialExpandedPaths"
	| "initialExpansion"
	| "search"
	| "dragAndDrop"
	| "renaming"
	| "onSelect"
> & {
	readonly density: PierreDensity;
}) {
	const onSelectRef = useRef(onSelect);
	const selectedPathRef = useRef<string | undefined | null>(null);
	const didMount = useRef(false);

	if (selectedPathRef.current === null) {
		const initial = initialSelectedPath(selectedPath, defaultSelectedPath);
		// Only seed pierre-tree with a selection it can actually resolve; an unknown path
		// makes it fall back to row 0 (see pathInTree).
		selectedPathRef.current = pathInTree(initial, paths) ? initial : undefined;
	}

	useEffect(() => {
		onSelectRef.current = onSelect;
	}, [onSelect]);

	const { model } = useFileTree({
		dragAndDrop,
		density,
		fileTreeSearchMode: "expand-matches",
		flattenEmptyDirectories: true,
		gitStatus,
		icons: { colored: true, set: "complete" },
		initialExpandedPaths,
		initialExpansion,
		initialSelectedPaths: selectedPathRef.current ? [selectedPathRef.current] : undefined,
		paths,
		renaming,
		search,
		searchBlurBehavior: "retain",
		stickyFolders: true,
		onSelectionChange: selectedPaths => {
			const next = selectedPaths[0];
			if (!next || next === selectedPathRef.current) return;
			selectedPathRef.current = next;
			onSelectRef.current?.(next);
		},
	});

	useEffect(() => {
		if (!didMount.current) {
			didMount.current = true;
			return;
		}
		model.resetPaths(paths, { initialExpandedPaths });
	}, [initialExpandedPaths, model, paths]);

	useEffect(() => {
		model.setGitStatus(gitStatus);
	}, [gitStatus, model]);

	useEffect(() => {
		const next = initialSelectedPath(selectedPath, defaultSelectedPath);
		if (pathInTree(next, paths)) {
			selectedPathRef.current = next;
			syncSingleSelection(model, next);
		} else {
			// Out-of-project / nonexistent: the viewer still loads it, but the tree must not
			// select or fall back to anything — just clear any stale highlight.
			selectedPathRef.current = undefined;
			clearTreeSelection(model);
		}
	}, [defaultSelectedPath, model, selectedPath, paths]);

	return model;
}

function treeStyle(settings: FraymSurfaceConfig | undefined, style: CSSProperties | undefined): TreeCssProperties {
	return {
		"--trees-accent-override": "var(--fr-accent)",
		"--trees-bg-override": "transparent",
		"--trees-bg-muted-override": "var(--fr-surface-2)",
		"--trees-border-color-override": "var(--fr-border-soft)",
		"--trees-fg-muted-override": "var(--fr-text-3)",
		"--trees-fg-override": "var(--fr-text-2)",
		"--trees-focus-ring-color-override": "var(--fr-accent-line)",
		"--trees-font-family-override": "var(--fr-font-primary)",
		"--trees-font-size-override": settings?.density === "spacious" ? "13px" : "12px",
		// Reclaim the library's roomy fixed defaults (none density-scaled): 30px rows,
		// 6px inter-row gap, 16px side inset → a denser, VS Code-like tree.
		"--trees-item-height": "24px",
		"--trees-item-row-gap-override": "2px",
		"--trees-padding-inline-override": "6px",
		"--trees-selected-bg-override": "var(--fr-accent-dim)",
		"--trees-selected-focused-border-color-override": "var(--fr-accent)",
		"--trees-selected-fg-override": "var(--fr-text)",
		...style,
	};
}

function EmptyFileTree({ label }: { readonly label: ReactNode }) {
	return <div className="px-2 py-6 text-center text-fr-sm text-fr-text-3">{label}</div>;
}

export function FileTree({ paths, settings, emptyLabel = "No files in the working tree.", ...props }: FileTreeProps) {
	const density = pierreDensity(settings);

	if (settings?.visible === false || settings?.placement === "hidden") return null;
	if (paths.length === 0) return <EmptyFileTree label={emptyLabel} />;

	return <MountedFileTree key={density} paths={paths} settings={settings} density={density} {...props} />;
}

function MountedFileTree({
	paths,
	gitStatus,
	selectedPath,
	defaultSelectedPath,
	onSelect,
	initialExpandedPaths,
	initialExpansion = "open",
	search = true,
	dragAndDrop = false,
	renaming = false,
	header,
	settings,
	className,
	style,
	density,
}: FileTreeProps & { readonly density: PierreDensity }) {
	const model = useFraymTreeModel({
		defaultSelectedPath,
		density,
		dragAndDrop,
		gitStatus,
		initialExpandedPaths,
		initialExpansion,
		onSelect,
		paths,
		renaming,
		search,
		selectedPath,
	});
	const hostStyle = useMemo(() => treeStyle(settings, style), [settings, style]);

	return (
		<PierreFileTree
			data-slot="file-tree"
			data-density={settings?.density ?? "comfortable"}
			model={model}
			header={header}
			className={cn("block h-full min-h-0 w-full overflow-hidden", className)}
			style={hostStyle}
		/>
	);
}
