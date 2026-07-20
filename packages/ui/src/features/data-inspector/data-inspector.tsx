import { Icon } from "../../icons";
import { cn } from "../../lib/cn";

export interface DataInspectorBodyProps {
	readonly value: unknown;
	readonly label?: string;
	readonly maxDepth?: number;
	readonly className?: string;
}

function jsonKind(value: unknown) {
	if (value === null) return "null";
	if (Array.isArray(value)) return "array";
	return typeof value;
}

function jsonSummary(value: unknown) {
	if (Array.isArray(value)) return `[${value.length}]`;
	if (value && typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).length}}`;
	if (typeof value === "string") return JSON.stringify(value);
	return String(value);
}

function JsonLeaf({ name, value }: { readonly name?: string; readonly value: unknown }) {
	return (
		<div className="flex min-w-0 gap-2">
			{name && <span className="shrink-0 text-fr-text-3">{name}:</span>}
			<span
				className={cn(
					"min-w-0 fr-overflow",
					typeof value === "string" && "text-[var(--fr-code-str)]",
					typeof value === "number" && "text-fr-blue",
					typeof value === "boolean" && "text-fr-warn",
					value === null && "text-fr-text-3",
				)}
			>
				{jsonSummary(value)}
			</span>
		</div>
	);
}

function JsonNode({
	name,
	value,
	depth,
	maxDepth,
}: {
	readonly name?: string;
	readonly value: unknown;
	readonly depth: number;
	readonly maxDepth: number;
}) {
	const isBranch = value !== null && typeof value === "object";
	if (!isBranch || depth >= maxDepth) return <JsonLeaf name={name} value={value} />;

	const entries = Array.isArray(value)
		? value.map((item, index) => [String(index), item] as const)
		: Object.entries(value as Record<string, unknown>);

	return (
		<details open={depth < 2} className="group">
			<summary className="flex cursor-pointer list-none items-center gap-1.5 text-fr-text-2">
				<Icon name="caretR" size={11} className="transition-transform group-open:rotate-90" />
				{name && <span className="text-fr-text-3">{name}:</span>}
				<span>{jsonSummary(value)}</span>
				<span className="text-fr-text-3">{jsonKind(value)}</span>
			</summary>
			<div className="ml-4 border-l border-fr-border-soft pl-3">
				{entries.map(([key, item]) => (
					<JsonNode key={`${depth}:${key}`} name={key} value={item} depth={depth + 1} maxDepth={maxDepth} />
				))}
			</div>
		</details>
	);
}

export function DataInspectorBody({ value, label, maxDepth = 4, className }: DataInspectorBodyProps) {
	return (
		<div data-slot="data-inspector-body" className={cn("grid gap-1 font-secondary text-fr-xs leading-6", className)}>
			<JsonNode name={label} value={value} depth={0} maxDepth={maxDepth} />
		</div>
	);
}
