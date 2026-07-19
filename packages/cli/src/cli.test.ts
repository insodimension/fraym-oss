import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { type CliError, createManifest, discoverCatalog, runDoctor, searchCatalog } from "./index";

const temporaryDirectories: string[] = [];
const cliPath = join(import.meta.dir, "cli.ts");

interface WorkspaceOptions {
	readonly validTemplate?: boolean;
	readonly invalidTemplate?: boolean;
}

function makeTemporaryDirectory(): string {
	const directory = mkdtempSync(join(tmpdir(), "fraym-cli-"));
	temporaryDirectories.push(directory);
	return directory;
}

function writeFixture(root: string, path: string, content: string): void {
	const destination = join(root, path);
	mkdirSync(dirname(destination), { recursive: true });
	writeFileSync(destination, content);
}

function writeJsonFixture(root: string, path: string, value: unknown): void {
	writeFixture(root, path, `${JSON.stringify(value, null, 2)}\n`);
}

function supportsDirectorySymlinks(): boolean {
	const probe = mkdtempSync(join(tmpdir(), "fraym-cli-symlink-probe-"));
	const target = join(probe, "target");
	try {
		mkdirSync(target);
		symlinkSync(target, join(probe, "link"), "dir");
		return true;
	} catch (error) {
		// Windows requires Developer Mode or elevation for directory symlinks; only that OS permission denial skips this test.
		if (
			process.platform === "win32" &&
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "EPERM"
		) {
			return false;
		}
		throw error;
	} finally {
		rmSync(probe, { force: true, recursive: true });
	}
}

const directorySymlinksSupported = supportsDirectorySymlinks();

function createWorkspace(options: WorkspaceOptions = {}): string {
	const root = makeTemporaryDirectory();
	writeJsonFixture(root, "packages/ui/package.json", {
		name: "@fraym/ui",
		version: "1.0.0",
		exports: {
			"./elements": "./src/elements/index.ts",
			"./components": { import: "./src/components/index.ts" },
			"./features": "./src/features/index.ts",
			"./pages": "./src/pages/index.ts",
		},
	});
	writeFixture(root, "packages/ui/src/elements/index.ts", 'export { Button } from "./button";\n');
	writeFixture(root, "packages/ui/src/elements/button.ts", "export const Button = {};\n");
	writeFixture(root, "packages/ui/src/components/index.ts", 'export { ButtonCard, ButtonGroup } from "./buttons";\n');
	writeFixture(
		root,
		"packages/ui/src/components/buttons.ts",
		"export const ButtonCard = {}; export const ButtonGroup = {};\n",
	);
	writeFixture(root, "packages/ui/src/features/index.ts", 'export * from "./toolbar";\n');
	writeFixture(root, "packages/ui/src/features/toolbar.ts", "export const Toolbar = {};\n");
	writeFixture(root, "packages/ui/src/pages/index.ts", 'export { Showcase } from "./showcase";\n');
	writeFixture(root, "packages/ui/src/pages/showcase.ts", "export const Showcase = {};\n");

	if (options.validTemplate) {
		writeJsonFixture(root, "templates/welcome/fraym.template.json", {
			name: "welcome-flow",
			package: "fraym-template-welcome",
			description: "A valid starter template.",
		});
	}
	if (options.invalidTemplate) {
		writeJsonFixture(root, "templates/broken/fraym.template.json", {
			description: "Missing the required name or id.",
		});
	}
	return root;
}

function createConsumerProject(): string {
	const root = makeTemporaryDirectory();
	writeJsonFixture(root, "node_modules/@fraym/ui/package.json", {
		name: "@fraym/ui",
		version: "1.0.0",
		exports: { "./elements": "./src/elements/index.ts" },
	});
	writeFixture(root, "node_modules/@fraym/ui/src/elements/index.ts", 'export { ConsumerButton } from "./button";\n');
	writeFixture(root, "node_modules/@fraym/ui/src/elements/button.ts", "export const ConsumerButton = {};\n");
	writeJsonFixture(root, "node_modules/@fraym/vibr/package.json", {
		name: "@fraym/vibr",
		version: "1.0.0",
		exports: { ".": "./src/index.ts" },
	});
	writeFixture(root, "node_modules/@fraym/vibr/src/index.ts", 'export { GlowAvatar } from "./avatars/glow";\n');
	writeFixture(root, "node_modules/@fraym/vibr/src/avatars/glow.ts", "export const GlowAvatar = {};\n");
	writeFixture(
		root,
		"node_modules/@fraym/vibr/src/cursor/registry-core.ts",
		'export const presets = [{ id: "spark" }];\n',
	);
	mkdirSync(join(root, "src", "nested"), { recursive: true });
	return root;
}

function runCli(cwd: string, args: readonly string[]) {
	const execution = Bun.spawnSync([process.execPath, cliPath, ...args], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	});
	return {
		exitCode: execution.exitCode,
		stdout: new TextDecoder().decode(execution.stdout).trim(),
		stderr: new TextDecoder().decode(execution.stderr).trim(),
	};
}

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { force: true, recursive: true });
});

describe("@fraym/cli public contract", () => {
	test("manifest declares every supported command, search option, and stable error code", () => {
		const manifest = createManifest();

		expect(manifest.name).toBe("fraym");
		expect(manifest.commands.map(command => [command.name, command.response])).toEqual([
			["manifest", "CliEnvelope<CliManifest>"],
			["search", "CliEnvelope<SearchReport>"],
			["doctor", "CliEnvelope<DoctorReport>"],
			["template", "CliEnvelope<TemplateList | TemplateDetail | InstallResult>"],
		]);
		const search = manifest.commands.find(command => command.name === "search");
		expect(search?.arguments.map(argument => argument.name)).toEqual(["query"]);
		expect(search?.options).toEqual([
			expect.objectContaining({
				name: "--type",
				type: "string",
				values: ["element", "component", "feature", "page", "theme", "avatar", "wisp-preset", "template", "app"],
			}),
			expect.objectContaining({ name: "--limit", type: "integer" }),
		]);
		expect(manifest.errorCodes).toEqual([
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
		]);
	});

	test("discovers workspace exports and ranks exact matches before deterministic partial matches", () => {
		const root = createWorkspace();
		const catalog = discoverCatalog(join(root, "packages", "ui", "src"));
		const search = searchCatalog({ cwd: root, query: "button" });
		const partial = searchCatalog({ cwd: root, query: "button", type: "component", limit: 1 });
		const unknown = searchCatalog({ cwd: root, query: "not-a-catalog-entry" });

		expect(catalog.root).toBe(root);
		expect(catalog.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "element", name: "Button", package: "@fraym/ui" }),
				expect.objectContaining({ type: "component", name: "ButtonCard", package: "@fraym/ui" }),
				expect.objectContaining({ type: "component", name: "ButtonGroup", package: "@fraym/ui" }),
			]),
		);
		expect(search.results.map(result => [result.name, result.score])).toEqual([
			["Button", 200],
			["ButtonCard", 120],
			["ButtonGroup", 120],
		]);
		expect(partial.total).toBe(2);
		expect(partial.results).toEqual([expect.objectContaining({ type: "component", name: "ButtonCard", score: 120 })]);
		expect(unknown).toEqual({ query: "not-a-catalog-entry", results: [], total: 0 });
	});

	test("discovers installed UI and Vibr metadata from a consumer-like nested project", () => {
		const root = createConsumerProject();
		const catalog = discoverCatalog(join(root, "src", "nested"));

		expect(catalog.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "element", name: "ConsumerButton", package: "@fraym/ui" }),
				expect.objectContaining({ type: "avatar", name: "GlowAvatar", package: "@fraym/vibr" }),
				expect.objectContaining({ type: "wisp-preset", name: "spark", package: "@fraym/vibr" }),
			]),
		);
		expect(catalog.issues).toEqual([]);
	});
	test("discovers recursive public star barrels once without inventing module labels", () => {
		const root = createWorkspace();
		writeFixture(root, "packages/ui/src/elements/index.ts", 'export * from "./nested";\n');
		writeFixture(
			root,
			"packages/ui/src/elements/nested/index.ts",
			'export * from "./actual-components";\nexport * from "../index";\n',
		);
		writeFixture(
			root,
			"packages/ui/src/elements/nested/actual-components.ts",
			"export const AlertDialog = {}; export const ToastViewport = {};\n",
		);

		const elementNames = discoverCatalog(root)
			.items.filter(item => item.type === "element")
			.map(item => item.name);

		expect(elementNames).toEqual(["AlertDialog", "ToastViewport"]);
	});

	test("lists only runtime PascalCase names from mixed element exports", () => {
		const root = createWorkspace();
		writeFixture(
			root,
			"packages/ui/src/elements/index.ts",
			'export { Button, type ButtonProps, buttonVariants } from "./button";\n',
		);
		writeFixture(
			root,
			"packages/ui/src/elements/button.ts",
			"export const Button = {}; export interface ButtonProps {} export const buttonVariants = {};\n",
		);

		const elementNames = discoverCatalog(root)
			.items.filter(item => item.type === "element")
			.map(item => item.name);

		expect(elementNames).toEqual(["Button"]);
	});

	test("rejects non-relative and escaping package export targets without exposing their names", () => {
		const root = createWorkspace();
		writeJsonFixture(root, "packages/ui/package.json", {
			name: "@fraym/ui",
			version: "1.0.0",
			exports: {
				"./elements": "outside-package",
				"./components": "./../outside-components.ts",
				"./features": "./src/features/index.ts",
				"./pages": "./src/pages/index.ts",
			},
		});
		writeFixture(root, "packages/outside-components.ts", "export const SecretComponent = {};\n");

		const catalog = discoverCatalog(root);

		expect(catalog.issues.map(issue => [issue.code, issue.message])).toEqual([
			["invalid-manifest", "A public export target escapes its package root."],
			["invalid-manifest", "Public export ./elements must use a package-relative target."],
		]);
		expect(catalog.items.map(item => item.name)).not.toContain("SecretComponent");
	});

	test.skipIf(!directorySymlinksSupported)(
		"rejects a fake installed UI package whose symlinked barrel canonically escapes its root",
		() => {
			const root = createConsumerProject();
			const packageRoot = join(root, "node_modules", "@fraym/ui");
			const externalBarrel = join(root, "external-barrel");
			writeFixture(root, "external-barrel/index.ts", "export const ExternalButton = {};\n");
			rmSync(join(packageRoot, "src", "elements"), { force: true, recursive: true });
			symlinkSync(externalBarrel, join(packageRoot, "src", "elements"), "dir");

			const catalog = discoverCatalog(join(root, "src", "nested"));

			expect(catalog.items.map(item => item.name)).not.toContain("ExternalButton");
			expect(catalog.issues).toContainEqual(
				expect.objectContaining({
					code: "invalid-manifest",
					message: "A public export target escapes its package root.",
				}),
			);
		},
	);

	test("excludes private workspace package and nested metadata entries while retaining public equivalents", () => {
		const root = createWorkspace();
		const packageMetadata = { name: "fraym-example-catalog-entry", version: "1.2.3" };

		writeJsonFixture(root, "apps/public/package.json", { ...packageMetadata, private: false });
		writeJsonFixture(root, "apps/private/package.json", { ...packageMetadata, private: true });
		writeJsonFixture(root, "apps/public/fraym.plugin.json", {
			name: "public-app-plugin",
			package: packageMetadata.name,
		});
		writeJsonFixture(root, "apps/private/fraym.plugin.json", {
			name: "private-app-plugin",
			package: packageMetadata.name,
		});
		writeJsonFixture(root, "templates/public/package.json", { ...packageMetadata, private: false });
		writeJsonFixture(root, "templates/private/package.json", { ...packageMetadata, private: true });
		writeJsonFixture(root, "templates/public/fraym.template.json", {
			name: "public-template",
			package: packageMetadata.name,
		});
		writeJsonFixture(root, "templates/private/fraym.template.json", {
			name: "private-template",
			package: packageMetadata.name,
		});

		const workspacePackages = discoverCatalog(root)
			.items.filter(item => item.package === packageMetadata.name)
			.map(item => ({ type: item.type, name: item.name, source: item.source }));

		expect(workspacePackages).toEqual([
			{ type: "app", name: "fraym-example-catalog-entry", source: "apps/public/package.json" },
			{ type: "app", name: "public-app-plugin", source: "apps/public/fraym.plugin.json" },
			{ type: "template", name: "fraym-example-catalog-entry", source: "templates/public/package.json" },
			{ type: "template", name: "public-template", source: "templates/public/fraym.template.json" },
		]);
	});

	test("accepts named template metadata and reports malformed template metadata", () => {
		const validRoot = createWorkspace({ validTemplate: true });
		const invalidRoot = createWorkspace({ invalidTemplate: true });
		const valid = discoverCatalog(validRoot);
		const invalid = discoverCatalog(invalidRoot);

		expect(valid.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "template", name: "welcome-flow", package: "fraym-template-welcome" }),
			]),
		);
		expect(valid.issues).toEqual([]);
		expect(invalid.issues).toEqual([
			expect.objectContaining({
				code: "invalid-manifest",
				message: "Fraym manifest metadata requires a name or id.",
			}),
		]);
	});

	test("maps invalid search limits to the public CLI error code", () => {
		const root = createWorkspace();

		expect(() => searchCatalog({ cwd: root, query: "button", limit: 0 })).toThrow(
			expect.objectContaining({ code: "CLI_INVALID_LIMIT" } satisfies Partial<CliError>),
		);
	});
	test("maps punctuation-only API and CLI search queries to CLI_INVALID_ARGUMENT", () => {
		const root = createWorkspace();

		expect(() => searchCatalog({ cwd: root, query: "!!!" })).toThrow(
			expect.objectContaining({ code: "CLI_INVALID_ARGUMENT" } satisfies Partial<CliError>),
		);

		const result = runCli(root, ["search", "!!!", "--json"]);
		const envelope = JSON.parse(result.stdout) as {
			readonly ok: boolean;
			readonly error: { readonly code: string };
		};

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toBe("");
		expect(envelope).toMatchObject({ ok: false, error: { code: "CLI_INVALID_ARGUMENT" } });
	});

	test("reports pass checks and zero exit code for an usable catalog with valid templates", () => {
		const report = runDoctor(createWorkspace({ validTemplate: true }));

		expect(report.checks.map(check => [check.id, check.status])).toEqual([
			["runtime", "pass"],
			["packages", "pass"],
			["catalog", "pass"],
			["templates", "pass"],
		]);
		expect(report.exitCode).toBe(0);
		expect(report.summary).toEqual({ pass: 4, warn: 0, fail: 0, info: 0 });
	});

	test("fails doctor when a template files glob traverses outside its package", () => {
		const root = createWorkspace();
		writeJsonFixture(root, "templates/unsafe/fraym.template.json", {
			id: "unsafe",
			source: "source",
			files: ["../secret"],
		});

		const report = runDoctor(root);

		expect(report.checks.map(check => [check.id, check.status])).toEqual([
			["runtime", "pass"],
			["packages", "pass"],
			["catalog", "pass"],
			["templates", "fail"],
		]);
		expect(report.checks.find(check => check.id === "templates")).toEqual({
			id: "templates",
			status: "fail",
			message: "Template metadata has 1 invalid entry.",
			fix: "Repair the template package metadata.",
			details: { issues: 1 },
		});
		expect(report.exitCode).toBe(1);
		expect(report.summary).toEqual({ pass: 3, warn: 0, fail: 1, info: 0 });
	});

	test("reports warnings and template info without failing when no Fraym metadata is visible", () => {
		const report = runDoctor(makeTemporaryDirectory());

		expect(report.checks.map(check => [check.id, check.status])).toEqual([
			["runtime", "pass"],
			["packages", "warn"],
			["catalog", "warn"],
			["templates", "info"],
		]);
		expect(report.exitCode).toBe(0);
		expect(report.summary).toEqual({ pass: 1, warn: 2, fail: 0, info: 1 });
	});

	test("reports catalog and template failures with a nonzero doctor exit code", () => {
		const report = runDoctor(createWorkspace({ invalidTemplate: true }));

		expect(report.checks.map(check => [check.id, check.status])).toEqual([
			["runtime", "pass"],
			["packages", "pass"],
			["catalog", "fail"],
			["templates", "fail"],
		]);
		expect(report.exitCode).toBe(1);
		expect(report.summary).toEqual({ pass: 2, warn: 0, fail: 2, info: 0 });
	});

	test("emits stable JSON success envelopes for manifest, search, and doctor subprocesses", () => {
		const root = createWorkspace({ validTemplate: true });
		const commands = [
			{
				args: ["manifest", "--json"],
				assertData: (data: Record<string, unknown>) => expect(data.name).toBe("fraym"),
			},
			{
				args: ["search", "button", "--json"],
				assertData: (data: Record<string, unknown>) =>
					expect(data.results).toEqual(
						expect.arrayContaining([expect.objectContaining({ name: "Button", score: 200 })]),
					),
			},
			{ args: ["doctor", "--json"], assertData: (data: Record<string, unknown>) => expect(data.exitCode).toBe(0) },
		];

		for (const command of commands) {
			const result = runCli(root, command.args);
			const envelope = JSON.parse(result.stdout) as {
				readonly ok: boolean;
				readonly version: string;
				readonly data: Record<string, unknown>;
			};

			expect(result.exitCode).toBe(0);
			expect(result.stderr).toBe("");
			expect(envelope.ok).toBe(true);
			expect(envelope.version).toBe("1");
			command.assertData(envelope.data);
		}
	});

	test("emits stable JSON failure envelopes and exit codes for invalid CLI requests", () => {
		const root = createWorkspace();
		const cases = [
			{ args: ["unknown", "--json"], code: "CLI_UNKNOWN_COMMAND" },
			{ args: ["search", "button", "--unexpected", "--json"], code: "CLI_UNKNOWN_OPTION" },
			{ args: ["search", "--json"], code: "CLI_MISSING_ARGUMENT" },
			{ args: ["search", "button", "--type=", "--json"], code: "CLI_MISSING_ARGUMENT" },
		];

		for (const testCase of cases) {
			const result = runCli(root, testCase.args);
			const envelope = JSON.parse(result.stdout) as {
				readonly ok: boolean;
				readonly version: string;
				readonly error: { readonly code: string };
			};

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toBe("");
			expect(envelope).toMatchObject({ ok: false, version: "1", error: { code: testCase.code } });
		}
	});
});
