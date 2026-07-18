import { cn } from "../lib/cn";

const tagTone = {
	accent: "text-fr-accent",
	iris: "text-fr-iris",
	blue: "text-fr-blue",
	green: "text-fr-add",
	warn: "text-fr-warn",
	muted: "text-fr-text-3",
} as const;

export interface DiagramTagProps extends React.ComponentProps<"span"> {
	/** Color tone, resolved from the architecture accent tokens. */
	readonly tone?: keyof typeof tagTone;
}

/**
 * Inline monospace label rendered inside diagram-sub heads — the small tonal
 * kicker that precedes a title (e.g. `commands ↓`, `make`, step numbers).
 */
export function DiagramTag({ tone = "accent", className, ...props }: DiagramTagProps) {
	return (
		<span
			data-slot="diagram-tag"
			className={cn(
				"mr-[0.45rem] font-secondary text-[10px] font-semibold tracking-[0.06em]",
				tagTone[tone],
				className,
			)}
			{...props}
		/>
	);
}
