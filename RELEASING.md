# Releasing Fraym

**Maintainers only.** Publishing `@fraym-ai/*` to npm is restricted to the project
owner. The source is public, but only this exact repository can publish (npm
trusted publishing), and the release workflow is gated behind an approval. Forks
and contributor PRs cannot publish — by construction.

For the low-level packaging mechanics (how `workspace:*` is resolved, tarball
contents, why `bun publish` is avoided), see [`PUBLISHING.md`](PUBLISHING.md).

## What ships

Twelve packages under `packages/` plus `@fraym-ai/template-web-agent`, versioned
in **lockstep** — every package (and the template) carries the same version, and
`workspace:*` resolves to that exact version in the published tarball.

## Cut a release (automated — preferred)

No token, no 2FA tap: GitHub Actions publishes via **npm OIDC trusted publishing**
with provenance.

1. **Bump versions.** Set the new version in every `packages/*/package.json` and
   `templates/web-agent/{package.json,template/package.json,fraym.template.json}`.
2. **Commit** on `main` (`chore(release): vX.Y.Z`).
3. **Tag and push:**
   ```sh
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
4. The **Release** workflow (`.github/workflows/release.yml`) starts and pauses at
   the `npm-release` environment. **Approve it** (Actions → the run → Review
   deployments). It then packs + publishes all 13 in dependency order, skipping
   any version already on the registry.
5. Verify: `npm view @fraym-ai/ui version` (and friends) show the new version.

You can also trigger it from **Actions → Release → Run workflow** (manual dispatch)
— same approval gate.

## One-time setup (required before the first automated release)

1. **Protected environment — already configured.** The `npm-release` environment
   exists with **Required reviewers = the owner** (set via the GitHub API). Every
   release waits for explicit approval, even when triggered by a tag.
2. **Trusted publishers on npm — one script, one tap.** Run in a real terminal:

   ```sh
   bun scripts/trust-publishers.ts
   ```

   It configures a GitHub Actions trusted publisher (repo `insodimension/fraym-oss`,
   workflow `release.yml`, environment `npm-release`, allow-publish) for all 13
   packages. The **first** package prompts 2FA — authenticate with your security
   key and tick **"skip 2FA for the next 5 minutes"**; the rest configure
   unattended. Re-runnable — already-configured packages are skipped.

   Prefer the web UI? Per package: npmjs.com → the package → **Settings → Trusted
   Publisher → GitHub Actions** (org `insodimension`, repo `fraym-oss`, workflow
   `release.yml`, environment `npm-release`).

## Manual fallback (no CI)

If you must publish from your machine (e.g. before OIDC is configured):

```sh
bun run publish:all      # run in a REAL terminal
```

npm requires a live 2FA factor per package, and the owner account uses a security
key, so **run it in a real terminal and tap the key when the browser opens** —
once per package. It is resumable (already-published versions are skipped). See
[`PUBLISHING.md`](PUBLISHING.md) for why (and why `bun publish` / a non-interactive
shell fail with `EOTP`).

## Who can release

Only maintainers with **write access** can create a `v*` tag or run the workflow,
and only the **required reviewer** can approve the `npm-release` deployment. A
fork is a different repository, so npm rejects its OIDC identity outright; fork
PRs get no id-token and no secrets. There is no path for an outside contributor
to publish.
