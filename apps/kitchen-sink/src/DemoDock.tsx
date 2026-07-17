import { useMemo, useState } from "react";
import { createReplayDriver } from "@fraym/driver";
import { Button, SessionThread } from "@fraym/ui";

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
  onWidthChange: (width: number) => void;
  values: KnobValues;
  width: number;
}

const dockMinWidth = 320;
const dockMaxWidth = 720;

export function clampDockWidth(width: number): number {
  const viewportMaximum = typeof window === "undefined"
    ? dockMaxWidth
    : Math.max(dockMinWidth, window.innerWidth - dockMinWidth);
  return Math.min(Math.min(dockMaxWidth, viewportMaximum), Math.max(dockMinWidth, width));
}

export function DemoDock({ entry, onClose, onWidthChange, values, width }: DemoDockProps) {
  const [speed, setSpeed] = useState<ReplaySpeed>("medium");
  const [replayId, setReplayId] = useState(0);
  const fixture = useMemo(() => createEntryDockFixture(entry), [entry]);
  const source = useMemo(
    () => createReplayDriver(fixture, { delay: replayDelays[speed] }),
    [fixture, replayId, speed],
  );
  const Demo = entry.Demo;
  const resize = (clientX: number) => onWidthChange(clampDockWidth(window.innerWidth - clientX));

  return (
    <aside aria-label={`${entry.title} live agent context`} className="sink-demo-dock" style={{ width }}>
      <button
        aria-label="Resize demo dock"
        aria-orientation="vertical"
        aria-valuemax={dockMaxWidth}
        aria-valuemin={dockMinWidth}
        aria-valuenow={Math.round(width)}
        className="sink-demo-dock__resize"
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          onWidthChange(clampDockWidth(width + (event.key === "ArrowLeft" ? 16 : -16)));
        }}
        onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
        onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) resize(event.clientX); }}
        onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
        role="separator"
        type="button"
      />
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
      <SessionThread
        className="sink-demo-dock__session"
        contextUsage={38}
        key={`${entry.id}-${replayId}-${speed}`}
        model="fraym/replay"
        onCommand={(command) => { if (command.name === "replay") setReplayId((value) => value + 1); }}
        source={source}
        title={`${entry.title} contextual replay`}
        transcriptFooter={entry.id === "streaming-thread" ? undefined : (
          <section aria-label={`${entry.title} contextual output`} className="sink-demo-dock__artifact">
            <span className="sink-eyebrow">Live output</span>
            <div className="sink-demo-dock__artifact-body"><Demo values={values} /></div>
          </section>
        )}
      />
    </aside>
  );
}
