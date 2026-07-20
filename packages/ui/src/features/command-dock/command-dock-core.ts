import type { DockTab } from "../right-dock";

/**
 * Render-kind metadata for the thread chip and ephemeral command tabs (label +
 * icon per command output kind). Keyed by the neutral render-kind, never
 * command names (LAW 2).
 */
export const RENDER_KIND_META: Readonly<Record<string, DockTab>> = {
	usage: { id: "usage", label: "Usage", icon: "card" },
	context: { id: "context", label: "Context", icon: "db" },
	tools: { id: "tools", label: "Tools", icon: "spark" },
	session: { id: "session", label: "Session", icon: "card" },
	mcp: { id: "mcp", label: "MCP", icon: "shield" },
	tasks: { id: "tasks", label: "Tasks", icon: "grid" },
	plan: { id: "plan", label: "Plan", icon: "list" },
	tree: { id: "tree", label: "Tree", icon: "branch" },
};

/**
 * Command-output presentation map: a command's render-kind → the dock TAB it
 * opens. usage/context/tools share the single "insights" multiplexer tab;
 * tasks/plan/tree open their own dedicated tabs. The UI binds to the neutral
 * render-kind; the command→render-kind binding lives in the host driver adapters.
 */
export const RENDER_KIND_TO_DOCK_TAB: Readonly<Record<string, string>> = {
	usage: "insights",
	context: "insights",
	tools: "insights",
	session: "insights",
	mcp: "insights",
	tasks: "tasks",
	plan: "plan",
	tree: "tree",
};

/** The dock tab a command's render-kind opens, or undefined for inline. */
export function dockTabForRenderKind(renderKind: string | undefined | null): string | undefined {
	return renderKind ? RENDER_KIND_TO_DOCK_TAB[renderKind] : undefined;
}
