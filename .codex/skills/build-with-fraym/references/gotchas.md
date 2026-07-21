# Gotchas — build-with-fraym skill

Append-only LOG of one-off learnings from real runs. Each entry is 1–3 lines. The fix lives in the promoted reference — entries here are breadcrumbs.

**Format:**
```markdown
### YYYY-MM-DD — <one-line title>
Symptom → cause → fix. See [<promoted-ref>#<anchor>](<promoted-ref>#<anchor>) for the full pattern.
Context: <what you were doing>.
```

---

### 2026-07-21 — Two token systems; components use `--fr-*`, not `--fraym-*`
Symptom → an agent styles a new element with `var(--fraym-color-primary)` and it never themes/scales. Cause → `styles.css` defines a legacy `--fraym-*` namespace (imported at `packages/ui/src/index.ts:1`, matches DESIGN.md, guarded by `design-contract.test.ts`) but every tier component renders off the LIVE `--fr-*` system in `theme/theme.css` via Tailwind v4 `*-fr-*` utility classes. Fix → build with `--fr-*` / `bg-fr-surface text-fr-text border-fr-border` classes; treat `--fraym-*` as legacy. See [tokens-and-tiers.md#the-live-token-system](tokens-and-tiers.md#the-live-token-system).
Context: authoring this skill after auditing fraym-oss quality.

### 2026-07-21 — `check-tiers.mjs` does not exist — tiers are convention, not enforced
Symptom → AGENTS.md, DEV.md, NOMENCLATURE.md, and the kitchen-sink guide all claim tiers are "enforced in CI by check-tiers", so you assume a violating import will fail CI. Cause → no `packages/ui/scripts/` dir, no such file, no lint step (`package.json` has only `typecheck`/`test`). Fix → check tier direction (theme→elements→components→features→pages) BY HAND in review; do not rely on a gate that isn't wired. See [tokens-and-tiers.md#tiers](tokens-and-tiers.md#tiers).
Context: repo-wide grep for `check-tiers` returned only the 4 doc references, zero implementation.

### 2026-07-21 — Runtime accent drifted from the design contract (#7a60c1 vs #b78cff)
Symptom → the shipped violet looks darker/duller than DESIGN.md's `#b78cff`. Cause → live `--fr-accent: #7a60c1` (`theme.css:67`, `[data-accent="violet"]:214`) while DESIGN.md + the tested `--fraym-color-primary` say `#b78cff`; the bright value survives only in gradients/glows. Fix → do not hand-pick a violet; use `--fr-accent*` tokens so a later contract reconciliation fixes every site at once. See [tokens-and-tiers.md#accent-reality](tokens-and-tiers.md#accent-reality).
Context: verified by grepping both stylesheets directly.

### 2026-07-21 — Golden path is fixture-first, then swap ONE seam
Symptom → an agent tries to implement all 17 required `SessionDriver` methods up front and gets a silently-broken thread. Cause → `SessionDriver` is a wide contract (27 methods); a half-host is harder to debug than a fixture host. Fix → scaffold the web-agent template (replay fixture, zero backend), then in `src/driver.ts` replace ONLY the `stream` with your `AgentEventStream` and wire `prompt`/`cancel`/`respondToApproval`/`setModel` via `createEventStreamSessionDriver`. See [driver-contract.md#golden-path](driver-contract.md#golden-path).
Context: confirmed from `templates/web-agent/template/src/driver.ts`.

### 2026-07-21 — Mount is `FraymHost` (from `@fraym-ai/host`), not `Fraym`
Symptom → importing the mount from `@fraym-ai/ui` gives the low-level `Fraym` and you re-implement the session catalog/theme by hand. Cause → two entries exist: `Fraym` (`@fraym-ai/ui`, low-level root) and `FraymHost` (`@fraym-ai/host`, batteries-included — owns session catalog + theme). Fix → mount `FraymHost` from `@fraym-ai/host` for a full cockpit; reach for `Fraym` only when composing your own shell. Also note DEV.md's package table lists 11 packages but the repo has 13 (adds `host`, `driver-aisdk`). See [driver-contract.md#mount](driver-contract.md#mount).
Context: `templates/web-agent/template/src/App.tsx:1` imports `FraymHost` from `@fraym-ai/host`.

### 2026-07-21 — `styles.css` is not fully dead — `.fraym-*` BEM classes are still used
Refines the 2026-07-21 "two token systems" entry: `styles.css` is not purely legacy. Its `.fraym-message-surface` BEM classes are consumed by `features/message/surface-messages.tsx:9`, so `styles.css` and `theme/theme.css` are two PARTIALLY-live styling systems, not one live + one dead. Still build new work on `--fr-*`; do not add new `.fraym-*` BEM classes. See [tokens-and-tiers.md#the-live-token-system](tokens-and-tiers.md#the-live-token-system).
Context: grep for `fraym-message` while scoping the token-unification proposal.

### 2026-07-21 — This skill installs into a harness via `fraym skills install`
The canonical skill source lives in the CLI package at `packages/cli/skills/build-with-fraym/` (ships with `@fraym-ai/cli`). Install it into a project's `.claude/skills/<id>/` and/or `.codex/skills/<id>/` with `bun packages/cli/src/cli.ts skills install build-with-fraym --dest <dir> --target both --apply` (dry-run without `--apply`; refuses collisions without `--overwrite`). See [cli-discovery.md#installing-this-skill](cli-discovery.md#installing-this-skill).
Context: added the `fraym skills` command to the CLI, reusing the transactional template installer.

### 2026-07-21 — Repo docs reconciled to reality (accent, check-tiers, package count)
The audit's drift is now fixed in the docs: DESIGN.md/README document the accent honestly (solid `--fr-accent` #7a60c1, bright #b78cff for glow/gradient — zero visual change); AGENTS.md/DEV.md/NOMENCLATURE.md/kitchen-sink guide no longer claim tiers are "enforced in CI by check-tiers" (it is a convention); DEV.md/AGENTS.md package count fixed to 13 (adds `host`, `driver-aisdk`). `design-contract.test.ts` now also guards the live `--fr-*` accent. See [tokens-and-tiers.md#accent-reality](tokens-and-tiers.md#accent-reality).
Context: "update all documentation" pass after the audit; owner chose bless-#7a60c1 + fix-test-and-accent, generator deferred.

### 2026-07-21 — CORRECTION: styles.css is a LARGE live BEM layer (not "near-dead")
The earlier "only MessageSurface uses it" note was wrong. `styles.css` `.fraym-*` BEM classes are used across many surfaces (ApprovalCard, thread, composer, tool-card, select/permission/context surfaces). Lesson: the first grep was scoped too narrowly — grep the WHOLE `packages/ui/src` (and cite ApprovalCard.tsx:14) before calling a stylesheet legacy.
Context: full read of styles.css + repo-wide grep while doing the elegant token fix.

### 2026-07-21 — Token color source UNIFIED via aliasing (supersedes "two token systems")
styles.css `--fraym-color-*` now ALIAS the live `--fr-*` palette, so the `.fraym-*` BEM layer and the Tailwind components share ONE color source. Fixes the split accent (BEM surfaces were #b78cff → now #7a60c1 everywhere) and makes BEM surfaces theme-aware (they were stuck dark in light mode). Browser-verified dark+light. New work still uses `--fr-*` Tailwind classes; don't add new `.fraym-*` BEM. See [tokens-and-tiers.md#accent-reality](tokens-and-tiers.md#accent-reality).
Context: owner said "do the elegant fix, not patchy" — aliased instead of a risky 35-file BEM→Tailwind migration.

### 2026-07-21 — check-tiers is REAL + enforced now (supersedes "does not exist")
`packages/ui/scripts/check-tiers.mjs` exists and runs in `bun test` (via `tiers.test.ts`) and `bun run --cwd packages/ui check-tiers`. Catches upward hops among theme→elements→components→features→pages (from/side-effect/dynamic imports); cross-cutting dirs exempt. The 4 repo docs are flipped back to "enforced." See [tokens-and-tiers.md#tiers](tokens-and-tiers.md#tiers).
Context: owner asked for the correct fix, not softened docs — wrote script + guard test + flipped docs.

---

## Append-only rules

1. **Promote BEFORE you append.** The full fix lives in the appropriate reference; the entry here is the breadcrumb.
2. **Use absolute dates** (the user's current date). Never relative.
3. **One entry per discrete learning.** If a single run surfaces 5 things, log 5 separate entries.
4. **Never edit existing entries.** This is an audit log of what the skill learned and when. Strikethrough or supersede with a new dated entry instead.
5. **User pushback is the highest-value gotcha source.** If the user corrected you on phrasing or methodology, that's a must-log moment.
