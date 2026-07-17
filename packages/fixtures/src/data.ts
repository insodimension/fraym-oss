export type AskVariation =
  | "single"
  | "multi-select"
  | "with-description"
  | "multi-part"
  | "custom-input"
  | "error"
  | "pending";
export type PickerVariation =
  "single" | "multi" | "multi-preselected" | "plain" | "long";
export type CalcVariation =
  "simple" | "complex" | "string" | "error" | "pending";
export type GenerateVariation = "normal" | "edit" | "no-images" | "error";
export type GithubVariation =
  | "repo-view"
  | "search-issues"
  | "search-code"
  | "pr-create"
  | "pr-checkout"
  | "run-watch"
  | "error";
export type GoalOperation = "create" | "update" | "get";
export type GoalStatus = "active" | "paused" | "complete" | "blocked";
export type GoalVariation = "active" | "paused" | "complete" | "error";
export type InspectVariation = "file" | "url" | "multiple" | "error";
export type IrcVariation = "message" | "join" | "leave" | "error";
export type JobVariation = "running" | "completed" | "failed";
export type LoopVariation =
  "list" | "create" | "pause" | "resume" | "retire" | "error";
export type ResolveVariation = "success" | "partial" | "error";
export type SearchToolBm25Variation = "results" | "empty" | "error";
export type UnrealMcpVariation = "inspect" | "compile" | "error";
export type WebSearchVariation =
  | "normal"
  | "answer-only"
  | "sources-only"
  | "acme"
  | "perplexity"
  | "fallback"
  | "error";
export type RenderMermaidVariation =
  "flowchart" | "sequence" | "class" | "error";
export type SkillName = "review" | "research" | "testing";
export interface ToolGroupCallSpec {
  readonly id: string;
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly output?: unknown;
}
export interface SearchCitation {
  readonly title: string;
  readonly url: string;
  readonly snippet?: string;
}
export interface SearchSource extends SearchCitation {
  readonly domain?: string;
}
export interface SearchUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
}
export interface SearchResponse {
  readonly answer: string;
  readonly sources: readonly SearchSource[];
  readonly usage?: SearchUsage;
}

function variation<T extends string>(
  names: readonly T[],
  create: (name: T) => unknown,
): Record<T, any> {
  return Object.fromEntries(
    names.map((name) => [name, create(name)]),
  ) as Record<T, any>;
}
const toolSample = (name: string) => ({
  input: { query: `${name} fixture`, path: "src/example.ts" },
  output: { ok: !name.includes("error"), summary: `${name} result` },
  details: { durationMs: 42 },
});
export const ASK_INPUT = variation<AskVariation>(
  [
    "single",
    "multi-select",
    "with-description",
    "multi-part",
    "custom-input",
    "error",
    "pending",
  ],
  (name) => toolSample(name).input,
);
export const ASK_DETAILS = variation(
  Object.keys(ASK_INPUT) as AskVariation[],
  (name) => toolSample(name).details,
);
export const PICKER_VARIATIONS: readonly PickerVariation[] = [
  "single",
  "multi",
  "multi-preselected",
  "plain",
  "long",
];
export const PICKER_REQUESTS = variation(PICKER_VARIATIONS, (name) => ({
  id: `picker-${name}`,
  kind: "select",
  title: "Choose a target",
  options: ["Web", "Desktop", "Other"],
  allowMultiple: name.startsWith("multi"),
}));
export const CALC_OUTPUT = variation<CalcVariation>(
  ["simple", "complex", "string", "error", "pending"],
  (name) => (name === "error" ? "Unable to evaluate expression" : "42"),
);
export const CALC_INPUT = variation(
  Object.keys(CALC_OUTPUT) as CalcVariation[],
  (name) => ({ expression: name === "complex" ? "(12 * 4) - 6" : "40 + 2" }),
);
export const BROWSER_INPUT = { action: "open", url: "https://example.com" };
export const BROWSER_OPEN_OUTPUT = "Opened example.com";
export const BROWSER_RUN_OUTPUT = "Example Domain";
export const BROWSER_CLOSE_OUTPUT = "Closed tab";
export const BROWSER_CAPTURE_CAPTION = "Saved showcase capture";
export const BROWSER_ERROR_OUTPUT = "Navigation timed out";
export const BROWSER_TRUNCATED_OUTPUT = "Result truncated";
export const BROWSER_SCREENSHOT_B64 = "PHN2Zy8+";
export const BROWSER_DETAILS = {
  url: "https://example.com",
  title: "Example Domain",
};
export const GENERATE_INPUT = variation<GenerateVariation>(
  ["normal", "edit", "no-images", "error"],
  (name) => ({ prompt: `${name} abstract interface illustration` }),
);
export const GENERATE_OUTPUT = variation(
  Object.keys(GENERATE_INPUT) as GenerateVariation[],
  (name) => `${name} generation result`,
);
export const GENERATE_DETAILS = variation(
  Object.keys(GENERATE_INPUT) as GenerateVariation[],
  () => ({ width: 1024, height: 1024 }),
);
export const INSPECT_INPUT = variation<InspectVariation>(
  ["file", "url", "multiple", "error"],
  (name) => ({
    source:
      name === "url"
        ? "https://example.com/capture.png"
        : "/workspace/capture.png",
  }),
);
export const INSPECT_OUTPUT = variation(
  Object.keys(INSPECT_INPUT) as InspectVariation[],
  (name) => `${name} inspection`,
);
export const INSPECT_DETAILS = variation(
  Object.keys(INSPECT_INPUT) as InspectVariation[],
  () => ({ width: 1440, height: 900 }),
);
export const GITHUB_INPUT = variation<GithubVariation>(
  [
    "repo-view",
    "search-issues",
    "search-code",
    "pr-create",
    "pr-checkout",
    "run-watch",
    "error",
  ],
  (name) => ({ operation: name, repository: "acme/cockpit" }),
);
export const GITHUB_OUTPUT = variation(
  Object.keys(GITHUB_INPUT) as GithubVariation[],
  (name) => `${name} completed`,
);
export const GITHUB_DETAILS = variation(
  Object.keys(GITHUB_INPUT) as GithubVariation[],
  (name) => ({ operation: name, repository: "acme/cockpit" }),
);
export const GITHUB_ERROR_OUTPUT = "API rate limit exceeded";
export const GITHUB_REPO_VIEW_OUTPUT = ["acme/cockpit", "main"];
export const GITHUB_SEARCH_ISSUES_OUTPUT = ["#42 Improve retries"];
export const GITHUB_SEARCH_CODE_OUTPUT = ["src/retry.ts:12"];
export const GITHUB_PR_CREATE_OUTPUT = ["Created pull request #43"];
export const GITHUB_PR_CHECKOUT_OUTPUT = ["Checked out pull request #43"];
export const GITHUB_RUN_WATCH_DETAILS = { status: "running" };
export const GITHUB_RUN_WATCH_COMPLETED_DETAILS = { status: "completed" };
export const GOAL_VARIATIONS: readonly GoalVariation[] = [
  "active",
  "paused",
  "complete",
  "error",
];
export const GOAL_INPUT = variation(GOAL_VARIATIONS, (name) => ({
  objective: "Ship the renderer",
  status: name,
}));
export const GOAL_DETAILS = variation(GOAL_VARIATIONS, (name) => ({
  id: `goal-${name}`,
  tokensUsed: 1200,
}));
export const GOAL_OUTPUT_TEXT = variation(
  GOAL_VARIATIONS,
  (name) => `Goal ${name}`,
);
export const GOAL_ERROR_OUTPUT_TEXT = "Goal update failed";
export const IRC_INPUT = variation<IrcVariation>(
  ["message", "join", "leave", "error"],
  (name) => ({ action: name, channel: "#engineering" }),
);
export const IRC_DETAILS = variation(
  Object.keys(IRC_INPUT) as IrcVariation[],
  (name) => ({ action: name }),
);
export const IRC_OUTPUT_TEXT = variation(
  Object.keys(IRC_INPUT) as IrcVariation[],
  (name) => `${name} acknowledged`,
);
export const JOB_INPUT = variation<JobVariation>(
  ["running", "completed", "failed"],
  (name) => ({ id: `job-${name}` }),
);
export const JOB_DETAILS = variation(
  Object.keys(JOB_INPUT) as JobVariation[],
  (status) => ({ status }),
);
export const JOB_OUTPUT_TEXT = variation(
  Object.keys(JOB_INPUT) as JobVariation[],
  (status) => `Job ${status}`,
);
export const LOOP_INPUT = variation<LoopVariation>(
  ["list", "create", "pause", "resume", "retire", "error"],
  (operation) => ({ operation, workspaceId: "fixture-workspace" }),
);
export const LOOP_DETAILS = variation(
  Object.keys(LOOP_INPUT) as LoopVariation[],
  (operation) => ({ operation }),
);
export const LOOP_OUTPUT = variation(
  Object.keys(LOOP_INPUT) as LoopVariation[],
  (operation) => `${operation} scheduled work`,
);
export const LOOP_RENDERER_DESCRIPTOR = {
  match: "loop",
  use: "summary",
  title: "Scheduled work",
};
const basicNames = ["success", "partial", "error"] as const;
export const RESOLVE_INPUT = variation<ResolveVariation>(
  basicNames,
  (name) => ({ target: "task-1", mode: name }),
);
export const RESOLVE_DETAILS = variation(basicNames, (name) => ({
  status: name,
}));
export const RESOLVE_OUTPUT_TEXT = variation(
  basicNames,
  (name) => `Resolve ${name}`,
);
export const SEARCH_TOOL_BM25_INPUT = variation<SearchToolBm25Variation>(
  ["results", "empty", "error"],
  (name) => ({ query: name }),
);
export const SEARCH_TOOL_BM25_DETAILS = variation(
  Object.keys(SEARCH_TOOL_BM25_INPUT) as SearchToolBm25Variation[],
  (name) => ({ status: name }),
);
export const SEARCH_TOOL_BM25_OUTPUT_TEXT = variation(
  Object.keys(SEARCH_TOOL_BM25_INPUT) as SearchToolBm25Variation[],
  (name) => `${name} tool search`,
);
export const UNREAL_MCP_TOOL_NAMES = [
  "mcp__editor_inspect",
  "mcp__editor_compile",
] as const;
export const UNREAL_MCP_INPUT = variation<UnrealMcpVariation>(
  ["inspect", "compile", "error"],
  (name) => ({ operation: name, asset: "/Game/Example" }),
);
export const UNREAL_MCP_DETAILS = variation(
  Object.keys(UNREAL_MCP_INPUT) as UnrealMcpVariation[],
  (name) => ({ status: name }),
);
export const UNREAL_MCP_OUTPUT = variation(
  Object.keys(UNREAL_MCP_INPUT) as UnrealMcpVariation[],
  (name) => `${name} result`,
);
export const UNREAL_MCP_ERROR_OUTPUT = "Editor request failed";
export const TOOL_GROUP_CALLS: readonly ToolGroupCallSpec[] = [
  {
    id: "probe-1",
    name: "read",
    input: { path: "package.json" },
    output: "{}",
  },
  {
    id: "probe-2",
    name: "find",
    input: { query: "theme" },
    output: ["theme.ts"],
  },
];
export const CHECKPOINT_VARIATIONS = ["pending", "success"] as const;
export const CHECKPOINT_INPUT = variation(CHECKPOINT_VARIATIONS, (status) => ({
  status,
}));
export const CHECKPOINT_DETAILS = variation(
  CHECKPOINT_VARIATIONS,
  (status) => ({ status }),
);
export const CHECKPOINT_OUTPUT_TEXT = variation(
  CHECKPOINT_VARIATIONS,
  (status) => `Checkpoint ${status}`,
);
export const REWIND_VARIATIONS = ["success", "error"] as const;
export const REWIND_INPUT = variation(REWIND_VARIATIONS, (status) => ({
  status,
}));
export const REWIND_DETAILS = variation(REWIND_VARIATIONS, (status) => ({
  status,
}));
export const REWIND_OUTPUT_TEXT = variation(
  REWIND_VARIATIONS,
  (status) => `Rewind ${status}`,
);
export const RECALL_VARIATIONS = ["results", "empty", "error"] as const;
export const RECALL_INPUT = variation(RECALL_VARIATIONS, (status) => ({
  query: status,
}));
export const RECALL_DETAILS = variation(RECALL_VARIATIONS, (status) => ({
  status,
}));
export const RECALL_OUTPUT_TEXT = variation(
  RECALL_VARIATIONS,
  (status) => `Recall ${status}`,
);
export const RETAIN_VARIATIONS = ["success", "error"] as const;
export const RETAIN_INPUT = variation(RETAIN_VARIATIONS, (status) => ({
  note: status,
}));
export const RETAIN_DETAILS = variation(RETAIN_VARIATIONS, (status) => ({
  status,
}));
export const RETAIN_OUTPUT_TEXT = variation(
  RETAIN_VARIATIONS,
  (status) => `Retain ${status}`,
);
export const REFLECT_VARIATIONS = ["success", "error"] as const;
export const REFLECT_INPUT = variation(REFLECT_VARIATIONS, (status) => ({
  topic: status,
}));
export const REFLECT_DETAILS = variation(REFLECT_VARIATIONS, (status) => ({
  status,
}));
export const REFLECT_OUTPUT_TEXT = variation(
  REFLECT_VARIATIONS,
  (status) => `Reflect ${status}`,
);
export const REPORT_TOOL_ISSUE_VARIATIONS = [
  "pending",
  "success",
  "error",
] as const;
export const REPORT_TOOL_ISSUE_INPUT = variation(
  REPORT_TOOL_ISSUE_VARIATIONS,
  (status) => ({ tool: "read", status }),
);
export const REPORT_TOOL_ISSUE_OUTPUT_TEXT = variation(
  REPORT_TOOL_ISSUE_VARIATIONS,
  (status) => `Report ${status}`,
);
export const RENDER_MERMAID_VARIATIONS: readonly RenderMermaidVariation[] = [
  "flowchart",
  "sequence",
  "class",
  "error",
];
export const RENDER_MERMAID_INPUT = variation(
  RENDER_MERMAID_VARIATIONS,
  (kind) => ({
    source: kind === "flowchart" ? "flowchart LR; A-->B" : `${kind} diagram`,
  }),
);
export const RENDER_MERMAID_DETAILS = variation(
  RENDER_MERMAID_VARIATIONS,
  (kind) => ({ kind }),
);
export const RENDER_MERMAID_OUTPUT_TEXT = variation(
  RENDER_MERMAID_VARIATIONS,
  (kind) => `${kind} rendered`,
);
export const SKILL_BODIES = {
  review: "Review the change for correctness.",
  research: "Research primary sources.",
  testing: "Exercise behavior and edge cases.",
};
export const SKILL_CARD_SAMPLES = Object.entries(SKILL_BODIES).map(
  ([name, body]) => ({ name, body }),
);
export const NORMAL_OUTPUT = "A sourced answer with two references.";
export const ANSWER_ONLY_OUTPUT = "A concise sourced answer.";
export const SOURCES_ONLY_OUTPUT = "https://example.com/source";
export const ACME_OUTPUT = "Provider-formatted answer";
export const PERPLEXITY_OUTPUT = "Search-formatted answer";
export const FALLBACK_OUTPUT = "Fallback search result";
export const ERROR_OUTPUT = "Search unavailable";
export const INPUT = { query: "agent interface accessibility" };
export const RESPONSE: SearchResponse = {
  answer: NORMAL_OUTPUT,
  sources: [{ title: "Example source", url: "https://example.com/source" }],
  usage: { inputTokens: 12, outputTokens: 34 },
};
export const OUTPUT = variation<WebSearchVariation>(
  [
    "normal",
    "answer-only",
    "sources-only",
    "acme",
    "perplexity",
    "fallback",
    "error",
  ],
  (name) => `${name} output`,
);
export const EVAL_FIGURE_B64 = "PHN2Zy8+";
export function genNumberedDiff(lines: number, indentBase = 1): string {
  return Array.from(
    { length: lines },
    (_, index) =>
      `${String(index + 1).padStart(4)} ${" ".repeat(indentBase)}${index % 2 ? "+" : "-"} line ${index + 1}`,
  ).join("\n");
}
export function genTsContent(functions: number): string {
  return Array.from(
    { length: functions },
    (_, index) =>
      `export function task${index + 1}(): number { return ${index + 1}; }`,
  ).join("\n\n");
}
export function toolResult(text: string, details?: unknown, isError = false) {
  return { content: [{ type: "text", text }], details, isError };
}
export function optionalToolResult(
  text?: string,
  details?: unknown,
  isError = false,
) {
  return text === undefined && details === undefined
    ? undefined
    : toolResult(text ?? "", details, isError);
}
export function pendingToolCall(
  callId: string,
  toolName: string,
  input: unknown,
) {
  return { callId, toolName, input, status: "running" as const };
}

export interface MemoryDemoNote {
  readonly id: string;
  readonly title: string;
  readonly markdown: string;
  readonly tags: readonly string[];
  readonly type: string;
  readonly folder: string;
}
export const MEMORY_DEMO_NOW = "2026-06-06T12:00:00.000Z";
export const MEMORY_DEMO_NOTES: readonly MemoryDemoNote[] = [
  {
    id: "note-1",
    title: "Renderer contract",
    markdown: "Use the typed registry for every tool surface.",
    tags: ["renderer", "ui"],
    type: "decision",
    folder: "architecture",
  },
  {
    id: "note-2",
    title: "QA checklist",
    markdown: "Run type checks and behavioral tests.",
    tags: ["qa"],
    type: "guide",
    folder: "delivery",
  },
];
export const MEMORY_DOCS_NOTES = MEMORY_DEMO_NOTES;
export const MEMORY_DEMO_OVERVIEW = {
  total: MEMORY_DEMO_NOTES.length,
  types: ["decision", "guide"],
};
export const MEMORY_DEMO_SUMMARIES = MEMORY_DEMO_NOTES.map((note) => ({
  id: note.id,
  title: note.title,
}));
export const MEMORY_DEMO_WAKE = { message: "Review retained project context" };
export const memoryDemoFoldersOf = (notes: readonly MemoryDemoNote[]) => [
  ...new Set(notes.map((note) => note.folder)),
];
export const memoryDemoTagsOf = (notes: readonly MemoryDemoNote[]) => [
  ...new Set(notes.flatMap((note) => note.tags)),
];
export const memoryDemoTypesOf = (
  notes: readonly MemoryDemoNote[],
  fallback: readonly string[] = [],
) => [...new Set([...fallback, ...notes.map((note) => note.type)])];
export const memoryDemoOverviewOf = (notes: readonly MemoryDemoNote[]) => ({
  total: notes.length,
  folders: memoryDemoFoldersOf(notes),
  tags: memoryDemoTagsOf(notes),
});
export const memoryDocsOverviewOf = memoryDemoOverviewOf;
export const memoryDemoSnippetOf = (markdown: string) =>
  markdown.replace(/\s+/g, " ").slice(0, 120);
export const summarizeMemoryDemoNote = (note: MemoryDemoNote) => ({
  id: note.id,
  title: note.title,
  snippet: memoryDemoSnippetOf(note.markdown),
});
export const MEMORY_DEMO_VAULTS = [
  { id: "project", label: "Project notes", path: "~/.agent/vault" },
];
export type MemoryDemoDriverOptions = { readonly speed?: number };
export interface StudioMockArtifact {
  readonly id: string;
  readonly title: string;
  readonly kind: "html" | "markdown" | "code";
  readonly content: string;
}
export const STUDIO_MOCK_ARTIFACTS: readonly StudioMockArtifact[] = [
  {
    id: "artifact-1",
    title: "Cockpit release brief",
    kind: "markdown",
    content: "# Release brief\n\nPrepared for Jordan Lee at Acme Labs.",
  },
];
export const studioMockArtifact = (id: string) =>
  STUDIO_MOCK_ARTIFACTS.find((artifact) => artifact.id === id);
export const STUDIO_DEMO_RECIPES = [{ id: "brief", name: "Release brief" }];
export type StudioDemoDriverOptions = { readonly speed?: number };
