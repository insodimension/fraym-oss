import type { ReactNode } from "react";

import type { AgentEventStream, ApprovalResponseEvent } from "@fraym/driver";

import { ApprovalCard } from "./ApprovalCard";
import { Card, CardContent } from "./elements/Card";
import { ScrollArea } from "./elements/ScrollArea";
import { StreamingMarkdown } from "./elements/StreamingMarkdown";
import { ThinkingDots } from "./elements/ThinkingDots";
import { classNames } from "./elements/utils";
import { ReasoningRow } from "./ReasoningRow";
import type { ThreadState } from "./thread-state";
import { ToolCall } from "./tool-renderers/ToolCall";
import { useAgentSession } from "./useAgentSession";

export interface ThreadProps {
  source: AgentEventStream;
  title?: string;
  className?: string;
  transcriptFooter?: ReactNode;
  onApprovalResponse?: (event: ApprovalResponseEvent) => void;
}

export interface ThreadViewProps extends Omit<ThreadProps, "source"> {
  state: ThreadState;
}

export function ThreadView({
  className,
  onApprovalResponse,
  state,
  title = "Fraym thread",
  transcriptFooter,
}: ThreadViewProps) {
  const respondToApproval = (approvalId: string, decision: ApprovalResponseEvent["decision"]) => {
    if (state.sessionId === null) {
      return;
    }

    onApprovalResponse?.({
      type: "approval.response",
      sessionId: state.sessionId,
      approvalId,
      decision,
    });
  };

  return (
    <section aria-label={title} className={classNames("fraym-thread", className)}>
      <ScrollArea className="fraym-thread__scroll-area">
        <div className="fraym-thread__messages">
          {state.items.map((item) => {
            if (item.kind === "message") {
              const message = state.messages.find((candidate) => candidate.id === item.id);
              return message === undefined ? null : (
                <article className={`fraym-thread__message fraym-thread__message--${message.role}`} key={`${item.kind}-${item.id}`}>
                  <span className="fraym-thread__role">{message.role}</span>
                  <div className="fraym-thread__content">
                    {message.role === "assistant" ? (
                      <StreamingMarkdown>{message.content}</StreamingMarkdown>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                </article>
              );
            }

            if (item.kind === "tool") {
              const toolCall = state.toolCalls.find((candidate) => candidate.id === item.id);
              return toolCall === undefined ? null : (
                <div className="fraym-thread__tool-call" key={`${item.kind}-${item.id}`}>
                  <ToolCall call={toolCall} />
                </div>
              );
            }

            if (item.kind === "approval") {
              const approval = state.approvals.find((candidate) => candidate.id === item.id);
              return approval === undefined ? null : (
                <ApprovalCard
                  approval={approval}
                  key={`${item.kind}-${item.id}`}
                  onRespond={(decision) => respondToApproval(approval.id, decision)}
                />
              );
            }

            const reasoning = state.reasoning.find((candidate) => candidate.messageId === item.id);
            return reasoning === undefined ? null : (
              <ReasoningRow key={`${item.kind}-${item.id}`} reasoning={reasoning} />
            );
          })}

          {state.waiting ? (
            <div className="fraym-thread__thinking">
              <ThinkingDots />
            </div>
          ) : null}

          {state.error ? (
            <Card className="fraym-thread__error" role="alert">
              <CardContent>
                <strong>Agent error</strong>
                <p>{state.error}</p>
              </CardContent>
            </Card>
          ) : null}

          {transcriptFooter ? <div className="fraym-thread__footer">{transcriptFooter}</div> : null}
        </div>
      </ScrollArea>
    </section>
  );
}

export function Thread({ className, onApprovalResponse, source, title, transcriptFooter }: ThreadProps) {
  const { state } = useAgentSession(source);
  const viewProps = {
    state,
    ...(className === undefined ? {} : { className }),
    ...(title === undefined ? {} : { title }),
    ...(transcriptFooter === undefined ? {} : { transcriptFooter }),
    ...(onApprovalResponse === undefined ? {} : { onApprovalResponse }),
  };
  return <ThreadView {...viewProps} />;
}
