// `find` tool renderer — file-listing at TUI parity (mirrors engine .../tools/find.ts →
// findToolRenderer). Reads `details.files` (the relative path list; a trailing `/` marks a
// directory) + counts, and drives the card head: `Find` + a glob chip + `N files` + scope +
// `⚠ truncated`. Self-contained defensive parse (no coupling to the monolith), mirroring
// search-render/bash-render. Find STREAMS a growing file list — the running state renders the
// partial list following the tail. Registered for `find` (search/grep/glob/ripgrep/rg keep
// renderSearch — those are content searches). See docs/design/tools/find.md.

import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readStringField } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import type { ToolStatus } from "../tool-card";
import { EditErrorBody } from "./bodies/edit-diff-body";
import { FindEmptyBody, FindListBody } from "./bodies/find-list-body";
import { dimChip, truncatingChip } from "./chip";
import { readFirstTextResult, readNumberField, readStringArrayField, toPathList } from "./renderer-utils";

// --- defensive parse (local; no coupling to the monolith) -------------------

function pushResultLimitReason(reasons: string[], value: unknown): void {
	const reached = typeof value === "number" ? value : readNumberField(value, "reached");
	if (reached) reasons.push(`limit ${reached} results`);
}

function readTruncationReason(truncation: unknown): string | undefined {
	if (!truncation) return undefined;
	return readStringField(truncation, "truncatedBy") === "lines" ? "line limit" : "size limit";
}

/** Mirrors the TUI truncation-reason assembly (find.ts renderResult). */
function buildTruncationReasons(details: unknown): {
	reasons: string[];
	truncated: boolean;
	artifact: string | undefined;
} {
	const meta = readField(details, "meta");
	const truncation = readField(details, "truncation") ?? readField(meta, "truncation");
	const limits = readField(meta, "limits");
	const resultLimit = readField(limits, "resultLimit");
	const resultLimitReached = readNumberField(details, "resultLimitReached");

	const reasons: string[] = [];
	pushResultLimitReason(reasons, resultLimitReached);
	pushResultLimitReason(reasons, resultLimit);
	const truncationReason = readTruncationReason(truncation);
	if (truncationReason) reasons.push(truncationReason);

	const artifactId = readStringField(truncation, "artifactId");
	const truncated =
		readField(details, "truncated") === true ||
		truncation != null ||
		resultLimitReached != null ||
		resultLimit != null;
	return { reasons, truncated, artifact: artifactId ? `artifact://${artifactId}` : undefined };
}

interface FindContext {
	readonly paths: string[];
	readonly limit: number | undefined;
	readonly running: boolean;
	readonly isError: boolean;
	readonly errorText: string;
	readonly fileCount: number;
	readonly files: string[];
	readonly scopePath: string | undefined;
	readonly truncated: boolean;
	readonly truncationReasons: string[];
	readonly artifact: string | undefined;
	readonly missingPaths: string[];
}

function readFindFiles(call: ActiveToolCall, details: unknown): { fileCount: number; files: string[] } {
	const detailFiles = readStringArrayField(details, "files");
	const fileCountRaw = readNumberField(details, "fileCount");
	const hasDetailed = fileCountRaw !== undefined || detailFiles.length > 0;
	const plainText = typeof call.text === "string" ? call.text : readFirstTextResult(call.output);
	const plainLines = !hasDetailed && plainText ? plainText.split("\n").filter(line => line.trim() !== "") : [];
	const files = hasDetailed ? detailFiles : plainLines;
	return { fileCount: fileCountRaw ?? files.length, files };
}

function readFindError(call: ActiveToolCall, details: unknown): { isError: boolean; errorText: string } {
	const errorText = readStringField(details, "error");
	const isError = call.status === "error" || readField(call.output, "isError") === true || errorText !== undefined;
	const rawError =
		errorText ??
		(typeof call.text === "string" ? call.text : undefined) ??
		readFirstTextResult(call.output) ??
		"Find failed";
	return { isError, errorText: rawError.replace(/^Error:\s*/, "") };
}

function readFindContext(call: ActiveToolCall): FindContext {
	const input = call.input;
	const output = call.output;
	const details = readField(output, "details");
	const { fileCount, files } = readFindFiles(call, details);
	const { isError, errorText } = readFindError(call, details);
	const { reasons, truncated, artifact } = buildTruncationReasons(details);

	return {
		paths: toPathList(readField(input, "paths")),
		limit: readNumberField(input, "limit"),
		running: call.status === "running",
		isError,
		errorText,
		fileCount,
		files,
		scopePath: readStringField(details, "scopePath"),
		truncated,
		truncationReasons: reasons,
		artifact,
		missingPaths: readStringArrayField(details, "missingPaths"),
	};
}

// --- head chips -------------------------------------------------------------

function globBadge(paths: string[]): ReactNode {
	return truncatingChip({ key: "glob", text: paths.join(", ") || "*", maxCh: 26, variant: "soft", tone: "mute" });
}

function callMetaChips(ctx: FindContext): ReactNode[] {
	const chips: ReactNode[] = [];
	if (ctx.limit !== undefined) chips.push(dimChip("limit", `limit:${ctx.limit}`));
	return chips;
}

function resultBadges(ctx: FindContext): ReactNode[] {
	const badges: ReactNode[] = [globBadge(ctx.paths)];
	badges.push(dimChip("f", `${ctx.fileCount} ${ctx.fileCount === 1 ? "file" : "files"}`));
	if (ctx.scopePath) badges.push(dimChip("scope", `in ${ctx.scopePath}`, "max-w-[24ch] fr-overflow"));
	if (ctx.truncated) {
		badges.push(
			<Badge key="tr" variant="code" tone="warn">
				⚠ truncated
			</Badge>,
		);
	}
	return badges;
}

function renderPendingFind(ctx: FindContext): ToolView {
	// Glob streams a growing file list (~200ms cadence) — render it live (tail-following)
	// rather than hiding output until the search finishes. Empty until the first match lands.
	const empty = ctx.files.length === 0;
	return {
		label: "Find",
		badges: empty ? [globBadge(ctx.paths), ...callMetaChips(ctx)] : resultBadges(ctx),
		kind: "grep",
		status: "pending",
		stat: "finding…",
		body: empty ? null : (
			<FindListBody
				files={ctx.files}
				truncationReasons={ctx.truncationReasons}
				artifact={ctx.artifact}
				missingPaths={ctx.missingPaths}
				followTail
			/>
		),
	};
}

function renderFindError(ctx: FindContext): ToolView {
	return {
		label: "Find",
		badges: [globBadge(ctx.paths)],
		kind: "grep",
		status: "error",
		stat: "failed",
		body: <EditErrorBody message={ctx.errorText} />,
	};
}

function renderEmptyFind(ctx: FindContext): ToolView {
	return {
		label: "Find",
		badges: resultBadges(ctx),
		kind: "grep",
		status: "warn",
		body: <FindEmptyBody missingPaths={ctx.missingPaths} />,
	};
}

function renderSuccessfulFind(ctx: FindContext): ToolView {
	const status: ToolStatus = ctx.truncated ? "warn" : "success";
	return {
		label: "Find",
		badges: resultBadges(ctx),
		kind: "grep",
		status,
		body: (
			<FindListBody
				files={ctx.files}
				truncationReasons={ctx.truncationReasons}
				artifact={ctx.artifact}
				missingPaths={ctx.missingPaths}
			/>
		),
	};
}

// --- renderer ---------------------------------------------------------------

const renderFind: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const ctx = readFindContext(call);

	if (ctx.running) return renderPendingFind(ctx);
	if (ctx.isError) return renderFindError(ctx);
	if (ctx.fileCount === 0 || ctx.files.length === 0) return renderEmptyFind(ctx);
	return renderSuccessfulFind(ctx);
};

export { renderFind };
