/**
 * Shared helpers for constructing synthetic `ActiveToolCall`-compatible objects
 * and `AgentToolResult`-shaped output in test/demo fixtures.
 *
 * Every kitchen-sink entry was duplicating `toolResult`/`pendingToolCall` inline
 * with identical `{ content: [{ type: "text", text }], details, isError }` and
 * `{ callId, toolName, input, status: "running" }` shapes. This file consolidates
 * those patterns.
 */

// ---------------------------------------------------------------------------
// Result builders (AgentToolResult shape)
// ---------------------------------------------------------------------------

/**
 * Standard `AgentToolResult`-shaped output: `{ content, details, isError }`.
 *
 * @param text    The text content (wrapped as `[{ type: "text", text }]`).
 * @param details Optional structured details, default `{}`.
 * @param isError Whether the tool produced an error, default `false`.
 */
export function toolResult(text: string, details: Record<string, unknown> = {}, isError = false): unknown {
	return { content: [{ type: "text", text }], details, isError };
}

/**
 * Same as `toolResult` but accepts `undefined` text — returns `undefined` when
 * text is absent. Used by tools whose output may not have text content
 * (ask, calc, resolve).
 */
export function optionalToolResult(
	text: string | undefined,
	details: Record<string, unknown> | undefined,
	isError = false,
): unknown | undefined {
	if (text === undefined) return undefined;
	return { content: [{ type: "text", text }], details, isError };
}

// ---------------------------------------------------------------------------
// Pending tool call builder
// ---------------------------------------------------------------------------

/**
 * A bare `ActiveToolCall`-compatible object with `status: "running"`.
 *
 * Consumers assign this to their local `ActiveToolCall` type — the structural
 * shape is compatible (all optional fields are absent).
 *
 * @param callId   Unique id for this call.
 * @param toolName Name of the tool (e.g. `"bash"`, `"find"`).
 * @param input    Tool input parameters.
 */
export function pendingToolCall(
	callId: string,
	toolName: string,
	input?: unknown,
): { callId: string; toolName: string; input?: unknown; status: "running" } {
	return { callId, toolName, input, status: "running" as const };
}
