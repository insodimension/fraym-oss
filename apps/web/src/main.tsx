import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { codingSessionFixture, createReplayDriver } from "@fraym/driver";
import { SessionThread } from "@fraym/ui";

import "./styles.css";

const root = document.getElementById("root");
const replay = createReplayDriver(codingSessionFixture, { delay: 260, loop: true });

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <main data-fraym-theme="dark">
      <header>
        <span>FRAYM</span>
        <h1>Agent UI playground</h1>
        <p>A replayed coding-agent session, rendered from the typed driver stream.</p>
      </header>
      <SessionThread
        contextUsage={38}
        model="fraym/replay"
        onApprovalResponse={replay.respondToApproval}
        source={replay}
        title="Coding agent replay"
      />
    </main>
  </StrictMode>,
);
