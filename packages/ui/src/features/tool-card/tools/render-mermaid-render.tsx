// `render_mermaid` tool renderer. Engine's RenderMermaidTool returns the diagram as
// ASCII art in the result's text part (+ a trailing `Saved artifact://…` line);
// the generic renderer buried that in a JSON inspector. Shows it in the `.term`
// surface instead. See docs/design/tools/render_mermaid.md.

import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import {
	asText,
	readResultContentText,
	readStringField,
	toTermLines,
} from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodyTerm, type ToolStatus } from "../tool-card";

// Per-card body height cap (px) — mirrors the bash/edit/write caps so a tall
// diagram scrolls within the card instead of pushing the whole thread down.
const MERMAID_BODY_MAX_HEIGHT = 280;

// Mermaid diagram headers (the first significant token of the source). Used only
// for the head chip — purely informational, never affects body rendering.
const DIAGRAM_KEYWORDS = [
	"flowchart",
	"graph",
	"sequenceDiagram",
	"classDiagram",
	"stateDiagram-v2",
	"stateDiagram",
	"erDiagram",
	"gantt",
	"pie",
	"journey",
	"mindmap",
	"timeline",
	"gitGraph",
	"quadrantChart",
	"requirementDiagram",
	"C4Context",
] as const;

/** Drop the trailing `Saved artifact: artifact://<id>` notice the tool appends for the LLM. */
function stripArtifactNotice(text: string): string {
	return text.replace(/\n*Saved artifact: artifact:\/\/\S+\s*$/, "").replace(/\s+$/, "");
}

function readMermaidArt(call: ActiveToolCall): string {
	const raw = readResultContentText(call.output) ?? call.text ?? asText(call.output) ?? "";
	return stripArtifactNotice(raw);
}

function diagramType(source: string | undefined): string | undefined {
	if (!source) return undefined;
	for (const raw of source.split("\n")) {
		const line = raw.trim();
		if (!line || line.startsWith("%%")) continue;
		const keyword = DIAGRAM_KEYWORDS.find(k => line === k || line.startsWith(`${k} `) || line.startsWith(`${k}\t`));
		return keyword ?? line.split(/\s+/)[0];
	}
	return undefined;
}

function typeBadge(source: string | undefined): ReactNode | undefined {
	const type = diagramType(source);
	if (!type) return undefined;
	return (
		<Badge key="mermaid-type" tone="mute" variant="code">
			{type}
		</Badge>
	);
}

function mermaidBody(art: string, placeholder: string): ReactNode {
	if (!art) return <div className="px-1 py-2 text-fr-xs text-fr-text-3">{placeholder}</div>;
	return (
		<div className="overflow-auto" style={{ maxHeight: MERMAID_BODY_MAX_HEIGHT }}>
			<ToolBodyTerm lines={toTermLines(art)} />
		</div>
	);
}

function mermaidStatus(call: ActiveToolCall): ToolStatus {
	if (call.status === "running") return "pending";
	if (call.status === "error") return "error";
	return "success";
}

const renderMermaid: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const source = readStringField(call.input, "mermaid");
	const art = readMermaidArt(call);
	const running = call.status === "running";
	const isError = call.status === "error";
	const diagram = diagramType(source);
	return {
		label: "Mermaid Diagram",
		badges: typeBadge(source),
		kind: "skill",
		bodyVariant: "term",
		status: mermaidStatus(call),
		stat: running ? "rendering\u2026" : isError ? "failed" : (diagram ?? undefined),
		body: mermaidBody(art, running ? "Rendering diagram\u2026" : isError ? "Render failed." : "No diagram output."),
	};
};

export { renderMermaid };
