import {
	BROWSER_DEMO_SESSION_REF,
	BROWSER_CAPTURE_CAPTION as CAPTURE_CAPTION,
	BROWSER_CLOSE_OUTPUT as CLOSE_OUTPUT,
	createBrowserDemoDriver,
	BROWSER_DETAILS as DETAILS,
	BROWSER_ERROR_OUTPUT as ERROR_OUTPUT,
	BROWSER_INPUT as INPUT,
	BROWSER_OPEN_OUTPUT as OPEN_OUTPUT,
	BROWSER_RUN_OUTPUT as RUN_OUTPUT,
	BROWSER_SCREENSHOT_B64 as SCREENSHOT_B64,
	BROWSER_TRUNCATED_OUTPUT as TRUNCATED_OUTPUT,
	toolResult,
} from "@fraym/fixtures";
import type { ActiveToolCall } from "@fraym/ui";
import type { ControlsSchema } from "../../showcase/controls";
import { Demo } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import { useToolConfig } from "../../showcase/tool-config";
import {
	selectControlValue,
	ToolMainPreview,
	type ToolPreviewView,
	ToolVariationGrid,
	toolPreviewView,
} from "../../showcase/tool-preview";
import type { ShowcaseEntry } from "../../showcase/types";

// ─────────────────────────────────────────────────────────────────────────────
// `browser` tool showcase.
//
// No bespoke sketch: the card is rendered by the PRODUCTION renderer
// (`renderBrowser`, registered in @fraym/ui's DEFAULT_TOOL_RENDERERS) fed a
// synthetic `ActiveToolCall`. Browser has TWO shapes by `action`: `run` → a JS code
// cell + text output + INLINE screenshots/figures (real <img> with a lightbox —
// parity+ over the TUI, which only fakes images via the terminal image protocol);
// `open`/`close` → a status line. Head = a `web`/globe kind + action + tab +
// browser-kind + url badges. NO result streaming (browser never calls onUpdate).
//
// All demo DATA lives in @fraym/fixtures (browser-outputs.ts / browser-demo.ts) per
// the house rule (SKILL G10) — this entry holds only call-assembly logic + controls.
//
// Axes (control knobs):
//   VARIATION  open · run · capture · close
//   STATE      success · error · pending · truncated
// ─────────────────────────────────────────────────────────────────────────────

type Variation = "open" | "run" | "capture" | "close";
type BrowserState = "success" | "error" | "pending" | "truncated";
type View = ToolPreviewView;

const VARIATIONS: Variation[] = ["open", "run", "capture", "close"];
const STATES: BrowserState[] = ["success", "error", "pending", "truncated"];
const VIEWS: View[] = ["collapsed", "comfortable", "compact", "spacious"];

function successCall(callId: string, variation: Variation, input: unknown): ActiveToolCall {
	if (variation === "open")
		return { callId, toolName: "browser", input, status: "success", output: toolResult(OPEN_OUTPUT, DETAILS.open) };
	if (variation === "close")
		return { callId, toolName: "browser", input, status: "success", output: toolResult(CLOSE_OUTPUT, DETAILS.close) };
	if (variation === "capture") {
		return {
			callId,
			toolName: "browser",
			input,
			status: "success",
			output: {
				content: [
					{ type: "text", text: CAPTURE_CAPTION },
					{ type: "image", data: SCREENSHOT_B64, mimeType: "image/svg+xml" },
				],
				details: DETAILS.capture,
				isError: false,
			},
		};
	}
	return { callId, toolName: "browser", input, status: "success", output: toolResult(RUN_OUTPUT, DETAILS.run) };
}

/** Build the exact `ActiveToolCall` a live browser run produces, from the config knobs. */
function buildBrowserCall(variation: Variation, state: BrowserState): ActiveToolCall {
	const input = INPUT[variation];
	const callId = `browser-preview-${variation}-${state}`;
	if (state === "pending") return { callId, toolName: "browser", input, status: "running" };
	if (state === "error") {
		return {
			callId,
			toolName: "browser",
			input,
			status: "error",
			output: toolResult(ERROR_OUTPUT, { action: input.action, name: "main" }, true),
		};
	}
	if (state === "truncated") {
		return {
			callId,
			toolName: "browser",
			input: INPUT.run,
			status: "success",
			output: toolResult(TRUNCATED_OUTPUT, DETAILS.truncated),
		};
	}
	return successCall(callId, variation, input);
}

const BROWSER_CONFIG: ControlsSchema = {
	variation: { kind: "select", label: "variation", options: VARIATIONS, default: "capture" },
	state: { kind: "select", label: "state", options: STATES, default: "success" },
	// `scope: "display"` → shared with the Demo Dock (collapse/density), not just the preview.
	view: { kind: "select", label: "view", options: VIEWS, default: "comfortable", scope: "display" },
};

function BrowserEntry() {
	const { values, panel } = useToolConfig();
	const variation = selectControlValue(values.variation, VARIATIONS, "capture");
	const state = selectControlValue(values.state, STATES, "success");
	const view: View = toolPreviewView(values.view);

	const mainCall = buildBrowserCall(variation, state);
	const gridState: BrowserState = state === "pending" ? "success" : state;

	return (
		<Demo
			summary="The `browser` tool card, rendered by the PRODUCTION renderer (renderBrowser) on a synthetic ActiveToolCall built from the knobs — identical to a live run. Browser has TWO shapes by action: `run` → a JS code cell + text output + INLINE screenshots/figures (real <img> with a lightbox — the TUI can only fake images via the terminal image protocol OUTSIDE its renderer); `open`/`close` → a status line. Head = a `web`/globe kind + action + tab + browser-kind + url badges. NO result streaming (browser never calls onUpdate). The Demo Dock replays the full open → run → capture → close conversation."
			importPath="entries/features/browser (live renderBrowser)"
			controls={panel}
			stage="stretch"
		>
			<ToolMainPreview keySeed={`${view}-${variation}-${state}`} call={mainCall} view={view} />
			<ToolVariationGrid
				label="all variations"
				view={view}
				items={VARIATIONS}
				active={variation}
				buildCall={v => buildBrowserCall(v, gridState)}
			/>
		</Demo>
	);
}

const browserDocs: EntryDocs = {
	import: 'import { Thread, DEFAULT_TOOL_RENDERERS } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Tool cards render automatically inside <Thread>: DEFAULT_TOOL_RENDERERS",
			"// maps browser -> renderBrowser. No manual wiring per tool.",
			"<Thread events={sessionEvents} renderers={DEFAULT_TOOL_RENDERERS} />",
			"",
			"// renderBrowser is handed a live ActiveToolCall and returns the card:",
			"// {",
			'//   toolName: "browser",',
			"//   input:  { action, name?, url?, code?, all? },",
			"//   output: { content, details: { action, name, browser, url, screenshots?, meta? } },",
			'//   status: "running" | "success" | "error",',
			"// }",
			"//",
			"// Two shapes by action:",
			"//   run        -> a JS code cell + text output + INLINE screenshot/figure",
			"//                 image blocks (real <img> with a lightbox).",
			"//   open/close  -> a single status line.",
			"// Head: a `web`/globe kind + action + tab name + browser-kind + url badges.",
			"// No result streaming (browser never calls onUpdate).",
		].join("\n"),
	),
	examples: [
		{
			label: "Open a tab",
			code: JSON.stringify('{ action: "open", name: "main", url: "https://example.com" }'),
		},
		{
			label: "Run JS in the page",
			code: JSON.stringify(
				'{ action: "run", name: "main", code: "const obs = await tab.observe();\nreturn obs.title;" }',
			),
		},
		{
			label: "Screenshot (inline image)",
			code: JSON.stringify(
				'{ action: "run", name: "main", code: "await tab.screenshot();" }\n// output.details.screenshots -> inline <img> blocks in the body',
			),
		},
		{
			label: "Close all tabs",
			code: JSON.stringify('{ action: "close", all: true }'),
		},
	],
	api: [
		{
			name: "action",
			type: '"open" | "run" | "close"',
			required: true,
			description:
				"Chooses the card shape: run -> code cell + output + images; open/close -> status line. Shown as a head badge.",
		},
		{
			name: "name",
			type: "string",
			description: "Tab name to target; rendered as the head tab badge.",
		},
		{
			name: "url",
			type: "string",
			description: "Page to open (open action); surfaced as the head url badge.",
		},
		{
			name: "code",
			type: "string",
			description: "JavaScript to evaluate in the tab (run action); rendered as a JS code cell.",
		},
		{
			name: "all",
			type: "boolean",
			description: "Close every open tab (close action).",
		},
		{
			name: "output.details.browser",
			type: "string",
			description: "Browser kind (e.g. `headless`); rendered as a head badge.",
		},
		{
			name: "output.details.url",
			type: "string",
			description: "Resolved page URL; rendered as the head url badge.",
		},
		{
			name: "output.details.screenshots",
			type: "{ dest; mimeType; bytes; width; height }[]",
			description: "Captured figures; each adds an inline <img> block (with a lightbox) to the body.",
		},
		{
			name: "output.details.meta.truncation",
			type: "{ artifactId: string }",
			description: "Present when output was capped; carries the artifact id holding the full DOM/output.",
		},
	],
};

export const browserEntries: readonly ShowcaseEntry[] = [
	{
		id: "browser-tool",
		name: "Browser",
		Component: BrowserEntry,
		config: BROWSER_CONFIG,
		docs: browserDocs,
		demo: {
			createDriver: createBrowserDemoDriver,
			sessionRef: BROWSER_DEMO_SESSION_REF,
			title: "browser · live conversation",
		},
	},
];
