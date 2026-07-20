// SkillCard — the reusable "skill fraym": one polished, animated card for a skill
// (the agent's headline capability). The default treatment is violet/spark; a
// plugin can compose this same primitive with its own accent, glyph, eyebrow, bar,
// and example prompts to brand its skill (e.g. gmail). Pure presentation, on-token
// (DESIGN.md): graphite surfaces, single accent glow, hairline borders, Mono
// eyebrow, `fr-rise` entrance + `fr-connect-glow` aura on the glyph.
//
// The root is a role="button" div (not a <button>) so it can host the inline enable
// Toggle without nesting interactive controls; inner controls stop propagation.
import type { KeyboardEvent, ReactNode } from "react";
import { Toggle } from "../elements/toggle";
import { Icon, type IconName } from "../icons";
import { cn } from "../lib/cn";

export interface SkillCardProps {
	readonly name: string;
	readonly description?: string;
	/** Resolved brand/logo node; falls back to the `glyph` icon when absent. */
	readonly icon?: ReactNode;
	/** Fallback glyph when no `icon` (default the "spark" capability mark). */
	readonly glyph?: IconName;
	/** Mono eyebrow above the name (default "Skill"). */
	readonly eyebrow?: string;
	/** Example prompts shown as chips — "what you can ask". */
	readonly examples?: readonly string[];
	/** How `examples` render: pill chips (default) or a numbered step list — the
	 *  manifest `skillCard.use: "steps"` built-in picks the latter for a
	 *  walkthrough-style skill. */
	readonly layout?: "chips" | "steps";
	readonly accent?: string;
	/** Optional full-bleed top bar background (a brand gradient flourish). */
	readonly bar?: string;
	readonly enabled?: boolean;
	readonly onOpen?: () => void;
	/** When provided, renders an inline enable Toggle (top-right). */
	readonly onToggle?: () => void;
	/** Plugin-supplied flourish rendered at the card foot. */
	readonly footer?: ReactNode;
	readonly className?: string;
}

export function SkillCard({
	name,
	description,
	icon,
	glyph = "spark",
	eyebrow = "Skill",
	examples,
	layout = "chips",
	accent = "var(--fr-accent)",
	bar,
	enabled = true,
	onOpen,
	onToggle,
	footer,
	className,
}: SkillCardProps) {
	const aura = `color-mix(in srgb, ${accent} 42%, transparent)`;
	const sheen = `radial-gradient(120% 80% at 88% -18%, color-mix(in srgb, ${accent} 16%, transparent), transparent 68%)`;
	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onOpen?.();
		}
	};
	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={onKeyDown}
			data-slot="skill-card"
			className={cn(
				"group relative flex w-full cursor-pointer flex-col gap-3 overflow-hidden rounded-[14px] border border-fr-border-soft bg-fr-surface p-[15px] text-left",
				"animate-[fr-rise_0.42s_ease-out_both] transition-[transform,border-color,background-color] duration-200",
				"hover:-translate-y-px hover:border-fr-border hover:bg-fr-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fr-accent-dim",
				className,
			)}
		>
			{bar && (
				<span
					className="pointer-events-none absolute inset-x-0 top-0 h-[2.5px]"
					style={{ background: bar }}
					aria-hidden="true"
				/>
			)}
			<span className="pointer-events-none absolute inset-0" style={{ background: sheen }} aria-hidden="true" />

			<div className="relative flex items-center gap-3">
				<span
					className="relative flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-fr-border bg-fr-surface-2"
					style={{ color: accent }}
				>
					<span
						className="absolute inset-1 rounded-[9px] blur-md animate-[fr-connect-glow_3.4s_ease-in-out_infinite]"
						style={{ background: aura }}
						aria-hidden="true"
					/>
					<span className="relative flex items-center justify-center">
						{icon ?? <Icon name={glyph} size={20} strokeWidth={1.7} />}
					</span>
				</span>
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span
						className="font-mono text-[10.5px] font-semibold uppercase leading-none tracking-[0.06em]"
						style={{ color: accent }}
					>
						{eyebrow}
					</span>
					<span className="fr-overflow font-display text-fr-base font-semibold tracking-[-0.01em] text-fr-text">
						{name}
					</span>
				</span>
				{onToggle ? (
					<span className="shrink-0" onClick={event => event.stopPropagation()}>
						<Toggle checked={enabled} onCheckedChange={() => onToggle()} />
					</span>
				) : (
					!enabled && (
						<span className="shrink-0 rounded-full border border-fr-border-soft bg-fr-surface-2 px-1.5 py-px text-[11px] font-medium text-fr-text-3">
							Off
						</span>
					)
				)}
			</div>

			{description && (
				<p className="relative line-clamp-2 text-fr-sm leading-relaxed text-fr-text-2">{description}</p>
			)}

			{examples && examples.length > 0 && (
				<div className={cn("relative flex", layout === "steps" ? "flex-col gap-1.5" : "flex-wrap gap-1.5")}>
					{examples.slice(0, layout === "steps" ? 4 : 3).map((example, index) =>
						layout === "steps" ? (
							<div key={example} className="flex items-start gap-2 text-[11.5px] text-fr-text-2">
								<span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full border border-fr-border-soft bg-fr-surface-3 font-mono text-[10px] text-fr-text-3">
									{index + 1}
								</span>
								<span className="min-w-0">{example}</span>
							</div>
						) : (
							<span
								key={example}
								className="inline-flex max-w-full items-center gap-1 rounded-full border border-fr-border-soft bg-fr-surface-3 px-2.5 py-1 text-[11.5px] text-fr-text-2 transition-colors group-hover:border-fr-border"
							>
								<Icon name="caretR" size={10} strokeWidth={2.4} className="shrink-0 text-fr-text-3" />
								<span className="fr-overflow">{example}</span>
							</span>
						),
					)}
				</div>
			)}

			{footer && <div className="relative">{footer}</div>}
		</div>
	);
}
