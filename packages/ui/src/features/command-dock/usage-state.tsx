import type { UsageDriver } from "@fraym-ai/driver";
import { createContext, type ReactNode, use } from "react";
import type { UsageState } from "../../hooks/use-usage";

const UsageStateContext = createContext<UsageState | null>(null);

/**
 * Shares the app-level usage state (driven by the usage driver, which lives at
 * the app root) with the in-frame Usage dock panel, so `DockUsageView` reuses
 * the same live state without prop-threading through the workspace.
 */
export function UsageStateProvider({ value, children }: { readonly value: UsageState; readonly children: ReactNode }) {
	return <UsageStateContext.Provider value={value}>{children}</UsageStateContext.Provider>;
}

export function useUsageStateContext(): UsageState | null {
	return use(UsageStateContext);
}

const UsageDriverContext = createContext<UsageDriver | null>(null);

/**
 * Shares the raw usage driver (not the app-root's session-agnostic poll state
 * above) so a session-scoped consumer — the composer's usage-limit strip —
 * can run its own `useUsage(driver, { sessionId })` fetch and see `inUse`
 * resolved against ITS session's actual routed account, not whichever account
 * the root's sessionless snapshot happens to name.
 */
export function UsageDriverProvider({
	value,
	children,
}: {
	readonly value: UsageDriver | null;
	readonly children: ReactNode;
}) {
	return <UsageDriverContext.Provider value={value}>{children}</UsageDriverContext.Provider>;
}

export function useUsageDriverContext(): UsageDriver | null {
	return use(UsageDriverContext);
}
