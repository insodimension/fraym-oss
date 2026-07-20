import type { AppMode } from "../types";

/** A space's id. The active set is supplied by the host application. */
export type SpaceId = AppMode;

/** A workspace-surface id — what the workspace host mounts (doc 44 §4.2).
 *  Namespaced `<plugin>.<name>` for community surfaces; built-ins own the bare
 *  namespace (doc 44 §4.1). */
export type SurfaceId = string;

/** A kind implementation's id — which filling of a UI kind slot to mount
 *  (doc 44 §4: "five rails"). Namespaced `<plugin>.<name>` for community
 *  implementations; built-ins own the bare namespace. */
export type ImplId = string;

/** THE navigation truth for one space: which workspace surface is active
 *  (doc 44 §5). Replaces the retired View / PersonalView / StudioView enums —
 *  one value, mutual exclusion by construction (bugs B1/B2 die here). */
export interface SpaceNavState {
	readonly activeSurface: SurfaceId;
}

/** Route takeovers that are not workspace surfaces. "app" displays the active
 * space surface. */
export type ShellRoute = "app" | "settings";

/** The shell's navigation state — engine-owned, intent-mutated, single writer
 *  (doc 44 §5). Per-space surfaces persist across space switches per the
 *  default `switchPolicy: "remember"` (doc 44 §11.1). */
export interface ShellNavState {
	readonly space: SpaceId;
	readonly route: ShellRoute;
	readonly bySpace: Readonly<Record<SpaceId, SpaceNavState>>;
}

/** Built-in workspace surfaces. "session" covers the workspace's start and
 * session states, with their distinction derived from session presence. */
export const SURFACE = {
	session: "session",
	library: "library",
	pipelines: "pipelines",
} as const;

/** Every space starts on its session/start surface. */
export function initialShellNavState(space: SpaceId = "code"): ShellNavState {
	return {
		space,
		route: "app",
		bySpace: {
			chat: { activeSurface: SURFACE.session },
			studio: { activeSurface: SURFACE.session },
			code: { activeSurface: SURFACE.session },
		},
	};
}
