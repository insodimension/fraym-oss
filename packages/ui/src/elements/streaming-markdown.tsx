"use client";

// StreamingMarkdown — the streaming-aware prose surface.
//
// Replaces the old raw `<p>{text}</p>` text renderer (which showed markdown
// source verbatim). Everything streaming-related is delegated to `streamdown`
// (Vercel's AI-streaming markdown renderer): incomplete-markdown tolerance (its
// `remend` pass virtually closes unterminated fences/emphasis so the stream
// never flashes broken markdown), Shiki highlighting via `@streamdown/code`, and
// the animated token reveal via streamdown's own `animated` / `isAnimating`
// (keyframes ship in `streamdown/styles.css`). We write no streaming logic of
// our own — only Fraym-token theming. This is the stack the design canon picked
// (docs/design/02-fraym-stack.md).

import { code } from "@streamdown/code";
import { memo, useMemo } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import "./streaming-markdown.css";
import { cn } from "../lib/cn";
import { MermaidDiagram } from "./mermaid-diagram";
import { StaticMarkdownLite } from "./static-markdown-lite";

/** Shiki highlighting plugin (github-light / github-dark), referenced once. */
const STREAMDOWN_PLUGINS = { code } as const;

/** Prose styling mapped onto Fraym tokens — covers the common markdown elements. */
const PROSE = cn(
	"break-words text-fr-base leading-[1.6] text-fr-text",
	"[&>:first-child]:mt-0 [&>:last-child]:mb-0",
	"[&_p]:mb-[14px] [&_p]:text-pretty [&_p:last-child]:mb-0",
	// Heading sizes/margins are pinned for EVERY level, not just h1/h2: Streamdown's
	// own components ship `text-3xl…text-sm` + `mt-6` utilities on h1–h6, and any of
	// those utilities existing in the app CSS (they do — Fraym sources use them) made
	// mid-stream headings render LARGER than the settled lite pass, which emits bare
	// h1–h3 sized only by this wrapper (mid-stream font-size inflation). The
	// `[&_hN]` wrapper rules out-specify Streamdown's element-level
	// utilities, so both render paths agree while streaming AND settled.
	"[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold",
	"[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-[15px] [&_h2]:font-semibold",
	"[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-fr-base [&_h3]:font-semibold",
	"[&_h4]:mt-3 [&_h4]:mb-1.5 [&_h4]:text-fr-base [&_h4]:font-semibold",
	"[&_h5]:mt-3 [&_h5]:mb-1.5 [&_h5]:text-fr-base [&_h5]:font-semibold",
	"[&_h6]:mt-3 [&_h6]:mb-1.5 [&_h6]:text-fr-base [&_h6]:font-semibold",
	// `list-outside` pins marker position: Streamdown puts `list-inside` on ol/ul,
	// the lite pass uses the browser default (outside) — without this the whole
	// list indentation jumped when a streaming turn settled.
	"[&_ol]:my-[6px] [&_ol]:mb-[14px] [&_ol]:list-outside [&_ol]:list-decimal [&_ol]:pl-5",
	"[&_ul]:my-[6px] [&_ul]:mb-[14px] [&_ul]:list-outside [&_ul]:list-disc [&_ul]:pl-5",
	"[&_li]:mb-[6px] [&_li]:pl-1 [&_li::marker]:text-fr-text-3",
	"[&_a]:text-fr-accent [&_a]:underline [&_a]:underline-offset-2",
	"[&_strong]:font-semibold [&_em]:italic",
	"[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-fr-border-soft [&_blockquote]:pl-3 [&_blockquote]:text-fr-text-2",
	"[&_hr]:my-3 [&_hr]:border-fr-border-soft",
	"[&_:not(pre)>code]:break-words [&_:not(pre)>code]:rounded-[5px] [&_:not(pre)>code]:bg-fr-surface-2 [&_:not(pre)>code]:px-[6px] [&_:not(pre)>code]:py-px [&_:not(pre)>code]:font-secondary [&_:not(pre)>code]:text-fr-sm [&_:not(pre)>code]:text-fr-text",
	"[&_pre]:my-2 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:text-fr-sm",
	"[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-fr-sm",
	"[&_th]:border-b [&_th]:border-fr-border [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium [&_th]:text-fr-text-2",
	"[&_td]:border-b [&_td]:border-fr-border-soft [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-top",
);

function shouldUseLiteRenderer(animate: boolean, lineNumbers: boolean): boolean {
	return !animate && !lineNumbers;
}

type MarkdownSegment =
	| { readonly kind: "md"; readonly text: string }
	| { readonly kind: "mermaid"; readonly code: string };

// Splits out COMPLETE ```mermaid fences so we can render them ourselves (borderless,
// full width). An unterminated fence (mid-stream) is left in the md segment, so
// streamdown shows it as code until the source completes — then it becomes a diagram.
const NO_SEGMENTS: readonly MarkdownSegment[] = [];

const MERMAID_FENCE = /```mermaid[ \t]*\r?\n([\s\S]*?)\r?\n```/g;

function splitMermaid(text: string): readonly MarkdownSegment[] {
	MERMAID_FENCE.lastIndex = 0;
	const segments: MarkdownSegment[] = [];
	let last = 0;
	let match: RegExpExecArray | null = MERMAID_FENCE.exec(text);
	while (match) {
		if (match.index > last) segments.push({ kind: "md", text: text.slice(last, match.index) });
		segments.push({ kind: "mermaid", code: match[1] ?? "" });
		last = match.index + match[0].length;
		match = MERMAID_FENCE.exec(text);
	}
	if (last < text.length) segments.push({ kind: "md", text: text.slice(last) });
	return segments;
}

export interface StreamingMarkdownProps {
	/** Raw markdown source (accumulated streamed text). */
	readonly text: string;
	/** Animate the token reveal. Pass `true` only for the live (streaming) message. */
	readonly animate?: boolean;
	/** This text is STILL STREAMING (or draining a paced reveal): force the
	 *  Streamdown path so its remend pass virtually closes unterminated
	 *  fences/emphasis/headings — the lite parser has no incomplete-markdown
	 *  tolerance and flashes raw `**`/`##`/fence source mid-stream. Settled
	 *  messages leave this false and keep the ~20x cheaper lite mount. */
	readonly streaming?: boolean;
	/** Show per-line numbers in fenced code blocks (Streamdown gutter). Default false. */
	readonly lineNumbers?: boolean;
	readonly className?: string;
}

function streamingMarkdownPropsEqual(prev: StreamingMarkdownProps, next: StreamingMarkdownProps): boolean {
	return (
		prev.text === next.text &&
		(prev.animate ?? false) === (next.animate ?? false) &&
		(prev.streaming ?? false) === (next.streaming ?? false) &&
		(prev.lineNumbers ?? false) === (next.lineNumbers ?? false) &&
		prev.className === next.className
	);
}

/**
 * Streaming-aware markdown surface. A thin Fraym-themed wrapper over
 * `streamdown`: incomplete-markdown tolerant, Shiki-highlighted, with
 * streamdown's native animated reveal driven by `animate`. Static content is
 * fine too — pass `animate={false}` and it renders verbatim.
 */
export const StreamingMarkdown = memo(function StreamingMarkdown({
	text,
	animate = false,
	streaming = false,
	lineNumbers = false,
	className,
}: StreamingMarkdownProps) {
	// Cheap substring gate keeps the common (no-diagram) streaming path off the regex
	// scan + segment allocation that splitMermaid does on every growing delta.
	const segments = useMemo(() => (text.includes("```mermaid") ? splitMermaid(text) : NO_SEGMENTS), [text]);

	if (!segments.some(seg => seg.kind === "mermaid")) {
		// Live text MUST go through Streamdown: its remend pass virtually closes
		// unterminated fences/emphasis so the stream never flashes raw markdown.
		// The lite parser is settled-content-only (no incomplete-markdown tolerance).
		if (!streaming && shouldUseLiteRenderer(animate, lineNumbers)) {
			return (
				<div data-slot="streaming-markdown" className={cn(PROSE, "fr-streaming-markdown", className)}>
					<StaticMarkdownLite text={text} />
				</div>
			);
		}
		// Streamdown 2.5.0 deferred its streaming block-list state through a React
		// transition that starves under rapid deltas — stale blocks (an incomplete
		// `### Ti` tail) kept rendering with heading styling while later source had
		// already turned them into paragraph/table siblings (the mid-stream font-size
		// inflation). Root-fixed in the dependency:
		// patches/streamdown@2.5.0.patch makes the display update synchronous (the
		// parse was already synchronous in a useMemo — only the RENDER lagged), so no
		// remount keys or CSS overrides are needed here.
		//
		// PROSE lives on OUR wrapper div, NEVER on Streamdown's className: Streamdown
		// runs the className through its own PLAIN tailwind-merge, which doesn't know
		// the Fraym token groups (lib/cn.ts) — it classified `text-fr-base` (font-size)
		// and `text-fr-text` (color) as the same conflict group and silently DROPPED
		// the size, so live prose inherited 14px while the settled lite pass rendered
		// 13px (mid-stream body font inflation; the same drop hit
		// `[&_:not(pre)>code]:text-fr-sm` and reasoning's `text-fr-sm`). Streamdown's
		// root carries its own first/last-child margin resets, so the wrapper-level
		// ones stay redundant-safe here.
		return (
			<div
				data-slot="streaming-markdown"
				className={cn(PROSE, "fr-streaming-markdown", lineNumbers && "fr-code-lines", className)}
			>
				<Streamdown
					plugins={STREAMDOWN_PLUGINS}
					controls={false}
					lineNumbers={lineNumbers}
					animated={animate}
					isAnimating={animate}
				>
					{text}
				</Streamdown>
			</div>
		);
	}

	// Mermaid present: render diagrams ourselves; the prose around them still flows
	// through a markdown renderer — Streamdown while streaming (incomplete-markdown
	// tolerant), the cheap lite parser once settled (diagrams land in completed turns).
	return (
		<div data-slot="streaming-markdown" className={cn(PROSE, "fr-streaming-markdown", className)}>
			{segments.map((seg, index) =>
				seg.kind === "mermaid" ? (
					<MermaidDiagram key={`mmd-${index}`} code={seg.code} />
				) : seg.text.trim() ? (
					streaming ? (
						<Streamdown key={`md-${index}`} plugins={STREAMDOWN_PLUGINS} controls={false}>
							{seg.text}
						</Streamdown>
					) : (
						<StaticMarkdownLite key={`md-${index}`} text={seg.text} />
					)
				) : null,
			)}
		</div>
	);
}, streamingMarkdownPropsEqual);
