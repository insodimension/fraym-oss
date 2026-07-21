import { describe, expect, test } from "bun:test";
import type { ServerWebSocket } from "bun";

import type { AgentEvent } from "@fraym-ai/driver";

import { createAcpDriver } from "./index";

interface SocketData {
  id: string;
}

function waitFor(predicate: () => boolean, timeout = 2_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if (predicate()) {
        resolve();
      } else if (Date.now() - started >= timeout) {
        reject(new Error("Timed out waiting for mock ACP state."));
      } else {
        setTimeout(check, 5);
      }
    };
    check();
  });
}

function parseMessage(message: string | Buffer): Record<string, unknown> {
  const parsed: unknown = JSON.parse(String(message));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected a JSON-RPC object.");
  }
  return parsed as Record<string, unknown>;
}

function send(socket: ServerWebSocket<SocketData>, message: unknown): void {
  socket.send(JSON.stringify(message));
}

describe("createAcpDriver", () => {
  test("maps a complete ACP turn and returns permission decisions", async () => {
    const receivedRpc: Record<string, unknown>[] = [];
    let promptRequestId: number | null = null;
    let permissionResponse: Record<string, unknown> | null = null;
    const server = Bun.serve<SocketData>({
      port: 0,
      fetch(request, bunServer) {
        return bunServer.upgrade(request, { data: { id: "client" } })
          ? undefined
          : new Response("WebSocket required", { status: 426 });
      },
      websocket: {
        open() {},
        message(socket, rawMessage) {
          const message = parseMessage(rawMessage);
          receivedRpc.push(message);
          if (message.method === "initialize") {
            send(socket, {
              jsonrpc: "2.0",
              id: message.id,
              result: { protocolVersion: 1, agentCapabilities: {} },
            });
          } else if (message.method === "session/new") {
            send(socket, {
              jsonrpc: "2.0",
              id: message.id,
              result: { sessionId: "acp-session-1" },
            });
          } else if (message.method === "session/prompt") {
            promptRequestId = typeof message.id === "number" ? message.id : null;
            send(socket, {
              jsonrpc: "2.0",
              method: "session/update",
              params: {
                sessionId: "acp-session-1",
                update: {
                  sessionUpdate: "agent_thought_chunk",
                  messageId: "thought-1",
                  content: { type: "text", text: "Inspect the reducer. " },
                },
              },
            });
            send(socket, {
              jsonrpc: "2.0",
              method: "session/update",
              params: {
                sessionId: "acp-session-1",
                update: {
                  sessionUpdate: "agent_message_chunk",
                  messageId: "assistant-1",
                  content: { type: "text", text: "I found the boundary. " },
                },
              },
            });
            send(socket, {
              jsonrpc: "2.0",
              method: "session/update",
              params: {
                sessionId: "acp-session-1",
                update: {
                  sessionUpdate: "plan",
                  entries: [{ content: "Read the reducer", priority: "high", status: "in_progress" }],
                },
              },
            });
            send(socket, {
              jsonrpc: "2.0",
              method: "session/update",
              params: {
                sessionId: "acp-session-1",
                update: {
                  sessionUpdate: "tool_call",
                  toolCallId: "read-1",
                  title: "Read thread state",
                  kind: "read",
                  status: "pending",
                  rawInput: { path: "packages/ui/src/thread-state.ts" },
                },
              },
            });
            send(socket, {
              jsonrpc: "2.0",
              method: "session/update",
              params: {
                sessionId: "acp-session-1",
                update: {
                  sessionUpdate: "tool_call_update",
                  toolCallId: "read-1",
                  status: "in_progress",
                  content: [{ type: "content", content: { type: "text", text: "Reading…" } }],
                },
              },
            });
            send(socket, {
              jsonrpc: "2.0",
              id: "permission-1",
              method: "session/request_permission",
              params: {
                sessionId: "acp-session-1",
                toolCall: { toolCallId: "read-1", title: "Read thread state" },
                options: [
                  { optionId: "allow-once", name: "Allow once", kind: "allow_once" },
                  { optionId: "reject-once", name: "Reject", kind: "reject_once" },
                ],
              },
            });
          } else if (message.id === "permission-1") {
            permissionResponse = message;
            send(socket, {
              jsonrpc: "2.0",
              method: "session/update",
              params: {
                sessionId: "acp-session-1",
                update: {
                  sessionUpdate: "tool_call_update",
                  toolCallId: "read-1",
                  status: "completed",
                  rawOutput: { path: "packages/ui/src/thread-state.ts", lineCount: 214 },
                },
              },
            });
            send(socket, {
              jsonrpc: "2.0",
              method: "session/update",
              params: {
                sessionId: "acp-session-1",
                update: {
                  sessionUpdate: "plan",
                  entries: [{ content: "Read the reducer", priority: "high", status: "completed" }],
                },
              },
            });
            send(socket, {
              jsonrpc: "2.0",
              method: "session/update",
              params: {
                sessionId: "acp-session-1",
                update: {
                  sessionUpdate: "agent_message_chunk",
                  messageId: "assistant-1",
                  content: { type: "text", text: "The mapping is clean." },
                },
              },
            });
            send(socket, {
              jsonrpc: "2.0",
              id: promptRequestId,
              result: { stopReason: "end_turn" },
            });
            setTimeout(() => socket.close(1011, "test disconnect"), 20);
          }
        },
        close() {},
      },
    });

    const events: AgentEvent[] = [];
    const cwd = "D:/projects/fraym";
    const driver = createAcpDriver(`ws://127.0.0.1:${server.port}`, { cwd });
    const unsubscribe = driver.subscribe((event) => {
      events.push(event);
      if (event.type === "approval.request") {
        driver.respondToApproval({
          type: "approval.response",
          sessionId: event.sessionId,
          approvalId: event.approvalId,
          decision: "approved",
        });
      }
    });

    await driver.prompt("Inspect the event mapping");
    await waitFor(() => events.some((event) => event.type === "session.error"));

    const initialize = receivedRpc.find((message) => message.method === "initialize");
    const newSession = receivedRpc.find((message) => message.method === "session/new");
    const prompt = receivedRpc.find((message) => message.method === "session/prompt");
    expect(initialize?.params).toMatchObject({ protocolVersion: 1 });
    expect(newSession?.params).toEqual({ cwd, mcpServers: [] });
    expect(prompt?.params).toMatchObject({
      sessionId: "acp-session-1",
      prompt: [{ type: "text", text: "Inspect the event mapping" }],
    });
    expect(permissionResponse).toMatchObject({
      id: "permission-1",
      result: { outcome: { outcome: "selected", optionId: "allow-once" } },
    });
    expect(events.filter((event) => event.type === "assistant.message.delta")).toEqual([
      { type: "assistant.message.delta", sessionId: "acp-session-1", messageId: "assistant-1", delta: "I found the boundary. " },
      { type: "assistant.message.delta", sessionId: "acp-session-1", messageId: "assistant-1", delta: "The mapping is clean." },
    ]);
    expect(events.find((event) => event.type === "reasoning.delta")).toEqual({
      type: "reasoning.delta",
      sessionId: "acp-session-1",
      messageId: "thought-1",
      delta: "Inspect the reducer. ",
    });
    expect(events.some((event) => event.type === "tool_call.start" && event.toolCallId === "read-1")).toBe(true);
    expect(events.some((event) => event.type === "tool_call.update" && event.toolCallId === "read-1" && event.status === "running")).toBe(true);
    expect(events.some((event) => event.type === "tool_call.end" && event.toolCallId === "read-1" && event.status === "succeeded")).toBe(true);
    expect(events.some((event) => event.type === "tool_call.start" && event.toolCallId === "acp-plan" && event.toolName === "todo")).toBe(true);
    expect(events.some((event) => event.type === "tool_call.end" && event.toolCallId === "acp-plan")).toBe(true);
    expect(events.some((event) => event.type === "approval.response" && event.decision === "approved")).toBe(true);
    expect(events.at(-1)).toEqual({
      type: "session.error",
      sessionId: "acp-session-1",
      message: "ACP connection closed unexpectedly.",
    });

    unsubscribe();
    server.stop(true);
  });

  test("closing the final subscription closes the WebSocket cleanly", async () => {
    let openCount = 0;
    let closeCount = 0;
    const server = Bun.serve<SocketData>({
      port: 0,
      fetch(request, bunServer) {
        return bunServer.upgrade(request, { data: { id: "client" } })
          ? undefined
          : new Response("WebSocket required", { status: 426 });
      },
      websocket: {
        open() {
          openCount += 1;
        },
        message(socket, rawMessage) {
          const message = parseMessage(rawMessage);
          if (message.method === "initialize") {
            send(socket, { jsonrpc: "2.0", id: message.id, result: { protocolVersion: 1 } });
          } else if (message.method === "session/new") {
            send(socket, { jsonrpc: "2.0", id: message.id, result: { sessionId: "clean-close" } });
          }
        },
        close() {
          closeCount += 1;
        },
      },
    });
    const driver = createAcpDriver(`ws://127.0.0.1:${server.port}`, { cwd: "/workspace/fraym" });
    const unsubscribe = driver.subscribe(() => undefined);
    await waitFor(() => server.pendingWebSockets > 0);
    unsubscribe();
    await waitFor(() => closeCount === 1);

    const unsubscribeAgain = driver.subscribe(() => undefined);
    await waitFor(() => openCount === 2);
    unsubscribeAgain();
    await waitFor(() => closeCount === 2);

    server.stop(true);
  });
});
