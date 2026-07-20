import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface ExplainPoint {
	readonly ek: ReactNode;
	readonly et: ReactNode;
	readonly ep: ReactNode;
}

export interface ExplainerProps {
	readonly heading?: ReactNode;
	readonly modelLabel?: ReactNode;
	readonly model: ReactNode;
	readonly points: readonly ExplainPoint[];
	readonly takeaway: ReactNode;
	readonly className?: string;
}

/** Mental-model-first explainer: a model callout, a grid of points, a takeaway. */
export function Explainer({
	heading = "Understand this block",
	modelLabel = "Mental model",
	model,
	points,
	takeaway,
	className,
}: ExplainerProps) {
	return (
		<section data-slot="explainer" className={cn("mt-12", className)}>
			<h2 className="mb-[1.2rem] flex items-center gap-[0.7rem] font-secondary text-[12px] font-semibold uppercase tracking-[0.14em] text-fr-text-3 before:h-px before:w-[22px] before:bg-fr-accent before:opacity-60 before:content-['']">
				{heading}
			</h2>

			<div className="max-w-[64em] rounded-r-[10px] border-l-2 border-fr-accent bg-[linear-gradient(160deg,var(--fr-explainer-grad-start),transparent_80%)] px-[1.4rem] py-[1.1rem]">
				<span className="mb-[0.4rem] block font-secondary text-[10px] uppercase tracking-[0.12em] text-fr-accent">
					{modelLabel}
				</span>
				<p className="text-[15.5px] leading-[1.6] text-fr-text [&_b]:font-semibold [&_b]:text-fr-text">{model}</p>
			</div>

			<div className="mt-4 grid grid-cols-2 gap-[0.9rem] max-[760px]:grid-cols-1">
				{points.map((p, i) => (
					<div
						key={i}
						className="rounded-[12px] border border-fr-border-soft bg-fr-surface px-[1.2rem] py-[1.1rem] transition-[border-color] hover:border-fr-border"
					>
						<div className="mb-[0.35rem] font-secondary text-[10px] uppercase tracking-[0.1em] text-fr-accent">
							{p.ek}
						</div>
						<div className="mb-[0.35rem] text-[14.5px] font-semibold text-fr-text">{p.et}</div>
						<div className="text-[13px] leading-[1.6] text-fr-text-2 [&_b]:font-semibold [&_b]:text-fr-text [&_em]:text-fr-text [&_em]:font-medium [&_em]:not-italic">
							{p.ep}
						</div>
					</div>
				))}
			</div>

			<p className="mt-[1.1rem] max-w-[64em] rounded-[12px] border border-dashed border-fr-accent-line bg-fr-accent-dim px-[1.2rem] py-[0.9rem] text-[14px] text-fr-text [&_b]:font-semibold [&_b]:text-fr-text">
				{takeaway}
			</p>
		</section>
	);
}
