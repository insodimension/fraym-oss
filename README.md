# Fraym

Fraym is a self-contained React UI kit for coding agents. Give the UI a
data-only session driver and it renders a full agent surface: streaming
messages, reasoning, tool calls, diffs, approvals, and a production composer.
The runtime stays behind the driver boundary, so the interface is portable
across agent back ends and hosts.

Fraym is licensed under the [MIT License](LICENSE).

## Quickstart

Install the UI and driver contract in a React 19 app:

```sh
npm i @fraym-ai/ui @fraym-ai/driver
```

Mount a complete conversation surface with a driver. This example uses the
included deterministic fixture:

```tsx
import { createRoot } from "react-dom/client";
import { codingSessionFixture, createReplayDriver } from "@fraym-ai/driver";
import { SessionThread } from "@fraym-ai/ui";

const driver = createReplayDriver(codingSessionFixture, { delay: 120, loop: true });

createRoot(document.getElementById("root")!).render(
  <SessionThread
    source={driver}
    title="Coding agent"
    model="demo/replay"
    onApprovalResponse={driver.respondToApproval}
  />,
);
```

`@fraym-ai/ui` ships its token stylesheet, so the surface renders the moment the
package is imported. Override the Fraym CSS custom properties or select a theme
token set to make it yours.

## The core idea

Fraym separates agent behavior from agent presentation. A harness emits a typed
`AgentEvent` stream — session, user message, assistant delta, reasoning delta,
tool call, approval, completion, and error events. `SessionThread` reduces that
stream into one live conversation surface while the harness stays responsible
for prompts, cancellation, and permission responses.

```text
agent harness -> AgentEvent stream -> SessionThread
```

Every integration follows the same path:

- `createReplayDriver(events, options)` plays recorded sessions with
  deterministic timing — loop, pause for approvals, or auto-respond for
  unattended demos and tests.
- `createAcpDriver(url, { cwd })` connects a live Agent Client Protocol
  WebSocket session, mapping ACP chunks, thoughts, tool lifecycles, plans,
  permissions, and errors into the same Fraym event contract. Install it with
  `npm i @fraym-ai/driver-acp`.
- A custom harness only needs to implement `AgentEventStream.subscribe(listener)`.
  No React dependency is required in either driver package.

## Workspace

```text
fraym/
  packages/
    aethr/        @fraym-ai/aethr — companion presence and cinematic text
    cli/          @fraym-ai/cli — discovery, diagnostics, and template installation
    config/       @fraym-ai/config — typed UI display and surface settings
    driver/       @fraym-ai/driver — data-only session driver contract + replay driver
    driver-acp/   @fraym-ai/driver-acp — Agent Client Protocol adapter
    driver-codex/ @fraym-ai/driver-codex — Codex CLI driver over the app-server bridge
    driver-test/  @fraym-ai/driver-test — driver conformance kit
    fixtures/     @fraym-ai/fixtures — scripted demo sessions
    ui/           @fraym-ai/ui — React components, tokens, theme, and tool renderers
    verber/       @fraym-ai/verber — working-status language
    vibr/         @fraym-ai/vibr — animated presence avatars
  templates/
    web-agent/    @fraym-ai/template-web-agent — Vite + React reference app
  apps/
    web/          replay + live ACP playground
    kitchen-sink/ component and fixture showcase (http://localhost:5184)
    codex-web/    live Codex CLI web host (http://localhost:5186)
    codex-desktop/ native Codex CLI shell, Tauri (http://localhost:5188)
```

Eleven publishable packages plus the `@fraym-ai/template-web-agent` template:
twelve artifacts in total. The package manifests declare their intended public
publish configuration; this repository makes no claim about current registry
availability. Use the source workspace or a verified registry release.

## Driver boundary

`@fraym-ai/ui` consumes Fraym packages only. A session driver supplies session
state and events; the UI renders them and sends explicit host actions back
through the driver. The UI never owns an agent runtime.

```text
agent runtime <-> ACP adapter / Codex driver / custom driver <-> @fraym-ai/ui
@fraym-ai/fixtures -> @fraym-ai/driver -> @fraym-ai/ui
@fraym-ai/config + @fraym-ai/vibr + @fraym-ai/verber + @fraym-ai/aethr -> @fraym-ai/ui
```

Fraym ACP is the generic adapter for the public Agent Client Protocol.
Fraym-owned extension messages use the `_fraym/*` namespace.

## Drive a real Codex CLI

`@fraym-ai/driver-codex` speaks the same `AgentEventStream` contract over the Codex
CLI app-server bridge, so Fraym renders a live Codex session — streaming text,
reasoning, and real tool cards — with the CLI doing the work. Two example hosts
mount it:

- `apps/codex-web` — the web host on `http://localhost:5186`.
- `apps/codex-desktop` — a native Tauri shell on `http://localhost:5188` that
  spawns the local bridge as a sidecar.

Both reuse the same `SessionThread` UI as the replay and ACP paths.

## Start with the Web Agent template

`@fraym-ai/template-web-agent` is a starter application, not an agent runtime or
hosted service. Its integration seam is
`templates/web-agent/template/src/driver.ts`; after installation, replace the
generated driver with your own.

Use the CLI from this checkout to inspect or install it:

```bash
# Inspect without writing
bun packages/cli/src/cli.ts template show web-agent --json
bun packages/cli/src/cli.ts template install web-agent --dest ./my-agent --json

# Apply the reviewed plan
bun packages/cli/src/cli.ts template install web-agent --dest ./my-agent --apply
```

## Develop

The repository is a Bun workspace.

```bash
bun install
bun run dev          # replay + live ACP playground
bun run dev:sink     # component showcase: http://localhost:5184
bun run typecheck    # workspace typecheck (tsc -b)
bun test             # test suite
```

The Codex example hosts run from their app directories:

```bash
bun run --cwd apps/codex-web dev        # http://localhost:5186
bun run --cwd apps/codex-desktop dev    # native shell, http://localhost:5188
```

The Vite applications use strict ports. If an advertised port is busy, stop the
existing listener rather than starting on an unadvertised port.

## Built with Codex and GPT-5.6

Fraym was built feature by feature through Codex CLI driving GPT-5.6. Each slice
started with a concrete specification and acceptance tests; Codex inspected the
workspace, wrote the implementation, ran the typechecker and test suite, and
iterated against the real demo. The live path was verified against an agent host
over ACP — and, later, against the real Codex CLI through `@fraym-ai/driver-codex`.

Codex carried meaningful weight where the architecture matters most: the typed
event contract, the deterministic replay driver, the tool renderer registry with
namespaced resolution, and the refactor to one `SessionThread` surface reused by
every app and dock. Three decisions kept it coherent:

1. Tokens are an enforced contract. `DESIGN.md` holds the source values, and a
   test asserts the runtime stylesheet mirrors them.
2. There is one conversation surface. Replay, live ACP, live Codex, and every
   contextual dock mount the same `SessionThread`.
3. The visual language is ghost-first. Surface tiers and hairline borders carry
   hierarchy; the violet primary is reserved for the one true action.

## Documentation

- [Developer runbook](DEV.md) — install, commands, package map, releasing.
- [Product and design direction](PRODUCT.md) — the intended agent surface.
- [Design system](DESIGN.md) — tokens, tiers, and the visual contract.
- [Nomenclature](NOMENCLATURE.md) — stable Fraym vocabulary.
- [Contributor guidance](AGENTS.md) — architecture and quality rules.

## Contributing

Issues and focused pull requests are welcome. Contributions are accepted under
the DCO (`Signed-off-by`). Before opening a change, run:

```sh
bun run typecheck
bun test
```

## License

Fraym is available under the [MIT License](./LICENSE).
