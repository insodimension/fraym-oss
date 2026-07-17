import type { ReactNode } from "react";

import type { AgentEventStream } from "@fraym/driver";

import {
  Composer,
  ContextUsage,
  type ComposerSubmission,
} from "./Composer";
import type { SlashCommand } from "./composer-state";
import { Code } from "./elements/Code";
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
  commands?: readonly SlashCommand[];
  composerLeftSlot?: ReactNode;
  composerRightSlot?: ReactNode;
  transcriptFooter?: ReactNode;
  onSubmit?: (submission: ComposerSubmission) => void;
  onStop?: () => void;
  onCommand?: (command: SlashCommand) => void;
}

export function SessionThread({
  className,
  commands,
  composerLeftSlot,
  composerRightSlot,
  contextUsage = 42,
  model = "Agent",
  onCommand,
  onStop,
  onSubmit,
  placeholder,
  source,
  title = "Agent session",
  transcriptFooter,
}: SessionThreadProps) {
  const session = useAgentSession(source);
  const stop = () => {
    session.stop();
    onStop?.();
  };
  const composerProps = {
    streaming: session.streaming,
    leftSlot: composerLeftSlot ?? <Code>{model}</Code>,
    rightSlot: composerRightSlot ?? <ContextUsage value={contextUsage} />,
    onStop: stop,
    ...(commands === undefined ? {} : { commands }),
    ...(onCommand === undefined ? {} : { onCommand }),
    ...(onSubmit === undefined ? {} : { onSubmit }),
    ...(placeholder === undefined ? {} : { placeholder }),
  };

  return (
    <section aria-label={title} className={classNames("fraym-session-thread", className)}>
      <ThreadView state={session.state} title={`${title} transcript`} transcriptFooter={transcriptFooter} />
      <Composer {...composerProps} />
    </section>
  );
}
