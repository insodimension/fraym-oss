#!/usr/bin/env bun
// Builds the publishable `dist/` for ONE package (run from that package's directory).
//
// Why this shape and not a bundler:
//   * The published tree must MIRROR `src/`, because the source addresses its own
//     static assets relatively — `new URL("../vendor/material-icons/x.svg",
//     import.meta.url)`. Bundling into one file (or per-entry chunks) breaks those
//     paths and duplicates shared module state across entry points, which would
//     give React contexts and the tool-renderer registries two instances.
//   * So: `tsc` emits JS + `.d.ts` file-for-file, then every non-TS file under
//     `src/` (css, json, svg, png) is copied verbatim to the same relative path.
//   * `tsc` emits extensionless relative specifiers (the source is written for
//     `moduleResolution: "Bundler"`). Published output must be resolvable without a
//     bundler's extension guessing, so a final pass rewrites `./x` -> `./x.js` and
//     `./dir` -> `./dir/index.js` in both the `.js` and the `.d.ts` output.
//
// Usage: bun run ../../scripts/build-package.ts   (cwd = the package)
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const pkgDir = resolve(process.argv[2] ?? process.cwd());
const srcDir = join(pkgDir, "src");
const distDir = join(pkgDir, "dist");
const tsconfig = existsSync(join(pkgDir, "tsconfig.build.json")) ? "tsconfig.build.json" : "tsconfig.json";

const t0 = Date.now();
const lap = (label: string) => console.log(`  ${label.padEnd(22)} ${((Date.now() - t0) / 1000).toFixed(1)}s`);

/** Every file under `dir`, as paths relative to `dir` with POSIX separators. */
async function walk(dir: string, base = dir): Promise<string[]> {
	const out: string[] = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...(await walk(full, base)));
		else out.push(relative(base, full).replaceAll("\\", "/"));
	}
	return out;
}

await rm(distDir, { recursive: true, force: true });

// 1. JS + .d.ts, file for file.
const tsc = Bun.spawnSync(["bunx", "tsc", "-p", tsconfig], { cwd: pkgDir, stdio: ["ignore", "inherit", "inherit"] });
if (tsc.exitCode !== 0) {
	console.error(`\ntsc failed (${tsconfig}) — dist not written.`);
	process.exit(tsc.exitCode ?? 1);
}
lap("tsc emit");

// 2. Assets: everything under src/ that tsc does not emit, at the same relative path.
//    CSS gets one transform: a Tailwind `@source` glob pointing at `.ts`/`.tsx` would
//    find only declaration files in dist/, so no class name in the library would
//    survive the consumer's Tailwind pass. Retarget those globs at the emitted JS,
//    which carries the same `className` string literals.
function retargetTailwindSources(css: string): string {
	return css.replace(/(@source\s+)(["'])([^"']+)\2/g, (whole, keyword: string, quote: string, glob: string) => {
		const next = glob.replace(/\.\{[^}]*\}$/, ".js").replace(/\.tsx?$/, ".js");
		return next === glob ? whole : `${keyword}${quote}${next}${quote}`;
	});
}

const srcFiles = await walk(srcDir);
const assets = srcFiles.filter((f) => !/\.(ts|tsx)$/.test(f));
for (const rel of assets) {
	const dest = join(distDir, rel);
	await mkdir(dirname(dest), { recursive: true });
	if (rel.endsWith(".css")) await writeFile(dest, retargetTailwindSources(await Bun.file(join(srcDir, rel)).text()));
	else await cp(join(srcDir, rel), dest);
}
lap(`copied ${assets.length} assets`);

// 3. Make relative specifiers explicit so the output resolves without a bundler.
const KEEP = /\.(css|json|svg|png|jpg|jpeg|gif|webp|woff2?|mjs|cjs|js|mts|cts)$/;
const SPECIFIER = /(?<=\bfrom\s*|\bimport\s*|\bimport\(\s*|\brequire\(\s*)(["'])(\.[^"'\n]*)\1/g;
const emitted = new Set(await walk(distDir));
let rewrites = 0;
const unresolved = new Set<string>();

for (const rel of emitted) {
	if (!/\.(js|d\.ts)$/.test(rel)) continue;
	const file = join(distDir, rel);
	const original = await Bun.file(file).text();
	const fromDir = dirname(rel);
	const next = original.replace(SPECIFIER, (whole, quote: string, spec: string) => {
		if (KEEP.test(spec) || spec.includes("?")) return whole;
		const base = `file:///${fromDir === "." ? "" : `${fromDir}/`}`;
		const resolved = new URL(spec, base).pathname.slice(1);
		const suffix = emitted.has(`${resolved}.js`) ? ".js" : emitted.has(`${resolved}/index.js`) ? "/index.js" : null;
		if (!suffix) {
			unresolved.add(`${rel} -> ${spec}`);
			return whole;
		}
		rewrites += 1;
		return `${quote}${spec}${suffix}${quote}`;
	});
	if (next !== original) await writeFile(file, next);
}
lap(`rewrote ${rewrites} imports`);

if (unresolved.size > 0) {
	console.error(`\nUnresolvable relative imports in dist (${unresolved.size}):`);
	for (const u of unresolved) console.error(`  ${u}`);
	process.exit(1);
}

// 4. Prove every published subpath exists, from package.json itself.
const pkg = (await Bun.file(join(pkgDir, "package.json")).json()) as {
	name: string;
	publishConfig?: { exports?: Record<string, string | Record<string, string>> };
};
const missing: string[] = [];
for (const [subpath, entry] of Object.entries(pkg.publishConfig?.exports ?? {})) {
	for (const target of typeof entry === "string" ? [entry] : Object.values(entry)) {
		if (!existsSync(join(pkgDir, target))) missing.push(`${subpath} -> ${target}`);
	}
}
if (missing.length > 0) {
	console.error(`\npublishConfig.exports targets missing from dist:`);
	for (const m of missing) console.error(`  ${m}`);
	process.exit(1);
}

console.log(`  ${pkg.name}: dist/ ok — ${emitted.size} files, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
