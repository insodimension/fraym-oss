import type { AgentEvent, ToolCallStatus } from "@fraym/driver";

export type ThreadMessageRole = "user" | "assistant";

export interface ThreadMessage {
  id: string;
  role: ThreadMessageRole;
  content: string;
}

export interface ToolCallState {
  id: string;
  name: string;
  status: ToolCallStatus;
  input: unknown;
  output: unknown;
}

/** @deprecated Use ToolCallState. */
export type ThreadToolCall = ToolCallState;

export type ThreadPhase = "idle" | "running" | "done" | "error";

export interface ThreadState {
  sessionId: string | null;
  messages: readonly ThreadMessage[];
  toolCalls: readonly ToolCallState[];
  phase: ThreadPhase;
  error: string | null;
  waiting: boolean;
}

export function createThreadState(): ThreadState {
  return {
    sessionId: null,
    messages: [],
    toolCalls: [],
    phase: "idle",
    error: null,
    waiting: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function accumulateToolOutput(previous: unknown, next: unknown): unknown {
  if (next === undefined) {
    return previous;
  }

  if (typeof previous === "string" && typeof next === "string") {
    return `${previous}${next}`;
  }

  if (Array.isArray(previous) && Array.isArray(next)) {
    return [...previous, ...next];
  }

  if (isRecord(previous) && isRecord(next)) {
    const accumulated: Record<string, unknown> = { ...previous };
    for (const [key, value] of Object.entries(next)) {
      accumulated[key] = key in previous
        ? accumulateToolOutput(previous[key], value)
        : value;
    }
    return accumulated;
  }

  return next;
}

function updateToolCall(
  toolCalls: readonly ToolCallState[],
  toolCallId: string,
  status: ToolCallStatus,
  output: unknown,
): readonly ToolCallState[] {
  const existingIndex = toolCalls.findIndex((toolCall) => toolCall.id === toolCallId);
  if (existingIndex === -1) {
    return [
      ...toolCalls,
      { id: toolCallId, name: "tool call", status, input: undefined, output },
    ];
  }

  return toolCalls.map((toolCall) =>
    toolCall.id === toolCallId
      ? {
          ...toolCall,
          status,
          output: accumulateToolOutput(toolCall.output, output),
        }
      : toolCall,
  );
}

export function reduceThreadEvent(
  state: ThreadState,
  event: AgentEvent,
): ThreadState {
  switch (event.type) {
    case "session.start":
      return {
        ...createThreadState(),
        sessionId: event.sessionId,
        phase: "running",
        waiting: true,
      };

    case "user.message":
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: event.messageId, role: "user", content: event.content },
        ],
        waiting: true,
      };

    case "assistant.message.delta": {
      const messageIndex = state.messages.findIndex(
        (message) => message.id === event.messageId,
      );

      if (messageIndex === -1) {
        return {
          ...state,
          messages: [
            ...state.messages,
            { id: event.messageId, role: "assistant", content: event.delta },
          ],
          waiting: false,
        };
      }

      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === event.messageId
            ? { ...message, content: `${message.content}${event.delta}` }
            : message,
        ),
        waiting: false,
      };
    }

    case "tool_call.start":
      return {
        ...state,
        toolCalls: [
          ...state.toolCalls,
          {
            id: event.toolCallId,
            name: event.toolName,
            status: event.status,
            input: event.input,
            output: undefined,
          },
        ],
        waiting: true,
      };

    case "tool_call.update":
    case "tool_call.end":
      return {
        ...state,
        toolCalls: updateToolCall(
          state.toolCalls,
          event.toolCallId,
          event.status,
          event.output,
        ),
        waiting: event.type === "tool_call.end",
      };

    case "session.done":
      return { ...state, phase: "done", waiting: false };

    case "session.error":
      return {
        ...state,
        error: event.message,
        phase: "error",
        waiting: false,
      };

    case "approval.request":
    case "approval.response":
      return state;
  }
}
