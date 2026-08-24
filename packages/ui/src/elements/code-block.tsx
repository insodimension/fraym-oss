import type { HighlightResult } from "@streamdown/code";
import { useEffect, useState } from "react";
import { cn } from "../lib/cn";
import { CopyButton } from "./copy-button";
import { PlainCodeBlock } from "./plain-code-block";

function escapeHtml(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Convert a shiki dual-theme TokensResult into one HTML string per line. */
function toLineHtml(result: HighlightResult): string[] {
	return result.tokens.map(lineTokens =>
		lineTokens
			.map(t => {
				const style = (t.htmlStyle ?? {}) as Record<string, string>;
				const parts: string[] = [];
				if (style.color) parts.push(`--sdm-c:${style.color}`);
				if (style["--shiki-dark"]) parts.push(`--shiki-dark:${style["--shiki-dark"]}`);
				if (parts.length === 0) return escapeHtml(t.content);
				return `<span style="${parts.join(";")}">${escapeHtml(t.content)}</span>`;
			})
			.join(""),
	);
}

/**
 * The Shiki engine, loaded on the first code block instead of at boot.
 *
 * A static import cannot work here: this IS the code-split boundary. Measured on
 * the Yarin build, `@streamdown/code` pulls Shiki's grammars and themes as three
 * eager chunks - 3.85MB + 3.53MB + 1.36MB - which the app downloaded and compiled
 * on every launch. Yarin renders inside Unreal's embedded CEF browser, where that
 * is the lag felt when opening the dock, and a session with no fenced code never
 * needs any of it.
 *
 * Only the members this file calls are declared, so the module type never leaks
 * into signatures. Highlighting is already async and already falls back to plain
 * text until it resolves (`useShikiLineHtml` returns null), so waiting for the
 * chunk costs nothing but color on the first block.
 */
interface ShikiEngine {
	supportsLanguage(language: string): boolean;
	getThemes(): unknown;
	highlight(
		options: { readonly code: string; readonly language: string; readonly themes: unknown },
		onReady: (result: HighlightResult) => void,
	): HighlightResult | undefined;
}

let shikiEngine: ShikiEngine | null = null;
let shikiLoad: Promise<ShikiEngine> | null = null;
function loadShiki(): Promise<ShikiEngine> {
	shikiLoad ??= import("@streamdown/code").then(module => {
		shikiEngine = module.code as unknown as ShikiEngine;
		return shikiEngine;
	});
	return shikiLoad;
}

// Tokenized line-HTML cache keyed by (lang, text). Shiki tokenization is synchronous
// once the grammar is warm, so without this every history remount / scrollback re-runs
// it — the stall this hook was previously banned from the tool bodies to avoid. Bounded
// LRU: a get/set moves the key to the most-recent end; overflow evicts the oldest.
const HL_CACHE = new Map<string, readonly string[]>();
const HL_CACHE_MAX = 512;
function hlCacheGet(key: string): readonly string[] | undefined {
	const hit = HL_CACHE.get(key);
	if (hit) {
		HL_CACHE.delete(key);
		HL_CACHE.set(key, hit);
	}
	return hit;
}
function hlCacheSet(key: string, value: readonly string[]): void {
	HL_CACHE.delete(key);
	HL_CACHE.set(key, value);
	if (HL_CACHE.size > HL_CACHE_MAX) {
		const oldest = HL_CACHE.keys().next().value;
		if (oldest !== undefined) HL_CACHE.delete(oldest);
	}
}

// Defer tokenization to idle time so a mount-storm of many cards (initial thread load,
// scrollback) never tokenizes synchronously in one frame. Falls back to a macrotask.
type IdleScope = {
	requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
	cancelIdleCallback?: (h: number) => void;
};
function scheduleIdle(run: () => void): number {
	const ric = (globalThis as IdleScope).requestIdleCallback;
	return ric ? ric(run, { timeout: 250 }) : (setTimeout(run, 0) as unknown as number);
}
function cancelIdle(handle: number): void {
	const cic = (globalThis as IdleScope).cancelIdleCallback;
	if (cic) cic(handle);
	else clearTimeout(handle);
}

// Gate for code surfaces: highlight known languages under a size cap. Highlighting is
// idle-deferred + LRU-cached, so the cap guards the worst-case single huge-file tokenize,
// not the steady state. The transcript/tool-body default stays conservative (many cards →
// mount-storm); the file viewer — a deliberate single-file open with no storm — passes the
// larger `MAX_FILE_HIGHLIGHT_CHARS` so real source files (e.g. a 130k-char module) still color.
export const MAX_HIGHLIGHT_CHARS = 50_000;
export const MAX_FILE_HIGHLIGHT_CHARS = 250_000;
export function canSyntaxHighlight(text: string, language: string, maxChars: number = MAX_HIGHLIGHT_CHARS): boolean {
	return language !== "" && language !== "text" && text.length <= maxChars;
}

/** Placeholder for the `live` path, which never looks at the lines at all. */
const NO_LINES: readonly string[] = [];

/**
 * Shiki-highlight `lines` (joined, for cross-line grammar context) → per-line HTML,
 * matching the read/write Streamdown path. Returns `null` until the async highlighter
 * is ready, or when the language is unsupported (caller falls back to plain text).
 *
 * Stall-safe: a cache hit highlights on the FIRST paint (no flash, no work) so history
 * remounts / scrollback never re-tokenize; a miss defers tokenization to idle time so
 * many cards mounting at once never block a frame. Exported so the whole library uses
 * one Shiki engine, one theme config, one cache.
 *
 * `live` = this content is STILL GROWING (a streaming `write`, an edit diff arriving
 * chunk by chunk). The cache is keyed on the WHOLE text, so every delta is a fresh key:
 * tokenizing on each one re-does the entire block and costs O(n²) across a streamed
 * answer. While `live` the hook returns `null` (the caller renders plain) and does not
 * even join the lines; the block tokenizes ONCE, on the render where `live` goes false.
 */
export function useShikiLineHtml(
	lines: readonly string[],
	language: string,
	live = false,
): readonly string[] | null {
	// Skipping the join while live keeps the per-delta cost O(1) instead of O(n), and
	// pins the effect deps so a growing block does not re-run the effect per chunk.
	const text = live ? "" : lines.join("\n");
	const lang = language.toLowerCase();
	const key = live ? "" : `${lang}\u0000${text}`;
	const [html, setHtml] = useState<readonly string[] | null>(() => (live ? null : hlCacheGet(key) ?? null));

	useEffect(() => {
		if (live) {
			setHtml(null);
			return;
		}
		const cached = hlCacheGet(key);
		if (cached) {
			setHtml(cached);
			return;
		}
		let active = true;
		const apply = (r: HighlightResult): void => {
			const lineHtml = toLineHtml(r);
			hlCacheSet(key, lineHtml);
			if (active) setHtml(lineHtml);
		};
		// Tokenize through the engine once it is here; the first block on screen pays
		// the chunk load and renders plain until then.
		const tokenize = (engine: ShikiEngine): void => {
			if (!active) return;
			if (!engine.supportsLanguage(lang)) {
				setHtml(null);
				return;
			}
			const result = engine.highlight({ code: text, language: lang, themes: engine.getThemes() }, apply);
			if (result) apply(result);
		};
		const handle = scheduleIdle(() => {
			if (!active) return;
			if (shikiEngine) tokenize(shikiEngine);
			else void loadShiki().then(tokenize);
		});
		return () => {
			active = false;
			cancelIdle(handle);
		};
	}, [key, lang, text, live]);

	return html;
}

export interface HighlightedCodeProps {
	readonly code: string;
	/** Shiki language id. */
	readonly language: string;
	readonly lineNumbers?: boolean;
	readonly startLine?: number;
	readonly className?: string;
	readonly codeClassName?: string;
	/** This code is still GROWING (streaming): render plain and tokenize once it
	 *  settles, instead of re-tokenizing the whole block on every chunk. */
	readonly live?: boolean;
}

/**
 * Shiki-highlighted code body — no card chrome. Falls back to PlainCodeBlock
 * while the async highlighter loads or for an unsupported language, so the first
 * paint never blocks on Shiki (the read/write tool bodies make the same trade).
 * The shared headless body for CodeBlock and the file CodeViewer.
 */
export function HighlightedCode({
	code: source,
	language,
	lineNumbers = false,
	startLine = 1,
	className,
	codeClassName,
	live = false,
}: HighlightedCodeProps) {
	const lineHtml = useShikiLineHtml(live ? NO_LINES : source.split("\n"), language, live);
	if (!lineHtml) {
		return (
			<PlainCodeBlock
				code={source}
				lineNumbers={lineNumbers}
				startLine={startLine}
				{...(className !== undefined ? { className } : {})}
				{...(codeClassName !== undefined ? { codeClassName } : {})}
			/>
		);
	}
	const html = lineNumbers ? withLineNumbers(lineHtml, startLine) : lineHtml.join("\n");
	return (
		<pre
			className={cn(
				"fr-shiki-code m-0 overflow-auto whitespace-pre bg-transparent font-secondary text-fr-xs leading-[1.65] text-fr-text",
				className,
			)}
		>
			<code className={codeClassName} dangerouslySetInnerHTML={{ __html: html }} />
		</pre>
	);
}

export interface CodeBlockProps {
	readonly code: string;
	readonly language?: string;
	readonly lineNumbers?: boolean;
	readonly className?: string;
}

export function CodeBlock({ code: source, language = "tsx", lineNumbers = false, className }: CodeBlockProps) {
	return (
		<div
			data-slot="code-block"
			className={cn(
				"group relative overflow-hidden rounded-lg border border-fr-border-soft bg-fr-surface",
				className,
			)}
		>
			<div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
				<CopyButton value={source} label="Copy code" />
			</div>

			<HighlightedCode
				code={source}
				language={language}
				lineNumbers={lineNumbers}
				className="p-0"
				codeClassName="block px-4 py-3"
			/>
		</div>
	);
}

function withLineNumbers(lines: readonly string[], startLine: number): string {
	return lines
		.map((line, i) => {
			const num = `<span class="mr-3 inline-block w-[46px] select-none border-r border-fr-border-soft pr-2.5 text-right text-fr-text-3">${startLine + i}</span>`;
			return `<span class="block">${num}${line || " "}</span>`;
		})
		.join("");
}
