// Read tool body surfaces — presentational pieces for the `read` renderer.
// The adapter that maps an ActiveToolCall → these props lives in the renderer
// registry (`renderRead` in default-renderers). Mirrors the EditDiffBody pattern:
// dumb, prop-driven components; all `call.output.details` derivation is in the adapter.
//
// Targets covered here (fork-independent): file-code (Shiki), markdown, url, image.
// directory / sqlite (structured rows) are pending the parse-vs-structured-details
// decision and currently fall back to the generic body in the adapter.

import { canSyntaxHighlight, HighlightedCode } from "../../../../elements/code-block";
import { PlainCodeBlock } from "../../../../elements/plain-code-block";
import { StreamingMarkdown } from "../../../../elements/streaming-markdown";

// --- file-code -------------------------------------------------------------

export interface ReadCodeBodyProps {
	readonly text: string;
	/** Shiki language id (from the path extension). */
	readonly language: string;
	/** Show the line-number gutter. */
	readonly lineNumbers?: boolean | undefined;
	/** First gutter line number (for `:range` reads). Default 1. */
	readonly startLine?: number | undefined;
}

/**
 * Code rendering for read / write tool bodies. Known-language content under the size cap
 * highlights via Shiki (`HighlightedCode`): it paints plain first and swaps in highlighting
 * off an idle callback backed by a cached (lang, text) result — so the first paint never
 * blocks and history remounts / scrollback never re-tokenize. The idle tokenize is
 * cancel-on-change, so STREAMING content (a `write` whose args are still arriving) highlights
 * during idle gaps too — matching the edit/diff card — instead of staying flat grey. Oversized
 * or unknown-language content stays plain.
 */
export function ReadCodeBody({ text, language, lineNumbers = true, startLine = 1 }: ReadCodeBodyProps) {
	if (!canSyntaxHighlight(text, language)) {
		return (
			<PlainCodeBlock
				code={text}
				lineNumbers={lineNumbers}
				startLine={startLine}
				className="text-fr-xs"
					{...(language ? { codeClassName: `language-${language}` } : {})}
			/>
		);
	}
	return (
		<HighlightedCode
			code={text}
			language={language}
			lineNumbers={lineNumbers}
			startLine={startLine}
			className="text-fr-xs"
		/>
	);
}

// --- markdown --------------------------------------------------------------

export interface ReadMarkdownBodyProps {
	readonly text: string;
}

/** Rendered markdown prose in the sans/primary font (host card supplies the surface). */
export function ReadMarkdownBody({ text }: ReadMarkdownBodyProps) {
	return (
		<div className="font-primary">
			<StreamingMarkdown text={text} />
		</div>
	);
}

// --- image -----------------------------------------------------------------

export interface ReadImageBodyProps {
	/** `data:` URL or http(s) src for the actual image; omit to show the placeholder. */
	readonly src?: string | undefined;
	/** Metadata line, e.g. `512 × 512 · 84 KB · RGBA`. */
	readonly meta?: string | undefined;
	readonly mime?: string | undefined;
}

/** Image preview + metadata (a GUI win over the TUI, which prints text only). */
export function ReadImageBody({ src, meta, mime }: ReadImageBodyProps) {
	return (
		<div className="grid gap-2">
			{src ? (
				<img
					src={src}
					alt={mime ?? "image"}
					className="max-w-[240px] rounded-[10px] border border-fr-border-soft"
				/>
			) : (
				<div className="aspect-square w-full max-w-[240px] rounded-[10px] bg-gradient-to-br from-fr-accent via-fr-iris to-fr-blue" />
			)}
			<div className="flex flex-wrap items-baseline gap-x-2 font-secondary text-fr-xs">
				{mime && <span className="text-fr-text-2">{mime}</span>}
				{meta && <span className="text-fr-text-3">{meta}</span>}
			</div>
		</div>
	);
}

// --- url -------------------------------------------------------------------

export interface ReadUrlMetaRow {
	readonly label: string;
	readonly value: string;
	readonly link?: boolean | undefined;
}

export interface ReadUrlBodyProps {
	readonly meta: readonly ReadUrlMetaRow[];
	/** Reader-mode markdown preview; omit to show the "preview hidden" hint. */
	readonly preview?: string | undefined;
}

/** URL read: meta key/value list + reader-mode preview on the dark surface card. */
export function ReadUrlBody({ meta, preview }: ReadUrlBodyProps) {
	return (
		<div className="grid gap-2 font-secondary text-fr-xs">
			<div>
				{meta.map(m => (
					<div key={m.label} className="flex gap-2 py-px">
						<span className="w-24 shrink-0 text-fr-text-3">{m.label}</span>
						<span
							className={
								m.link
									? "fr-overflow text-fr-blue underline decoration-fr-border"
									: "fr-overflow text-fr-text-2"
							}
						>
							{m.value}
						</span>
					</div>
				))}
			</div>
			{preview ? (
				<div className="rounded-[9px] border border-fr-border-soft bg-fr-surface px-3 py-[9px] font-primary text-fr-sm text-fr-text-2">
					<StreamingMarkdown text={preview} />
				</div>
			) : null}
		</div>
	);
}

// --- error -----------------------------------------------------------------

export interface ReadErrorBodyProps {
	readonly message: string;
}

export function ReadErrorBody({ message }: ReadErrorBodyProps) {
	return (
		<div className="rounded-[6px] bg-fr-del-bg px-2.5 py-1.5 font-secondary text-fr-xs text-fr-del">{message}</div>
	);
}
