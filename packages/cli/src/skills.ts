import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	type CatalogIssue,
	CliError,
	type InstallResult,
	type PlanAction,
	type SkillInstallOptions,
	type SkillList,
	type SkillSummary,
	type SkillTarget,
	SKILL_TARGETS,
} from "./contracts";
import { applyTransaction, type BuiltPlan, canonicalDestination, type PlanningEntry } from "./templates";

// Bundled skills ship beside this package's `src` (see package.json "files").
// From packages/cli/src/skills.ts, "../skills" resolves to packages/cli/skills.
const moduleDir = fileURLToPath(new URL(".", import.meta.url));

const TARGET_DIRS: Readonly<Record<SkillTarget, string>> = { claude: ".claude", codex: ".codex" };

interface SkillFile {
	readonly path: string;
	readonly bytes: number;
	readonly sourcePath: string;
}

function skillsRoot(): string {
	return resolve(moduleDir, "..", "skills");
}

function frontmatterField(markdown: string, field: string): string | undefined {
	if (!markdown.startsWith("---")) return undefined;
	const end = markdown.indexOf("\n---", 3);
	if (end === -1) return undefined;
	const block = markdown.slice(0, end);
	for (const line of block.split("\n")) {
		const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
		if (match && match[1] === field) {
			return (match[2] ?? "").trim().replace(/^["']|["']$/g, "");
		}
	}
	return undefined;
}

function enumerateSkillFiles(root: string): SkillFile[] {
	const files: SkillFile[] = [];
	const walk = (directory: string, relative: string): void => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const absolute = join(directory, entry.name);
			const relativePath = relative ? `${relative}/${entry.name}` : entry.name;
			const stats = statSync(absolute);
			if (stats.isDirectory()) {
				walk(absolute, relativePath);
				continue;
			}
			if (!stats.isFile()) continue;
			files.push({ path: relativePath, bytes: stats.size, sourcePath: absolute });
		}
	};
	walk(root, "");
	return files.sort((left, right) => left.path.localeCompare(right.path));
}

function loadSkillSummary(id: string, root: string): SkillSummary {
	const directory = join(root, id);
	const description = frontmatterField(readFileSync(join(directory, "SKILL.md"), "utf8"), "description");
	const files = enumerateSkillFiles(directory);
	return {
		id,
		...(description === undefined ? {} : { description }),
		source: `skills/${id}`,
		files: files.length,
		bytes: files.reduce((total, file) => total + file.bytes, 0),
	};
}

export function discoverSkills(): SkillList {
	const root = skillsRoot();
	if (!existsSync(root)) return { root, skills: [], issues: [] };
	const skills: SkillSummary[] = [];
	const issues: CatalogIssue[] = [];
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const directory = join(root, entry.name);
		if (!existsSync(join(directory, "SKILL.md"))) {
			issues.push({ code: "invalid-manifest", path: directory, message: "Skill directory has no SKILL.md." });
			continue;
		}
		try {
			skills.push(loadSkillSummary(entry.name, root));
		} catch (error) {
			issues.push({
				code: "invalid-manifest",
				path: directory,
				message: error instanceof Error ? error.message : "Could not read skill.",
			});
		}
	}
	return {
		root,
		skills: skills.sort((left, right) => left.id.localeCompare(right.id)),
		issues: [...issues].sort((left, right) => left.path.localeCompare(right.path)),
	};
}

export function buildSkillPlan(options: SkillInstallOptions): BuiltPlan {
	const cwd = options.cwd ?? process.cwd();
	const destinationOption = options.dest ?? ".";
	if (!destinationOption.trim()) throw new CliError("CLI_INVALID_ARGUMENT", "The --dest option must not be empty.");
	if (!options.id.trim() || !existsSync(join(skillsRoot(), options.id, "SKILL.md"))) {
		throw new CliError("CLI_SKILL_NOT_FOUND", `Skill not found: ${options.id || "(empty)"}.`, {
			suggestion: "Run fraym skills list to see available skills.",
		});
	}
	const targets = options.targets && options.targets.length > 0 ? options.targets : SKILL_TARGETS;
	const dest = canonicalDestination(resolve(cwd, destinationOption));
	const overwrite = options.overwrite === true;
	const files = enumerateSkillFiles(join(skillsRoot(), options.id));
	const entries: PlanningEntry[] = [];
	const collisions = new Set<string>();
	for (const target of targets) {
		const prefix = `${TARGET_DIRS[target]}/skills/${options.id}`;
		for (const file of files) {
			const path = `${prefix}/${file.path}`;
			const existing = existsSync(resolve(dest, path));
			if (existing) collisions.add(path);
			entries.push({
				action: existing ? (overwrite ? "overwrite" : "skip") : "create",
				path,
				bytes: file.bytes,
				template: options.id,
				sourcePath: file.sourcePath,
			});
		}
	}
	const summary: Record<PlanAction, number> = { create: 0, overwrite: 0, skip: 0 };
	for (const entry of entries) summary[entry.action] += 1;
	return {
		plan: {
			template: options.id,
			dest,
			overwrite,
			order: [...targets],
			entries: entries.map(({ sourcePath: _sourcePath, ...entry }) => entry),
			collisions: [...collisions].sort(),
			summary,
		},
		entries,
	};
}

export function installSkill(options: SkillInstallOptions): InstallResult {
	const built = buildSkillPlan(options);
	if (options.apply !== true) {
		return { plan: built.plan, status: "planned", written: [], backedUp: [], warnings: [] };
	}
	if (!built.plan.overwrite && built.plan.collisions.length > 0) {
		throw new CliError("CLI_SKILL_COLLISION", "Skill files would overwrite existing destination files.", {
			details: { collisions: built.plan.collisions },
			suggestion: "Re-run with --overwrite to replace them.",
		});
	}
	return applyTransaction(built);
}
