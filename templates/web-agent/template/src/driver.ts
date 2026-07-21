import {
  codingSessionFixture,
  createEventStreamSessionDriver,
  createReplayDriver,
  type SessionDriver,
  type WorkspaceRef,
} from "@fraym-ai/driver";

// The workspace this cockpit operates in. The demo exposes one session inside it.
export const workspace: WorkspaceRef = {
  workspaceId: "web-agent",
  path: "web-agent",
  displayName: "Web agent",
};

// Replacement seam: the fixture-backed stream below is the only thing to swap.
// `createReplayDriver` plays a recorded coding session so the full shell is
// populated with zero backend. `createEventStreamSessionDriver` lifts any
// `AgentEventStream` — replay, ACP, Codex, AI SDK, or your own adapter — into the
// `SessionDriver` the shell renders (thread, streaming deltas, reasoning, tool
// cards, approvals). Point `stream` at your runtime, then pass `prompt` / `cancel`
// / `setModel` here to make the composer and model menu live.
const stream = createReplayDriver(codingSessionFixture);

export const session: SessionDriver = createEventStreamSessionDriver(stream, {
  workspace,
  title: "Web agent",
  respondToApproval: response => stream.respondToApproval(response),
});
