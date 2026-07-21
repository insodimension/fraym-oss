# Publishing Fraym to npm

Fraym ships as public, scoped `@fraym/*` packages of **TypeScript source** (every
package's `exports` point at `./src/*.ts`). Consumers build them with their own
bundler — that is by design: `@fraym/ui` is a React component library and is always
consumed through Vite/webpack/Bun, never `require`d raw.

## What gets published

Twelve packages under `packages/` plus the scaffold template under `templates/`:

| tier | packages |
|------|----------|
| leaves (no internal deps) | `@fraym/config`, `@fraym/verber`, `@fraym/driver`, `@fraym/vibr`, `@fraym/cli` |
| UI | `@fraym/ui` (→ config, driver, verber, vibr) |
| shell | `@fraym/host` (→ driver, ui) |
| driver adapters + kits | `@fraym/driver-acp`, `@fraym/driver-codex`, `@fraym/driver-aisdk`, `@fraym/fixtures`, `@fraym/driver-test` (→ driver) |
| template | `@fraym/template-web-agent` (→ driver, host, ui) |

The monorepo **root is `private`** and is never published. The demo apps under
`apps/` are `private` too.

### How internal deps resolve

Packages depend on each other with `workspace:*`. **`bun publish` rewrites
`workspace:*` to the concrete version** (e.g. `@fraym/driver: "0.1.0"`) inside the
published tarball, so the deps resolve on the registry. This only works when
publishing with Bun — plain `npm publish` cannot resolve the workspace protocol.

Tarballs ship `src/` (plus `README.md`/`LICENSE` where present) and exclude
`*.test.ts` / `*.test.tsx` via each package's `files` field.

## Prerequisites (one-time)

1. **npm auth.** `npm login` locally, or set `NPM_TOKEN` (an automation token) and
   an `.npmrc` with `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`. Check with
   `npm whoami`.
2. **Own the `@fraym` scope.** The package name is the import name, so the scope is
   load-bearing: every app imports `@fraym/ui` etc. Confirm the `@fraym` org/scope
   is yours (`npm org ls @fraym`, or create it at npmjs.com → Add Organization).
   If it is taken by someone else, the packages must be renamed to a scope you own
   before publishing — a repo-wide change, not just a config tweak.
3. **2FA.** If your account enforces 2FA for publish, pass `--otp=<code>`.

## Publish

```sh
# Offline preview — packs every package in order, uploads nothing.
bun run publish:dry

# Real, gated publish (clean tree + tsc -b + bun test must pass first).
bun run publish:all

# With a 2FA one-time password:
bun scripts/publish.ts --otp=123456
```

`scripts/publish.ts` publishes in dependency order (leaves first) so the registry
stays internally consistent as it fills. A real publish aborts unless the working
tree is clean and both `typecheck` and `test` pass.

## Versioning

All packages are versioned in lockstep (currently `0.1.0`) and bumped together —
`workspace:*` resolves to the exact sibling version, so a release is one version
across the set. Bump every `package.json` `version` (and the template's) to the
new number, commit, then `bun run publish:all`.
