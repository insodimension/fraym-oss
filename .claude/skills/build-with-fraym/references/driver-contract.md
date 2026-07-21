# Driver contract — how a host feeds Fraym

Fraym renders a running agent session; it never runs the agent. Everything the UI
shows arrives through a **data-only driver**. The whole integration is: emit a
stream of events, and (optionally) implement session-catalog actions.

All types below live in `@fraym-ai/driver`. Verify signatures against the source
before relying on them — this file is a map, the code is the truth.

## The two layers

| Layer | What it is | Where | You implement it when |
| --- | --- | --- | --- |
| `AgentEventStream` | A subscribable flat event stream (`subscribe(listener) → Unsubscribe`) emitting a 12-type `AgentEvent` union | `packages/driver/src/index.ts:100-146` | You have a live backend to stream from |
| `SessionDriver` | The full 27-method contract the UI consumes (catalog + control + model/approval + tree/tools + subscription) | `packages/driver/src/session-driver.ts` | Rarely by hand — use the adapter below |

**Key move:** `createEventStreamSessionDriver(stream, opts)`
(`packages/driver/src/event-stream-session-driver.ts`) **lifts any
`AgentEventStream` into the full `SessionDriver`.** You only wire the handful of
options that touch your backend: `prompt`, `cancel`, `respondToApproval`,
`setModel`, plus `workspace`/`title`. That is the entire live integration.

### AgentEvent union (12 types)
`session.start`, `user.message`, `assistant.message.delta`, `reasoning.delta`,
`tool_call.start`, `tool_call.update`, `tool_call.end`, `approval.request`,
`approval.response`, `session.done`, `session.error` (`index.ts:100-128`).
Emit them in a coherent order — e.g. a `user.message` before the assistant
responds, and `tool_call.start → …update → …end` with a STABLE tool name.
Misspelling a tool name or dropping the `.end` breaks the thread silently.

### FraymDrivers bundle
The single object handed to the mount (`packages/driver/src/drivers.ts:10-19`):

```ts
interface FraymDrivers {
  readonly session: SessionDriver;            // required
  readonly resources?: EngineResourceDriver | null;
  readonly config?: EngineConfigDriver | null;
  readonly fraymConfig?: FraymConfigDriver | null;  // persists theme/settings
  readonly workspace?: WorkspaceDriver | null;
  readonly terminal?: TerminalDriver | null;
  readonly analytics?: AnalyticsDriver | null;
  readonly usage?: UsageDriver | null;
}
```
Everything except `session` is an optional capability — omit what you don't have;
the UI renders a safe fallback for missing capabilities.

## Golden path

Never start by implementing `SessionDriver` from scratch. Start fixture-first,
then swap ONE seam. This is exactly what the official `web-agent` template does
(`templates/web-agent/template/src/driver.ts`):

```ts
import {
  codingSessionFixture,
  createEventStreamSessionDriver,
  createReplayDriver,
  type SessionDriver,
  type WorkspaceRef,
} from "@fraym-ai/driver";

export const workspace: WorkspaceRef = {
  workspaceId: "web-agent",
  path: "web-agent",
  displayName: "Web agent",
};

// 1) Fixture stream — full shell, zero backend. Prove the UI works first.
const stream = createReplayDriver(codingSessionFixture);

// 2) Lift the stream into a SessionDriver.
export const session: SessionDriver = createEventStreamSessionDriver(stream, {
  workspace,
  title: "Web agent",
  respondToApproval: (response) => stream.respondToApproval(response),
});
```

To go live: replace `stream` with a real `AgentEventStream` and pass `prompt` /
`cancel` / `setModel` in the options object. Two adapters already do this:

- `createAcpDriver(url, { cwd })` — Agent Client Protocol over WebSocket JSON-RPC (`packages/driver-acp/src/index.ts:40-53`).
- `createCodexDriver({ bridgeUrl, model, … })` — Codex app-server SSE (`packages/driver-codex/src/index.ts:36-53`).
- (`@fraym-ai/driver-aisdk` also exists for the Vercel AI SDK.)

A custom backend implements the same `AgentEventStream.subscribe` contract.

## Mount

```tsx
import { FraymHost } from "@fraym-ai/host";
import { session, workspace } from "./driver";

<FraymHost
  drivers={{ session }}
  workspace={workspace}
  storageKey="fraym-web-agent-active-session"
/>;
```

- `FraymHost` (`@fraym-ai/host`) is the **batteries-included** cockpit: it owns the
  session catalog (list/create/select/rename/archive/delete) and theme. Use this
  for a full app.
- `Fraym` (`@fraym-ai/ui`, exported at `packages/ui/src/index.ts:10`) is the
  lower-level root — reach for it only when you compose your own shell.

## Verify the driver, don't trust it

`@fraym-ai/driver-test` ships conformance helpers:
- `describeSessionDriverConformance(...)` — a Bun test suite: lifecycle + transcript
  delivery, unsubscribe stops events, steer vs follow-up delivery lanes
  (`packages/driver-test/src/conformance.ts:32-80`).
- `createReplayDriverHarness(...)` — in-memory scripted driver with delivery
  recording + `killConnection` for disconnection tests.
- `createReferenceConfigDriver(...)` — minimal config driver.

Run these against a new custom driver before wiring it into a real app.

## Extension messages: the `_fraym/*` namespace

Host-specific capabilities ride over the generic contract under `_fraym/*` rather
than adapter-specific names. Known lanes: `_fraym/session/completions`,
`_fraym/session/contextBreakdown`, `_fraym/session/mountPlugin`, `_fraym/stt/*`,
`_fraym/models/insights`. Keep any new extension inside `_fraym/*`.
