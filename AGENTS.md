# Fraym Agent Notes

Fraym is a composable React UI for coding agents. A session driver supplies
session state and actions; the UI renders streaming messages, reasoning traces,
tool cards, diffs, approvals, and a production composer.

## Read first

- **Design system:** [`DESIGN.md`](DESIGN.md) is the agent-readable design
  specification; the runtime token stylesheet is the source of truth.
- **Developer commands and ports:** [`DEV.md`](DEV.md).
- **Public overview:** [`README.md`](README.md).
- **Vocabulary:** [`NOMENCLATURE.md`](NOMENCLATURE.md).

## Self-contained boundary

- Depend only on code within this checkout and declared package dependencies. A
  fresh clone must run with `bun install && bun run dev:sink`.
- The agent runtime is injected through a session driver. UI components never
  execute the runtime.
- `apps/web` is a local reference host and must remain runtime-agnostic.
- Shared development support belongs in this repository, such as
  `scripts/vite-dev-hardening.ts`.
- Fraym ACP is the generic public adapter. Fraym extension messages use
  `_fraym/*`, not adapter-specific namespaces.

## Architecture

Tiered, downward-only imports are enforced by `packages/ui/scripts/check-tiers.mjs`
(a tier imports only from tiers below it), run in `bun test`:

```text
theme (tokens) -> elements -> components -> features -> pages
```

`@fraym-ai/ui` consumes sibling Fraym packages including `@fraym-ai/driver`,
`@fraym-ai/config`, `@fraym-ai/aethr`, `@fraym-ai/vibr`, and `@fraym-ai/verber`. Session
data arrives through `@fraym-ai/driver`; `@fraym-ai/driver-acp` and
`@fraym-ai/driver-codex` adapt real back ends into the same `AgentEventStream`.
Reusable UI belongs in `packages/ui`; scripted demonstration data belongs in
`packages/fixtures` and `apps/kitchen-sink`.

## Conventions

- The thirteen `@fraym-ai/*` packages and `@fraym-ai/template-web-agent` are independent
  publishable artifacts. Development applications are not package artifacts.
- Kitchen-sink entries should provide controls, anatomy, examples, and API
  information for the component or feature they demonstrate.
- Use uppercase names only for `README.md`, `AGENTS.md`, `DEV.md`, `SKILL.md`,
  and `CHANGELOG.md`; use lowercase kebab-case for other documentation files.
- Run the focused check for the package or application you changed before
  submitting work: `bun run --cwd <path> typecheck` and `bun test`.
- Frontend changes (`.tsx` or `.css`) require browser verification at desktop
  and approximately 390px wide. A type or static check alone does not verify
  layout; redesign constrained views rather than shrinking a desktop layout.

## Public-source rules

Keep committed examples, fixtures, documentation, paths, and commands
self-contained and suitable for public distribution. Use fictional names and
reserved example domains in synthetic data. Do not add credentials, personal
data, host-specific paths, or external product integrations to the repository.
