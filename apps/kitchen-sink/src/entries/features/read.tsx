import { createReadDemoDriver, READ_DEMO_SESSION_REF } from "@fraym/fixtures";
import { type ActiveToolCall, ToolRender } from "@fraym/ui";
import {
	BASE_PATH,
	CODE_FULL,
	CODE_RANGE,
	CODE_SUMMARY,
	DB_LISTING,
	DIR_LISTING,
	IMG_META,
	MD_TEXT,
	SEL_SUFFIX,
	URL_PREVIEW,
} from "../../fixtures";
import type { ControlsSchema } from "../../showcase/controls";
import { Demo, Note } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import { useToolConfig } from "../../showcase/tool-config";
import { toolPreviewControl } from "../../showcase/tool-preview";
import type { ShowcaseEntry } from "../../showcase/types";

// ─────────────────────────────────────────────────────────────────────────────
// `read` tool showcase.
//
// There is no bespoke sketch here: the card is rendered by the PRODUCTION renderer
// (`renderRead`, registered in @fraym/ui's DEFAULT_TOOL_RENDERERS) fed a synthetic
// `ActiveToolCall` built from the config knobs — the exact `{ input, output }` shape
// a live `read` call carries. What you preview IS what ships. The Demo Dock drives
// the full streamed conversation through the same renderer (createReadDemoDriver).
//
// Axes (control knobs):
//   TARGET    file-code · markdown · directory · sqlite · image · url
//   SELECTOR  whole · range · multi-range · raw · summary · conflicts
//   STATE     success · truncated · error · pending
// ─────────────────────────────────────────────────────────────────────────────

type Target = "file-code" | "markdown" | "directory" | "sqlite" | "image" | "url";
type Selector = "whole" | "range" | "multi-range" | "raw" | "summary" | "conflicts";
type ReadState = "success" | "truncated" | "error" | "pending";
// VIEW = the card's real disclosure axes on the production `ToolCard`: `collapsed`
// (head only) vs the three open densities (comfortable · compact · spacious).
type View = "collapsed" | "comfortable" | "compact" | "spacious";

const TARGETS: Target[] = ["file-code", "markdown", "directory", "sqlite", "image", "url"];
const SELECTORS: Selector[] = ["whole", "range", "multi-range", "raw", "summary", "conflicts"];
const STATES: ReadState[] = ["success", "truncated", "error", "pending"];

// ── synthetic call builder ────────────────────────────────────────────────────

/** An `AgentToolResult`-shaped output: `content` + the `details.displayContent` Fraym reads. */
function readResult(text: string, details: Record<string, unknown> = {}) {
	return {
		content: [{ type: "text", text }],
		details: { displayContent: { text, startLine: 1 }, ...details },
		isError: false,
	};
}

type ReadDecorations = Record<string, unknown>;
type ReadOutputBuilder = (args: {
	readonly selector: Selector;
	readonly base: string;
	readonly decorations: ReadDecorations;
}) => unknown;

function codeOutput(selector: Selector, decorations: ReadDecorations): unknown {
	if (selector === "summary") return readResult(CODE_SUMMARY, decorations);
	if (selector === "range" || selector === "multi-range") return readResult(CODE_RANGE, decorations);
	return readResult(CODE_FULL, decorations);
}

const READ_OUTPUT: Record<Target, ReadOutputBuilder> = {
	"file-code": ({ selector, decorations }) => codeOutput(selector, decorations),
	markdown: ({ decorations }) => readResult(MD_TEXT, { contentType: "text/markdown", ...decorations }),
	directory: ({ decorations }) => readResult(DIR_LISTING, { isDirectory: true, ...decorations }),
	sqlite: ({ decorations }) => readResult(DB_LISTING, decorations),
	image: () => readResult(IMG_META),
	url: ({ base, decorations }) =>
		readResult(URL_PREVIEW, {
			kind: "url",
			contentType: "text/html; charset=utf-8",
			method: "GET",
			finalUrl: base,
			...decorations,
		}),
};

function readDecorations(selector: Selector, state: ReadState): ReadDecorations {
	return {
		...(state === "truncated" ? { truncation: { artifactId: "a1b2c3" } } : {}),
		...(selector === "summary" ? { summary: { elidedSpans: 3, elidedLines: 24 } } : {}),
		...(selector === "conflicts" ? { conflictCount: 2 } : {}),
	};
}

/** Build the exact `ActiveToolCall` a live `read` produces, from the config knobs. */
function buildReadCall(target: Target, selector: Selector, state: ReadState): ActiveToolCall {
	const base = BASE_PATH[target];
	const path = base + SEL_SUFFIX[selector];
	const call = { callId: `read-preview-${target}-${selector}-${state}`, toolName: "read", input: { path } };

	if (state === "pending") return { ...call, status: "running" };
	if (state === "error") {
		return { ...call, status: "error", output: readResult(`ENOENT: no such file or directory, open '${base}'`) };
	}

	// Selector/state decorations layered onto the result details (status warn comes
	// from `truncation`; pills come from `summary` / `conflictCount`).
	const output = READ_OUTPUT[target]({ selector, base, decorations: readDecorations(selector, state) });
	return { ...call, status: "success", output };
}

// ── showcase entry ─────────────────────────────────────────────────────────────

// Config is declared by the tool; the shell renders it generically and shares the
// values with the preview below AND the Demo Dock.
const READ_CONFIG: ControlsSchema = {
	target: { kind: "select", label: "target", options: TARGETS, default: "file-code" },
	selector: { kind: "select", label: "selector", options: SELECTORS, default: "whole" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	// `scope: "display"` → shared with the Demo Dock (collapse/density), not just the preview.
	view: toolPreviewControl(),
};

interface ReadPreviewState {
	readonly target: Target;
	readonly selector: Selector;
	readonly state: ReadState;
	readonly view: View;
	readonly open: boolean;
	readonly density: Exclude<View, "collapsed">;
}

function configValue<T extends string>(values: Record<string, unknown>, key: string, fallback: T): T {
	const value = values[key];
	return typeof value === "string" ? (value as T) : fallback;
}

function readPreviewState(values: Record<string, unknown>): ReadPreviewState {
	const view = configValue<View>(values, "view", "comfortable");
	return {
		target: configValue<Target>(values, "target", "file-code"),
		selector: configValue<Selector>(values, "selector", "whole"),
		state: configValue<ReadState>(values, "state", "success"),
		view,
		open: view !== "collapsed",
		density: view === "collapsed" ? "comfortable" : view,
	};
}

function otherTargets(target: Target): readonly Target[] {
	return TARGETS.filter(t => t !== target);
}

function ReadEntry() {
	const { values, panel } = useToolConfig();
	const preview = readPreviewState(values);
	const { target, selector, state, view, open, density } = preview;
	const targets = otherTargets(target);

	return (
		<Demo
			summary="The `read` tool card, rendered by the PRODUCTION renderer (renderRead) on a synthetic ActiveToolCall built from the knobs — identical to a live read. Switches shape by target (code / markdown / dir / sqlite / image / url), carries selector + decoration pills, reacts to state, and previews the real ToolCard disclosure/density (view). Lifecycle replay lives in the Demo Dock."
			importPath="entries/features/read (live renderRead)"
			controls={panel}
			stage="stretch"
		>
			{/* key includes `view` so toggling collapsed/open remounts the card — ToolCard's
			    `defaultOpen` is initial-state-only (it never auto-closes in production). */}
			<div className="w-full max-w-2xl">
				<ToolRender key={view} call={buildReadCall(target, selector, state)} defaultOpen={open} density={density} />
			</div>

			<Note>all targets · {view}</Note>
			<div className="grid w-full max-w-2xl gap-2">
				{targets.map(t => (
					<ToolRender
						key={`${t}-${view}`}
						call={buildReadCall(t, "whole", state)}
						defaultOpen={open}
						density={density}
					/>
				))}
			</div>
		</Demo>
	);
}

const readDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps read -> renderRead. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderRead is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "read",',
			'//   input:  { path },  // path carries the :selector suffix (":50-100", ":raw", ":conflicts")',
			"//   output: { content, details: { displayContent: { text, startLine }, ... } },",
			'//   status: "running" | "success" | "error",',
			"// }",
			"//",
			"// Head: the path (+ selector suffix) + target/selector pills + truncation.",
			"// Body: details.displayContent rendered by TARGET — highlighted code or markdown,",
			"// a parsed directory listing, sqlite tables, image meta, or a reader-mode url preview.",
			"// Selector decorations ride details: summary { elidedSpans, elidedLines },",
			"// conflictCount, and truncation { artifactId }.",
		].join("\n"),
	),
	examples: [
		{
			label: "Whole file (code)",
			code: JSON.stringify('{ path: "src/auth/login.ts" }'),
		},
		{
			label: "Multi-range slice",
			code: JSON.stringify('{ path: "src/auth/login.ts:5-16,40-80" }  // range / multi-range read'),
		},
		{
			label: "Directory listing",
			code: JSON.stringify('{ path: "src/" }  // output.details.isDirectory -> parsed dir rows'),
		},
		{
			label: "URL (reader mode)",
			code: JSON.stringify('{ path: "https://example.com/docs/intro" }  // kind: "url" -> reader-mode preview'),
		},
	],
	api: [
		{
			name: "path",
			type: "string",
			required: true,
			description:
				"File, directory, url, sqlite db, or image to read. A trailing :selector scopes the read — ':50-100' (range), ':5-16,40-80' (multi-range), ':raw' (verbatim bytes), ':conflicts' (merge-conflict blocks); whole-file when omitted.",
		},
		{
			name: "output.details.displayContent",
			type: "{ text: string; startLine: number }",
			description:
				"The rendered body. Syntax-highlighted by target for code/markdown, or parsed into directory rows / sqlite tables / image meta / reader-mode url preview.",
		},
		{
			name: "output.details.contentType",
			type: "string",
			description:
				"MIME of the content (e.g. 'text/markdown', 'text/html…'); selects markdown vs reader-mode rendering.",
		},
		{
			name: "output.details.isDirectory",
			type: "boolean",
			description: "Directory target; the listing text is parsed into directory rows.",
		},
		{
			name: "output.details.finalUrl",
			type: "string",
			description: "Resolved url for a url target; shown alongside the reader-mode fetch metadata (kind/method).",
		},
		{
			name: "output.details.summary",
			type: "{ elidedSpans: number; elidedLines: number }",
			description: "Structural-summary read; drives the 'summary' pill counting elided spans/lines.",
		},
		{
			name: "output.details.conflictCount",
			type: "number",
			description: "Unresolved merge-conflict blocks (':conflicts'); renders the conflict pill.",
		},
		{
			name: "output.details.truncation",
			type: "{ artifactId: string }",
			description: "Output was capped; full content recoverable via the artifact, surfaced as a truncated badge.",
		},
	],
};

export const readEntries: readonly ShowcaseEntry[] = [
	{
		id: "read-tool",
		name: "Read",
		Component: ReadEntry,
		config: READ_CONFIG,
		docs: readDocs,
		demo: {
			createDriver: createReadDemoDriver,
			sessionRef: READ_DEMO_SESSION_REF,
			title: "read · live conversation",
		},
	},
];
