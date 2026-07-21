# Fraym Nomenclature

Use these terms consistently in source, documentation, and examples.

| Term | Meaning |
| --- | --- |
| **Fraym** | The self-contained React UI kit and its public package family for coding agents. |
| **AgentEventStream** | The data-only event contract from `@fraym-ai/driver` that supplies session state and events to the UI; the UI subscribes and sends explicit host actions back. |
| **session driver** | An implementation of `AgentEventStream` — the replay, ACP, Codex, or a custom driver. |
| **Fraym ACP** | The generic `@fraym-ai/driver-acp` adapter for Agent Client Protocol sessions. Fraym extension messages use `_fraym/*`. |
| **Codex driver** | `@fraym-ai/driver-codex`, which drives a live Codex CLI over the app-server bridge and emits the same `AgentEventStream`. |
| **fixture** | Deterministic scripted demonstration data, provided by `@fraym-ai/fixtures`; not a live agent runtime. |
| **replay driver** | A deterministic driver from `@fraym-ai/driver` for testing and demonstrations. |
| **conformance kit** | The `@fraym-ai/driver-test` utilities that verify a driver against Fraym’s public contract. |
| **template** | An installable reference application, currently `@fraym-ai/template-web-agent`, with an explicit driver integration seam. |
| **kitchen sink** | `apps/kitchen-sink`, the local showcase for components, features, fixtures, controls, and API examples. |
| **tier** | A layer of `@fraym-ai/ui`: `theme (tokens) -> elements -> components -> features -> pages`. |
| **downward-only imports** | The tier rule: a tier imports only from tiers below it, enforced by `packages/ui/scripts/check-tiers.mjs`. |
| **element** | A token-driven primitive in the `elements` tier with no session state. |
| **feature** | A session-aware composite in the `features` tier that consumes driver state. |
| **Aethr** | `@fraym-ai/aethr`, the companion-presence and cinematic-text package. |
| **Vibr** | `@fraym-ai/vibr`, the animated presence-avatar package. |
| **Verber** | `@fraym-ai/verber`, the configurable working-status language package. |
