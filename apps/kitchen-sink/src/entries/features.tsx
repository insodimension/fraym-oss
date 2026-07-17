import { useMemo, useState } from "react";
import { codingSessionFixture, createReplayDriver } from "@fraym/driver";
import { Badge, Button, Thread } from "@fraym/ui";

import { booleanValue, numberValue, type Entry, type DemoProps } from "../entry";

function ThreadDemo({ values }: DemoProps) {
  const [replayId, setReplayId] = useState(0);
  const delay = numberValue(values, "delay", 260);
  const loop = booleanValue(values, "loop", true);
  const source = useMemo(
    () => createReplayDriver(codingSessionFixture, { delay, loop }),
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
      <Thread source={source} title="Coding agent replay" />
    </div>
  );
}

export const featureEntries = [
  {
    id: "streaming-thread",
    title: "Streaming thread",
    group: "features",
    tier: "Feature",
    description: "Render a complete agent session from a typed event stream, including live deltas and tool activity.",
    importCode: `import { Thread } from "@fraym/ui"`,
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

<Thread source={source} title="Coding agent replay" />;`;
    },
    examples: [
      { title: "Replay a fixture", description: "Create a deterministic source for demos and regression tests.", code: `const source = createReplayDriver(events, { delay: 200 });
<Thread source={source} />` },
      { title: "Use a harness", description: "Any source implementing the driver subscription contract can feed the thread.", code: `<Thread source={agentHarness.driver} title="Agent session" />` },
    ],
    props: [
      { name: "source", type: "AgentEventSource", defaultValue: "required", description: "Subscribable stream of typed agent events." },
      { name: "title", type: "string", defaultValue: "Agent thread", description: "Accessible label for the thread surface." },
      { name: "className", type: "string", defaultValue: "undefined", description: "Optional class for layout integration." },
    ],
  },
] satisfies readonly Entry[];
