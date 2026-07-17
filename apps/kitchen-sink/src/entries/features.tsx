import { useMemo, useState } from "react";
import type { ApprovalDecision } from "@fraym/driver";
import { codingSessionFixture, createReplayDriver } from "@fraym/driver";
import { ApprovalCard, Badge, Button, ReasoningRow, SessionThread } from "@fraym/ui";

import { booleanValue, numberValue, stringValue, type Entry, type DemoProps } from "../entry";

function ThreadDemo({ values }: DemoProps) {
  const [replayId, setReplayId] = useState(0);
  const delay = numberValue(values, "delay", 260);
  const loop = booleanValue(values, "loop", true);
  const source = useMemo(
    () => createReplayDriver(codingSessionFixture, {
      delay,
      loop,
      autoRespond: { decision: "approved", delay: delay * 2 },
    }),
    [delay, loop, replayId],
  );

  return (
    <div className="sink-demo-stack sink-thread-demo">
      <div className="sink-demo-row sink-demo-row--between">
        <Badge tone={loop ? "success" : "neutral"}>{loop ? "Looping replay" : "Single replay"}</Badge>
        <Button size="sm" variant="secondary" onClick={() => setReplayId((value) => value + 1)}>
          Restart replay
        </Button>
      </div>
      <SessionThread
        contextUsage={38}
        model="fraym/replay"
        onApprovalResponse={source.respondToApproval}
        source={source}
        title="Coding agent replay"
      />
    </div>
  );
}

function ApprovalSample({ initialDecision, prompt }: { initialDecision: ApprovalDecision | null; prompt: string }) {
  const [decision, setDecision] = useState<ApprovalDecision | null>(initialDecision);
  return (
    <ApprovalCard
      approval={{ id: "approval-demo", prompt, decision }}
      onRespond={setDecision}
    />
  );
}

function ApprovalDemo({ values }: DemoProps) {
  const status = stringValue(values, "status", "pending");
  const prompt = stringValue(values, "prompt", "Apply the proposed changes to the workspace?");
  const decision = status === "approved" || status === "rejected" ? status : null;
  return <ApprovalSample initialDecision={decision} key={status} prompt={prompt} />;
}

function ReasoningDemo({ values }: DemoProps) {
  const streaming = booleanValue(values, "streaming", true);
  const expanded = booleanValue(values, "expanded", false);
  return (
    <ReasoningRow
      defaultExpanded={expanded}
      key={`${streaming}-${expanded}`}
      reasoning={{
        messageId: "reasoning-demo",
        content: "The reducer already preserves event identity. I should extend the ordered transcript instead of creating a second rendering path.",
        streaming,
      }}
    />
  );
}

export const featureEntries = [
  {
    id: "streaming-thread",
    title: "Session thread",
    group: "features",
    tier: "Feature",
    description: "Render a complete agent session from a typed event stream with one shared transcript and composer surface.",
    importCode: `import { SessionThread } from "@fraym/ui"`,
    Demo: ThreadDemo,
    knobs: [
      { prop: "delay", label: "Event delay", kind: "number", defaultValue: 260, min: 40, max: 1000, step: 20 },
      { prop: "loop", label: "Loop replay", kind: "toggle", defaultValue: true },
    ],
    code: (values) => {
      const delay = numberValue(values, "delay", 260);
      const loop = booleanValue(values, "loop", true);
      return `const source = createReplayDriver(codingSessionFixture, {
  delay: ${delay},
  loop: ${loop},
});

<SessionThread source={source} title="Coding agent replay" />;`;
    },
    examples: [
      { title: "Replay a fixture", description: "Create a deterministic source for demos and regression tests.", code: `const source = createReplayDriver(events, { delay: 200 });
<SessionThread source={source} />` },
      { title: "Use a harness", description: "Any source implementing the driver subscription contract can feed the session surface.", code: `<SessionThread source={agentHarness.driver} title="Agent session" />` },
    ],
    props: [
      { name: "source", type: "AgentEventStream", defaultValue: "required", description: "Subscribable stream of typed agent events." },
      { name: "title", type: "string", defaultValue: "Agent session", description: "Accessible label for the complete session surface." },
      { name: "model", type: "string", defaultValue: "Agent", description: "Machine-shaped model chip shown in the composer." },
      { name: "contextUsage", type: "number", defaultValue: "42", description: "Percentage rendered by the composer context ring." },
      { name: "onSubmit", type: "(submission) => void", defaultValue: "undefined", description: "Receives submitted text and image attachments." },
      { name: "onStop", type: "() => void", defaultValue: "undefined", description: "Runs after the active stream subscription is stopped." },
      { name: "onApprovalResponse", type: "(event) => void", defaultValue: "undefined", description: "Receives the user's decision for an inline approval request." },
      { name: "className", type: "string", defaultValue: "undefined", description: "Optional class for layout integration." },
    ],
  },
  {
    id: "approval-card",
    title: "Approval card",
    group: "features",
    tier: "Conversation",
    description: "Ask for one explicit decision in the transcript, then collapse the request into a resolved record.",
    importCode: `import { ApprovalCard } from "@fraym/ui"`,
    Demo: ApprovalDemo,
    knobs: [
      { prop: "status", label: "Status", kind: "pick", options: ["pending", "approved", "rejected"], defaultValue: "pending" },
      { prop: "prompt", label: "Prompt", kind: "text", defaultValue: "Apply the proposed changes to the workspace?" },
    ],
    code: (values) => {
      const status = stringValue(values, "status", "pending");
      const prompt = stringValue(values, "prompt", "Apply the proposed changes to the workspace?");
      const decision = status === "pending" ? "null" : `"${status}"`;
      return `<ApprovalCard
  approval={{ id: "change-1", prompt: "${prompt}", decision: ${decision} }}
  onRespond={handleDecision}
/>`;
    },
    examples: [
      { title: "Pending request", description: "Keep the primary action reserved for the affirmative decision.", code: `<ApprovalCard approval={{ id: "1", prompt: "Run the migration?", decision: null }} onRespond={respond} />` },
      { title: "Resolved record", description: "A response collapses the card into a compact transcript row.", code: `<ApprovalCard approval={{ id: "1", prompt: "Run the migration?", decision: "approved" }} />` },
    ],
    props: [
      { name: "approval", type: "ThreadApproval", defaultValue: "required", description: "Accumulated request prompt and current decision." },
      { name: "onRespond", type: "(decision) => void", defaultValue: "undefined", description: "Receives approve or reject interactions." },
    ],
  },
  {
    id: "reasoning-row",
    title: "Reasoning row",
    group: "features",
    tier: "Conversation",
    description: "Keep streamed thinking quiet by default while making the full trace available on demand.",
    importCode: `import { ReasoningRow } from "@fraym/ui"`,
    Demo: ReasoningDemo,
    knobs: [
      { prop: "streaming", label: "Streaming", kind: "toggle", defaultValue: true },
      { prop: "expanded", label: "Expanded", kind: "toggle", defaultValue: false },
    ],
    code: (values) => `<ReasoningRow
  reasoning={{ messageId: "turn-1", content: trace, streaming: ${booleanValue(values, "streaming", true)} }}
  defaultExpanded={${booleanValue(values, "expanded", false)}}
/>`,
    examples: [
      { title: "Streaming trace", description: "The compact row shows a thinking indicator while deltas arrive.", code: `<ReasoningRow reasoning={{ messageId: "1", content: trace, streaming: true }} />` },
      { title: "Expanded trace", description: "Open completed reasoning when the user asks for detail.", code: `<ReasoningRow reasoning={{ messageId: "1", content: trace, streaming: false }} defaultExpanded />` },
    ],
    props: [
      { name: "reasoning", type: "ThreadReasoning", defaultValue: "required", description: "Accumulated trace content and streaming state." },
      { name: "expanded", type: "boolean", defaultValue: "undefined", description: "Controlled disclosure state." },
      { name: "defaultExpanded", type: "boolean", defaultValue: "false", description: "Initial uncontrolled disclosure state." },
      { name: "onExpandedChange", type: "(expanded) => void", defaultValue: "undefined", description: "Receives disclosure changes." },
    ],
  },
] satisfies readonly Entry[];
