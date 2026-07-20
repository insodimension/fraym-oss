"use client";

// FileWorkspace — the IDE-style Files surface: a FileTree on the left and a
// CodeViewer on the right, separated by a drag-to-resize handle. Selecting a
// file in the tree previews its content (markdown rendered, code highlighted).
// Presentational: file contents come from the `files` map keyed by node path.

import { useState } from "react";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import { CodeViewer, type CodeViewerKind } from "../code-viewer";
import { ResizeHandle as PaneResizeHandle } from "../split-pane";
import type { FraymSurfaceConfig } from "../surface-kit";
import { FileTree, type FileTreeGitStatusEntry, type FileTreeInitialExpansion } from "./file-tree";

interface WidthState {
	readonly sourceWidth: number;
	readonly width: number;
}

export interface FileWorkspaceFile {
	readonly content: string;
	readonly language?: string;
	readonly kind?: CodeViewerKind;
}

export interface FileWorkspaceProps {
	readonly paths: readonly string[];
	readonly gitStatus?: readonly FileTreeGitStatusEntry[];
	/** Map of node `path` -> file content. Missing entries show the empty state. */
	readonly files?: Readonly<Record<string, FileWorkspaceFile>>;
	/** Controlled selected path. */
	readonly selectedPath?: string;
	readonly defaultSelectedPath?: string;
	readonly onSelect?: (path: string) => void;
	/** Initial tree column width in px. */
	readonly treeWidth?: number;
	readonly resizable?: boolean;
	/** Controlled tree-collapsed state. Provide `onTreeCollapsedChange` to enable the toggle UI. */
	readonly treeCollapsed?: boolean;
	readonly onTreeCollapsedChange?: (collapsed: boolean) => void;
	/** Show the tree with only the selected file's path expanded (focus-the-file in the dock). */
	readonly scopeTreeToFile?: boolean;
	readonly loading?: boolean;
	readonly emptyLabel?: React.ReactNode;
	readonly settings?: FraymSurfaceConfig;
	readonly className?: string;
}

function useFileWorkspaceSelection({
	selectedPath,
	defaultSelectedPath,
	onSelect,
}: Pick<FileWorkspaceProps, "selectedPath" | "defaultSelectedPath" | "onSelect">) {
	const [internalSel, setInternalSel] = useState(defaultSelectedPath);
	const isControlled = selectedPath !== undefined;
	const sel = isControlled ? selectedPath : internalSel;

	const select = (path: string) => {
		if (!isControlled) setInternalSel(path);
		onSelect?.(path);
	};

	return { sel, select };
}

function clampTreeWidth(width: number): number {
	return Math.min(420, Math.max(150, width));
}

function useResizableTreeWidth(treeWidth: number) {
	const [widthState, setWidthState] = useState<WidthState>(() => ({ sourceWidth: treeWidth, width: treeWidth }));
	const width = widthState.sourceWidth === treeWidth ? widthState.width : treeWidth;

	const startResize = (e: React.PointerEvent) => {
		e.preventDefault();
		const startX = e.clientX;
		const startW = width;
		const onMove = (ev: PointerEvent) => {
			setWidthState({ sourceWidth: treeWidth, width: clampTreeWidth(startW + (ev.clientX - startX)) });
		};
		const onUp = () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	};

	return { width, startResize };
}

function FileTreePane({
	width,
	paths,
	gitStatus,
	selectedPath,
	onSelect,
	settings,
	onCollapse,
	initialExpansion,
}: {
	readonly width: number;
	readonly paths: readonly string[];
	readonly gitStatus?: readonly FileTreeGitStatusEntry[];
	readonly selectedPath?: string;
	readonly onSelect: (path: string) => void;
	readonly settings?: FraymSurfaceConfig;
	readonly onCollapse?: () => void;
	readonly initialExpansion?: FileTreeInitialExpansion;
}) {
	return (
		<div style={{ width }} className="flex min-h-0 shrink-0 flex-col bg-fr-surface">
			{onCollapse ? (
				<div className="flex shrink-0 items-center gap-2 px-2 pt-2 pb-1">
					<span className="font-secondary text-fr-2xs uppercase tracking-wide text-fr-text-3">Files</span>
					<button
						type="button"
						onClick={onCollapse}
						aria-label="Hide file tree"
						className="ml-auto grid size-6 place-items-center rounded-md text-fr-text-3 transition-colors hover:bg-fr-surface-2 hover:text-fr-text"
					>
						<Icon name="panel" size={14} strokeWidth={1.8} />
					</button>
				</div>
			) : null}
			<div className="min-h-0 flex-1 overflow-auto p-2">
				<FileTree
					paths={paths}
					gitStatus={gitStatus}
					selectedPath={selectedPath}
					onSelect={onSelect}
					settings={settings}
					initialExpansion={initialExpansion}
				/>
			</div>
		</div>
	);
}

function ResizeHandle({ onResizeStart }: { readonly onResizeStart: (e: React.PointerEvent) => void }) {
	return <PaneResizeHandle axis="x" ariaLabel="Resize file tree" onPointerDown={onResizeStart} />;
}

function TreeRevealButton({ onClick }: { readonly onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label="Show file tree"
			className="grid size-6 shrink-0 place-items-center rounded-md text-fr-text-3 transition-colors hover:bg-fr-surface hover:text-fr-text-2"
		>
			<Icon name="panel" size={14} strokeWidth={1.8} />
		</button>
	);
}

function FilePreviewPane({
	selectedPath,
	file,
	loading,
	emptyLabel,
	settings,
	leading,
}: {
	readonly selectedPath?: string;
	readonly file?: FileWorkspaceFile;
	readonly loading?: boolean;
	readonly emptyLabel?: React.ReactNode;
	readonly settings?: FraymSurfaceConfig;
	readonly leading?: React.ReactNode;
}) {
	return (
		<div className="min-h-0 min-w-0 flex-1 overflow-hidden">
			<CodeViewer
				path={selectedPath}
				content={file?.content}
				kind={file?.kind}
				loading={loading}
				emptyLabel={emptyLabel}
				settings={settings}
				leading={leading}
			/>
		</div>
	);
}

function isFileWorkspaceHidden(settings?: FraymSurfaceConfig): boolean {
	return settings?.visible === false || settings?.placement === "hidden";
}

function selectedWorkspaceFile(
	selectedPath: string | undefined,
	files: Readonly<Record<string, FileWorkspaceFile>> | undefined,
): FileWorkspaceFile | undefined {
	return selectedPath ? files?.[selectedPath] : undefined;
}

function ResizeHandleSlot({
	resizable,
	onResizeStart,
}: {
	readonly resizable: boolean;
	readonly onResizeStart: (e: React.PointerEvent) => void;
}) {
	if (!resizable) return null;
	return <ResizeHandle onResizeStart={onResizeStart} />;
}

function FileWorkspaceFrame({
	paths,
	gitStatus,
	selectedPath,
	onSelect,
	width,
	resizable,
	onResizeStart,
	file,
	loading,
	emptyLabel,
	settings,
	className,
	collapsed,
	onToggleTree,
	scopeTreeToFile,
}: {
	readonly paths: readonly string[];
	readonly gitStatus?: readonly FileTreeGitStatusEntry[];
	readonly selectedPath?: string;
	readonly onSelect: (path: string) => void;
	readonly width: number;
	readonly resizable: boolean;
	readonly onResizeStart: (e: React.PointerEvent) => void;
	readonly file?: FileWorkspaceFile;
	readonly loading: boolean;
	readonly emptyLabel?: React.ReactNode;
	readonly settings?: FraymSurfaceConfig;
	readonly className?: string;
	readonly collapsed: boolean;
	readonly onToggleTree?: (collapsed: boolean) => void;
	readonly scopeTreeToFile?: boolean;
}) {
	const treeCollapsed = Boolean(onToggleTree && collapsed);
	return (
		<div
			data-slot="file-workspace"
			className={cn(
				"flex h-full min-h-0 overflow-hidden rounded-lg border border-fr-border-soft bg-fr-bg",
				className,
			)}
		>
			{treeCollapsed ? null : (
				<>
					<FileTreePane
						width={width}
						paths={paths}
						gitStatus={gitStatus}
						selectedPath={selectedPath}
						onSelect={onSelect}
						settings={settings}
						onCollapse={onToggleTree ? () => onToggleTree(true) : undefined}
						initialExpansion={scopeTreeToFile ? "closed" : undefined}
					/>
					<ResizeHandleSlot resizable={resizable} onResizeStart={onResizeStart} />
				</>
			)}
			<FilePreviewPane
				selectedPath={selectedPath}
				file={file}
				loading={loading}
				emptyLabel={emptyLabel}
				settings={settings}
				leading={treeCollapsed ? <TreeRevealButton onClick={() => onToggleTree?.(false)} /> : undefined}
			/>
		</div>
	);
}

export function FileWorkspace({
	paths,
	gitStatus,
	files,
	selectedPath,
	defaultSelectedPath,
	onSelect,
	treeWidth = 220,
	resizable = true,
	loading = false,
	emptyLabel,
	settings,
	treeCollapsed,
	onTreeCollapsedChange,
	scopeTreeToFile,
	className,
}: FileWorkspaceProps) {
	const { sel, select } = useFileWorkspaceSelection({ selectedPath, defaultSelectedPath, onSelect });
	const { width, startResize } = useResizableTreeWidth(treeWidth);

	if (isFileWorkspaceHidden(settings)) return null;

	return (
		<FileWorkspaceFrame
			paths={paths}
			gitStatus={gitStatus}
			selectedPath={sel}
			onSelect={select}
			width={width}
			resizable={resizable}
			onResizeStart={startResize}
			file={selectedWorkspaceFile(sel, files)}
			loading={loading}
			emptyLabel={emptyLabel}
			settings={settings}
			className={className}
			collapsed={treeCollapsed ?? false}
			onToggleTree={onTreeCollapsedChange}
			scopeTreeToFile={scopeTreeToFile}
		/>
	);
}
