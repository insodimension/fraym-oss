import type { AgentEvent } from "@fraym/driver";

import type { Entry } from "./entry";

const prompts: Readonly<Record<string, string>> = {
  tokens: "Can you show me which design values this agent surface is using?",
  button: "Give me a clear action to run the next agent step.",
  "icon-button": "Add a compact action for pinning this result.",
  badge: "How should this completed tool state be labeled?",
  card: "Put this approval summary into a structured surface.",
  code: "Show the exact command I should run next.",
  "streaming-markdown": "Explain the change with markdown and a small code sample.",
  spinner: "Show me that the agent is still connecting.",
  "thinking-dots": "Let me know the agent is considering the next step.",
  skeleton: "Reserve the result layout while the agent loads it.",
  shimmer: "Show a live loading surface for the incoming artifact.",
  separator: "Separate the reasoning from the final answer.",
  "scroll-area": "Keep this longer tool trace inside a bounded region.",
  tooltip: "Add keyboard-friendly context to this compact action.",
  kbd: "Show the shortcut for opening the agent composer.",
  textarea: "Give me a place to add a follow-up instruction.",
  "message-actions": "Add the usual actions beneath the agent response.",
  "message-usage": "Show the token usage for this completed turn.",
  "streaming-thread": "Replay a complete coding-agent turn in this surface.",
  composer: "Give me a composer for a precise follow-up with image context.",
  "approval-card": "Apply the proposed patch after you finish reviewing it.",
  "reasoning-row": "Think through the safest way to extend this event stream.",
  "tool-read": "Open the session reducer so I can understand the event flow.",
  "tool-edit": "Update the server to read its port from the environment.",
  "tool-write": "Add a focused regression test for session startup.",
  "tool-bash": "Run the driver tests and show me the result.",
  "tool-search": "Find every place the replay driver is used.",
  "tool-todo": "Break this renderer work into a short plan.",
  "tool-task": "Ask an accessibility reviewer to check the approval flow.",
  "tool-lsp": "Find references to the renderer registry symbol.",
  "tool-fallback": "Publish a private preview snapshot for the team.",
};

const responses: Readonly<Record<Entry["group"], readonly string[]>> = {
  tokens: [
    "The surface is reading from the same semantic token contract as the full application. ",
    "Here are the active color, type, spacing, and shape values in context.",
  ],
  elements: [
    "I have placed the requested element directly in the response flow. ",
    "It stays interactive, responds to the live knobs, and inherits the active theme.",
  ],
  tools: [
    "I’ll run the requested tool and keep its live state in the conversation. ",
    "The renderer below is resolved by the tool name and updates from the same event stream.",
  ],
  features: [
    "This fixture is entering through the typed driver contract. ",
    "The thread below accumulates deltas and tool state exactly as a real harness would.",
  ],
};

interface DockToolCall {
  name: string;
  input: unknown;
  output: unknown;
}

const dockTools: Readonly<Record<string, DockToolCall>> = {
  "tool-read": { name: "realm/read", input: { path: "src/thread-state.ts" }, output: { lineCount: 86, content: "export function reduceThreadEvent(\n  state: ThreadState,\n  event: AgentEvent,\n): ThreadState {\n  switch (event.type) {\n    case \"session.start\":\n      return createThreadState();\n  }\n}" } },
  "tool-edit": { name: "edit", input: { path: "src/server.ts", diff: "@@ -8 +8,2 @@\n-app.listen(3000);\n+const port = Number(process.env.PORT ?? 3000);\n+app.listen(port);" }, output: { added: 2, removed: 1 } },
  "tool-write": { name: "write", input: { path: "test/session.test.ts", language: "ts", content: "test(\"starts a session\", () => {\n  expect(startSession(\"demo\").status).toBe(\"running\");\n});" }, output: { bytes: 104 } },
  "tool-bash": { name: "mcp__shell__bash", input: { command: "bun test packages/driver" }, output: { stdout: "✓ replay order\n✓ unsubscribe\n2 pass, 0 fail", exitCode: 0 } },
  "tool-search": { name: "search", input: { query: "createReplayDriver" }, output: { results: [{ file: "packages/driver/src/index.ts", line: 74, preview: "export function createReplayDriver(" }, { file: "apps/web/src/App.tsx", line: 9, preview: "createReplayDriver(codingSessionFixture" }] } },
  "tool-todo": { name: "todo", input: { items: [{ text: "Define registry", status: "done" }, { text: "Wire Thread", status: "done" }, { text: "Verify the sink", status: "pending" }] }, output: { items: [{ text: "Define registry", status: "done" }, { text: "Wire Thread", status: "done" }, { text: "Verify the sink", status: "pending" }] } },
  "tool-task": { name: "task", input: { role: "accessibility reviewer", task: "Audit the approval flow" }, output: { status: "complete", summary: "Labels and focus order are sound. Announce rejection errors assertively." } },
  "tool-lsp": { name: "mcp__typescript__lsp", input: { operation: "references", symbol: "ToolRendererRegistry" }, output: { result: "6 references in 4 files. No unresolved symbols." } },
  "tool-fallback": { name: "mcp__preview__publish_snapshot", input: { label: "renderer-review", visibility: "team" }, output: { url: "preview://renderer-review", expiresIn: "2h" } },
};

export function createEntryDockFixture(entry: Entry): readonly AgentEvent[] {
  const sessionId = `sink-dock-${entry.id}`;
  const messageId = `${sessionId}-assistant`;
  const response = responses[entry.group];

  const opening: readonly AgentEvent[] = [
    { type: "session.start", sessionId },
    {
      type: "user.message",
      sessionId,
      messageId: `${sessionId}-user`,
      content: prompts[entry.id] ?? `Show ${entry.title} inside this agent session.`,
    },
    {
      type: "assistant.message.delta",
      sessionId,
      messageId,
      delta: response[0] ?? "",
    },
  ];
  const dockTool = dockTools[entry.id];
  const toolEvents: readonly AgentEvent[] = dockTool === undefined ? [] : [
    {
      type: "tool_call.start",
      sessionId,
      toolCallId: `${sessionId}-tool`,
      toolName: dockTool.name,
      input: dockTool.input,
      status: "running",
    },
    {
      type: "tool_call.end",
      sessionId,
      toolCallId: `${sessionId}-tool`,
      status: "succeeded",
      output: dockTool.output,
    },
  ];
  const conversationEvents: readonly AgentEvent[] = entry.id === "approval-card"
    ? [{
        type: "approval.request",
        sessionId,
        approvalId: `${sessionId}-approval`,
        prompt: "Apply the reviewed patch to the workspace?",
      }]
    : entry.id === "reasoning-row"
      ? [
          { type: "reasoning.delta", sessionId, messageId, delta: "The event contract should stay framework agnostic. " },
          { type: "reasoning.delta", sessionId, messageId, delta: "I can accumulate the trace in the UI reducer and keep it collapsed by default." },
        ]
      : [];

  return [
    ...opening,
    ...toolEvents,
    ...conversationEvents,
    {
      type: "assistant.message.delta",
      sessionId,
      messageId,
      delta: response[1] ?? "",
    },
    { type: "session.done", sessionId },
  ];
}
