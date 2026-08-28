"use client";

// WorkspaceSessionPane — THE workspace session unit: one session's thread +
// composer (goal + usage-limit surfaces, slash commands, presence tail,
// select dialog, host-ui layer) wrapped in its SessionProvider. Moved out of
// fraym-frame-workspace.tsx so every surface renders the SAME unit — the
// Code bench's split panes and every chat dock consume this
// export. There is exactly one implementation; never compose a parallel
// thread/composer elsewhere.

import type {
	SessionAttachment,
	SessionDriver,
	SessionMessageInput,
	SessionRef,
	SessionSnapshot,
} from "@fraym-ai/driver";
import { type AvatarId, Presence } from "@fraym-ai/vibr";
import type { ComponentProps, ReactNode } from "react";
import { useEffect } from "react";
import { Button, Skeleton, SkeletonGroup, SkeletonText } from "../elements";
import { continuationLabel } from "../elements/session-continuation-split";
import {
	Composer,
	ConnectedHostUiLayer,
	ConnectedSelectDialog,
	GoalComposerSurface,
	setActiveComposerDraftKey,
	Thread,
	UsageLimitComposerSurface,
	useSessionComposerDraft,
} from "../features";
import type { ComposerContextTag } from "../features/composer/composer-core";
import {
	applyComposerSeededContext,
	seedSessionComposerContext,
	useSessionComposerContext,
} from "../features/composer/session-composer-draft";
import { useSessionNavigation } from "../hooks/session-navigation";
import { SessionProvider } from "../hooks/session-provider";
import { useArgumentCompletions } from "../hooks/use-argument-completions";
import { useFileCompletions } from "../hooks/use-file-completions";
import { useSessionOptional, useVibr } from "../hooks/use-session";
import { type SessionContinuation, transcriptContinuation } from "../hooks/use-session-continuation";
import { useSlashCommands } from "../hooks/use-slash-commands";
import { Icon } from "../icons";
import { sessionRefKey } from "./session-groups";
import { SessionTaskDropZone } from "./session-task-drop";

type PresenceMode = ComponentProps<typeof Presence>["mode"];

export function presenceMode(value: string | undefined): PresenceMode | undefined {
	return value ? (value as PresenceMode) : undefined;
}

export function OpeningThreadSkeleton() {
	return (
		<SkeletonGroup label="Opening session…" data-slot="thread-opening" className="flex flex-col gap-6 py-1">
			{[0, 1].map(i => (
				<div key={i} className="flex gap-3">
					<Skeleton circle w={28} h={28} className="shrink-0" />
					<div className="min-w-0 flex-1">
						<Skeleton w={i === 0 ? 110 : 88} h={11} rounded="sm" className="mb-2.5" />
						<SkeletonText lines={i === 0 ? 3 : 2} lineHeight={10} gap={7} lastWidth="46%" />
					</div>
				</div>
			))}
		</SkeletonGroup>
	);
}

/**
 * Host-provided presentation for the pane — sourced from the frame props.
 * Presence/verb/energy are NOT here on purpose: they derive from the pane's
 * OWN session context (useVibr), so a streaming dock or background split pane
 * lights its working tail immediately instead of waiting on the app's active
 * session to change state.
 */
export interface WorkspaceSessionChrome {
	readonly avatar: AvatarId;
	readonly showTailPresence: boolean;
	readonly showAvatars: boolean;
	readonly agentMeta: string;
	readonly placeholder: string;
	/** `false` removes the composer's built-in dictation mic. Hosts embedded where
	 *  no voice input exists (an editor tab) opt out so the button is not dead
	 *  chrome; anything else keeps today's mic. */
	readonly composerVoice?: boolean;
	readonly leftSlot?: ReactNode;
	readonly rightSlot?: ReactNode;
	readonly onSlash?: () => void;
}

/** Structural source for the chrome — both frame prop shapes satisfy it. */
export interface WorkspaceSessionChromeSource {
	readonly avatar: AvatarId;
	readonly showTailPresence: boolean;
	readonly showAvatars: boolean;
	readonly agentMeta: string;
	readonly placeholder: string;
	readonly composerVoice?: boolean;
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
		composerVoice: source.composerVoice,
		leftSlot: source.leftSlot,
		rightSlot: source.renderRightSlot(),
		onSlash: source.onSlash,
	};
}

export interface WorkspaceSessionPaneProps {
	readonly driver: SessionDriver | null | undefined;
	readonly sessionRef: SessionRef;
	readonly initialSnapshot?: SessionSnapshot | null;
	readonly chrome: WorkspaceSessionChrome;
	/** Gates the host-ui layer (split panes only mount it on the active pane). */
	readonly active?: boolean;
	readonly disabled?: boolean;
	/** Thread column classes; defaults to the workspace's centered column. */
	readonly contentClassName?: string;
	/**
	 * Host door for enriching outgoing messages. Applies to typed messages only —
	 * slash-driven goal commands bypass it.
	 */
	readonly prepareMessage?: PrepareSessionMessage;
}

export type PrepareSessionMessage = (text: string) => string | SessionMessageInput;

export function WorkspaceSessionPane({
	driver,
	sessionRef,
	initialSnapshot,
	chrome,
	active = true,
	disabled,
	contentClassName,
	prepareMessage,
}: WorkspaceSessionPaneProps) {
	return (
		<SessionProvider driver={driver} sessionRef={sessionRef} initialSnapshot={initialSnapshot ?? null}>
			<WorkspaceSessionPaneBody
				chrome={chrome}
				active={active}
				disabled={disabled}
				contentClassName={contentClassName}
				prepareMessage={prepareMessage}
			/>
		</SessionProvider>
	);
}

function WorkspaceSessionPaneBody({
	chrome,
	active,
	disabled,
	contentClassName,
	prepareMessage,
}: {
	readonly chrome: WorkspaceSessionChrome;
	readonly active: boolean;
	readonly disabled?: boolean;
	readonly contentClassName?: string;
	readonly prepareMessage?: PrepareSessionMessage;
}) {
	const session = useSessionOptional();
	// Session-true presence: this pane's own session drives the orb and verb,
	// so the working tail appears the moment THIS session starts streaming —
	// independent of which session the app shell currently considers active.
	const vibr = useVibr();
	const streaming = Boolean(session?.isStreaming);
	const opening = Boolean(session?.isOpening || session?.status === "disconnected");
	// A continued (handed-off / `/new` / plan-fresh) source session is terminal:
	// never light its "Working…" tail and gate its composer below.
	const continuation = transcriptContinuation(session?.transcript ?? []);
	return (
		<SessionTaskDropZone disabled={!session || opening}>
			<div className="relative flex min-h-0 flex-1 flex-col">
				<Thread
					presence={
						<Presence
							avatar={chrome.avatar}
							state={vibr.state}
							mode={presenceMode(vibr.mode)}
							energy={vibr.energy}
						/>
					}
					showPresence={(chrome.showTailPresence || streaming) && !continuation.continued}
					showAvatar={chrome.showAvatars}
					agentMetaFallback={chrome.agentMeta}
					emptyState={opening && (session?.transcript.length ?? 0) === 0 ? <OpeningThreadSkeleton /> : undefined}
					contentClassName={contentClassName ?? "max-w-[780px] px-7 pt-8 pb-12"}
				/>
			</div>
			<ConnectedSelectDialog />
			{active && <ConnectedHostUiLayer />}
			<WorkspaceSessionComposer
				chrome={chrome}
				disabled={Boolean(disabled) || opening}
				continuation={continuation}
				prepareMessage={prepareMessage}
			/>
		</SessionTaskDropZone>
	);
}

function WorkspaceSessionComposer({
	chrome,
	disabled,
	continuation,
	prepareMessage,
}: {
	readonly chrome: WorkspaceSessionChrome;
	readonly disabled: boolean;
	readonly continuation: SessionContinuation;
	readonly prepareMessage?: PrepareSessionMessage;
}) {
	const session = useSessionOptional();
	const draftKey = session?.sessionRef ? sessionRefKey(session.sessionRef) : "";
	const draft = useSessionComposerDraft(draftKey);
	const seededContext = useSessionComposerContext(draftKey);
	const contextTag: ComposerContextTag | null = seededContext?.badge
		? {
				label: seededContext.badge.label,
				icon: seededContext.badge.icon as ComposerContextTag["icon"],
				onRemove: () => seedSessionComposerContext(draftKey, null),
			}
		: null;
	// Drop-anywhere target: a file dropped outside a drop zone routes into THIS composer.
	useEffect(() => {
		setActiveComposerDraftKey(draftKey);
	}, [draftKey]);
	const slashCommands = useSlashCommands(draft.text);
	const fileCompletionSource = useFileCompletions();
	const argumentCompletionSource = useArgumentCompletions();
	const streaming = Boolean(session?.isStreaming);
	const goalCommand = (command: string) => () => {
		void session?.sendMessage(command);
	};
	const goalTopSlot = (
		<>
			<UsageLimitComposerSurface />
			<GoalComposerSurface
				goal={session?.goal}
				disabled={disabled || !session || continuation.continued}
				onEditGoal={objective => void session?.sendMessage(`/goal set ${objective}`)}
				onPauseGoal={goalCommand("/goal pause")}
				onResumeGoal={goalCommand("/goal resume")}
				onClearGoal={goalCommand("/goal drop")}
			/>
		</>
	);
	return (
		<div className="relative">
			<Composer
				value={draft.text}
				onChange={draft.setText}
				attachments={draft.attachments}
				onAttachmentsChange={draft.setAttachments}
				pasteAttachments={draft.pasteAttachments}
				onPasteAttachmentsChange={draft.setPasteAttachments}
				onSubmit={async (text, attachments) => {
					draft.clear();
					const contextualText = applyComposerSeededContext(text, seededContext);
					const base = prepareMessage ? prepareMessage(contextualText) : contextualText;
					if (attachments.length === 0) {
						await session?.sendMessage(base);
						return;
					}
					const images: SessionAttachment[] = attachments.map(att => ({
						kind: "image",
						mimeType: att.mimeType,
						data: att.data,
						name: att.name,
					}));
					const input: SessionMessageInput =
						typeof base === "string" ? { text: base, attachments: images } : { ...base, attachments: images };
					await session?.sendMessage(input);
				}}
				onStop={() => void session?.interruptRunForQueuedMessage()}
				streaming={streaming}
				disabled={disabled || !session || continuation.continued}
				placeholder={
					continuation.continued
						? "This session was continued — open the new session to keep working."
						: chrome.placeholder
				}
				contextTag={contextTag}
				primedSkills={seededContext?.skills}
				topSlot={goalTopSlot}
				leftSlot={chrome.leftSlot}
				rightSlot={chrome.rightSlot}
				voice={chrome.composerVoice === false ? false : undefined}
				onSlash={chrome.onSlash}
				slashCommands={slashCommands}
				fileCompletionSource={fileCompletionSource}
				argumentCompletionSource={argumentCompletionSource}
			/>
			{continuation.continued && <ContinuedComposerOverlay continuation={continuation} />}
		</div>
	);
}

// Overlay pinned over a continued source session's composer: states where the
// conversation moved and offers a one-click jump to the successor session.
function ContinuedComposerOverlay({ continuation }: { readonly continuation: SessionContinuation }) {
	const session = useSessionOptional();
	const navigation = useSessionNavigation();
	const workspaceId = session?.sessionRef?.workspaceId;
	const toSessionId = continuation.toSessionId;
	const canOpen = Boolean(navigation.openSession && workspaceId && toSessionId);
	return (
		<div
			data-slot="continued-composer-overlay"
			className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[14px] bg-fr-bg/85 backdrop-blur-sm"
		>
			<span className="flex items-center gap-1.5 font-secondary text-fr-xs text-fr-text-2">
				<Icon name="branch" size={12} className="text-fr-text-3" />
				{continuationLabel(continuation.reason)}
			</span>
			{canOpen && (
				<Button
					size="sm"
					variant="outline"
					className="h-7 gap-1 px-2.5 text-fr-xs"
					onClick={() => {
						if (workspaceId && toSessionId) navigation.openSession?.({ workspaceId, sessionId: toSessionId });
					}}
				>
					<Icon name="branch" size={12} />
					Open session
				</Button>
			)}
		</div>
	);
}
