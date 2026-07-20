"use client";
import { createContext } from "react";
import type { IconName } from "../icons";

/** A dock button any page can publish: rendered in the workspace TopBar's
 *  right slot by WorkspaceChrome. The first page to register a handle wins the
 *  slot; null when no page with a dock button is mounted. */
export interface PageDockButton {
	readonly label: string;
	readonly icon: IconName;
}

/** The handle a page publishes so the workspace chrome can host its dock
 *  button. `onOpen` triggers the page's dock-open flow (the frame model wires
 *  it to dock-open + session creation). The chrome hides the button once the
 *  dock is already open — the dock's own header serves as the close affordance. */
export interface PageDockHandle {
	readonly button: PageDockButton;
	readonly onOpen: () => void;
}

export interface PageDockContextValue {
	readonly dockHandle: PageDockHandle | null;
	readonly registerDock: (handle: PageDockHandle | null) => void;
}

export const PageDockContext = createContext<PageDockContextValue>({
	dockHandle: null,
	registerDock: () => {},
});
