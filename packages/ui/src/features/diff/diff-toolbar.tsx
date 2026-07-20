import { cn } from "../../lib/cn";
import type { DiffViewerFile, DiffViewMode } from "./diff-types";

function diffFileCountLabel(files: readonly DiffViewerFile[]): string {
	return files.length === 1 ? "1 file" : `${files.length} files`;
}

function DiffModeButton({
	mode,
	viewMode,
	setViewMode,
}: {
	readonly mode: DiffViewMode;
	readonly viewMode: DiffViewMode;
	readonly setViewMode: (mode: DiffViewMode) => void;
}) {
	const handleClick = () => {
		setViewMode(mode);
	};
	return (
		<button
			type="button"
			onClick={handleClick}
			className={cn(
				"px-2 py-0.5 capitalize transition-colors",
				viewMode === mode ? "bg-fr-surface text-fr-text" : "text-fr-text-3 hover:text-fr-text-2",
			)}
		>
			{mode}
		</button>
	);
}

export function DiffViewerToolbar({
	files,
	viewMode,
	setViewMode,
}: {
	readonly files: readonly DiffViewerFile[];
	readonly viewMode: DiffViewMode;
	readonly setViewMode: (mode: DiffViewMode) => void;
}) {
	return (
		<>
			<span className="font-secondary">{diffFileCountLabel(files)}</span>
			<div className="ml-auto inline-flex overflow-hidden rounded-[6px] border border-fr-border-soft">
				{(["unified", "split"] as const).map(mode => (
					<DiffModeButton key={mode} mode={mode} viewMode={viewMode} setViewMode={setViewMode} />
				))}
			</div>
		</>
	);
}
