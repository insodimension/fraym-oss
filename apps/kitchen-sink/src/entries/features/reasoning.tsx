import { createReasoningDemoDriver, REASONING_DEMO_SESSION_REF } from "@fraym/fixtures";
import { ReasoningBlock, useLineStream } from "@fraym/ui";
import { useState } from "react";
import { CONTENT_TEXT, CUSTOM_SUMMARY } from "../../fixtures";
import type { ControlsSchema } from "../../showcase/controls";
import { Demo, Note } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import { useToolConfig } from "../../showcase/tool-config";
import type { ShowcaseEntry } from "../../showcase/types";

// ─────────────────────────────────────────────────────────────────────────────
// `reasoning` (thinking) showcase.
//
// Reasoning is a MESSAGE BLOCK, not a tool — so there is no `ActiveToolCall` and no
// `ToolRender`. This renders the PRODUCTION component directly (`ReasoningBlock`,
// the same one `renderReasoningBlock` mounts in @fraym/ui's message-block registry).
// What you preview IS what ships. The Demo Dock drives the full streamed
// conversation through the same component (createReasoningDemoDriver).
//
// Terminal-chat parity (reference behavior):
//   • Thinking renders INLINE, in message order, interleaved with text + tools.
//   • Style: markdown in the muted `thinkingText` color, italic.
//   • Disclosure is a GLOBAL toggle (`hideThinkingBlock`): visible = full trace;
//     hidden = a static "Thinking..." label. There is no per-block caret in the TUI.
//   • Streaming: thinking deltas accumulate and the trace re-renders live.
//   • Empty/whitespace-only thinking is not rendered.
//   • A second surface (observer overlay) shows a truncated preview + "… N more lines".
//
// Fraym DIVERGENCE (prototype = visual ground truth): the global show/hide becomes a
// PER-BLOCK disclosure — a spark icon + summary header with a caret, opening a
// muted markdown body on a thread-gutter guide. Same intent (peek vs read the
// trace), aligned to the tool/text gutter. It stays a message block, never a ToolCard.
//
// Axes (control knobs):
//   CONTENT  short � long � markdown
//   SUMMARY  default ("Reasoning") � custom (a one-line headline)
//   VIEW     collapsed (header only) � comfortable � spacious (disclosure card) �
//            compact (bare inline trace, no card — the TUI thinking treatment)
//   STATE    static (settled) � streaming (animated, grows line-by-line; Replay)
// ─────────────────────────────────────────────────────────────────────────────

type Content = "short" | "long" | "markdown";
type SummaryMode = "default" | "custom";
type View = "collapsed" | "comfortable" | "compact" | "spacious";
type ReasoningDensity = Exclude<View, "collapsed">;
type ReasoningState = "static" | "streaming";

const CONTENTS: Content[] = ["short", "long", "markdown"];
const SUMMARIES: SummaryMode[] = ["default", "custom"];
const VIEWS: View[] = ["collapsed", "comfortable", "compact", "spacious"];
const STATES: ReasoningState[] = ["static", "streaming"];

function summaryFor(content: Content, mode: SummaryMode): string | undefined {
	return mode === "custom" ? CUSTOM_SUMMARY[content] : undefined;
}

const STREAM_INTERVAL_MS = 90;

// ── showcase entry ─────────────────────────────────────────────────────────────

const REASONING_CONFIG: ControlsSchema = {
	content: { kind: "select", label: "content", options: CONTENTS, default: "long" },
	summary: { kind: "select", label: "summary", options: SUMMARIES, default: "default" },
	// `scope: "display"` → shared with the Demo Dock so it collapses/sets reasoning density too.
	view: { kind: "select", label: "view", options: VIEWS, default: "comfortable", scope: "display" },
	state: { kind: "select", label: "state", options: STATES, default: "static" },
};

function ReasoningReplayButton({
	streaming,
	onReplay,
}: {
	readonly streaming: boolean;
	readonly onReplay: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onReplay}
			className="inline-flex items-center gap-2 self-start rounded-lg border border-fr-border bg-fr-surface px-3 py-1.5 text-fr-sm font-medium text-fr-text transition-colors hover:bg-fr-surface-2"
		>
			{streaming ? "Thinking…" : "Replay"}
		</button>
	);
}

function ReasoningPreview({
	content,
	text,
	summary,
	view,
	state,
	open,
	density,
	isStreaming,
}: {
	readonly content: Content;
	readonly text: string;
	readonly summary: string | undefined;
	readonly view: View;
	readonly state: ReasoningState;
	readonly open: boolean;
	readonly density: ReasoningDensity;
	readonly isStreaming: boolean;
}) {
	return (
		<div className="w-full max-w-2xl">
			<ReasoningBlock
				key={`${view}-${state}-${content}`}
				text={text}
				summary={summary}
				defaultOpen={open}
				density={density}
				live={isStreaming}
			/>
		</div>
	);
}

function ReasoningVariants({
	content,
	summaryMode,
	view,
	isCollapsed,
	density,
}: {
	readonly content: Content;
	readonly summaryMode: SummaryMode;
	readonly view: View;
	readonly isCollapsed: boolean;
	readonly density: ReasoningDensity;
}) {
	return (
		<div className="grid w-full max-w-2xl gap-1">
			{CONTENTS.filter(candidate => candidate !== content).map(candidate => (
				<ReasoningBlock
					key={`${candidate}-${view}`}
					text={CONTENT_TEXT[candidate]}
					summary={summaryFor(candidate, summaryMode)}
					defaultOpen={!isCollapsed}
					density={density}
				/>
			))}
		</div>
	);
}

function controlValue<T>(value: unknown, fallback: T): T {
	return (value as T | undefined) ?? fallback;
}

function reasoningSelection(values: Record<string, unknown>) {
	return {
		content: controlValue<Content>(values.content, "long"),
		summaryMode: controlValue<SummaryMode>(values.summary, "default"),
		view: controlValue<View>(values.view, "comfortable"),
		state: controlValue<ReasoningState>(values.state, "static"),
	};
}

function textForState(content: Content, isStreaming: boolean, streamedText: string): string {
	return isStreaming ? streamedText : CONTENT_TEXT[content];
}

function densityFor(view: View): ReasoningDensity {
	return view === "collapsed" ? "comfortable" : view;
}

function useReasoningPreviewState(values: Record<string, unknown>) {
	const { content, summaryMode, view, state } = reasoningSelection(values);
	const [nonce, setNonce] = useState(0);
	const { text: streamedText, streaming } = useLineStream(CONTENT_TEXT[content], nonce, STREAM_INTERVAL_MS);
	const isStreaming = state === "streaming";
	const isCollapsed = view === "collapsed";
	const density = densityFor(view);
	return {
		content,
		density,
		isCollapsed,
		isStreaming,
		open: !isCollapsed,
		replay: () => setNonce(n => n + 1),
		state,
		streaming,
		summary: summaryFor(content, summaryMode),
		summaryMode,
		text: textForState(content, isStreaming, streamedText),
		view,
	};
}

function ReasoningEntry() {
	const { values, panel } = useToolConfig();
	const preview = useReasoningPreviewState(values);

	return (
		<Demo
			summary="The `reasoning` (thinking) block, rendered by the PRODUCTION component (ReasoningBlock) — the same one renderReasoningBlock mounts in @fraym/ui's message-block registry. Reasoning is a message block, NOT a tool. The view axis matches the tools (collapsed � comfortable � compact � spacious) AND follows surface-kit's density philosophy: comfortable/spacious are a spark + summary disclosure card on the thread gutter, while `compact` drops all chrome and shows the raw trace inline (italic, muted) — the TUI thinking treatment. Handles short / long / markdown content, default vs custom summary, and STREAMS the trace in line-by-line (state=streaming). The Demo Dock replays the full conversation and honors the view."
			importPath="@fraym/ui (ReasoningBlock)"
			controls={panel}
			stage="stretch"
		>
			{preview.isStreaming ? (
				<ReasoningReplayButton streaming={preview.streaming} onReplay={preview.replay} />
			) : null}
			{/* key includes view+state so toggling the knob remounts — `defaultOpen` is
			    initial-state-only (the block never auto-toggles in production). */}
			<ReasoningPreview
				content={preview.content}
				text={preview.text}
				summary={preview.summary}
				view={preview.view}
				state={preview.state}
				open={preview.open}
				density={preview.density}
				isStreaming={preview.isStreaming}
			/>

			<Note>all content shapes � {preview.view}</Note>
			<ReasoningVariants
				content={preview.content}
				summaryMode={preview.summaryMode}
				view={preview.view}
				isCollapsed={preview.isCollapsed}
				density={preview.density}
			/>
		</Demo>
	);
}

const reasoningDocs: EntryDocs = {
	import: 'import { ReasoningBlock } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// Reasoning is a MESSAGE BLOCK, not a tool — the same component the message-block",
			"// registry mounts (renderReasoningBlock). It shares the tool gutter + display channel,",
			"// so a <Thread> / demo dock collapses it and sets its density exactly like a tool card.",
			'<ReasoningBlock text={thinkingTrace} summary="Planning the refactor" live />',
			"",
			"// Disclosure densities (comfortable · spacious) — spark + summary header on the gutter:",
			'// <div data-slot="reasoning-block" data-density={density}>',
			"//   <ReasoningDisclosureButton/>  ← spark icon + summary label + caret (shimmers when live)",
			"//   <ReasoningDisclosureBody/>    ← muted italic markdown on the thread-gutter guide",
			"// </div>",
			"//",
			"// compact density — the TUI thinking treatment: bare inline markdown, NO card / caret / gutter.",
			"// Density + open state fall back to the ambient ToolDisplaySettings when omitted.",
		].join("\n"),
	),
	examples: [
		{
			label: "Settled trace (default summary)",
			code: JSON.stringify('<ReasoningBlock text={trace} />  // summary defaults to "Thinking"'),
		},
		{
			label: "Custom summary headline",
			code: JSON.stringify('<ReasoningBlock text={trace} summary="Weighing two cache strategies" />'),
		},
		{
			label: "Live (streaming) edge",
			code: JSON.stringify("<ReasoningBlock text={partialTrace} live />  // shimmers the summary as it grows"),
		},
		{
			label: "Compact (TUI) density",
			code: JSON.stringify('<ReasoningBlock text={trace} density="compact" />  // bare inline, no card'),
		},
		{
			label: "Open by default",
			code: JSON.stringify("<ReasoningBlock text={trace} defaultOpen />"),
		},
	],
	api: [
		{
			name: "text",
			type: "string",
			required: true,
			description:
				"The reasoning trace; rendered as muted italic markdown (StreamingMarkdown tolerates a partial trace while streaming).",
		},
		{
			name: "summary",
			type: "string",
			default: '"Thinking"',
			description: "One-line headline on the disclosure button; matches the presence tail's working verb.",
		},
		{
			name: "defaultOpen",
			type: "boolean",
			description:
				"Initial open state of the disclosure. Falls back to the ambient ToolDisplaySettings (collapsed → closed) when omitted.",
		},
		{
			name: "density",
			type: "FraymDensity",
			description:
				"Open-body density: comfortable · spacious (disclosure card) or compact (bare inline TUI trace). Falls back to the ambient tool-display density.",
		},
		{
			name: "live",
			type: "boolean",
			description:
				"True while this block is the live streaming edge; shimmers the summary as the inline 'thinking now' cue.",
		},
		{
			name: "className",
			type: "string",
			description: 'Extra classes merged onto the block root (data-slot="reasoning-block").',
		},
	],
};

export const reasoningEntries: readonly ShowcaseEntry[] = [
	{
		id: "reasoning-block",
		name: "Reasoning",
		Component: ReasoningEntry,
		config: REASONING_CONFIG,
		docs: reasoningDocs,
		demo: {
			createDriver: createReasoningDemoDriver,
			sessionRef: REASONING_DEMO_SESSION_REF,
			title: "reasoning � live conversation",
		},
	},
];
