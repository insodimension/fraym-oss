"use client";

import type { AgentEventStream, SessionDriver, SessionMessageInput, SessionRef, SessionSnapshot } from "@fraym/driver";
import type { AvatarId } from "@fraym/vibr";
import type { ReactNode } from "react";
import { Thread } from "../features/thread";

export interface WorkspaceSessionChrome {
	readonly avatar: AvatarId;
	readonly showTailPresence: boolean;
	readonly showAvatars: boolean;
	readonly agentMeta: string;
	readonly placeholder: string;
	readonly leftSlot?: ReactNode;
	readonly rightSlot?: ReactNode;
	readonly onSlash?: () => void;
}

export interface WorkspaceSessionChromeSource {
	readonly avatar: AvatarId;
	readonly showTailPresence: boolean;
	readonly showAvatars: boolean;
	readonly agentMeta: string;
	readonly placeholder: string;
	readonly leftSlot?: ReactNode;
	readonly renderRightSlot: () => ReactNode;
	readonly onSlash?: () => void;
}

export function workspaceSessionChrome(source: WorkspaceSessionChromeSource): WorkspaceSessionChrome {
	return {
		avatar: source.avatar,
		showTailPresence: source.showTailPresence,
		showAvatars: source.showAvatars,
		agentMeta: source.agentMeta,
		placeholder: source.placeholder,
		leftSlot: source.leftSlot,
		rightSlot: source.renderRightSlot(),
		onSlash: source.onSlash,
	};
}

export type PrepareSessionMessage = (text: string) => string | SessionMessageInput;

export interface WorkspaceSessionPaneProps {
	readonly driver: SessionDriver | null | undefined;
	readonly sessionRef: SessionRef;
	readonly initialSnapshot?: SessionSnapshot | null;
	readonly chrome: WorkspaceSessionChrome;
	readonly active?: boolean;
	readonly disabled?: boolean;
	readonly contentClassName?: string;
	readonly prepareMessage?: PrepareSessionMessage;
}

export function OpeningThreadSkeleton() {
	return <div className="p-6 text-fr-sm text-fr-text-3">Opening session…</div>;
}

export function presenceMode(value: string | undefined): string | undefined {
	return value;
}

export function WorkspaceSessionPane({ driver, chrome, contentClassName }: WorkspaceSessionPaneProps) {
	if (!driver) return <OpeningThreadSkeleton />;
	return (
		<Thread
			source={driver as unknown as AgentEventStream}
			title={chrome.agentMeta}
			showAvatar={chrome.showAvatars}
			contentClassName={contentClassName}
			emptyState={<OpeningThreadSkeleton />}
		/>
	);
}
