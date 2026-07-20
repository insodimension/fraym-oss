import type { ComponentType } from "react";
import type { WorkspaceMainPaneProps } from "../../fraym-frame-workspace";
import type { ImplId } from "../space-state";

/** The workspace-host slot contract's props (doc 44 §4.2) — Data in · Intents out.
 *
 *  The workspace host is the pane container that mounts the active surface:
 *  splits/tiling, the chat presence backdrop, and the room overlays ride here.
 *  specVersion 1 carries the shipped pane surface verbatim (frame + tiling +
 *  presence state); a surface-registry projection is step-③ work.
 *
 *  Duties:
 *  - Mount exactly the active space's `activeSurface`; a mount REPLACES it.
 *  - Keep tiling/splits per space; never leak panes across a space switch.
 *  - Never own navigation truth — emit ShellIntents through the frame. */
export type WorkspaceHostSlotProps = WorkspaceMainPaneProps;

/** One installable filling of the workspace-host slot. */
export interface WorkspaceHostImplementation {
	readonly specVersion: 1;
	readonly id: ImplId;
	readonly slot: "workspace";
	readonly component: ComponentType<WorkspaceHostSlotProps>;
}
