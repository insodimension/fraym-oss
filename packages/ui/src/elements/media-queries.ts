// Shared `matchMedia` hooks for the decorative element ports. WAAPI / rAF-driven
// effects (which CSS media queries can't gate) each hand-rolled the same
// live-watched `prefers-reduced-motion` / `(hover: hover)` boilerplate; these two
// hooks are the single source of truth. The one-shot check still lives in
// `lib/motion` (`prefersReducedMotion`) and seeds this hook's initial value.

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../lib/motion";

function useMediaQuery(query: string, initial: boolean): boolean {
	const [matches, setMatches] = useState(initial);
	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) return;
		const mql = window.matchMedia(query);
		const onChange = () => setMatches(mql.matches);
		onChange();
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, [query]);
	return matches;
}

/** Live `prefers-reduced-motion` boolean (SSR-safe, seeded from `prefersReducedMotion`).
 *  Updates when the OS setting toggles, so a JS-driven animation can start/stop
 *  without a remount. */
export function useReducedMotion(): boolean {
	return useMediaQuery("(prefers-reduced-motion: reduce)", prefersReducedMotion());
}

/** Live `(hover: hover)` boolean (SSR-safe, starts false until the effect syncs) —
 *  true on pointer devices that can hover. Effects that only make sense with a real
 *  cursor gate on this. */
export function useHoverCapable(): boolean {
	return useMediaQuery("(hover: hover)", false);
}
