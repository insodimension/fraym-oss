"use client";

import { useSessionNavigation } from "../hooks/session-navigation";
import { Icon } from "../icons";
import { cn } from "../lib/cn";
import { Button } from "./button";

export interface SessionLinkProps {
	readonly workspaceId: string;
	readonly sessionId: string;
	/** Chip label; falls back to "Open session". */
	readonly label?: string;
	readonly className?: string;
}

/** Inline "Open session" chip for a `session://<workspaceId>/<sessionId>` link in
 *  agent prose. Reuses the handoff divider's button styling and opens the target
 *  session via the shared navigation hook. When no `openSession` handler is wired
 *  (e.g. no host shell), the label renders as plain, non-interactive text rather
 *  than a dead button. */
export function SessionLink({ workspaceId, sessionId, label, className }: SessionLinkProps) {
	const navigation = useSessionNavigation();
	const text = label || "Open session";
	if (!navigation.openSession) {
		return <span className={cn("text-fr-text-2", className)}>{text}</span>;
	}
	return (
		<Button
			data-slot="session-link"
			size="sm"
			variant="outline"
			className={cn("h-6 gap-1 px-2 text-fr-xs", className)}
			onClick={() => navigation.openSession?.({ workspaceId, sessionId })}
		>
			<Icon name="chat" size={12} />
			{text}
		</Button>
	);
}
