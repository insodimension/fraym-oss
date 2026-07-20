// `web_search` tool renderer — web search results at TUI parity (mirrors
// engine .../web/search/render.ts → webSearchToolRenderer). The TUI renderer
// shows a head with provider + source count, a query row, an answer section,
// a sources list with snippets, and a metadata block.
//
// Self-contained defensive parse (no coupling to the monolith), mirroring
// the debug-render/lsp-render pattern.

import type { ReactNode } from "react";
import type { ActiveToolCall } from "../../../hooks/session-types";
import {
	readField,
	readResultContentText,
	readStringField,
	toTermLines,
} from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm, type ToolStatus } from "../tool-card";
import { EditErrorBody } from "./bodies/edit-diff-body";
import { truncatingChip } from "./chip";

// ─── Types (local; mirrors engine's SearchResponse) ──────────────────────────

interface SearchSource {
	title: string;
	url: string;
	snippet?: string;
	publishedDate?: string;
	ageSeconds?: number;
	author?: string;
}
interface SearchUsage {
	inputTokens?: number;
	outputTokens?: number;
	searchRequests?: number;
	totalTokens?: number;
}

interface SearchResponse {
	provider: string;
	answer?: string;
	sources: SearchSource[];
	citationCount: number;
	searchQueries?: string[];
	usage?: SearchUsage;
	model?: string;
	requestId?: string;
	authMode?: string;
}

// ─── Defensive Parse ──────────────────────────────────────────────────────
/** Read a number field from an opaque details object. Mirrors the same
 *  local helper in ast-edit-render, ast-grep-render, bash-render, find-render,
 *  and search-render (6 renderers use it). */
function readNumberField(value: unknown, key: string): number | undefined {
	const obj = value as Record<string, unknown> | undefined;
	return typeof obj?.[key] === "number" ? (obj[key] as number) : undefined;
}

function readSearchResponse(details: unknown): SearchResponse | undefined {
	if (!details || typeof details !== "object") return undefined;
	const d = details as Record<string, unknown>;
	const resp = readField(d, "response");
	if (!resp || typeof resp !== "object") return undefined;
	const r = resp as Record<string, unknown>;

	const rawSources = readField(r, "sources");
	const sources: SearchSource[] = Array.isArray(rawSources)
		? rawSources.map(src => {
				const s = src as Record<string, unknown>;
				return {
					title: readStringField(s, "title") ?? "",
					url: readStringField(s, "url") ?? "",
					snippet: readStringField(s, "snippet"),
					publishedDate: readStringField(s, "publishedDate"),
					ageSeconds: readNumberField(s, "ageSeconds"),
					author: readStringField(s, "author"),
				};
			})
		: [];

	const rawCitations = readField(r, "citations");
	// Only the citation count is rendered — don't materialize objects.
	const citationCount = Array.isArray(rawCitations) ? rawCitations.length : 0;

	const rawUsage = readField(r, "usage");
	const usage =
		rawUsage && typeof rawUsage === "object"
			? {
					inputTokens: readNumberField(rawUsage, "inputTokens"),
					outputTokens: readNumberField(rawUsage, "outputTokens"),
					searchRequests: readNumberField(rawUsage, "searchRequests"),
					totalTokens: readNumberField(rawUsage, "totalTokens"),
				}
			: undefined;

	return {
		provider: readStringField(r, "provider") ?? "",
		answer: readStringField(r, "answer"),
		sources,
		citationCount,
		searchQueries: Array.isArray(r.searchQueries) ? (r.searchQueries as string[]) : undefined,
		usage,
		model: readStringField(r, "model"),
		requestId: readStringField(r, "requestId"),
		authMode: readStringField(r, "authMode"),
	};
}

// ─── Head / Badges / Stat ──────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
	brave: "Brave",
	perplexity: "Perplexity",
	gemini: "Gemini",
	google: "Google",
	kagi: "Kagi",
	tavily: "Tavily",
	searxng: "SearXNG",
	exa: "Exa",
	zai: "Zai",
	synthetic: "Synthetic",
	kimi: "Kimi",
	jina: "Jina",
	none: "None",
};

function providerBadge(provider: string | undefined): ReactNode {
	const label = PROVIDER_LABELS[provider ?? ""] ?? provider ?? "Unknown";
	return truncatingChip({ key: "provider", text: label, maxCh: 20, variant: "code", tone: "accent" });
}

function formatCount(count: number): string {
	return `${count} ${count === 1 ? "source" : "sources"}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatAge(ageSeconds?: number, publishedDate?: string): string {
	if (ageSeconds !== undefined) {
		const seconds = ageSeconds;
		if (seconds < 60) return "just now";
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
		if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
		return `${Math.floor(seconds / 31536000)}y ago`;
	}
	return publishedDate ?? "";
}

function truncateToWidth(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	return `${text.slice(0, maxLen - 1)}…`;
}

function getDomain(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

// ─── Body ──────────────────────────────────────────────────────────────────

function sourceLines(sources: SearchSource[]): string[] {
	const lines: string[] = [];
	for (const src of sources) {
		const title = src.title || src.url || "Untitled";
		const domain = src.url ? getDomain(src.url) : "";
		const age = formatAge(src.ageSeconds, src.publishedDate);
		// Mirror the TUI: `{title} ({domain}) · {author} · {age}` — domain in parens,
		// space then ` · ` joined (engine .../web/search/render.ts renderItem).
		const metaParts: string[] = [];
		if (domain) metaParts.push(`(${domain})`);
		if (src.author?.trim()) metaParts.push(src.author.trim());
		if (age) metaParts.push(age);
		const metaSuffix = metaParts.length > 0 ? ` ${metaParts.join(" · ")}` : "";
		lines.push(`${title}${metaSuffix}`);
		if (src.snippet?.trim()) {
			lines.push(`– ${src.snippet}`);
		}
		if (src.url) {
			lines.push(src.url);
		}
	}
	return lines;
}

function metadataLines(response: SearchResponse): string[] {
	const lines: string[] = [];
	const providerLabel = PROVIDER_LABELS[response.provider] ?? response.provider;
	lines.push(`Provider: ${providerLabel}`);
	if (response.authMode) lines.push(`Auth: ${response.authMode}`);
	if (response.model) lines.push(`Model: ${response.model}`);
	if (response.citationCount > 0) lines.push(`Citations: ${response.citationCount}`);
	if (response.usage) {
		const usageParts: string[] = [];
		if (response.usage.inputTokens !== undefined) usageParts.push(`in ${response.usage.inputTokens}`);
		if (response.usage.outputTokens !== undefined) usageParts.push(`out ${response.usage.outputTokens}`);
		if (response.usage.totalTokens !== undefined) usageParts.push(`total ${response.usage.totalTokens}`);
		if (response.usage.searchRequests !== undefined) usageParts.push(`search ${response.usage.searchRequests}`);
		if (usageParts.length > 0) lines.push(`Usage: ${usageParts.join(" · ")}`);
	}
	if (response.requestId) lines.push(`Request: ${response.requestId}`);
	if (response.searchQueries?.length) {
		const queries = response.searchQueries.slice(0, 2).map(q => truncateToWidth(q, 80));
		const suffix = response.searchQueries.length > 2 ? "…" : "";
		lines.push(`Queries: ${queries.join("; ")}${suffix}`);
	}
	return lines;
}

function querySection(query: string | undefined): ReactNode | undefined {
	if (!query) return undefined;
	return (
		<ToolBodySection key="query" title="Query" maxHeight={80} padContent>
			<ToolBodyTerm lines={toTermLines(query)} />
		</ToolBodySection>
	);
}

function answerSection(answer: string | undefined): ReactNode | undefined {
	if (!answer) return undefined;
	return (
		<ToolBodySection key="answer" title="Answer" maxHeight={240} padContent>
			<ToolBodyTerm lines={toTermLines(answer)} />
		</ToolBodySection>
	);
}

function sourcesSection(response: SearchResponse): ReactNode {
	if (response.sources.length === 0) {
		return (
			<ToolBodySection key="sources" title="Sources" maxHeight={240} padContent>
				<ToolBodyTerm lines={toTermLines("No sources returned")} />
			</ToolBodySection>
		);
	}
	return (
		<ToolBodySection
			key="sources"
			title="Sources"
			stat={formatCount(response.sources.length)}
			maxHeight={240}
			padContent
		>
			<ToolBodyTerm lines={toTermLines(sourceLines(response.sources).join("\n"))} />
		</ToolBodySection>
	);
}

function metadataSection(response: SearchResponse): ReactNode | undefined {
	if (response.sources.length === 0 && !response.answer) return undefined;
	return (
		<ToolBodySection key="metadata" title="Metadata" maxHeight={240} padContent>
			<ToolBodyTerm lines={toTermLines(metadataLines(response).join("\n"))} />
		</ToolBodySection>
	);
}

function structuredSearchBody(response: SearchResponse, query: string | undefined): ReactNode {
	const sections = [
		querySection(query),
		answerSection(response.answer),
		sourcesSection(response),
		metadataSection(response),
	].filter(Boolean);
	return <>{sections}</>;
}

function outputSection(outputText: string): ReactNode {
	return (
		<ToolBodySection title="Output" maxHeight={240} padContent>
			<ToolBodyTerm lines={toTermLines(outputText)} />
		</ToolBodySection>
	);
}

function buildBody(
	response: SearchResponse | undefined,
	outputText: string,
	query: string | undefined,
	status: ToolStatus,
): ReactNode {
	if (status === "pending") return query ? <ToolBodyTerm lines={toTermLines(query)} /> : null;
	if (status === "error") return <EditErrorBody message={outputText || "Search failed"} />;
	if (response) return structuredSearchBody(response, query);
	return outputText ? outputSection(outputText) : null;
}

// ─── Renderer ──────────────────────────────────────────────────────────────

const renderWebSearch: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const outputText = readResultContentText(call.output) ?? "";
	const details = readField(call.output, "details");
	const response = readSearchResponse(details);
	const query = readStringField(call.input, "query");
	const running = call.status === "running";
	const isError = call.status === "error" || readField(call.output, "isError") === true;
	const status: ToolStatus = running ? "pending" : isError ? "error" : "success";
	const stat = running
		? "searching…"
		: isError
			? "failed"
			: response
				? formatCount(response.sources.length)
				: undefined;

	const badges: ReactNode[] = [];
	if (response?.provider) {
		badges.push(providerBadge(response.provider));
	}

	return {
		label: "Web Search",
		badges,
		kind: "web_search",
		status,
		stat,
		body: buildBody(response, outputText, query, status),
	};
};

export { renderWebSearch };
