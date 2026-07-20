import { useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { ToolBodyCard } from "../tool-card/tool-body-card";
import { DiffFileBlock } from "./diff-file-block";
import { DiffViewerToolbar } from "./diff-toolbar";
import type { DiffViewerFile, DiffViewerProps, DiffViewMode } from "./diff-types";
import { computeLineDiff } from "./line-diff";
import { parseUnifiedPatch } from "./unified-patch";

function computedDiffFile(
	oldText: string | undefined,
	newText: string | undefined,
	path: string | undefined,
): DiffViewerFile {
	const file = computeLineDiff(oldText ?? "", newText ?? "");
	return { ...file, oldPath: path, newPath: path };
}

function patchDiffFiles(patch: string | undefined): readonly DiffViewerFile[] | undefined {
	return patch ? parseUnifiedPatch(patch) : undefined;
}

function textDiffFiles(
	oldText: string | undefined,
	newText: string | undefined,
	path: string | undefined,
): readonly DiffViewerFile[] | undefined {
	return oldText !== undefined || newText !== undefined ? [computedDiffFile(oldText, newText, path)] : undefined;
}

function resolveDiffViewerFiles({
	files,
	patch,
	oldText,
	newText,
	path,
}: Pick<DiffViewerProps, "files" | "patch" | "oldText" | "newText" | "path">): readonly DiffViewerFile[] {
	return files ?? patchDiffFiles(patch) ?? textDiffFiles(oldText, newText, path) ?? [];
}

function EmptyDiffViewer({ className }: { readonly className?: string }) {
	return (
		<div
			data-slot="diff-viewer"
			className={cn(
				"rounded-[var(--fr-r)] border border-fr-border bg-fr-surface p-3 text-xs text-fr-text-3",
				className,
			)}
		>
			No diff content.
		</div>
	);
}

function DiffFileBlocks({
	files,
	viewMode,
	showLineNumbers,
	maxHeight,
	followTail,
	disableOpen,
}: {
	readonly files: readonly DiffViewerFile[];
	readonly viewMode: DiffViewMode;
	readonly showLineNumbers: boolean;
	readonly maxHeight?: number;
	readonly followTail?: boolean;
	readonly disableOpen?: boolean;
}) {
	return files.map((file, idx) => (
		<DiffFileBlock
			key={idx}
			file={file}
			viewMode={viewMode}
			showLineNumbers={showLineNumbers}
			maxHeight={maxHeight}
			followTail={followTail && idx === files.length - 1}
			disableOpen={disableOpen}
		/>
	));
}

export function DiffViewer({
	patch,
	oldText,
	newText,
	path,
	files,
	viewMode: viewModeProp,
	showLineNumbers = true,
	showToolbar = true,
	maxHeight,
	disableOpen,
	followTail,
	className,
}: DiffViewerProps) {
	const [viewMode, setViewMode] = useState<DiffViewMode>(viewModeProp ?? "unified");

	const parsed = useMemo(
		() => resolveDiffViewerFiles({ files, patch, oldText, newText, path }),
		[files, patch, oldText, newText, path],
	);

	// maxHeight and followTail are applied per file so multi-file edits keep every
	// file visible while each body owns its own capped scroll pane.
	if (parsed.length === 0) return <EmptyDiffViewer className={className} />;

	return (
		<ToolBodyCard
			className={cn("mt-3 mb-1", className)}
			toolbar={
				showToolbar ? <DiffViewerToolbar files={parsed} viewMode={viewMode} setViewMode={setViewMode} /> : undefined
			}
		>
			<DiffFileBlocks
				files={parsed}
				viewMode={viewMode}
				showLineNumbers={showLineNumbers}
				maxHeight={maxHeight}
				followTail={followTail}
				disableOpen={disableOpen}
			/>
		</ToolBodyCard>
	);
}
