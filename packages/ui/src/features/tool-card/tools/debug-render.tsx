// `debug` tool renderer — DAP debugger output at TUI parity (mirrors
// engine .../tools/debug.ts → debugToolRenderer). The TUI renderer shows a header
// with the action name + status, an optional "Session" section with the active
// session snapshot (id, adapter, status, cwd, program, stop reason, frame,
// location, configuration pending, exit code), and the raw output text.
//
// Self-contained defensive parse (no coupling to the monolith), mirroring
// bash-render/find-render. See docs/design/tools/debug.md.

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
import { truncatingChip } from "./chip";

// Per-card body height cap (px) — matches bash/edit/write caps.
const DEBUG_OUTPUT_LINE_CAP = 200;
const DEBUG_BODY_MAX_HEIGHT = 200;
function DebugPendingBody() {
	return <div className="px-1 py-2 font-secondary text-fr-xs text-fr-text-3">Debugger action running…</div>;
}

function DebugErrorBody({ message }: { readonly message: string }) {
	return (
		<div className="rounded-[10px] border border-fr-del/35 bg-fr-del-bg px-3 py-2 font-secondary text-fr-xs text-fr-del">
			{message}
		</div>
	);
}

// ─── Defensive Parse (local; no coupling to the monolith) ──────────────────

/** Parse the text output from `content[].text`. */
function readOutputText(output: unknown): string | undefined {
	return readResultContentText(output);
}

interface DebugDetails {
	readonly action: string;
	readonly snapshot?: {
		readonly id: string;
		readonly adapter: string;
		readonly cwd: string;
		readonly program?: string | undefined;
		readonly status: string;
		readonly stopReason?: string | undefined;
		readonly frameName?: string | undefined;
		readonly instructionPointerReference?: string | undefined;
		readonly source?: { path?: string | undefined } | undefined;
		readonly line?: number | undefined;
		readonly column?: number | undefined;
		readonly exitCode?: number | undefined;
		readonly needsConfigurationDone?: boolean | undefined;
	} | undefined;
}

function readDebugDetails(call: ActiveToolCall): DebugDetails | undefined {
	const details = readField(call.output, "details");
	if (!details || typeof details !== "object") return undefined;
	const d = details as Record<string, unknown>;

	const snapshotRaw = readField(d, "snapshot");
	let snapshot: DebugDetails["snapshot"] | undefined;
	if (snapshotRaw && typeof snapshotRaw === "object") {
		const s = snapshotRaw as Record<string, unknown>;
		const sourceRaw = readField(s, "source");
		const source =
			sourceRaw && typeof sourceRaw === "object" ? { path: readStringField(sourceRaw, "path") } : undefined;
		snapshot = {
			id: readStringField(s, "id") ?? "",
			adapter: readStringField(s, "adapter") ?? "",
			cwd: readStringField(s, "cwd") ?? "",
			program: readStringField(s, "program"),
			status: readStringField(s, "status") ?? "",
			stopReason: readStringField(s, "stopReason"),
			frameName: readStringField(s, "frameName"),
			instructionPointerReference: readStringField(s, "instructionPointerReference"),
			source,
			line: typeof s.line === "number" ? (s.line as number) : undefined,
			column: typeof s.column === "number" ? (s.column as number) : undefined,
			exitCode: typeof s.exitCode === "number" ? (s.exitCode as number) : undefined,
			needsConfigurationDone: s.needsConfigurationDone === true,
		};
	}

	return {
		action: readStringField(d, "action") ?? "",
		snapshot,
	};
}

interface DebugContext {
	readonly inputAction: string;
	readonly details: DebugDetails | undefined;
	readonly outputText: string;
	readonly running: boolean;
	readonly isError: boolean;
	readonly hasSnapshot: boolean;
}

function readDebugContext(call: ActiveToolCall): DebugContext {
	const input = call.input;
	const inputAction = readStringField(input, "action") ?? "";
	const details = readDebugDetails(call);
	const actionFromDetails = details?.action ?? "";
	const action = inputAction || actionFromDetails;
	const outputText = readOutputText(call.output) ?? "";
	const running = call.status === "running";
	const isError = call.status === "error" || readField(call.output, "isError") === true;
	const hasSnapshot = details?.snapshot != null;

	return {
		inputAction: action,
		details,
		outputText,
		running,
		isError,
		hasSnapshot,
	};
}

// ─── Head / Badges / Stat ──────────────────────────────────────────────────

function actionBadge(action: string): ReactNode {
	const label = action.replaceAll("_", " ");
	return truncatingChip({ key: "action", text: label, maxCh: 28, variant: "code", tone: "accent" });
}

// ─── Body ──────────────────────────────────────────────────────────────────

function formatLocation(snapshot: DebugDetails["snapshot"]): string | null {
	if (!snapshot?.source?.path || snapshot.line === undefined) return null;
	return `${snapshot.source.path}:${snapshot.line}${snapshot.column !== undefined ? `:${snapshot.column}` : ""}`;
}

function sessionLines(details: DebugDetails): string[] {
	const snapshot = details.snapshot;
	if (!snapshot) return [];
	const lines: string[] = [
		`Session ${snapshot.id}`,
		`Adapter: ${snapshot.adapter}`,
		`Status: ${snapshot.status}`,
		`CWD: ${snapshot.cwd}`,
	];
	if (snapshot.program) lines.push(`Program: ${snapshot.program}`);
	if (snapshot.stopReason) lines.push(`Stop reason: ${snapshot.stopReason}`);
	if (snapshot.frameName) lines.push(`Frame: ${snapshot.frameName}`);
	if (snapshot.instructionPointerReference) {
		lines.push(`Instruction pointer: ${snapshot.instructionPointerReference}`);
	}
	const location = formatLocation(snapshot);
	if (location) lines.push(`Location: ${location}`);
	if (snapshot.needsConfigurationDone) {
		lines.push("Configuration: pending configurationDone; set breakpoints, then continue.");
	}
	if (snapshot.exitCode !== undefined) lines.push(`Exit code: ${snapshot.exitCode}`);
	return lines;
}

function cappedDebugOutput(text: string): string {
	const lines = text.split("\n");
	return lines.length <= DEBUG_OUTPUT_LINE_CAP
		? text
		: `${lines.slice(0, DEBUG_OUTPUT_LINE_CAP).join("\n")}\n… ${lines.length - DEBUG_OUTPUT_LINE_CAP} more line(s)`;
}

function buildBody(ctx: DebugContext): ReactNode {
	const { details, outputText, running, isError, hasSnapshot } = ctx;
	if (running) return <DebugPendingBody />;

	if (isError) return <DebugErrorBody message={outputText || "Debug action failed"} />;

	const sections: ReactNode[] = [];

	// Session section (when snapshot is available)
	if (hasSnapshot && details) {
		const slines = sessionLines(details);
		if (slines.length > 0) {
			sections.push(
				<ToolBodySection
					key="session"
					title="Session"
					stat={details.snapshot?.status}
					maxHeight={DEBUG_BODY_MAX_HEIGHT}
					padContent
				>
					<ToolBodyTerm lines={toTermLines(slines.join("\n"))} />
				</ToolBodySection>,
			);
		}
	}

	// Output section
	if (outputText) {
		sections.push(
			<ToolBodySection key="output" title="Output" maxHeight={DEBUG_BODY_MAX_HEIGHT} padContent>
				<ToolBodyTerm lines={toTermLines(cappedDebugOutput(outputText))} />
			</ToolBodySection>,
		);
	}

	if (sections.length === 0) {
		return null;
	}

	return <>{sections}</>;
}

// ─── Renderer ──────────────────────────────────────────────────────────────

const renderDebug: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const ctx = readDebugContext(call);

	const status: ToolStatus = ctx.running ? "pending" : ctx.isError ? "error" : "success";
	const stat = ctx.running ? "running…" : ctx.isError ? "failed" : undefined;

	return {
		label: "Debug",
		badges: [actionBadge(ctx.inputAction)],
		kind: "debug",
		status,
		stat,
		body: buildBody(ctx),
	};
};

export { renderDebug };
