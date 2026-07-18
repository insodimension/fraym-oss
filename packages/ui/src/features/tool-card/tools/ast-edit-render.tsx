// `ast_edit` tool renderer — structural-rewrite diff at TUI parity (mirrors engine
// .../tools/ast-edit.ts → astEditToolRenderer). Parses the USER-FACING
// `details.displayContent` (never the model hashline text) into directory→file groups of
// before/after change rows, and drives the card head: `AST Edit` + the op pattern (or
// `N rewrites`) + `N replacements · M files` + `searched K` + scope + a `proposed` badge
// (the edit is a preview pending resolve when not applied) + `⚠ limit reached` / `⚠ N parse
// errors`. Self-contained defensive parse (mirrors find/ast_grep); NOT `renderEdit` — ast_edit
// emits `displayContent`, not `details.diff`. NO streaming. Registered for `ast_edit`.
// See docs/design/tools/ast-edit.md.

import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readStringField } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import type { ToolStatus } from "../tool-card";
import { AstEditDiffBody, AstEditEmptyBody, AstEditPendingBody } from "./bodies/ast-edit-diff-body";
import { parseAstEditDisplay } from "./bodies/ast-edit-display";
import { EditErrorBody } from "./bodies/edit-diff-body";
import { dimChip, truncatingChip } from "./chip";
import { readFirstTextResult, readNumberField, toPathList } from "./renderer-utils";

// --- defensive parse (local; no coupling to the monolith) -------------------

/** First op's pattern + the op count, from `input.ops: [{pat, out}]`. */
function readOps(input: unknown): { firstPat: string | undefined; count: number } {
	const ops = readField(input, "ops");
	if (!Array.isArray(ops) || ops.length === 0) return { firstPat: undefined, count: 0 };
	return { firstPat: readStringField(ops[0], "pat"), count: ops.length };
}

interface AstEditContext {
	readonly opLabel: string;
	readonly paths: string[];
	readonly running: boolean;
	readonly isError: boolean;
	readonly errorText: string;
	readonly totalReplacements: number;
	readonly filesTouched: number;
	readonly filesSearched: number;
	readonly applied: boolean;
	readonly scopePath: string | undefined;
	readonly limitReached: boolean;
	readonly parseErrorCount: number;
	readonly displayContent: string;
}

function readAstEditContext(call: ActiveToolCall): AstEditContext {
	const input = call.input;
	const output = call.output;
	const details = readField(output, "details");

	const isError = call.status === "error" || readField(output, "isError") === true;
	const { firstPat, count } = readOps(input);
	const opLabel = count > 1 ? `${count} rewrites` : (firstPat ?? "?");

	const parseErrors = readField(details, "parseErrors");
	const parseErrorCount =
		readNumberField(details, "parseErrorsTotal") ?? (Array.isArray(parseErrors) ? parseErrors.length : 0);

	const rawError =
		(typeof call.text === "string" ? call.text : undefined) ?? readFirstTextResult(output) ?? "AST Edit failed";

	return {
		opLabel,
		paths: toPathList(readField(input, "paths")),
		running: call.status === "running",
		isError,
		errorText: rawError.replace(/^Error:\s*/, ""),
		totalReplacements: readNumberField(details, "totalReplacements") ?? 0,
		filesTouched: readNumberField(details, "filesTouched") ?? 0,
		filesSearched: readNumberField(details, "filesSearched") ?? 0,
		applied: readField(details, "applied") === true,
		scopePath: readStringField(details, "scopePath"),
		limitReached: readField(details, "limitReached") === true,
		parseErrorCount,
		displayContent: readStringField(details, "displayContent") ?? "",
	};
}

// --- head chips -------------------------------------------------------------

function opBadge(opLabel: string): ReactNode {
	return truncatingChip({ key: "op", text: opLabel, maxCh: 28, variant: "soft", tone: "mute" });
}

function resultBadges(ctx: AstEditContext): ReactNode[] {
	const badges: ReactNode[] = [opBadge(ctx.opLabel)];
	if (!ctx.applied) {
		badges.push(
			<Badge key="proposed" variant="code" tone="warn">
				proposed
			</Badge>,
		);
	}
	badges.push(
		dimChip("r", `${ctx.totalReplacements} ${ctx.totalReplacements === 1 ? "replacement" : "replacements"}`),
	);
	badges.push(dimChip("f", `· ${ctx.filesTouched} ${ctx.filesTouched === 1 ? "file" : "files"}`));
	if (ctx.filesSearched > 0) badges.push(dimChip("s", `· searched ${ctx.filesSearched}`));
	if (ctx.scopePath) badges.push(dimChip("scope", `in ${ctx.scopePath}`, "max-w-[20ch] fr-overflow"));
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

function footerNotes(ctx: AstEditContext): string[] {
	const notes: string[] = [];
	if (ctx.limitReached) notes.push("limit reached; narrow paths");
	if (ctx.parseErrorCount > 0)
		notes.push(`${ctx.parseErrorCount} parse ${ctx.parseErrorCount === 1 ? "error" : "errors"}`);
	return notes;
}

// --- renderer ---------------------------------------------------------------

const renderAstEdit: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const ctx = readAstEditContext(call);

	if (ctx.running) {
		return {
			label: "AST Edit",
			badges: [opBadge(ctx.opLabel)],
			kind: "edit",
			status: "pending",
			stat: "rewriting…",
			body: <AstEditPendingBody paths={ctx.paths} />,
		};
	}

	if (ctx.isError) {
		return {
			label: "AST Edit",
			badges: [opBadge(ctx.opLabel)],
			kind: "edit",
			status: "error",
			stat: "failed",
			body: <EditErrorBody message={ctx.errorText} />,
		};
	}

	if (ctx.totalReplacements === 0) {
		return {
			label: "AST Edit",
			badges: [opBadge(ctx.opLabel), dimChip("r0", "0 replacements")],
			kind: "edit",
			status: "warn",
			body: <AstEditEmptyBody parseHint={ctx.parseErrorCount > 0} />,
		};
	}

	const groups = parseAstEditDisplay(ctx.displayContent);
	const status: ToolStatus = ctx.limitReached ? "warn" : "success";
	return {
		label: "AST Edit",
		badges: resultBadges(ctx),
		kind: "edit",
		status,
		body: <AstEditDiffBody groups={groups} footerNotes={footerNotes(ctx)} fallbackFile={ctx.paths[0]} />,
	};
};

export { renderAstEdit };
