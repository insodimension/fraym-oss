import { expect, test } from "bun:test";
import { rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("../scripts/check-tiers.mjs", import.meta.url));
const probePath = fileURLToPath(new URL("./elements/__tier_probe_test.tsx", import.meta.url));

function runTierCheck() {
  return Bun.spawnSync([process.execPath, scriptPath], {
    stdout: "pipe",
    stderr: "pipe",
  });
}

test("clean tree has no upward tier imports", () => {
  const result = runTierCheck();

  expect(result.exitCode).toBe(0);
});

test("catches an upward import", () => {
  try {
    writeFileSync(probePath, 'import "../pages/models-page";\nexport const p = 1;\n');

    const result = runTierCheck();

    expect(result.exitCode).toBe(1);
    expect(new TextDecoder().decode(result.stderr)).toContain("__tier_probe_test");
  } finally {
    rmSync(probePath, { force: true });
  }
});
