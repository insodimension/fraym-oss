import { useEffect, useReducer } from "react";

import type { AgentEventStream } from "@fraym/driver";

import { Badge } from "./elements/Badge";
import { Card, CardContent } from "./elements/Card";
import { ScrollArea } from "./elements/ScrollArea";
import { StreamingMarkdown } from "./elements/StreamingMarkdown";
import { ThinkingDots } from "./elements/ThinkingDots";
import { classNames } from "./elements/utils";
import { createThreadState, reduceThreadEvent } from "./thread-state";

export interface ThreadProps {
  source: AgentEventStream;
  title?: string;
  className?: string;
}

export function Thread({ className, source, title = "Fraym thread" }: ThreadProps) {
  const [state, dispatch] = useReducer(reduceThreadEvent, undefined, createThreadState);

  useEffect(() => source.subscribe(dispatch), [source]);

  return (
    <section aria-label={title} className={classNames("fraym-thread", className)}>
      <ScrollArea className="fraym-thread__scroll-area">
        <div className="fraym-thread__messages">
          {state.messages.map((message) => (
            <article className={`fraym-thread__message fraym-thread__message--${message.role}`} key={message.id}>
              <span className="fraym-thread__role">{message.role}</span>
              <Card>
                <CardContent>
                  {message.role === "assistant" ? (
                    <StreamingMarkdown>{message.content}</StreamingMarkdown>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </CardContent>
              </Card>
            </article>
          ))}

          {state.toolCalls.map((toolCall) => (
            <div className="fraym-thread__tool-call" key={toolCall.id}>
              <Badge tone={toolCall.status === "failed" ? "danger" : "accent"}>
                Tool: {toolCall.name} / {toolCall.status}
              </Badge>
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
        </div>
      </ScrollArea>
    </section>
  );
}
