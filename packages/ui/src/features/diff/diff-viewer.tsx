// DiffViewer - stable public API for the web-native diff surface.
// Parsing, line diffing, split pairing, and rendering live in sibling modules.

export type {
	DiffViewerFile,
	DiffViewerLine,
	DiffViewerLineKind,
	DiffViewerProps,
	DiffViewMode,
} from "./diff-types";
export { DiffViewer } from "./diff-viewer-content";
export { computeLineDiff } from "./line-diff";
export { countDiffHunks, parseNumberedDiff } from "./numbered-diff";
export { parseUnifiedPatch } from "./unified-patch";
