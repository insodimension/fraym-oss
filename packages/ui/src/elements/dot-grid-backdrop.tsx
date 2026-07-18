import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface DotGridBackdropProps {
	readonly className?: string;
	readonly children?: ReactNode;
	/** Layer the soft accent-tinted radial glows over the dotted matrix. Default true. */
	readonly glow?: boolean;
}

/**
 * DotGridBackdrop — a calm, token-driven canvas backdrop: a CSS dotted matrix
 * (radial-gradient dots on a ~22px grid, colored `--fr-border-soft`) under one or
 * two soft accent-tinted radial glows (`--fr-accent` at low alpha, top-left and
 * bottom-right). Both decoration layers are `pointer-events-none` and sit behind
 * the content; `children` render above. Pure presentation — knows only tokens,
 * imports nothing from other tiers.
 *
 * The backdrop itself never scrolls, so the dots/glows stay fixed while a
 * scrolling child (e.g. a board's columns) floats over them. Pass flex/scroll
 * utilities through `className` and keep the scroller a `flex-1 min-h-0` child.
 */
export function DotGridBackdrop({ className, children, glow = true }: DotGridBackdropProps) {
	return (
		<div data-slot="dot-grid-backdrop" className={cn("relative isolate overflow-hidden bg-fr-bg", className)}>
			<div
				aria-hidden
				data-slot="dot-grid-pattern"
				className="pointer-events-none absolute inset-0 -z-10"
				style={{
					backgroundImage: "radial-gradient(var(--fr-border-soft) 1.4px, transparent 1.5px)",
					backgroundSize: "22px 22px",
					backgroundPosition: "-11px -11px",
				}}
			/>
			{glow ? (
				<div
					aria-hidden
					data-slot="dot-grid-glow"
					className="pointer-events-none absolute inset-0 -z-10"
					style={{
						background:
							"radial-gradient(42% 48% at 8% -4%, color-mix(in oklab, var(--fr-accent) 18%, transparent), transparent 70%)," +
							"radial-gradient(46% 52% at 104% 108%, color-mix(in oklab, var(--fr-accent) 12%, transparent), transparent 72%)",
					}}
				/>
			) : null}
			{children}
		</div>
	);
}
