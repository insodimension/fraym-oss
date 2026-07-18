// Motion — the shared timing/easing vocabulary for every animated transcript
// element (tool cards, the "Worked for Xs" disclosure, scroll, streaming text).
// One dial instead of N ad-hoc ms/easing literals scattered per component, so
// the whole thread moves with the same exquisite smoothness and a single tune
// here (plus its CSS twin below) keeps everything in lockstep.
//
// These constants MIRROR the CSS custom properties in `theme/theme.css`
// (`--fr-motion-*`, `--fr-ease-*`) — the source of truth for anything styled
// purely in CSS. Use the CSS vars directly in className/style when the
// transition is declarative; reach for these JS constants only when a
// duration or easing curve needs to cross into TypeScript (rAF timers,
// `setTimeout` unmount delays, `CollapseRegion`'s `durationMs` prop, spring
// math). Keep the two in sync — a value tuned in one without the other drifts.

/** Micro-interactions: hovers, icon rotations, color transitions. */
export const MOTION_FAST_MS = 130;
/** The default beat for most entrance/exit and height transitions. */
export const MOTION_BASE_MS = 220;
/** Larger structural moves: disclosures folding a whole work trace, panels. */
export const MOTION_SLOW_MS = 360;

/** Standard ease: a brisk start that settles softly — the house curve for
 *  reveals, fades, and height transitions. Matches `RollingNumber` and every
 *  other "gold standard" reveal in the app. */
export const EASE_STANDARD = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Symmetric ease for transitions that reverse in place (toggles, drags). */
export const EASE_INOUT = "cubic-bezier(0.65, 0, 0.35, 1)";
/** A touch of overshoot for playful, attention-catching entrances. */
export const EASE_EMPHASIZED = "cubic-bezier(0.34, 1.3, 0.4, 1)";

/** True when the user has requested reduced motion (SSR-safe). CSS already
 *  zeroes transition/animation durations app-wide via the `data-fr-motion`
 *  attribute and `prefers-reduced-motion` media query (see `theme.css`); reach
 *  for this only where a JS-driven animation (rAF loop, imperative timer) has
 *  no CSS transition to piggyback on. */
export function prefersReducedMotion(): boolean {
	return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
