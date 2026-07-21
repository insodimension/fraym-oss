# Publishing Fraym to npm

Fraym ships as public, scoped `@fraym-ai/*` packages of **TypeScript source** (every
package's `exports` point at `./src/*.ts`). Consumers build them with their own
bundler — that is by design: `@fraym-ai/ui` is a React component library, always
consumed through Vite/webpack/Bun, never `require`d raw.

## What gets published

Twelve packages under `packages/` plus the scaffold template under `templates/`:

| tier | packages |
|------|----------|
| leaves (no internal deps) | `@fraym-ai/config`, `@fraym-ai/verber`, `@fraym-ai/driver`, `@fraym-ai/vibr`, `@fraym-ai/cli` |
| UI | `@fraym-ai/ui` (→ config, driver, verber, vibr) |
| shell | `@fraym-ai/host` (→ driver, ui) |
| driver adapters + kits | `@fraym-ai/driver-acp`, `@fraym-ai/driver-codex`, `@fraym-ai/driver-aisdk`, `@fraym-ai/fixtures`, `@fraym-ai/driver-test` (→ driver) |
| template | `@fraym-ai/template-web-agent` (→ driver, host, ui) |

The monorepo **root is `private`** and is never published, as are the `apps/` demos.

## Method (why not plain `bun publish` / `npm publish`)

`scripts/publish.ts` does, per package, in dependency order:

1. **`bun pm pack`** — Bun rewrites `workspace:*` to the concrete version inside the
   tarball, so internal deps resolve on the registry. (Plain `npm publish` cannot
   resolve the workspace protocol; that is why we pack with Bun first.)
2. **`npm publish <tarball> --access public`** — the npm client handles auth/2FA
   correctly. (`bun publish` is deliberately avoided — it forces an interactive
   web-auth flow that hangs.)

Tarballs ship `src/` (+ `README.md`/`LICENSE`, + `bridge.ts` for codex) and exclude
`*.test.ts` / `*.test.tsx` via each package's `files` field. The script is
**resumable** — versions already on the registry are skipped.

## Prerequisites

1. **npm auth.** `npm login`, or an `NPM_TOKEN` in `~/.npmrc`. Check `npm whoami`.
2. **The `@fraym-ai` scope** — a free npm org you own (already created).
3. **2FA at publish time.** npm now requires a live second factor for every publish
   and is retiring 2FA-bypass tokens, so **you must run the publish from a real
   terminal** — npm prompts for your security key (browser tap) or an OTP on each
   package. It cannot be done unattended from a non-interactive/CI shell without
   OIDC (see below).

## Publish

```sh
# Offline preview — packs every package in order, uploads nothing.
bun run publish:dry

# Real publish — run in a REAL terminal; tap your security key / enter OTP per package.
# Gated on a clean tree + tsc -b + bun test. Resumable if interrupted.
bun run publish:all
```

## Versioning

All packages are versioned in lockstep (currently `0.1.0`) and bumped together —
`workspace:*` resolves to the exact sibling version, so a release is one version
across the set. Bump every `package.json` `version` (and the template's), commit,
then `bun run publish:all`.

## Unattended / CI publishing (future)

To publish without a per-package 2FA tap, use **npm trusted publishing (OIDC)** from
a GitHub Actions workflow: no token, no 2FA, with provenance. This is the
recommended path for automated releases and can be added later.
