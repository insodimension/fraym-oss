import type {
  AgentEvent,
  AgentEventListener,
  AgentEventStream,
  ApprovalResponseEvent,
  ToolCallStatus,
  Unsubscribe,
} from "@fraym/driver";

type JsonRpcId = number | string;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: unknown;
}

interface PendingRequest {
  method: string;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

interface PermissionOption {
  optionId: string;
  name: string;
  kind: string;
}

interface PendingPermission {
  rpcId: JsonRpcId;
  options: readonly PermissionOption[];
}

interface AcpSocket {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: "open", listener: () => void): void;
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
  addEventListener(type: "error", listener: () => void): void;
  addEventListener(type: "close", listener: () => void): void;
}

export interface AcpDriverOptions {
  /** Working directory passed to `session/new`. */
  cwd?: string;
  /** Overrides the WebSocket constructor for non-browser hosts and tests. */
  createSocket?: (url: string) => AcpSocket;
}

export interface AcpDriver extends AgentEventStream {
  /** Sends one text turn through `session/prompt`. */
  prompt(text: string): Promise<void>;
  /** Returns an inline Fraym approval decision to ACP. */
  respondToApproval(response: ApprovalResponseEvent): void;
  /** Cancels the active ACP prompt turn. */
  cancel(): void;
}

const socketOpen = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function readId(value: unknown): JsonRpcId | undefined {
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function textFromContent(content: unknown): string | undefined {
  if (!isRecord(content) || content.type !== "text") {
    return undefined;
  }
  return readString(content, "text");
}

function toolOutput(update: Record<string, unknown>): unknown {
  if ("rawOutput" in update) {
    return update.rawOutput;
  }
  if ("content" in update) {
    return update.content;
  }
  return undefined;
}

function mapToolStatus(status: unknown): ToolCallStatus {
  switch (status) {
    case "in_progress":
      return "running";
    case "completed":
      return "succeeded";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

function isTerminalStatus(status: ToolCallStatus): status is "succeeded" | "failed" | "cancelled" {
  return status === "succeeded" || status === "failed" || status === "cancelled";
}

function permissionOptions(value: unknown): readonly PermissionOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((candidate) => {
    if (!isRecord(candidate)) {
      return [];
    }
    const optionId = readString(candidate, "optionId");
    const name = readString(candidate, "name");
    const kind = readString(candidate, "kind");
    return optionId === undefined || name === undefined || kind === undefined
      ? []
      : [{ optionId, name, kind }];
  });
}

function defaultSocket(url: string): AcpSocket {
  return new WebSocket(url) as unknown as AcpSocket;
}

/**
 * Connects an ACP v1 WebSocket agent to Fraym's framework-neutral event stream.
 */
export function createAcpDriver(
  url: string,
  options: AcpDriverOptions = {},
): AcpDriver {
  const listeners = new Set<AgentEventListener>();
  const pendingRequests = new Map<number, PendingRequest>();
  const pendingPermissions = new Map<string, PendingPermission>();
  const toolStatuses = new Map<string, ToolCallStatus>();
  const createSocket = options.createSocket ?? defaultSocket;

  let socket: AcpSocket | null = null;
  let connection: Promise<void> | null = null;
  let resolveConnection: (() => void) | null = null;
  let rejectConnection: ((error: Error) => void) | null = null;
  let sessionId: string | null = null;
  let requestId = 0;
  let intentionalClose = false;
  let transportErrorReported = false;
  let sessionStarted = false;
  let assistantMessageId: string | null = null;
  let reasoningMessageId: string | null = null;
  let fallbackMessageId = 0;
  let planStarted = false;
  let planFinished = false;

  const emit = (event: AgentEvent) => {
    for (const listener of listeners) {
      listener(event);
    }
  };

  const errorSessionId = () => sessionId ?? "acp-connection";
  const emitTransportError = (message: string) => {
    if (transportErrorReported || intentionalClose) {
      return;
    }
    transportErrorReported = true;
    emit({ type: "session.error", sessionId: errorSessionId(), message });
  };

  const ensureSessionStarted = () => {
    if (sessionStarted || sessionId === null) {
      return;
    }
    sessionStarted = true;
    emit({ type: "session.start", sessionId });
  };

  const send = (message: unknown) => {
    if (socket === null || socket.readyState !== socketOpen) {
      throw new Error("ACP WebSocket is not open.");
    }
    socket.send(JSON.stringify(message));
  };

  const request = (method: string, params: unknown): Promise<unknown> => {
    const id = requestId;
    requestId += 1;
    const message: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { method, resolve, reject });
      try {
        send(message);
      } catch (error) {
        pendingRequests.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  };

  const handleResponse = (message: Record<string, unknown>) => {
    const id = message.id;
    if (typeof id !== "number") {
      return;
    }
    const pending = pendingRequests.get(id);
    if (pending === undefined) {
      return;
    }
    pendingRequests.delete(id);
    if (isRecord(message.error)) {
      const detail = readString(message.error, "message") ?? `ACP ${pending.method} failed.`;
      pending.reject(new Error(detail));
      return;
    }
    pending.resolve(message.result);
  };

  const nextMessageId = (kind: "assistant" | "reasoning", supplied: string | undefined) => {
    if (supplied !== undefined) {
      if (kind === "assistant") assistantMessageId = supplied;
      else reasoningMessageId = supplied;
      return supplied;
    }
    const current = kind === "assistant" ? assistantMessageId : reasoningMessageId;
    if (current !== null) {
      return current;
    }
    fallbackMessageId += 1;
    const generated = `acp-${kind}-${fallbackMessageId}`;
    if (kind === "assistant") assistantMessageId = generated;
    else reasoningMessageId = generated;
    return generated;
  };

  const handleToolCall = (activeSessionId: string, update: Record<string, unknown>) => {
    const toolCallId = readString(update, "toolCallId");
    if (toolCallId === undefined) {
      return;
    }
    const mappedStatus = mapToolStatus(update.status);
    const startStatus = mappedStatus === "pending" ? "pending" : "running";
    const title = readString(update, "title");
    const kind = readString(update, "kind");
    const input = "rawInput" in update
      ? update.rawInput
      : { title, locations: update.locations };
    toolStatuses.set(toolCallId, mappedStatus);
    emit({
      type: "tool_call.start",
      sessionId: activeSessionId,
      toolCallId,
      toolName: kind ?? title ?? "tool",
      input,
      status: startStatus,
    });
    if (isTerminalStatus(mappedStatus)) {
      emit({
        type: "tool_call.end",
        sessionId: activeSessionId,
        toolCallId,
        status: mappedStatus,
        output: toolOutput(update),
      });
    }
  };

  const handleToolCallUpdate = (activeSessionId: string, update: Record<string, unknown>) => {
    const toolCallId = readString(update, "toolCallId");
    if (toolCallId === undefined) {
      return;
    }
    const mappedStatus = "status" in update
      ? mapToolStatus(update.status)
      : toolStatuses.get(toolCallId) ?? "running";
    toolStatuses.set(toolCallId, mappedStatus);
    if (isTerminalStatus(mappedStatus)) {
      emit({
        type: "tool_call.end",
        sessionId: activeSessionId,
        toolCallId,
        status: mappedStatus,
        output: toolOutput(update),
      });
      return;
    }
    emit({
      type: "tool_call.update",
      sessionId: activeSessionId,
      toolCallId,
      status: mappedStatus,
      output: toolOutput(update),
    });
  };

  const handlePlan = (activeSessionId: string, update: Record<string, unknown>) => {
    if (!Array.isArray(update.entries)) {
      return;
    }
    const items = update.entries.flatMap((entry) => {
      if (!isRecord(entry)) {
        return [];
      }
      const text = readString(entry, "content");
      if (text === undefined) {
        return [];
      }
      return [{ text, status: entry.status === "completed" ? "done" : "pending" }];
    });
    const output = { items };
    if (!planStarted) {
      planStarted = true;
      emit({
        type: "tool_call.start",
        sessionId: activeSessionId,
        toolCallId: "acp-plan",
        toolName: "todo",
        input: output,
        status: "running",
      });
    }
    const complete = items.length > 0 && items.every((item) => item.status === "done");
    if (complete && !planFinished) {
      planFinished = true;
      emit({
        type: "tool_call.end",
        sessionId: activeSessionId,
        toolCallId: "acp-plan",
        status: "succeeded",
        output,
      });
    } else if (!planFinished) {
      emit({
        type: "tool_call.update",
        sessionId: activeSessionId,
        toolCallId: "acp-plan",
        status: "running",
        output,
      });
    }
  };

  const handleSessionUpdate = (params: Record<string, unknown>) => {
    const activeSessionId = readString(params, "sessionId") ?? sessionId;
    if (activeSessionId === null || !isRecord(params.update)) {
      return;
    }
    ensureSessionStarted();
    const update = params.update;
    const updateType = readString(update, "sessionUpdate");
    if (updateType === "agent_message_chunk") {
      const delta = textFromContent(update.content);
      if (delta !== undefined) {
        emit({
          type: "assistant.message.delta",
          sessionId: activeSessionId,
          messageId: nextMessageId("assistant", readString(update, "messageId")),
          delta,
        });
      }
    } else if (updateType === "agent_thought_chunk") {
      const delta = textFromContent(update.content);
      if (delta !== undefined) {
        emit({
          type: "reasoning.delta",
          sessionId: activeSessionId,
          messageId: nextMessageId("reasoning", readString(update, "messageId")),
          delta,
        });
      }
    } else if (updateType === "tool_call") {
      handleToolCall(activeSessionId, update);
    } else if (updateType === "tool_call_update") {
      handleToolCallUpdate(activeSessionId, update);
    } else if (updateType === "plan") {
      handlePlan(activeSessionId, update);
    }
  };

  const handlePermissionRequest = (message: Record<string, unknown>) => {
    const rpcId = readId(message.id);
    if (rpcId === undefined || !isRecord(message.params)) {
      return;
    }
    const activeSessionId = readString(message.params, "sessionId") ?? sessionId;
    if (activeSessionId === null) {
      return;
    }
    ensureSessionStarted();
    const approvalId = `acp-permission-${String(rpcId)}`;
    const toolCall = isRecord(message.params.toolCall) ? message.params.toolCall : {};
    const prompt = readString(toolCall, "title") ?? "Allow the agent to continue with this tool call?";
    pendingPermissions.set(approvalId, {
      rpcId,
      options: permissionOptions(message.params.options),
    });
    emit({ type: "approval.request", sessionId: activeSessionId, approvalId, prompt });
  };

  const handleMessage = (data: unknown) => {
    if (typeof data !== "string") {
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      emitTransportError("The ACP agent sent invalid JSON-RPC data.");
      return;
    }
    if (!isRecord(parsed)) {
      return;
    }
    const method = readString(parsed, "method");
    if (method === "session/update" && isRecord(parsed.params)) {
      handleSessionUpdate(parsed.params);
    } else if (method === "session/request_permission") {
      handlePermissionRequest(parsed);
    } else {
      handleResponse(parsed);
    }
  };

  const rejectPending = (error: Error) => {
    for (const pending of pendingRequests.values()) {
      pending.reject(error);
    }
    pendingRequests.clear();
  };

  const connect = (): Promise<void> => {
    if (connection !== null) {
      return connection;
    }
    connection = new Promise<void>((resolve, reject) => {
      resolveConnection = resolve;
      rejectConnection = reject;
    });
    intentionalClose = false;
    transportErrorReported = false;
    void connection.catch(() => undefined);
    try {
      socket = createSocket(url);
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      rejectConnection?.(failure);
      emitTransportError(`Unable to connect to ACP at ${url}.`);
      return connection;
    }

    const activeSocket = socket;

    activeSocket.addEventListener("message", (event) => handleMessage(event.data));
    activeSocket.addEventListener("error", () => {
      const failure = new Error(`Unable to connect to ACP at ${url}.`);
      rejectConnection?.(failure);
      rejectPending(failure);
      emitTransportError(failure.message);
    });
    activeSocket.addEventListener("close", () => {
      const failure = new Error("ACP connection closed unexpectedly.");
      rejectConnection?.(failure);
      rejectPending(failure);
      if (!intentionalClose) {
        emitTransportError(failure.message);
      }
      if (socket === activeSocket) {
        socket = null;
        connection = null;
        resolveConnection = null;
        rejectConnection = null;
        sessionId = null;
        sessionStarted = false;
      }
    });
    activeSocket.addEventListener("open", () => {
      void (async () => {
        try {
          const initialized = await request("initialize", {
            protocolVersion: 1,
            clientCapabilities: {},
            clientInfo: { name: "fraym", title: "Fraym", version: "0.0.0" },
          });
          if (!isRecord(initialized) || initialized.protocolVersion !== 1) {
            throw new Error("The ACP agent did not negotiate protocol version 1.");
          }
          const created = await request("session/new", {
            cwd: options.cwd ?? ".",
            mcpServers: [],
          });
          if (!isRecord(created) || typeof created.sessionId !== "string") {
            throw new Error("The ACP agent returned an invalid session/new response.");
          }
          sessionId = created.sessionId;
          resolveConnection?.();
        } catch (error) {
          const failure = error instanceof Error ? error : new Error(String(error));
          rejectConnection?.(failure);
          emitTransportError(failure.message);
        }
      })();
    });

    return connection;
  };

  const driver: AcpDriver = {
    subscribe(listener): Unsubscribe {
      listeners.add(listener);
      void connect();
      return () => {
        listeners.delete(listener);
        queueMicrotask(() => {
          if (listeners.size === 0 && socket !== null) {
            intentionalClose = true;
            const failure = new Error("ACP subscription closed.");
            rejectPending(failure);
            socket.close(1000, "Fraym unsubscribed");
          }
        });
      };
    },

    async prompt(text) {
      await connect();
      if (sessionId === null) {
        throw new Error("ACP session is not ready.");
      }
      ensureSessionStarted();
      assistantMessageId = null;
      reasoningMessageId = null;
      const messageId = crypto.randomUUID();
      emit({ type: "user.message", sessionId, messageId, content: text });
      try {
        await request("session/prompt", {
          sessionId,
          messageId,
          prompt: [{ type: "text", text }],
        });
        emit({ type: "session.done", sessionId });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        emit({ type: "session.error", sessionId, message });
        throw error;
      }
    },

    respondToApproval(response) {
      const pending = pendingPermissions.get(response.approvalId);
      if (pending === undefined) {
        return;
      }
      const allowedKinds = response.decision === "approved"
        ? ["allow_once", "allow_always"]
        : ["reject_once", "reject_always"];
      const selected = pending.options.find((option) => allowedKinds.includes(option.kind));
      if (selected === undefined) {
        emit({
          type: "session.error",
          sessionId: response.sessionId,
          message: `ACP permission request has no ${response.decision} option.`,
        });
        return;
      }
      pendingPermissions.delete(response.approvalId);
      send({
        jsonrpc: "2.0",
        id: pending.rpcId,
        result: { outcome: { outcome: "selected", optionId: selected.optionId } },
      });
      emit(response);
    },

    cancel() {
      if (sessionId === null || socket === null || socket.readyState !== socketOpen) {
        return;
      }
      for (const [approvalId, pending] of pendingPermissions) {
        send({
          jsonrpc: "2.0",
          id: pending.rpcId,
          result: { outcome: { outcome: "cancelled" } },
        });
        pendingPermissions.delete(approvalId);
      }
      send({ jsonrpc: "2.0", method: "session/cancel", params: { sessionId } });
    },
  };

  return driver;
}
