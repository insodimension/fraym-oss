import type { IconName } from "../../icons/paths";
import type { RailActionDef } from "../types";
import type { ImplId, SpaceId, SurfaceId } from "./space-state";

/** The UI SLICE of a space definition — what the SHELL needs to assemble a
 *  space: identity, slot implementations, rail actions, and the workspace
 *  surface registry (doc 44 §11.1's shell-facing subset).
 *
 *  The host's broader definition can extend this type with runtime-specific
 *  data. The frame only consumes this UI-facing slice and remains dependency
 *  downward. */
export interface SpaceUiDef {
	readonly specVersion: 1;
	/** Stable wire id; built-in and contributed boxes use the same open set. */
	readonly id: SpaceId;
	readonly label: string;
	readonly icon: IconName;
	/** Ascending space-switcher order. Omitted definitions sort at 100. */
	readonly order?: number;
	/** Which filling mounts in each UI kind slot (defaults: the classic set —
	 *  `DEFAULT_SPACE_IMPLS`). User/deployment overrides layer per doc 44 §10. */
	readonly implementations?: {
		readonly rail?: ImplId;
		readonly dock?: ImplId;
		readonly workspace?: ImplId;
	};
	readonly rail: {
		/** Optional box preference applied on entry; the shell restores the
		 * prior mode on exit. Omit to leave the user's rail unchanged. */
		readonly preferredMode?: "expanded" | "compact" | "hidden";
		/** Ordered action bindings (doc 44 §11.2) — the content-layer registry;
		 *  the persona preset and the user's rail-customize ticks arrange it
		 *  downstream (availability vs arrangement, doc 37 §7). */
		readonly actions: readonly RailActionDef[];
	};
	readonly workspace: {
		/** This space's surface registry — a `mount` intent naming a surface
		 *  outside it is refused by the executor. */
		readonly surfaces: readonly SurfaceId[];
		/** Surface id → namespaced workspace-fill id. The host resolves these
		 * against installed first-party or bridged marketplace fill code. */
		readonly fills?: Readonly<Record<SurfaceId, string>>;
		/** The `sessionMode:"none"` start surface. The shipped shell derives
		 *  start-vs-session from session presence on ONE surface id. */
		readonly start: SurfaceId;
		readonly session: SurfaceId;
		readonly switchPolicy?: "remember" | "resetToStart";
	};
}
