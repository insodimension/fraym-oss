// Tool rendering surfaces (registry-driven) + reusable tool bodies.

export { EditDiffBody, type EditDiffBodyProps } from "./bodies/edit-diff-body";
export { parseSearchDisplay, type SearchFileGroup, type SearchLine } from "./bodies/search-display";
export {
	SearchEmptyBody,
	SearchPendingBody,
	SearchPlainBody,
	SearchResultsBody,
	type SearchResultsBodyProps,
} from "./bodies/search-results-body";
export { ToolArgsPreview, type ToolArgsPreviewProps } from "./bodies/tool-args-preview";
export {
	type CoalesceToolGroupsOptions,
	coalesceToolGroups,
	DEFAULT_TOOL_GROUP_THRESHOLD,
	ToolGroupCard,
	type ToolGroupCardProps,
} from "./tool-group-model";
export {
	ConnectedToolStream,
	type ConnectedToolStreamProps,
	ToolRender,
	type ToolRenderProps,
	toolKindForName,
} from "./tool-render";
