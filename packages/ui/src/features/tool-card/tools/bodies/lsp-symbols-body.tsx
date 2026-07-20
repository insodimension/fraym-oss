// LspSymbolsBody — hierarchical symbol tree for `lsp` document/workspace symbols.
//
// Mirrors the TUI renderer (engine .../lsp/render.ts → renderSymbols): a tree with
// symbol icons + names + line numbers, indented by nesting level. Workspace symbols
// render as a flat list.
//
// Self-contained (no coupling to Engine). See docs/design/tools/lsp.md §2.2 family 4.
//

import type { ReactNode } from "react";
import { Icon, type IconName } from "../../../../icons";
import { ToolBodySection } from "../../tool-body-card";
import type { ParsedSymbol } from "./lsp-parse";

export interface LspSymbolsBodyProps {
	readonly fileName: string;
	readonly symbols: ParsedSymbol[];
	readonly maxHeight?: number;
}

export interface LspSymbolsWorkspaceBodyProps {
	readonly query: string;
	readonly count: number;
	readonly raw: string;
	readonly maxHeight?: number;
}

export function LspSymbolsBody({ fileName, symbols, maxHeight = 240 }: LspSymbolsBodyProps): ReactNode {
	return (
		<ToolBodySection
			icon="list"
			title={`Symbols in ${fileName}`}
			stat={`${symbols.length} symbol${symbols.length !== 1 ? "s" : ""}`}
			maxHeight={maxHeight}
			padContent
		>
			<div className="grid gap-0.5">
				{symbols.map((sym, i) => (
					<SymbolRow key={i} symbol={sym} />
				))}
			</div>
		</ToolBodySection>
	);
}

export function LspSymbolsWorkspaceBody({
	query,
	count,
	raw,
	maxHeight = 240,
}: LspSymbolsWorkspaceBodyProps): ReactNode {
	const lines = raw.split("\n").filter(Boolean);
	const symbolLines = lines.filter(l => /^\s+\S+\s+.+@\s*line\s+\d+/.test(l)).map(l => l.trim());

	return (
		<ToolBodySection
			icon="list"
			title={`Symbols matching "${query}"`}
			stat={`${count} symbol${count !== 1 ? "s" : ""}`}
			maxHeight={maxHeight}
			padContent
		>
			<div className="grid gap-0.5">
				{symbolLines.map((line, i) => (
					<p key={i} className="font-secondary text-fr-xs text-fr-text">
						{line}
					</p>
				))}
			</div>
		</ToolBodySection>
	);
}

function SymbolRow({ symbol }: { symbol: ParsedSymbol }): ReactNode {
	const iconName = symbolKindToIcon(symbol.icon);
	const indentStyle = symbol.indent > 0 ? { paddingLeft: `${symbol.indent * 16}px` } : undefined;

	return (
		<div className="flex items-center gap-1.5 font-secondary text-fr-xs leading-relaxed" style={indentStyle}>
			<Icon name={iconName} className="shrink-0 text-fr-accent" size={12} />
			<span className="text-fr-text">{symbol.name}</span>
			<span className="text-fr-text-3 opacity-60">line {symbol.line}</span>
		</div>
	);
}

function symbolKindToIcon(icon: string): IconName {
	switch (icon) {
		case "◎":
		case "ƒ":
			return "code";
		case "🔒":
		case "◆":
			return "eye";
		case "📦":
		case "■":
			return "folder";
		case "🔧":
		case "⚙":
			return "terminal";
		case "🔤":
		case "🅃":
			return "type";
		case "📋":
		case "▦":
			return "list";
		case "🔗":
			return "link";
		case "🔐":
			return "shield";
		default:
			return "file";
	}
}
