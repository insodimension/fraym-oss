import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import { CodeBlock } from "../../../elements/code-block";
import { MermaidDiagram } from "../../../elements/mermaid-diagram";
import { StaticMarkdownLite } from "../../../elements/static-markdown-lite";
import { arrayField, isRecord, prettyValue, stringField } from "../../../tool-renderers/data";
import type { ToolKind, ToolRenderer, ToolView } from "../../../registries/tool-renderer-types";
import { ToolArgsPreview } from "./bodies/tool-args-preview";

interface RendererSpec { readonly label: string; readonly kind?: ToolKind; readonly variant?: ToolView["bodyVariant"]; readonly render?: (call: Parameters<ToolRenderer>[0]) => ReactNode }
function outputText(output: unknown): string { return typeof output === "string" ? output : stringField(output, "content", "text", "output", "message", "result") ?? prettyValue(output); }
function stat(output: unknown): string | undefined { if (Array.isArray(output)) return `${output.length} items`; if (isRecord(output)) { const list = Object.values(output).find(Array.isArray); if (Array.isArray(list)) return `${list.length} items`; } return undefined; }
function makeRenderer(spec: RendererSpec): ToolRenderer { return (call) => { const outputStat = stat(call.output); return { label: spec.label, kind: spec.kind ?? "tool", status: call.status, bodyVariant: spec.variant ?? "default", ...(outputStat ? { stat: outputStat } : {}), body: spec.render?.(call) ?? (call.output === undefined ? <ToolArgsPreview args={call.input} /> : <pre className="fraym-tool-terminal">{outputText(call.output)}</pre>) }; }; }
const terminal = (label: string) => makeRenderer({ label, kind: "run", variant: "terminal" });
const summary = (label: string, kind: ToolKind = "tool") => makeRenderer({ label, kind, render: (call) => <div className="fraym-tool-result">{outputText(call.output)}</div> });
const structured = (label: string, kind: ToolKind = "tool") => makeRenderer({ label, kind, render: (call) => <CodeBlock code={prettyValue(call.output ?? call.input)} language="json" /> });

export const renderAsk = makeRenderer({ label: "Ask", kind: "tool", render: (call) => <div className="fraym-tool-result"><strong>{stringField(call.input, "question", "prompt", "title") ?? "Question"}</strong>{arrayField(call.input, "options").map((option, index) => <Badge key={index}>{typeof option === "string" ? option : prettyValue(option)}</Badge>)}</div> });
export const renderAstEdit = structured("Structural edit", "edit");
export const renderAstGrep = structured("Structural search", "search");
export const renderBrowser = summary("Browser", "web");
export const renderCalc = summary("Calculate");
export const renderCheckpoint = summary("Checkpoint", "todo");
export const renderDebug = terminal("Debug");
export const renderEval = terminal("Evaluate");
export const renderFind = summary("Find", "search");
export const renderGenerateImage = makeRenderer({ label: "Generate image", render: (call) => { const src = stringField(call.output, "url", "src", "image"); return src ? <img alt="Generated result" className="fraym-tool-generated-image" src={src} /> : <div className="fraym-tool-result">{outputText(call.output)}</div>; } });
export const renderGoal = structured("Goal", "todo");
export const renderInspectImage = makeRenderer({ label: "Inspect image", kind: "read", render: (call) => { const src = stringField(call.input, "url", "src", "path"); return src ? <img alt="Inspected input" className="fraym-tool-generated-image" src={src} /> : <ToolArgsPreview args={call.input} />; } });
export const renderJob = structured("Background job", "todo");
export const renderRecall = summary("Recall", "search");
export const renderReflect = summary("Reflect");
export const renderMermaid = makeRenderer({ label: "Diagram", render: (call) => { const source = stringField(call.input, "source", "diagram", "text") ?? stringField(call.output, "source", "diagram", "text"); return source ? <MermaidDiagram code={source} /> : <div className="fraym-tool-result">{outputText(call.output)}</div>; } });
export const renderReportToolIssue = summary("Report tool issue");
export const renderResolve = structured("Resolve", "edit");
export const renderRetain = summary("Retain context");
export const renderRewind = summary("Rewind", "todo");
export const renderSearchToolBm25 = structured("Search tools", "search");
export const renderSsh = terminal("Secure shell");
export const renderWebSearch = makeRenderer({ label: "Web search", kind: "web", render: (call) => <StaticMarkdownLite text={outputText(call.output)} /> });

export const FEATURE_TOOL_RENDERERS = Object.freeze({
  ask: renderAsk,
  ast_edit: renderAstEdit,
  ast_grep: renderAstGrep,
  browser: renderBrowser,
  calc: renderCalc,
  calculate: renderCalc,
  checkpoint: renderCheckpoint,
  debug: renderDebug,
  eval: renderEval,
  evaluate: renderEval,
  find: renderFind,
  generate_image: renderGenerateImage,
  image_generate: renderGenerateImage,
  goal: renderGoal,
  inspect_image: renderInspectImage,
  job: renderJob,
  recall: renderRecall,
  reflect: renderReflect,
  render_mermaid: renderMermaid,
  mermaid: renderMermaid,
  report_tool_issue: renderReportToolIssue,
  resolve: renderResolve,
  retain: renderRetain,
  rewind: renderRewind,
  search_tool_bm25: renderSearchToolBm25,
  ssh: renderSsh,
  web_search: renderWebSearch,
});
