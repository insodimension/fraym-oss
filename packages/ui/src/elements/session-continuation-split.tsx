"use client";

import { useSessionNavigation } from "../hooks/session-navigation";
import { Icon } from "../icons";
import { cn } from "../lib/cn";
import { Button } from "./button";

export interface SessionContinuationSplitProps extends React.ComponentProps<"div"> {
	readonly toSessionId: string;
	readonly reason?: string;
}

export function continuationLabel(reason: string | undefined): string {
	switch (reason) {
		case "handoff":
			return "Handed off to a new session";
		case "plan":
			return "Plan executing in a fresh session";
		case "sidequest":
			return "Sidequest running in a side session";
		default:
			return "Continued in a new session";
	}
}

export function SessionContinuationSplit({ toSessionId, reason, className, ...props }: SessionContinuationSplitProps) {
	const navigation = useSessionNavigation();
	const workspaceId = navigation.workspaceId;
	const canOpen = Boolean(navigation.openSession && workspaceId);
	return (
		<div data-slot="session-continuation-split" className={cn("flex items-center gap-4", className)} {...props}>
			<span className="h-px flex-1 bg-fr-accent-line" />
			<span className="flex shrink-0 items-center gap-2 whitespace-nowrap font-secondary text-fr-xs text-fr-text-3">
				<Icon name="branch" size={12} className="text-fr-text-3" />
				{continuationLabel(reason)}
				{canOpen && (
					<Button
						size="sm"
						variant="outline"
						className="h-6 px-2 text-fr-xs"
						onClick={() => {
							if (workspaceId) navigation.openSession?.({ workspaceId, sessionId: toSessionId });
						}}
					>
						Open session
					</Button>
				)}
			</span>
			<span className="h-px flex-1 bg-fr-accent-line" />
		</div>
	);
}
