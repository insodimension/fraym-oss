import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Render children into `document.body` so `position: fixed` overlays anchor to
 * the real viewport.
 *
 * Without this, a transformed / filtered / `will-change: transform` ancestor in
 * the HOST app (a parallax wrapper, an animated modal, a scroll-driven effect)
 * becomes the containing block for fixed-position descendants, silently
 * re-origining every popover, scrim, and dialog rendered inline by an embedded
 * `<Fraym />`. Portaling to body makes overlay positioning host-proof.
 *
 * Theme tokens survive the hop: `--fr-*` variables and the `data-theme` /
 * `data-accent` / `data-theme-preset` attributes live on `:root`, not on the
 * Fraym root element. React synthetic events still bubble through the React
 * tree, so scrim `onClick` close handlers keep working unchanged.
 */
export function BodyPortal({ children }: { readonly children: ReactNode }) {
	if (typeof document === "undefined") return null;
	return createPortal(children, document.body);
}
