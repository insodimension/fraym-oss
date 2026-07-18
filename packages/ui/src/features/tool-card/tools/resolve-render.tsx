// `resolve` tool renderer — pending-action resolve (accept/discard).
// Head: "Resolve" label + action badge (apply/discard)
// Body: pending state shows the action + reason; resolved state shows accept/discard/failed + reason + source label.
//
// TUI has a dedicated renderer (`resolveToolRenderer` in engine/.../tools/resolve.ts) with
// `mergeCallAndResult: true` and `inline: true`. This Fraym renderer mirrors it:
// pending state shows the call args (action + reason), success state shows the outcome.
// See docs/design/tools/resolve.md.

import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { asText, readField, readResultContentText, readStringField } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm, type ToolStatus } from "../tool-card";

// ─── Types ──────────────────────────────────────────────────────────────────

type ResolveAction = "apply" | "discard";

interface ResolveDetails {
	readonly action: ResolveAction;
	readonly reason: string;
	readonly label?: string | undefined;
	readonly sourceToolName?: string | undefined;
}

interface ParsedArgs {
	readonly action: ResolveAction;
	readonly reason: string;
}

// ─── Defensive parse ────────────────────────────────────────────────────────

/** Parse `details` from the tool output. */
function readResolveDetails(output: unknown): ResolveDetails | undefined {
	const obj = readField(output, "details") ?? output;
	if (typeof obj !== "object" || obj === null) return undefined;
	const action = readStringField(obj, "action");
	if (action !== "apply" && action !== "discard") return undefined;
	return {
		action,
		reason: readStringField(obj, "reason") ?? "",
		label: readStringField(obj, "label"),
		sourceToolName: readStringField(obj, "sourceToolName"),
	};
}

/** Parse input args from the call. */
function readInputArgs(input: unknown): ParsedArgs | undefined {
	if (typeof input !== "object" || input === null) return undefined;
	const action = readStringField(input, "action");
	if (action !== "apply" && action !== "discard") return undefined;
	return {
		action,
		reason: readStringField(input, "reason") ?? "",
	};
}

// ─── Label parsing ──────────────────────────────────────────────────────────

/** Parse a label of the form `"sourceTool: summary"` into source + summary parts. */
function parseLabel(label: string): { source?: string; summary: string } {
	const sep = ": ";
	const idx = label.indexOf(sep);
	if (idx > 0) {
		return { source: label.slice(0, idx).trim(), summary: label.slice(idx + sep.length).trim() };
	}
	return { summary: label };
}

// ─── Shared outcome body ─────────────────────────────────────────────────────

type OutcomeMode = "accept" | "discard" | "failed";

function outcomeTone(mode: OutcomeMode): { verb: string; verbColor: string } {
	switch (mode) {
		case "accept":
			return { verb: "Accept", verbColor: "text-fr-add" };
		case "discard":
			return { verb: "Discard", verbColor: "text-fr-warn" };
		case "failed":
			return { verb: "Failed", verbColor: "text-fr-del" };
	}
}

/** Single body component shared by success and error outcomes. */
function ResolveOutcomeBody({ details, mode }: { readonly details: ResolveDetails; readonly mode: OutcomeMode }) {
	const { verb, verbColor } = outcomeTone(mode);
	const labelParsed = details.label ? parseLabel(details.label) : undefined;
	const summary = labelParsed?.summary ?? "pending action";
	const reason = details.reason || "No reason provided";

	return (
		<ToolBodySection padContent>
			<div className="flex items-center gap-1.5 font-primary text-fr-sm">
				<span className={`font-semibold ${verbColor}`}>{verb}:</span>
				<span className="text-fr-text">{summary}</span>
				{labelParsed?.source && (
					<Badge variant="code" tone="mute">
						{labelParsed.source}
					</Badge>
				)}
				{!labelParsed && details.sourceToolName && (
					<Badge variant="code" tone="mute">
						{details.sourceToolName}
					</Badge>
				)}
			</div>
			<div className="mt-1.5 font-secondary text-fr-xs text-fr-text-3 italic leading-relaxed">{reason}</div>
		</ToolBodySection>
	);
}

// ─── Body components ─────────────────────────────────────────────────────────

/** Render the pending/running state from the input args. */
function ResolvePendingBody({ args }: { readonly args: ParsedArgs }) {
	const isApply = args.action === "apply";
	return (
		<ToolBodySection padContent>
			<div className="flex items-center gap-2 font-secondary text-fr-xs">
				<Badge variant="code" tone={isApply ? "add" : "warn"}>
					{isApply ? "proposed → resolved" : "proposed → rejected"}
				</Badge>
			</div>
			{args.reason && (
				<div className="mt-1.5 font-primary text-fr-sm text-fr-text-3 leading-relaxed">{args.reason}</div>
			)}
		</ToolBodySection>
	);
}

/** Render the pending/running state from the parsed args. */
function ResolveRunningBody({ args }: { readonly args: ParsedArgs | undefined }) {
	if (args) {
		return <ResolvePendingBody args={args} />;
	}
	return (
		<ToolBodySection padContent>
			<ToolBodyTerm lines={[["dim", "Resolving…"]]} />
		</ToolBodySection>
	);
}

// ─── Renderer ───────────────────────────────────────────────────────────────

function resolveStatus(status: ActiveToolCall["status"]): ToolStatus {
	if (status === "error") return "error";
	if (status === "success") return "success";
	return "pending";
}

function resolveStat(status: ToolStatus): string {
	if (status === "success") return "resolved";
	if (status === "error") return "failed";
	return "pending";
}

function ResolveTextBody({ text, tone = "dim" }: { readonly text: string; readonly tone?: "dim" | "fail" }) {
	return (
		<ToolBodySection padContent>
			<ToolBodyTerm lines={[[tone, text]]} />
		</ToolBodySection>
	);
}

function renderResolveErrorBody(call: ActiveToolCall, details: ResolveDetails | undefined): ReactNode {
	if (details) {
		const mode = details.action === "apply" ? "failed" : "discard";
		return <ResolveOutcomeBody details={details} mode={mode} />;
	}
	const text = readResultContentText(call.output) ?? asText(call.output) ?? "Error resolving action";
	return <ResolveTextBody text={text} tone="fail" />;
}

function renderResolveBody(
	call: ActiveToolCall,
	args: ParsedArgs | undefined,
	details: ResolveDetails | undefined,
): ReactNode {
	if (call.status === "running") return <ResolveRunningBody args={args} />;
	if (call.status === "error") return renderResolveErrorBody(call, details);
	if (details) {
		const mode = details.action === "apply" ? "accept" : "discard";
		return <ResolveOutcomeBody details={details} mode={mode} />;
	}
	return <ResolveTextBody text="No resolve data" />;
}

function buildResolveBadges(args: ParsedArgs | undefined, details: ResolveDetails | undefined): ReactNode | undefined {
	const action = args?.action ?? details?.action;
	if (!action) return undefined;
	return (
		<Badge variant="code" tone={action === "apply" ? "add" : "warn"}>
			{action}
		</Badge>
	);
}

const renderResolve: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const args = readInputArgs(call.input);
	const details = readResolveDetails(call.output);
	const status = resolveStatus(call.status);

	return {
		label: "Resolve",
		badges: buildResolveBadges(args, details),
		kind: "resolve",
		status,
		stat: resolveStat(status),
		body: renderResolveBody(call, args, details),
	};
};

export { renderResolve };
