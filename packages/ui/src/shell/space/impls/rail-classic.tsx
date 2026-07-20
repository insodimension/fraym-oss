import { FraymFrameRail } from "../../fraym-frame-rail";
import type { RailImplementation } from "../slot-contracts/rail";

/** Implementation #1 of the rail slot — the shipped Fraym rail, unchanged:
 *  brand, space switcher, actions, session catalog, identity footer. */
export const RAIL_CLASSIC: RailImplementation = {
	specVersion: 1,
	id: "rail-classic",
	slot: "rail",
	component: FraymFrameRail,
};
