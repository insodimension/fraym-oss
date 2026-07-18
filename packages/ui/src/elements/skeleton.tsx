import type { CSSProperties } from "react";
import { cn } from "../lib/cn";

// Block-level loading placeholder. Reuses the same `fr-shimmer-sweep` keyframe as
// the text `Shimmer`, but sweeps a surface-tier gradient *background* (not clipped
// text). Token-driven, so theme / accent / density all follow for free. Under
// reduced motion the global `[data-fr-motion]` / `prefers-reduced-motion` rules
// freeze the sweep, leaving a static muted block that still reads as a placeholder.

const ROUNDED = {
	sm: "rounded-[6px]",
	md: "rounded-[8px]",
	lg: "rounded-[10px]",
	full: "rounded-full",
} as const;

// surface-2 → surface-3 → surface-2 sweep; same 220% track + keyframe as Shimmer.
const SWEEP =
	"bg-[linear-gradient(100deg,var(--fr-surface-2)_30%,var(--fr-surface-3)_50%,var(--fr-surface-2)_70%)] bg-[length:220%_100%] animate-[fr-shimmer-sweep_1.5s_linear_infinite]";

function dim(value?: number | string): string | undefined {
	if (value == null) return undefined;
	return typeof value === "number" ? `${value}px` : value;
}

export interface SkeletonProps extends React.ComponentProps<"div"> {
	/** Width — number (px) or any CSS length. */
	readonly w?: number | string;
	/** Height — number (px) or any CSS length. */
	readonly h?: number | string;
	/** Corner radius tier. Ignored when `circle`. */
	readonly rounded?: keyof typeof ROUNDED;
	/** Render a perfect circle (avatars / icons). */
	readonly circle?: boolean;
}

export function Skeleton({ w, h, rounded = "md", circle = false, className, style, ...props }: SkeletonProps) {
	const sized: CSSProperties = { width: dim(w), height: dim(h), ...style };
	return (
		<div
			data-slot="skeleton"
			aria-hidden
			className={cn(SWEEP, circle ? "rounded-full" : ROUNDED[rounded], className)}
			style={sized}
			{...props}
		/>
	);
}

export interface SkeletonTextProps extends Omit<React.ComponentProps<"div">, "children"> {
	/** Number of placeholder lines. */
	readonly lines?: number;
	/** Height of each line block (number = px). */
	readonly lineHeight?: number | string;
	/** Vertical gap between lines (number = px). */
	readonly gap?: number | string;
	/** Width of the final line when there is more than one (creates the ragged-edge look). */
	readonly lastWidth?: number | string;
}

export function SkeletonText({
	lines = 3,
	lineHeight = 10,
	gap = 8,
	lastWidth = "60%",
	className,
	style,
	...props
}: SkeletonTextProps) {
	return (
		<div
			data-slot="skeleton-text"
			aria-hidden
			className={cn("flex flex-col", className)}
			style={{ gap: dim(gap), ...style }}
			{...props}
		>
			{Array.from({ length: Math.max(1, lines) }, (_, i) => (
				<Skeleton key={i} h={lineHeight} rounded="sm" w={lines > 1 && i === lines - 1 ? lastWidth : "100%"} />
			))}
		</div>
	);
}

export interface SkeletonGroupProps extends React.ComponentProps<"div"> {
	/** Screen-reader label announced while content loads. */
	readonly label?: string;
}

// Wraps a cluster of skeletons as a single live region. Decorative blocks stay
// `aria-hidden`; this announces the busy state once.
export function SkeletonGroup({ label = "Loading…", className, children, ...props }: SkeletonGroupProps) {
	return (
		<div data-slot="skeleton-group" role="status" aria-busy="true" className={className} {...props}>
			<span className="sr-only">{label}</span>
			{children}
		</div>
	);
}
