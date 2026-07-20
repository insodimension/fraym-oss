import { useEffect, useState } from "react";
import { Scrim } from "../elements/popover";
import { Shimmer } from "../elements/shimmer";
import { Spinner, type SpinnerKind } from "../elements/spinner";
import { Icon } from "../icons/icon";
import { BodyPortal } from "../lib/body-portal";
import { cn } from "../lib/cn";

export type LaborStatus = "pending" | "active" | "done" | "error";

/** The live "working" affordance for {@link Labor}: any {@link Spinner} `kind`
 *  ({@link SpinnerKind} — `circular` / `dots` / `bars` / `beat` / `orbit`) or
 *  `shimmer` (no glyph — the live text shimmers via {@link Shimmer}). */
export type LaborIndicator = SpinnerKind | "shimmer";

export interface LaborStep {
	readonly id: string;
	readonly label: string;
	/** Defaults to `pending` when omitted. */
	readonly status?: LaborStatus;
}

export interface LaborProps {
	/** Known steps with live statuses — the honest "show the work" checklist. */
	readonly steps?: readonly LaborStep[];
	/** Reassuring phrases rotated on a timer for unknown-duration waits. */
	readonly cycle?: readonly string[];
	/** Cycle advance interval (ms). Holds on the final phrase. */
	readonly cycleIntervalMs?: number;
	/** `stack` = full vertical list; `inline` = compact single row. */
	readonly layout?: "stack" | "inline";
	readonly size?: "sm" | "md";
	/** Which live loader to show. Defaults to `circular`. */
	readonly indicator?: LaborIndicator;
	readonly className?: string;
}

const STEP_TEXT: Record<LaborStatus, string> = {
	done: "text-fr-text-2",
	active: "font-medium text-fr-text",
	error: "text-fr-del",
	pending: "text-fr-text-3",
};

/** The spinning loader for the active state, chosen by {@link LaborIndicator}.
 *  `shimmer` has no glyph in cycle mode; in step rows it falls back to the ring
 *  (a checklist row needs a marker) while the label carries the shimmer. */
function ActiveLoader({ indicator, size }: { readonly indicator: LaborIndicator; readonly size: "sm" | "md" }) {
	const kind: SpinnerKind = indicator === "shimmer" ? "circular" : indicator;
	return <Spinner kind={kind} size={size === "md" ? "sm" : "xs"} className="text-fr-accent" />;
}

function StepGlyph({
	status,
	px,
	indicator,
}: {
	readonly status: LaborStatus;
	readonly px: number;
	readonly indicator: LaborIndicator;
}) {
	if (status === "done") return <Icon name="check" size={px} strokeWidth={2.4} className="text-fr-add" />;
	if (status === "error") return <Icon name="x" size={px} strokeWidth={2.4} className="text-fr-del" />;
	if (status === "active") return <ActiveLoader indicator={indicator} size="sm" />;
	return (
		<span
			className="inline-block rounded-full bg-fr-text-3/40"
			style={{ width: Math.round(px / 2.6), height: Math.round(px / 2.6) }}
		/>
	);
}

/**
 * Labor — the "labor illusion": surface the work happening during a wait so it
 * reads as productive instead of frozen. Two modes:
 *  - `steps`: a live checklist (done ✓ / active ⟳ / pending ·) for known sequences.
 *  - `cycle`: reassuring phrases rotated on a timer for unknown-duration waits.
 *
 * The live loader is configurable via `indicator` (`spinner` / `dots` / `shimmer`)
 * so the illusion reuses our existing loaders rather than re-rolling one. Both
 * modes honor `layout` (`stack` list vs `inline` row) and inherit Fraym tokens.
 */
export function Labor({
	steps,
	cycle,
	cycleIntervalMs = 1400,
	layout = "stack",
	size = "md",
	indicator = "circular",
	className,
}: LaborProps) {
	if (cycle && cycle.length > 0) {
		return (
			<LaborCycle
				phrases={cycle}
				intervalMs={cycleIntervalMs}
				layout={layout}
				size={size}
				indicator={indicator}
				className={className}
			/>
		);
	}
	if (steps && steps.length > 0) {
		return <LaborSteps steps={steps} layout={layout} size={size} indicator={indicator} className={className} />;
	}
	return null;
}

export interface LaborOverlayProps {
	/** When false the overlay renders nothing. */
	readonly active: boolean;
	/** Cycle phrases rotated while active — unknown-duration waits (see {@link Labor} `cycle`). */
	readonly phrases?: readonly string[];
	/** Known steps with live statuses — alternative to `phrases` (see {@link Labor} `steps`). */
	readonly steps?: readonly LaborStep[];
	/** Optional heading above the illusion, e.g. "Refreshing connections". */
	readonly title?: string;
	/** Which live loader to show (see {@link Labor}). Defaults to `spinner`. */
	readonly indicator?: LaborIndicator;
	/** Extra classes for the centered panel. */
	readonly className?: string;
	/** When set, the overlay is ESCAPABLE: clicking the scrim (or Escape) calls
	 *  this instead of trapping the user — the work continues, only the modal
	 *  gate lifts. Absent → the historic non-dismissable behavior. */
	readonly onDismiss?: () => void;
}

/**
 * LaborOverlay — a blocking modal "labor illusion": the shared {@link Scrim}
 * (full-viewport dimmed + blurred backdrop) with a centered floating panel that
 * surfaces {@link Labor} `cycle` phrases (or `steps`) while a pending action runs
 * — the Connections add / remove / refresh flows. Portaled to `document.body` and
 * layered above any open `Modal`. Non-dismissable by default (it gates interaction
 * until the work completes); pass `onDismiss` to let a click on the scrim (or
 * Escape) lift the gate while the work carries on. Renders nothing when inactive.
 */
export function LaborOverlay({ active, phrases, steps, title, indicator, className, onDismiss }: LaborOverlayProps) {
	useEffect(() => {
		if (!active || !onDismiss) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onDismiss();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [active, onDismiss]);
	if (!active) return null;
	return (
		<>
			<Scrim
				dim
				className={cn("z-[60] animate-in fade-in-0 duration-150", onDismiss && "cursor-pointer")}
				onClick={onDismiss}
			/>
			<BodyPortal>
				<div
					data-slot="labor-overlay"
					className={cn(
						"fixed top-1/2 left-1/2 z-[61] flex min-w-[240px] max-w-[88vw] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-[16px] border border-fr-border bg-fr-surface px-7 py-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.6)] animate-[fr-pop-in_0.14s_ease]",
						className,
					)}
				>
					{title && <div className="text-fr-sm font-semibold text-fr-text">{title}</div>}
					<Labor cycle={phrases} steps={steps} layout="stack" size="md" indicator={indicator} />
				</div>
			</BodyPortal>
		</>
	);
}

function LaborCycle({
	phrases,
	intervalMs,
	layout,
	size,
	indicator,
	className,
}: {
	readonly phrases: readonly string[];
	readonly intervalMs: number;
	readonly layout: "stack" | "inline";
	readonly size: "sm" | "md";
	readonly indicator: LaborIndicator;
	readonly className?: string;
}) {
	const [index, setIndex] = useState(0);
	// No reset-on-prop needed: the overlay re-mounts on each activation, so index starts at 0.
	useEffect(() => {
		if (phrases.length <= 1) return;
		let i = 0;
		const timer = setInterval(() => {
			i += 1;
			setIndex(i);
			if (i >= phrases.length - 1) clearInterval(timer);
		}, intervalMs);
		return () => clearInterval(timer);
	}, [phrases, intervalMs]);
	const current = phrases[Math.min(index, phrases.length - 1)];
	const text = size === "md" ? "text-fr-sm" : "text-fr-xs";
	return (
		<output
			data-slot="labor"
			aria-live="polite"
			className={cn(
				"flex items-center gap-2 text-fr-text-2",
				text,
				layout === "stack" && "justify-center py-1",
				className,
			)}
		>
			{indicator !== "shimmer" && (
				<span className="flex shrink-0 items-center justify-center text-fr-accent">
					<ActiveLoader indicator={indicator} size={size} />
				</span>
			)}
			<span key={current} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
				{indicator === "shimmer" ? (
					<Shimmer active className={text}>
						{current}
					</Shimmer>
				) : (
					current
				)}
			</span>
		</output>
	);
}

function LaborSteps({
	steps,
	layout,
	size,
	indicator,
	className,
}: {
	readonly steps: readonly LaborStep[];
	readonly layout: "stack" | "inline";
	readonly size: "sm" | "md";
	readonly indicator: LaborIndicator;
	readonly className?: string;
}) {
	const px = size === "md" ? 15 : 13;
	const text = size === "md" ? "text-fr-sm" : "text-fr-xs";
	const shimmer = indicator === "shimmer";
	if (layout === "inline") {
		const active =
			steps.find(s => (s.status ?? "pending") === "active") ??
			steps.find(s => (s.status ?? "pending") !== "done") ??
			steps[steps.length - 1];
		if (!active) return null;
		const status = active.status ?? "pending";
		return (
			<output
				data-slot="labor"
				aria-live="polite"
				className={cn("flex items-center gap-2 text-fr-text-2", text, className)}
			>
				<span className="flex shrink-0 items-center justify-center" style={{ width: px, height: px }}>
					<StepGlyph status={status} px={px} indicator={indicator} />
				</span>
				{shimmer && status === "active" ? (
					<Shimmer active className={text}>
						{active.label}
					</Shimmer>
				) : (
					<span className={STEP_TEXT[status]}>{active.label}</span>
				)}
			</output>
		);
	}
	return (
		<ul aria-live="polite" data-slot="labor" className={cn("flex flex-col gap-2", className)}>
			{steps.map(step => {
				const status = step.status ?? "pending";
				return (
					<li key={step.id} className={cn("flex items-center gap-2.5", text)}>
						<span className="flex shrink-0 items-center justify-center" style={{ width: px, height: px }}>
							<StepGlyph status={status} px={px} indicator={indicator} />
						</span>
						{shimmer && status === "active" ? (
							<Shimmer active className={text}>
								{step.label}
							</Shimmer>
						) : (
							<span className={cn("transition-colors", STEP_TEXT[status])}>{step.label}</span>
						)}
					</li>
				);
			})}
		</ul>
	);
}
