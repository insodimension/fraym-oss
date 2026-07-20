import type { SpaceUiDef } from "./space-def";
import { SURFACE } from "./space-state";

/** Fraym is the face KIT — it ships the space MECHANICS (SpaceState + intents,
 *  the slot contracts, implementation #1 of each slot) and exactly ONE
 *  unbranded default space so a bare `FraymFrame` renders. PRODUCT spaces are
 *  the consuming app's CONTENT and register through the `spaces` prop —
 *  the consuming app owns compiled definitions; installed boxes contribute theirs
 *  over the engine resource wire (doc 44 §13). */
export const WORKSPACE_SPACE: SpaceUiDef = {
	specVersion: 1,
	// The frozen wire id every host already speaks as its default `appMode`.
	id: "code",
	label: "Workspace",
	icon: "braces",
	implementations: { rail: "rail-classic", dock: "dock-classic", workspace: "host-splits" },
	rail: {
		actions: [
			{ id: "new-session", label: "New session", icon: "plus", target: "new-session", kbd: "Cmd+N", primary: true },
			{ id: "settings", label: "Settings", icon: "gear", target: "settings" },
		],
	},
	workspace: {
		surfaces: [SURFACE.session],
		start: SURFACE.session,
		session: SURFACE.session,
		switchPolicy: "remember",
	},
};

/** The registry a host gets when it passes no `spaces` prop: the one neutral
 *  default. A single space renders no switcher (the tabs hide below two). */
export const DEFAULT_SPACES: readonly SpaceUiDef[] = [WORKSPACE_SPACE];

export const DEFAULT_SPACE_ORDER = 100;

/** Stable, non-mutating switcher order: explicit order first, declaration order
 * as the tie-breaker. Hosts can therefore layer plugin defs without jitter. */
export function sortSpaceUiDefs(spaces: readonly SpaceUiDef[]): readonly SpaceUiDef[] {
	return spaces
		.map((space, index) => ({ space, index }))
		.sort(
			(left, right) =>
				(left.space.order ?? DEFAULT_SPACE_ORDER) - (right.space.order ?? DEFAULT_SPACE_ORDER) ||
				left.index - right.index,
		)
		.map(({ space }) => space);
}

/** Project a def list onto the executor's mount-validation slice. */
export function spaceSurfaceRegistry(spaces: readonly SpaceUiDef[]): Readonly<Record<string, readonly string[]>> {
	return Object.fromEntries(spaces.map(def => [def.id, def.workspace.surfaces]));
}
