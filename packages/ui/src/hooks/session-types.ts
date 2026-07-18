import type { ToolCallMetadata } from "@fraym/driver";

export type ToolCallStatus = "running" | "success" | "error";

export interface ActiveToolCall {
	readonly callId: string;
	readonly toolName: string;
	/** Human display name (MCP `title` / humanized); preferred over `toolName` in generic cards. */
	readonly displayName?: string;
	readonly input?: unknown;
	readonly status: ToolCallStatus;
	readonly text?: string;
	readonly progress?: number;
	readonly output?: unknown;
	readonly metadata?: ToolCallMetadata;
}
