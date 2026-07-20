import { useEffect } from "react";
import { useSessionOptional } from "../../hooks/use-session";
import { useWorkbenchDock } from "../workbench-dock";
import { dockTabForRenderKind } from "./command-dock";

/**
 * Bridges live slash-command results to the dock: when a command whose
 * render-kind targets a panel completes, reveal that panel. Mounted once inside
 * the dock + session providers; renders nothing. Binds to the neutral
 * render-kind (LAW 2), so it routes any command the model maps — no per-command
 * knowledge here.
 *
 * The Plan tab is NOT opened when plan mode merely turns on (`/plan xyz` used
 * to pop the dock on an empty plan). The engine journals the finalized plan as
 * a `renderKind: "plan"` command result the moment it is ready for review —
 * that live `commandResult` event below is the open trigger, so the dock
 * reveals the plan exactly when there is a plan to show, alongside the
 * approval choices.
 */
export function CommandDockAutoOpen() {
	const session = useSessionOptional();
	const dock = useWorkbenchDock();
	const driver = session?.driver;
	const sessionRef = session?.sessionRef;
	const openCommandTab = dock.openCommandTab;

	useEffect(() => {
		if (!driver || !sessionRef || !openCommandTab) return;
		return driver.subscribe(sessionRef, event => {
			if (event.type !== "commandResult") return;
			const renderKind = event.renderKind;
			if (renderKind && dockTabForRenderKind(renderKind)) openCommandTab(renderKind);
		});
	}, [driver, sessionRef, openCommandTab]);

	return null;
}
