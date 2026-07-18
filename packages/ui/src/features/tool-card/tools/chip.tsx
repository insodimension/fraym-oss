// Shared head-chip helpers for the per-tool card renderers (search / ast-edit /
// ast-grep / find / debug / web-search). Two shapes the renderers feed into the
// card's `badges` row:
//   • dimChip        — a muted stat span (`N matches`, `· M files`, `in <path>`).
//   • truncatingChip — a Badge whose single value truncates with an ellipsis.

import type { ReactNode } from "react";
import { Badge, type BadgeProps } from "../../../elements/badge";

/** Muted 2xs stat chip; `extra` appends layout classes (e.g. `max-w-[24ch] fr-overflow`). */
export function dimChip(key: string, text: string, extra?: string): ReactNode {
	return (
		<span key={key} className={`font-secondary text-fr-2xs leading-none text-fr-text-3${extra ? ` ${extra}` : ""}`}>
			{text}
		</span>
	);
}

/** A Badge head-chip whose single value honors the text-overflow policy at `maxCh`.
 *  `fr-overflow` (overflow:hidden + nowrap) only engages on a BLOCK child: placed
 *  directly on the Badge it fights the Badge's `justify-center`, which centers an
 *  over-wide value and clips BOTH ends. So the value lives in an inner `block
 *  fr-overflow` span. `maxCh` is a per-call number, applied via inline style (same
 *  computed `max-width` as the old `max-w-[Nch]` class, without depending on
 *  Tailwind scanning a dynamic arbitrary value). */
export function truncatingChip({
	key,
	text,
	maxCh,
	variant,
	tone,
}: {
	readonly key: string;
	readonly text: ReactNode;
	readonly maxCh: number;
	readonly variant: BadgeProps["variant"];
	readonly tone: BadgeProps["tone"];
}): ReactNode {
	return (
		<Badge key={key} variant={variant} tone={tone}>
			<span className="block fr-overflow" style={{ maxWidth: `${maxCh}ch` }}>
				{text}
			</span>
		</Badge>
	);
}
