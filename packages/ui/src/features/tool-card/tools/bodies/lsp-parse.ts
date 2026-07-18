// `lsp` tool — text-based result parser.
//
// LSP has NO structured `details.displayContent` — everything lives in
// `content[].text` (formatted by Engine's LspTool.execute()). This parser
// mirrors the TUI's regex-based type detection (render.ts → renderResult)
// and returns a discriminated union of the 6 visual families.
//
// Pure — no JSX, no framework deps. Unit-testable.
// See docs/design/tools/lsp.md §1.4 (type detection priority).

// ─── Diagnostic Types ────────────────────────────────────────────────────────

export interface ParsedDiagnostic {
	readonly file: string;
	readonly line: number;
	readonly col: number;
	readonly severity: "error" | "warning" | "info" | "hint";
	readonly message: string;
}

export interface DiagnosticFileGroup {
	readonly path: string;
	readonly diagnostics: ParsedDiagnostic[];
}

// ─── Location Types ──────────────────────────────────────────────────────────

export interface ParsedLocation {
	readonly line: number;
	readonly col: number;
}

export interface LocationFileGroup {
	readonly path: string;
	readonly locations: ParsedLocation[];
}

// ─── Symbol Types ────────────────────────────────────────────────────────────

export interface ParsedSymbol {
	readonly icon: string;
	readonly name: string;
	readonly line: number;
	readonly indent: number;
}

// ─── Discriminated Union ─────────────────────────────────────────────────────

export type LspParseResult =
	| {
			readonly kind: "hover";
			readonly language: string;
			readonly code: string;
			readonly beforeDoc: string;
			readonly afterDoc: string;
	  }
	| {
			readonly kind: "diagnostics";
			readonly errorCount: number;
			readonly warningCount: number;
			readonly groups: DiagnosticFileGroup[];
			readonly raw: string;
	  }
	| { readonly kind: "diagnosticsOK" }
	| {
			readonly kind: "locations";
			readonly subKind: string;
			readonly count: number;
			readonly groups: LocationFileGroup[];
			readonly raw: string;
	  }
	| { readonly kind: "locationsEmpty"; readonly subKind: string }
	| { readonly kind: "symbols"; readonly fileName: string; readonly symbols: ParsedSymbol[]; readonly raw: string }
	| { readonly kind: "symbolsWorkspace"; readonly query: string; readonly count: number; readonly raw: string }
	| { readonly kind: "text"; readonly raw: string; readonly subKind?: string | undefined }
	| { readonly kind: "json"; readonly parsed: unknown; readonly raw: string }
	| { readonly kind: "error"; readonly message: string }
	| { readonly kind: "unknown"; readonly raw: string };

// ─── Regex Constants ─────────────────────────────────────────────────────────

const HOVER_RE = /^([\s\S]*?)```(\w*)\n([\s\S]*?)```([\s\S]*)$/;
const ERRORS_RE = /(\d+)\s+error\(s\)/;
const WARNINGS_RE = /(\d+)\s+warning\(s\)/;
const LOCATIONS_RE = /(\d+)\s+(reference|definition|type definition|implementation)\(s\)/i;
const LOCATIONS_EMPTY_RE = /No\s+(definition|references?|type definition|implementation)\s+found/i;
const SYMBOLS_FILE_RE = /^Symbols in (.+):/m;
const SYMBOLS_WORKSPACE_RE = /Found (\d+) symbol\(s\) matching "([^"]+)"/;
const DIAGNOSTIC_LINE_RE = /^(.*):(\d+):(\d+)\s+\[(\w+)\]\s*(.*)$/;
const SYMBOL_LINE_RE = /^((?: {2})*)(\S+)\s+(.+?)\s*@\s*line\s*(\d+)$/;

// ─── Parser ──────────────────────────────────────────────────────────────────

function parseErrorResult(cleaned: string): LspParseResult | undefined {
	if (cleaned.startsWith("Error:") || /^LSP error:/i.test(cleaned)) {
		const message = cleaned.replace(/^(Error:\s*|LSP error:\s*)/i, "");
		return { kind: "error", message };
	}
	return undefined;
}

function parseHoverResult(cleaned: string): LspParseResult | undefined {
	const hoverMatch = HOVER_RE.exec(cleaned);
	if (!hoverMatch) return undefined;
	const language = hoverMatch[2] ?? "";
	const code = (hoverMatch[3] ?? "").trim();
	const beforeDoc = (hoverMatch[1] ?? "").trim();
	const afterDoc = (hoverMatch[4] ?? "").trim();
	return { kind: "hover", language, code, beforeDoc, afterDoc };
}

function parseDiagnosticLine(line: string): ParsedDiagnostic | undefined {
	const diagMatch = DIAGNOSTIC_LINE_RE.exec(line.trim());
	if (!diagMatch) return undefined;
	return {
		file: diagMatch[1] ?? "",
		line: Number.parseInt(diagMatch[2] ?? "0", 10),
		col: Number.parseInt(diagMatch[3] ?? "0", 10),
		severity: (diagMatch[4] ?? "error").toLowerCase() as ParsedDiagnostic["severity"],
		message: (diagMatch[5] ?? "").trim(),
	};
}

function parseDiagnosticsResult(cleaned: string, action: string | undefined): LspParseResult | undefined {
	const errorMatch = ERRORS_RE.exec(cleaned);
	const warningMatch = WARNINGS_RE.exec(cleaned);
	if (!errorMatch && !warningMatch && !(action === "diagnostics" && cleaned === "OK")) return undefined;
	if (action === "diagnostics" && cleaned === "OK") {
		return { kind: "diagnosticsOK" };
	}
	const errorCount = errorMatch ? Number.parseInt(errorMatch[1]!, 10) : 0;
	const warningCount = warningMatch ? Number.parseInt(warningMatch[1]!, 10) : 0;
	const diags = cleaned
		.split("\n")
		.filter(Boolean)
		.map(parseDiagnosticLine)
		.filter((diag): diag is ParsedDiagnostic => Boolean(diag));
	const groups = groupDiagnosticsByFile(diags);
	return { kind: "diagnostics", errorCount, warningCount, groups, raw: cleaned };
}

function parseLocationsResult(cleaned: string): LspParseResult | undefined {
	const locationsMatch = LOCATIONS_RE.exec(cleaned);
	if (!locationsMatch) return undefined;
	const count = Number.parseInt(locationsMatch[1]!, 10);
	const subKind = locationsMatch[2] ?? "";
	const groups = parseLocationGroups(cleaned);
	return { kind: "locations", subKind, count, groups, raw: cleaned };
}

function parseLocationsEmptyResult(cleaned: string): LspParseResult | undefined {
	const emptyMatch = LOCATIONS_EMPTY_RE.exec(cleaned);
	if (!emptyMatch) return undefined;
	const subKind = emptyMatch[1] ?? "locations";
	return { kind: "locationsEmpty", subKind };
}

function parseSymbolsResult(cleaned: string): LspParseResult | undefined {
	const symbolsFileMatch = SYMBOLS_FILE_RE.exec(cleaned);
	if (symbolsFileMatch) {
		const fileName = symbolsFileMatch[1] ?? "";
		const symbols = parseSymbols(cleaned);
		return { kind: "symbols", fileName, symbols, raw: cleaned };
	}
	const symbolsWorkspaceMatch = SYMBOLS_WORKSPACE_RE.exec(cleaned);
	if (symbolsWorkspaceMatch) {
		const query = symbolsWorkspaceMatch[2] ?? "";
		const count = Number.parseInt(symbolsWorkspaceMatch[1]!, 10);
		return { kind: "symbolsWorkspace", query, count, raw: cleaned };
	}
	return undefined;
}

function parseJsonResult(cleaned: string, action: string | undefined): LspParseResult | undefined {
	if (action !== "capabilities" && action !== "request") return undefined;
	const stripped = cleaned.replace(/^.+:\s*\n/g, "").replace(/^\s+/m, "");
	try {
		const parsed = JSON.parse(stripped);
		return { kind: "json", parsed, raw: cleaned };
	} catch {
		return undefined;
	}
}

export function parseLspResult(text: string, action?: string): LspParseResult {
	const cleaned = text.trim();
	return (
		parseErrorResult(cleaned) ??
		parseHoverResult(cleaned) ??
		parseDiagnosticsResult(cleaned, action) ??
		parseLocationsResult(cleaned) ??
		parseLocationsEmptyResult(cleaned) ??
		parseSymbolsResult(cleaned) ??
		parseJsonResult(cleaned, action) ?? { kind: "text", raw: cleaned, subKind: action }
	);
}

// ─── Grouping Helpers ────────────────────────────────────────────────────────

function groupDiagnosticsByFile(diagnostics: ParsedDiagnostic[]): DiagnosticFileGroup[] {
	const map = new Map<string, ParsedDiagnostic[]>();
	for (const d of diagnostics) {
		const list = map.get(d.file);
		if (list) {
			list.push(d);
		} else {
			map.set(d.file, [d]);
		}
	}
	const groups: DiagnosticFileGroup[] = [];
	for (const [path, diags] of map) {
		groups.push({ path, diagnostics: diags });
	}
	return groups;
}

function parseLocationGroups(text: string): LocationFileGroup[] {
	const map = new Map<string, ParsedLocation[]>();
	for (const line of text.split("\n")) {
		const match = line.trim().match(/^(.+):(\d+):(\d+)$/);
		if (match) {
			const filePath = match[1] ?? "";
			const loc: ParsedLocation = {
				line: Number.parseInt(match[2] ?? "0", 10),
				col: Number.parseInt(match[3] ?? "0", 10),
			};
			const existing = map.get(filePath);
			if (existing) {
				existing.push(loc);
			} else {
				map.set(filePath, [loc]);
			}
		}
	}
	const groups: LocationFileGroup[] = [];
	for (const [path, locations] of map) {
		groups.push({ path, locations });
	}
	return groups;
}

function parseSymbols(text: string): ParsedSymbol[] {
	const symbols: ParsedSymbol[] = [];
	for (const line of text.split("\n")) {
		const symMatch = SYMBOL_LINE_RE.exec(line);
		if (symMatch) {
			const indent = (symMatch[1] ?? "").length / 2;
			symbols.push({
				icon: symMatch[2] ?? "",
				name: symMatch[3] ?? "",
				line: Number.parseInt(symMatch[4] ?? "0", 10),
				indent,
			});
		}
	}
	return symbols;
}
