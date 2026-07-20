// SkillPromptSurface — compact transcript card for Engine's `skill-prompt` custom
// message (a `/skill:<name>` invocation injects the full SKILL.md body into the
// model's context). The persisted message text is that whole prompt body plus a
// trailing `--- / Skill: <path> / User: <args>` metadata block — model-only
// noise we must never dump. Mirrors the TUI's collapsed SkillMessageComponent:
// a one-line "skill: <name> <args>" header, NOT the expanded prompt.
//
// Registered as the `msg:skill-prompt` surface renderer. Like AsyncResultSurface
// and IrcMessageSurface, the transcript row reliably carries only `text` (the
// live render path / snapshot hydration drop the structured `details`), so we
// resolve payload-first and fall back to parsing the metadata block; when even
// the name is unparseable we degrade to a generic "skill prompt" label.

import type { ReactNode } from "react";
import { Badge } from "../../elements/badge";
import type { SurfaceRenderInput } from "../../registries/surface-renderer-registry";

/** Normalized skill-prompt card fields, merged payload-first / text-fallback. */
export interface SkillPromptFields {
	readonly name: string;
	readonly args?: string;
	readonly path?: string;
	readonly lineCount?: number;
}

function str(value: unknown): string {
	return typeof value === "string" ? value : "";
}

/**
 * Parse the `skill-prompt` envelope's trailing metadata block:
 *   <prompt body…>
 *
 *   ---
 *
 *   Skill: /abs/path/to/<name>/SKILL.md
 *   User: <args>
 * Returns the display `name` (derived from the SKILL.md folder), `args`, and
 * `path`. Tolerant: missing pieces collapse to empty/undefined, never throws.
 */
export function parseSkillPromptText(raw: string): { name: string; args?: string; path?: string } {
	// The metadata is the block after the FINAL `\n---\n` separator (the body
	// itself may contain `---` horizontal rules, so anchor to the last one).
	const sepIdx = raw.lastIndexOf("\n---\n");
	const meta = sepIdx >= 0 ? raw.slice(sepIdx + 5) : raw;
	const path = /^Skill:\s*(.+)$/m.exec(meta)?.[1]?.trim() || undefined;
	const args = /User:\s*([\s\S]+)$/.exec(meta)?.[1]?.trim() || undefined;
	// Display name = the folder containing SKILL.md, else the last path segment.
	const name = path ? (/([^\\/]+)[\\/]SKILL\.md$/i.exec(path)?.[1] ?? path.split(/[\\/]/).pop() ?? "") : "";
	return { name, args, path };
}

/**
 * Resolve a surface input into normalized skill-prompt fields. Prefers the
 * structured `payload` (Engine `SkillPromptDetails`) and falls back to parsing the
 * envelope `text` metadata block. Returns null for non-message inputs.
 */
export function resolveSkillPrompt(input: SurfaceRenderInput): SkillPromptFields | null {
	if (input.channel !== "message") return null;
	const payload: Record<string, unknown> =
		input.payload !== null && typeof input.payload === "object" ? (input.payload as Record<string, unknown>) : {};
	let name = str(payload.name).trim();
	let args = str(payload.args).trim() || undefined;
	let path = str(payload.path).trim() || undefined;
	const lineCount = typeof payload.lineCount === "number" ? payload.lineCount : undefined;
	if (!name) {
		const parsed = parseSkillPromptText(input.text ?? "");
		name ||= parsed.name;
		if (!args) args = parsed.args;
		if (!path) path = parsed.path;
	}
	return { name, args, path, lineCount };
}

export function SkillPromptSurface({ fields }: { readonly fields: SkillPromptFields }) {
	const { name, args, path, lineCount } = fields;
	return (
		<div
			data-slot="skill-prompt"
			className="flex min-w-0 flex-wrap items-center gap-2 py-0.5 font-secondary text-fr-xs text-fr-text-3"
		>
			<span aria-hidden className="shrink-0 text-fr-accent text-fr-xs leading-none">
				{"\u2726"}
			</span>
			<span className="shrink-0 font-medium text-fr-text-2">skill</span>
			<Badge variant="code" tone="accent" className="min-w-0 max-w-[16rem] fr-overflow" title={path}>
				{name || "skill prompt"}
			</Badge>
			{args && (
				<span data-slot="skill-prompt-args" className="min-w-0 fr-overflow text-fr-text-2">
					{args}
				</span>
			)}
			{typeof lineCount === "number" && lineCount > 0 && (
				<span className="shrink-0 tabular-nums text-fr-text-3">{lineCount} lines</span>
			)}
		</div>
	);
}

/** `msg:skill-prompt` surface renderer — compact skill invocation breadcrumb. */
export function renderSkillPrompt(input: SurfaceRenderInput): ReactNode {
	if (input.channel !== "message") return null;
	const fields = resolveSkillPrompt(input);
	if (fields === null) return null;
	return <SkillPromptSurface fields={fields} />;
}
