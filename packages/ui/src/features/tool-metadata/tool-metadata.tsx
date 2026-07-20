import { cn } from "../../lib/cn";
import type { ToolMetadataItem } from "../surface-kit";

function metadataToneClass(tone: ToolMetadataItem["tone"]) {
	if (tone === "accent") return "text-fr-accent";
	if (tone === "add") return "text-fr-add";
	if (tone === "warn") return "text-fr-warn";
	if (tone === "del") return "text-fr-del";
	if (tone === "blue") return "text-fr-blue";
	return "text-fr-text-3";
}
export interface ToolMetadataRowProps {
	readonly items: readonly ToolMetadataItem[];
	readonly className?: string;
}
export function ToolMetadataRow({ items, className }: ToolMetadataRowProps) {
	const visible = items.filter(item => !item.hidden);
	if (visible.length === 0) return null;

	return (
		<div
			data-slot="tool-metadata-row"
			className={cn(
				"flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-fr-border-soft pt-2 font-secondary text-fr-2xs",
				className,
			)}
		>
			{visible.map(item => (
				<span key={item.id} className="inline-flex items-center gap-1">
					<span className="text-fr-text-3">{item.label}</span>
					<span className={metadataToneClass(item.tone)}>{item.value}</span>
				</span>
			))}
		</div>
	);
}
