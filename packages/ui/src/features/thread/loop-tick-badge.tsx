// LoopTickBadge — the autonomy tick's wake-up prompt as a chip, not a wall of
// raw text. The engine opens every loop run with a machine-composed user message
// ("⏰ Scheduled tick (loop: …). Do your job…" + optional Governor / Resolution
// lines — packages/engine/src/autonomy/scheduler.ts composeTickMessage). In the
// transcript that read as an ugly paste; this collapses it to the composer's
// paste-attachment chip idiom, elevated for autonomy: the `orbit` mark in an
// accent tile, the loop name + a "loop tick" tag, and the tick's one-line intent.
// Click expands the full context + governor chips. Design source: the
// kitchen-sink `loop-badge` entry.
import { useState } from "react";
import { Icon } from "../../icons/icon";
import { cn } from "../../lib/cn";

/** The parsed autonomy wake-up message — see {@link parseLoopTickMessage}. */
export interface LoopTickInfo {
	readonly loopName: string;
	/** The tick's fired-at ISO stamp, verbatim from the message. */
	readonly firedAtIso: string;
	/** The head's instruction sentence ("Do your job per your instructions, then stop."). */
	readonly intent: string;
	/** The full head line, for the expanded view. */
	readonly head: string;
	/** Governor facts split on " · " ("4/10 runs today", "80 turns max", …). */
	readonly governor: readonly string[];
	/** The governor's economize note, when caps exist. */
	readonly governorNote?: string;
	/** The carried-back human verdict line ("Resolution to your ask …"), when present. */
	readonly resolution?: string;
}

const TICK_HEAD_RE = /^⏰ Scheduled tick \(loop: (.+?), ([^)]+)\)\.\s*(.*)$/;
const GOVERNOR_PREFIX = "Governor: ";
const GOVERNOR_NOTE_SPLIT = ". Near a cap?";
const RESOLUTION_PREFIX = "Resolution to your ask ";

/** Parse the engine's autonomy wake-up prompt. Returns null for anything that is
 *  not EXACTLY that machine-composed shape — a human message never matches. */
export function parseLoopTickMessage(text: string): LoopTickInfo | null {
	const lines = text.trim().split("\n");
	const head = lines[0] ?? "";
	const match = TICK_HEAD_RE.exec(head);
	if (!match) return null;
	let governor: readonly string[] = [];
	let governorNote: string | undefined;
	let resolution: string | undefined;
	for (const line of lines.slice(1)) {
		if (line.startsWith(GOVERNOR_PREFIX)) {
			const rest = line.slice(GOVERNOR_PREFIX.length);
			const noteAt = rest.indexOf(GOVERNOR_NOTE_SPLIT);
			const facts = noteAt >= 0 ? rest.slice(0, noteAt) : rest.replace(/\.\s*$/, "");
			if (noteAt >= 0) governorNote = rest.slice(noteAt + 2).trim();
			governor = facts
				.split(" · ")
				.map(fact => fact.trim())
				.filter(fact => fact.length > 0);
		} else if (line.startsWith(RESOLUTION_PREFIX)) {
			resolution = line;
		} else if (line.trim().length > 0) {
			// An unrecognized extra line means this is NOT the machine prompt —
			// don't swallow user text into a chip.
			return null;
		}
	}
	return {
		loopName: match[1] ?? "",
		firedAtIso: match[2] ?? "",
		intent: match[3] ?? "",
		head,
		governor,
		...(governorNote !== undefined ? { governorNote } : {}),
		...(resolution !== undefined ? { resolution } : {}),
	};
}

/**
 * The loop tick badge — replaces the raw scheduled-tick text that opens every
 * loop-run transcript with the paste-attachment chip idiom: orbit mark in an
 * accent tile, loop name + "loop tick" tag, one-line intent. Click expands the
 * full context, governor chips, and any carried-back ask resolution.
 */
export function LoopTickBadge({
	tick,
	defaultOpen = false,
	className,
}: {
	readonly tick: LoopTickInfo;
	/** Start expanded — showcase/demo affordance; the transcript default is collapsed. */
	readonly defaultOpen?: boolean;
	readonly className?: string;
}) {
	const [open, setOpen] = useState(defaultOpen);
	const short = tick.intent ? `Scheduled tick — ${tick.intent}` : "Scheduled tick";
	return (
		<div
			data-slot="loop-tick-badge"
			className={cn(
				"group relative w-full max-w-[460px] overflow-hidden rounded-[12px] border border-fr-border bg-fr-surface-2",
				className,
			)}
		>
			<button
				type="button"
				onClick={() => setOpen(v => !v)}
				title="Loop tick — expand the full context"
				className="flex w-full items-start gap-2.5 py-2.5 pr-3 pl-2.5 text-left"
			>
				<span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-fr-accent-dim text-fr-accent">
					<Icon name="orbit" size={17} strokeWidth={1.6} />
				</span>
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="flex items-center gap-1.5">
						<span className="fr-overflow font-secondary text-fr-xs font-medium text-fr-text">
							{tick.loopName}
						</span>
						<span className="shrink-0 rounded-full bg-fr-surface-3 px-1.5 py-px font-secondary text-fr-2xs text-fr-text-3">
							loop tick
						</span>
					</span>
					<span className="inline-flex items-center gap-0.5 font-secondary text-fr-2xs text-fr-text-3 transition-colors group-hover:text-fr-text-2">
						<span className="fr-overflow">{open ? "Hide context" : short}</span>
						<Icon name="caretR" size={11} className={cn("shrink-0 transition-transform", open && "rotate-90")} />
					</span>
				</span>
			</button>
			{open && (
				<div className="border-t border-fr-border-soft px-2.5 py-2.5">
					<p className="m-0 font-secondary text-fr-xs leading-relaxed text-fr-text-2">{tick.head}</p>
					{tick.governor.length > 0 && (
						<div className="mt-2.5 flex flex-wrap gap-1.5">
							{tick.governor.map(stat => (
								<span
									key={stat}
									className="rounded-md bg-fr-surface-3 px-1.5 py-px font-secondary text-fr-2xs text-fr-text-2 tabular-nums"
								>
									{stat}
								</span>
							))}
						</div>
					)}
					{tick.governorNote && (
						<p className="m-0 mt-2 font-secondary text-fr-2xs leading-relaxed text-fr-text-3">
							{tick.governorNote}
						</p>
					)}
					{tick.resolution && (
						<p className="m-0 mt-2 font-secondary text-fr-2xs leading-relaxed text-fr-accent">
							{tick.resolution}
						</p>
					)}
				</div>
			)}
		</div>
	);
}
