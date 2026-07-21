import type {
  SessionDriver,
  SessionRef,
  SessionSnapshot,
  WorkspaceRef,
} from "@fraym-ai/driver";
import {
  createScriptedDriver,
  type DemoScript,
  type ScriptedEvent,
} from "@fraym-ai/driver/mock";

const workspace: WorkspaceRef = {
  workspaceId: "fixture-workspace",
  path: "/workspace/acme-cockpit",
  displayName: "Acme Cockpit",
};
function snapshot(id: string, title: string): SessionSnapshot {
  return {
    ref: { workspaceId: workspace.workspaceId, sessionId: id },
    workspace,
    title,
    status: "idle",
    updatedAt: "2026-06-06T12:00:00.000Z",
  };
}
export function makeToolDemo(
  id: string,
  title: string,
  toolName: string,
): DemoScript {
  const callId = `${id}-call`;
  return {
    speed: 1,
    snapshot: snapshot(id, title),
    intro: [
      {
        event: {
          type: "queuedMessageStarted",
          message: {
            id: `${id}-queued`,
            mode: "followUp",
            text: `Demonstrate ${toolName}`,
            createdAt: "2026-06-06T12:00:00.000Z",
            updatedAt: "2026-06-06T12:00:00.000Z",
          },
        } satisfies ScriptedEvent,
      },
      {
        delayMs: 20,
        event: {
          type: "assistantDelta",
          text: `I’ll use ${toolName}.`,
        } satisfies ScriptedEvent,
      },
      {
        delayMs: 20,
        event: {
          type: "toolStarted",
          callId,
          toolName,
          input: { path: "src/example.ts" },
        } satisfies ScriptedEvent,
      },
      {
        delayMs: 30,
        event: {
          type: "toolFinished",
          callId,
          success: true,
          output: { ok: true, summary: `${toolName} completed` },
        } satisfies ScriptedEvent,
      },
      {
        delayMs: 10,
        event: { type: "runCompleted", snapshot: snapshot(id, title) } satisfies ScriptedEvent,
      },
    ],
  };
}

const specs = {
  ask: ["Ask for deployment target", "ask"],
  astEdit: ["Structural edit", "ast_edit"],
  astGrep: ["Structural search", "ast_grep"],
  bash: ["Run project checks", "bash"],
  browser: ["Inspect example.com", "browser"],
  calc: ["Calculate a token budget", "calc"],
  checkpoint: ["Checkpoint current work", "checkpoint"],
  edit: ["Edit request validation", "edit"],
  eval: ["Evaluate a data set", "eval"],
  find: ["Find configuration files", "find"],
  fraym: ["Rate-limit auth middleware", "read"],
  generateImage: ["Generate a product illustration", "generate_image"],
  github: ["Review a pull request", "github"],
  goal: ["Track a delivery goal", "goal"],
  inspectImage: ["Inspect an interface capture", "inspect_image"],
  irc: ["Relay a team message", "relay"],
  job: ["Run background checks", "job"],
  loop: ["Review scheduled work", "loop"],
  lsp: ["Inspect diagnostics", "lsp"],
  memory: ["Review retained notes", "memory"],
  read: ["Read source files", "read"],
  reasoning: ["Reason through a refactor", "reasoning"],
  recall: ["Recall project context", "recall"],
  reflect: ["Reflect on the result", "reflect"],
  renderMermaid: ["Render an architecture diagram", "render_mermaid"],
  reportToolIssue: ["Report a tool issue", "report_tool_issue"],
  resolve: ["Resolve a task", "resolve"],
  retain: ["Retain project context", "retain"],
  rewind: ["Rewind a session", "rewind"],
  search: ["Search the repository", "search"],
  searchToolBm25: ["Search the tool catalog", "search_tool_bm25"],
  skill: ["Load a review skill", "skill"],
  ssh: ["Inspect a remote service", "ssh"],
  studio: ["Draft a showcase artifact", "studio"],
  task: ["Dispatch parallel analysis", "task"],
  todo: ["Update a task list", "todo"],
  toolGroup: ["Run related probes", "tool_group"],
  unrealMcp: ["Inspect an Unreal project", "mcp__editor_inspect"],
  verber: ["Demonstrate working language", "read"],
  webSearch: ["Research primary sources", "web_search"],
  write: ["Write a source module", "write"],
} as const;
type SpecKey = keyof typeof specs;
export const DEMO_SCRIPTS = Object.freeze(
  Object.fromEntries(
    Object.entries(specs).map(([key, [title, tool]]) => [
      key,
      makeToolDemo(`fixture-${key}`, title, tool),
    ]),
  ) as Record<SpecKey, DemoScript>,
);
export function demoDriver(key: SpecKey, speed?: number): SessionDriver {
  const script = DEMO_SCRIPTS[key];
  return createScriptedDriver(
    speed === undefined ? script : { ...script, speed },
  );
}
export function demoRef(key: SpecKey): SessionRef {
  return DEMO_SCRIPTS[key].snapshot.ref;
}

export const askDemoScript = DEMO_SCRIPTS.ask;
export const astEditDemoScript = DEMO_SCRIPTS.astEdit;
export const astGrepDemoScript = DEMO_SCRIPTS.astGrep;
export const bashDemoScript = DEMO_SCRIPTS.bash;
export const browserDemoScript = DEMO_SCRIPTS.browser;
export const calcDemoScript = DEMO_SCRIPTS.calc;
export const checkpointDemoScript = DEMO_SCRIPTS.checkpoint;
export const editDemoScript = DEMO_SCRIPTS.edit;
export const evalDemoScript = DEMO_SCRIPTS.eval;
export const findDemoScript = DEMO_SCRIPTS.find;
export const fraymDemoScript = DEMO_SCRIPTS.fraym;
export const generateImageDemoScript = DEMO_SCRIPTS.generateImage;
export const githubDemoScript = DEMO_SCRIPTS.github;
export const goalDemoScript = DEMO_SCRIPTS.goal;
export const inspectImageDemoScript = DEMO_SCRIPTS.inspectImage;
export const loopDemoScript = DEMO_SCRIPTS.loop;
export const lspDemoScript = DEMO_SCRIPTS.lsp;
export const readDemoScript = DEMO_SCRIPTS.read;
export const reasoningDemoScript = DEMO_SCRIPTS.reasoning;
export const recallDemoScript = DEMO_SCRIPTS.recall;
export const reflectDemoScript = DEMO_SCRIPTS.reflect;
export const renderMermaidDemoScript = DEMO_SCRIPTS.renderMermaid;
export const reportToolIssueDemoScript = DEMO_SCRIPTS.reportToolIssue;
export const resolveDemoScript = DEMO_SCRIPTS.resolve;
export const retainDemoScript = DEMO_SCRIPTS.retain;
export const rewindDemoScript = DEMO_SCRIPTS.rewind;
export const searchDemoScript = DEMO_SCRIPTS.search;
export const sshDemoScript = DEMO_SCRIPTS.ssh;
export const taskDemoScript = DEMO_SCRIPTS.task;
export const todoDemoScript = DEMO_SCRIPTS.todo;
export const toolGroupDemoScript = DEMO_SCRIPTS.toolGroup;
export const unrealMcpDemoScript = DEMO_SCRIPTS.unrealMcp;
export const verberDemoScript = DEMO_SCRIPTS.verber;
export const webSearchDemoScript = DEMO_SCRIPTS.webSearch;
export const writeDemoScript = DEMO_SCRIPTS.write;

export const FRAYM_DEMO_SESSION_REF = demoRef("fraym");
export const READ_DEMO_SESSION_REF = demoRef("read");
export const EDIT_DEMO_SESSION_REF = demoRef("edit");
export const WRITE_DEMO_SESSION_REF = demoRef("write");
export const BASH_DEMO_SESSION_REF = demoRef("bash");
export const TOOL_GROUP_DEMO_SESSION_REF = demoRef("toolGroup");
export const REASONING_DEMO_SESSION_REF = demoRef("reasoning");
export const VERBER_DEMO_SESSION_REF = demoRef("verber");
export const SEARCH_DEMO_SESSION_REF = demoRef("search");
export const SSH_DEMO_SESSION_REF = demoRef("ssh");
export const EVAL_DEMO_SESSION_REF = demoRef("eval");
export const TASK_DEMO_SESSION_REF = demoRef("task");
export const TODO_DEMO_SESSION_REF = demoRef("todo");
export const FIND_DEMO_SESSION_REF = demoRef("find");
export const CALC_DEMO_SESSION_REF = demoRef("calc");
export const LOOP_DEMO_SESSION_REF = demoRef("loop");
export const UNREAL_MCP_DEMO_SESSION_REF = demoRef("unrealMcp");
export const ASK_DEMO_SESSION_REF = demoRef("ask");
export const AST_GREP_DEMO_SESSION_REF = demoRef("astGrep");
export const AST_EDIT_DEMO_SESSION_REF = demoRef("astEdit");
export const LSP_DEMO_SESSION_REF = demoRef("lsp");
export const WEB_SEARCH_DEMO_SESSION_REF = demoRef("webSearch");
export const GITHUB_DEMO_SESSION_REF = demoRef("github");
export const BROWSER_DEMO_SESSION_REF = demoRef("browser");
export const INSPECT_IMAGE_DEMO_SESSION_REF = demoRef("inspectImage");
export const GENERATE_IMAGE_DEMO_SESSION_REF = demoRef("generateImage");
export const RESOLVE_DEMO_SESSION_REF = demoRef("resolve");
export const REWIND_DEMO_SESSION_REF = demoRef("rewind");
export const RECALL_DEMO_SESSION_REF = demoRef("recall");
export const RETAIN_DEMO_SESSION_REF = demoRef("retain");
export const REFLECT_DEMO_SESSION_REF = demoRef("reflect");
export const REPORT_TOOL_ISSUE_DEMO_SESSION_REF = demoRef("reportToolIssue");
export const RENDER_MERMAID_DEMO_SESSION_REF = demoRef("renderMermaid");
export const GOAL_DEMO_SESSION_REF = demoRef("goal");
export const CHECKPOINT_DEMO_SESSION_REF = demoRef("checkpoint");
export const SKILL_DEMO_SESSION_REF = demoRef("skill");
export const IRC_DEMO_SESSION_REF = demoRef("irc");
export const JOB_DEMO_SESSION_REF = demoRef("job");
export const SEARCH_TOOL_BM25_DEMO_SESSION_REF = demoRef("searchToolBm25");

const factory = (key: SpecKey) => (options?: { readonly speed?: number }) =>
  demoDriver(key, options?.speed);
export const createFraymDemoDriver = factory("fraym");
export const createReadDemoDriver = factory("read");
export const createEditDemoDriver = factory("edit");
export const createWriteDemoDriver = factory("write");
export const createBashDemoDriver = factory("bash");
export const createToolGroupDemoDriver = factory("toolGroup");
export const createReasoningDemoDriver = factory("reasoning");
export const createVerberDemoDriver = factory("verber");
export const createSearchDemoDriver = factory("search");
export const createSshDemoDriver = factory("ssh");
export const createEvalDemoDriver = factory("eval");
export const createTaskDemoDriver = factory("task");
export const createTodoDemoDriver = factory("todo");
export const createFindDemoDriver = factory("find");
export const createCalcDemoDriver = factory("calc");
export const createLoopDemoDriver = factory("loop");
export const createUnrealMcpDemoDriver = factory("unrealMcp");
export const createAskDemoDriver = factory("ask");
export const createAstGrepDemoDriver = factory("astGrep");
export const createAstEditDemoDriver = factory("astEdit");
export const createLspDemoDriver = factory("lsp");
export const createWebSearchDemoDriver = factory("webSearch");
export const createGithubDemoDriver = factory("github");
export const createBrowserDemoDriver = factory("browser");
export const createInspectImageDemoDriver = factory("inspectImage");
export const createGenerateImageDemoDriver = factory("generateImage");
export const createResolveDemoDriver = factory("resolve");
export const createRewindDemoDriver = factory("rewind");
export const createRecallDemoDriver = factory("recall");
export const createRetainDemoDriver = factory("retain");
export const createReflectDemoDriver = factory("reflect");
export const createReportToolIssueDemoDriver = factory("reportToolIssue");
export const createRenderMermaidDemoDriver = factory("renderMermaid");
export const createGoalDemoDriver = factory("goal");
export const createCheckpointDemoDriver = factory("checkpoint");
export const createSkillDemoDriver = factory("skill");
export const createIrcDemoDriver = factory("irc");
export const createJobDemoDriver = factory("job");
export const createSearchToolBm25DemoDriver = factory("searchToolBm25");
export const createStudioDemoDriver = factory("studio");
