import type { ComponentType } from "react";
import type { FraymFrameRailProps } from "../../fraym-frame-rail";
import type { ImplId } from "../space-state";

/** The rail slot contract's props (doc 44 §4.1) — Data in · Intents out.
 *
 *  specVersion 1 carries the shipped rail surface verbatim: session catalog
 *  groups, space switcher data, action definitions, identity/footer data, and
 *  host side-effect callbacks (session create/select, menus). Navigation flows
 *  ONLY through `onIntent`; active-state highlighting is an identity match on
 *  `activeSurface` (doc 44 §12.2).
 *
 *  Duties (the conformance suite asserts these):
 *  - Render every enabled action; emit the action's mapped ShellIntent on click.
 *  - Exactly one primary action (the space's create verb) — never droppable.
 *  - Mark a surface action active iff its surface === `activeSurface`. */
export type RailSlotProps = FraymFrameRailProps;

/** One installable filling of the rail slot ("five rails" — doc 44 §4).
 *  Implementations are open; the slot set is closed. */
export interface RailImplementation {
	readonly specVersion: 1;
	readonly id: ImplId;
	readonly slot: "rail";
	readonly component: ComponentType<RailSlotProps>;
}
