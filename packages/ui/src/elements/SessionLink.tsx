import { createContext, type ReactNode, useContext } from "react";
import { Button } from "./Button";
import { classNames } from "./utils";

export interface SessionTarget { readonly workspaceId: string; readonly sessionId: string }
export type OpenSession = (target: SessionTarget) => void;
const SessionNavigationContext = createContext<OpenSession | null>(null);
export function SessionNavigationProvider({ openSession, children }: { readonly openSession: OpenSession; readonly children: ReactNode }) { return <SessionNavigationContext.Provider value={openSession}>{children}</SessionNavigationContext.Provider>; }
export function useSessionNavigation() { return useContext(SessionNavigationContext); }

export interface SessionLinkProps { readonly workspaceId: string; readonly sessionId: string; readonly label?: string; readonly className?: string; readonly onOpenSession?: OpenSession }
export function SessionLink({ workspaceId, sessionId, label = "Open session", className, onOpenSession }: SessionLinkProps) {
  const contextHandler = useSessionNavigation(); const openSession = onOpenSession ?? contextHandler;
  if (!openSession) return <span className={classNames("fraym-session-link__fallback", className)}>{label}</span>;
  return <Button className={classNames("fraym-session-link", className)} data-slot="session-link" onClick={() => openSession({ workspaceId, sessionId })} size="sm" variant="outline"><svg aria-hidden="true" viewBox="0 0 16 16"><path d="M3 3.5h10v7H8l-3 2v-2H3z" /></svg>{label}</Button>;
}
