import type { EngineSpaceRecord } from "@fraym/driver";
import type { IconName } from "../../icons/paths";
import type { RailActionDef, RailActionTarget } from "../types";
import type { SpaceUiDef } from "./space-def";

/** The rail action targets that this shell can bind. Unknown targets are
 * ignored rather than producing inactive controls. */
const KNOWN_TARGETS: Readonly<Record<RailActionTarget, true>> = {
	"new-session": true,
	settings: true,
	surface: true,
};

/** Project a plugin-contributed space record (assembly tier — pure data over
 *  built-in surfaces, ruled 2026-07-17) onto the shell's `SpaceUiDef`. Glyph
 *  names ride an open wire set; an unknown one renders the Icon fallback. */
export function contributedSpaceUiDef(record: EngineSpaceRecord): SpaceUiDef {
	const actions: RailActionDef[] = [];
	for (const action of record.rail.actions) {
		if (!(action.target in KNOWN_TARGETS)) {
			console.warn(
				`[spaces] plugin "${record.pluginId}" space "${record.id}": dropping action "${action.id}" — unknown target "${action.target}"`,
			);
			continue;
		}
		actions.push({
			id: action.id,
			label: action.label,
			icon: action.icon as IconName,
			target: action.target as RailActionTarget,
			...(action.surface ? { surface: action.surface } : {}),
			...(action.kbd ? { kbd: action.kbd } : {}),
			...(action.primary ? { primary: true } : {}),
			...(action.disabled ? { disabled: true } : {}),
		});
	}
	return {
		specVersion: 1,
		id: record.id,
		label: record.label,
		icon: record.icon as IconName,
		...(record.order !== undefined ? { order: record.order } : {}),
		...(record.implementations ? { implementations: record.implementations } : {}),
		rail: {
			...(record.rail.preferredMode ? { preferredMode: record.rail.preferredMode } : {}),
			actions,
		},
		workspace: {
			surfaces: record.workspace.surfaces,
			...(record.workspace.fills ? { fills: record.workspace.fills } : {}),
			start: record.workspace.start,
			session: record.workspace.session,
			...(record.workspace.switchPolicy ? { switchPolicy: record.workspace.switchPolicy } : {}),
		},
	};
}
