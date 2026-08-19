#!/usr/bin/env bun
// Applies (and reverts) a package's `publishConfig` field overrides around packing.
//
// Measured, and the reason this file exists: NEITHER `npm pack`/`npm publish` NOR
// `bun pm pack` rewrites manifest fields from `publishConfig`. npm only flattens
// `publishConfig` into npm *config* (registry, access, tag); field overrides such as
// `exports`/`main`/`types` are a pnpm feature. This repo publishes with bun + npm, so
// without this step a package whose committed `exports` points at `./src/*.ts` (which
// is what in-repo dev resolution needs) would publish that same source-pointing
// manifest, and every external consumer would compile our TypeScript itself.
//
// Both packers do run `prepack`/`postpack`, so:
//   "prepack":  "bun run build && bun run ../../scripts/publish-manifest.ts apply"
//   "postpack": "bun run ../../scripts/publish-manifest.ts restore"
// The tarball gets the dist-pointing manifest; the working tree is byte-restored from
// `package.json.prepack-backup` afterwards. A leftover backup (pack crashed between the
// two hooks) is restored automatically on the next `apply`, so the tree self-heals.
import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

/** Manifest fields `publishConfig` may override. Anything else (registry, access, tag) stays put. */
const OVERRIDABLE: Record<string, true> = {
	bin: true,
	browser: true,
	exports: true,
	files: true,
	imports: true,
	main: true,
	module: true,
	types: true,
	typings: true,
};

const mode = process.argv[2];
const pkgDir = resolve(process.argv[3] ?? process.cwd());
const manifestPath = join(pkgDir, "package.json");
const backupPath = `${manifestPath}.prepack-backup`;

async function restore(): Promise<boolean> {
	if (!existsSync(backupPath)) return false;
	await writeFile(manifestPath, await readFile(backupPath));
	await rm(backupPath);
	return true;
}

if (mode === "restore") {
	console.log((await restore()) ? "  package.json restored" : "  package.json unchanged (no backup)");
	process.exit(0);
}

if (mode !== "apply") {
	console.error("usage: publish-manifest.ts <apply|restore> [packageDir]");
	process.exit(2);
}

if (await restore()) console.log("  recovered a leftover prepack backup before applying");

const original = await readFile(manifestPath);
const pkg = JSON.parse(original.toString()) as Record<string, unknown> & { publishConfig?: Record<string, unknown> };
const overrides = Object.entries(pkg.publishConfig ?? {}).filter(([key]) => OVERRIDABLE[key]);
if (overrides.length === 0) {
	console.log("  no publishConfig field overrides — package.json left as is");
	process.exit(0);
}

await writeFile(backupPath, original);
for (const [key, value] of overrides) {
	pkg[key] = value;
	delete pkg.publishConfig?.[key];
}
if (pkg.publishConfig && Object.keys(pkg.publishConfig).length === 0) delete pkg.publishConfig;

// Resolve `workspace:` ranges to real semver.
//
// Measured: a tarball packed with these ranges intact is UNINSTALLABLE — npm has no
// `workspace:` protocol, so an external consumer gets
// "error: @fraym-ai/config@workspace:* failed to resolve". pnpm and bun rewrite the
// protocol when THEY publish; `npm pack`/`npm publish` do not, and this repo packs
// with npm. Each sibling's own version becomes a caret range, which is what a
// coordinated release of these packages means.
const rewritten: string[] = [];
for (const field of ["dependencies", "peerDependencies", "optionalDependencies"] as const) {
	const deps = pkg[field];
	if (typeof deps !== "object" || deps === null) continue;
	const entries = deps as Record<string, string>;
	for (const [name, range] of Object.entries(entries)) {
		if (typeof range !== "string" || !range.startsWith("workspace:")) continue;
		const siblingManifest = join(pkgDir, "..", name.replace(/^@[^/]+\//, ""), "package.json");
		if (!existsSync(siblingManifest)) {
			console.error(`  cannot resolve ${name}@${range}: no manifest at ${siblingManifest}`);
			await restore();
			process.exit(1);
		}
		const sibling = JSON.parse((await readFile(siblingManifest)).toString()) as { version?: string };
		if (sibling.version === undefined) {
			console.error(`  cannot resolve ${name}@${range}: ${siblingManifest} has no version`);
			await restore();
			process.exit(1);
		}
		entries[name] = `^${sibling.version}`;
		rewritten.push(`${name}@^${sibling.version}`);
	}
}

await writeFile(manifestPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`  applied publishConfig -> ${overrides.map(([k]) => k).join(", ")}`);
if (rewritten.length > 0) console.log(`  resolved workspace ranges -> ${rewritten.join(", ")}`);
