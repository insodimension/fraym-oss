import type { Unsubscribe, WorkspaceRef } from "./session-driver";

export type EngineConfigValueType = "boolean" | "string" | "number" | "enum" | "array" | "record" | "unknown";
export type EngineConfigScope = "default" | "global" | "project" | "session" | "runtime";
export type EngineConfigControl = "switch" | "select" | "text" | "number" | "json" | "custom";

export interface EngineConfigOption {
	readonly value: string;
	readonly label: string;
	readonly description?: string;
}

export interface EngineConfigSettingRecord {
	readonly path: string;
	readonly label: string;
	readonly description?: string;
	readonly group: string;
	readonly type: EngineConfigValueType;
	readonly control: EngineConfigControl;
	readonly defaultValue?: unknown;
	readonly options?: readonly EngineConfigOption[];
	readonly writable: boolean;
	readonly sensitive?: boolean;
	readonly advanced?: boolean;
	readonly restartRequired?: boolean;
	readonly exposedInNativeUi?: boolean;
	readonly source: string;
}

export interface EngineConfigCatalog {
	readonly engineId: string;
	readonly engineFamily: string;
	readonly configDialect: string;
	readonly records: readonly EngineConfigSettingRecord[];
}

export interface EngineConfigValueRecord {
	readonly path: string;
	readonly value: unknown;
	readonly defaultValue?: unknown;
	readonly scope: EngineConfigScope;
	readonly changed: boolean;
}

export interface EngineConfigSnapshot {
	readonly workspace: WorkspaceRef;
	readonly values: readonly EngineConfigValueRecord[];
}

/** Engine config (⚙️) changed outside this client — keys are advisory; refetch, don't patch. */
export interface EngineConfigChange {
	readonly keys: readonly string[];
}

export type EngineConfigChangeListener = (change: EngineConfigChange) => void;

export interface EngineConfigDriver {
	getConfigCatalog(workspace: WorkspaceRef): Promise<EngineConfigCatalog>;
	getConfigSnapshot(workspace: WorkspaceRef): Promise<EngineConfigSnapshot>;
	setConfigValue(workspace: WorkspaceRef, path: string, value: unknown): Promise<EngineConfigSnapshot>;
	resetConfigValue(workspace: WorkspaceRef, path: string): Promise<EngineConfigSnapshot>;
	/**
	 * Present when the transport can push config-change notifications
	 * (capability-gated; absent on pull-only drivers). The UI refreshes its
	 * snapshot on every change so external writes (TUI, hand edits) converge.
	 */
	subscribeConfigChanges?(listener: EngineConfigChangeListener): Unsubscribe;
}
