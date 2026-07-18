import type { DiffViewerFile } from "./tools/bodies/diff-types";

export type OpenTarget =
	| { readonly kind: "file"; readonly path: string; readonly selector?: string | undefined }
	| { readonly kind: "diff"; readonly path?: string | undefined; readonly files: readonly DiffViewerFile[] };

export interface ToolOpenCommands {
	readonly openFile?: (payload: { readonly path: string; readonly selector?: string | undefined }) => void;
	readonly openDiff?: (payload: { readonly path?: string | undefined; readonly files: readonly DiffViewerFile[] }) => void;
}

const EMPTY_COMMANDS: ToolOpenCommands = Object.freeze({});

export function useToolOpenCommands(): ToolOpenCommands {
	return EMPTY_COMMANDS;
}
