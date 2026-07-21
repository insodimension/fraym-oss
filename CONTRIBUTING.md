# Contributing to Fraym

Thanks for your interest in Fraym — a self-contained React UI kit for coding
agents. Issues and focused pull requests are welcome. This guide covers the dev
setup, the bar for a change, and how the project is governed.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By
participating you agree to uphold it.

## Ground rules

- **License & sign-off.** Fraym is [MIT](LICENSE). Contributions are accepted
  under the [Developer Certificate of Origin](https://developercertificate.org/):
  sign every commit with `git commit -s` (adds a `Signed-off-by:` line certifying
  you wrote the change and may submit it under the MIT license).
- **Keep PRs focused.** One coherent change per PR. A small, reviewable diff with
  a clear rationale merges far faster than a sprawling one.
- **Discuss big changes first.** For anything that alters a public API, the
  `AgentEvent` contract, or the design tokens, open an issue before writing code.

## Development

The repository is a [Bun](https://bun.sh) workspace (Bun 1.3.14).

```sh
bun install          # install workspace deps
bun run dev          # replay + live ACP playground
bun run dev:sink     # component showcase (http://localhost:5184)
bun run typecheck    # workspace typecheck (tsc -b)
bun test             # test suite
```

Before opening a PR, make sure both gates pass:

```sh
bun run typecheck
bun test
```

CI (`.github/workflows/ci.yml`) runs the same two on every push and PR.

## Architecture you must respect

Fraym separates agent **behavior** from agent **presentation** — read
[`AGENTS.md`](AGENTS.md) and [`DESIGN.md`](DESIGN.md) before non-trivial work.

- **The driver boundary is sacred.** `@fraym-ai/ui` renders a data-only
  `AgentEvent` stream; it never owns an agent runtime. New behavior belongs
  behind a driver, not in the UI.
- **Tokens are an enforced contract.** `DESIGN.md` holds the source values and a
  test asserts the runtime stylesheet mirrors them. Don't hardcode colors/spacing.
- **One conversation surface.** Replay, ACP, Codex, and every dock mount the same
  `SessionThread`. Don't fork it.

## Commit messages

Conventional-commit style, matching the existing history:

```
feat(ui): add streaming tool-call renderer
fix(driver-acp): map plan updates to plan events
docs(readme): clarify the driver boundary
```

Types in use: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`.

## Pull request flow

1. Fork the repo and branch from `main`.
2. Make your change; keep it focused; add/adjust tests.
3. `bun run typecheck && bun test` must be green.
4. Commit with `-s` (DCO sign-off) and open the PR against `main`.
5. CI runs automatically. A maintainer reviews and merges.

Contributors never publish to npm — see the note below.

## Releases & publishing (maintainers only)

**Publishing `@fraym-ai/*` to npm is restricted to project maintainers.** Even
though the source is public, only the owner can cut a release: npm trusts
publishes only from this exact repository, and the release workflow is gated
behind a protected environment with required approval. Forks and contributor PRs
**cannot** publish. The full process lives in [`RELEASING.md`](RELEASING.md).

## Reporting bugs & requesting features

Use the issue templates (New issue → pick a template). For **security
vulnerabilities**, do **not** open a public issue — follow
[`SECURITY.md`](SECURITY.md).
