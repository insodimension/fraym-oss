import type { ReactNode } from "react";
import type { AgentEventStream, ApprovalResponseEvent } from "@fraym/driver";
import { ApprovalCard } from "../../ApprovalCard";
import { Card, CardContent } from "../../elements/Card";
import { classNames } from "../../elements/utils";
import type { MessageBlockRendererMap } from "../../registries/message-block-registry";
import type { ThreadMessage as StateMessage, ThreadState } from "../../thread-state";
import { ToolCall } from "../../tool-renderers/ToolCall";
import { useAgentSession } from "../../useAgentSession";
import type { MessageData } from "../message";
import type { FraymDensity } from "../surface-kit";
import { MessageThreadViewport } from "./message-thread-viewport";
import { ThreadMessage } from "./thread-message";
import { WorkingTail } from "./working-tail";

export interface ThreadProps { readonly source: AgentEventStream; readonly title?: string; readonly className?: string; readonly contentClassName?: string; readonly transcriptFooter?: ReactNode; readonly onApprovalResponse?: (event: ApprovalResponseEvent) => void; readonly components?: MessageBlockRendererMap; readonly density?: FraymDensity; readonly showHeader?: boolean; readonly showAvatar?: boolean; readonly emptyState?: ReactNode }
export interface ThreadViewProps extends Omit<ThreadProps, "source"> { readonly state: ThreadState }
export function toThreadMessage(message: StateMessage): MessageData { return { id: message.id, role: message.role === "assistant" ? "agent" : "user", blocks: [{ type: "text", text: message.content }] }; }
export function lastUserMessageId(messages: readonly StateMessage[]): string | null { for (let index = messages.length - 1; index >= 0; index -= 1) if (messages[index]?.role === "user") return messages[index]!.id; return null; }

export function ThreadView({ className, contentClassName, components, density = "comfortable", emptyState, onApprovalResponse, showAvatar = false, showHeader = false, state, title = "Conversation", transcriptFooter }: ThreadViewProps) { const respond = (approvalId: string, decision: ApprovalResponseEvent["decision"]) => { if (state.sessionId) onApprovalResponse?.({ type: "approval.response", sessionId: state.sessionId, approvalId, decision }); }; return <section aria-label={title} className={classNames("fraym-thread", className)} data-density={density}><MessageThreadViewport contentClassName={contentClassName} footer={state.waiting ? <WorkingTail streaming verb="Thinking" /> : transcriptFooter} pinKey={lastUserMessageId(state.messages) ?? ""}><div className="fraym-thread__messages">{state.items.length ? state.items.map((item, index) => { if (item.kind === "message") { const message = state.messages.find((candidate) => candidate.id === item.id); return message ? <ThreadMessage components={components} isLast={index === state.items.length - 1} isStreaming={state.phase === "running"} key={`message-${item.id}`} message={toThreadMessage(message)} showAvatar={showAvatar} showHeader={showHeader} /> : null; } if (item.kind === "tool") { const call = state.toolCalls.find((candidate) => candidate.id === item.id); return call ? <ToolCall call={call} key={`tool-${item.id}`} /> : null; } if (item.kind === "approval") { const approval = state.approvals.find((candidate) => candidate.id === item.id); return approval ? <ApprovalCard approval={approval} key={`approval-${item.id}`} onRespond={(decision) => respond(approval.id, decision)} /> : null; } const reasoning = state.reasoning.find((candidate) => candidate.messageId === item.id); return reasoning ? <ThreadMessage isLast={index === state.items.length - 1} isStreaming={reasoning.streaming} key={`reasoning-${item.id}`} message={{ id: item.id, role: "agent", blocks: [{ type: "reasoning", text: reasoning.content }] }} showAvatar={showAvatar} showHeader={false} /> : null; }) : emptyState}{state.error ? <Card className="fraym-thread__error" role="alert"><CardContent><strong>Agent error</strong><p>{state.error}</p></CardContent></Card> : null}</div></MessageThreadViewport></section>; }
export function Thread({ source, ...props }: ThreadProps) { const { state } = useAgentSession(source); return <ThreadView {...props} state={state} />; }
