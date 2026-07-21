#!/usr/bin/env bun
// Configure npm trusted publishers for every @fraym-ai/* package in one pass, so
// releases publish from GitHub Actions with no stored token and no 2FA tap.
//
// >>> RUN THIS IN A REAL TERMINAL. <<<
// The FIRST package triggers a 2FA web prompt: authenticate with your security
// key AND tick "skip two-factor authentication for the next 5 minutes" on the npm
// page. The remaining packages then configure unattended within that window.
//
// `npm trust` needs npm >= 12 (node >= 24.15). To avoid forcing a node upgrade,
// this bootstraps the latest npm CLI into a temp dir and runs it on your current
// node — the engine floor is only a warning for the `trust` subcommand. The run
// is re-entrant: packages that already have a trusted publisher are skipped, so
// if the 5-minute window lapses you can just run it again.
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = "insodimension/fraym-oss";
const WORKFLOW = "release.yml"; // resolves to .github/workflows/release.yml
const ENVIRONMENT = "npm-release";
const PACKAGES = [
  "config", "verber", "driver", "vibr", "cli", "ui", "host",
  "driver-acp", "driver-codex", "driver-aisdk", "fixtures", "driver-test",
  "template-web-agent",
].map(name => `@fraym-ai/${name}`);

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

// Bootstrap a trust-capable npm CLI (the system npm may predate `npm trust`).
console.log("Fetching a trust-capable npm CLI…");
const boot = mkdtempSync(join(tmpdir(), "npm-trust-"));
await Bun.$`npm pack npm@latest`.cwd(boot).quiet();
const tarball = readdirSync(boot).find(f => f.endsWith(".tgz"));
if (!tarball) {
  console.error("Could not download the npm CLI.");
  process.exit(1);
}
await Bun.$`tar -xzf ${tarball}`.cwd(boot).quiet();
const npmCli = join(boot, "package", "bin", "npm-cli.js");

for (const pkg of PACKAGES) {
  const listed = Bun.spawnSync(["node", npmCli, "trust", "list", pkg], { stdout: "pipe", stderr: "pipe" });
  if (listed.exitCode === 0 && new TextDecoder().decode(listed.stdout).toLowerCase().includes("github")) {
    console.log(`skip ${pkg} — already has a trusted publisher`);
    continue;
  }

  console.log(`\n${bold(`trust ${pkg}`)}`);
  const result = Bun.spawnSync(
    ["node", npmCli, "trust", "github", pkg,
      "--file", WORKFLOW, "--repo", REPO, "--env", ENVIRONMENT, "--allow-publish", "--yes"],
    { stdio: ["inherit", "inherit", "inherit"] },
  );
  if (result.exitCode !== 0) {
    console.error(`\nFailed for ${pkg} (exit ${result.exitCode}).`);
    console.error("If the 5-minute 2FA window expired, re-run — already-configured packages are skipped.");
    process.exit(1);
  }
  await Bun.sleep(2000); // avoid registry rate limiting
}

console.log(`\n${bold("All trusted publishers configured.")} Releases can now publish tap-free from GitHub Actions.`);
