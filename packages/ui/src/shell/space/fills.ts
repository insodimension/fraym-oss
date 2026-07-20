import type { ComponentType } from "react";

/** A workspace-surface implementation registered by an installed space box.
 *
 * Fraym owns the host and passes the host contract down; the box owns the
 * component. Keeping this type generic makes the registry a dependency leaf —
 * it never imports the shell's large host-props interface. */
export type WorkspaceSurfaceFill<Props> = ComponentType<Props>;

/** Namespaced fill id → implementation. Hosts merge their registered fills over
 * Fraym's defaults; a missing id must render an honest notice, never vanish. */
export type WorkspaceSurfaceFills<Props> = Readonly<Record<string, WorkspaceSurfaceFill<Props>>>;

export function resolveWorkspaceSurfaceFill<Props>(
	fills: WorkspaceSurfaceFills<Props>,
	id: string | undefined,
): WorkspaceSurfaceFill<Props> | null {
	return id ? (fills[id] ?? null) : null;
}
