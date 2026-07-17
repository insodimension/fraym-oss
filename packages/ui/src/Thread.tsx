import type { ReactNode } from "react";

import type { AgentEventStream } from "@fraym/driver";

import { Card, CardContent } from "./elements/Card";
import { ScrollArea } from "./elements/ScrollArea";
import { StreamingMarkdown } from "./elements/StreamingMarkdown";
import { ThinkingDots } from "./elements/ThinkingDots";
import { classNames } from "./elements/utils";
import type { ThreadState } from "./thread-state";
import { ToolCall } from "./tool-renderers/ToolCall";
import { useAgentSession } from "./useAgentSession";

export interface ThreadProps {
  source: AgentEventStream;
  title?: string;
  className?: string;
  transcriptFooter?: ReactNode;
}

export interface ThreadViewProps extends Omit<ThreadProps, "source"> {
  state: ThreadState;
}

export function ThreadView({ className, state, title = "Fraym thread", transcriptFooter }: ThreadViewProps) {
  return (
    <section aria-label={title} className={classNames("fraym-thread", className)}>
      <ScrollArea className="fraym-thread__scroll-area">
        <div className="fraym-thread__messages">
          {state.messages.map((message) => (
            <article className={`fraym-thread__message fraym-thread__message--${message.role}`} key={message.id}>
              <span className="fraym-thread__role">{message.role}</span>
              <div className="fraym-thread__content">
                  {message.role === "assistant" ? (
                    <StreamingMarkdown>{message.content}</StreamingMarkdown>
                  ) : (
                    <p>{message.content}</p>
                  )}
              </div>
            </article>
          ))}

          {state.toolCalls.map((toolCall) => (
            <div className="fraym-thread__tool-call" key={toolCall.id}>
              <ToolCall call={toolCall} />
            </div>
          ))}

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

export function Thread({ className, source, title, transcriptFooter }: ThreadProps) {
  const { state } = useAgentSession(source);
  const viewProps = {
    state,
    ...(className === undefined ? {} : { className }),
    ...(title === undefined ? {} : { title }),
    ...(transcriptFooter === undefined ? {} : { transcriptFooter }),
  };
  return <ThreadView {...viewProps} />;
}
