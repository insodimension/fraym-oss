export type ToolCallStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type PluginToolRendererUse = "table" | "json" | "keyValue" | "summary";
export interface PluginToolRendererDescriptor {
  readonly match: string;
  readonly use: PluginToolRendererUse;
  readonly icon?: string;
  readonly title?: string;
  readonly columns?: readonly string[];
  readonly fields?: readonly string[];
  readonly badges?: readonly string[];
}

export interface EngineRecipeRecord { readonly id: string; readonly name?: string; readonly description?: string; readonly command?: string; readonly icon?: string }
export interface PluginConnectFormField { readonly id: string; readonly name?: string; readonly label: string; readonly type?: "text" | "password" | "email" | "url"; readonly placeholder?: string; readonly required?: boolean; readonly description?: string; readonly secret?: boolean; readonly help?: string; readonly helpUrl?: string; readonly helpUrlLabel?: string }
export type PluginFixKind = "install" | "form" | "oauth" | "open-app" | "reconnect" | "agent";

export type UsageStatus = "ok" | "warning" | "critical" | "exhausted";

export interface ContextBreakdown {
  readonly used: number;
  readonly max: number;
  readonly system?: number;
  readonly conversation?: number;
  readonly tools?: number;
  readonly files?: number;
  readonly remaining?: number;
  readonly [key: string]: number | undefined;
}

export interface TaskItem {
  readonly id: string;
  readonly title: string;
  readonly status: "pending" | "in_progress" | "completed" | "abandoned";
}

export interface TaskPhase {
  readonly id: string;
  readonly title: string;
  readonly tasks: readonly TaskItem[];
}

export interface PermissionOption {
  readonly optionId: string;
  readonly name: string;
  readonly kind: "allow_once" | "allow_always" | "reject_once" | "reject_always";
}

export interface HostUiSelectOption {
  readonly label: string;
  readonly description?: string;
}

export interface HostUiLocation {
  readonly path: string;
  readonly line?: number;
}

export interface HostUiRequest {
  readonly id: string;
  readonly requestId?: string;
  readonly kind: "select" | "input" | "confirm" | "permission" | (string & {});
  readonly title?: string;
  readonly message?: string;
  readonly payload?: unknown;
  readonly options?: readonly (string | HostUiSelectOption | PermissionOption)[];
  readonly toolName?: string;
  readonly locations?: readonly HostUiLocation[];
  readonly paths?: readonly string[];
  readonly placeholder?: string;
  readonly initialValue?: string;
  readonly initialIndex?: number;
  readonly checkedIndices?: readonly number[];
  readonly selectionMarker?: "checkbox" | "radio";
  readonly allowMultiple?: boolean;
  readonly markableCount?: number;
  readonly canNavigateBack?: boolean;
  readonly canNavigateForward?: boolean;
  readonly defaultValue?: boolean;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export interface HostUiResponse {
  readonly requestId: string;
  readonly accepted?: boolean;
  readonly value?: unknown;
  readonly values?: readonly string[];
  readonly optionId?: string;
  readonly confirmed?: boolean;
  readonly cancelled?: boolean;
  readonly navigate?: "back" | "forward";
}

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

export interface ReasoningDeltaEvent extends AgentEventBase {
  type: "reasoning.delta";
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
  | ReasoningDeltaEvent
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
  /** Resolves approval gates without user input, for unattended replays. */
  autoRespond?: {
    decision?: ApprovalDecision;
    delay?: number;
  };
}

export interface ReplayDriver extends AgentEventStream {
  /** Resolves a currently pending approval and resumes the recording. */
  respondToApproval(response: ApprovalResponseEvent): void;
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
): ReplayDriver {
  const responders = new Set<(response: ApprovalResponseEvent) => void>();

  const driver: ReplayDriver = {
    respondToApproval(response) {
      for (const respond of responders) {
        respond(response);
      }
    },
    subscribe(listener) {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let index = 0;
      let pendingApproval: ApprovalRequestEvent | undefined;

      const clearTimer = () => {
        if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
      };

      const finishCycle = () => {
        if (!options.loop) {
          return false;
        }

        index = 0;
        return true;
      };

      const scheduleNext = () => {
        if (cancelled || pendingApproval !== undefined || events.length === 0) {
          return;
        }

        if (index === events.length && !finishCycle()) {
          return;
        }

        timer = setTimeout(() => {
          if (cancelled) {
            return;
          }

          const event = events[index]!;
          listener(event);
          index += 1;

          if (event.type === "approval.request") {
            pendingApproval = event;

            if (options.autoRespond !== undefined) {
              timer = setTimeout(() => {
                respond({
                  type: "approval.response",
                  sessionId: event.sessionId,
                  approvalId: event.approvalId,
                  decision: options.autoRespond?.decision ?? "approved",
                });
              }, Math.max(0, options.autoRespond.delay ?? defaultReplayDelay));
            }
            return;
          }

          scheduleNext();
        }, getDelay(options, index));
      };

      const respond = (response: ApprovalResponseEvent) => {
        if (
          cancelled
          || pendingApproval === undefined
          || response.approvalId !== pendingApproval.approvalId
        ) {
          return;
        }

        clearTimer();
        pendingApproval = undefined;
        listener(response);

        const recordedResponse = events[index];
        if (
          recordedResponse?.type === "approval.response"
          && recordedResponse.approvalId === response.approvalId
        ) {
          index += 1;
        }

        scheduleNext();
      };

      responders.add(respond);
      scheduleNext();

      return () => {
        cancelled = true;
        responders.delete(respond);
        clearTimer();
      };
    },
  };

  return driver;
}

export { codingSessionFixture } from "./fixtures/coding-session";
