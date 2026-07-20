// Back-compat shim for the original diff-only side-panel context. The general
// surface now lives in features/workbench-dock.tsx (openFile + openDiff). These
// re-exports keep existing call sites (the kitchen-sink edit demo + DemoDock)
// working unchanged; new code should use `useWorkbenchDock` / `WorkbenchDockProvider`.

import type { ReactNode } from "react";
import { type OpenDiffPayload, useWorkbenchDock, WorkbenchDockProvider } from "../workbench-dock";

export interface DiffPanelApi {
	/** Open the full diff in the host's side panel. Omit to hide the affordance. */
	readonly openDiff?: (payload: OpenDiffPayload) => void;
}

export function DiffPanelProvider({ value, children }: { readonly value: DiffPanelApi; readonly children: ReactNode }) {
	return <WorkbenchDockProvider commands={{ openDiff: value.openDiff }}>{children}</WorkbenchDockProvider>;
}

export function useDiffPanel(): DiffPanelApi {
	const { openDiff } = useWorkbenchDock();
	return { openDiff };
}
