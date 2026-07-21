#!/usr/bin/env bun
// Publishes every public @fraym-ai/* package to npm in dependency order.
//
// Method: `bun pm pack` each package (Bun rewrites `workspace:*` -> the concrete
// version in the tarball), then publish the tarball with the **npm** client via a
// TTY-inherited spawn so npm can run its interactive 2FA (security-key browser tap
// or OTP prompt). Two hard-won reasons for this shape:
//   * `bun publish` is avoided — it forces a broken web-auth flow that hangs.
//   * `npm publish` must inherit the terminal (Bun.spawnSync stdio: "inherit").
//     Running it through Bun's `$` pipes stdio, so npm sees no TTY and fails
//     immediately with EOTP even inside a real terminal.
//
// npm requires a live 2FA factor at publish time, so run this from a REAL
// terminal. It is resumable: versions already on the registry are skipped.
//
//   bun run publish:dry     # offline: pack + preview every package, upload nothing
//   bun run publish:all     # gated real publish (clean tree + tsc -b + bun test)
import { $ } from "bun";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const dryRun = process.argv.includes("--dry-run");

// Leaves first, so the registry stays internally consistent as it fills.
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

for (const rel of ORDER) {
  const dir = join(ROOT, rel);
  const pk = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const spec = `${pk.name}@${pk.version}`;

  const seen = await $`npm view ${spec} version`.cwd(dir).nothrow().quiet();
  if (seen.exitCode === 0) {
    step(`skip ${spec} — already on npm`);
    continue;
  }

  for (const f of readdirSync(dir)) if (f.endsWith(".tgz")) rmSync(join(dir, f));

  if (dryRun) {
    step(`[dry-run] pack ${rel}`);
    await $`bun pm pack --dry-run`.cwd(dir);
    continue;
  }

  step(`pack + publish ${rel}`);
  await $`bun pm pack`.cwd(dir).quiet();
  const tgz = readdirSync(dir).find(f => f.endsWith(".tgz"));
  if (!tgz) {
    console.error(`pack produced no tarball: ${rel}`);
    process.exit(1);
  }

  // Inherit the real terminal so npm can prompt for 2FA / open the browser.
  const result = Bun.spawnSync(["npm", "publish", tgz, "--access", "public"], {
    cwd: dir,
    stdio: ["inherit", "inherit", "inherit"],
  });
  rmSync(join(dir, tgz));
  if (result.exitCode !== 0) {
    console.error(`publish failed: ${spec} (exit ${result.exitCode})`);
    process.exit(1);
  }
}

step(dryRun ? "Dry run complete — nothing was uploaded." : "All packages published to npm.");
