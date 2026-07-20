import type { WorkspaceRef } from "./session-driver";

// Fraym UI config persistence — independent of the engine's own config (Engine).
// Mirrors how editors store prefs: a per-user file at `~/.fraym/config.json` and a
// per-project file at `<workspace>/.fraym/config.json` (like `.claude` / `.codex`),
// merged project-over-user. The browser can't touch disk, so the host/engine
// implements this and the UI talks to it through this driver — NOT localStorage.

export type FraymConfigScope = "user" | "project";

export interface FraymConfigSnapshot {
	readonly workspace: WorkspaceRef;
	/** Project-over-user merged view — what the UI applies. */
	readonly merged: Record<string, unknown>;
	/** Raw per-scope layers (so the UI can show "set here" + reset a scope). */
	readonly user: Record<string, unknown>;
	readonly project: Record<string, unknown>;
	/** Absolute backing files. `projectPath` is null when there's no workspace path. */
	readonly userPath: string;
	readonly projectPath: string | null;
}

export interface FraymConfigDriver {
	/** Load + merge `~/.fraym/config.json` (user) and `<ws>/.fraym/config.json` (project). */
	load(workspace: WorkspaceRef): Promise<FraymConfigSnapshot>;
	/** Set one key in a scope's file (default writes go to "user"). Returns the fresh snapshot. */
	setValue(
		workspace: WorkspaceRef,
		key: string,
		value: unknown,
		scope: FraymConfigScope,
	): Promise<FraymConfigSnapshot>;
	/** Remove one key from a scope's file (falls back to the other layer / built-in default). */
	unsetValue(workspace: WorkspaceRef, key: string, scope: FraymConfigScope): Promise<FraymConfigSnapshot>;
}
