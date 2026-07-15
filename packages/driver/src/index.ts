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

