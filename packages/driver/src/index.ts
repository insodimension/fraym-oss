export type ToolCallStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type ApprovalDecision = "approved" | "rejected";

interface AgentEventBase {
  sessionId: string;
}

export interface SessionStartEvent extends AgentEventBase {
  type: "session.start";
}

export interface UserMessageEvent extends AgentEventBase {
  type: "user.message";
  messageId: string;
  content: string;
}

export interface AssistantMessageDeltaEvent extends AgentEventBase {
  type: "assistant.message.delta";
  messageId: string;
  delta: string;
}

export interface ToolCallStartEvent extends AgentEventBase {
  type: "tool_call.start";
  toolCallId: string;
  toolName: string;
  input: unknown;
  status: "pending" | "running";
}

export interface ToolCallUpdateEvent extends AgentEventBase {
  type: "tool_call.update";
  toolCallId: string;
  status: ToolCallStatus;
  output?: unknown;
}

export interface ToolCallEndEvent extends AgentEventBase {
  type: "tool_call.end";
  toolCallId: string;
  status: "succeeded" | "failed" | "cancelled";
  output?: unknown;
}

export interface ApprovalRequestEvent extends AgentEventBase {
  type: "approval.request";
  approvalId: string;
  prompt: string;
}

export interface ApprovalResponseEvent extends AgentEventBase {
  type: "approval.response";
  approvalId: string;
  decision: ApprovalDecision;
}

export interface SessionDoneEvent extends AgentEventBase {
  type: "session.done";
}

export interface SessionErrorEvent extends AgentEventBase {
  type: "session.error";
  message: string;
}

export type AgentEvent =
  | SessionStartEvent
  | UserMessageEvent
  | AssistantMessageDeltaEvent
  | ToolCallStartEvent
  | ToolCallUpdateEvent
  | ToolCallEndEvent
  | ApprovalRequestEvent
  | ApprovalResponseEvent
  | SessionDoneEvent
  | SessionErrorEvent;

const terminalToolCallStatuses = new Set<ToolCallStatus>([
  "succeeded",
  "failed",
  "cancelled",
]);

export function isTerminalToolCallStatus(status: ToolCallStatus): boolean {
  return terminalToolCallStatuses.has(status);
}

export type AgentEventListener = (event: AgentEvent) => void;
export type Unsubscribe = () => void;

export interface AgentEventStream {
  subscribe(listener: AgentEventListener): Unsubscribe;
}

export interface ReplayDriverOptions {
  /** Delay before each event when `delays` does not provide one. */
  delay?: number;
  /** Per-event delays, in milliseconds. Values fall back to `delay`. */
  delays?: readonly number[];
  /** Starts the recording again after its last event. */
  loop?: boolean;
}

const defaultReplayDelay = 24;

function getDelay(options: ReplayDriverOptions, index: number): number {
  const delay = options.delays?.[index] ?? options.delay ?? defaultReplayDelay;

  return Math.max(0, delay);
}

/**
 * Creates a deterministic, independently replayable AgentEvent stream.
 * Each subscriber receives the full recording in order and can cancel safely.
 */
export function createReplayDriver(
  events: readonly AgentEvent[],
  options: ReplayDriverOptions = {},
): AgentEventStream {
  return {
    subscribe(listener) {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let index = 0;

      const scheduleNext = () => {
        if (cancelled || events.length === 0) {
          return;
        }

        timer = setTimeout(() => {
          if (cancelled) {
            return;
          }

          listener(events[index]!);
          index += 1;

          if (index === events.length) {
            if (!options.loop) {
              return;
            }

            index = 0;
          }

          scheduleNext();
        }, getDelay(options, index));
      };

      scheduleNext();

      return () => {
        cancelled = true;
        if (timer !== undefined) {
          clearTimeout(timer);
        }
      };
    },
  };
}

export { codingSessionFixture } from "./fixtures/coding-session";
