import { cn } from "../lib/cn";
import { Shimmer } from "./shimmer";
import { Spinner } from "./spinner";

export interface ThinkingDotsProps extends React.ComponentProps<"span"> {
	readonly label?: string;
	/** Shimmer the label text via {@link Shimmer} (the wait reads as alive, not stalled). */
	readonly shimmer?: boolean;
}

/**
 * ThinkingDots — a labeled "thinking" indicator: the bouncing-dots loader
 * ({@link Spinner} `kind="bounce"`) followed by a label with a trailing ellipsis.
 * Reconciled with the loader family — the dots are the shared `Spinner` bounce
 * kind, and the label can ride {@link Shimmer} — so no animation is re-rolled here.
 */
export function ThinkingDots({ label = "Working", shimmer = false, className, ...props }: ThinkingDotsProps) {
	return (
		<span
			data-slot="thinking-dots"
			className={cn("flex items-center gap-2.5 text-fr-base text-fr-text-2", className)}
			{...props}
		>
			<Spinner kind="bounce" size="sm" className="text-fr-accent" />
			{shimmer ? <Shimmer active>{label}…</Shimmer> : `${label}…`}
		</span>
	);
}
