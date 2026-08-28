import type { AgentEvent, ApprovalDecision, ToolCallStatus } from "@fraym-ai/driver";

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

export interface ThreadApproval {
  id: string;
  prompt: string;
  decision: ApprovalDecision | null;
}

export interface ThreadReasoning {
  messageId: string;
  content: string;
  streaming: boolean;
}

export type ThreadItem =
  | { kind: "message"; id: string }
  | { kind: "tool"; id: string }
  | { kind: "approval"; id: string }
  | { kind: "reasoning"; id: string };

/** @deprecated Use ToolCallState. */
export type ThreadToolCall = ToolCallState;

export type ThreadPhase = "idle" | "running" | "done" | "error";

export interface ThreadState {
  sessionId: string | null;
  messages: readonly ThreadMessage[];
  toolCalls: readonly ToolCallState[];
  approvals: readonly ThreadApproval[];
  reasoning: readonly ThreadReasoning[];
  items: readonly ThreadItem[];
  phase: ThreadPhase;
  error: string | null;
  waiting: boolean;
}

export function createThreadState(): ThreadState {
  return {
    sessionId: null,
    messages: [],
    toolCalls: [],
    approvals: [],
    reasoning: [],
    items: [],
    phase: "idle",
    error: null,
    waiting: false,
  };
}

function settleReasoning(state: ThreadState): ThreadState {
  if (!state.reasoning.some((trace) => trace.streaming)) {
    return state;
  }

  return {
    ...state,
    reasoning: state.reasoning.map((trace) =>
      trace.streaming ? { ...trace, streaming: false } : trace,
    ),
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
  const current = event.type === "reasoning.delta" ? state : settleReasoning(state);

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
        ...current,
        messages: [
          ...current.messages,
          { id: event.messageId, role: "user", content: event.content },
        ],
        items: [...current.items, { kind: "message", id: event.messageId }],
        phase: "running",
        error: null,
        waiting: true,
      };

    case "assistant.message.delta": {
      const messageIndex = current.messages.findIndex(
        (message) => message.id === event.messageId,
      );

      if (messageIndex === -1) {
        return {
          ...current,
          messages: [
            ...current.messages,
            { id: event.messageId, role: "assistant", content: event.delta },
          ],
          items: [...current.items, { kind: "message", id: event.messageId }],
          waiting: false,
        };
      }

      return {
        ...current,
        messages: current.messages.map((message) =>
          message.id === event.messageId
            ? { ...message, content: `${message.content}${event.delta}` }
            : message,
        ),
        waiting: false,
      };
    }

    case "reasoning.delta": {
      const existing = state.reasoning.find(
        (trace) => trace.messageId === event.messageId,
      );

      if (existing === undefined) {
        return {
          ...state,
          reasoning: [
            ...state.reasoning,
            { messageId: event.messageId, content: event.delta, streaming: true },
          ],
          items: [...state.items, { kind: "reasoning", id: event.messageId }],
          waiting: false,
        };
      }

      return {
        ...state,
        reasoning: state.reasoning.map((trace) =>
          trace.messageId === event.messageId
            ? { ...trace, content: `${trace.content}${event.delta}`, streaming: true }
            : trace,
        ),
        waiting: false,
      };
    }

    case "tool_call.start":
      return {
        ...current,
        toolCalls: [
          ...current.toolCalls,
          {
            id: event.toolCallId,
            name: event.toolName,
            status: event.status,
            input: event.input,
            output: undefined,
          },
        ],
        items: [...current.items, { kind: "tool", id: event.toolCallId }],
        waiting: true,
      };

    case "tool_call.update":
    case "tool_call.end":
      return {
        ...current,
        toolCalls: updateToolCall(
          current.toolCalls,
          event.toolCallId,
          event.status,
          event.output,
        ),
        waiting: event.type === "tool_call.end",
      };

    case "session.done":
      return { ...current, phase: "done", waiting: false };

    case "session.error":
      return {
        ...current,
        error: event.message,
        phase: "error",
        waiting: false,
      };

    case "approval.request":
      return {
        ...current,
        approvals: [
          ...current.approvals,
          { id: event.approvalId, prompt: event.prompt, decision: null },
        ],
        items: [...current.items, { kind: "approval", id: event.approvalId }],
        waiting: false,
      };

    case "approval.response":
      return {
        ...current,
        approvals: current.approvals.map((approval) =>
          approval.id === event.approvalId
            ? { ...approval, decision: event.decision }
            : approval,
        ),
        waiting: true,
      };

    // A notice is rendered from the driver's transcript, not from this reducer's
    // item list, so the thread state is unaffected. `state`, not `current`: a
    // notice must not settle an open reasoning block either.
    case "session.notice":
      return state;

    // The context meter is not thread content — it lives on the driver snapshot.
    // Returning `state` rather than `current` on purpose: a usage frame that lands
    // mid-reasoning must not settle the open reasoning block.
    case "context.usage":
      return state;

    // Model/effort configuration is driver-snapshot state, not transcript content.
    // `state` for the same reason as above: the engine reports config changes on the
    // same lane as everything else, and one landing mid-reasoning must not settle
    // the open block.
    case "session.config":
      return state;
  }
}
