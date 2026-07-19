import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type {
	Catalog,
	CatalogIssue,
	CatalogItem,
	CatalogItemType,
	SearchOptions,
	SearchReport,
	SearchResult,
} from "./contracts";
import { CliError } from "./contracts";

interface PackageManifest {
	readonly name?: string;
	readonly version?: string;
	readonly description?: string;
	readonly private?: boolean;
	readonly exports?: Record<string, unknown>;
}

interface CatalogRoots {
	readonly root: string;
	readonly ui?: string;
	readonly vibr?: string;
	readonly themes?: string;
	readonly apps?: string;
	readonly templates?: string;
}

const PUBLIC_UI_TIERS: readonly [CatalogItemType, string][] = [
	["element", "./elements"],
	["component", "./components"],
	["feature", "./features"],
	["page", "./pages"],
];

const FILE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx"] as const;

function pathExists(path: string): boolean {
	return existsSync(path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(path: string, issues: CatalogIssue[]): unknown | undefined {
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch (error) {
		issues.push({
			code: "invalid-json",
			path,
			message: `Could not parse JSON: ${error instanceof Error ? error.message : "unknown error"}`,
		});
		return undefined;
	}
}

function readPackageManifest(path: string, issues: CatalogIssue[]): PackageManifest | undefined {
	const value = readJson(path, issues);
	if (!isRecord(value)) {
		if (value !== undefined) {
			issues.push({ code: "invalid-manifest", path, message: "Package metadata must be a JSON object." });
		}
		return undefined;
	}
	return value as PackageManifest;
}

export function findUp(start: string, predicate: (directory: string) => boolean): string | undefined {
	let current = resolve(start);
	for (;;) {
		if (predicate(current)) return current;
		const parent = dirname(current);
		if (parent === current) return undefined;
		current = parent;
	}
}

function findCatalogRoots(start: string): CatalogRoots {
	const workspace = findUp(start, directory => pathExists(join(directory, "packages", "ui", "package.json")));
	if (workspace) {
		return {
			root: workspace,
			ui: join(workspace, "packages", "ui"),
			vibr: pathExists(join(workspace, "packages", "vibr", "package.json"))
				? join(workspace, "packages", "vibr")
				: undefined,
			themes: pathExists(join(workspace, "themes", "index.json")) ? join(workspace, "themes") : undefined,
			apps: pathExists(join(workspace, "apps")) ? join(workspace, "apps") : undefined,
			templates: pathExists(join(workspace, "templates")) ? join(workspace, "templates") : undefined,
		};
	}

	const uiPackage = findUp(start, directory =>
		pathExists(join(directory, "node_modules", "@fraym/ui", "package.json")),
	);
	const vibrPackage = findUp(start, directory =>
		pathExists(join(directory, "node_modules", "@fraym/vibr", "package.json")),
	);
	return {
		root: resolve(start),
		ui: uiPackage ? join(uiPackage, "node_modules", "@fraym/ui") : undefined,
		vibr: vibrPackage ? join(vibrPackage, "node_modules", "@fraym/vibr") : undefined,
	};
}

function resolveExportTarget(value: unknown): string | undefined {
	if (typeof value === "string") return value;
	if (!isRecord(value)) return undefined;
	return typeof value.import === "string" ? value.import : typeof value.types === "string" ? value.types : undefined;
}

function resolveModule(base: string, specifier: string): string | undefined {
	const unextended = resolve(base, specifier);
	for (const extension of FILE_EXTENSIONS) {
		const candidate = `${unextended}${extension}`;
		if (pathExists(candidate)) return candidate;
	}
	for (const extension of FILE_EXTENSIONS) {
		const candidate = join(unextended, `index${extension}`);
		if (pathExists(candidate)) return candidate;
	}
	return undefined;
}

function sourcePath(root: string, path: string): string {
	return relative(root, path).split(sep).join("/");
}

function namesFromClause(clause: string): string[] {
	return clause
		.split(",")
		.map(part => part.trim())
		.filter(part => part.length > 0 && !part.startsWith("type "))
		.map(
			part =>
				part.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/)?.[2] ??
				part.match(/^([A-Za-z_$][\w$]*)/)?.[1],
		)
		.filter((name): name is string => Boolean(name));
}

function publicBarrelItems(
	root: string,
	packageName: string,
	type: CatalogItemType,
	barrel: string,
	issues: CatalogIssue[],
	visited = new Set<string>(),
): CatalogItem[] {
	const lexicalBarrel = resolve(barrel);
	if (!pathExists(lexicalBarrel)) {
		issues.push({
			code: "missing-public-barrel",
			path: lexicalBarrel,
			message: "A public export target is missing.",
		});
		return [];
	}
	const canonicalRoot = realpathSync(root);
	const resolvedBarrel = realpathSync(lexicalBarrel);
	const relativeBarrel = relative(canonicalRoot, resolvedBarrel);
	if (isAbsolute(relativeBarrel) || relativeBarrel === ".." || relativeBarrel.startsWith(`..${sep}`)) {
		issues.push({
			code: "invalid-manifest",
			path: lexicalBarrel,
			message: "A public export target escapes its package root.",
		});
		return [];
	}
	if (visited.has(resolvedBarrel)) return [];
	visited.add(resolvedBarrel);

	const text = readFileSync(resolvedBarrel, "utf8");
	const named = /export\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["']/g;
	const all = /export\s*\*\s*from\s*["']([^"']+)["']/g;
	const declaration =
		/export\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function|class|const|let|var|enum)\s+([A-Za-z_$][\w$]*)/g;
	const items: CatalogItem[] = [];
	const includeName = (name: string) =>
		!["element", "component", "page", "avatar"].includes(type) || /^[A-Z][A-Za-z0-9_$]*$/.test(name);

	for (const match of text.matchAll(named)) {
		const specifier = match[2];
		if (!specifier?.startsWith(".")) continue;
		const source = resolveModule(dirname(resolvedBarrel), specifier);
		if (!source) continue;
		const canonicalSource = realpathSync(source);
		const relativeSource = relative(canonicalRoot, canonicalSource);
		if (isAbsolute(relativeSource) || relativeSource === ".." || relativeSource.startsWith(`..${sep}`)) {
			issues.push({
				code: "invalid-manifest",
				path: source,
				message: "A public barrel export escapes its package root.",
			});
			continue;
		}
		for (const name of namesFromClause(match[1] ?? "")) {
			if (includeName(name)) {
				items.push({ type, name, package: packageName, source: sourcePath(canonicalRoot, canonicalSource) });
			}
		}
	}
	for (const match of text.matchAll(declaration)) {
		const name = match[1];
		if (name && includeName(name)) {
			items.push({ type, name, package: packageName, source: sourcePath(root, resolvedBarrel) });
		}
	}
	for (const match of text.matchAll(all)) {
		const specifier = match[1];
		if (!specifier?.startsWith(".")) continue;
		const source = resolveModule(dirname(resolvedBarrel), specifier);
		if (!source) continue;
		items.push(...publicBarrelItems(root, packageName, type, source, issues, visited));
	}
	return items;
}

function uiItems(roots: CatalogRoots, issues: CatalogIssue[]): CatalogItem[] {
	if (!roots.ui) return [];
	const manifest = readPackageManifest(join(roots.ui, "package.json"), issues);
	if (!manifest?.exports) return [];
	const packageName = manifest.name ?? "@fraym/ui";
	const items: CatalogItem[] = [];
	for (const [type, subpath] of PUBLIC_UI_TIERS) {
		const target = resolveExportTarget(manifest.exports[subpath]);
		if (!target) continue;
		if (!target.startsWith("./")) {
			issues.push({
				code: "invalid-manifest",
				path: join(roots.ui, "package.json"),
				message: `Public export ${subpath} must use a package-relative target.`,
			});
			continue;
		}
		items.push(...publicBarrelItems(roots.ui, packageName, type, resolve(roots.ui, target), issues));
	}
	return items;
}

function vibrItems(roots: CatalogRoots, issues: CatalogIssue[]): CatalogItem[] {
	if (!roots.vibr) return [];
	const manifest = readPackageManifest(join(roots.vibr, "package.json"), issues);
	if (!manifest?.exports) return [];
	const packageName = manifest.name ?? "@fraym/vibr";
	const rootTarget = resolveExportTarget(manifest.exports["."]);
	const items =
		rootTarget?.startsWith("./") === true
			? publicBarrelItems(roots.vibr, packageName, "avatar", resolve(roots.vibr, rootTarget), issues)
			: [];
	if (rootTarget && !rootTarget.startsWith("./")) {
		issues.push({
			code: "invalid-manifest",
			path: join(roots.vibr, "package.json"),
			message: "The public root export must use a package-relative target.",
		});
	}
	const avatarSources = items.filter(item => item.source.includes("/avatars/"));
	const wispSource = resolveModule(roots.vibr, "src/cursor/registry-core");
	if (!wispSource) return avatarSources;
	const wispText = readFileSync(wispSource, "utf8");
	const presets = [...wispText.matchAll(/\bid:\s*["']([^"']+)["']/g)].flatMap(match => {
		const name = match[1];
		return name
			? [
					{
						type: "wisp-preset" as const,
						name,
						package: packageName,
						source: sourcePath(roots.vibr ?? "", wispSource),
					},
				]
			: [];
	});
	return [...avatarSources, ...presets];
}

function themeItems(roots: CatalogRoots, issues: CatalogIssue[]): CatalogItem[] {
	if (!roots.themes) return [];
	const indexPath = join(roots.themes, "index.json");
	const value = readJson(indexPath, issues);
	if (!isRecord(value) || !Array.isArray(value.themes)) return [];
	return value.themes.flatMap(theme => {
		if (!isRecord(theme) || typeof theme.id !== "string") return [];
		return [
			{
				type: "theme" as const,
				name: theme.id,
				package: "@fraym/ui",
				source: sourcePath(roots.root, indexPath),
				...(typeof theme.note === "string" ? { description: theme.note } : {}),
			},
		];
	});
}

function childDirectories(directory: string): string[] {
	if (!pathExists(directory)) return [];
	return readdirSync(directory, { withFileTypes: true })
		.filter(entry => entry.isDirectory())
		.map(entry => join(directory, entry.name));
}

function metadataManifestItems(roots: CatalogRoots, issues: CatalogIssue[]): CatalogItem[] {
	const entries: CatalogItem[] = [];
	const directories = [roots.apps, roots.templates].filter((directory): directory is string => Boolean(directory));
	for (const directory of directories) {
		const pending: Array<{ readonly path: string; readonly depth: number }> = [{ path: directory, depth: 0 }];
		while (pending.length > 0) {
			const current = pending.pop();
			if (!current) continue;
			for (const entry of readdirSync(current.path, { withFileTypes: true })) {
				if (entry.name === "node_modules" || entry.name === ".git") continue;
				const path = join(current.path, entry.name);
				if (entry.isDirectory() && current.depth < 4) {
					const packagePath = join(path, "package.json");
					if (pathExists(packagePath)) {
						const manifest = readPackageManifest(packagePath, issues);
						if (manifest?.private === true) continue;
					}
					pending.push({ path, depth: current.depth + 1 });
					continue;
				}
				if (!entry.isFile() || !["fraym.plugin.json", "fraym.template.json", "template.json"].includes(entry.name))
					continue;
				const value = readJson(path, issues);
				if (!isRecord(value) || (typeof value.name !== "string" && typeof value.id !== "string")) {
					if (value !== undefined) {
						issues.push({
							code: "invalid-manifest",
							path,
							message: "Fraym manifest metadata requires a name or id.",
						});
					}
					continue;
				}
				const name = typeof value.name === "string" ? value.name : (value.id as string);
				entries.push({
					type: entry.name.includes("template") ? "template" : "app",
					name,
					package: typeof value.package === "string" ? value.package : "manifest",
					source: sourcePath(roots.root, path),
					...(typeof value.description === "string" ? { description: value.description } : {}),
				});
			}
		}
	}
	return entries;
}

function applicationItems(roots: CatalogRoots, issues: CatalogIssue[]): CatalogItem[] {
	const entries: CatalogItem[] = [];
	for (const [type, directory] of [
		["app", roots.apps],
		["template", roots.templates],
	] as const) {
		if (!directory) continue;
		for (const child of childDirectories(directory)) {
			const path = join(child, "package.json");
			if (!pathExists(path)) continue;
			const manifest = readPackageManifest(path, issues);
			if (!manifest) continue;
			if (manifest.private === true) continue;
			if (!manifest.name || !manifest.version) {
				issues.push({ code: "invalid-manifest", path, message: "Application metadata requires name and version." });
				continue;
			}
			entries.push({
				type,
				name: manifest.name,
				package: manifest.name,
				source: sourcePath(roots.root, path),
				...(manifest.description ? { description: manifest.description } : {}),
				metadata: { version: manifest.version },
			});
		}
	}
	return entries;
}

function uniqueSorted(items: readonly CatalogItem[]): CatalogItem[] {
	const byKey = new Map<string, CatalogItem>();
	for (const item of items) {
		const key = `${item.type}\u0000${item.name}\u0000${item.package}\u0000${item.source}`;
		if (!byKey.has(key)) byKey.set(key, item);
	}
	return [...byKey.values()].sort(
		(left, right) =>
			left.type.localeCompare(right.type) ||
			left.name.localeCompare(right.name) ||
			left.package.localeCompare(right.package) ||
			left.source.localeCompare(right.source),
	);
}

export function discoverCatalog(cwd = process.cwd()): Catalog {
	const roots = findCatalogRoots(cwd);
	const issues: CatalogIssue[] = [];
	return {
		root: roots.root,
		items: uniqueSorted([
			...uiItems(roots, issues),
			...vibrItems(roots, issues),
			...themeItems(roots, issues),
			...applicationItems(roots, issues),
			...metadataManifestItems(roots, issues),
		]),
		issues: issues.sort((left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code)),
	};
}

function tokens(value: string): string[] {
	return value.toLocaleLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function relevance(query: readonly string[], item: CatalogItem): number | undefined {
	const name = item.name.toLocaleLowerCase();
	const haystack =
		`${item.name} ${item.type} ${item.package} ${item.source} ${item.description ?? ""}`.toLocaleLowerCase();
	let score = 0;
	for (const token of query) {
		if (name === token) score += 200;
		else if (name.startsWith(token)) score += 120;
		else if (name.includes(token)) score += 90;
		else if (haystack.includes(token)) score += 35;
		else return undefined;
	}
	return score;
}

export function searchCatalog(options: SearchOptions): SearchReport {
	if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1)) {
		throw new CliError("CLI_INVALID_LIMIT", "The --limit value must be a positive integer.", {
			suggestion: "Use a value such as --limit 20.",
		});
	}
	const catalog = discoverCatalog(options.cwd);
	if (catalog.items.length === 0 && catalog.issues.length > 0) {
		throw new CliError("CLI_CATALOG_UNAVAILABLE", "Fraym catalog metadata could not be read.", {
			suggestion: "Run fraym doctor for the metadata errors.",
		});
	}
	const query = tokens(options.query);
	if (query.length === 0) {
		throw new CliError("CLI_INVALID_ARGUMENT", "The search query must contain at least one letter or number.", {
			suggestion: "Use a component, feature, theme, or template name.",
		});
	}
	const matched: SearchResult[] = catalog.items.flatMap(item => {
		if (options.type && item.type !== options.type) return [];
		const score = relevance(query, item);
		return score === undefined ? [] : [{ ...item, score }];
	});
	matched.sort(
		(left, right) =>
			right.score - left.score ||
			left.type.localeCompare(right.type) ||
			left.name.localeCompare(right.name) ||
			left.package.localeCompare(right.package) ||
			left.source.localeCompare(right.source),
	);
	return {
		query: options.query,
		...(options.type ? { type: options.type } : {}),
		results: options.limit === undefined ? matched : matched.slice(0, options.limit),
		total: matched.length,
	};
}

export function isCatalogItemType(value: string): value is CatalogItemType {
	return ["element", "component", "feature", "page", "theme", "avatar", "wisp-preset", "template", "app"].includes(
		value,
	);
}
