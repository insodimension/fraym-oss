#!/usr/bin/env bun

import { isCatalogItemType, searchCatalog } from "./catalog";
import {
	type CatalogItemType,
	type CliEnvelope,
	CliError,
	type DoctorReport,
	failure,
	type InstallResult,
	type SearchReport,
	type SkillList,
	type SkillTarget,
	success,
	type TemplateDetail,
	type TemplateList,
} from "./contracts";
import { createManifest, runDoctor } from "./program";
import { discoverTemplates, installTemplate, showTemplate } from "./templates";
import { discoverSkills, installSkill } from "./skills";

interface ParsedSearch {
	readonly query: string;
	readonly type?: CatalogItemType;
	readonly limit?: number;
}

interface ParsedTemplateShow {
	readonly id: string;
	readonly from?: string;
}

interface ParsedTemplateInstall extends ParsedTemplateShow {
	readonly dest?: string;
	readonly apply: boolean;
	readonly overwrite: boolean;
}

interface ParsedSkillInstall {
	readonly id: string;
	readonly dest?: string;
	readonly apply: boolean;
	readonly overwrite: boolean;
	readonly targets?: readonly SkillTarget[];
}

function help(command?: string): string {
	if (command === "search") {
		return [
			"Usage: fraym search <query> [--type <type>] [--limit <count>] [--json]",
			"",
			"Search public Fraym elements, components, features, pages, themes, avatars, wisp presets, templates, and apps.",
		].join("\n");
	}
	if (command === "template" || command === "template list") {
		return [
			"Usage: fraym template <subcommand> [options]",
			"",
			"Subcommands:",
			"  list                     List discovered templates.",
			"  show <id> [--from <dir>] Show template files and required templates.",
			"  install <id> [--dest <dir>] [--from <dir>] [--apply] [--overwrite]",
			"",
			"Install is a dry-run unless --apply is provided.",
		].join("\n");
	}
	if (command === "template show") {
		return "Usage: fraym template show <id> [--from <dir>] [--json]";
	}
	if (command === "template install") {
		return "Usage: fraym template install <id> [--dest <dir>] [--from <dir>] [--apply] [--overwrite] [--json]";
	}
	if (command === "skills" || command === "skills list") {
		return [
			"Usage: fraym skills <subcommand> [options]",
			"",
			"Subcommands:",
			"  list                      List bundled skills.",
			"  install <id> [--dest <dir>] [--target claude|codex|both] [--apply] [--overwrite]",
			"",
			"Install is a dry-run unless --apply is provided; it writes into .claude/skills/<id> and/or .codex/skills/<id>.",
		].join("\n");
	}
	if (command === "skills install") {
		return "Usage: fraym skills install <id> [--dest <dir>] [--target claude|codex|both] [--apply] [--overwrite] [--json]";
	}
	return [
		"Usage: fraym <command> [options]",
		"",
		"Commands:",
		"  manifest                 Describe the CLI contract.",
		"  search <query>           Search public Fraym catalog entries.",
		"  doctor                   Check runtime and catalog health.",
		"  template <subcommand>   Discover, inspect, and install templates.",
		"  skills <subcommand>      Discover and install bundled agent skills.",
		"",
		"Global options:",
		"  --json                   Emit a stable JSON envelope.",
		"  --help, -h               Show help.",
	].join("\n");
}

function parseSearch(args: readonly string[]): ParsedSearch {
	const query: string[] = [];
	let type: string | undefined;
	let limit: number | undefined;
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (!argument) continue;
		if (argument === "--type") {
			const value = args[index + 1];
			if (!value || value.startsWith("--")) {
				throw new CliError("CLI_MISSING_ARGUMENT", "The --type option requires a catalog type.", {
					suggestion: "Use --type element, --type component, or another type listed by fraym manifest.",
				});
			}
			type = value;
			index += 1;
			continue;
		}
		if (argument.startsWith("--type=")) {
			const value = argument.slice("--type=".length);
			if (!value) {
				throw new CliError("CLI_MISSING_ARGUMENT", "The --type option requires a catalog type.", {
					suggestion: "Use --type element, --type component, or another type listed by fraym manifest.",
				});
			}
			type = value;
			continue;
		}
		if (argument === "--limit") {
			const value = args[index + 1];
			if (!value || value.startsWith("--")) {
				throw new CliError("CLI_MISSING_ARGUMENT", "The --limit option requires a positive integer.", {
					suggestion: "Use a value such as --limit 20.",
				});
			}
			limit = Number(value);
			index += 1;
			continue;
		}
		if (argument.startsWith("--limit=")) {
			limit = Number(argument.slice("--limit=".length));
			continue;
		}
		if (argument.startsWith("-")) {
			throw new CliError("CLI_UNKNOWN_OPTION", `Unknown search option: ${argument}.`, {
				suggestion: "Run fraym search --help to see supported options.",
			});
		}
		query.push(argument);
	}
	if (query.length === 0) {
		throw new CliError("CLI_MISSING_ARGUMENT", "The search command requires a query.", {
			suggestion: "Use fraym search button.",
		});
	}
	if (type !== undefined && !isCatalogItemType(type)) {
		throw new CliError("CLI_INVALID_TYPE", `Unsupported catalog type: ${type}.`, {
			suggestion: "Run fraym manifest to list supported catalog types.",
		});
	}
	return {
		query: query.join(" "),
		...(type === undefined ? {} : { type: type as CatalogItemType }),
		...(limit === undefined ? {} : { limit }),
	};
}

function printJson<T>(envelope: CliEnvelope<T>): void {
	console.log(JSON.stringify(envelope));
}

function printSearch(report: SearchReport): void {
	if (report.results.length === 0) {
		console.log(`No public Fraym catalog entries matched ${JSON.stringify(report.query)}.`);
		return;
	}
	for (const result of report.results) {
		console.log(`${result.type.padEnd(12)} ${result.name}  ${result.package}  ${result.source}`);
	}

	console.log(`\n${report.results.length} of ${report.total} result${report.total === 1 ? "" : "s"}.`);
}

function optionValue(
	args: readonly string[],
	index: number,
	name: "--from" | "--dest",
): { readonly value: string; readonly next: number } {
	const argument = args[index];
	if (argument === name) {
		const value = args[index + 1];
		if (!value || value.startsWith("--")) {
			throw new CliError("CLI_MISSING_ARGUMENT", `The ${name} option requires a directory.`, {
				suggestion: `Use ${name} <directory>.`,
			});
		}
		return { value, next: index + 1 };
	}
	const value = argument?.slice(`${name}=`.length) ?? "";
	if (!value) {
		throw new CliError("CLI_MISSING_ARGUMENT", `The ${name} option requires a directory.`, {
			suggestion: `Use ${name} <directory>.`,
		});
	}
	return { value, next: index };
}

function parseTemplateShow(args: readonly string[]): ParsedTemplateShow {
	const positional: string[] = [];
	let from: string | undefined;
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (!argument) continue;
		if (argument === "--from" || argument.startsWith("--from=")) {
			const parsed = optionValue(args, index, "--from");
			from = parsed.value;
			index = parsed.next;
			continue;
		}
		if (argument.startsWith("-")) {
			throw new CliError("CLI_UNKNOWN_OPTION", `Unknown template show option: ${argument}.`, {
				suggestion: "Run fraym template show --help to see supported options.",
			});
		}
		positional.push(argument);
	}
	if (positional.length === 0) {
		throw new CliError("CLI_MISSING_ARGUMENT", "The template show command requires a template id.", {
			suggestion: "Use fraym template show <id>.",
		});
	}
	if (positional.length > 1 || !positional[0]?.trim()) {
		throw new CliError("CLI_INVALID_ARGUMENT", "The template show command accepts exactly one template id.");
	}
	return { id: positional[0], ...(from === undefined ? {} : { from }) };
}

function parseTemplateInstall(args: readonly string[]): ParsedTemplateInstall {
	const positional: string[] = [];
	let from: string | undefined;
	let dest: string | undefined;
	let apply = false;
	let overwrite = false;
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (!argument) continue;
		if (argument === "--from" || argument.startsWith("--from=")) {
			const parsed = optionValue(args, index, "--from");
			from = parsed.value;
			index = parsed.next;
			continue;
		}
		if (argument === "--dest" || argument.startsWith("--dest=")) {
			const parsed = optionValue(args, index, "--dest");
			dest = parsed.value;
			index = parsed.next;
			continue;
		}
		if (argument === "--apply") {
			apply = true;
			continue;
		}
		if (argument === "--overwrite") {
			overwrite = true;
			continue;
		}
		if (argument.startsWith("-")) {
			throw new CliError("CLI_UNKNOWN_OPTION", `Unknown template install option: ${argument}.`, {
				suggestion: "Run fraym template install --help to see supported options.",
			});
		}
		positional.push(argument);
	}
	if (positional.length === 0) {
		throw new CliError("CLI_MISSING_ARGUMENT", "The template install command requires a template id.", {
			suggestion: "Use fraym template install <id>.",
		});
	}
	if (positional.length > 1 || !positional[0]?.trim()) {
		throw new CliError("CLI_INVALID_ARGUMENT", "The template install command accepts exactly one template id.");
	}
	return {
		id: positional[0],
		...(from === undefined ? {} : { from }),
		...(dest === undefined ? {} : { dest }),
		apply,
		overwrite,
	};
}

function parseTargets(raw: string | undefined): readonly SkillTarget[] {
	if (!raw || raw.startsWith("--")) {
		throw new CliError("CLI_MISSING_ARGUMENT", "The --target option requires a value.", {
			suggestion: "Use --target claude|codex|both.",
		});
	}
	if (raw === "both") return ["claude", "codex"];
	if (raw === "claude" || raw === "codex") return [raw];
	throw new CliError("CLI_INVALID_ARGUMENT", `Unknown skills target: ${raw}.`, {
		suggestion: "Use --target claude|codex|both.",
	});
}

function parseSkillInstall(args: readonly string[]): ParsedSkillInstall {
	const positional: string[] = [];
	let dest: string | undefined;
	let apply = false;
	let overwrite = false;
	let targets: readonly SkillTarget[] | undefined;
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (!argument) continue;
		if (argument === "--dest" || argument.startsWith("--dest=")) {
			const parsed = optionValue(args, index, "--dest");
			dest = parsed.value;
			index = parsed.next;
			continue;
		}
		if (argument === "--target" || argument.startsWith("--target=")) {
			if (argument === "--target") {
				targets = parseTargets(args[index + 1]);
				index += 1;
			} else {
				targets = parseTargets(argument.slice("--target=".length));
			}
			continue;
		}
		if (argument === "--apply") {
			apply = true;
			continue;
		}
		if (argument === "--overwrite") {
			overwrite = true;
			continue;
		}
		if (argument.startsWith("-")) {
			throw new CliError("CLI_UNKNOWN_OPTION", `Unknown skills install option: ${argument}.`, {
				suggestion: "Run fraym skills install --help to see supported options.",
			});
		}
		positional.push(argument);
	}
	if (positional.length === 0) {
		throw new CliError("CLI_MISSING_ARGUMENT", "The skills install command requires a skill id.", {
			suggestion: "Use fraym skills install <id>.",
		});
	}
	if (positional.length > 1 || !positional[0]?.trim()) {
		throw new CliError("CLI_INVALID_ARGUMENT", "The skills install command accepts exactly one skill id.");
	}
	return {
		id: positional[0],
		...(dest === undefined ? {} : { dest }),
		apply,
		overwrite,
		...(targets === undefined ? {} : { targets }),
	};
}

function printDoctor(report: DoctorReport): void {
	for (const check of report.checks) {
		console.log(`${check.status.toUpperCase().padEnd(5)} ${check.id}: ${check.message}`);
		if (check.fix) console.log(`      Fix: ${check.fix}`);
	}
	console.log(
		`\nSummary: ${report.summary.pass} pass, ${report.summary.warn} warn, ${report.summary.fail} fail, ${report.summary.info} info.`,
	);
}

function printTemplateList(list: TemplateList): void {
	if (list.templates.length === 0) {
		console.log("No templates were discovered.");
	} else {
		for (const template of list.templates) {
			console.log(
				`${template.id.padEnd(24)} ${template.version ?? "-"}  ${template.package ?? "manifest"}  ${template.source}`,
			);
		}
	}
	for (const issue of list.issues) console.log(`WARNING ${issue.code}: ${issue.message} (${issue.path})`);
}

function printTemplateDetail(detail: TemplateDetail): void {
	console.log(`${detail.template.id}${detail.template.version ? ` ${detail.template.version}` : ""}`);
	if (detail.template.description) console.log(detail.template.description);
	console.log(`Source: ${detail.template.source}`);
	console.log(`Install order: ${detail.resolvedOrder.join(" -> ")}`);
	if (detail.files.length === 0) {
		console.log("No template files matched.");
		return;
	}
	for (const file of detail.files) console.log(`${file.executable ? "*" : " "} ${file.path} (${file.bytes} bytes)`);
}

function printInstall(result: InstallResult): void {
	const { plan } = result;
	console.log(`${result.status === "planned" ? "Planned" : "Applied"} ${plan.template} into ${plan.dest}.`);
	console.log(`Files: ${plan.summary.create} create, ${plan.summary.overwrite} overwrite, ${plan.summary.skip} skip.`);
	for (const entry of plan.entries)
		console.log(`${entry.action.toUpperCase().padEnd(9)} ${entry.path} (${entry.template})`);
	if (plan.collisions.length > 0) console.log(`Collisions: ${plan.collisions.join(", ")}`);
	for (const warning of result.warnings) console.log(`WARNING ${warning}`);
}

function printSkillList(list: SkillList): void {
	if (list.skills.length === 0) {
		console.log("No skills were discovered.");
	} else {
		for (const skill of list.skills) {
			console.log(`${skill.id.padEnd(24)} ${skill.files} files  ${skill.bytes} bytes  ${skill.description ?? ""}`);
		}
	}
	for (const issue of list.issues) console.log(`WARNING ${issue.code}: ${issue.message} (${issue.path})`);
}

export function main(args = process.argv.slice(2)): number {
	const json = args.includes("--json");
	try {
		const cleaned = args.filter(argument => argument !== "--json");
		const command = cleaned[0];
		if (!command || command === "--help" || command === "-h") {
			if (json) printJson(success(createManifest()));
			else console.log(help());
			return 0;
		}
		if (cleaned.includes("--help") || cleaned.includes("-h")) {
			if (json) printJson(success(createManifest()));
			else console.log(help(cleaned.slice(0, 2).join(" ")));
			return 0;
		}
		if (command === "manifest") {
			if (cleaned.length > 1) {
				throw new CliError("CLI_UNKNOWN_OPTION", `Unknown manifest option: ${cleaned[1]}.`, {
					suggestion: "Run fraym manifest --help for usage.",
				});
			}
			if (json) printJson(success(createManifest()));
			else console.log(JSON.stringify(createManifest(), null, 2));
			return 0;
		}
		if (command === "search") {
			const parsed = parseSearch(cleaned.slice(1));
			const report = searchCatalog({
				query: parsed.query,
				...(parsed.type ? { type: parsed.type } : {}),
				...(parsed.limit === undefined ? {} : { limit: parsed.limit }),
			});
			if (json) printJson(success(report));
			else printSearch(report);
			return 0;
		}
		if (command === "template") {
			const subcommand = cleaned[1];
			if (subcommand === "list") {
				if (cleaned.length > 2) {
					throw new CliError("CLI_UNKNOWN_OPTION", `Unknown template list option: ${cleaned[2]}.`, {
						suggestion: "Run fraym template list --help for usage.",
					});
				}
				const list = discoverTemplates();
				if (json) printJson(success(list));
				else printTemplateList(list);
				return 0;
			}
			if (subcommand === "show") {
				const parsed = parseTemplateShow(cleaned.slice(2));
				const detail = showTemplate(parsed.id, parsed.from === undefined ? {} : { from: parsed.from });
				if (json) printJson(success(detail));
				else printTemplateDetail(detail);
				return 0;
			}
			if (subcommand === "install") {
				const parsed = parseTemplateInstall(cleaned.slice(2));
				const result = installTemplate(parsed);
				if (json) printJson(success(result));
				else printInstall(result);
				return 0;
			}
			throw new CliError("CLI_UNKNOWN_COMMAND", `Unknown template subcommand: ${subcommand ?? ""}.`, {
				suggestion: "Run fraym template --help to list template subcommands.",
			});
		}
		if (command === "doctor") {
			if (cleaned.length > 1) {
				throw new CliError("CLI_UNKNOWN_OPTION", `Unknown doctor option: ${cleaned[1]}.`, {
					suggestion: "Run fraym doctor --help for usage.",
				});
			}
			const report = runDoctor();
			if (json) printJson(success(report));
			else printDoctor(report);
			return report.exitCode;
		}
		if (command === "skills") {
			const subcommand = cleaned[1];
			if (subcommand === "list") {
				if (cleaned.length > 2) {
					throw new CliError("CLI_UNKNOWN_OPTION", `Unknown skills list option: ${cleaned[2]}.`, {
						suggestion: "Run fraym skills list --help for usage.",
					});
				}
				const list = discoverSkills();
				if (json) printJson(success(list));
				else printSkillList(list);
				return 0;
			}
			if (subcommand === "install") {
				const parsed = parseSkillInstall(cleaned.slice(2));
				const result = installSkill(parsed);
				if (json) printJson(success(result));
				else printInstall(result);
				return 0;
			}
			throw new CliError("CLI_UNKNOWN_COMMAND", `Unknown skills subcommand: ${subcommand ?? ""}.`, {
				suggestion: "Run fraym skills --help to list skills subcommands.",
			});
		}
		throw new CliError("CLI_UNKNOWN_COMMAND", `Unknown command: ${command}.`, {
			suggestion: "Run fraym --help to list commands.",
		});
	} catch (error) {
		const cliError =
			error instanceof CliError
				? error
				: new CliError(
						"CLI_INTERNAL_ERROR",
						error instanceof Error ? error.message : "An unexpected error occurred.",
					);
		if (json) printJson(failure(cliError));
		else {
			console.error(`Error [${cliError.code}]: ${cliError.message}`);
			if (cliError.suggestion) console.error(`Suggestion: ${cliError.suggestion}`);
		}
		return 1;
	}
}

process.exitCode = main();
