import { useState, type ReactNode } from "react";

import type { AgentEventStream, ApprovalResponseEvent } from "@fraym/driver";

import {
  Composer,
  type ComposerProps,
} from "./features/composer";
import { ContextUsage } from "./Composer";
import { Code } from "./elements/code";
import { classNames } from "./elements/utils";
import { ThreadView } from "./Thread";
import { useAgentSession } from "./useAgentSession";

export interface SessionThreadProps {
  source: AgentEventStream;
  title?: string;
  className?: string;
  placeholder?: string;
  model?: string;
  contextUsage?: number;
  slashCommands?: ComposerProps["slashCommands"];
  composerLeftSlot?: ReactNode;
  composerRightSlot?: ReactNode;
  transcriptFooter?: ReactNode;
  onSubmit?: ComposerProps["onSubmit"];
  onStop?: () => void;
  onApprovalResponse?: (event: ApprovalResponseEvent) => void;
}

export function SessionThread({
  className,
  slashCommands,
  composerLeftSlot,
  composerRightSlot,
  contextUsage = 42,
  model = "Agent",
  onApprovalResponse,
  onStop,
  onSubmit,
  placeholder,
  source,
  title = "Agent session",
  transcriptFooter,
}: SessionThreadProps) {
  const session = useAgentSession(source);
  const [composerValue, setComposerValue] = useState("");
  const stop = () => {
    session.stop();
    onStop?.();
  };
  const submit: ComposerProps["onSubmit"] = (value, attachments) => {
    onSubmit?.(value, attachments);
    setComposerValue("");
  };
  const composerProps = {
    value: composerValue,
    onChange: setComposerValue,
    onSubmit: submit,
    streaming: session.streaming,
    leftSlot: composerLeftSlot ?? <Code>{model}</Code>,
    rightSlot: composerRightSlot ?? <ContextUsage value={contextUsage} />,
    onStop: stop,
    ...(slashCommands === undefined ? {} : { slashCommands }),
    ...(placeholder === undefined ? {} : { placeholder }),
  };
  const threadProps = {
    state: session.state,
    title: `${title} transcript`,
    ...(onApprovalResponse === undefined ? {} : { onApprovalResponse }),
    ...(transcriptFooter === undefined ? {} : { transcriptFooter }),
  };

  return (
    <section aria-label={title} className={classNames("fraym-session-thread", className)}>
      <ThreadView {...threadProps} />
      <Composer {...composerProps} />
    </section>
  );
}
