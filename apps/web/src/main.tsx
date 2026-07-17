import { StrictMode, useMemo, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { codingSessionFixture, createReplayDriver } from "@fraym/driver";
import { createAcpDriver } from "@fraym/driver-acp";
import { Button, Code, SessionThread, type SessionThreadProps } from "@fraym/ui";

import "./styles.css";

type SourceMode = "replay" | "acp";

const defaultAcpUrl = "ws://localhost:5196";

function App() {
  const [mode, setMode] = useState<SourceMode>("replay");
  const [urlDraft, setUrlDraft] = useState(defaultAcpUrl);
  const [activeUrl, setActiveUrl] = useState(defaultAcpUrl);
  const [connectionKey, setConnectionKey] = useState(0);
  const replay = useMemo(
    () => createReplayDriver(codingSessionFixture, { delay: 260, loop: true }),
    [],
  );
  const acp = useMemo(
    () => createAcpDriver(activeUrl),
    [activeUrl, connectionKey],
  );

  const connect = (event?: FormEvent) => {
    event?.preventDefault();
    const nextUrl = urlDraft.trim() || defaultAcpUrl;
    setActiveUrl(nextUrl);
    setMode("acp");
    setConnectionKey((value) => value + 1);
  };

  const source = mode === "replay" ? replay : acp;
  const sessionProps: SessionThreadProps = {
    source,
    title: mode === "replay" ? "Coding agent replay" : "Live ACP agent",
    model: mode === "replay" ? "fraym/replay" : "acp/live",
    contextUsage: mode === "replay" ? 38 : 0,
    ...(mode === "replay"
      ? { onApprovalResponse: replay.respondToApproval }
      : {
          onApprovalResponse: acp.respondToApproval,
          onStop: acp.cancel,
          onSubmit: (submission) => {
            void acp.prompt(submission.value).catch(() => undefined);
          },
        }),
  };

  return (
    <main data-fraym-theme="dark">
      <header className="web-hero">
        <span className="web-eyebrow">Fraym</span>
        <h1>Agent UI playground</h1>
        <p>Run the deterministic fixture, or point the same conversation surface at any ACP-compatible agent.</p>
      </header>

      <section aria-label="Agent source" className="web-source-panel">
        <div aria-label="Driver source" className="web-source-tabs" role="group">
          <Button aria-pressed={mode === "replay"} onClick={() => setMode("replay")} size="sm" variant="ghost">
            Replay fixture
          </Button>
          <Button aria-pressed={mode === "acp"} onClick={() => connect()} size="sm" variant="ghost">
            Live ACP
          </Button>
        </div>
        {mode === "acp" ? (
          <form className="web-connection" onSubmit={connect}>
            <label htmlFor="acp-url">WebSocket URL</label>
            <input
              id="acp-url"
              onChange={(event) => setUrlDraft(event.currentTarget.value)}
              spellCheck={false}
              type="url"
              value={urlDraft}
            />
            <Button size="sm" type="submit" variant="primary">Connect</Button>
          </form>
        ) : (
          <p className="web-source-note">
            <Code>codingSessionFixture</Code>
            <span>loops locally with deterministic timing.</span>
          </p>
        )}
      </section>

      <SessionThread key={`${mode}-${mode === "acp" ? connectionKey : "fixture"}`} {...sessionProps} />
    </main>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
