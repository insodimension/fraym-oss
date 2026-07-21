# Fraym Developer Runbook

Fraym is a self-contained Bun workspace with its own catalog and lockfile. A
fresh checkout is sufficient for development.

## Prerequisites

- Bun `1.3.14`, matching the root `packageManager` field.

## Install

From the checkout root:

```bash
bun install
```

## Run

| Command | What | URL |
| --- | --- | --- |
| `bun run dev` | Replay + live ACP playground | printed by Vite |
| `bun run dev:sink` | Component and fixture showcase | http://localhost:5184 |
| `bun run --cwd apps/codex-web dev` | Live Codex CLI web host | http://localhost:5186 |
| `bun run --cwd apps/codex-desktop dev` | Native Codex CLI shell (Tauri) | http://localhost:5188 |

The kitchen sink (`apps/kitchen-sink`) is the local component reference. It
demonstrates elements, components, and features with controls, anatomy,
examples, and API information.

Each Vite application uses `--strictPort`. If an advertised port is already in
use, stop the existing listener rather than allowing a different port.

## Fraym CLI

`@fraym-ai/cli` provides machine-readable discovery, diagnostics, and transactional
template installation. Run it from this checkout:

```bash
bun packages/cli/src/cli.ts manifest --json
bun packages/cli/src/cli.ts search button --type element --json
bun packages/cli/src/cli.ts template list --json
bun packages/cli/src/cli.ts template show web-agent --json

# Inspect without writing
bun packages/cli/src/cli.ts template install web-agent --dest ./my-agent --json

# Apply the reviewed plan
bun packages/cli/src/cli.ts template install web-agent --dest ./my-agent --apply

bun packages/cli/src/cli.ts doctor --json
```

Template installation is a dry run unless `--apply` is supplied. It refuses
collisions without `--overwrite`, rejects escaping paths and static symlinks,
and rolls back writes after a failure. Do not move or replace the destination
while an applied installation is running.

## Web Agent template

`templates/web-agent` (`@fraym-ai/template-web-agent`) is a self-contained Vite and
React reference application. Its integration seam is
`templates/web-agent/template/src/driver.ts`; replace the generated driver
implementation when integrating a runtime.

```bash
bun run --cwd templates/web-agent/template dev
bun run --cwd templates/web-agent/template build
```

## Typecheck and test

```bash
bun run typecheck   # workspace typecheck (tsc -b)
bun test            # test suite
```

Run a focused check for the package you changed, for example:

```bash
bun run --cwd packages/ui typecheck
bun run --cwd packages/driver test
bun run --cwd packages/driver-acp test
bun run --cwd packages/driver-test test
bun run --cwd packages/cli test
```

## Architecture

`packages/ui` uses downward-only tiers, enforced by
`packages/ui/scripts/check-tiers.mjs` (a tier imports only from tiers below it),
run in `bun test`:

```text
theme (tokens) -> elements -> components -> features -> pages
```

The UI receives session data through `@fraym-ai/driver`. `@fraym-ai/driver-acp` adapts
Agent Client Protocol sessions and `@fraym-ai/driver-codex` adapts the Codex CLI
app-server bridge; both emit the same `AgentEventStream`. Fraym extension
messages use the `_fraym/*` namespace. Custom drivers can implement the same
public contract.

## Publishable artifacts

The workspace contains thirteen `@fraym-ai/*` packages plus the
`@fraym-ai/template-web-agent` template package. Their manifests declare public
publish configuration; do not infer distribution status from that configuration.

| Artifact | Purpose |
| --- | --- |
| `@fraym-ai/aethr` | Companion presence and cinematic text. |
| `@fraym-ai/cli` | Discovery, diagnostics, and safe template installation. |
| `@fraym-ai/config` | Typed display and surface settings. |
| `@fraym-ai/driver` | Data-only session-driver contract and replay driver. |
| `@fraym-ai/driver-acp` | Agent Client Protocol adapter. |
| `@fraym-ai/driver-aisdk` | AgentEventStream backed by the Vercel AI SDK, in-browser. |
| `@fraym-ai/driver-codex` | Codex CLI driver over the app-server bridge. |
| `@fraym-ai/driver-test` | Driver conformance utilities. |
| `@fraym-ai/fixtures` | Scripted session fixtures. |
| `@fraym-ai/host` | Reusable app shell wired to any driver bundle; exports `FraymHost`. |
| `@fraym-ai/ui` | React components, theme, shell, hooks, and registries. |
| `@fraym-ai/verber` | Configurable working-status language. |
| `@fraym-ai/vibr` | Animated presence avatars. |
| `@fraym-ai/template-web-agent` | Vite and React reference cockpit. |

## Versioning and releases

Fraym uses SemVer; pre-1.0 (`0.x`) releases may contain breaking changes.
Releases are scoped to this standalone repository and its public packages.

For an approved release: update the package versions and `CHANGELOG.md`, run the
checks below, tag the commit (`vX.Y.Z`), then use Bun's normal public npm
publish flow from each intended package directory. Do not publish application
workspaces.

```bash
bun install
bun run typecheck
bun test
```
