// WorkingTail — the single presence + working-verb row pinned under the thread.
//
// This is the ONE home for the "what is the agent doing right now" tail (it
// replaces the three hand-rolled copies that lived in `Message`, the shell, and
// `ConnectedMessageThread`). It is presentational: the caller injects the
// `presence` node (host-agnostic) and the resolved `verb` (the verber lane
// re-lands its phrase resolution by feeding this prop). Spacing comes from the
// parent thread `gap`, never a hard-coded margin.

import type { ReactNode } from "react";
import { Shimmer } from "../../elements/shimmer";
import { cn } from "../../lib/cn";

export interface WorkingTailProps {
	/** Presence node (e.g. `<Presence avatar="nebula" />`). */
	readonly presence?: ReactNode;
	/** Working verb to shimmer while streaming (verber-resolved by the caller). */
	readonly verb?: string;
	/** Whether the session is actively streaming (drives the shimmer). */
	readonly streaming?: boolean;
	/** The connection is being restored; replaces the working shimmer with a neutral status. */
	readonly reconnecting?: boolean;
	/** Render the tail at all. When false the component is `null` (no phantom box). */
	readonly show?: boolean;
	readonly className?: string;
}

export function WorkingTail({
	presence,
	verb,
	streaming,
	reconnecting = false,
	show = true,
	className,
}: WorkingTailProps) {
	if (!show) return null;
	return (
		<div data-slot="working-tail" className={cn("flex items-center gap-[11px]", className)}>
			{presence}
			{reconnecting ? (
				<span data-slot="working-tail-reconnecting" className="text-fr-base font-medium text-fr-text-2">
					Reconnecting to engine…
				</span>
			) : streaming && verb ? (
				<Shimmer className="text-fr-base font-medium">{`${verb}...`}</Shimmer>
			) : null}
		</div>
	);
}
