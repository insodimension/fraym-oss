#!/usr/bin/env node
// Enforces @fraym-ai/ui's downward-only tier rule:
//
//   theme (0) -> elements (1) -> components (2) -> features (3) -> pages (4)
//
// A file in a tier dir may import only from equal-or-lower tiers. Cross-cutting
// dirs (hooks, lib, icons, vendor, registries, shell, settings, perf, …) are not
// ranked — they are shared and exempt as both source and target. The check reads
// static `import`/`export … from` and dynamic `import(...)` specifiers, resolves
// the relative ones to a src-relative path, and flags any upward hop.
//
// Exit 0 = clean, exit 1 = violations (prints each `source -> target`).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "src");
const TIER_RANK = { theme: 0, elements: 1, components: 2, features: 3, pages: 4 };

/** First src-relative path segment of a file, e.g. "features". */
function tierOf(absPath) {
	const rel = relative(SRC, absPath);
	if (rel.startsWith("..")) return undefined;
	const segment = rel.split(sep)[0];
	return segment in TIER_RANK ? segment : undefined;
}

function walk(dir) {
	const out = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(abs));
		else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(abs);
	}
	return out;
}

// Matches every module specifier form: `import … from "x"` / `export … from "x"`,
// side-effect `import "x"`, and dynamic `import("x")`.
const FROM_SPEC = /^\s*(?:import|export)\b[^\n]*?\bfrom\s*["']([^"']+)["']/gm;
const SIDE_EFFECT_SPEC = /^\s*import\s+["']([^"']+)["']/gm;
const DYNAMIC_SPEC = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

function specifiers(source) {
	const found = [];
	for (const re of [FROM_SPEC, SIDE_EFFECT_SPEC, DYNAMIC_SPEC]) {
		for (const match of source.matchAll(re)) found.push(match[1]);
	}
	return found;
}

const violations = [];
for (const file of walk(SRC)) {
	const sourceTier = tierOf(file);
	if (sourceTier === undefined) continue; // cross-cutting file — not constrained
	const sourceRank = TIER_RANK[sourceTier];
	const source = readFileSync(file, "utf8");
	for (const spec of specifiers(source)) {
		if (!spec.startsWith(".")) continue; // bare/package import — not a tier hop
		const target = tierOf(resolve(dirname(file), spec));
		if (target === undefined) continue; // resolves outside a ranked tier
		if (TIER_RANK[target] > sourceRank) {
			violations.push(`${relative(SRC, file)}  ->  ${target} (${spec})`);
		}
	}
}

if (violations.length > 0) {
	console.error(`check-tiers: ${violations.length} upward import(s) violate the tier rule:\n`);
	for (const line of violations.sort()) console.error(`  ${line}`);
	console.error("\nA tier may import only from equal-or-lower tiers: theme -> elements -> components -> features -> pages.");
	process.exit(1);
}

console.log("check-tiers: OK — no upward tier imports.");
