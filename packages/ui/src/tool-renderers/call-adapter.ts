import type { ActiveToolCall } from "../hooks/session-types";
import type { ToolStatus } from "../registries/tool-renderer-registry";
import type { ToolCallState } from "../thread-state";

export function toToolCallState(call: ActiveToolCall): ToolCallState {
	return {
		id: call.callId,
		name: call.displayName ?? call.toolName,
		input: call.input,
		output: call.output,
		status: call.status === "success" ? "succeeded" : call.status === "error" ? "failed" : "running",
	};
}

export function toToolStatus(call: ActiveToolCall): ToolStatus {
	return call.status === "success" ? "success" : call.status === "error" ? "error" : "pending";
}
