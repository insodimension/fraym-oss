// useBelowWidth — live "is this element narrower than <threshold>px" boolean via
// ResizeObserver. Element-based (not viewport matchMedia) so consumers respond to
// their REAL available width — rail/dock/split columns eat viewport width, so a
// viewport query lies about how much room a column actually has.

import { type RefObject, useEffect, useState } from "react";

export function useBelowWidth(ref: RefObject<HTMLElement | null>, threshold: number): boolean {
	const [below, setBelow] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el || typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(entries => {
			const width = entries[0]?.contentRect.width ?? 0;
			if (width > 0) setBelow(width < threshold);
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, [ref, threshold]);
	return below;
}
