import type { AgentEvent } from "../index";

const sessionId = "fixture-coding-session";

export const codingSessionFixture: readonly AgentEvent[] = [
  { type: "session.start", sessionId },
  {
    type: "user.message",
    sessionId,
    messageId: "user-1",
    content: "Can you add a friendly health-check endpoint to this service?",
  },
  {
    type: "assistant.message.delta",
    sessionId,
    messageId: "assistant-1",
    delta: "I'll inspect the existing server and add a small endpoint.\n\n",
  },
  {
    type: "tool_call.start",
    sessionId,
    toolCallId: "tool-1",
    toolName: "read_file",
    input: { path: "src/server.ts" },
    status: "running",
  },
  {
    type: "tool_call.end",
    sessionId,
    toolCallId: "tool-1",
    status: "succeeded",
    output: "Existing Express app found.",
  },
  {
    type: "assistant.message.delta",
    sessionId,
    messageId: "assistant-1",
    delta: "The server is already using Express, so I'll keep this focused.\n\n```ts\n",
  },
  {
    type: "tool_call.start",
    sessionId,
    toolCallId: "tool-2",
    toolName: "apply_patch",
    input: { path: "src/server.ts" },
    status: "running",
  },
  {
    type: "tool_call.update",
    sessionId,
    toolCallId: "tool-2",
    status: "running",
    output: "Adding GET /health.",
  },
  {
    type: "tool_call.end",
    sessionId,
    toolCallId: "tool-2",
    status: "succeeded",
    output: "Patch applied.",
  },
  {
    type: "assistant.message.delta",
    sessionId,
    messageId: "assistant-1",
    delta: "app.get(\"/health\", (_request, response) => {\n  response.json({ status: \"ok\" });\n});\n```\n\n",
  },
  {
    type: "assistant.message.delta",
    sessionId,
    messageId: "assistant-1",
    delta: "Done: `GET /health` now returns a compact status payload.",
  },
  { type: "session.done", sessionId },
];
