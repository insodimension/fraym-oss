import { useMemo, useState } from "react";
import type { ApprovalDecision } from "@fraym/driver";
import { codingSessionFixture, createReplayDriver } from "@fraym/driver";
import { ApprovalCard, Badge, Button, Code, ReasoningRow, Separator, SessionThread } from "@fraym/ui";

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

const acpMappings = [
  ["agent_message_chunk", "assistant.message.delta"],
  ["agent_thought_chunk", "reasoning.delta"],
  ["tool_call / update", "tool_call.start / update / end"],
  ["request_permission", "approval.request / response"],
] as const;

function AcpDriverDemo({ values }: DemoProps) {
  const url = stringValue(values, "url", "ws://localhost:5196");
  return (
    <div className="sink-acp-driver">
      <div className="sink-acp-driver__connection">
        <div>
          <span className="sink-eyebrow">ACP v1 WebSocket</span>
          <strong>Ready for a live agent</strong>
        </div>
        <Badge tone="accent">JSON-RPC</Badge>
      </div>
      <Code>{url}</Code>
      <Separator />
      <div className="sink-acp-driver__map">
        {acpMappings.map(([source, target]) => (
          <div className="sink-acp-driver__row" key={source}>
            <Code>{source}</Code>
            <span aria-hidden="true">→</span>
            <Code>{target}</Code>
          </div>
        ))}
      </div>
    </div>
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
  {
    id: "acp-driver",
    title: "ACP driver",
    group: "features",
    tier: "Driver",
    description: "Connect the Fraym event contract to any ACP v1 agent over a bidirectional JSON-RPC WebSocket.",
    importCode: `import { createAcpDriver } from "@fraym/driver-acp"`,
    Demo: AcpDriverDemo,
    knobs: [
      { prop: "url", label: "WebSocket URL", kind: "text", defaultValue: "ws://localhost:5196" },
      { prop: "cwd", label: "Working directory", kind: "text", defaultValue: "D:/path/to/repo" },
    ],
    code: (values) => {
      const url = stringValue(values, "url", "ws://localhost:5196");
      const cwd = stringValue(values, "cwd", "D:/path/to/repo");
      return `const driver = createAcpDriver("${url}", { cwd: "${cwd}" });

<SessionThread
  source={driver}
  onSubmit={({ value }) => void driver.prompt(value)}
  onStop={driver.cancel}
  onApprovalResponse={driver.respondToApproval}
/>`;
    },
    examples: [
      {
        title: "Open a live session",
        description: "The first subscriber initializes ACP and creates a session before prompts are sent.",
        code: `const driver = createAcpDriver("ws://localhost:5196", {
  cwd: "D:/path/to/repo",
});
const unsubscribe = driver.subscribe(handleEvent);`,
      },
      {
        title: "Complete the conversation loop",
        description: "Use the same driver for composer prompts, cancellation, and inline approval decisions.",
        code: `<SessionThread
  source={driver}
  onSubmit={({ value }) => void driver.prompt(value)}
  onStop={driver.cancel}
  onApprovalResponse={driver.respondToApproval}
/>`,
      },
    ],
    props: [
      { name: "url", type: "string", defaultValue: "required", description: "ACP WebSocket endpoint used for the JSON-RPC connection." },
      { name: "options.cwd", type: "string", defaultValue: "required", description: "Absolute working directory passed unchanged to session/new." },
      { name: "prompt", type: "(text) => Promise<void>", defaultValue: "method", description: "Sends a user turn through session/prompt." },
      { name: "respondToApproval", type: "(event) => void", defaultValue: "method", description: "Selects the matching ACP permission option." },
      { name: "cancel", type: "() => void", defaultValue: "method", description: "Cancels the active prompt turn." },
    ],
  },
] satisfies readonly Entry[];
