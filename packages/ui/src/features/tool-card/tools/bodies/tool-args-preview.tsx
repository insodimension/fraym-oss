// ToolArgsPreview — compact view of (possibly partial / streaming) tool args.
// Shown before a tool's full result lands; mirrors the TUI "Args" section.

import { cn } from "../../../../lib/cn";

export interface ToolArgsPreviewProps {
	readonly args: unknown;
	/** Max characters per value before truncation (default 80). */
	readonly maxValueLength?: number;
	readonly className?: string;
}

function preview(value: unknown, max: number): string {
	if (value === undefined || value === null) return "";
	let s: string;
	if (typeof value === "string") s = value;
	else {
		try {
			s = JSON.stringify(value);
		} catch {
			s = String(value);
		}
	}
	s = s.replace(/\s+/g, " ").trim();
	return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function ToolArgsPreview({ args, maxValueLength = 80, className }: ToolArgsPreviewProps) {
	if (args === undefined || args === null) return null;

	if (typeof args !== "object") {
		return (
			<div className={cn("font-secondary text-fr-xs text-fr-text-3", className)}>
				{preview(args, maxValueLength)}
			</div>
		);
	}

	const entries = Object.entries(args as Record<string, unknown>);
	if (entries.length === 0) {
		return <div className={cn("font-secondary text-fr-xs text-fr-text-3", className)}>empty args</div>;
	}

	return (
		<div data-slot="tool-args-preview" className={cn("grid gap-0.5 font-secondary text-fr-xs", className)}>
			{entries.map(([key, value]) => (
				<div key={key} className="flex gap-2">
					<span className="shrink-0 text-fr-text-3">{key}</span>
					<span className="min-w-0 fr-overflow text-fr-text-2">{preview(value, maxValueLength)}</span>
				</div>
			))}
		</div>
	);
}
