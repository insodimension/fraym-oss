import type { ActiveToolCall } from "./session-types";

const EMPTY_TOOL_STREAM: readonly ActiveToolCall[] = Object.freeze([]);

export function useToolStream(): readonly ActiveToolCall[] {
	return EMPTY_TOOL_STREAM;
}
