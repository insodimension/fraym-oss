// TraceGroup — a tight run of the agent's "work trace" (reasoning + tool cards).
//
// Consecutive reasoning/tool blocks read as one "thought → actions" stream, so
// they group at the tight `--fr-thread-trace` beat. Spacing is owned entirely by
// flex `gap`; `[&>*]:my-0` neutralizes any block's intrinsic margin so there is
// nothing left to fight. See `docs/design/14-thread-architecture.md`.

import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface TraceGroupProps {
	readonly children: ReactNode;
	readonly className?: string;
}

export function TraceGroup({ children, className }: TraceGroupProps) {
	return (
		<div data-slot="trace-group" className={cn("flex flex-col gap-[var(--fr-thread-trace)] [&>*]:my-0", className)}>
			{children}
		</div>
	);
}
