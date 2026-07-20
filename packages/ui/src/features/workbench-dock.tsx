// WorkbenchDock — the host-agnostic bridge that lets a tool card push its full
// content into the app's right-hand dock: a read/write file into the Files view,
// an edit/ast_edit diff into the Diff view. Generalizes the original diff-only
// `DiffPanel` seed (kept as a back-compat shim in features/diff/diff-panel.tsx).
//
// Two contexts, on purpose:
//   • Commands (`openFile`/`openDiff`) — consumed by tool cards. The provider
//     supplies a STABLE object so cards never re-render when a request changes.
//   • State (`fileRequest`/`diffRequest`) — consumed by the dock views, which
//     react to the latest open request (the `nonce` re-fires repeat opens).
//
// A host without a dock simply omits the commands; the "Open" affordance then
// hides itself (the kitchen-sink wires the commands to overlays instead).

import { createContext, type ReactNode, use, useCallback, useMemo, useRef, useState } from "react";
import type { DiffViewerFile } from "./diff/diff-viewer";

export interface OpenFilePayload {
	readonly path: string;
	/** Optional selector tail (e.g. `:50-100`) — reserved for future scroll-to-line. */
	readonly selector?: string;
}

export interface OpenDiffPayload {
	readonly path?: string;
	readonly files: readonly DiffViewerFile[];
}

/**
 * A pure-data descriptor a tool body hands to `ToolBodySection` so it can render
 * an "Open ↗" affordance wired to the host dock. Tool renderers are plain
 * `(call) => ToolView` functions and cannot call hooks, so they emit this instead
 * of a callback; `ToolBodySection` resolves the matching opener from context.
 */
export type OpenTarget = ({ readonly kind: "file" } & OpenFilePayload) | ({ readonly kind: "diff" } & OpenDiffPayload);

/**
 * Imperative openers a tool card calls to push content into the host's dock.
 * An omitted opener hides the matching affordance (host has no place to open it).
 */
export interface WorkbenchDockCommands {
	readonly openFile?: (payload: OpenFilePayload) => void;
	readonly openDiff?: (payload: OpenDiffPayload) => void;
	readonly openCommandTab?: (tab: string) => void;
}

/** The latest file open request. `nonce` changes on every open so the dock view's
 *  selection effect re-fires even when the same path is opened twice. */
export interface WorkbenchFileRequest extends OpenFilePayload {
	readonly nonce: number;
}
export interface WorkbenchDiffRequest extends OpenDiffPayload {
	readonly nonce: number;
}

/** Latest open requests, surfaced to the dock views (Files / Diff). */
export interface WorkbenchDockState {
	readonly fileRequest: WorkbenchFileRequest | null;
	readonly diffRequest: WorkbenchDiffRequest | null;
}

const EMPTY_STATE: WorkbenchDockState = { fileRequest: null, diffRequest: null };

const WorkbenchDockCommandsContext = createContext<WorkbenchDockCommands>({});
const WorkbenchDockStateContext = createContext<WorkbenchDockState>(EMPTY_STATE);

export function WorkbenchDockProvider({
	commands,
	state = EMPTY_STATE,
	children,
}: {
	readonly commands: WorkbenchDockCommands;
	readonly state?: WorkbenchDockState;
	readonly children: ReactNode;
}) {
	return (
		<WorkbenchDockCommandsContext.Provider value={commands}>
			<WorkbenchDockStateContext.Provider value={state}>{children}</WorkbenchDockStateContext.Provider>
		</WorkbenchDockCommandsContext.Provider>
	);
}

/** Openers for tool cards. Stable identity → no card re-render when a request changes. */
export function useWorkbenchDock(): WorkbenchDockCommands {
	return use(WorkbenchDockCommandsContext);
}

/** Latest open request, for the dock views. */
export function useWorkbenchDockState(): WorkbenchDockState {
	return use(WorkbenchDockStateContext);
}

export interface WorkbenchDockController {
	readonly commands: WorkbenchDockCommands;
	readonly state: WorkbenchDockState;
}

/**
 * Owns the open-request state and builds stable openers. `onOpen(kind)` lets the
 * host reveal the dock and switch to the matching tab when an open is requested.
 * Mount the returned `commands`/`state` on a `WorkbenchDockProvider`.
 */
export function useWorkbenchDockController(
	onOpen?: (kind: "file" | "diff") => void,
	onOpenCommandTab?: (tab: string) => void,
): WorkbenchDockController {
	const [fileRequest, setFileRequest] = useState<WorkbenchFileRequest | null>(null);
	const [diffRequest, setDiffRequest] = useState<WorkbenchDiffRequest | null>(null);
	const nonceRef = useRef(0);
	const openFile = useCallback(
		(payload: OpenFilePayload) => {
			nonceRef.current += 1;
			setFileRequest({ ...payload, nonce: nonceRef.current });
			onOpen?.("file");
		},
		[onOpen],
	);
	const openDiff = useCallback(
		(payload: OpenDiffPayload) => {
			nonceRef.current += 1;
			setDiffRequest({ ...payload, nonce: nonceRef.current });
			onOpen?.("diff");
		},
		[onOpen],
	);
	const commands = useMemo<WorkbenchDockCommands>(
		() => ({ openFile, openDiff, openCommandTab: onOpenCommandTab }),
		[openFile, openDiff, onOpenCommandTab],
	);
	const state = useMemo<WorkbenchDockState>(() => ({ fileRequest, diffRequest }), [fileRequest, diffRequest]);
	return { commands, state };
}
