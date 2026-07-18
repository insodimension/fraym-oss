import type { SessionDriver, SessionRef } from "@fraym/driver";
import type { DemoScript } from "@fraym/driver/mock";
import { createScriptedDriver } from "@fraym/driver/mock";
import { astEditDemoScript } from "./ast-edit-demo";
import { astGrepDemoScript } from "./ast-grep-demo";
import { bashDemoScript } from "./bash-demo";
import { browserDemoScript } from "./browser-demo";
import { calcDemoScript } from "./calc-demo";
import { evalDemoScript } from "./eval-demo";
import { findDemoScript } from "./find-demo";
import { fraymDemoScript } from "./fraym-demo";
import { generateImageDemoScript } from "./generate-image-demo";
import { githubDemoScript } from "./github-demo";
import { goalDemoScript } from "./goal-demo";
import { inspectImageDemoScript } from "./inspect-image-demo";
import { lspDemoScript } from "./lsp-demo";
import { readDemoScript } from "./read-demo";
import { reasoningDemoScript } from "./reasoning-demo";
import { recallDemoScript } from "./recall-demo";
import { reflectDemoScript } from "./reflect-demo";
import { renderMermaidDemoScript } from "./render-mermaid-demo";
import { reportToolIssueDemoScript } from "./report-tool-issue-demo";
import { resolveDemoScript } from "./resolve-demo";
import { retainDemoScript } from "./retain-demo";
import { rewindDemoScript } from "./rewind-demo";
import { searchDemoScript } from "./search-demo";
import { sshDemoScript } from "./ssh-demo";
import { todoDemoScript } from "./todo-demo";
import { toolGroupDemoScript } from "./tool-group-demo";
import { webSearchDemoScript } from "./web-search-demo";
import { writeDemoScript } from "./write-demo";

export * from "./catalog";
export * from "./data";
export { fraymDemoScript };

export { ASK_DETAILS, ASK_INPUT, type AskVariation } from "./ask-outputs";
export { CAPTURE_CAPTION as BROWSER_CAPTURE_CAPTION, CLOSE_OUTPUT as BROWSER_CLOSE_OUTPUT, DETAILS as BROWSER_DETAILS, ERROR_OUTPUT as BROWSER_ERROR_OUTPUT, INPUT as BROWSER_INPUT, OPEN_OUTPUT as BROWSER_OPEN_OUTPUT, RUN_OUTPUT as BROWSER_RUN_OUTPUT, SCREENSHOT_B64 as BROWSER_SCREENSHOT_B64, TRUNCATED_OUTPUT as BROWSER_TRUNCATED_OUTPUT } from "./browser-outputs";
export { CALC_INPUT, CALC_OUTPUT, type CalcVariation } from "./calc-outputs";
export { EVAL_FIGURE_B64 } from "./eval-demo";
export { DETAILS as GENERATE_DETAILS, type GenerateVariation, INPUT as GENERATE_INPUT, OUTPUT as GENERATE_OUTPUT } from "./generate-image-outputs";
export { DETAILS as GITHUB_DETAILS, type GithubVariation, INPUT as GITHUB_INPUT, OUTPUT as GITHUB_OUTPUT } from "./github-outputs";
export { GOAL_DETAILS, GOAL_ERROR_OUTPUT_TEXT, GOAL_INPUT, GOAL_OUTPUT_TEXT, GOAL_VARIATIONS, type GoalVariation } from "./goal-outputs";
export { DETAILS as INSPECT_DETAILS, INPUT as INSPECT_INPUT, type InspectVariation, OUTPUT as INSPECT_OUTPUT } from "./inspect-image-outputs";
export { createIrcDemoDriver, IRC_DEMO_SESSION_REF } from "./irc-demo";
export { IRC_DETAILS, IRC_INPUT, IRC_OUTPUT_TEXT, type IrcVariation } from "./irc-outputs";
export { createJobDemoDriver, JOB_DEMO_SESSION_REF } from "./job-demo";
export { JOB_DETAILS, JOB_INPUT, JOB_OUTPUT_TEXT, type JobVariation } from "./job-outputs";
export { RESOLVE_DETAILS, RESOLVE_INPUT, RESOLVE_OUTPUT_TEXT, type ResolveVariation } from "./resolve-outputs";
export { createSearchToolBm25DemoDriver, SEARCH_TOOL_BM25_DEMO_SESSION_REF } from "./search-tool-bm25-demo";
export { SEARCH_TOOL_BM25_DETAILS, SEARCH_TOOL_BM25_INPUT, SEARCH_TOOL_BM25_OUTPUT_TEXT, type SearchToolBm25Variation } from "./search-tool-bm25-outputs";
export { optionalToolResult, pendingToolCall, toolResult } from "./tool-call-utils";
export { TOOL_GROUP_CALLS } from "./tool-group-outputs";
export { INPUT, OUTPUT, RESPONSE, type WebSearchVariation } from "./web-search-outputs";
export { genTsContent } from "./write-demo";
export { CHECKPOINT_DEMO_SESSION_REF, createCheckpointDemoDriver } from "./checkpoint-demo";
export { CHECKPOINT_DETAILS, CHECKPOINT_INPUT, CHECKPOINT_OUTPUT_TEXT, CHECKPOINT_VARIATIONS } from "./checkpoint-outputs";
export { REWIND_DETAILS, REWIND_INPUT, REWIND_OUTPUT_TEXT, REWIND_VARIATIONS } from "./rewind-outputs";
export { RECALL_DETAILS, RECALL_INPUT, RECALL_OUTPUT_TEXT, RECALL_VARIATIONS } from "./recall-outputs";
export { RETAIN_DETAILS, RETAIN_INPUT, RETAIN_OUTPUT_TEXT, RETAIN_VARIATIONS } from "./retain-outputs";
export { REFLECT_DETAILS, REFLECT_INPUT, REFLECT_OUTPUT_TEXT, REFLECT_VARIATIONS } from "./reflect-outputs";
export { REPORT_TOOL_ISSUE_INPUT, REPORT_TOOL_ISSUE_OUTPUT_TEXT, REPORT_TOOL_ISSUE_VARIATIONS } from "./report-tool-issue-outputs";
export { RENDER_MERMAID_DETAILS, RENDER_MERMAID_INPUT, RENDER_MERMAID_OUTPUT_TEXT, type RenderMermaidVariation } from "./render-mermaid-outputs";
export { WORKFLOW_CONCEPT, WORKFLOW_NOW_MS, type WorkflowAgent, type WorkflowAgentStatus, type WorkflowConcept, type WorkflowPhase } from "./workflow-concepts-outputs";

interface DemoDriverOptions {
	readonly speed?: number;
}

function demoSessionRef(script: DemoScript): SessionRef {
	return script.snapshot.ref;
}

function demoDriver(script: DemoScript, opts?: DemoDriverOptions): SessionDriver {
	return createScriptedDriver(opts?.speed === undefined ? script : { ...script, speed: opts.speed });
}

/** The session ref the demo script's seed snapshot is keyed to. */
export const FRAYM_DEMO_SESSION_REF: SessionRef = demoSessionRef(fraymDemoScript);

/** A ready-to-mount scripted driver replaying the Fraym demo. `speed` is a delay multiplier. */
export function createFraymDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(fraymDemoScript, opts);
}

/** The session ref the read-demo script's seed snapshot is keyed to. */
export const READ_DEMO_SESSION_REF: SessionRef = demoSessionRef(readDemoScript);

/** A ready-to-mount scripted driver replaying the read-focused demo. `speed` is a delay multiplier. */
export function createReadDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(readDemoScript, opts);
}

/** The session ref the write-demo script's seed snapshot is keyed to. */
export const WRITE_DEMO_SESSION_REF: SessionRef = demoSessionRef(writeDemoScript);

/** A ready-to-mount scripted driver replaying the write-focused demo. `speed` is a delay multiplier. */
export function createWriteDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(writeDemoScript, opts);
}

/** The session ref the bash-demo script's seed snapshot is keyed to. */
export const BASH_DEMO_SESSION_REF: SessionRef = demoSessionRef(bashDemoScript);

/** A ready-to-mount scripted driver replaying the bash-focused demo. `speed` is a delay multiplier. */
export function createBashDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(bashDemoScript, opts);
}

/** The session ref the tool-group-demo script's seed snapshot is keyed to. */
export const TOOL_GROUP_DEMO_SESSION_REF: SessionRef = demoSessionRef(toolGroupDemoScript);

/** A ready-to-mount scripted driver replaying the tool-group probe burst. `speed` is a delay multiplier. */
export function createToolGroupDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(toolGroupDemoScript, opts);
}

/** The session ref the reasoning-demo script's seed snapshot is keyed to. */
export const REASONING_DEMO_SESSION_REF: SessionRef = demoSessionRef(reasoningDemoScript);

/** A ready-to-mount scripted driver replaying the reasoning-focused demo. `speed` is a delay multiplier. */
export function createReasoningDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(reasoningDemoScript, opts);
}

/** The session ref the search-demo script's seed snapshot is keyed to. */
export const SEARCH_DEMO_SESSION_REF: SessionRef = demoSessionRef(searchDemoScript);

/** A ready-to-mount scripted driver replaying the search-focused demo. `speed` is a delay multiplier. */
export function createSearchDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(searchDemoScript, opts);
}

/** The session ref the ssh-demo script's seed snapshot is keyed to. */
export const SSH_DEMO_SESSION_REF: SessionRef = demoSessionRef(sshDemoScript);

/** A ready-to-mount scripted driver replaying the ssh-focused demo. `speed` is a delay multiplier. */
export function createSshDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(sshDemoScript, opts);
}

/** The session ref the eval-demo script's seed snapshot is keyed to. */
export const EVAL_DEMO_SESSION_REF: SessionRef = demoSessionRef(evalDemoScript);

/** A ready-to-mount scripted driver replaying the eval-focused demo. `speed` is a delay multiplier. */
export function createEvalDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(evalDemoScript, opts);
}

/** The session ref the todo-demo script's seed snapshot is keyed to. */
export const TODO_DEMO_SESSION_REF: SessionRef = demoSessionRef(todoDemoScript);

/** A ready-to-mount scripted driver replaying the todo-focused demo. `speed` is a delay multiplier. */
export function createTodoDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(todoDemoScript, opts);
}

/** The session ref the find-demo script's seed snapshot is keyed to. */
export const FIND_DEMO_SESSION_REF: SessionRef = demoSessionRef(findDemoScript);

/** A ready-to-mount scripted driver replaying the find-focused demo. `speed` is a delay multiplier. */
export function createFindDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(findDemoScript, opts);
}

/** The session ref the calc-demo script's seed snapshot is keyed to. */
export const CALC_DEMO_SESSION_REF: SessionRef = demoSessionRef(calcDemoScript);

/** A ready-to-mount scripted driver replaying the calc-focused demo. `speed` is a delay multiplier. */
export function createCalcDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(calcDemoScript, opts);
}

/** The session ref the ast-grep-demo script's seed snapshot is keyed to. */
export const AST_GREP_DEMO_SESSION_REF: SessionRef = demoSessionRef(astGrepDemoScript);

/** A ready-to-mount scripted driver replaying the ast-grep-focused demo. `speed` is a delay multiplier. */
export function createAstGrepDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(astGrepDemoScript, opts);
}

/** The session ref the ast-edit-demo script's seed snapshot is keyed to. */
export const AST_EDIT_DEMO_SESSION_REF: SessionRef = demoSessionRef(astEditDemoScript);

/** A ready-to-mount scripted driver replaying the ast-edit-focused demo. `speed` is a delay multiplier. */
export function createAstEditDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(astEditDemoScript, opts);
}

/** The session ref the lsp-demo script's seed snapshot is keyed to. */
export const LSP_DEMO_SESSION_REF: SessionRef = demoSessionRef(lspDemoScript);

/** A ready-to-mount scripted driver replaying the LSP-focused demo. `speed` is a delay multiplier. */
export function createLspDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(lspDemoScript, opts);
}

/** The session ref the web-search-demo script's seed snapshot is keyed to. */
export const WEB_SEARCH_DEMO_SESSION_REF: SessionRef = demoSessionRef(webSearchDemoScript);

/** A ready-to-mount scripted driver replaying the web-search-focused demo. `speed` is a delay multiplier. */
export function createWebSearchDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(webSearchDemoScript, opts);
}

/** The session ref the github-demo script's seed snapshot is keyed to. */
export const GITHUB_DEMO_SESSION_REF: SessionRef = demoSessionRef(githubDemoScript);

/** A ready-to-mount scripted driver replaying the github-focused demo. `speed` is a delay multiplier. */
export function createGithubDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(githubDemoScript, opts);
}

/** The session ref the browser-demo script's seed snapshot is keyed to. */
export const BROWSER_DEMO_SESSION_REF: SessionRef = demoSessionRef(browserDemoScript);

/** A ready-to-mount scripted driver replaying the browser-focused demo. `speed` is a delay multiplier. */
export function createBrowserDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(browserDemoScript, opts);
}

/** The session ref the inspect-image-demo script's seed snapshot is keyed to. */
export const INSPECT_IMAGE_DEMO_SESSION_REF: SessionRef = demoSessionRef(inspectImageDemoScript);

/** A ready-to-mount scripted driver replaying the inspect_image demo. */
export function createInspectImageDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(inspectImageDemoScript, opts);
}

/** The session ref the generate-image-demo script's seed snapshot is keyed to. */
export const GENERATE_IMAGE_DEMO_SESSION_REF: SessionRef = demoSessionRef(generateImageDemoScript);

/** A ready-to-mount scripted driver replaying the generate_image demo. */
export function createGenerateImageDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(generateImageDemoScript, opts);
}

/** The session ref the resolve-demo script's seed snapshot is keyed to. */
export const RESOLVE_DEMO_SESSION_REF: SessionRef = demoSessionRef(resolveDemoScript);

/** A ready-to-mount scripted driver replaying the resolve-focused demo. `speed` is a delay multiplier. */
export function createResolveDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(resolveDemoScript, opts);
}

export function createRewindDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(rewindDemoScript, opts);
}

export const REWIND_DEMO_SESSION_REF: SessionRef = demoSessionRef(rewindDemoScript);

export function createRecallDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(recallDemoScript, opts);
}

export const RECALL_DEMO_SESSION_REF: SessionRef = demoSessionRef(recallDemoScript);

export function createRetainDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(retainDemoScript, opts);
}

export const RETAIN_DEMO_SESSION_REF: SessionRef = demoSessionRef(retainDemoScript);

export function createReflectDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(reflectDemoScript, opts);
}

export const REFLECT_DEMO_SESSION_REF: SessionRef = demoSessionRef(reflectDemoScript);

export function createReportToolIssueDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(reportToolIssueDemoScript, opts);
}

export const REPORT_TOOL_ISSUE_DEMO_SESSION_REF: SessionRef = demoSessionRef(reportToolIssueDemoScript);

export function createRenderMermaidDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(renderMermaidDemoScript, opts);
}

export const RENDER_MERMAID_DEMO_SESSION_REF: SessionRef = demoSessionRef(renderMermaidDemoScript);

/** The session ref the goal-demo script's seed snapshot is keyed to. */
export const GOAL_DEMO_SESSION_REF: SessionRef = demoSessionRef(goalDemoScript);

/** A ready-to-mount scripted driver replaying the goal-focused demo. `speed` is a delay multiplier. */
export function createGoalDemoDriver(opts?: DemoDriverOptions): SessionDriver {
	return demoDriver(goalDemoScript, opts);
}
