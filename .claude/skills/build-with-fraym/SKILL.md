---
name: build-with-fraym
description: "Build a coding-agent cockpit UI with the Fraym OSS kit (@fraym-ai/*): scaffold from the web-agent template, wire a live driver behind the data-only SessionDriver contract, and compose token-driven surfaces across the elements/components/features/pages tiers. Triggers: 'build with fraym', 'fraym cockpit', 'fraym UI', '@fraym-ai/ui', 'FraymHost', 'wire a fraym driver', 'SessionDriver', 'AgentEventStream', 'createEventStreamSessionDriver', 'fraym template', 'fraym tool renderer', 'add a fraym element', 'fraym theme', 'fraym tokens', 'render an agent session', 'agent chat UI'. Self-improving: every run ends with a gotcha review."
---

# Build with Fraym

Fraym is a host-agnostic React UI kit that turns a running coding-agent session
into something you can watch, steer, and approve. You supply a **data-only
driver**; Fraym renders the thread, reasoning, tool cards, diffs, approvals, and
composer. This skill scaffolds a Fraym app, wires a driver, and composes surfaces
the way the kit actually works — output is working `@fraym-ai/*` code that
typechecks, tests, and is browser-verified.

This skill is **self-improving**. Every run must end with a gotcha review (see [Self-Improvement Protocol](#self-improvement-protocol)).

> **This skill is a checklist, not a suggestion.** Every mode below is a numbered checklist. You MUST tick each `[ ]` by writing its status + exit-criterion outcome in your response BEFORE moving to the next step. Skipping a step without documenting why is a skill violation.

> **Reality over prose.** The repo docs (AGENTS.md/DEV.md/NOMENCLATURE.md) describe intent that has drifted from the code in specific ways (dual token system, a non-existent tier-check, accent drift, a stale package count). This skill's references record the verified state. When a doc and the code disagree, the code wins — and the CLI reads the code.

---

## Pre-flight — ALWAYS (before any mode)

- [ ] **PF-1. Read [references/gotchas.md](references/gotchas.md).** Exit: you can state the most recent dated entries in one sentence each.
- [ ] **PF-2. Confirm the checkout + runtime.** Exit: you are in the fraym-oss root (packages `driver`, `ui`, `host`, `cli` present) and `bun --version` reports `1.3.14` (root `packageManager`); a fresh checkout needs `bun install`.
- [ ] **PF-3. Bootstrap from the CLI.** Run `bun packages/cli/src/cli.ts manifest --json` and, for any surface you'll touch, `... search <name> --type <tier> --json`. Exit: you have the real command surface and the `source` path of any element/component you intend to reuse or extend. See [references/cli-discovery.md](references/cli-discovery.md).
- [ ] **PF-4. Pick the mode.** Exit: one of **Scaffold** / **Wire a driver** / **Build a surface** / **Review** written down. A "make a Fraym app from scratch" request runs Scaffold → Wire → Review in order.

## Modes

| Mode | When to use | Output |
|---|---|---|
| **Scaffold** | Start a new Fraym cockpit / app | A running fixture-backed app via the `web-agent` template |
| **Wire a driver** | Connect a real backend (ACP, Codex, AI SDK, custom) | A live `SessionDriver` behind the shell |
| **Build a surface** | Add/compose an element, component, feature, tool renderer | Token-driven, tier-correct UI in `packages/ui` or your app |
| **Review** | Before shipping any Fraym UI change | A Pre-Ship Gate pass with evidence |

---

## Mode: Scaffold

Stand up a working cockpit with zero backend first — a populated shell proves the
UI path before any integration risk.

- [ ] **SC-1. Inspect the template.** `bun packages/cli/src/cli.ts template show web-agent --json`. Exit: you've read the `TemplateDetail` and know the file plan.
- [ ] **SC-2. Dry-run the install.** `template install web-agent --dest <dir> --json` (no `--apply`). Exit: you've reviewed the `InstallPlan` (`order`/`entries`/`collisions`) and there are no unexpected collisions.
- [ ] **SC-3. Apply + run.** Re-run with `--apply`, then `bun install` and `bun run --cwd <dir> dev`. Exit: the fixture cockpit loads and the replayed coding session streams (thread + tool cards + approval visible).
- [ ] **SC-4. Locate the seam.** Open `src/driver.ts` and `src/App.tsx`. Exit: you can point to the single `stream` line to replace and the `<FraymHost drivers={{ session }} …>` mount. See [references/driver-contract.md#golden-path](references/driver-contract.md#golden-path).
- [ ] **SC-5. Update gotchas.** Exit: new symptom/fix appended to [references/gotchas.md](references/gotchas.md), or a "nothing new" line.

## Mode: Wire a driver

Replace the fixture with a real backend by swapping ONE seam — never implement the
27-method `SessionDriver` by hand.

- [ ] **WD-1. Choose the stream source.** ACP → `createAcpDriver`; Codex → `createCodexDriver`; Vercel AI SDK → `@fraym-ai/driver-aisdk`; else a custom `AgentEventStream`. Exit: the source picked and its entrypoint read from source (not memory).
- [ ] **WD-2. Emit the 12-event union correctly.** For a custom stream, produce a coherent order: `session.start` → `user.message` → `assistant.message.delta` / `reasoning.delta` / `tool_call.start→update→end` (stable tool name) → `session.done`; surface failures as `session.error`. Exit: every emitted event name matches the union in `packages/driver/src/index.ts:100-128`.
- [ ] **WD-3. Lift via the adapter.** Replace `createReplayDriver(fixture)` with your stream and pass `createEventStreamSessionDriver(stream, { workspace, title, prompt, cancel, respondToApproval, setModel })`. Exit: only backend-touching options are wired; the shell mount is unchanged.
- [ ] **WD-4. Conformance-test the driver.** Use `@fraym-ai/driver-test` (`describeSessionDriverConformance`, `createReplayDriverHarness`) before wiring into the app. Exit: a conformance test file runs green (`bun test`), including unsubscribe-stops-events and disconnection.
- [ ] **WD-5. Live smoke.** Run the app against the backend: send a message, watch a tool call render start→end, trigger and answer one approval, cancel a run. Exit: all four behaviors observed in the browser.
- [ ] **WD-6. Pass the [Pre-Ship Gate](#pre-ship-gate).** Exit: every G-rule PASS.
- [ ] **WD-7. Update gotchas.** Exit: appended, or "nothing new".

## Mode: Build a surface

Add or compose UI at the correct tier, styled only through live tokens.

- [ ] **BS-1. Reuse before creating.** `search` the CLI for an existing element/component; read its `source`. Exit: you've confirmed no existing primitive fits, or you're extending one.
- [ ] **BS-2. Pick the tier.** New control with no session state → `elements`; domain-agnostic molecule → `components`; driver-aware surface → `features`; full screen → `pages`. Import only from tiers BELOW. Exit: target tier + import direction written; no upward import. See [references/tokens-and-tiers.md#tiers](references/tokens-and-tiers.md#tiers).
- [ ] **BS-3. Style with `--fr-*` only.** Use Tailwind `*-fr-*` utility classes via `cn()` + `class-variance-authority` for variants. NO raw hex; no `var(--fraym-*)` (legacy, dead to components); avoid raw `px` outside the ramp. Exit: grep your file — zero hex literals, zero `--fraym-`, tokens come from `fr-*` classes. See [references/tokens-and-tiers.md#the-live-token-system](references/tokens-and-tiers.md#the-live-token-system).
- [ ] **BS-4. Extend by registry, not by fork.** A new tool card / message block / surface → register a renderer via the matching registry, don't fork a feature. Exit: renderer registered through the Provider, or N/A stated. See [references/tokens-and-tiers.md#extensibility-the-registries](references/tokens-and-tiers.md#extensibility-the-registries).
- [ ] **BS-5. Handle every state + a11y.** Streaming, empty, error, long-content, and reduced-motion states render sensibly; interactive controls are semantic, keyboard-operable, `focus-visible`, and icon-only controls carry a label. Density read from the surface kit, not hardcoded. Exit: each state exercised; a11y checklist satisfied.
- [ ] **BS-6. Add a kitchen-sink entry.** Demonstrate the surface with controls, anatomy, examples, and API info in `apps/kitchen-sink`. Exit: entry renders in `bun run dev:sink`.
- [ ] **BS-7. Pass the [Pre-Ship Gate](#pre-ship-gate).** Exit: every G-rule PASS.
- [ ] **BS-8. Update gotchas.** Exit: appended, or "nothing new".

## Mode: Review

Gate any Fraym change before it ships.

- [ ] **RV-1. Run the [Pre-Ship Gate](#pre-ship-gate) against the diff.** Exit: every row PASS/FAIL recorded; FAILs fixed, not shipped.
- [ ] **RV-2. Update gotchas.** Exit: appended, or "nothing new".

---

## Pre-Ship Gate (MUST pass before committing any Fraym change)

Mark each `[ ]` PASS / FAIL. A FAIL blocks the commit — fix it, don't ship it.

- [ ] **G0. Live tokens only.** No hardcoded hex; style with `--fr-*` / `*-fr-*` Tailwind classes. `var(--fraym-color-*)` now aliases the live palette (fine on existing BEM surfaces) but do NOT add new `.fraym-*` BEM classes. Raw `px` only inside the type/space/radius ramp. (Most-violated — check first.) See [references/tokens-and-tiers.md#the-live-token-system](references/tokens-and-tiers.md#the-live-token-system).
- [ ] **G1. Tier direction is downward-only.** No import reaches UP a tier — enforced by `packages/ui/scripts/check-tiers.mjs` (runs in `bun test`; or `bun run --cwd packages/ui check-tiers`). See [references/tokens-and-tiers.md#tiers](references/tokens-and-tiers.md#tiers).
- [ ] **G2. Driver purity.** UI/React contains no agent-runtime import or network/exec call; all session data arrives through `@fraym-ai/driver`. Runtime-specific code lives in a driver adapter.
- [ ] **G3. States covered.** Streaming, empty, error, long-content, and `prefers-reduced-motion` all render comprehensibly.
- [ ] **G4. Accessibility.** Semantic controls, visible `focus-visible`, keyboard-operable menus/dialogs, names on icon-only controls; targets WCAG 2.2 AA contrast across dark + light.
- [ ] **G5. Checks green.** `bun run --cwd <pkg> typecheck` and `bun test` pass for the changed package.
- [ ] **G6. Browser-verified.** Checked at desktop AND ~390px; narrow views were redesigned, not a shrunk desktop layout. (A static/type check does NOT verify layout.)
- [ ] **G7. Public-source clean.** No credentials, personal data, host-specific paths, or private integrations; synthetic data uses fictional names/reserved domains.

---

## Shared Infrastructure

- **Driver contract, golden path, mount, conformance, `_fraym/*`:** [references/driver-contract.md](references/driver-contract.md)
- **Live `--fr-*` tokens, `--fraym-*` legacy caveat, accent reality, tiers, registries, density, theming:** [references/tokens-and-tiers.md](references/tokens-and-tiers.md)
- **CLI bootstrap discipline (manifest/search/template/doctor + envelope):** [references/cli-discovery.md](references/cli-discovery.md)
- **Gotchas log:** [references/gotchas.md](references/gotchas.md)
- **Design intent (the "why"):** `DESIGN.md` at the repo root — read for rationale, but trust the code for values.

---

## Self-Improvement Protocol

Every run must end with a gotcha review. New learnings die silently if you don't log them.

**During the run:**
- Undocumented error / dead-end → capture symptom + resolution verbatim.
- API surface that didn't behave as documented → note the actual shape.
- Performance / cost / behavior surprise → note the measurement.
- User pushback corrected your phrasing or methodology → ALWAYS log this. Pushback is the highest-value gotcha source.

**At end of run:**
1. **Promote the pattern** to its permanent home BEFORE appending the log entry:
   - Driver/contract/mount/adapter learning → [references/driver-contract.md](references/driver-contract.md)
   - Token / tier / registry / theming learning → [references/tokens-and-tiers.md](references/tokens-and-tiers.md)
   - CLI / template / discovery learning → [references/cli-discovery.md](references/cli-discovery.md)
   - New hard rule → [Pre-Ship Gate](#pre-ship-gate) above
2. **Then** append a 1–3 line entry to [references/gotchas.md](references/gotchas.md). Each entry must point to the promoted reference where the full fix lives.
3. **Never** silently let a new learning die. If you discovered it, log it.

**Gotcha entry format (1–3 lines):**
```markdown
### YYYY-MM-DD — <one-line title>
Symptom → cause → fix. See [<promoted-ref>#<anchor>](<promoted-ref>#<anchor>) for the full pattern.
Context: <what you were doing + mode / trigger>.
```

Use today's absolute date (the user's current date) — never relative.

---

## Failure / Recovery

| Symptom | Cause / Fix |
|---|---|
| New element won't theme / scale / switch to light | Hardcoded a hex value instead of a token — rewrite with `--fr-*` / `*-fr-*` classes (G0). See [tokens-and-tiers.md#the-live-token-system](references/tokens-and-tiers.md#the-live-token-system). |
| Thread renders blank or half a turn | Malformed event stream — wrong/missing event name or a `tool_call.start` with no `.end`; conform the emitter to the 12-event union (WD-2). |
| Tried to implement `SessionDriver` and it's a swamp | Skipped the golden path — go fixture-first, then `createEventStreamSessionDriver` and wire only prompt/cancel/respondToApproval/setModel. See [driver-contract.md#golden-path](references/driver-contract.md#golden-path). |
| Mount re-implements the session catalog by hand | Imported low-level `Fraym` — mount `FraymHost` from `@fraym-ai/host` instead. See [driver-contract.md#mount](references/driver-contract.md#mount). |
| Assumed a tier violation would fail CI | It does — `check-tiers.mjs` runs in `bun test`; run `bun run --cwd packages/ui check-tiers` to check locally (G1). |
| `design-contract.test.ts` green but the theme looks off | The test now guards BOTH the legacy alias mapping and the live `--fr-*` values (incl. `--fr-accent`). If pixels still look off, verify rendered output (G6). See [tokens-and-tiers.md#accent-reality](references/tokens-and-tiers.md#accent-reality). |
| A component/API isn't where the docs said | Docs prose drifts — bootstrap from the CLI (`manifest`/`search`); the CLI reads the code. See [cli-discovery.md](references/cli-discovery.md). |

---

## Related

- `DESIGN.md` (repo root) — the design contract and rationale; read for intent, trust code for values.
- `@fraym-ai/driver-test` — conformance harness; always run it against a new custom driver.
- `apps/kitchen-sink` — the live component reference; every new surface gets an entry there.
- The kitchen-sink in-app guide (`apps/kitchen-sink/src/entries/guide-core.tsx`) — the human onboarding docs (Introduction/Installation/Quick start/CLI/Drivers/Theming/Architecture).
