// ConnectedMessageThread - driver-fed conversation in a stick-to-bottom viewport.
//
// Maps the session-driver transcript into the canonical `Message` surface. Each
// transcript message carries ordered blocks (text / reasoning / tool), so tool
// cards render inline in arrival order and persist after the run completes.
// Presence + the working verb are pinned in the thread tail while streaming.

import type { VerberProfileId } from "@fraym-ai/verber";
import { memo, useMemo } from "react";
import { Shimmer } from "../../elements/shimmer";
import type { SessionTranscriptMessage } from "../../hooks/session-types";
import { useSession } from "../../hooks/use-session";
import { cn } from "../../lib/cn";
import { useSettings } from "../../settings/use-settings";
import { Message, type MessageData } from "../message/message";
import { toMessageBlock } from "./message-blocks";
import { MessageThreadViewport } from "./message-thread-viewport";
import { lastUserMessageId } from "./thread-core";
import { resolveThreadVerber, useStickyToolIntent } from "./verber-status";

export interface ConnectedMessageThreadProps {
	/** Presence node (e.g. `<OptionalConnectedPresence avatar="nebula" />`) pinned in the tail. */
	readonly presence?: React.ReactNode;
	/** Optional showcase/embed override; otherwise the Fraym UI config profile drives the tail verb. */
	readonly verberProfile?: VerberProfileId;
	readonly showHeader?: boolean;
	readonly showAvatar?: boolean;
	readonly className?: string;
	readonly contentClassName?: string;
}

interface ConnectedThreadMessageTurnProps {
	readonly entry: SessionTranscriptMessage;
	readonly isLast: boolean;
	readonly isStreaming: boolean;
	readonly showHeader: boolean;
	readonly showAvatar: boolean;
}

const ConnectedThreadMessageTurn = memo(function ConnectedThreadMessageTurn({
	entry,
	isLast,
	isStreaming,
	showHeader,
	showAvatar,
}: ConnectedThreadMessageTurnProps) {
	const message = useMemo<MessageData>(
		() => ({
			role: entry.role,
			name: entry.role === "user" ? "You" : "Assistant",
			meta: entry.meta,
			customType: entry.customType,
			payload: entry.payload,
			blocks: entry.blocks.map(toMessageBlock),
		}),
		[entry],
	);
	return (
		<Message
			message={message}
			showHeader={showHeader}
			showAvatar={showAvatar}
			isLast={isLast}
			isStreaming={isStreaming}
			showActivity={false}
		/>
	);
});

export function ConnectedMessageThread({
	presence,
	verberProfile,
	showHeader = true,
	showAvatar = true,
	className,
	contentClassName,
}: ConnectedMessageThreadProps) {
	const session = useSession();
	const { config } = useSettings();
	const stickyIntent = useStickyToolIntent(session.activeTools, session.isStreaming);
	const verber = resolveThreadVerber({
		profile: verberProfile ?? config.verberProfile,
		isStreaming: session.isStreaming,
		vibrState: session.vibrState,
		vibrMode: session.vibrMode,
		activeTools: session.activeTools,
		workingStatus: session.workingStatus,
		toolCount: session.toolCount,
		toolIntent: stickyIntent,
	});
	const verb = verber.visible ? verber.text : "";
	const showTail = Boolean(presence) || session.isStreaming;
	// Snap to bottom whenever the user sends/steers (see MessageThreadViewport.pinKey).
	const pinKey = `${lastUserMessageId(session.transcript) ?? ""}#${session.snapshot?.queuedMessages?.length ?? 0}`;

	return (
		<MessageThreadViewport
			className={className}
			pinKey={pinKey}
			contentClassName={cn("px-4 py-4", contentClassName)}
			footer={
				showTail ? (
					<div data-slot="thread-tail" className="mt-[22px] mb-2 flex items-center gap-[11px]">
						{presence}
						{session.isStreaming && verb && (
							<Shimmer role="status" aria-live="polite" className="text-fr-base font-medium">
								{`${verb}...`}
							</Shimmer>
						)}
					</div>
				) : null
			}
		>
			{session.transcript.map((entry, index) => {
				const isLast = index === session.transcript.length - 1;
				return (
					<ConnectedThreadMessageTurn
						key={entry.id}
						isLast={isLast}
						isStreaming={isLast && session.isStreaming}
						entry={entry}
						showHeader={showHeader}
						showAvatar={showAvatar}
					/>
				);
			})}
		</MessageThreadViewport>
	);
}
