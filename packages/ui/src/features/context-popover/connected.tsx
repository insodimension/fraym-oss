import { useContextBreakdown } from "../../hooks/use-context-breakdown";
import { useSessionOptional } from "../../hooks/use-session";
import { ContextBreakdownView, contextBreakdownHeader, contextBreakdownToRows } from "./context-popover";

/**
 * Session-wired context breakdown for the inline `/context` result block. Pulls
 * the live per-category split from the current session driver (parity with Engine
 * `/context`) and renders it with the shared {@link ContextBreakdownView}.
 */
export function ConnectedContextBreakdown({ className }: { readonly className?: string }) {
	const session = useSessionOptional();
	const { breakdown, loading } = useContextBreakdown(session?.driver, session?.sessionRef, true);

	if (!breakdown) {
		return (
			<div className="px-1.5 py-2 font-secondary text-fr-xs text-fr-text-3">
				{loading ? "Loading context…" : "Context breakdown unavailable."}
			</div>
		);
	}

	const header = contextBreakdownHeader(breakdown);
	return (
		<ContextBreakdownView
			used={header.used}
			max={header.max}
			breakdown={contextBreakdownToRows(breakdown)}
			className={className}
		/>
	);
}
