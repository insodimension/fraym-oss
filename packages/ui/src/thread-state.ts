import type { AgentEvent, ToolCallStatus } from "@fraym/driver";

export type ThreadMessageRole = "user" | "assistant";

export interface ThreadMessage {
  id: string;
  role: ThreadMessageRole;
  content: string;
}

export interface ThreadToolCall {
  id: string;
  name: string;
  status: ToolCallStatus;
}

export type ThreadPhase = "idle" | "running" | "done" | "error";

export interface ThreadState {
  sessionId: string | null;
  messages: readonly ThreadMessage[];
  toolCalls: readonly ThreadToolCall[];
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

function updateToolCall(
  toolCalls: readonly ThreadToolCall[],
  toolCallId: string,
  status: ToolCallStatus,
): readonly ThreadToolCall[] {
  const existingIndex = toolCalls.findIndex((toolCall) => toolCall.id === toolCallId);
  if (existingIndex === -1) {
    return [...toolCalls, { id: toolCallId, name: "tool call", status }];
  }

  return toolCalls.map((toolCall) =>
    toolCall.id === toolCallId ? { ...toolCall, status } : toolCall,
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
          },
        ],
        waiting: true,
      };

    case "tool_call.update":
    case "tool_call.end":
      return {
        ...state,
        toolCalls: updateToolCall(state.toolCalls, event.toolCallId, event.status),
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
