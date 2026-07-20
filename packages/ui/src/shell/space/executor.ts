import type { ShellIntent } from "./intents";
import { type ShellNavState, SURFACE, type SurfaceId } from "./space-state";

/** The active spaces' surface registries — `SpaceUiDef.workspace.surfaces`
 *  projected per space id (see `spaceSurfaceRegistry`). */
export type SpaceSurfaceRegistry = Readonly<Record<string, readonly SurfaceId[]>>;

/** The shell's executor — the single writer of navigation state (doc 44 §5).
 *
 *  Pure: `(state, intent) → state`. Side effects (minting a session, opening
 *  the settings pane's content) belong to the wiring site; the executor owns
 *  ONLY where navigation truth goes. Invalid or no-op intents are refused by
 *  returning the SAME state reference — callers detect a no-op by identity.
 *
 *  `surfaces` is the active SpaceUiDefs' mount allowlist (step ③ — the defs
 *  replaced the static SPACE_SURFACES table): a `mount` naming a surface
 *  outside the active space's registry is refused. The shell's dispatch always
 *  passes it; omitting it skips ONLY that validation (pure state-machine use,
 *  e.g. unit tests of the transition rules themselves).
 *
 *  Structural guarantees:
 *  - One `activeSurface` per space — a mount replaces it, so surfaces never
 *    stack behind one another.
 *  - Per-space state stays isolated across a space switch. */
export function executeIntent(
	state: ShellNavState,
	intent: ShellIntent,
	surfaces?: SpaceSurfaceRegistry,
): ShellNavState {
	switch (intent.t) {
		// New unit of work always lands on the active space's session surface,
		// leaving any door takeover. Mount routes identically after validating
		// against the space's surface registry.
		case "create":
		case "mount": {
			const surface: SurfaceId = intent.t === "create" ? SURFACE.session : intent.surface;
			if (intent.t === "mount" && surfaces && !(surfaces[state.space] ?? []).includes(surface)) return state;
			if (state.route === "app" && state.bySpace[state.space]?.activeSurface === surface) return state;
			return {
				...state,
				route: "app",
				bySpace: { ...state.bySpace, [state.space]: { activeSurface: surface } },
			};
		}
		case "door":
			return state.route === intent.route ? state : { ...state, route: intent.route };
		case "door.close":
			return state.route === "app" ? state : { ...state, route: "app" };
		case "space.switch": {
			if (state.space === intent.space) return state;
			// The outgoing space's surface stays remembered; the incoming space
			// resumes exactly where it was (switchPolicy "remember"). A space seen
			// for the FIRST time (community spaces arrive after mount — step ④'s
			// open id set) initializes on its session/start surface.
			const bySpace = state.bySpace[intent.space]
				? state.bySpace
				: { ...state.bySpace, [intent.space]: { activeSurface: SURFACE.session } };
			return { ...state, space: intent.space, route: "app", bySpace };
		}
	}
}
