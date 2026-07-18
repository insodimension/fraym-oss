import { DiffBlock, type DiffLine } from "../../../../components/diff-block";
import type { DiffViewerFile } from "./diff-types";

export type { DiffViewerFile, DiffViewerLine } from "./diff-types";

export interface DiffViewerProps {
	readonly files?: readonly DiffViewerFile[] | undefined;
	readonly maxHeight?: number | undefined;
	readonly followTail?: boolean | undefined;
	readonly className?: string | undefined;
}

function linesFor(file: DiffViewerFile): DiffLine[] {
	return file.lines.map(line => ({
		kind: line.kind === "normal" ? "ctx" : line.kind,
		lineNo: String(line.newNo ?? line.oldNo ?? ""),
		code: line.content,
	}));
}

export function DiffViewer({ files = [], maxHeight, className }: DiffViewerProps) {
	return (
		<div data-slot="diff-viewer" className={className} style={maxHeight ? { maxHeight, overflow: "auto" } : undefined}>
			{files.map((file, index) =>
				file.error ? (
					<div key={index} className="border border-fr-del/30 bg-fr-del-bg px-3 py-2 text-fr-xs text-fr-del">
						{file.error}
					</div>
				) : (
					<DiffBlock
						key={index}
						path={file.newPath ?? file.oldPath ?? "File"}
						added={file.additions}
						deleted={file.deletions}
							{...(file.isNew === undefined ? {} : { isNew: file.isNew })}
						lines={linesFor(file)}
					/>
				),
			)}
		</div>
	);
}
