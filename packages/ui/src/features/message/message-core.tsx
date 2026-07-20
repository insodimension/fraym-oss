import { Fragment } from "react";
import { CompactionSplit, type CompactionSplitProps } from "../../elements/compaction-split";
import { SessionContinuationSplit } from "../../elements/session-continuation-split";
import { Shimmer } from "../../elements/shimmer";
import type { VibrMode } from "../../hooks/session-types";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";
import { DEFAULT_MESSAGE_BLOCK_RENDERERS } from "../../registries/default-renderers";
import {
	type MessageBlockContext,
	type MessageBlockRendererMap,
	useMessageBlockRenderers,
} from "../../registries/message-block-registry";
import { MessageBody } from "./messages/message-body";

export type KnownMessageBlockType =
	| "text"
	| "tool"
	| "diff"
	| "actions"
	| "surface"
	| "reasoning"
	| "notice"
	| "retry"
	| "image"
	| "file"
	| "tokenUsage";

export interface MessageBlock {
	/** Known chat-core block types, plus any custom type a renderer registers. */
	readonly type: KnownMessageBlockType | (string & {});
	readonly [key: string]: unknown;
}

export interface MessageData {
	readonly role: "user" | "agent" | "divider";
	readonly blocks: readonly MessageBlock[];
	/** Transcript entry id — the session-tree node a "branch from here" action targets. */
	readonly id?: string;
	/** ISO timestamp of the message, surfaced in the hover action bar. */
	readonly timestamp?: string;
	readonly name?: string;
	readonly meta?: string;
	/** Engine custom-message type; when a `msg:<customType>` surface renderer is registered, it renders this message. */
	readonly customType?: string;
	/** Structured payload for the `msg:<customType>` surface renderer (mirrors the Engine custom message's `details`). */
	readonly payload?: unknown;
	readonly thinking?: boolean;
	readonly activity?: { verb: string; mode: VibrMode; energy: number };
	readonly variant?: "compacting" | "done" | "continuation";
	readonly auto?: boolean;
	readonly freed?: number;
	/** Pre-compaction token count for a "done" compaction divider. */
	readonly tokens?: number;
	/** One-line compaction summary (the "compact context"). */
	readonly summary?: string;
	/** Continuation divider: the successor/side session (journal `session_continuation` entry). */
	readonly toSessionId?: string;
	/** Continuation provenance: "handoff" | "new" | "plan" | "sidequest" | … */
	readonly reason?: string;
	/** Render the agent turn's work trace (reasoning + tool calls) as a Codex-style "Worked for Xs" disclosure, keeping the trailing answer visible. */
	readonly collapse?: "worked";
	/** ISO timestamp of the turn's first delta — drives the live "Worked for Xs" ticker. */
	readonly turnStartedAt?: string;
	/** Frozen run wall-clock (ms) once the turn settles (from the `turnEnded` driver event). */
	readonly turnDurationMs?: number;
}

export interface MessageProps {
	readonly message: MessageData;
	readonly isLast?: boolean;
	readonly isStreaming?: boolean;
	/** Render the inline presence/working row under this message (default true). Connected threads pin it in the viewport tail instead. */
	readonly showActivity?: boolean;
	readonly renderBlock?: (block: MessageBlock, index: number) => React.ReactNode;
	/** Per-type renderer overrides; take precedence over the block registry. */
	readonly components?: MessageBlockRendererMap;
	readonly presence?: React.ReactNode;
	readonly showHeader?: boolean;
	readonly showAvatar?: boolean;
	readonly className?: string;
}

const MESSAGE_AVATARS = {
	user: {
		className: "bg-fr-surface-3 text-fr-text-2",
		icon: "user",
		strokeWidth: 2,
	},
	agent: {
		className: "bg-transparent text-fr-accent",
		icon: "spark",
		strokeWidth: 1.7,
	},
} as const;

function MessageAvatar({
	messageRole,
	showAvatar,
}: {
	readonly messageRole: "user" | "agent";
	readonly showAvatar?: boolean;
}) {
	if (!showAvatar) return null;
	const avatar = MESSAGE_AVATARS[messageRole];
	return (
		<div className={cn("flex size-[22px] shrink-0 items-center justify-center rounded-md", avatar.className)}>
			<Icon name={avatar.icon} size={13} strokeWidth={avatar.strokeWidth} />
		</div>
	);
}

function MessageHeaderMeta({ meta }: { readonly meta?: string }) {
	if (!meta) return null;
	return <span className="ml-auto font-secondary text-fr-2xs text-fr-text-3 max-[520px]:hidden">{meta}</span>;
}

export function MessageHeader({
	messageRole,
	name,
	meta,
	showAvatar = true,
}: {
	messageRole: "user" | "agent";
	name: string;
	meta?: string;
	showAvatar?: boolean;
}) {
	return (
		<div className="mb-[9px] flex items-center gap-[9px]">
			<MessageAvatar messageRole={messageRole} showAvatar={showAvatar} />
			<span className="text-fr-sm font-semibold tracking-fr-tight">{name}</span>
			<MessageHeaderMeta meta={meta} />
		</div>
	);
}

type ResolvedMessageBlockRenderer = (block: MessageBlock, index: number) => React.ReactNode;

interface MessageBlockRendererSources {
	readonly components?: MessageBlockRendererMap;
	readonly registry: MessageBlockRendererMap;
	readonly renderBlock?: MessageProps["renderBlock"];
}

function renderMessageBlockFromSources(
	block: MessageBlock,
	ctx: MessageBlockContext,
	{ components, registry, renderBlock }: MessageBlockRendererSources,
): React.ReactNode {
	const override = components?.[block.type];
	if (override) return override(block, ctx);
	const fromRegistry = registry[block.type];
	if (fromRegistry) return fromRegistry(block, ctx);
	if (renderBlock) return renderBlock(block, ctx.index) ?? null;
	const fallback = DEFAULT_MESSAGE_BLOCK_RENDERERS[block.type];
	return fallback ? fallback(block, ctx) : null;
}

function useResolvedMessageBlockRenderer({
	message,
	isLast,
	isStreaming,
	renderBlock,
	components,
}: Pick<
	MessageProps,
	"message" | "isLast" | "isStreaming" | "renderBlock" | "components"
>): ResolvedMessageBlockRenderer {
	const registry = useMessageBlockRenderers();
	return (block, index) =>
		renderMessageBlockFromSources(
			block,
			{ index, message, isLast, isStreaming },
			{ components, registry, renderBlock },
		);
}

export function MessageDivider({ message }: { readonly message: MessageData }) {
	if (message.variant === "continuation") {
		if (!message.toSessionId) return null;
		return (
			<SessionContinuationSplit toSessionId={message.toSessionId} reason={message.reason} className="my-5 px-0.5" />
		);
	}
	return (
		<CompactionSplit
			variant={message.variant as CompactionSplitProps["variant"]}
			auto={message.auto}
			tokens={message.tokens}
			summary={message.summary}
			className="my-5 px-0.5"
		/>
	);
}

function MessageBlockList({
	blocks,
	renderBlock,
}: {
	readonly blocks: readonly MessageBlock[];
	readonly renderBlock: ResolvedMessageBlockRenderer;
}) {
	return blocks.map((block, index) => <Fragment key={index}>{renderBlock(block, index)}</Fragment>);
}

function UserMessage({
	message,
	renderBlock,
	showHeader,
	showAvatar,
	className,
}: {
	readonly message: MessageData;
	readonly renderBlock: ResolvedMessageBlockRenderer;
	readonly showHeader?: boolean;
	readonly showAvatar?: boolean;
	readonly className?: string;
}) {
	return (
		<div
			data-slot="message"
			data-role="user"
			className={cn("mb-[22px] flex justify-end max-[520px]:justify-start", className)}
		>
			<div className="min-w-0 max-w-[74%] max-[520px]:max-w-full">
				{showHeader && showAvatar && (
					<MessageHeader
						messageRole="user"
						name={message.name ?? "You"}
						meta={message.meta}
						showAvatar={showAvatar}
					/>
				)}
				<div className="inline-block max-w-full break-words rounded-[14px] border border-fr-border-soft bg-fr-surface-2 px-3.5 py-2.5 text-sm text-fr-text max-[520px]:block max-[520px]:w-full [&_p]:m-0 [&_p]:text-pretty">
					<MessageBlockList blocks={message.blocks} renderBlock={renderBlock} />
				</div>
			</div>
		</div>
	);
}

function isLiveMessage(isStreaming?: boolean, isLast?: boolean): boolean {
	return Boolean(isStreaming && isLast);
}

function AgentHeaderSlot({
	message,
	showHeader,
	showAvatar,
}: {
	readonly message: MessageData;
	readonly showHeader?: boolean;
	readonly showAvatar?: boolean;
}) {
	if (!showHeader || !showAvatar) return null;
	return (
		<MessageHeader
			messageRole="agent"
			name={message.name ?? "Assistant"}
			meta={message.meta}
			showAvatar={showAvatar}
		/>
	);
}

function liveActivityLabel(activity: MessageData["activity"]): string {
	return `${activity?.verb ?? "Thinking"}...`;
}

function AgentPresenceRow({
	showActivity,
	presence,
	live,
	activity,
}: {
	readonly showActivity: boolean;
	readonly presence?: React.ReactNode;
	readonly live: boolean;
	readonly activity: MessageData["activity"];
}) {
	if (!showActivity || (!presence && !live)) return null;
	return (
		<div data-slot="presence" className="mt-[22px] mb-2 flex items-center gap-[11px]">
			{presence}
			{live && <Shimmer className="text-fr-base font-medium">{liveActivityLabel(activity)}</Shimmer>}
		</div>
	);
}

function AgentMessage({
	message,
	isLast,
	isStreaming,
	showActivity,
	presence,
	showHeader,
	showAvatar,
	className,
}: {
	readonly message: MessageData;
	readonly isLast?: boolean;
	readonly isStreaming?: boolean;
	readonly showActivity: boolean;
	readonly presence?: React.ReactNode;
	readonly showHeader?: boolean;
	readonly showAvatar?: boolean;
	readonly className?: string;
}) {
	const live = isLiveMessage(isStreaming, isLast);
	return (
		<div data-slot="message" data-role="agent" className={cn("relative mb-[26px] min-w-0", className)}>
			<AgentHeaderSlot message={message} showHeader={showHeader} showAvatar={showAvatar} />
			<MessageBody message={message} isLast={isLast} isStreaming={isStreaming} />
			<AgentPresenceRow showActivity={showActivity} presence={presence} live={live} activity={message.activity} />
		</div>
	);
}

export function Message({
	message: m,
	isLast,
	isStreaming,
	showActivity = true,
	renderBlock,
	components,
	presence,
	showHeader,
	showAvatar,
	className,
}: MessageProps) {
	const renderResolvedBlock = useResolvedMessageBlockRenderer({
		message: m,
		isLast,
		isStreaming,
		renderBlock,
		components,
	});
	if (m.role === "divider") {
		return <MessageDivider message={m} />;
	}

	if (m.role === "user") {
		return (
			<UserMessage
				message={m}
				renderBlock={renderResolvedBlock}
				showHeader={showHeader}
				showAvatar={showAvatar}
				className={className}
			/>
		);
	}

	return (
		<AgentMessage
			message={m}
			isLast={isLast}
			isStreaming={isStreaming}
			showActivity={showActivity}
			presence={presence}
			showHeader={showHeader}
			showAvatar={showAvatar}
			className={className}
		/>
	);
}

export function TextBubble({ html, className }: { html: string; className?: string }) {
	return (
		<div
			data-slot="text-bubble"
			className={cn(
				"break-words text-sm text-fr-text [&_p]:mb-[10px] [&_p]:text-pretty [&_p:last-child]:mb-0 [&_ol]:my-[4px] [&_ol]:mb-[10px] [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-[4px] [&_ul]:mb-[10px] [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-[5px] [&_li]:pl-1 [&_li::marker]:text-fr-text-3 [&_code]:break-words [&_code]:rounded-[5px] [&_code]:border [&_code]:border-fr-border-soft [&_code]:bg-fr-surface-2 [&_code]:px-[5px] [&_code]:py-px [&_code]:font-secondary [&_code]:text-fr-sm [&_code]:text-[var(--fr-inline-code)]",
				className,
			)}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
