# Fraym

Fraym is an open source React UI kit for coding agents. It provides drop-in components for streaming conversations, tool calls, approvals, reasoning, and input, all behind a small typed driver contract so an agent harness can connect without owning the presentation layer.

## Quickstart

Install the UI and driver contract in a React 19 app:

```sh
npm i @fraym/ui @fraym/driver
```

Mount a complete conversation surface with a driver. This example uses the included deterministic fixture:

```tsx
import { createRoot } from "react-dom/client";
import { codingSessionFixture, createReplayDriver } from "@fraym/driver";
import { SessionThread } from "@fraym/ui";

const driver = createReplayDriver(codingSessionFixture, {
  delay: 120,
  loop: true,
});

createRoot(document.getElementById("root")!).render(
  <SessionThread
    source={driver}
    title="Coding agent"
    model="demo/replay"
    onApprovalResponse={driver.respondToApproval}
  />,
);
```

`@fraym/ui` includes the token stylesheet, so the surface is ready to render when the package is imported. Override the Fraym CSS custom properties or select a theme token set to make it yours.

## The core idea

Fraym separates agent behavior from agent presentation. A harness emits a typed `AgentEvent` stream with session, user message, assistant delta, reasoning delta, tool call, approval, completion, and error events. `SessionThread` reduces that stream into one live conversation surface while the harness remains responsible for prompts, cancellation, and permission responses.

That boundary gives every integration the same path:

```text
agent harness -> AgentEvent stream -> SessionThread
```

- `createReplayDriver(events, options)` plays recorded sessions with deterministic timing. It can loop, pause for approvals, or auto-respond for unattended demos and tests.
- `createAcpDriver(url, { cwd })` connects a live Agent Client Protocol WebSocket session. It maps ACP message chunks, thought chunks, tool lifecycles, plans, permissions, errors, and disconnects into the same Fraym event contract. Install it separately with `npm i @fraym/driver-acp`.
- A custom harness only needs to implement `AgentEventStream.subscribe(listener)`. No React dependency is required in either driver package.

## What's in the box

- `SessionThread`, the complete reusable conversation surface with the transcript and composer together.
- Streaming assistant Markdown, collapsible reasoning traces, inline approvals, errors, and user message rows.
- A production composer with auto-growth, submit and stop states, slash commands, image attachments, action slots, and context usage.
- A nested `ToolRendererProvider` registry with exact, normalized, and fallback resolution for namespaced tool names.
- Built-in cards for read, edit, write, bash, search, todo, task, and LSP calls, plus a clean generic fallback.
- Small composable elements including forms, diagrams, session boundaries, decorative effects, liquid-glass surfaces, code, feedback, layout, and message metadata primitives.
- Design tokens exposed as CSS custom properties and typed TypeScript references, with dark and light theme sets.
- A kitchen-sink showcase with live knobs, generated usage snippets, prop documentation, and a replay-backed agent context for every entry.

## Explore the kitchen sink

The repository is a Bun workspace. Run the full component showcase locally:

```sh
bun install
bun run dev:sink
```

Open the local URL printed by Vite. The showcase covers every token, element, tool renderer, and conversation feature. It also lets you check dark and light themes, switch accent tokens live, resize the agent context dock, and inspect each usage example.

The smaller agent playground is available with:

```sh
bun run dev
```

It can switch between the deterministic replay and a live ACP WebSocket agent.

## Packages

| Path | Package | Purpose |
| --- | --- | --- |
| `packages/ui` | `@fraym/ui` | React components, tokens, conversation state, and tool renderers |
| `packages/driver` | `@fraym/driver` | Zero-React event contract, replay driver, and golden fixture |
| `packages/driver-acp` | `@fraym/driver-acp` | Zero-React ACP WebSocket adapter |
| `apps/kitchen-sink` | `@fraym/kitchen-sink` | Full component and feature showcase |
| `apps/web` | `@fraym/web` | Replay and live ACP playground |

## Built with Codex and GPT-5.6

Fraym was built feature by feature through Codex CLI driving GPT-5.6. Each slice started with a concrete specification and acceptance tests; Codex inspected the existing workspace, wrote the implementation, ran the typechecker and test suite, and iterated against the real demo. The live path was then verified against an agent host over ACP.

Codex carried meaningful implementation weight in the parts where the architecture matters most: the typed event contract, the deterministic replay driver, the tool renderer registry with namespaced resolution, and the refactor to one `SessionThread` surface reused by both apps and the showcase dock. The result was not a single generated pass. It was a sequence of small, tested changes with the contract growing alongside the UI.

Three design decisions kept that process coherent:

1. Tokens are an enforced contract. `DESIGN.md` contains the source values, and a test asserts that the runtime stylesheet mirrors them.
2. There is one conversation surface. The replay demo, live ACP playground, and every contextual dock mount the same `SessionThread` component.
3. The visual language is ghost-first. Surface tiers and hairline borders carry hierarchy; the violet primary treatment is reserved for the one true action.

## Contributing

Issues and focused pull requests are welcome. Before opening a change, run:

```sh
bun run typecheck
bun test
```

## License

Fraym is available under the [MIT License](./LICENSE).
