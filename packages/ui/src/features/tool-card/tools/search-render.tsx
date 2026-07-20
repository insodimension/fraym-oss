// `search` tool renderer — grouped match-list at TUI parity (mirrors engine .../tools/search.ts
// → searchToolRenderer). Parses the USER-FACING `details.displayContent` (never the model
// hashline text) into directory→file groups and drives the card head: `Search` + a pattern
// chip + `N matches · M files` + scope + `⚠ truncated`. Self-contained defensive parse (no
// coupling to the monolith), mirroring bash-render. Registered for search/grep/ripgrep/rg
// (file CONTENT matches); `find`/`glob` are file-name finders → renderFind. NO streaming —
// search is a single grep call. See docs/design/tools/search.md.

import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { readField, readStringField } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import type { ToolStatus } from "../tool-card";
import { EditErrorBody } from "./bodies/edit-diff-body";
import { parseSearchDisplay, type SearchFileGroup } from "./bodies/search-display";
import { SearchEmptyBody, SearchPendingBody, SearchPlainBody, SearchResultsBody } from "./bodies/search-results-body";
import { dimChip, truncatingChip } from "./chip";

// --- defensive parse (local; no coupling to the monolith) -------------------

function readNumberField(value: unknown, key: string): number | undefined {
	const v = readField(value, key);
	return typeof v === "number" ? v : undefined;
}

function readStringArray(value: unknown, key: string): string[] {
	const v = readField(value, key);
	return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
}

/** `paths` is a string or string[] in the schema. */
function toPathList(input: unknown): string[] {
	if (typeof input === "string") return [input];
	return Array.isArray(input) ? input.filter((s): s is string => typeof s === "string") : [];
}

/** First text part out of an `AgentToolResult`-shaped output. */
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

interface SearchContext {
	readonly pattern: string;
	readonly paths: string[];
	readonly caseInsensitive: boolean;
	readonly gitignoreOff: boolean;
	readonly skip: number | undefined;
	readonly running: boolean;
	readonly isError: boolean;
	readonly errorText: string;
	readonly hasDetailed: boolean;
	readonly matchCount: number;
	readonly fileCount: number;
	readonly scopePath: string | undefined;
	readonly truncated: boolean;
	readonly truncationReasons: string[];
	readonly artifact: string | undefined;
	readonly missingPaths: string[];
	readonly groups: SearchFileGroup[];
	readonly plainLines: string[];
}

function buildTruncationReasons(details: unknown): {
	reasons: string[];
	truncated: boolean;
	artifact: string | undefined;
} {
	const meta = readField(details, "meta");
	const truncation = readField(meta, "truncation");
	const limits = readField(meta, "limits");
	const columnTruncated = readField(limits, "columnTruncated");
	const fileLimitReached = readNumberField(details, "fileLimitReached");
	const perFileLimitReached = readNumberField(details, "perFileLimitReached");

	const reasons: string[] = [];
	if (fileLimitReached) reasons.push(`first ${fileLimitReached} files (skip to paginate)`);
	if (perFileLimitReached) reasons.push(`first ${perFileLimitReached} matches per file`);
	if (truncation) reasons.push(readStringField(truncation, "truncatedBy") === "lines" ? "line limit" : "size limit");
	const maxColumn = readNumberField(columnTruncated, "maxColumn");
	if (maxColumn) reasons.push(`line length ${maxColumn}`);

	const artifactId = readStringField(truncation, "artifactId");
	const truncated = readField(details, "truncated") === true || truncation != null || columnTruncated != null;
	return { reasons, truncated, artifact: artifactId ? `artifact://${artifactId}` : undefined };
}

function readSearchCounts(details: unknown) {
	const matchCount = readNumberField(details, "matchCount");
	const fileCount = readNumberField(details, "fileCount");
	return {
		hasDetailed: matchCount !== undefined || fileCount !== undefined,
		matchCount: matchCount ?? 0,
		fileCount: fileCount ?? 0,
	};
}

function readSearchText(
	call: ActiveToolCall,
	details: unknown,
): {
	displayContent: string | undefined;
	plainLines: string[];
} {
	const displayContent = readStringField(details, "displayContent");
	const plainText = displayContent ?? (typeof call.text === "string" ? call.text : readResultText(call.output));
	return {
		displayContent,
		plainLines: plainText ? plainText.split("\n").filter(line => line.trim() !== "") : [],
	};
}

function readSearchError(
	call: ActiveToolCall,
	details: unknown,
): {
	isError: boolean;
	errorText: string;
} {
	const errorText = readStringField(details, "error");
	const isError = call.status === "error" || readField(call.output, "isError") === true || errorText !== undefined;
	const rawError =
		errorText ??
		(typeof call.text === "string" ? call.text : undefined) ??
		readResultText(call.output) ??
		"Search failed";
	return { isError, errorText: rawError.replace(/^Error:\s*/, "") };
}

function readSearchContext(call: ActiveToolCall): SearchContext {
	const input = call.input;
	const skipRaw = readNumberField(input, "skip");
	const output = call.output;
	const details = readField(output, "details");
	const counts = readSearchCounts(details);
	const text = readSearchText(call, details);
	const error = readSearchError(call, details);
	const groups = text.displayContent ? parseSearchDisplay(text.displayContent) : [];
	const { reasons, truncated, artifact } = buildTruncationReasons(details);

	return {
		pattern: readStringField(input, "pattern") ?? "",
		paths: toPathList(readField(input, "paths")),
		caseInsensitive: readField(input, "i") === true,
		gitignoreOff: readField(input, "gitignore") === false,
		skip: skipRaw !== undefined && skipRaw > 0 ? skipRaw : undefined,
		running: call.status === "running",
		isError: error.isError,
		errorText: error.errorText,
		hasDetailed: counts.hasDetailed,
		matchCount: counts.matchCount,
		fileCount: counts.fileCount,
		scopePath: readStringField(details, "scopePath"),
		truncated,
		truncationReasons: reasons,
		artifact,
		missingPaths: readStringArray(details, "missingPaths"),
		groups,
		plainLines: text.plainLines,
	};
}

// --- head chips -------------------------------------------------------------

function patternBadge(pattern: string): ReactNode {
	return truncatingChip({ key: "pat", text: pattern || "?", maxCh: 26, variant: "soft", tone: "mute" });
}

function callMetaChips(ctx: SearchContext): ReactNode[] {
	const chips: ReactNode[] = [];
	if (ctx.paths.length > 0) chips.push(dimChip("in", `in ${ctx.paths.join(", ")}`, "max-w-[30ch] fr-overflow"));
	if (ctx.caseInsensitive) chips.push(dimChip("ci", "case:insensitive"));
	if (ctx.gitignoreOff) chips.push(dimChip("gi", "gitignore:false"));
	if (ctx.skip !== undefined) chips.push(dimChip("skip", `skip:${ctx.skip}`));
	return chips;
}

function resultBadges(ctx: SearchContext): ReactNode[] {
	const badges: ReactNode[] = [patternBadge(ctx.pattern)];
	badges.push(dimChip("m", `${ctx.matchCount} ${ctx.matchCount === 1 ? "match" : "matches"}`));
	badges.push(dimChip("f", `· ${ctx.fileCount} ${ctx.fileCount === 1 ? "file" : "files"}`));
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

function renderPendingSearch(ctx: SearchContext): ToolView {
	return {
		label: "Search",
		badges: [patternBadge(ctx.pattern), ...callMetaChips(ctx)],
		kind: "grep",
		status: "pending",
		stat: "searching…",
		body: <SearchPendingBody paths={ctx.paths} />,
	};
}

function renderSearchError(ctx: SearchContext): ToolView {
	return {
		label: "Search",
		badges: [patternBadge(ctx.pattern)],
		kind: "grep",
		status: "error",
		stat: "failed",
		body: <EditErrorBody message={ctx.errorText} />,
	};
}

function renderLegacySearch(ctx: SearchContext): ToolView {
	if (ctx.plainLines.length === 0) {
		return {
			label: "Search",
			badges: [patternBadge(ctx.pattern)],
			kind: "grep",
			status: "warn",
			body: <SearchEmptyBody />,
		};
	}

	return {
		label: "Search",
		badges: [patternBadge(ctx.pattern), dimChip("items", `${ctx.plainLines.length} items`)],
		kind: "grep",
		status: "success",
		body: <SearchPlainBody lines={ctx.plainLines} />,
	};
}

function renderSearchBody(ctx: SearchContext): ReactNode {
	if (ctx.groups.length > 0) {
		return (
			<SearchResultsBody
				groups={ctx.groups}
				truncationReasons={ctx.truncationReasons}
				artifact={ctx.artifact}
				missingPaths={ctx.missingPaths}
			/>
		);
	}

	// Counts present but no parseable display lines → fall back to plain text.
	return <SearchPlainBody lines={ctx.plainLines} />;
}

function renderDetailedSearch(ctx: SearchContext): ToolView {
	if (ctx.matchCount === 0) {
		return {
			label: "Search",
			badges: resultBadges(ctx),
			kind: "grep",
			status: "warn",
			body: <SearchEmptyBody missingPaths={ctx.missingPaths} />,
		};
	}

	const status: ToolStatus = ctx.truncated ? "warn" : "success";
	return { label: "Search", badges: resultBadges(ctx), kind: "grep", status, body: renderSearchBody(ctx) };
}

// --- renderer ---------------------------------------------------------------

const renderSearch: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const ctx = readSearchContext(call);

	if (ctx.running) return renderPendingSearch(ctx);
	if (ctx.isError) return renderSearchError(ctx);

	// Plain/legacy path: engine returned text without structured counts.
	if (!ctx.hasDetailed) return renderLegacySearch(ctx);
	return renderDetailedSearch(ctx);
};

export { renderSearch };
