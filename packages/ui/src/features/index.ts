// Features tier — domain-aware product surfaces (often bound to the session driver).
// Each feature is a self-contained folder with its own index.ts and (where it binds
// the driver) a colocated connected.tsx.
//
// Curation rule: operator-only settings-schema surfaces are NOT re-exported here.
// They live in pages/settings-schema and are reachable via "@fraym-ai/ui/agent-surfaces".

export * from "./active-work-strip";
export * from "./activity-state";
export * from "./analytics";
export * from "./approvals";
export * from "./artifact-preview";
export * from "./capability-list";
export * from "./code-view";
export * from "./code-viewer";
export * from "./composer";
export * from "./composer-cockpit";
export * from "./context-popover";
export * from "./data-inspector";
export * from "./diff";
export * from "./entity-summary";
export * from "./environment";
export * from "./execution-log";
export * from "./file-tree";
export * from "./file-view";
export * from "./host-request-stack";
export * from "./ide";
export * from "./jobs-badge";
export * from "./mcp-modal";
export * from "./message";
export * from "./mode-pills";
export * from "./permission-menu";
export * from "./pinned-todo-card";
export * from "./presence";
export * from "./right-dock";
export * from "./session-rail";
export * from "./source-control";
export * from "./split-pane";
export * from "./status-bar";
export * from "./subagent-swarm";
// Shared surface foundation (public surface-config types only; helpers stay internal).
export type {
	ComposerControlTone,
	DisplaySurfaceAction,
	FraymDensity,
	FraymMotion,
	FraymSurfaceConfig,
	FraymSurfacePlacement,
	ToolMetadataItem,
	ToolTimelineStatus,
} from "./surface-kit";
export * from "./task-board";
export * from "./task-breakdown";
export * from "./terminal";
export * from "./thread";
export * from "./tool-card";
export * from "./tool-metadata";
export * from "./tool-timeline";
export * from "./usage";
export * from "./voice-input";
export * from "./work-plan";
export * from "./workbench-dock";
