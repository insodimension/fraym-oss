#!/usr/bin/env bun
// Publishes every public @fraym/* package to npm in dependency order.
//
// Bun rewrites `workspace:*` -> the concrete version at pack time, so internal
// deps resolve on the registry; `--access public` publishes the scoped packages
// publicly. The monorepo root stays `private` and is never published.
//
//   bun run publish:dry     # pack + preview every package, upload nothing (offline)
//   bun run publish:all     # gated real publish (needs `npm login` / NPM_TOKEN)
//   bun scripts/publish.ts --otp=123456   # pass a 2FA one-time password
import { $ } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const dryRun = process.argv.includes("--dry-run");
const otp = process.argv.find(a => a.startsWith("--otp="))?.slice(6);

// Leaves first, so the registry stays internally consistent as it fills. Every
// entry depends only on entries above it.
const ORDER = [
  "packages/config",
  "packages/verber",
  "packages/driver",
  "packages/vibr",
  "packages/cli",
  "packages/ui",
  "packages/host",
  "packages/driver-acp",
  "packages/driver-codex",
  "packages/driver-aisdk",
  "packages/fixtures",
  "packages/driver-test",
  "templates/web-agent",
];

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const step = (s: string) => console.log(`\n${bold(s)}`);

// Real publishes are gated; a dry run is a pure offline preview.
if (dryRun) {
  step("Dry run — packing every package, uploading nothing.");
} else {
  const dirty = (await $`git -C ${ROOT} status --porcelain`.text()).trim();
  if (dirty) {
    console.error(`Working tree is not clean — commit or stash first:\n${dirty}`);
    process.exit(1);
  }
  step("Typechecking (tsc -b)…");
  await $`bun run typecheck`.cwd(ROOT);
  step("Running tests…");
  await $`bun run test`.cwd(ROOT);
}

const flags = ["--access", "public"];
if (dryRun) flags.push("--dry-run");
if (otp) flags.push("--otp", otp);

for (const rel of ORDER) {
  const dir = join(ROOT, rel);
  if (!existsSync(join(dir, "package.json"))) {
    console.error(`Missing package: ${rel}`);
    process.exit(1);
  }
  step(`${dryRun ? "[dry-run] " : ""}publish ${rel}`);
  await $`bun publish ${flags}`.cwd(dir);
}

step(dryRun ? "Dry run complete — nothing was uploaded." : "All packages published to npm.");
