import type { ReactNode } from "react";

/**
 * A dock panel: which dock tab it renders into + how it renders its payload.
 *
 * The dock is a source-agnostic content surface: slash commands, tool results,
 * session events, and plugins all `registerDockPanel` and `openDockPanel` the
 * same way. `kind` is a neutral panel id ("usage", "browser", "plan"), never a
 * command name (LAW 2). `tab` is either the shared "insights" multiplexer tab or
 * a dedicated dock tab ("plan", "tasks", "tree").
 */
export interface DockPanel {
	/** Dock tab id this panel renders into. */
	readonly tab: string;
	/**
	 * Render the panel for an open request. `payload` is whatever the source
	 * handed to `openDockPanel`; panels that need it narrow `unknown` themselves,
	 * and panels driven by live session state simply ignore it.
	 */
	readonly render: (payload: unknown) => ReactNode;
}

/**
 * Panel kinds are inserted at runtime — built-ins register at module load,
 * plugins/MCP can register later — so a Map (not a static Record) is the right
 * structure here.
 */
const DOCK_PANELS = new Map<string, DockPanel>();

/** Register a panel under a neutral `kind`. Last registration wins. */
export function registerDockPanel(kind: string, panel: DockPanel): void {
	DOCK_PANELS.set(kind, panel);
}

/** The panel registered for `kind`, or undefined when nothing claims it. */
export function getDockPanel(kind: string | null | undefined): DockPanel | undefined {
	return kind ? DOCK_PANELS.get(kind) : undefined;
}

/** The dock tab a panel kind renders into, or undefined when unregistered. */
export function dockTabForPanel(kind: string | null | undefined): string | undefined {
	return getDockPanel(kind)?.tab;
}

/** Render a registered panel's UI for an open request, or null when unregistered. */
export function renderDockPanel(kind: string | null | undefined, payload: unknown): ReactNode {
	return getDockPanel(kind)?.render(payload) ?? null;
}
