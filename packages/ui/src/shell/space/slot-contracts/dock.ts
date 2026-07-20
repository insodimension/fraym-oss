import type { ComponentType } from "react";
import type { FraymFrameWorkspaceProps } from "../../fraym-frame-workspace";
import type { ImplId } from "../space-state";

/** The dock slot contract's props — data in, intents out.
 *
 *  The implementation receives the workspace frame's tab state, drivers, and
 *  resize callbacks. It renders the configured tabs and leaves navigation
 *  ownership to the frame. */
export interface DockSlotProps {
	readonly frame: FraymFrameWorkspaceProps;
}

/** One installable filling of the dock slot. */
export interface DockImplementation {
	readonly specVersion: 1;
	readonly id: ImplId;
	readonly slot: "dock";
	readonly component: ComponentType<DockSlotProps>;
}
