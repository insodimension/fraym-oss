import type { ComponentProps } from "react";
import { Button } from "./Button";
import { type OpenSession, useSessionNavigation } from "./SessionLink";
import { classNames } from "./utils";

export interface SessionContinuationSplitProps extends ComponentProps<"div"> { readonly toSessionId: string; readonly reason?: string; readonly workspaceId?: string; readonly onOpenSession?: OpenSession }
export function continuationLabel(reason: string | undefined) { if (reason === "handoff") return "Handed off to a new session"; if (reason === "plan") return "Plan executing in a fresh session"; if (reason === "sidequest") return "Sidequest running in a side session"; return "Continued in a new session"; }
export function SessionContinuationSplit({ toSessionId, reason, workspaceId, onOpenSession, className, ...props }: SessionContinuationSplitProps) {
  const contextHandler = useSessionNavigation(); const openSession = onOpenSession ?? contextHandler; const canOpen = Boolean(openSession && workspaceId);
  return <div className={classNames("fraym-continuation-split", className)} data-slot="session-continuation-split" {...props}><span className="fraym-context-split__line is-done" /><span className="fraym-continuation-split__label"><svg aria-hidden="true" viewBox="0 0 16 16"><path d="M4 2v7a3 3 0 0 0 3 3h5M8 9l4 3-4 3" /></svg>{continuationLabel(reason)}{canOpen ? <Button className="fraym-session-link" size="sm" variant="outline" onClick={() => workspaceId && openSession?.({ workspaceId, sessionId: toSessionId })}>Open session</Button> : null}</span><span className="fraym-context-split__line is-done" /></div>;
}
