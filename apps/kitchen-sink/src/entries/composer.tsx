import { useState } from "react";

import { Code, Composer, ContextUsage } from "@fraym/ui";

import {
  booleanValue,
  numberValue,
  stringValue,
  type DemoProps,
  type Entry,
} from "../entry";

function ComposerDemo({ values }: DemoProps) {
  const [lastSubmission, setLastSubmission] = useState("Nothing submitted yet.");
  const model = stringValue(values, "model", "fraym/agent");
  const contextUsage = numberValue(values, "contextUsage", 38);
  const streaming = booleanValue(values, "streaming", false);

  return (
    <div className="sink-demo-stack">
      <Composer
        leftSlot={<Code>{model}</Code>}
        onStop={() => setLastSubmission("Agent stopped.")}
        onSubmit={(submission) => setLastSubmission(submission.value || `${submission.attachments.length} image attachment(s)`)}
        rightSlot={<ContextUsage value={contextUsage} />}
        streaming={streaming}
      />
      <span className="sink-demo-feedback" role="status">{lastSubmission}</span>
    </div>
  );
}

export const composerEntries = [
  {
    id: "composer",
    title: "Composer",
    group: "features",
    tier: "Feature",
    description: "Accept follow-up instructions, slash commands, and image context with streaming-aware actions.",
    importCode: `import { Code, Composer, ContextUsage } from "@fraym/ui"`,
    Demo: ComposerDemo,
    knobs: [
      { prop: "model", label: "Model chip", kind: "text", defaultValue: "fraym/agent" },
      { prop: "contextUsage", label: "Context usage", kind: "number", defaultValue: 38, min: 0, max: 100, step: 1 },
      { prop: "streaming", label: "Agent streaming", kind: "toggle", defaultValue: false },
    ],
    code: (values) => `<Composer
  leftSlot={<Code>${stringValue(values, "model", "fraym/agent")}</Code>}
  rightSlot={<ContextUsage value={${numberValue(values, "contextUsage", 38)}} />}
  streaming={${booleanValue(values, "streaming", false)}}
  onSubmit={handleSubmit}
  onStop={stopAgent}
/>`,
    examples: [
      { title: "Handle a follow-up", description: "Receive trimmed text and any pasted or dropped image attachments.", code: `<Composer onSubmit={({ value, attachments }) => send({ value, attachments })} />` },
      { title: "Compose custom actions", description: "Place model metadata and context state around the shared action row.", code: `<Composer leftSlot={<ModelChip />} rightSlot={<ContextUsage value={64} />} />` },
    ],
    props: [
      { name: "onSubmit", type: "(submission) => void", defaultValue: "undefined", description: "Receives text and image attachments when Enter or Send submits." },
      { name: "streaming", type: "boolean", defaultValue: "false", description: "Replaces Send with the stop action while the agent is active." },
      { name: "commands", type: "readonly SlashCommand[]", defaultValue: "demo commands", description: "Commands filtered by a leading slash and navigated from the keyboard." },
      { name: "leftSlot", type: "ReactNode", defaultValue: "undefined", description: "Content placed beside the attachment action." },
      { name: "rightSlot", type: "ReactNode", defaultValue: "undefined", description: "Content placed immediately before Send or Stop." },
    ],
  },
] satisfies readonly Entry[];
