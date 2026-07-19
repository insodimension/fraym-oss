import { randomUUID } from "node:crypto";
import {
	chmodSync,
	copyFileSync,
	existsSync,
	linkSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	renameSync,
	rmSync,
	statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { findUp } from "./catalog";
import {
	type CatalogIssue,
	CliError,
	type InstallOptions,
	type InstallPlan,
	type InstallResult,
	type PlanAction,
	type PlanEntry,
	type RawTemplateManifest,
	type TemplateDetail,
	type TemplateFile,
	type TemplateList,
	type TemplateSummary,
} from "./contracts";

interface LoadedTemplate {
	readonly manifestPath: string;
	readonly packageRoot: string;
	readonly raw: Required<Pick<RawTemplateManifest, "id" | "source" | "files" | "requires">> & RawTemplateManifest;
	readonly summary: TemplateSummary;
}

interface SourceFile extends TemplateFile {
	readonly sourcePath: string;
	readonly mode?: number;
}

interface PlanningEntry extends PlanEntry {
	readonly sourcePath: string;
}

interface BuiltPlan {
	readonly plan: InstallPlan;
	readonly entries: readonly PlanningEntry[];
}

interface DiscoveryOptions {
	readonly from?: string;
}

const MANIFEST_NAMES = ["fraym.template.json", "template.json"] as const;
const TEMPLATE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function pathExists(path: string): boolean {
	return existsSync(path);
}

function pathLexists(path: string): boolean {
	try {
		lstatSync(path);
		return true;
	} catch {
		return false;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
	return Array.isArray(value) && value.every(item => typeof item === "string");
}

export function isTemplateManifest(value: unknown): value is RawTemplateManifest {
	if (!isRecord(value)) return false;
	return (
		(value.id === undefined || typeof value.id === "string") &&
		(value.name === undefined || typeof value.name === "string") &&
		(value.version === undefined || typeof value.version === "string") &&
		(value.description === undefined || typeof value.description === "string") &&
		(value.package === undefined || typeof value.package === "string") &&
		(value.source === undefined || typeof value.source === "string") &&
		(value.files === undefined || isStringArray(value.files)) &&
		(value.requires === undefined || isStringArray(value.requires))
	);
}

function hasUnsafeRelativePath(path: string): boolean {
	return isAbsolute(path) || path.split(/[\\/]/).some(segment => segment === "..");
}

function assertTemplateId(id: string, path: string, field = "id"): void {
	if (!TEMPLATE_ID.test(id)) {
		throw new CliError("CLI_INVALID_METADATA", `Template ${field} must be a kebab-case identifier: ${path}.`);
	}
}

function assertRelativePath(path: string, label: string): void {
	if (!path || hasUnsafeRelativePath(path)) {
		throw new CliError("CLI_INVALID_METADATA", `${label} must be a non-empty package-relative path.`);
	}
}

function toSourcePath(root: string, path: string): string {
	return relative(root, path).split(sep).join("/");
}

function escapesRoot(root: string, candidate: string): boolean {
	const contained = relative(root, candidate);
	return isAbsolute(contained) || contained === ".." || contained.startsWith(`..${sep}`);
}

function assertContained(root: string, candidate: string, message: string): void {
	if (escapesRoot(root, candidate))
		throw new CliError("CLI_TEMPLATE_PATH_ESCAPE", message, { details: { path: candidate } });
}

function manifestAt(directory: string): string | undefined {
	for (const name of MANIFEST_NAMES) {
		const candidate = join(directory, name);
		if (pathExists(candidate)) return candidate;
	}
	return undefined;
}

function readTemplateManifest(manifestPath: string, discoveryRoot: string): LoadedTemplate {
	let value: unknown;
	try {
		value = JSON.parse(readFileSync(manifestPath, "utf8"));
	} catch (error) {
		throw new CliError("CLI_INVALID_METADATA", `Could not parse template manifest: ${manifestPath}.`, {
			details: { cause: error instanceof Error ? error.message : "unknown error" },
		});
	}
	if (!isTemplateManifest(value)) {
		throw new CliError("CLI_INVALID_METADATA", `Template manifest has invalid field types: ${manifestPath}.`);
	}
	const id = value.id ?? value.name;
	if (!id) throw new CliError("CLI_INVALID_METADATA", `Template manifest requires an id: ${manifestPath}.`);
	assertTemplateId(id, manifestPath);
	if (value.version !== undefined && value.version.length === 0) {
		throw new CliError("CLI_INVALID_METADATA", `Template version must not be empty: ${manifestPath}.`);
	}
	for (const [field, fieldValue] of [
		["description", value.description],
		["package", value.package],
	] as const) {
		if (fieldValue !== undefined && fieldValue.length === 0) {
			throw new CliError("CLI_INVALID_METADATA", `Template ${field} must not be empty: ${manifestPath}.`);
		}
	}
	const source = value.source ?? "template";
	assertRelativePath(source, "Template source");
	const files = value.files ?? ["**/*"];
	for (const pattern of files) assertRelativePath(pattern, "Template files pattern");
	const requires = value.requires ?? [];
	for (const requiredId of requires) assertTemplateId(requiredId, manifestPath, "requires entry");
	const packageRoot = realpathSync(dirname(manifestPath));
	const canonicalManifest = realpathSync(manifestPath);
	assertContained(packageRoot, canonicalManifest, "Template manifest escapes its package root.");
	return {
		manifestPath: canonicalManifest,
		packageRoot,
		raw: { ...value, id, source, files, requires },
		summary: {
			id,
			...(value.version === undefined ? {} : { version: value.version }),
			...(value.description === undefined ? {} : { description: value.description }),
			...(value.package === undefined ? {} : { package: value.package }),
			source: toSourcePath(discoveryRoot, canonicalManifest),
			requires,
		},
	};
}

function isInsideNodeModules(path: string): boolean {
	return resolve(path).split(sep).includes("node_modules");
}

function workspaceRoot(cwd: string): string | undefined {
	return findUp(cwd, directory => pathExists(join(directory, "packages", "ui", "package.json")));
}

function consumerRoot(cwd: string): string | undefined {
	return findUp(cwd, directory => !isInsideNodeModules(directory) && pathExists(join(directory, "package.json")));
}

function declaredDependencies(root: string): string[] {
	try {
		const value = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as unknown;
		if (!isRecord(value)) return [];
		const dependencies = [value.dependencies, value.devDependencies].flatMap(section =>
			isRecord(section) ? Object.keys(section) : [],
		);
		return [...new Set(dependencies)].sort();
	} catch {
		return [];
	}
}

function consumerManifest(cwd: string, dependency: string): string | undefined {
	const location = findUp(cwd, directory => Boolean(manifestAt(join(directory, "node_modules", dependency))));
	return location ? manifestAt(join(location, "node_modules", dependency)) : undefined;
}

function discoverManifestPaths(
	cwd: string,
	options: DiscoveryOptions,
): { readonly root: string; readonly paths: readonly string[] } {
	if (options.from !== undefined) {
		const from = resolve(cwd, options.from);
		const manifest = manifestAt(from);
		if (!manifest) {
			throw new CliError("CLI_TEMPLATE_NOT_FOUND", `No template manifest exists in ${from}.`, {
				suggestion: "Pass --from to a package directory containing fraym.template.json.",
			});
		}
		return { root: realpathSync(from), paths: [manifest] };
	}
	const workspace = workspaceRoot(cwd);
	if (workspace) {
		const templates = join(workspace, "templates");
		const paths = pathExists(templates)
			? readdirSync(templates, { withFileTypes: true })
					.filter(entry => entry.isDirectory())
					.flatMap(entry => {
						const manifest = manifestAt(join(templates, entry.name));
						return manifest ? [manifest] : [];
					})
			: [];
		return { root: workspace, paths };
	}
	const consumer = consumerRoot(cwd);
	if (!consumer) return { root: resolve(cwd), paths: [] };
	return {
		root: consumer,
		paths: declaredDependencies(consumer).flatMap(dependency => {
			const manifest = consumerManifest(cwd, dependency);
			return manifest ? [manifest] : [];
		}),
	};
}

interface DiscoveredTemplates {
	readonly root: string;
	readonly templates: readonly LoadedTemplate[];
	readonly issues: readonly CatalogIssue[];
}

function loadTemplates(cwd: string, options: DiscoveryOptions = {}): DiscoveredTemplates {
	const discovered = discoverManifestPaths(cwd, options);
	const issues: CatalogIssue[] = [];
	const templates: LoadedTemplate[] = [];
	const seenPaths = new Set<string>();
	for (const path of discovered.paths) {
		try {
			const template = readTemplateManifest(path, discovered.root);
			if (seenPaths.has(template.manifestPath)) continue;
			seenPaths.add(template.manifestPath);
			templates.push(template);
		} catch (error) {
			if (options.from !== undefined && error instanceof CliError) throw error;
			issues.push({
				code: "invalid-manifest",
				path,
				message: error instanceof Error ? error.message : "Could not read template manifest.",
			});
		}
	}
	const byId = new Map<string, LoadedTemplate[]>();
	for (const template of templates) {
		const matches = byId.get(template.summary.id) ?? [];
		matches.push(template);
		byId.set(template.summary.id, matches);
	}
	for (const [id, matches] of byId) {
		if (matches.length < 2) continue;
		for (const match of matches) {
			issues.push({
				code: "duplicate-id",
				path: match.manifestPath,
				message: `Template id ${id} is declared more than once.`,
			});
		}
	}
	return { root: discovered.root, templates, issues };
}

export function discoverTemplates(cwd = process.cwd(), options: DiscoveryOptions = {}): TemplateList {
	const discovered = loadTemplates(cwd, options);
	return {
		root: discovered.root,
		templates: discovered.templates
			.map(template => template.summary)
			.sort((left, right) => left.id.localeCompare(right.id)),
		issues: [...discovered.issues].sort(
			(left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code),
		),
	};
}

function templateById(
	id: string,
	cwd: string,
	options: DiscoveryOptions,
): { readonly template: LoadedTemplate; readonly all: readonly LoadedTemplate[] } {
	if (!id.trim()) throw new CliError("CLI_INVALID_ARGUMENT", "Template id must not be empty.");
	const discovered = loadTemplates(cwd, options);
	const matches = discovered.templates.filter(template => template.summary.id === id);
	if (matches.length === 0) {
		throw new CliError("CLI_TEMPLATE_NOT_FOUND", `Template not found: ${id}.`, {
			suggestion: "Run fraym template list to see available templates.",
		});
	}
	if (matches.length > 1) {
		throw new CliError("CLI_TEMPLATE_DUPLICATE_ID", `Template id ${id} is declared by multiple packages.`, {
			details: { manifests: matches.map(match => match.manifestPath) },
		});
	}
	return { template: matches[0] as LoadedTemplate, all: discovered.templates };
}

function resolveInstallOrder(id: string, templates: readonly LoadedTemplate[]): LoadedTemplate[] {
	const byId = new Map<string, LoadedTemplate>();
	for (const template of templates) {
		if (byId.has(template.summary.id)) {
			throw new CliError(
				"CLI_TEMPLATE_DUPLICATE_ID",
				`Template id ${template.summary.id} is declared by multiple packages.`,
			);
		}
		byId.set(template.summary.id, template);
	}
	const order: LoadedTemplate[] = [];
	const visited = new Set<string>();
	const visiting: string[] = [];
	const visit = (templateId: string): void => {
		if (visited.has(templateId)) return;
		const index = visiting.indexOf(templateId);
		if (index >= 0) {
			throw new CliError(
				"CLI_INVALID_METADATA",
				`Template dependency cycle: ${[...visiting.slice(index), templateId].join(" -> ")}.`,
			);
		}
		const template = byId.get(templateId);
		if (!template) throw new CliError("CLI_TEMPLATE_NOT_FOUND", `Required template not found: ${templateId}.`);
		visiting.push(templateId);
		for (const dependency of template.raw.requires) visit(dependency);
		visiting.pop();
		visited.add(templateId);
		order.push(template);
	};
	visit(id);
	return order;
}

function globToRegExp(pattern: string): RegExp {
	let expression = "^";
	for (let index = 0; index < pattern.length; index += 1) {
		const character = pattern.charAt(index);
		if (character === "*") {
			if (pattern[index + 1] === "*") {
				if (pattern[index + 2] === "/") {
					expression += "(?:.*/)?";
					index += 2;
				} else {
					expression += ".*";
					index += 1;
				}
			} else expression += "[^/]*";
			continue;
		}
		if (character === "?") {
			expression += "[^/]";
			continue;
		}
		expression += character.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
	}
	return new RegExp(`${expression}$`);
}

function resolveSourceDirectory(template: LoadedTemplate): string {
	const lexical = resolve(template.packageRoot, template.raw.source);
	assertContained(template.packageRoot, lexical, "Template source escapes its package root.");
	if (!pathExists(lexical)) {
		throw new CliError("CLI_INVALID_METADATA", `Template source directory does not exist: ${template.raw.source}.`);
	}
	const canonical = realpathSync(lexical);
	assertContained(template.packageRoot, canonical, "Template source escapes its package root.");
	if (!statSync(canonical).isDirectory()) {
		throw new CliError("CLI_INVALID_METADATA", `Template source must be a directory: ${template.raw.source}.`);
	}
	return canonical;
}

function enumerateSourceFiles(template: LoadedTemplate): SourceFile[] {
	const sourceRoot = resolveSourceDirectory(template);
	const files: SourceFile[] = [];
	const selectors = template.raw.files.map(globToRegExp);
	const visitedDirectories = new Set<string>();
	const walk = (directory: string, relativeDirectory: string): void => {
		const canonicalDirectory = realpathSync(directory);
		assertContained(template.packageRoot, canonicalDirectory, "A template source symlink escapes its package root.");
		if (visitedDirectories.has(canonicalDirectory)) return;
		visitedDirectories.add(canonicalDirectory);
		for (const entry of readdirSync(canonicalDirectory, { withFileTypes: true })) {
			const lexical = join(canonicalDirectory, entry.name);
			const sourcePath = realpathSync(lexical);
			assertContained(template.packageRoot, sourcePath, "A template source symlink escapes its package root.");
			const path = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
			const stats = statSync(sourcePath);
			if (stats.isDirectory()) {
				walk(sourcePath, path);
				continue;
			}
			if (!stats.isFile() || !selectors.some(pattern => pattern.test(path))) continue;
			files.push({
				path,
				bytes: stats.size,
				executable: process.platform !== "win32" && (stats.mode & 0o111) !== 0,
				...(process.platform !== "win32" && (stats.mode & 0o111) !== 0 ? { mode: stats.mode & 0o777 } : {}),
				sourcePath,
			});
		}
	};
	walk(sourceRoot, "");
	return files.sort((left, right) => left.path.localeCompare(right.path));
}

function canonicalDestination(dest: string): string {
	const absolute = resolve(dest);
	let existing = absolute;
	const remaining: string[] = [];
	while (!pathLexists(existing)) {
		const parent = dirname(existing);
		if (parent === existing) break;
		remaining.unshift(basename(existing));
		existing = parent;
	}
	const canonicalExisting = realpathSync(existing);
	return resolve(canonicalExisting, ...remaining);
}

function assertDestinationPath(destRoot: string, relativePath: string): string {
	assertRelativePath(relativePath, "Template output path");
	const lexical = resolve(destRoot, relativePath);
	assertContained(destRoot, lexical, "Template output path escapes the destination root.");
	let current = lexical;
	while (!pathLexists(current)) {
		const parent = dirname(current);
		if (parent === current) break;
		current = parent;
	}
	const relativeAncestor = relative(destRoot, current);
	if (
		relativeAncestor === "" ||
		(!isAbsolute(relativeAncestor) && relativeAncestor !== ".." && !relativeAncestor.startsWith(`..${sep}`))
	) {
		const canonicalAncestor = realpathSync(current);
		assertContained(
			destRoot,
			canonicalAncestor,
			"Template output path escapes the destination root through a symlink.",
		);
	}
	return lexical;
}

function buildPlan(options: InstallOptions): BuiltPlan {
	const cwd = options.cwd ?? process.cwd();
	const destinationOption = options.dest ?? ".";
	if (!destinationOption.trim()) throw new CliError("CLI_INVALID_ARGUMENT", "The --dest option must not be empty.");
	const destination = resolve(cwd, destinationOption);
	const selected = templateById(options.id, cwd, { ...(options.from === undefined ? {} : { from: options.from }) });
	const order = resolveInstallOrder(selected.template.summary.id, selected.all);
	const dest = canonicalDestination(destination);
	const overwrite = options.overwrite === true;
	const entries: PlanningEntry[] = [];
	const collisions = new Set<string>();
	const claimed = new Set<string>();
	for (const template of order) {
		for (const source of enumerateSourceFiles(template)) {
			const target = assertDestinationPath(dest, source.path);
			const existing = pathLexists(target);
			const duplicate = claimed.has(source.path);
			if (existing || duplicate) collisions.add(source.path);
			entries.push({
				action: existing || duplicate ? (overwrite ? "overwrite" : "skip") : "create",
				path: source.path,
				bytes: source.bytes,
				template: template.summary.id,
				...(source.mode === undefined ? {} : { mode: source.mode }),
				sourcePath: source.sourcePath,
			});
			claimed.add(source.path);
		}
	}
	const summary: Record<PlanAction, number> = { create: 0, overwrite: 0, skip: 0 };
	for (const entry of entries) summary[entry.action] += 1;
	return {
		plan: {
			template: selected.template.summary.id,
			...(selected.template.summary.version === undefined ? {} : { version: selected.template.summary.version }),
			dest,
			overwrite,
			order: order.map(template => template.summary.id),
			entries: entries.map(({ sourcePath: _sourcePath, ...entry }) => entry),
			collisions: [...collisions].sort(),
			summary,
		},
		entries,
	};
}

function assertApplyPreflight(built: BuiltPlan): void {
	if (!built.plan.overwrite && built.plan.collisions.length > 0) {
		throw new CliError("CLI_TEMPLATE_COLLISION", "Template files would overwrite existing destination files.", {
			details: { collisions: built.plan.collisions },
			suggestion: "Review the dry-run plan or pass --overwrite to replace colliding files.",
		});
	}
	const paths = new Set(built.entries.map(entry => entry.path));
	for (const entry of built.entries) {
		const target = assertDestinationPath(built.plan.dest, entry.path);
		if (pathLexists(target) && statSync(target).isDirectory()) {
			throw new CliError("CLI_TEMPLATE_COLLISION", `Destination path is a directory: ${entry.path}.`, {
				details: { path: entry.path },
			});
		}
		for (let parent = dirname(entry.path); parent && parent !== "."; parent = dirname(parent)) {
			if (paths.has(parent)) {
				throw new CliError(
					"CLI_TEMPLATE_COLLISION",
					`Template file path conflicts with a parent path: ${entry.path}.`,
					{
						details: { path: entry.path, parent },
					},
				);
			}
		}
		let parent = dirname(target);
		while (parent !== built.plan.dest && parent !== dirname(parent)) {
			if (pathLexists(parent)) {
				const resolved = realpathSync(parent);
				assertContained(built.plan.dest, resolved, "A destination parent symlink escapes the destination root.");
				if (!statSync(parent).isDirectory()) {
					throw new CliError(
						"CLI_TEMPLATE_COLLISION",
						`Destination parent is not a directory: ${toSourcePath(built.plan.dest, parent)}.`,
						{
							details: { path: toSourcePath(built.plan.dest, parent) },
						},
					);
				}
			}
			parent = dirname(parent);
		}
	}
}

function createDirectories(directory: string): string[] {
	const missing: string[] = [];
	let current = directory;
	while (!pathLexists(current)) {
		missing.push(current);
		const parent = dirname(current);
		if (parent === current) break;
		current = parent;
	}
	for (const path of missing.reverse()) mkdirSync(path);
	return missing;
}

interface JournalEntry {
	readonly action: "create" | "overwrite";
	readonly destPath: string;
	readonly relPath: string;
	readonly backupPath?: string;
}

function applyTransaction(built: BuiltPlan): InstallResult {
	assertApplyPreflight(built);
	if (built.entries.length === 0) {
		return { plan: built.plan, status: "applied", written: [], backedUp: [], warnings: [] };
	}
	const backupRoot = mkdtempSync(join(tmpdir(), "fraym-template-"));
	const journal: JournalEntry[] = [];
	const createdDirectories = new Set<string>();
	const tempFiles = new Set<string>();
	const written: string[] = [];
	const backedUp: string[] = [];
	let failedPath: string | undefined;
	try {
		for (const entry of built.entries) {
			if (entry.action === "skip") continue;
			const plannedDestPath = assertDestinationPath(built.plan.dest, entry.path);
			failedPath = entry.path;
			for (const directory of createDirectories(dirname(plannedDestPath))) createdDirectories.add(directory);
			const canonicalParent = realpathSync(dirname(plannedDestPath));
			assertContained(
				built.plan.dest,
				canonicalParent,
				"A destination parent symlink escapes the destination root.",
			);
			const destPath = join(canonicalParent, basename(plannedDestPath));
			if (entry.action === "overwrite") {
				const backupPath = join(backupRoot, entry.path);
				mkdirSync(dirname(backupPath), { recursive: true });
				copyFileSync(destPath, backupPath);
				journal.push({ action: "overwrite", destPath, relPath: entry.path, backupPath });
				rmSync(destPath, { force: true });
				backedUp.push(entry.path);
			}
			const temporary = join(dirname(destPath), `.${basename(destPath)}.fraym-tmp-${randomUUID()}`);
			tempFiles.add(temporary);
			copyFileSync(entry.sourcePath, temporary);
			if (entry.action === "create") {
				linkSync(temporary, destPath);
				journal.push({ action: "create", destPath, relPath: entry.path });
				rmSync(temporary);
			} else {
				renameSync(temporary, destPath);
			}
			tempFiles.delete(temporary);
			if (process.platform !== "win32" && entry.mode !== undefined) chmodSync(destPath, entry.mode);
			written.push(entry.path);
		}
	} catch (error) {
		const unrecovered: string[] = [];
		const restored: string[] = [];
		for (const temporary of tempFiles) {
			try {
				rmSync(temporary, { force: true });
			} catch {
				unrecovered.push(temporary);
			}
		}
		for (const entry of [...journal].reverse()) {
			try {
				if (entry.action === "create") {
					rmSync(entry.destPath, { force: true });
				} else if (entry.backupPath) {
					rmSync(entry.destPath, { force: true });
					copyFileSync(entry.backupPath, entry.destPath);
					restored.push(entry.relPath);
				}
			} catch {
				unrecovered.push(entry.relPath);
			}
		}
		for (const directory of [...createdDirectories].sort((left, right) => right.length - left.length)) {
			try {
				rmSync(directory, { recursive: false, force: true });
			} catch {
				unrecovered.push(directory);
			}
		}
		if (unrecovered.length === 0) {
			try {
				rmSync(backupRoot, { recursive: true, force: true });
			} catch {
				unrecovered.push(backupRoot);
			}
		}
		throw new CliError(
			"CLI_TEMPLATE_APPLY_FAILED",
			`Template installation failed at ${failedPath ?? "an unknown path"}.`,
			{
				details: {
					failedPath,
					cause: error instanceof Error ? error.message : "unknown error",
					rolledBack: unrecovered.length === 0,
					restored,
					...(unrecovered.length === 0 ? {} : { partialRollback: true, unrecovered, backupRoot }),
				},
			},
		);
	}
	const warnings: string[] = [];
	try {
		rmSync(backupRoot, { recursive: true, force: true });
	} catch {
		warnings.push(`Backup retained at ${backupRoot}.`);
	}
	return { plan: built.plan, status: "applied", written, backedUp, warnings };
}

export function showTemplate(
	id: string,
	options: { readonly cwd?: string; readonly from?: string } = {},
): TemplateDetail {
	const cwd = options.cwd ?? process.cwd();
	const selected = templateById(id, cwd, options);
	const order = resolveInstallOrder(selected.template.summary.id, selected.all);
	return {
		template: selected.template.summary,
		files: enumerateSourceFiles(selected.template).map(({ sourcePath: _sourcePath, mode: _mode, ...file }) => file),
		resolvedOrder: order.map(template => template.summary.id),
	};
}

export function planInstall(options: InstallOptions): InstallPlan {
	return buildPlan(options).plan;
}

export function installTemplate(options: InstallOptions): InstallResult {
	const built = buildPlan(options);
	if (options.apply !== true) {
		return { plan: built.plan, status: "planned", written: [], backedUp: [], warnings: [] };
	}
	return applyTransaction(built);
}
