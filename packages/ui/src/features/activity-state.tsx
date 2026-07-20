// activity-state — the ONE state-dot vocabulary every activity surface shares:
// the session rail, the loops fleet, and the run views. A consumer DERIVES a
// semantic ActivityState from its own signals and hands it to <ActivityDot>; it
// never picks colors or motion itself. This module is the single source of truth
// for what each state MEANS, how it is DETECTED, and how it looks — read it
// before adding a new dot anywhere.
//
// The look is dictated (do not drift):
//
//   working    accent  + soft breathe (1.6s) — a foreground turn is running now
//   needs-you  VIOLET  + ping ring          — parked on YOUR decision (attention-grade)
//   background warn     + soft breathe       — background work while the foreground idles
//   attached   accent  + static halo         — loaded but idle: warm and ready
//   failed     del      + static             — the last run failed
//   ok         add      + static             — healthy / completed
//   off        muted    + static             — deliberately switched off (a paused loop)
//   idle       muted    + static             — a settled session at rest (same muted grey as off)

import { cn } from "../lib/cn";

/**
 * The shared activity-state vocabulary. Every activity surface derives one of
 * these from its own data and renders it via {@link ActivityDot}. Colors and
 * motion live in the spec below, never at the call site — a consumer speaks in
 * states, so the rail, the fleet, and the run views can never disagree.
 *
 * MEANING + DETECTION per state (this is the canon):
 *
 * - `working` — a foreground agent turn is running RIGHT NOW.
 *     DETECTION: session `status === "running"`; a live in-flight loop tick.
 * - `needs-you` — parked awaiting YOUR decision. The one attention-grade state,
 *     and the only one that leaves the (user-recolorable) accent family for a
 *     FIXED violet, so "you are needed" always reads the same and never blurs
 *     into working's soft breathe.
 *     DETECTION: a loop with an OPEN ask (`ask.verdict === undefined`) or a run
 *     whose outcome is `awaiting-approval`. (Sessions: see the seam in
 *     `sessionDot`/`sessionLifecycle` — catalog-level blocked-on-input is not on
 *     the wire yet.)
 * - `background` — work continues in the background while the foreground idles;
 *     ALSO a loop that needs ATTENTION (failing / quarantined) — the amber signal.
 *     DETECTION: session `hasBackgroundWork`; a loop `quarantined` / failing.
 * - `attached` — loaded into memory but idle: warm and ready, not working.
 *     DETECTION: session `loaded` and not running.
 * - `failed` — the last run ended in failure.
 *     DETECTION: session `status === "failed"`.
 * - `ok` — healthy: on, not failing, not awaiting; a run that completed.
 *     DETECTION: a loop that is on and clear.
 * - `off` — deliberately switched off (a paused loop), or a loop whose live
 *     health is unknown — a neutral, quiet muted dot.
 *     DETECTION: a paused background loop; a rail row with no live reading.
 * - `idle` — a settled session at rest; nothing live to signal. A quiet muted
 *     grey dot (the historic settled-session dot), sharing `off`'s look — the two
 *     differ in MEANING (idle = a session at rest, off = a deliberately-off loop),
 *     not in pixels.
 *     DETECTION: a settled session with no other signal.
 */
export type ActivityState = "working" | "needs-you" | "background" | "attached" | "failed" | "ok" | "off" | "idle";

/**
 * The visual spec for one state: `dot` = the dot's own classes (fill + static
 * halo + motion); `ping` = an expanding ring overlaid on top (only `needs-you`
 * earns one). Token-only, so themes and the user's accent recolor flow through.
 *
 * The `working` / `background` / `attached` / `failed` strings reproduce the
 * historic session-rail dot EXACTLY — the rail is the most-seen surface in the
 * product, so do NOT edit them without re-checking pixel parity.
 */
interface ActivityDotSpec {
	readonly dot: string;
	readonly ping?: string;
}

const ACTIVITY_DOT: Record<ActivityState, ActivityDotSpec> = {
	working: { dot: "bg-fr-accent shadow-[0_0_0_3px_var(--fr-accent-dim)] animate-[fr-breathe_1.6s_infinite]" },
	// The FIXED violet (`--fr-iris`, unaffected by the user's accent recolor) plus
	// an expanding ping — attention-grade, and visually distinct from working's
	// soft opacity breathe. `relative` gives the ping child a positioning context.
	"needs-you": {
		dot: "relative bg-fr-iris shadow-[0_0_0_3px_color-mix(in_srgb,var(--fr-iris),transparent_76%)]",
		ping: "bg-fr-iris",
	},
	background: {
		dot: "bg-fr-warn shadow-[0_0_0_3px_color-mix(in_srgb,var(--fr-warn),transparent_80%)] animate-[fr-breathe_1.6s_infinite]",
	},
	attached: { dot: "bg-fr-accent shadow-[0_0_0_2px_var(--fr-accent-dim)]" },
	failed: { dot: "bg-fr-del" },
	ok: { dot: "bg-fr-add" },
	off: { dot: "bg-fr-text-3" },
	idle: { dot: "bg-fr-text-3" },
};

/**
 * The ONE activity-state dot. Hand it a semantic {@link ActivityState}; it owns
 * the fill, halo, and motion. `idle` and `off` share the quiet muted-grey dot.
 * `size` (px) overrides the default 6px — the rail / run-row convention. Purely
 * decorative: always
 * `aria-hidden`, so callers voice status in text/labels, never this dot alone.
 */
export function ActivityDot({
	state,
	size,
	className,
}: {
	readonly state: ActivityState;
	readonly size?: number;
	readonly className?: string;
}) {
	const spec = ACTIVITY_DOT[state];
	return (
		<span
			data-slot="activity-dot"
			data-state={state}
			aria-hidden="true"
			className={cn("s-dot", size == null ? "size-1.5" : null, "shrink-0 rounded-full", spec.dot, className)}
			style={size == null ? undefined : { width: size, height: size }}
		>
			{spec.ping && (
				<span aria-hidden className={cn("absolute inset-0 rounded-full opacity-70 animate-ping", spec.ping)} />
			)}
		</span>
	);
}
