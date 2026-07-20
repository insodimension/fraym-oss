import { DOCK_CLASSIC, HOST_SPLITS } from "../../fraym-frame-workspace";
import type { DockImplementation } from "../slot-contracts/dock";
import type { RailImplementation } from "../slot-contracts/rail";
import type { WorkspaceHostImplementation } from "../slot-contracts/workspace";
import { RAIL_CLASSIC } from "./rail-classic";

/** The built-in filling of every UI slot — what the shell mounts when no
 *  SpaceDef (step ③) or contributed implementation (step ④) overrides a slot,
 *  and what a crash boundary self-heals to (doc 44 §12.1). */
export const DEFAULT_SPACE_IMPLS: {
	readonly rail: RailImplementation;
	readonly dock: DockImplementation;
	readonly workspace: WorkspaceHostImplementation;
} = {
	rail: RAIL_CLASSIC,
	dock: DOCK_CLASSIC,
	workspace: HOST_SPLITS,
};
