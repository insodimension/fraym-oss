import { createContext, type ReactNode, use } from "react";

/**
 * The render-kind currently shown in the shared "Insights" dock tab (e.g.
 * "usage", "context", "tools"). Provided by the frame from chrome state and
 * consumed by the Insights panel, so switching which command's panel is shown
 * re-renders through the memoized dock without prop-threading.
 */
const ActiveInsightContext = createContext<string | null>(null);

export function ActiveInsightProvider({
	value,
	children,
}: {
	readonly value: string | null;
	readonly children: ReactNode;
}) {
	return <ActiveInsightContext.Provider value={value}>{children}</ActiveInsightContext.Provider>;
}

export function useActiveInsight(): string | null {
	return use(ActiveInsightContext);
}
