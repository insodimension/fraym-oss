"use client";

import type { SessionRef } from "@fraym-ai/driver";
import { createContext, type ReactNode, useContext, useMemo } from "react";

export interface SessionNavigation {
	/** Select/open a session in the host shell (same semantics as a rail click). */
	readonly openSession?: (sessionRef: SessionRef) => void;
	/** Workspace that owns the selected session, when navigation is session-bound. */
	readonly workspaceId?: string;
}

const SessionNavigationContext = createContext<SessionNavigation>({});

export function SessionNavigationProvider({
	workspaceId,
	openSession,
	children,
}: SessionNavigation & { readonly children: ReactNode }) {
	const value = useMemo<SessionNavigation>(() => ({ workspaceId, openSession }), [workspaceId, openSession]);
	return <SessionNavigationContext.Provider value={value}>{children}</SessionNavigationContext.Provider>;
}

export function useSessionNavigation(): SessionNavigation {
	return useContext(SessionNavigationContext);
}
