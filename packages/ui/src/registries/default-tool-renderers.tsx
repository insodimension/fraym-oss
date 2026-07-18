// Default tool renderers shipped with fraym-ui.

import type { ReactNode } from "react";
import { DataInspectorBody } from "../features/tool-card/tools/data-inspector-body";
import { ToolBodyTerm } from "../features/tool-card/tool-card";
import { renderAsk } from "../features/tool-card/tools/ask-render";
import { renderAstEdit } from "../features/tool-card/tools/ast-edit-render";
import { renderAstGrep } from "../features/tool-card/tools/ast-grep-render";
import { renderBash } from "../features/tool-card/tools/bash-render";
import { renderBrowser } from "../features/tool-card/tools/browser-render";
import { renderCalc } from "../features/tool-card/tools/calc-render";
import { renderCheckpoint } from "../features/tool-card/tools/checkpoint-render";
import { renderDebug } from "../features/tool-card/tools/debug-render";
import { renderEval } from "../features/tool-card/tools/eval-render";
import { renderFind } from "../features/tool-card/tools/find-render";
import { renderGenerateImage } from "../features/tool-card/tools/generate-image-render";
import { renderGithub } from "../features/tool-card/tools/github-render";
import { renderGoal } from "../features/tool-card/tools/goal-render";
import { renderInspectImage } from "../features/tool-card/tools/inspect-image-render";
import { renderIrc } from "../features/tool-card/tools/irc-render";
import { renderJob } from "../features/tool-card/tools/job-render";
import { renderLsp } from "../features/tool-card/tools/lsp-render";
import { renderReflect } from "../features/tool-card/tools/reflect-render";
import { renderMermaid } from "../features/tool-card/tools/render-mermaid-render";
import { renderReportToolIssue } from "../features/tool-card/tools/report-tool-issue-render";
import { renderResolve } from "../features/tool-card/tools/resolve-render";
import { renderRetain } from "../features/tool-card/tools/retain-render";
import { renderRewind } from "../features/tool-card/tools/rewind-render";
import { renderSearch } from "../features/tool-card/tools/search-render";
import { renderSearchToolBm25 } from "../features/tool-card/tools/search-tool-bm25-render";
import { renderSsh } from "../features/tool-card/tools/ssh-render";
import { renderTodo } from "../features/tool-card/tools/todo-render";
import { renderWebSearch } from "../features/tool-card/tools/web-search-render";
import type { ActiveToolCall } from "../hooks/session-types";
import { renderTask } from "../tool-renderers/task-renderer";
import { asText, toTermLines } from "./default-renderer-utils";
import { renderEdit } from "./edit-renderer";
import { renderRead } from "./read-renderer";
import type { ToolRendererMap } from "./tool-renderer-registry";
import { renderWrite } from "./write-renderer";

// --- tool renderers ---------------------------------------------------------

const renderGeneric = (call: ActiveToolCall): ReactNode => {
	// Structured (non-string) output — INCLUDING the partial result while streaming, so a
	// long/streaming tool (any unmapped or MCP/custom tool) shows its live output rather than a
	// frozen "Running…" card until it finishes.
	if (call.output !== undefined && typeof call.output !== "string") {
		return <DataInspectorBody value={call.output} />;
	}
	const text = call.text ?? asText(call.output);
	if (text) return <ToolBodyTerm lines={toTermLines(text)} />;
	// Nothing has streamed yet: minimal pending indicator while the tool runs.
	if (call.status === "running") {
		return <div className="px-1 py-2 font-secondary text-fr-xs text-fr-text-3">Running…</div>;
	}
	if (call.input !== undefined) return <DataInspectorBody value={call.input} label="input" />;
	return null;
};

/** Built-in tool renderers, keyed by normalized tool name. `"*"` is the fallback. */
export const DEFAULT_TOOL_RENDERERS: ToolRendererMap = Object.freeze({
	bash: renderBash,
	shell: renderBash,
	command: renderBash,
	run: renderBash,
	exec: renderBash,
	eval: renderEval,
	terminal: renderBash,
	ssh: renderSsh,
	edit: renderEdit,
	edit_file: renderEdit,
	apply_patch: renderEdit,
	str_replace: renderEdit,
	ast_edit: renderAstEdit,
	write: renderWrite,
	search: renderSearch,
	grep: renderSearch,
	find: renderFind,
	glob: renderFind,
	ripgrep: renderSearch,
	rg: renderSearch,
	ast_grep: renderAstGrep,
	render_mermaid: renderMermaid,
	task: renderTask,
	agent: renderTask,
	read: renderRead,
	cat: renderRead,
	open: renderRead,
	view: renderRead,
	resolve: renderResolve,
	goal: renderGoal,
	todo: renderTodo,
	todo_write: renderTodo,
	job: renderJob,
	lsp: renderLsp,
	irc: renderIrc,
	debug: renderDebug,
	web_search: renderWebSearch,
	github: renderGithub,
	browser: renderBrowser,
	ask: renderAsk,
	calc: renderCalc,
	generate_image: renderGenerateImage,
	inspect_image: renderInspectImage,
	// "*" = TOOL_FALLBACK_KEY (literal to avoid an import cycle)
	checkpoint: renderCheckpoint,
	rewind: renderRewind,
	retain: renderRetain,
	reflect: renderReflect,
	report_tool_issue: renderReportToolIssue,
	search_tool_bm25: renderSearchToolBm25,
	"*": renderGeneric,
});
