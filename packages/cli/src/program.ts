import { discoverCatalog } from "./catalog";
import {
	CATALOG_ITEM_TYPES,
	type CliManifest,
	type DoctorCheck,
	type DoctorReport,
	type DoctorStatus,
} from "./contracts";
import { discoverTemplates } from "./templates";

export const CLI_MANIFEST: CliManifest = {
	name: "fraym",
	version: "1",
	description: "Discover Fraym packages and install template files safely.",
	globalOptions: [
		{
			name: "--json",
			type: "boolean",
			description: "Emit a stable machine-readable response envelope.",
		},
		{
			name: "--help",
			type: "boolean",
			description: "Show command help.",
		},
	],
	commands: [
		{
			name: "manifest",
			description: "Describe commands, options, response types, and stable error codes.",
			arguments: [],
			options: [],
			response: "CliEnvelope<CliManifest>",
		},
		{
			name: "search",
			description: "Search public Fraym catalog entries by deterministic token relevance.",
			arguments: [
				{ name: "query", type: "string", description: "Words to search across public names and metadata." },
			],
			options: [
				{
					name: "--type",
					type: "string",
					description: "Restrict results to one catalog type.",
					values: CATALOG_ITEM_TYPES,
				},
				{ name: "--limit", type: "integer", description: "Maximum number of results (positive integer)." },
			],
			response: "CliEnvelope<SearchReport>",
		},
		{
			name: "doctor",
			description: "Check runtime, Fraym package visibility, catalog usability, and template metadata.",
			arguments: [],
			options: [],
			response: "CliEnvelope<DoctorReport>",
		},
		{
			name: "template",
			description: "Discover, inspect, and install Fraym templates.",
			arguments: [],
			options: [],
			response: "CliEnvelope<TemplateList | TemplateDetail | InstallResult>",
			subcommands: [
				{
					name: "list",
					description: "List discovered templates and metadata issues.",
					arguments: [],
					options: [],
					response: "CliEnvelope<TemplateList>",
				},
				{
					name: "show",
					description: "Show a template's files and required installation order.",
					arguments: [{ name: "id", type: "string", description: "Template identifier." }],
					options: [{ name: "--from", type: "string", description: "Template package directory." }],
					response: "CliEnvelope<TemplateDetail>",
				},
				{
					name: "install",
					description: "Plan a template install; writes only with --apply.",
					arguments: [{ name: "id", type: "string", description: "Template identifier." }],
					options: [
						{
							name: "--dest",
							type: "string",
							description: "Destination directory (defaults to current directory).",
						},
						{ name: "--from", type: "string", description: "Template package directory." },
						{ name: "--apply", type: "boolean", description: "Apply the preflighted install plan." },
						{ name: "--overwrite", type: "boolean", description: "Replace colliding files during apply." },
					],
					response: "CliEnvelope<InstallResult>",
				},
			],
		},
	],
	errorCodes: [
		"CLI_UNKNOWN_COMMAND",
		"CLI_UNKNOWN_OPTION",
		"CLI_MISSING_ARGUMENT",
		"CLI_INVALID_ARGUMENT",
		"CLI_INVALID_LIMIT",
		"CLI_INVALID_TYPE",
		"CLI_CATALOG_UNAVAILABLE",
		"CLI_INVALID_METADATA",
		"CLI_INTERNAL_ERROR",
		"CLI_TEMPLATE_NOT_FOUND",
		"CLI_TEMPLATE_DUPLICATE_ID",
		"CLI_TEMPLATE_COLLISION",
		"CLI_TEMPLATE_PATH_ESCAPE",
		"CLI_TEMPLATE_APPLY_FAILED",
	],
};

function summary(checks: readonly DoctorCheck[]): Readonly<Record<DoctorStatus, number>> {
	const result: Record<DoctorStatus, number> = { pass: 0, warn: 0, fail: 0, info: 0 };
	for (const check of checks) result[check.status] += 1;
	return result;
}

export function createManifest(): CliManifest {
	return CLI_MANIFEST;
}

export function runDoctor(cwd = process.cwd()): DoctorReport {
	const catalog = discoverCatalog(cwd);
	const checks: DoctorCheck[] = [];
	const bunVersion = process.versions.bun;
	checks.push(
		bunVersion
			? { id: "runtime", status: "pass", message: `Bun ${bunVersion} is available.`, details: { bunVersion } }
			: {
					id: "runtime",
					status: "fail",
					message: "Bun runtime is unavailable.",
					fix: "Run this command with Bun 1.3.14 or newer.",
				},
	);

	const packageNames = [...new Set(catalog.items.map(item => item.package).filter(name => name.startsWith("@fraym/")))];
	const uiVisible = packageNames.includes("@fraym/ui");
	const vibrVisible = packageNames.includes("@fraym/vibr");
	if (uiVisible || vibrVisible) {
		checks.push({
			id: "packages",
			status: "pass",
			message: `Visible Fraym packages: ${packageNames.sort().join(", ")}.`,
			details: { packages: packageNames.length },
		});
	} else if (catalog.issues.length > 0) {
		checks.push({
			id: "packages",
			status: "fail",
			message: "Fraym package metadata is invalid.",
			fix: "Repair the reported package.json files and run fraym doctor again.",
		});
	} else {
		checks.push({
			id: "packages",
			status: "warn",
			message: "No @fraym/ui or @fraym/vibr package is visible from this directory.",
			fix: "Run from a Fraym workspace or install the Fraym packages in this project.",
		});
	}

	if (catalog.issues.length > 0) {
		checks.push({
			id: "catalog",
			status: "fail",
			message: `Catalog metadata has ${catalog.issues.length} invalid ${catalog.issues.length === 1 ? "entry" : "entries"}.`,
			fix: "Repair the package or manifest metadata identified by the catalog issues.",
			details: { issues: catalog.issues.length },
		});
	} else if (catalog.items.length > 0) {
		checks.push({
			id: "catalog",
			status: "pass",
			message: `Catalog is usable with ${catalog.items.length} public entries.`,
			details: { entries: catalog.items.length },
		});
	} else {
		checks.push({
			id: "catalog",
			status: "warn",
			message: "No Fraym catalog entries were found in this directory.",
			fix: "Install @fraym/ui or run from a Fraym workspace.",
		});
	}

	const templateCatalog = discoverTemplates(cwd);
	const templateIssues = templateCatalog.issues;
	const templates = templateCatalog.templates;
	checks.push(
		templateIssues.length > 0
			? {
					id: "templates",
					status: "fail",
					message: `Template metadata has ${templateIssues.length} invalid ${templateIssues.length === 1 ? "entry" : "entries"}.`,
					fix: "Repair the template package metadata.",
					details: { issues: templateIssues.length },
				}
			: templates.length > 0
				? {
						id: "templates",
						status: "pass",
						message: `${templates.length} template manifest${templates.length === 1 ? "" : "s"} is valid.`,
					}
				: { id: "templates", status: "info", message: "No template manifests were found." },
	);

	const reportSummary = summary(checks);
	return { root: catalog.root, checks, summary: reportSummary, exitCode: reportSummary.fail > 0 ? 1 : 0 };
}
