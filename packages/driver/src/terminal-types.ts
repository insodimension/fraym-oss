import type { Unsubscribe, WorkspaceRef } from "./session-driver";

export type TerminalSessionStatus = "starting" | "running" | "exited" | "error";
export type TerminalEventType = "started" | "output" | "updated" | "exited" | "error";

export interface TerminalSessionRef {
	readonly workspaceId: string;
	readonly terminalId: string;
}

export interface TerminalOpenOptions {
	/** The chat session this terminal belongs to. Scopes terminals per session so
	 *  one session's PTYs never surface in another (same workspace). Absent = a
	 *  workspace-level terminal. */
	readonly sessionId?: string;
	readonly cwd?: string;
	readonly cols?: number;
	readonly rows?: number;
	readonly env?: Readonly<Record<string, string>>;
	readonly shell?: string;
	readonly command?: string;
}

export interface TerminalSessionSnapshot {
	readonly ref: TerminalSessionRef;
	/** The chat session that owns this terminal; undefined for workspace-level ones. */
	readonly sessionId?: string;
	readonly workspace: WorkspaceRef;
	readonly cwd: string;
	readonly shell?: string;
	readonly command?: string;
	readonly title: string;
	readonly status: TerminalSessionStatus;
	readonly cols: number;
	readonly rows: number;
	readonly history: string;
	readonly hasVisibleContent: boolean;
	readonly exitCode?: number;
	readonly error?: string;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface TerminalEvent {
	readonly type: TerminalEventType;
	readonly ref: TerminalSessionRef;
	readonly timestamp: string;
	readonly data?: string;
	readonly snapshot?: TerminalSessionSnapshot;
	readonly exitCode?: number;
	readonly error?: string;
}

export type TerminalEventListener = (event: TerminalEvent) => void | Promise<void>;

export interface TerminalDriver {
	listTerminals(workspace: WorkspaceRef): Promise<readonly TerminalSessionSnapshot[]>;
	openTerminal(workspace: WorkspaceRef, options?: TerminalOpenOptions): Promise<TerminalSessionSnapshot>;
	writeTerminal(ref: TerminalSessionRef, data: string): Promise<void>;
	resizeTerminal(ref: TerminalSessionRef, cols: number, rows: number): Promise<TerminalSessionSnapshot>;
	closeTerminal(ref: TerminalSessionRef): Promise<void>;
	subscribeTerminal(ref: TerminalSessionRef, listener: TerminalEventListener): Unsubscribe;
}
