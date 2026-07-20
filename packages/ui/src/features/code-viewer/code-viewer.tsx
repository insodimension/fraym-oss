"use client";

// CodeViewer — a file content preview surface. Markdown renders as prose; code is
// syntax-highlighted (Shiki) for known languages under a size cap, falling back to plain
// for huge/unknown files. Highlighting is stall-safe — plain-first paint, idle-time
// tokenization, cached by (lang, text) — so the dock switch path never blocks.

import { useMemo, useState } from "react";
import { canSyntaxHighlight, HighlightedCode, MAX_FILE_HIGHLIGHT_CHARS } from "../../elements/code-block";
import { FileTypeIcon } from "../../elements/file-type-icon";
import { PlainCodeBlock } from "../../elements/plain-code-block";
import { Skeleton, SkeletonGroup } from "../../elements/skeleton";
import { StreamingMarkdown } from "../../elements/streaming-markdown";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import type { FraymSurfaceConfig } from "../surface-kit";

// Extension -> Shiki language id. Unknown -> "text".
const EXT_LANG: Record<string, string> = {
	ts: "ts",
	tsx: "tsx",
	js: "js",
	jsx: "jsx",
	mjs: "js",
	cjs: "js",
	json: "json",
	jsonc: "json",
	py: "python",
	rs: "rust",
	go: "go",
	rb: "ruby",
	php: "php",
	java: "java",
	kt: "kotlin",
	swift: "swift",
	c: "c",
	h: "c",
	cpp: "cpp",
	cc: "cpp",
	hpp: "cpp",
	cs: "csharp",
	sh: "bash",
	bash: "bash",
	zsh: "bash",
	env: "bash",
	css: "css",
	scss: "scss",
	less: "less",
	html: "html",
	xml: "xml",
	svg: "xml",
	yaml: "yaml",
	yml: "yaml",
	toml: "toml",
	ini: "ini",
	sql: "sql",
	graphql: "graphql",
	gql: "graphql",
	vue: "vue",
	svelte: "svelte",
	lua: "lua",
	dart: "dart",
	txt: "text",
	log: "text",
};
const MD_EXTS = new Set(["md", "markdown", "mdx"]);

function extOf(path?: string): string {
	if (!path) return "";
	const base = path.split(/[\\/]/).pop() ?? "";
	const lower = base.toLowerCase();
	if (lower === "dockerfile") return "dockerfile";
	if (lower === "makefile") return "makefile";
	const dot = base.lastIndexOf(".");
	return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/** Best-effort Shiki language id for a file path. */
export function detectLanguage(path?: string): string {
	const ext = extOf(path);
	if (ext === "dockerfile") return "docker";
	if (ext === "makefile") return "makefile";
	return EXT_LANG[ext] ?? "text";
}

function basename(path: string): string {
	return path.split(/[\\/]/).pop() ?? path;
}

export type CodeViewerKind = "auto" | "markdown" | "code";

export interface CodeViewerProps {
	/** File path — used for the header label and markdown detection. */
	readonly path?: string;
	/** File text. `undefined` shows the empty state (or loading when `loading`). */
	readonly content?: string;
	/** Force markdown/code rendering instead of detecting from the extension. */
	readonly kind?: CodeViewerKind;
	readonly loading?: boolean;
	readonly showHeader?: boolean;
	readonly emptyLabel?: React.ReactNode;
	/** Optional leading element in the header (e.g. a file-tree reveal toggle). */
	readonly leading?: React.ReactNode;
	readonly settings?: FraymSurfaceConfig;
	readonly className?: string;
}

function buildMarkdownPreview(content: string | undefined): string {
	if (content == null) return "";
	return content;
}

function useCodeViewerPreview({ path, content, kind = "auto" }: Pick<CodeViewerProps, "path" | "content" | "kind">) {
	const ext = extOf(path);
	const isMarkdown = kind === "markdown" || (kind === "auto" && MD_EXTS.has(ext));
	const preview = useMemo(() => buildMarkdownPreview(content), [content]);
	return { isMarkdown, preview };
}

function useCopyFileContent(content?: string) {
	const [copied, setCopied] = useState(false);
	const copy = () => {
		if (content == null) return;
		navigator.clipboard?.writeText(content);
		setCopied(true);
		setTimeout(() => setCopied(false), 1200);
	};

	return { copied, copy };
}

function isCodeViewerHidden(settings?: FraymSurfaceConfig): boolean {
	return settings?.visible === false || settings?.placement === "hidden";
}

function isCodeViewerEmpty(loading: boolean, content?: string): boolean {
	return !loading && (content == null || content === "");
}

function codeViewerKind(isMarkdown: boolean): "markdown" | "code" {
	return isMarkdown ? "markdown" : "code";
}

function CodeViewerHeaderSlot({
	showHeader,
	path,
	copied,
	onCopy,
	leading,
}: {
	readonly showHeader: boolean;
	readonly path?: string;
	readonly copied: boolean;
	readonly onCopy: () => void;
	readonly leading?: React.ReactNode;
}) {
	if (!showHeader || (!path && !leading)) return null;
	return <CodeViewerHeader path={path} copied={copied} onCopy={onCopy} leading={leading} />;
}

function CodeViewerHeader({
	path,
	copied,
	onCopy,
	leading,
}: {
	readonly path?: string;
	readonly copied: boolean;
	readonly onCopy: () => void;
	readonly leading?: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-2 border-b border-fr-border-soft px-3 py-1.5">
			{leading}
			{path ? (
				<FileTypeIcon path={path} size={13} />
			) : (
				<Icon name="file" size={13} className="shrink-0 text-fr-text-3" />
			)}
			{path ? <span className="fr-overflow text-fr-sm text-fr-text-2">{basename(path)}</span> : null}
			<button
				type="button"
				onClick={onCopy}
				className="ml-auto inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-fr-2xs text-fr-text-3 hover:bg-fr-surface hover:text-fr-text-2"
			>
				<Icon name={copied ? "check" : "list"} size={11} />
				{copied ? "copied" : "copy"}
			</button>
		</div>
	);
}

function CodeViewerBody({
	loading,
	empty,
	emptyLabel,
	isMarkdown,
	preview,
	language,
}: {
	readonly loading: boolean;
	readonly empty: boolean;
	readonly emptyLabel: React.ReactNode;
	readonly isMarkdown: boolean;
	readonly preview: string;
	readonly language: string;
}) {
	// Match the read/write/diff tool surface: code renders flush on var(--fr-diff-bg)
	// (transparent in dark → app bg; #f7f6f4 in light) with no inner panel. Markdown /
	// loading / empty keep prose padding.
	const isCode = !loading && !empty && !isMarkdown;
	return (
		<div
			className={cn(
				"min-h-0 flex-1 overflow-auto",
				isCode ? "bg-[var(--fr-diff-bg)] font-secondary text-fr-xs leading-[1.65]" : "p-3",
			)}
		>
			{loading ? (
				<CodeViewerSkeleton />
			) : empty ? (
				<div className="px-1 py-8 text-center text-fr-sm text-fr-text-3">{emptyLabel}</div>
			) : isMarkdown ? (
				<StreamingMarkdown text={preview} />
			) : canSyntaxHighlight(preview, language, MAX_FILE_HIGHLIGHT_CHARS) ? (
				<HighlightedCode code={preview} language={language} lineNumbers className="text-fr-xs" />
			) : (
				<PlainCodeBlock code={preview} lineNumbers className="text-fr-xs" />
			)}
		</div>
	);
}

export function CodeViewer({
	path,
	content,
	kind = "auto",
	loading = false,
	showHeader = true,
	emptyLabel = "Select a file to preview.",
	settings,
	leading,
	className,
}: CodeViewerProps) {
	const { isMarkdown, preview } = useCodeViewerPreview({ path, content, kind });
	const { copied, copy } = useCopyFileContent(content);

	if (isCodeViewerHidden(settings)) return null;

	return (
		<div
			data-slot="code-viewer"
			data-kind={codeViewerKind(isMarkdown)}
			className={cn("flex h-full min-h-0 flex-col bg-fr-bg", className)}
		>
			<CodeViewerHeaderSlot showHeader={showHeader} path={path} copied={copied} onCopy={copy} leading={leading} />
			<CodeViewerBody
				loading={loading}
				empty={isCodeViewerEmpty(loading, content)}
				emptyLabel={emptyLabel}
				isMarkdown={isMarkdown}
				preview={preview}
				language={detectLanguage(path)}
			/>
		</div>
	);
}

const CODE_VIEWER_SKELETON_WIDTHS = [
	"55%",
	"78%",
	"40%",
	"66%",
	"85%",
	"48%",
	"72%",
	"60%",
	"32%",
	"80%",
	"52%",
	"68%",
] as const;

function CodeViewerSkeleton() {
	return (
		<SkeletonGroup label="Loading file…" className="flex flex-col gap-[6px]">
			{CODE_VIEWER_SKELETON_WIDTHS.map((w, i) => (
				<div key={i} className="flex items-center gap-3">
					<Skeleton w={16} h={9} rounded="sm" className="shrink-0 opacity-50" />
					<Skeleton w={w} h={9} rounded="sm" />
				</div>
			))}
		</SkeletonGroup>
	);
}
