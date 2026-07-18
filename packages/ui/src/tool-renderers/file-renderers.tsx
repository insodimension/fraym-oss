import { useState } from "react";

import { Badge } from "../elements/badge";
import { Button } from "../elements/button";
import { Code } from "../elements/code";
import { CodeBlock } from "../elements/code-block";
import type { ToolCallState } from "../thread-state";
import { numberField, stringField } from "./data";

function MachineField({ label, value }: { label: string; value: string }) {
	return (
		<div className="fraym-tool-field">
			<span className="fraym-tool-field__label">{label}</span>
			<Code>{value}</Code>
		</div>
	);
}

function contentFrom(call: ToolCallState): string {
	return (
		stringField(call.output, "content", "text", "stdout") ??
		(typeof call.output === "string" ? call.output : undefined) ??
		stringField(call.input, "content", "text") ??
		"No content returned."
	);
}

export function ReadToolRenderer({ input, output }: ToolCallState) {
	const [showMore, setShowMore] = useState(false);
	const content =
		stringField(output, "content", "text") ?? (typeof output === "string" ? output : "No preview returned.");
	const lines = content.split("\n");
	const lineCount = numberField(output, "lineCount", "lines") ?? lines.length;
	const preview = showMore ? content : lines.slice(0, 8).join("\n");

	return (
		<div className="fraym-tool-stack">
			<div className="fraym-tool-row">
				<MachineField label="Path" value={stringField(input, "path", "file") ?? "unknown"} />
				<Badge>{lineCount} lines</Badge>
			</div>
			<CodeBlock code={preview} language="text" />
			{lines.length > 8 ? (
				<Button onClick={() => setShowMore(value => !value)} size="sm">
					{showMore ? "Show less" : `Show ${lines.length - 8} more lines`}
				</Button>
			) : null}
		</div>
	);
}

export function EditToolRenderer(call: ToolCallState) {
	const diff = stringField(call.output, "diff") ?? stringField(call.input, "diff", "patch") ?? contentFrom(call);

	return (
		<div className="fraym-tool-stack">
			<MachineField label="Path" value={stringField(call.input, "path", "file") ?? "unknown"} />
			<pre className="fraym-tool-diff" aria-label="Diff preview">
				{diff.split("\n").map((line, index) => {
					const kind =
						line.startsWith("+") && !line.startsWith("+++")
							? "added"
							: line.startsWith("-") && !line.startsWith("---")
								? "removed"
								: "context";
					return (
						<span className={`fraym-tool-diff__line fraym-tool-diff__line--${kind}`} key={`${index}-${line}`}>
							{line || " "}
						</span>
					);
				})}
			</pre>
		</div>
	);
}

export function WriteToolRenderer(call: ToolCallState) {
	const content = contentFrom(call);
	const lines = content.split("\n");
	return (
		<div className="fraym-tool-stack">
			<div className="fraym-tool-row">
				<MachineField label="Path" value={stringField(call.input, "path", "file") ?? "unknown"} />
				<Badge>{lines.length} lines</Badge>
			</div>
			<CodeBlock code={lines.slice(0, 12).join("\n")} language={stringField(call.input, "language") ?? "text"} />
			{lines.length > 12 ? <span className="fraym-tool-note">Previewing 12 of {lines.length} lines</span> : null}
		</div>
	);
}
