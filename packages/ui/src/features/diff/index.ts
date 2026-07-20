// Diff surfaces.

export { type DiffPanelApi, DiffPanelProvider, useDiffPanel } from "./diff-panel";
export {
	computeLineDiff,
	DiffViewer,
	type DiffViewerFile,
	type DiffViewerLine,
	type DiffViewerLineKind,
	type DiffViewerProps,
	type DiffViewMode,
	parseUnifiedPatch,
} from "./diff-viewer";
