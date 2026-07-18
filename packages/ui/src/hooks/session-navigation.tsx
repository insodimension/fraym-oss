"use client";

import type { SessionRef } from "@fraym/driver";
import { createContext, type ReactNode, useContext, useMemo } from "react";

export interface SessionNavigation {
	/** Select/open a session in the host shell (same semantics as a rail click). */
	readonly openSession?: (sessionRef: SessionRef) => void;
	/** Current workspace used by continuation links. */
	readonly workspaceId?: string;
}

const SessionNavigationContext = createContext<SessionNavigation>({});

export function SessionNavigationProvider({
	openSession,
	workspaceId,
	children,
}: SessionNavigation & { readonly children: ReactNode }) {
	const value = useMemo<SessionNavigation>(
		() => ({
			...(openSession !== undefined ? { openSession } : {}),
			...(workspaceId !== undefined ? { workspaceId } : {}),
		}),
		[openSession, workspaceId],
	);
	return <SessionNavigationContext.Provider value={value}>{children}</SessionNavigationContext.Provider>;
}

export function useSessionNavigation(): SessionNavigation {
	return useContext(SessionNavigationContext);
}
