import { Fragment, type ReactNode } from "react";
import { CompactionSplit } from "../../elements/CompactionSplit";
import { SessionContinuationSplit } from "../../elements/SessionContinuationSplit";
import { Shimmer } from "../../elements/Shimmer";
import { classNames } from "../../elements/utils";
import type { MessageBlockRendererMap } from "../../registries/message-block-registry";
import type { KnownMessageBlockType, MessageBlock, MessageData } from "../../registries/message-block-registry";
import { MessageBody, useResolvedBlockRenderer } from "./messages/message-body";

export type { KnownMessageBlockType, MessageBlock, MessageData } from "../../registries/message-block-registry";
export interface MessageProps { readonly message: MessageData; readonly isLast?: boolean; readonly isStreaming?: boolean; readonly showActivity?: boolean; readonly renderBlock?: (block: MessageBlock, index: number) => ReactNode; readonly components?: MessageBlockRendererMap; readonly presence?: ReactNode; readonly showHeader?: boolean; readonly showAvatar?: boolean; readonly className?: string }

export function MessageHeader({ messageRole, name, meta, showAvatar = true }: { readonly messageRole: "user" | "agent"; readonly name: string; readonly meta?: string | undefined; readonly showAvatar?: boolean }) { return <header className="fraym-message__header">{showAvatar ? <span aria-hidden="true" className={`fraym-message__avatar fraym-message__avatar--${messageRole}`}>{messageRole === "user" ? "●" : "✦"}</span> : null}<strong>{name}</strong>{meta ? <span>{meta}</span> : null}</header>; }
export function MessageDivider({ message }: { readonly message: MessageData }) { if (message.variant === "continuation" && message.toSessionId) return <SessionContinuationSplit toSessionId={message.toSessionId} {...(message.reason ? { reason: message.reason } : {})} />; const props = { variant: message.variant === "compacting" ? "compacting" as const : "done" as const, ...(message.auto === undefined ? {} : { auto: message.auto }), ...(message.summary ? { summary: message.summary } : {}), ...(message.tokens === undefined ? {} : { tokens: message.tokens }) }; return <CompactionSplit {...props} />; }

export function Message({ message, isLast, isStreaming, showActivity = true, renderBlock, components, presence, showHeader = false, showAvatar = false, className }: MessageProps) {
  const resolved = useResolvedBlockRenderer(message, isLast, isStreaming, components, renderBlock);
  if (message.role === "divider") return <MessageDivider message={message} />;
  const role = message.role === "assistant" ? "agent" : message.role;
  const live = Boolean(role === "agent" && isLast && isStreaming);
  return <article className={classNames("fraym-message", `fraym-message--${role}`, className)} data-role={role} data-slot="message">{showHeader ? <MessageHeader messageRole={role} name={message.name ?? (role === "user" ? "You" : "Assistant")} meta={message.meta} showAvatar={showAvatar} /> : null}{role === "user" ? <div className="fraym-message__bubble">{message.blocks.map((block, index) => <Fragment key={index}>{resolved(block, index)}</Fragment>)}</div> : <MessageBody components={components} isLast={isLast} isStreaming={isStreaming} message={message} />}{showActivity && (presence || live) ? <div className="fraym-message__presence">{presence}{live ? <Shimmer>{message.activity?.verb ?? "Thinking"}…</Shimmer> : null}</div> : null}</article>;
}
export function TextBubble({ html, className }: { readonly html: string; readonly className?: string }) { return <div className={classNames("fraym-text-bubble", className)} data-slot="text-bubble" dangerouslySetInnerHTML={{ __html: html }} />; }
