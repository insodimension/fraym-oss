// `calc` tool renderer — simple expression evaluator.
// Head: "Calculator" label + expression badge (when available)
// Body: expression row (dim) + result/error row
//
// The TUI has NO dedicated renderer for calc — it uses the generic fallback
// (`#formatToolExecution`). This Fraym renderer is intentionally richer:
// a clear two-line format (expression → result) with semantic coloring.
// See docs/design/tools/calc.md.

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
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm, type ToolStatus } from "../tool-card";

// ─── Defensive parse ──────────────────────────────────────────────────────

/** Extract the output text from the tool result. */
function readOutputText(output: unknown): string | undefined {
	return readResultContentText(output) ?? asText(output);
}

/** Extract the expression from call input (shared `readStringField` covers the object guard). */
const readExpression = (input: Record<string, unknown> | undefined): string | undefined =>
	input ? readStringField(input, "expression") : undefined;

/** Parse the output text into expression and result parts.
 *  Output format is `<expr> = <result>` or `<expr> = <result>\n...` etc. */
function parseOutput(text: string): { expression: string; result: string } | null {
	const eqIdx = text.indexOf(" = ");
	if (eqIdx >= 0) {
		return { expression: text.substring(0, eqIdx), result: text.substring(eqIdx + 3) };
	}
	return null;
}

// ─── Body components ──────────────────────────────────────────────────────

function CalcPendingBody() {
	return <div className="px-0.5 py-0.5 font-secondary text-fr-xs text-fr-text-3">Evaluating…</div>;
}

function CalcErrorBody({ expression, message }: { readonly expression: string; readonly message: string }) {
	return (
		<ToolBodySection padContent>
			<ToolBodyTerm
				lines={[
					["dim", expression || "?"],
					["fail", message],
				]}
			/>
		</ToolBodySection>
	);
}

function CalcSuccessBody({ expression, result }: { readonly expression: string; readonly result: string }) {
	return (
		<ToolBodySection padContent>
			<ToolBodyTerm
				lines={[
					["dim", expression],
					["pass", `= ${result}`],
				]}
			/>
		</ToolBodySection>
	);
}

// ─── Renderer ──────────────────────────────────────────────────────────────

const renderCalc: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const input = call.input as Record<string, unknown> | undefined;
	const expression = readExpression(input) ?? "";
	const outputText = readOutputText(call.output);

	let status: ToolStatus;
	if (call.status === "error") {
		status = "error";
	} else if (call.status === "success") {
		status = "success";
	} else {
		status = "pending";
	}

	let body: ReactNode;
	if (call.status === "running") {
		body = <CalcPendingBody />;
	} else if (call.status === "error") {
		const errorMessage = outputText || "Unknown error";
		body = <CalcErrorBody expression={expression} message={errorMessage} />;
	} else if (outputText) {
		const parsed = parseOutput(outputText);
		if (parsed) {
			body = <CalcSuccessBody expression={parsed.expression} result={parsed.result} />;
		} else {
			body = (
				<ToolBodySection padContent>
					<ToolBodyTerm lines={toTermLines(outputText)} />
				</ToolBodySection>
			);
		}
	} else {
		body = null;
	}

	return {
		label: "Calculator",
		badges: expression ? (
			<Badge variant="code" tone="mute">
				{expression}
			</Badge>
		) : undefined,
		kind: "calc",
		status,
		stat: status === "success" ? "done" : status === "error" ? "failed" : "running",
		body,
	};
};

export { renderCalc };
