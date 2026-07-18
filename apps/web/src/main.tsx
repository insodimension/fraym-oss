import { StrictMode, useMemo, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { codingSessionFixture, createReplayDriver } from "@fraym/driver";
import { createAcpDriver } from "@fraym/driver-acp";
import { Button, Code, SessionThread, type SessionThreadProps } from "@fraym/ui";

import "./styles.css";

type SourceMode = "replay" | "acp";

interface AcpConnection {
  url: string;
  cwd: string;
  key: number;
}

const defaultAcpUrl = "ws://localhost:5196";

function isAbsoluteCwd(value: string): boolean {
  return /^(?:[A-Za-z]:[\\/]|\/)/.test(value);
}

function App() {
  const [mode, setMode] = useState<SourceMode>("replay");
  const [urlDraft, setUrlDraft] = useState(defaultAcpUrl);
  const [cwdDraft, setCwdDraft] = useState("");
  const [acpConnection, setAcpConnection] = useState<AcpConnection | null>(null);
  const replay = useMemo(
    () => createReplayDriver(codingSessionFixture, { delay: 260, loop: true }),
    [],
  );
  const acp = useMemo(
    () => acpConnection === null
      ? null
      : createAcpDriver(acpConnection.url, { cwd: acpConnection.cwd }),
    [acpConnection],
  );
  const cwdIsAbsolute = isAbsoluteCwd(cwdDraft);

  const connect = (event?: FormEvent) => {
    event?.preventDefault();
    if (!cwdIsAbsolute) {
      return;
    }
    const nextUrl = urlDraft.trim() || defaultAcpUrl;
    setAcpConnection((current) => ({
      url: nextUrl,
      cwd: cwdDraft,
      key: (current?.key ?? 0) + 1,
    }));
    setMode("acp");
  };

  const sessionProps: SessionThreadProps | null = mode === "replay"
    ? {
        source: replay,
        title: "Coding agent replay",
        model: "fraym/replay",
        contextUsage: 38,
        onApprovalResponse: replay.respondToApproval,
      }
    : acp === null
      ? null
      : {
          source: acp,
          title: "Live ACP agent",
          model: "acp/live",
          contextUsage: 0,
          onApprovalResponse: acp.respondToApproval,
          onStop: acp.cancel,
          onSubmit: (submission) => {
            void acp.prompt(submission.value).catch(() => undefined);
          },
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
          <Button aria-pressed={mode === "acp"} onClick={() => setMode("acp")} size="sm" variant="ghost">
            Live ACP
          </Button>
        </div>
        {mode === "acp" ? (
          <form className="web-connection" onSubmit={connect}>
            <div className="web-connection__field">
              <label htmlFor="acp-url">WebSocket URL</label>
              <input
                id="acp-url"
                onChange={(event) => setUrlDraft(event.currentTarget.value)}
                spellCheck={false}
                type="url"
                value={urlDraft}
              />
            </div>
            <div className="web-connection__field">
              <label htmlFor="acp-cwd">Working directory</label>
              <input
                aria-describedby="acp-cwd-help"
                aria-invalid={cwdDraft.length > 0 && !cwdIsAbsolute}
                id="acp-cwd"
                onChange={(event) => setCwdDraft(event.currentTarget.value)}
                placeholder="D:/path/to/repo"
                required
                spellCheck={false}
                type="text"
                value={cwdDraft}
              />
            </div>
			<Button disabled={!cwdIsAbsolute} size="sm" type="submit" variant="default">Connect</Button>
            <p className="web-connection__help" id="acp-cwd-help">
              Enter the absolute workspace path the ACP agent should open.
            </p>
          </form>
        ) : (
          <p className="web-source-note">
            <Code>codingSessionFixture</Code>
            <span>loops locally with deterministic timing.</span>
          </p>
        )}
      </section>

      {sessionProps === null ? (
        <section aria-live="polite" className="web-acp-pending">
          <span className="web-eyebrow">Live session</span>
          <p>Provide an absolute working directory, then connect to start the ACP session.</p>
        </section>
      ) : (
        <SessionThread key={`${mode}-${mode === "acp" ? acpConnection?.key : "fixture"}`} {...sessionProps} />
      )}
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
