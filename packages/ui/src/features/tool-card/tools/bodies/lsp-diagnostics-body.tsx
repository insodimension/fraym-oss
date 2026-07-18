// LspDiagnosticsBody — severity-colored diagnostic tree for `lsp` diagnostics results.
//
// Mirrors the TUI renderer (engine .../lsp/render.ts → renderDiagnostics): a severity
// summary header + per-diagnostic rows with severity colors, directory grouping
// for multi-file results, and a fast-path `✓ OK` state.
//
// Self-contained (no coupling to Engine). See docs/design/tools/lsp.md §2.2 family 2.
//

import type { ReactNode } from "react";
import { ToolBodySection } from "../../tool-body-card";
import type { DiagnosticFileGroup, ParsedDiagnostic } from "./lsp-parse";

export interface LspDiagnosticsBodyProps {
	readonly errorCount: number;
	readonly warningCount: number;
	readonly groups: DiagnosticFileGroup[];
	readonly maxHeight?: number | undefined;
}

export function LspDiagnosticsOkBody(): ReactNode {
	return <p className="font-primary text-fr-sm text-fr-add">✓ OK</p>;
}

export function LspDiagnosticsBody({
	errorCount,
	warningCount,
	groups,
	maxHeight = 240,
}: LspDiagnosticsBodyProps): ReactNode {
	const statParts: string[] = [];
	if (errorCount > 0) statParts.push(`${errorCount} error(s)`);
	if (warningCount > 0) statParts.push(`${warningCount} warning(s)`);
	const stat = statParts.length > 0 ? statParts.join(" · ") : "OK";

	return (
		<ToolBodySection icon="code" title="Diagnostics" stat={stat} maxHeight={maxHeight} padContent>
			<div className="grid gap-0.5">
				{groups.map((group, gi) => (
					<DiagnosticsFileBlock key={gi} group={group} />
				))}
			</div>
		</ToolBodySection>
	);
}

function DiagnosticsFileBlock({ group }: { group: DiagnosticFileGroup }): ReactNode {
	return (
		<div className="mb-1 last:mb-0">
			<p className="font-secondary text-fr-2xs text-fr-text-3 mb-0.5 fr-overflow">📄 {group.path}</p>
			<div className="ml-2 grid gap-0.5">
				{group.diagnostics.map((d, i) => (
					<DiagnosticsRow key={i} diagnostic={d} />
				))}
			</div>
		</div>
	);
}

function DiagnosticsRow({ diagnostic }: { diagnostic: ParsedDiagnostic }): ReactNode {
	const severityColor = severityToColor(diagnostic.severity);
	return (
		<div className="font-secondary text-fr-xs leading-relaxed">
			<span className={severityColor}>
				{diagnostic.file}:{diagnostic.line}:{diagnostic.col}
			</span>{" "}
			<span className={`${severityColor} opacity-70`}>[{diagnostic.severity}]</span>{" "}
			<span className="text-fr-text">{diagnostic.message}</span>
		</div>
	);
}

function severityToColor(severity: string): string {
	switch (severity) {
		case "error":
			return "text-fr-del";
		case "warning":
			return "text-fr-warn";
		case "info":
			return "text-fr-accent";
		case "hint":
			return "text-fr-text-3";
		default:
			return "text-fr-text";
	}
}
