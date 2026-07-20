// LspLateDiagnosticSurface — compact transcript card for Engine's
// `lsp-late-diagnostic` custom message (diagnostics that landed after an edit
// tool already returned, batched per turn). The persisted message text is a
// `<system-notice>` envelope listing `<path> — <summary>` plus raw diagnostic
// lines — model-only noise. We show a tidy header (file count + errored count)
// over a quote-bordered per-file list instead of dumping the envelope.
//
// Registered as the `msg:lsp-late-diagnostic` surface renderer. Like the other
// message surfaces, the transcript row reliably carries only `text` (the live
// render path / snapshot hydration drop the structured `details`), so we resolve
// payload-first and fall back to parsing the envelope; an unparseable envelope
// degrades to a bare "Late LSP diagnostics" label rather than raw text.

import type { ReactNode } from "react";
import { Badge } from "../../elements/badge";
import { cn } from "../../lib/cn";
import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry";

export interface LspDiagnosticFile {
	readonly path: string;
	readonly summary: string;
	readonly errored: boolean;
	readonly messages: readonly string[];
}

/** Normalized late-diagnostic fields, merged payload-first / text-fallback. */
export interface LspLateDiagnosticFields {
	readonly files: readonly LspDiagnosticFile[];
}

function str(value: unknown): string {
	return typeof value === "string" ? value : "";
}

// A file header line: `<path> — <summary>` (em dash, or a spaced hyphen),
// where the left side looks path-like (has a `.`, `/`, or `\`) so diagnostic
// message lines that happen to contain a dash are not mistaken for files.
const FILE_LINE = /^(.+?)\s+(?:\u2014|-)\s+(.*)$/;

/**
 * Parse the `<system-notice>` late-diagnostics envelope into per-file entries.
 * The `errored` flag is payload-only (text carries no reliable signal), so it
 * defaults to false here. Tolerant: a malformed envelope yields `[]`.
 */
export function parseLspLateDiagnosticText(raw: string): LspDiagnosticFile[] {
	const inner = raw
		.trim()
		.replace(/^<system-notice>\s*/i, "")
		.replace(/\s*<\/system-notice>\s*$/i, "")
		// Drop the leading "Late LSP diagnostics arrived …:" header line.
		.replace(/^Late LSP diagnostics arrived[^\n]*:\s*\n?/i, "")
		.trim();
	const files: Array<{ path: string; summary: string; messages: string[] }> = [];
	let current: { path: string; summary: string; messages: string[] } | null = null;
	for (const rawLine of inner.split("\n")) {
		const line = rawLine.trim();
		if (!line) continue;
		const fileMatch = FILE_LINE.exec(line);
		const path = fileMatch?.[1]?.trim() ?? "";
		if (fileMatch && path && /[\\/.]/.test(path)) {
			current = { path, summary: fileMatch[2]?.trim() ?? "", messages: [] };
			files.push(current);
		} else if (current) {
			current.messages.push(line);
		}
	}
	return files.map(file => ({ ...file, errored: false }));
}

/**
 * Resolve a surface input into normalized late-diagnostic fields. Prefers the
 * structured `payload.files` (Engine `LateDiagnosticsDetails`) and falls back to
 * parsing the envelope text. Returns null for non-message inputs.
 */
export function resolveLspLateDiagnostic(input: SurfaceRenderInput): LspLateDiagnosticFields | null {
	if (input.channel !== "message") return null;
	const payload: Record<string, unknown> =
		input.payload !== null && typeof input.payload === "object" ? (input.payload as Record<string, unknown>) : {};
	const payloadFiles = Array.isArray(payload.files) ? payload.files : null;
	if (payloadFiles && payloadFiles.length > 0) {
		const files = payloadFiles.map<LspDiagnosticFile>(entry => {
			const rec: Record<string, unknown> =
				entry !== null && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
			return {
				path: str(rec.path).trim(),
				summary: str(rec.summary).trim(),
				errored: rec.errored === true,
				messages: Array.isArray(rec.messages) ? rec.messages.filter((m): m is string => typeof m === "string") : [],
			};
		});
		return { files };
	}
	return { files: parseLspLateDiagnosticText(input.text ?? "") };
}

export function LspLateDiagnosticSurface({ fields }: { readonly fields: LspLateDiagnosticFields }) {
	const { files } = fields;
	const erroredCount = files.reduce((n, file) => n + (file.errored ? 1 : 0), 0);
	return (
		<div data-slot="lsp-late-diagnostic" className="flex min-w-0 flex-col gap-1 py-0.5">
			<div
				data-slot="lsp-late-diagnostic-head"
				className="flex min-w-0 flex-wrap items-center gap-2 font-secondary text-fr-xs text-fr-text-3"
			>
				<span aria-hidden className="shrink-0 text-fr-warn text-fr-xs leading-none">
					{"\u25C8"}
				</span>
				<span className="shrink-0 font-medium text-fr-text-2">Late LSP diagnostics</span>
				{files.length > 0 && (
					<Badge variant="soft" tone="mute" className="shrink-0">
						{files.length} {files.length === 1 ? "file" : "files"}
					</Badge>
				)}
				{erroredCount > 0 && (
					<Badge variant="soft" tone="del" className="shrink-0">
						{erroredCount} errored
					</Badge>
				)}
			</div>
			{files.map((file, index) => (
				<div
					key={file.path || `file-${index}`}
					data-slot="lsp-late-diagnostic-file"
					className="flex min-w-0 items-baseline gap-2 border-fr-border-soft border-l-2 pl-2 font-secondary text-fr-xs"
				>
					<span
						aria-hidden
						className={cn("shrink-0 leading-none", file.errored ? "text-fr-del" : "text-fr-text-3")}
					>
						{file.errored ? "\u2716" : "\u2022"}
					</span>
					<span className="min-w-0 fr-overflow font-medium text-fr-text-2" title={file.path}>
						{file.path}
					</span>
					{file.summary && <span className="min-w-0 fr-overflow text-fr-text-3">{file.summary}</span>}
				</div>
			))}
		</div>
	);
}

/** `msg:lsp-late-diagnostic` surface renderer — compact late-diagnostics card. */
export function renderLspLateDiagnostic(input: SurfaceRenderInput): ReactNode {
	if (input.channel !== "message") return null;
	const fields = resolveLspLateDiagnostic(input);
	if (fields === null) return null;
	return <LspLateDiagnosticSurface fields={fields} />;
}
