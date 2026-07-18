export interface WorkspaceRef {
  readonly workspaceId: string;
  readonly path: string;
  readonly displayName?: string;
}
export interface SessionRef {
  readonly workspaceId: string;
  readonly sessionId: string;
}
export interface SessionTextBlock {
  readonly type: "text";
  readonly text: string;
}
export interface SessionMessage {
  readonly id?: string;
  readonly role: "user" | "agent" | "assistant";
  readonly blocks: readonly SessionTextBlock[];
}
export interface SessionSnapshot {
  readonly ref: SessionRef;
  readonly workspace: WorkspaceRef;
  readonly title: string;
  readonly status: "idle" | "running" | "failed";
  readonly updatedAt: string;
  readonly transcript?: readonly SessionMessage[];
  readonly contextUsage?: {
    readonly tokens: number;
    readonly contextWindow: number;
    readonly percent: number;
  };
  readonly archivedAt?: string;
  readonly config?: {
    readonly provider?: string;
    readonly modelId?: string;
    readonly thinkingLevel?: string;
    readonly approvalMode?: string;
    readonly activeTeam?: string | null;
    readonly ephemeral?: boolean;
  } | undefined;
}
export interface CreateSessionOptions {
  readonly title?: string;
  readonly initialModel?: {
    readonly provider: string;
    readonly modelId: string;
  };
  readonly initialThinkingLevel?: string;
}
export interface SessionMessageInput {
  readonly text: string;
  readonly deliverAs?: "steer" | "followUp";
}
export type SessionDriverEvent = {
  readonly type: string;
  readonly sessionRef: SessionRef;
  readonly timestamp: string;
  readonly transcript?: readonly SessionMessage[];
  readonly snapshot?: SessionSnapshot;
  readonly [key: string]: unknown;
};
export type SessionEventListener = (
  event: SessionDriverEvent,
) => void | Promise<void>;
export type Unsubscribe = () => void;
export interface SessionDriver {
  listSessions(workspace: WorkspaceRef): Promise<readonly SessionSnapshot[]>;
  createSession(
    workspace: WorkspaceRef,
    options?: CreateSessionOptions,
  ): Promise<SessionSnapshot>;
  openSession(
    ref: SessionRef,
    initialSnapshot?: SessionSnapshot | null,
  ): Promise<SessionSnapshot>;
  closeSession(ref: SessionRef): Promise<void>;
  sendUserMessage(ref: SessionRef, input: SessionMessageInput): Promise<void>;
  subscribe(ref: SessionRef, listener: SessionEventListener): Unsubscribe;
}
export type EngineConfigValueType =
  "boolean" | "string" | "number" | "enum" | "array" | "record" | "unknown";
export type EngineConfigScope =
  "default" | "global" | "project" | "session" | "runtime";
export type EngineConfigControl =
  "switch" | "select" | "text" | "number" | "json" | "custom";
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
export interface EngineConfigChange {
  readonly keys: readonly string[];
}
export type EngineConfigChangeListener = (change: EngineConfigChange) => void;
export interface EngineConfigDriver {
  getConfigCatalog(workspace: WorkspaceRef): Promise<EngineConfigCatalog>;
  getConfigSnapshot(workspace: WorkspaceRef): Promise<EngineConfigSnapshot>;
  setConfigValue(
    workspace: WorkspaceRef,
    path: string,
    value: unknown,
  ): Promise<EngineConfigSnapshot>;
  resetConfigValue(
    workspace: WorkspaceRef,
    path: string,
  ): Promise<EngineConfigSnapshot>;
  subscribeConfigChanges?(listener: EngineConfigChangeListener): Unsubscribe;
}
