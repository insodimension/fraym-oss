import { useMemo, type ReactNode } from "react";

import {
  type AgentEventStream,
  type ApprovalResponseEvent,
  createEventStreamSessionDriver,
} from "@fraym-ai/driver";

import { ContextUsage } from "./Composer";
import { Code } from "./elements/code";
import { classNames } from "./elements/utils";
import type { ComposerProps } from "./features/composer";
import { WorkspaceSessionPane } from "./shell/workspace-session-pane";

export interface SessionThreadProps {
  source: AgentEventStream;
  title?: string;
  className?: string;
  placeholder?: string;
  model?: string;
  contextUsage?: number;
  composerLeftSlot?: ReactNode;
  composerRightSlot?: ReactNode;
  onSubmit?: ComposerProps["onSubmit"];
  onStop?: () => void;
  onApprovalResponse?: (event: ApprovalResponseEvent) => void;
}

/**
 * The complete conversation surface — transcript + composer — over any
 * `AgentEventStream`. Renders through the SAME workspace session pane the app
 * shell uses (one thread implementation everywhere); the stream is adapted
 * into the session-driver contract client-side.
 */
export function SessionThread({
  className,
  composerLeftSlot,
  composerRightSlot,
  contextUsage = 0,
  model = "Agent",
  onApprovalResponse,
  onStop,
  onSubmit,
  placeholder,
  source,
  title = "Agent session",
}: SessionThreadProps) {
  const driver = useMemo(
    () =>
      createEventStreamSessionDriver(source, {
        title,
        model,
        prompt: (input) => {
          onSubmit?.(input.text, []);
        },
        cancel: onStop,
        respondToApproval: onApprovalResponse,
      }),
    // The adapter binds once per stream; labels/handlers ride the initial options.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source],
  );
  return (
    <section aria-label={title} className={classNames("fraym-session-thread", className)}>
      <WorkspaceSessionPane
        driver={driver}
        sessionRef={driver.sessionRef}
        chrome={{
          avatar: "nebula",
          showTailPresence: true,
          showAvatars: false,
          agentMeta: model,
          placeholder: placeholder ?? "Reply, or type / for commands...",
          leftSlot: composerLeftSlot ?? <Code>{model}</Code>,
          rightSlot: composerRightSlot ?? <ContextUsage value={contextUsage} />,
        }}
        active
      />
    </section>
  );
}
