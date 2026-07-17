import type { ToolCallStatus } from "@fraym/driver";
import { ToolCall, type ToolCallState } from "@fraym/ui";

import { booleanValue, stringValue, type DemoProps, type Entry } from "../entry";

interface ToolDefinition {
  id: string;
  title: string;
  description: string;
  call: ToolCallState;
}

const definitions: readonly ToolDefinition[] = [
  {
    id: "tool-read",
    title: "Read tool",
    description: "Preview a file read with its machine path, line count, and expandable source content.",
    call: {
      id: "read-demo",
      name: "realm/read",
      status: "succeeded",
      input: { path: "src/agent/session.ts" },
      output: { lineCount: 14, content: "export interface Session {\n  id: string;\n  status: \"idle\" | \"running\";\n  events: readonly AgentEvent[];\n}\n\nexport function startSession(id: string): Session {\n  return {\n    id,\n    status: \"running\",\n    events: [],\n  };\n}" },
    },
  },
  {
    id: "tool-edit",
    title: "Edit tool",
    description: "Make source changes legible with a compact semantic diff and clear file context.",
    call: {
      id: "edit-demo",
      name: "edit",
      status: "succeeded",
      input: { path: "src/server.ts", diff: "@@ -8,2 +8,4 @@\n-app.listen(3000);\n+const port = Number(process.env.PORT ?? 3000);\n+app.listen(port);\n+logger.info(`listening on ${port}`);" },
      output: { added: 3, removed: 1 },
    },
  },
  {
    id: "tool-write",
    title: "Write tool",
    description: "Show a newly written artifact with its path, language, and bounded content preview.",
    call: {
      id: "write-demo",
      name: "realm/write",
      status: "succeeded",
      input: { path: "test/session.test.ts", language: "ts", content: "import { expect, test } from \"bun:test\";\nimport { startSession } from \"../src/session\";\n\ntest(\"starts a session\", () => {\n  const session = startSession(\"demo\");\n  expect(session.status).toBe(\"running\");\n});" },
      output: { bytes: 228 },
    },
  },
  {
    id: "tool-bash",
    title: "Bash tool",
    description: "Present a command, terminal output, and exit state as one scan-friendly execution trace.",
    call: {
      id: "bash-demo",
      name: "mcp__shell__bash",
      status: "succeeded",
      input: { command: "bun test packages/driver" },
      output: { stdout: "bun test v1.2.18\n✓ replay order\n✓ unsubscribe\n2 pass, 0 fail", exitCode: 0 },
    },
  },
  {
    id: "tool-search",
    title: "Search tool",
    description: "Group workspace matches by file while preserving precise line numbers and excerpts.",
    call: {
      id: "search-demo",
      name: "mcp__workspace__search",
      status: "succeeded",
      input: { query: "createReplayDriver" },
      output: { results: [
        { file: "packages/driver/src/index.ts", line: 74, preview: "export function createReplayDriver(" },
        { file: "packages/driver/src/replay.test.ts", line: 18, preview: "const driver = createReplayDriver(events);" },
        { file: "apps/web/src/App.tsx", line: 9, preview: "createReplayDriver(codingSessionFixture" },
      ] },
    },
  },
  {
    id: "tool-todo",
    title: "Todo tool",
    description: "Track an agent plan as a lightweight checklist with unmistakable completed and pending states.",
    call: {
      id: "todo-demo",
      name: "todo",
      status: "running",
      input: { items: [
        { text: "Inspect the driver contract", status: "done" },
        { text: "Implement the renderer", status: "done" },
        { text: "Run the browser check", status: "pending" },
      ] },
      output: undefined,
    },
  },
  {
    id: "tool-task",
    title: "Task tool",
    description: "Frame delegated work with the subagent role, task status, and concise returned summary.",
    call: {
      id: "task-demo",
      name: "task",
      status: "succeeded",
      input: { role: "accessibility reviewer", task: "Audit the approval flow" },
      output: { status: "complete", summary: "Keyboard order and labels are sound. Add an assertive announcement for rejection errors." },
    },
  },
  {
    id: "tool-lsp",
    title: "LSP tool",
    description: "Distill language-server operations into their operation, symbol, and useful result.",
    call: {
      id: "lsp-demo",
      name: "MCP__typescript__LSP",
      status: "succeeded",
      input: { operation: "references", symbol: "ToolRendererRegistry" },
      output: { result: "6 references in 4 files. No unresolved symbols." },
    },
  },
  {
    id: "tool-fallback",
    title: "Fallback tool",
    description: "Keep unknown harness tools useful with a clean, structured input and output inspector.",
    call: {
      id: "fallback-demo",
      name: "mcp__preview__publish_snapshot",
      status: "succeeded",
      input: { label: "renderer-review", visibility: "team" },
      output: { url: "preview://renderer-review", expiresIn: "2h" },
    },
  },
];

function statusFrom(values: DemoProps["values"], fallback: ToolCallStatus): ToolCallStatus {
  return stringValue(values, "status", fallback) as ToolCallStatus;
}

function createToolEntry(definition: ToolDefinition): Entry {
  function ToolDemo({ values }: DemoProps) {
    const call = { ...definition.call, status: statusFrom(values, definition.call.status) };
    return <div className="sink-tool-demo"><ToolCall call={call} expanded={booleanValue(values, "expanded", true)} /></div>;
  }

  return {
    id: definition.id,
    title: definition.title,
    group: "tools",
    tier: "Tool renderer",
    description: definition.description,
    importCode: `import { ToolCall } from "@fraym/ui"`,
    Demo: ToolDemo,
    knobs: [
      { prop: "status", label: "Status", kind: "pick", options: ["pending", "running", "succeeded", "failed", "cancelled"], defaultValue: definition.call.status },
      { prop: "expanded", label: "Expanded", kind: "toggle", defaultValue: true },
    ],
    code: (values) => `<ToolCall
  call={{ ...${definition.id.replace("tool-", "")}Call, status: "${statusFrom(values, definition.call.status)}" }}
  expanded={${booleanValue(values, "expanded", true)}}
/>`,
    examples: [
      { title: "Render accumulated state", description: "Pass the state built from the matching tool-call events.", code: `<ToolCall call={toolCall} />` },
      { title: "Control disclosure", description: "Keep disclosure state in the host when the surrounding flow needs it.", code: `<ToolCall call={toolCall} expanded={open} onExpandedChange={setOpen} />` },
    ],
    props: [
      { name: "call", type: "ToolCallState", defaultValue: "required", description: "Accumulated id, name, status, input, and output for one invocation." },
      { name: "expanded", type: "boolean", defaultValue: "status-based", description: "Controls whether the renderer body is visible." },
      { name: "defaultExpanded", type: "boolean", defaultValue: "status-based", description: "Initial disclosure state for an uncontrolled card." },
      { name: "onExpandedChange", type: "(open: boolean) => void", defaultValue: "undefined", description: "Receives disclosure changes from the card shell." },
    ],
  };
}

export const toolEntries: readonly Entry[] = definitions.map(createToolEntry);
