// `ast_grep` tool renderer — structural-match list at TUI parity (mirrors engine
// .../tools/ast-grep.ts → astGrepToolRenderer). Parses the USER-FACING
// `details.displayContent` (never the model hashline text) into directory→file groups with
// captured-metavariable rows, and drives the card head: `AST Grep` + the AST pattern chip +
// `N matches · M files` + `searched K` + scope + `⚠ limit reached` / `⚠ N parse errors`.
// Self-contained defensive parse (mirrors bash/find/search renderers); decoupled from the
// search lane. NO streaming — ast_grep is a single native AST query. Registered for `ast_grep`.
// See docs/design/tools/ast-grep.md.

import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readStringField } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import type { ToolStatus } from "../tool-card";
import { parseAstGrepDisplay } from "./bodies/ast-grep-display";
import { AstGrepEmptyBody, AstGrepPendingBody, AstGrepResultsBody } from "./bodies/ast-grep-results-body";
import { EditErrorBody } from "./bodies/edit-diff-body";
import { dimChip, truncatingChip } from "./chip";

// --- defensive parse (local; no coupling to the monolith) -------------------

function readNumberField(value: unknown, key: string): number | undefined {
	const v = readField(value, key);
	return typeof v === "number" ? v : undefined;
}

/** `paths` is a string or string[] in the schema. */
function toPathList(input: unknown): string[] {
	if (typeof input === "string") return [input];
	return Array.isArray(input) ? input.filter((s): s is string => typeof s === "string") : [];
}

function readResultText(output: unknown): string | undefined {
	const content = readField(output, "content");
	if (Array.isArray(content)) {
		for (const part of content) {
			if (readField(part, "type") === "text") {
				const text = readField(part, "text");
				if (typeof text === "string") return text;
			}
		}
	}
	return undefined;
}

interface AstGrepContext {
	readonly pattern: string;
	readonly paths: string[];
	readonly skip: number | undefined;
	readonly running: boolean;
	readonly isError: boolean;
	readonly errorText: string;
	readonly matchCount: number;
	readonly fileCount: number;
	readonly filesSearched: number;
	readonly scopePath: string | undefined;
	readonly limitReached: boolean;
	readonly parseErrorCount: number;
	readonly displayContent: string;
}

function astGrepIsError(call: ActiveToolCall, output: unknown, errorText: string | undefined): boolean {
	return call.status === "error" || readField(output, "isError") === true || errorText !== undefined;
}

function astGrepParseErrorCount(details: unknown): number {
	const parseErrors = readField(details, "parseErrors");
	return readNumberField(details, "parseErrorsTotal") ?? (Array.isArray(parseErrors) ? parseErrors.length : 0);
}

function astGrepRawError(call: ActiveToolCall, output: unknown, errorText: string | undefined): string {
	return (
		errorText ??
		(typeof call.text === "string" ? call.text : undefined) ??
		readResultText(output) ??
		"AST Grep failed"
	);
}

function readAstGrepContext(call: ActiveToolCall): AstGrepContext {
	const input = call.input;
	const output = call.output;
	const details = readField(output, "details");

	const errorText = readStringField(details, "error");
	const isError = astGrepIsError(call, output, errorText);
	const parseErrorCount = astGrepParseErrorCount(details);
	const skipRaw = readNumberField(input, "skip");
	const rawError = astGrepRawError(call, output, errorText);

	return {
		pattern: readStringField(input, "pat") ?? "",
		paths: toPathList(readField(input, "paths")),
		skip: skipRaw !== undefined && skipRaw > 0 ? skipRaw : undefined,
		running: call.status === "running",
		isError,
		errorText: rawError.replace(/^Error:\s*/, ""),
		matchCount: readNumberField(details, "matchCount") ?? 0,
		fileCount: readNumberField(details, "fileCount") ?? 0,
		filesSearched: readNumberField(details, "filesSearched") ?? 0,
		scopePath: readStringField(details, "scopePath"),
		limitReached: readField(details, "limitReached") === true,
		parseErrorCount,
		displayContent: readStringField(details, "displayContent") ?? "",
	};
}

// --- head chips -------------------------------------------------------------

function patternBadge(pattern: string): ReactNode {
	return truncatingChip({ key: "pat", text: pattern || "?", maxCh: 28, variant: "soft", tone: "mute" });
}

function resultBadges(ctx: AstGrepContext): ReactNode[] {
	const badges: ReactNode[] = [patternBadge(ctx.pattern)];
	badges.push(dimChip("m", `${ctx.matchCount} ${ctx.matchCount === 1 ? "match" : "matches"}`));
	badges.push(dimChip("f", `· ${ctx.fileCount} ${ctx.fileCount === 1 ? "file" : "files"}`));
	if (ctx.filesSearched > 0) badges.push(dimChip("s", `· searched ${ctx.filesSearched}`));
	if (ctx.scopePath) badges.push(dimChip("scope", `in ${ctx.scopePath}`, "max-w-[22ch] fr-overflow"));
	if (ctx.limitReached) {
		badges.push(
			<Badge key="lim" variant="code" tone="warn">
				⚠ limit reached
			</Badge>,
		);
	}
	if (ctx.parseErrorCount > 0) {
		badges.push(
			<Badge key="pe" variant="code" tone="warn">
				⚠ {ctx.parseErrorCount} parse {ctx.parseErrorCount === 1 ? "error" : "errors"}
			</Badge>,
		);
	}
	return badges;
}

function footerNotes(ctx: AstGrepContext): string[] {
	const notes: string[] = [];
	if (ctx.limitReached) notes.push("limit reached; narrow paths or increase limit");
	if (ctx.parseErrorCount > 0)
		notes.push(`${ctx.parseErrorCount} parse ${ctx.parseErrorCount === 1 ? "error" : "errors"}`);
	return notes;
}

// --- renderer ---------------------------------------------------------------

const renderAstGrep: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const ctx = readAstGrepContext(call);

	if (ctx.running) {
		return {
			label: "AST Grep",
			badges: [patternBadge(ctx.pattern)],
			kind: "grep",
			status: "pending",
			stat: "matching…",
			body: <AstGrepPendingBody paths={ctx.paths} />,
		};
	}

	if (ctx.isError) {
		return {
			label: "AST Grep",
			badges: [patternBadge(ctx.pattern)],
			kind: "grep",
			status: "error",
			stat: "failed",
			body: <EditErrorBody message={ctx.errorText} />,
		};
	}

	if (ctx.matchCount === 0) {
		return {
			label: "AST Grep",
			badges: resultBadges(ctx),
			kind: "grep",
			status: "warn",
			body: <AstGrepEmptyBody parseHint={ctx.parseErrorCount > 0} />,
		};
	}

	const groups = parseAstGrepDisplay(ctx.displayContent);
	const status: ToolStatus = ctx.limitReached ? "warn" : "success";
	return {
		label: "AST Grep",
		badges: resultBadges(ctx),
		kind: "grep",
		status,
		body: <AstGrepResultsBody groups={groups} footerNotes={footerNotes(ctx)} />,
	};
};

export { renderAstGrep };
