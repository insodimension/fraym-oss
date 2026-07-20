export type DiffViewMode = "split" | "unified";
export type DiffViewerLineKind = "add" | "del" | "normal";

export interface DiffViewerLine {
	readonly kind: DiffViewerLineKind;
	readonly content: string;
	readonly oldNo?: number;
	readonly newNo?: number;
}

export interface DiffViewerFile {
	readonly oldPath?: string;
	readonly newPath?: string;
	readonly isNew?: boolean;
	readonly isDeleted?: boolean;
	readonly lines: readonly DiffViewerLine[];
	readonly additions: number;
	readonly deletions: number;
	/** Per-file failure in multi-file edits; renders an error row instead of a diff. */
	readonly error?: string;
}

export interface DiffViewerProps {
	/** A unified diff/patch string, preferred for edit/apply_patch output. */
	readonly patch?: string;
	/** Or compute a diff from old/new file contents. */
	readonly oldText?: string;
	readonly newText?: string;
	/** Path label when diffing old/new text with no patch headers to read. */
	readonly path?: string;
	/** Or supply already-parsed files directly. */
	readonly files?: readonly DiffViewerFile[];
	readonly viewMode?: DiffViewMode;
	readonly showLineNumbers?: boolean;
	readonly showToolbar?: boolean;
	/** Cap each file body height in px, with vertical scroll inside the file block. */
	readonly maxHeight?: number;
	/** Auto-scroll the active file body to the bottom as content grows. */
	readonly followTail?: boolean;
	/** Suppress the per-file "Open ↗" affordance (e.g. the diff is already shown in the dock). */
	readonly disableOpen?: boolean;
	readonly className?: string;
}
