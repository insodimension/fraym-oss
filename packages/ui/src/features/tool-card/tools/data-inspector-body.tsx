import type { ReactNode } from "react";

import { cn } from "../../../lib/cn";

export interface DataInspectorBodyProps {
	readonly value: unknown;
	readonly label?: string | undefined;
	readonly className?: string | undefined;
}

function scalar(value: unknown): ReactNode {
	if (value === null) return <span className="text-fr-text-3">null</span>;
	if (value === undefined) return <span className="text-fr-text-3">undefined</span>;
	if (typeof value === "string") return <span className="whitespace-pre-wrap text-fr-text">{value}</span>;
	if (typeof value === "number" || typeof value === "bigint")
		return <span className="text-fr-blue">{String(value)}</span>;
	if (typeof value === "boolean") return <span className="text-fr-accent">{String(value)}</span>;
	return <span className="text-fr-text-2">{String(value)}</span>;
}

function TreeNode({ name, value, depth }: { readonly name?: string | undefined; readonly value: unknown; readonly depth: number }) {
	if (Array.isArray(value)) {
		return (
			<details open={depth < 2} className="group">
				<summary className="cursor-pointer select-none text-fr-text-3 marker:text-fr-text-3">
					{name ? <span className="text-fr-text-2">{name}: </span> : null}[{value.length}]
				</summary>
				<div className="ml-3 border-l border-fr-border-soft pl-3">
					{value.map((item, index) => (
						<TreeNode key={index} name={String(index)} value={item} depth={depth + 1} />
					))}
				</div>
			</details>
		);
	}
	if (typeof value === "object" && value !== null) {
		const entries = Object.entries(value as Record<string, unknown>);
		return (
			<details open={depth < 2} className="group">
				<summary className="cursor-pointer select-none text-fr-text-3 marker:text-fr-text-3">
					{name ? <span className="text-fr-text-2">{name}: </span> : null}
					{"{"}{entries.length}{"}"}
				</summary>
				<div className="ml-3 border-l border-fr-border-soft pl-3">
					{entries.map(([key, item]) => (
						<TreeNode key={key} name={key} value={item} depth={depth + 1} />
					))}
				</div>
			</details>
		);
	}
	return (
		<div className="flex min-w-0 gap-2">
			{name ? <span className="shrink-0 text-fr-text-3">{name}:</span> : null}
			<span className="min-w-0 break-words">{scalar(value)}</span>
		</div>
	);
}

export function DataInspectorBody({ value, label, className }: DataInspectorBodyProps) {
	return (
		<div
			data-slot="data-inspector-body"
			className={cn(
				"max-h-60 overflow-auto rounded-[var(--fr-r)] border border-fr-border-soft bg-fr-surface-2 px-3 py-2 font-secondary text-fr-xs leading-5",
				className,
			)}
		>
			<TreeNode name={label} value={value} depth={0} />
		</div>
	);
}
