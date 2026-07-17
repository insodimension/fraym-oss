import { useMemo, useState } from "react";
import { createReplayDriver } from "@fraym/driver";
import { Button, Separator, Textarea, Thread } from "@fraym/ui";

import { createEntryDockFixture } from "./dock-fixtures";
import type { Entry, KnobValues } from "./entry";

type ReplaySpeed = "slow" | "medium" | "fast";

const replayDelays: Readonly<Record<ReplaySpeed, number>> = {
  slow: 520,
  medium: 220,
  fast: 70,
};

interface DemoDockProps {
  entry: Entry;
  onClose: () => void;
  values: KnobValues;
}

export function DemoDock({ entry, onClose, values }: DemoDockProps) {
  const [speed, setSpeed] = useState<ReplaySpeed>("medium");
  const [replayId, setReplayId] = useState(0);
  const fixture = useMemo(() => createEntryDockFixture(entry), [entry]);
  const source = useMemo(
    () => createReplayDriver(fixture, { delay: replayDelays[speed] }),
    [fixture, replayId, speed],
  );
  const Demo = entry.Demo;

  return (
    <aside aria-label={`${entry.title} live agent context`} className="sink-demo-dock">
      <header className="sink-demo-dock__header">
        <div>
          <span className="sink-eyebrow">Live session</span>
          <strong>{entry.title} in context</strong>
        </div>
        <Button aria-label="Close demo dock" size="sm" variant="ghost" onClick={onClose}>Close</Button>
      </header>
      <div className="sink-demo-dock__controls">
        <div aria-label="Replay speed" className="sink-dock-speed" role="group">
          {(["slow", "medium", "fast"] as const).map((option) => (
            <Button
              aria-pressed={speed === option}
              data-dock-speed={option}
              key={option}
              size="sm"
              variant="ghost"
              onClick={() => setSpeed(option)}
            >
              {option === "medium" ? "Med" : option}
            </Button>
          ))}
        </div>
        <Button data-dock-restart size="sm" variant="ghost" onClick={() => setReplayId((value) => value + 1)}>
          Restart
        </Button>
      </div>
      <Separator />
      <div className="sink-demo-dock__conversation">
        <Thread className="sink-demo-dock__thread" key={`${entry.id}-${replayId}-${speed}`} source={source} title={`${entry.title} contextual replay`} />
        <section aria-label={`${entry.title} contextual output`} className="sink-demo-dock__artifact">
          <span className="sink-eyebrow">Live output</span>
          <div className="sink-demo-dock__artifact-body">
            <Demo values={values} />
          </div>
        </section>
      </div>
      <form className="sink-demo-dock__composer" onSubmit={(event) => event.preventDefault()}>
        <Textarea aria-label="Agent follow-up" placeholder="Ask a follow-up..." readOnly rows={1} />
        <Button disabled type="submit" variant="primary">Send</Button>
      </form>
    </aside>
  );
}
