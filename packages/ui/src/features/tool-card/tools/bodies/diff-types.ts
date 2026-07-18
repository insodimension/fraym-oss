export type DiffViewerLineKind = "add" | "del" | "normal";

export interface DiffViewerLine {
	readonly kind: DiffViewerLineKind;
	readonly content: string;
	readonly oldNo?: number | undefined;
	readonly newNo?: number | undefined;
}

export interface DiffViewerFile {
	readonly oldPath?: string | undefined;
	readonly newPath?: string | undefined;
	readonly isNew?: boolean | undefined;
	readonly isDeleted?: boolean | undefined;
	readonly lines: readonly DiffViewerLine[];
	readonly additions: number;
	readonly deletions: number;
	readonly error?: string | undefined;
}
