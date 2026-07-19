import { afterEach, describe, expect, test } from "bun:test";
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { discoverTemplates, installTemplate, planInstall, showTemplate } from "./index";

const temporaryDirectories: string[] = [];
const cliPath = join(import.meta.dir, "cli.ts");

interface TemplateFixture {
	readonly id: string;
	readonly source?: string;
	readonly files?: readonly string[];
	readonly requires?: readonly string[];
	readonly package?: string;
}

function makeTemporaryDirectory(): string {
	const directory = mkdtempSync(join(tmpdir(), "fraym-template-test-"));
	temporaryDirectories.push(directory);
	return directory;
}

function copyPackageForConsumer(source: string, destination: string): void {
	cpSync(source, destination, {
		recursive: true,
		filter: sourcePath => !["dist", "node_modules"].includes(basename(sourcePath)),
	});
}

function writeFixture(root: string, path: string, content: string): void {
	const destination = join(root, path);
	mkdirSync(dirname(destination), { recursive: true });
	writeFileSync(destination, content);
}

function writeJsonFixture(root: string, path: string, value: unknown): void {
	writeFixture(root, path, `${JSON.stringify(value, null, 2)}\n`);
}

function listFiles(root: string, path = ""): string[] {
	const directory = join(root, path);
	const files: string[] = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const relativePath = path ? `${path}/${entry.name}` : entry.name;
		if (entry.isDirectory()) files.push(...listFiles(root, relativePath));
		else if (entry.isFile()) files.push(relativePath);
	}
	return files.sort((left, right) => left.localeCompare(right));
}

function createTemplateWorkspace(): string {
	const root = makeTemporaryDirectory();
	writeJsonFixture(root, "packages/ui/package.json", { name: "@fraym/ui", version: "1.0.0" });
	return root;
}

function writeTemplate(
	root: string,
	directory: string,
	fixture: TemplateFixture,
	contents: Readonly<Record<string, string>> = {},
): string {
	const source = fixture.source ?? "source";
	const templateRoot = join(root, "templates", directory);
	writeJsonFixture(root, `templates/${directory}/fraym.template.json`, {
		id: fixture.id,
		source,
		files: fixture.files ?? ["**/*"],
		requires: fixture.requires ?? [],
		...(fixture.package === undefined ? {} : { package: fixture.package }),
	});
	mkdirSync(join(templateRoot, source), { recursive: true });
	for (const [path, content] of Object.entries(contents)) writeFixture(join(templateRoot, source), path, content);
	return templateRoot;
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

function supportsDirectorySymlinks(): boolean {
	const probe = mkdtempSync(join(tmpdir(), "fraym-template-symlink-probe-"));
	const target = join(probe, "target");
	try {
		mkdirSync(target);
		symlinkSync(target, join(probe, "link"), "dir");
		return true;
	} catch (error) {
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

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { force: true, recursive: true });
});

describe("@fraym/cli template installation", () => {
	test("discovers manifest summaries in deterministic id order", () => {
		const root = createTemplateWorkspace();
		writeTemplate(root, "z-last", { id: "z-last", package: "fraym-example-z-template" });
		writeTemplate(root, "a-first", { id: "a-first", package: "fraym-example-a-template" });

		const discovered = discoverTemplates(root);

		expect(discovered.templates).toEqual([
			{
				id: "a-first",
				package: "fraym-example-a-template",
				source: "templates/a-first/fraym.template.json",
				requires: [],
			},
			{
				id: "z-last",
				package: "fraym-example-z-template",
				source: "templates/z-last/fraym.template.json",
				requires: [],
			},
		]);
		expect(discovered.issues).toEqual([]);
	});

	test("discovers a root-level manifest from a declared installed dependency", () => {
		const root = makeTemporaryDirectory();
		writeJsonFixture(root, "package.json", {
			name: "fraym-example-consumer",
			dependencies: { "fraym-example-installed-template": "1.0.0" },
		});
		writeJsonFixture(root, "node_modules/fraym-example-installed-template/package.json", {
			name: "fraym-example-installed-template",
			version: "1.0.0",
		});
		writeJsonFixture(root, "node_modules/fraym-example-installed-template/fraym.template.json", {
			id: "installed-starter",
			package: "fraym-example-installed-template",
			source: "source",
			files: ["**/*"],
			requires: [],
		});
		writeFixture(
			root,
			"node_modules/fraym-example-installed-template/source/entry.ts",
			"export const entry = true;\n",
		);

		expect(discoverTemplates(join(root, "src", "nested"))).toEqual({
			root,
			templates: [
				{
					id: "installed-starter",
					package: "fraym-example-installed-template",
					source: "node_modules/fraym-example-installed-template/fraym.template.json",
					requires: [],
				},
			],
			issues: [],
		});
	});

	test("reports duplicate ids and refuses an ambiguous install", () => {
		const root = createTemplateWorkspace();
		writeTemplate(root, "one", { id: "shared" });
		writeTemplate(root, "two", { id: "shared" });

		const discovered = discoverTemplates(root);

		expect(discovered.issues.map(issue => issue.code)).toEqual(["duplicate-id", "duplicate-id"]);
		expect(() => planInstall({ id: "shared", cwd: root, dest: join(root, "output") })).toThrow(
			expect.objectContaining({ code: "CLI_TEMPLATE_DUPLICATE_ID" }),
		);
	});

	test("orders required templates before the selected template in manifest order", () => {
		const root = createTemplateWorkspace();
		writeTemplate(root, "base", { id: "base" });
		writeTemplate(root, "theme", { id: "theme" });
		writeTemplate(root, "application", { id: "application", requires: ["base", "theme"] });

		expect(showTemplate("application", { cwd: root }).resolvedOrder).toEqual(["base", "theme", "application"]);
	});

	test("rejects missing and cyclic template dependencies", () => {
		const missingRoot = createTemplateWorkspace();
		writeTemplate(missingRoot, "application", { id: "application", requires: ["missing"] });
		const cycleRoot = createTemplateWorkspace();
		writeTemplate(cycleRoot, "one", { id: "one", requires: ["two"] });
		writeTemplate(cycleRoot, "two", { id: "two", requires: ["one"] });

		expect(() => showTemplate("application", { cwd: missingRoot })).toThrow(
			expect.objectContaining({ code: "CLI_TEMPLATE_NOT_FOUND" }),
		);
		expect(() => showTemplate("one", { cwd: cycleRoot })).toThrow(
			expect.objectContaining({
				code: "CLI_INVALID_METADATA",
				message: "Template dependency cycle: one -> two -> one.",
			}),
		);
	});

	test("keeps dry runs read-only and applies separator-safe file globs", () => {
		const root = createTemplateWorkspace();
		writeTemplate(
			root,
			"typescript",
			{ id: "typescript", files: ["*.ts"] },
			{
				"entry.ts": "export const entry = true;\n",
				"nested/ignored.ts": "export const ignored = true;\n",
			},
		);
		const destination = join(root, "generated");

		const result = installTemplate({ id: "typescript", cwd: root, dest: destination, apply: false });

		expect(result).toMatchObject({
			status: "planned",
			written: [],
			plan: { entries: [{ action: "create", path: "entry.ts", template: "typescript" }] },
		});
		expect(existsSync(join(destination, "entry.ts"))).toBe(false);
		expect(existsSync(join(destination, "nested", "ignored.ts"))).toBe(false);
	});

	test("applies selected files through the JSON CLI contract", () => {
		const root = createTemplateWorkspace();
		writeTemplate(
			root,
			"starter",
			{ id: "starter", files: ["*.ts"] },
			{
				"entry.ts": "export const entry = true;\n",
				"nested/ignored.ts": "export const ignored = true;\n",
			},
		);
		const result = runCli(root, ["template", "install", "starter", "--dest", "generated", "--apply", "--json"]);
		const envelope = JSON.parse(result.stdout) as {
			readonly ok: boolean;
			readonly version: string;
			readonly data: { readonly status: string; readonly written: readonly string[] };
		};

		expect(result.exitCode).toBe(0);
		expect(result.stderr).toBe("");
		expect(envelope).toEqual({
			ok: true,
			version: "1",
			data: expect.objectContaining({ status: "applied", written: ["entry.ts"] }),
		});
		expect(readFileSync(join(root, "generated", "entry.ts"), "utf8")).toBe("export const entry = true;\n");
		expect(existsSync(join(root, "generated", "nested", "ignored.ts"))).toBe(false);
	});

	test("refuses collisions without overwrite and leaves existing content intact", () => {
		const root = createTemplateWorkspace();
		writeTemplate(root, "starter", { id: "starter" }, { "entry.ts": "new content\n" });
		const destination = join(root, "generated");
		writeFixture(destination, "entry.ts", "existing content\n");

		expect(() =>
			installTemplate({ id: "starter", cwd: root, dest: destination, apply: true, overwrite: false }),
		).toThrow(expect.objectContaining({ code: "CLI_TEMPLATE_COLLISION" }));
		expect(readFileSync(join(destination, "entry.ts"), "utf8")).toBe("existing content\n");
	});

	test("replaces a collision only when overwrite is explicitly requested", () => {
		const root = createTemplateWorkspace();
		writeTemplate(root, "starter", { id: "starter" }, { "entry.ts": "replacement\n" });
		const destination = join(root, "generated");
		writeFixture(destination, "entry.ts", "existing content\n");

		const result = installTemplate({ id: "starter", cwd: root, dest: destination, apply: true, overwrite: true });

		expect(result).toMatchObject({ status: "applied", written: ["entry.ts"], backedUp: ["entry.ts"] });
		expect(result.plan.entries).toEqual([{ action: "overwrite", bytes: 12, path: "entry.ts", template: "starter" }]);
		expect(readFileSync(join(destination, "entry.ts"), "utf8")).toBe("replacement\n");
	});

	test("rejects traversal patterns before a template can select files outside its package", () => {
		const root = createTemplateWorkspace();
		writeTemplate(root, "unsafe", { id: "unsafe", files: ["../secret.txt"] });
		const packageRoot = join(root, "templates", "unsafe");

		expect(discoverTemplates(root).issues.map(issue => issue.code)).toEqual(["invalid-manifest"]);
		expect(() => showTemplate("unsafe", { cwd: root, from: packageRoot })).toThrow(
			expect.objectContaining({ code: "CLI_INVALID_METADATA" }),
		);
	});

	test.skipIf(!directorySymlinksSupported)(
		"rejects template source and destination symlinks that escape their containment roots",
		() => {
			const root = createTemplateWorkspace();
			const outside = join(root, "outside");
			writeFixture(outside, "secret.ts", "export const secret = true;\n");
			const sourceTemplateRoot = writeTemplate(root, "source-escape", { id: "source-escape" });
			rmSync(join(sourceTemplateRoot, "source"), { force: true, recursive: true });
			symlinkSync(outside, join(sourceTemplateRoot, "source"), "dir");
			writeTemplate(
				root,
				"destination-escape",
				{ id: "destination-escape" },
				{
					"linked/escaped.ts": "export const escaped = true;\n",
				},
			);
			const destination = join(root, "generated");
			mkdirSync(destination);
			symlinkSync(outside, join(destination, "linked"), "dir");

			expect(() => showTemplate("source-escape", { cwd: root })).toThrow(
				expect.objectContaining({ code: "CLI_TEMPLATE_PATH_ESCAPE" }),
			);
			expect(() => planInstall({ id: "destination-escape", cwd: root, dest: destination })).toThrow(
				expect.objectContaining({ code: "CLI_TEMPLATE_PATH_ESCAPE" }),
			);
		},
	);

	test.skipIf(process.platform !== "win32")(
		"rolls back prior writes when a later destination file is exclusively locked",
		async () => {
			const root = createTemplateWorkspace();
			const destination = join(root, "generated");
			const lockedPath = join(destination, "z-locked.ts");
			writeTemplate(
				root,
				"transaction",
				{ id: "transaction" },
				{
					"a-created.ts": "created during transaction\n",
					"b-existing.ts": "replacement\n",
					"z-locked.ts": "replacement locked file\n",
				},
			);
			writeFixture(destination, "b-existing.ts", "original existing\n");
			writeFixture(destination, "z-locked.ts", "original locked\n");
			writeFixture(
				root,
				"hold-exclusive-lock.ps1",
				[
					"param([string]$Path)",
					"$stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::None)",
					'[Console]::Out.WriteLine("locked")',
					"try { while ($true) { Start-Sleep -Seconds 1 } } finally { $stream.Dispose() }",
				].join("\n"),
			);
			const locker = Bun.spawn(
				[
					"powershell.exe",
					"-NoProfile",
					"-ExecutionPolicy",
					"Bypass",
					"-File",
					join(root, "hold-exclusive-lock.ps1"),
					"-Path",
					lockedPath,
				],
				{ stdout: "pipe", stderr: "pipe" },
			);
			const reader = locker.stdout.getReader();
			const ready = await reader.read();
			let failure: unknown;
			try {
				expect(new TextDecoder().decode(ready.value).trim()).toBe("locked");
				try {
					installTemplate({ id: "transaction", cwd: root, dest: destination, apply: true, overwrite: true });
				} catch (error) {
					failure = error;
				}
			} finally {
				reader.releaseLock();
				locker.kill();
				await locker.exited;
			}

			expect(failure).toMatchObject({
				code: "CLI_TEMPLATE_APPLY_FAILED",
				details: { failedPath: "z-locked.ts", rolledBack: true, restored: ["b-existing.ts"] },
			});
			expect(existsSync(join(destination, "a-created.ts"))).toBe(false);
			expect(readFileSync(join(destination, "b-existing.ts"), "utf8")).toBe("original existing\n");
			expect(readFileSync(lockedPath, "utf8")).toBe("original locked\n");
		},
	);
	test("installs the published web-agent template from a consumer's installed dependency without writes during the dry run", () => {
		const workspace = resolve(import.meta.dir, "../../..");
		const sourcePackage = join(workspace, "templates", "web-agent");
		const consumer = makeTemporaryDirectory();
		const installedPackage = join(consumer, "node_modules", "@fraym/template-web-agent");
		const manifestPath = join(installedPackage, "fraym.template.json");
		writeJsonFixture(consumer, "package.json", {
			name: "fraym-example-web-agent-consumer",
			devDependencies: { "@fraym/template-web-agent": "^0.1.0" },
		});
		copyPackageForConsumer(sourcePackage, installedPackage);
		writeFixture(installedPackage, "template/dist/assets/web-agent.js", "generated output\n");
		const destination = makeTemporaryDirectory();
		const expectedFiles = [
			"index.html",
			"package.json",
			"README.md",
			"src/App.tsx",
			"src/driver.ts",
			"src/index.css",
			"src/main.tsx",
			"tsconfig.json",
			"vite.config.ts",
		].sort((left, right) => left.localeCompare(right));
		const expectedCollisions = [...expectedFiles].sort();

		expect(JSON.parse(readFileSync(manifestPath, "utf8"))).toEqual({
			id: "web-agent",
			name: "Web agent",
			version: "0.1.0",
			description: "A self-contained Vite and React Fraym agent cockpit",
			package: "@fraym/template-web-agent",
			source: "template",
			files: ["README.md", "index.html", "package.json", "src/**/*", "tsconfig.json", "vite.config.ts"],
			requires: [],
		});
		expect(discoverTemplates(consumer)).toEqual({
			root: consumer,
			templates: [
				{
					id: "web-agent",
					version: "0.1.0",
					description: "A self-contained Vite and React Fraym agent cockpit",
					package: "@fraym/template-web-agent",
					source: "node_modules/@fraym/template-web-agent/fraym.template.json",
					requires: [],
				},
			],
			issues: [],
		});

		const dryRun = installTemplate({ id: "web-agent", cwd: consumer, dest: destination });

		expect(dryRun).toMatchObject({
			status: "planned",
			written: [],
			backedUp: [],
			warnings: [],
			plan: {
				template: "web-agent",
				version: "0.1.0",
				dest: destination,
				overwrite: false,
				order: ["web-agent"],
				collisions: [],
				summary: { create: expectedFiles.length, overwrite: 0, skip: 0 },
			},
		});
		expect(dryRun.plan.entries.map(({ action, path, template }) => ({ action, path, template }))).toEqual(
			expectedFiles.map(path => ({ action: "create", path, template: "web-agent" })),
		);
		expect(dryRun.plan.entries.every(entry => entry.bytes > 0)).toBe(true);
		expect(listFiles(destination)).toEqual([]);

		const applied = installTemplate({ id: "web-agent", cwd: consumer, dest: destination, apply: true });

		expect(applied).toMatchObject({
			status: "applied",
			written: expectedFiles,
			backedUp: [],
			warnings: [],
		});
		expect(listFiles(destination)).toEqual(expectedFiles);
		expect(JSON.parse(readFileSync(join(destination, "package.json"), "utf8"))).toMatchObject({
			dependencies: {
				"@fraym/driver": "^0.1.0",
				"@fraym/ui": "^0.1.0",
				react: "^19.2.5",
				"react-dom": "^19.2.5",
			},
		});
		expect(readFileSync(join(destination, "src", "main.tsx"), "utf8")).toContain('import "@fraym/ui/theme.css";');
		expect(readFileSync(join(destination, "src", "main.tsx"), "utf8")).toContain('import "@fraym/ui/fonts.css";');
		expect(readFileSync(join(destination, "src", "driver.ts"), "utf8")).toContain(
			'import { codingSessionFixture, createReplayDriver, type AgentEventStream } from "@fraym/driver";',
		);
		expect(readFileSync(join(destination, "src", "driver.ts"), "utf8")).toContain(
			"export const source: AgentEventStream = createReplayDriver(codingSessionFixture, { loop: true });",
		);
		expect(readFileSync(join(destination, "src", "App.tsx"), "utf8")).toContain(
			'<SessionThread className="h-full min-h-0 min-w-0" source={source} title="Web agent" />',
		);

		expect(() => installTemplate({ id: "web-agent", cwd: consumer, dest: destination, apply: true })).toThrow(
			expect.objectContaining({ code: "CLI_TEMPLATE_COLLISION", details: { collisions: expectedCollisions } }),
		);
		expect(listFiles(destination)).toEqual(expectedFiles);
	});
});
