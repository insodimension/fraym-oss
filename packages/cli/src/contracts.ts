export const CLI_ENVELOPE_VERSION = "1" as const;

export type CliErrorCode =
	| "CLI_UNKNOWN_COMMAND"
	| "CLI_UNKNOWN_OPTION"
	| "CLI_MISSING_ARGUMENT"
	| "CLI_INVALID_ARGUMENT"
	| "CLI_INVALID_LIMIT"
	| "CLI_INVALID_TYPE"
	| "CLI_CATALOG_UNAVAILABLE"
	| "CLI_INVALID_METADATA"
	| "CLI_INTERNAL_ERROR"
	| "CLI_TEMPLATE_NOT_FOUND"
	| "CLI_TEMPLATE_DUPLICATE_ID"
	| "CLI_TEMPLATE_COLLISION"
	| "CLI_TEMPLATE_PATH_ESCAPE"
	| "CLI_TEMPLATE_APPLY_FAILED";

export interface CliSuccess<T> {
	readonly ok: true;
	readonly version: typeof CLI_ENVELOPE_VERSION;
	readonly data: T;
}

export interface CliFailure {
	readonly ok: false;
	readonly version: typeof CLI_ENVELOPE_VERSION;
	readonly error: {
		readonly code: CliErrorCode;
		readonly message: string;
		readonly suggestion?: string;
		readonly details?: Readonly<Record<string, unknown>>;
	};
}

export type CliEnvelope<T> = CliSuccess<T> | CliFailure;

export type CatalogItemType =
	| "element"
	| "component"
	| "feature"
	| "page"
	| "theme"
	| "avatar"
	| "wisp-preset"
	| "template"
	| "app";

export const CATALOG_ITEM_TYPES: readonly CatalogItemType[] = [
	"element",
	"component",
	"feature",
	"page",
	"theme",
	"avatar",
	"wisp-preset",
	"template",
	"app",
] as const;

export interface CatalogItem {
	readonly type: CatalogItemType;
	readonly name: string;
	readonly package: string;
	readonly source: string;
	readonly description?: string;
	readonly metadata?: Readonly<Record<string, string | boolean | number>>;
}

export interface CatalogIssue {
	readonly code: "invalid-json" | "missing-public-barrel" | "invalid-manifest" | "duplicate-id";
	readonly path: string;
	readonly message: string;
}

export interface Catalog {
	readonly root: string;
	readonly items: readonly CatalogItem[];
	readonly issues: readonly CatalogIssue[];
}

export interface SearchOptions {
	readonly query: string;
	readonly type?: CatalogItemType;
	readonly limit?: number;
	readonly cwd?: string;
}

export interface SearchResult extends CatalogItem {
	readonly score: number;
}

export interface SearchReport {
	readonly query: string;
	readonly type?: CatalogItemType;
	readonly results: readonly SearchResult[];
	readonly total: number;
}

export type DoctorStatus = "pass" | "warn" | "fail" | "info";

export interface DoctorCheck {
	readonly id: "runtime" | "packages" | "catalog" | "templates";
	readonly status: DoctorStatus;
	readonly message: string;
	readonly fix?: string;
	readonly details?: Readonly<Record<string, string | number | boolean>>;
}

export interface DoctorReport {
	readonly root: string;
	readonly checks: readonly DoctorCheck[];
	readonly summary: Readonly<Record<DoctorStatus, number>>;
	exitCode: 0 | 1;
}

export interface ManifestOption {
	readonly name: string;
	readonly type: "boolean" | "string" | "integer";
	readonly description: string;
	readonly values?: readonly string[];
}

export interface CommandManifest {
	readonly name: "manifest" | "search" | "doctor" | "template" | "list" | "show" | "install";
	readonly description: string;
	readonly arguments: readonly ManifestOption[];
	readonly options: readonly ManifestOption[];
	readonly response: string;
	readonly subcommands?: readonly CommandManifest[];
}

export interface CliManifest {
	readonly name: "fraym";
	readonly version: typeof CLI_ENVELOPE_VERSION;
	readonly description: string;
	readonly globalOptions: readonly ManifestOption[];
	readonly commands: readonly CommandManifest[];
	readonly errorCodes: readonly CliErrorCode[];
}

export interface RawTemplateManifest {
	readonly id?: string;
	readonly name?: string;
	readonly version?: string;
	readonly description?: string;
	readonly package?: string;
	readonly source?: string;
	readonly files?: readonly string[];
	readonly requires?: readonly string[];
}

export interface TemplateSummary {
	readonly id: string;
	readonly version?: string;
	readonly description?: string;
	readonly package?: string;
	readonly source: string;
	readonly requires: readonly string[];
}

export interface TemplateList {
	readonly root: string;
	readonly templates: readonly TemplateSummary[];
	readonly issues: readonly CatalogIssue[];
}

export interface TemplateFile {
	readonly path: string;
	readonly bytes: number;
	readonly executable: boolean;
}

export interface TemplateDetail {
	readonly template: TemplateSummary;
	readonly files: readonly TemplateFile[];
	readonly resolvedOrder: readonly string[];
}

export type PlanAction = "create" | "overwrite" | "skip";

export interface PlanEntry {
	readonly action: PlanAction;
	readonly path: string;
	readonly bytes: number;
	readonly template: string;
	readonly mode?: number;
}

export interface InstallPlan {
	readonly template: string;
	readonly version?: string;
	readonly dest: string;
	readonly overwrite: boolean;
	readonly order: readonly string[];
	readonly entries: readonly PlanEntry[];
	readonly collisions: readonly string[];
	readonly summary: Readonly<Record<PlanAction, number>>;
}

export type InstallStatus = "planned" | "applied";

export interface InstallResult {
	readonly plan: InstallPlan;
	readonly status: InstallStatus;
	readonly written: readonly string[];
	readonly backedUp: readonly string[];
	readonly warnings: readonly string[];
}

export interface InstallOptions {
	readonly id: string;
	readonly cwd?: string;
	readonly dest?: string;
	readonly apply?: boolean;
	readonly overwrite?: boolean;
	readonly from?: string;
}
export class CliError extends Error {
	readonly code: CliErrorCode;
	readonly suggestion?: string;
	readonly details?: Readonly<Record<string, unknown>>;

	constructor(
		code: CliErrorCode,
		message: string,
		options: {
			readonly suggestion?: string;
			readonly details?: Readonly<Record<string, unknown>>;
		} = {},
	) {
		super(message);
		this.name = "CliError";
		this.code = code;
		this.suggestion = options.suggestion;
		this.details = options.details;
	}
}

export function success<T>(data: T): CliSuccess<T> {
	return { ok: true, version: CLI_ENVELOPE_VERSION, data };
}

export function failure(error: CliError): CliFailure {
	return {
		ok: false,
		version: CLI_ENVELOPE_VERSION,
		error: {
			code: error.code,
			message: error.message,
			...(error.suggestion ? { suggestion: error.suggestion } : {}),
			...(error.details ? { details: error.details } : {}),
		},
	};
}
