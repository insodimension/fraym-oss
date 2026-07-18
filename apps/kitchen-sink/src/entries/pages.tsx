import {
	AgentArchitecturePage,
	AppearancePane,
	Button,
	ConnectionsManager,
	ENGINE_CURATED_CONFIG_PANES,
	EngineConfigPane,
	EngineConnectionsPane,
	type EngineCuratedConfigPaneId,
	EngineModelPane,
	GeneralPane,
	type PluginDef,
	PluginsPage,
	ProfilePane,
	type SettingsNavItem,
	SettingsPage,
	SettingsSub,
	SettingsTitle,
	ShortcutsPane,
	useProviderLogin,
	useTheme,
} from "@fraym/ui";
import { SettingsSchemaPreview } from "@fraym/ui/agent-surfaces";
import { type ComponentProps, type Dispatch, type SetStateAction, useMemo, useRef, useState } from "react";
import {
	ENGINE_SETTINGS_CONFIG_SNAPSHOT_FIXTURE,
	ENGINE_SETTINGS_RESOURCE_FIXTURE,
	SETTINGS_SECTIONS,
	SYNTHETIC_ENGINE_CONFIG_CATALOG,
	SYNTHETIC_ENGINE_CONFIG_COVERAGE,
} from "../fixtures";
import { Demo } from "../showcase/demo";
import type { EntryDocs } from "../showcase/docs";
import type { ShowcaseEntry } from "../showcase/types";

type EngineConfigSnapshotState = typeof ENGINE_SETTINGS_CONFIG_SNAPSHOT_FIXTURE;

const PROFILE_DEMO_STATS = [
	{ value: "58", label: "Sessions" },
	{ value: "251K", label: "Messages" },
	{ value: "212M", label: "Total tokens" },
	{ value: "32d", label: "Current streak" },
	{ value: "$84.20", label: "Cost" },
] as const;

const PROFILE_DEMO_CELLS = Array.from({ length: 52 * 7 }, (_, index) => {
	const recent = index > 52 * 7 - 70;
	const wave = index % 11;
	if (!recent && wave < 7) return 0;
	return Math.min(4, Math.max(0, Math.ceil(wave / 3)));
});

/** Fixture-only config write/reset handlers shared by the engine settings demos. */
function fixtureConfigHandlers(setSnapshot: Dispatch<SetStateAction<EngineConfigSnapshotState>>) {
	return {
		onConfigValueChange: (path: string, value: unknown) =>
			setSnapshot(current => ({
				...current,
				values: [
					...current.values.filter(record => record.path !== path),
					{ path, value, defaultValue: undefined, scope: "global", changed: true },
				],
			})),
		onConfigValueReset: (path: string) =>
			setSnapshot(current => ({
				...current,
				values: current.values.filter(record => record.path !== path),
			})),
	};
}

function AppearanceEntry() {
	const { mode, accent, setMode, setAccent } = useTheme();
	return (
		<Demo
			summary="The Appearance settings pane — theme + accent (wired live to the kit's ThemeProvider here), motion, diff style, fonts, and density. Built from the inline Segmented / Slider / NumberInput form controls."
			importPath="@fraym/ui/pages"
			stage="stretch"
		>
			<AppearancePane theme={mode} accent={accent} onThemeChange={setMode} onAccentChange={setAccent} />
		</Demo>
	);
}

function ProfileEntry() {
	return (
		<Demo
			summary="The Profile pane — hero, stat row, and a 52-week token heatmap with activity ranges."
			importPath="@fraym/ui/pages"
			stage="stretch"
		>
			<ProfilePane stats={PROFILE_DEMO_STATS} activityCells={PROFILE_DEMO_CELLS} />
		</Demo>
	);
}

function ShortcutsEntry() {
	return (
		<Demo
			summary="The Shortcuts pane — keybinding rows with Kbd chord badges."
			importPath="@fraym/ui/pages"
			stage="stretch"
		>
			<ShortcutsPane />
		</Demo>
	);
}

function GeneralEntry() {
	return (
		<Demo
			summary="The General pane — top-level account / workspace settings rows."
			importPath="@fraym/ui/pages"
			stage="stretch"
		>
			<GeneralPane />
		</Demo>
	);
}

function EngineModelRoutingEntry() {
	const [snapshot, setSnapshot] = useState(ENGINE_SETTINGS_RESOURCE_FIXTURE);
	const [configSnapshot, setConfigSnapshot] = useState(ENGINE_SETTINGS_CONFIG_SNAPSHOT_FIXTURE);
	return (
		<Demo
			summary="Engine-backed Model and Routing settings with categorized model picking and synthetic configuration controls. Fixture-only here; production writes through resource/config drivers."
			importPath="@fraym/ui/pages"
			stage="stretch"
			clip={false}
		>
			<EngineModelPane
				snapshot={snapshot}
				configCatalog={SYNTHETIC_ENGINE_CONFIG_CATALOG}
				configSnapshot={configSnapshot}
				onDefaultModelChange={selection =>
					setSnapshot(current => ({
						...current,
						settings: {
							...current.settings,
							defaultProvider: selection.provider,
							defaultModelId: selection.modelId,
						},
					}))
				}
				onDefaultThinkingLevelChange={level =>
					setSnapshot(current => ({
						...current,
						settings: { ...current.settings, defaultThinkingLevel: level },
					}))
				}
				onEnableSkillCommandsChange={enabled =>
					setSnapshot(current => ({
						...current,
						settings: { ...current.settings, enableSkillCommands: enabled },
					}))
				}
				onModelPatternsChange={patterns =>
					setSnapshot(current => ({
						...current,
						settings: { ...current.settings, enabledModelPatterns: patterns },
					}))
				}
				{...fixtureConfigHandlers(setConfigSnapshot)}
			/>
		</Demo>
	);
}

function EngineSchemaRendererEntry() {
	const [pane, setPane] = useState<EngineCuratedConfigPaneId>("interaction");
	const [configSnapshot, setConfigSnapshot] = useState(ENGINE_SETTINGS_CONFIG_SNAPSHOT_FIXTURE);
	return (
		<Demo
			summary={`Writable Fraym config renderer driven by a deterministic synthetic catalog (${SYNTHETIC_ENGINE_CONFIG_COVERAGE.totalRecords} settings across ${Object.keys(SYNTHETIC_ENGINE_CONFIG_COVERAGE.byPane).length} public pane categories). Fixture-only here; production writes through EngineConfigDriver set/reset calls.`}
			importPath="@fraym/ui/pages"
			stage="stretch"
			clip={false}
		>
			<div className="mb-5 flex flex-wrap gap-2">
				{ENGINE_CURATED_CONFIG_PANES.map(item => (
					<Button
						key={item.id}
						type="button"
						variant={pane === item.id ? "default" : "outline"}
						size="sm"
						onClick={() => setPane(item.id)}
					>
						{item.label}
					</Button>
				))}
			</div>
			<EngineConfigPane
				pane={pane}
				configCatalog={SYNTHETIC_ENGINE_CONFIG_CATALOG}
				configSnapshot={configSnapshot}
				{...fixtureConfigHandlers(setConfigSnapshot)}
			/>
		</Demo>
	);
}

function EngineConnectionsEntry() {
	const [configSnapshot, setConfigSnapshot] = useState(ENGINE_SETTINGS_CONFIG_SNAPSHOT_FIXTURE);
	return (
		<Demo
			summary="Connections with synthetic provider preferences rendered from the deterministic Fraym config catalog. Fixture-only here; production writes through resource/config drivers."
			importPath="@fraym/ui/pages"
			stage="stretch"
			clip={false}
		>
			<EngineConnectionsPane
				snapshot={ENGINE_SETTINGS_RESOURCE_FIXTURE}
				configCatalog={SYNTHETIC_ENGINE_CONFIG_CATALOG}
				configSnapshot={configSnapshot}
				{...fixtureConfigHandlers(setConfigSnapshot)}
			/>
		</Demo>
	);
}

const SETTINGS_NAV: SettingsNavItem[] = [
	{ id: "appearance", label: "Appearance", icon: "grid" },
	{ id: "profile", label: "Profile", icon: "user" },
	{ id: "shortcuts", label: "Shortcuts", icon: "keyboard" },
];

type SettingsPaneContentProps = Pick<
	ComponentProps<typeof AppearancePane>,
	"accent" | "onAccentChange" | "onThemeChange" | "theme"
> & {
	readonly pane: string;
};

function SettingsPaneContent({ pane, theme, accent, onThemeChange, onAccentChange }: SettingsPaneContentProps) {
	if (pane === "appearance") {
		return (
			<AppearancePane theme={theme} accent={accent} onThemeChange={onThemeChange} onAccentChange={onAccentChange} />
		);
	}
	if (pane === "profile") return <ProfilePane />;
	if (pane === "shortcuts") return <ShortcutsPane />;
	return null;
}

function SettingsLayoutEntry() {
	const { mode, accent, setMode, setAccent } = useTheme();
	const [pane, setPane] = useState("appearance");
	return (
		<Demo
			summary="The full Settings screen: a 248px nav column + scrolling content. Compose any pane as children. Shown inside a bounded frame (the real page is h-screen × w-screen)."
			importPath="@fraym/ui/pages"
			stage="stretch"
		>
			<div className="h-[640px] w-full overflow-hidden rounded-xl border border-fr-border-soft [&_[data-slot=settings-page]]:!h-full [&_[data-slot=settings-page]]:!w-full">
				<SettingsPage navItems={SETTINGS_NAV} activePane={pane} onPaneChange={setPane} onBack={() => {}}>
					<SettingsTitle>{SETTINGS_NAV.find(n => n.id === pane)?.label}</SettingsTitle>
					<SettingsSub>Configure how Fraym looks and behaves.</SettingsSub>
					<SettingsPaneContent
						pane={pane}
						theme={mode}
						accent={accent}
						onThemeChange={setMode}
						onAccentChange={setAccent}
					/>
				</SettingsPage>
			</div>
		</Demo>
	);
}

const PLUGINS: PluginDef[] = [
	{
		id: "github",
		name: "GitHub",
		desc: "PRs, issues, and reviews from chat.",
		logo: "Gh",
		bg: "#1c1c20",
		fg: "#fff",
		cat: "Developer Tools",
		badge: "Official",
		featured: true,
		long: "Open draft PRs, triage issues, and request reviews without leaving the conversation.",
		examples: ["Open a draft PR for this branch", "Summarize open issues labeled bug"],
	},
	{
		id: "linear",
		name: "Linear",
		desc: "Create and update issues inline.",
		logo: "Ln",
		bg: "#5e6ad2",
		fg: "#fff",
		cat: "Productivity",
	},
	{
		id: "slack",
		name: "Slack",
		desc: "Post updates to channels.",
		logo: "Sl",
		bg: "#3f0f3f",
		fg: "#fff",
		cat: "Communication",
	},
];

function PluginsEntry() {
	const [installed, setInstalled] = useState<Record<string, boolean>>({ github: true });
	return (
		<Demo
			summary="The Plugins / Skills / MCP surface — a tabbed catalog with search, install toggles, and a plugin detail view. Shown in embedded mode (the standalone page is a fixed overlay)."
			importPath="@fraym/ui/pages"
			stage="stretch"
		>
			<div className="h-[640px] w-full overflow-y-auto rounded-xl border border-fr-border-soft px-6 py-4">
				<PluginsPage
					plugins={PLUGINS}
					installed={installed}
					onToggle={id => setInstalled(s => ({ ...s, [id]: !s[id] }))}
					embedded
				/>
			</div>
		</Demo>
	);
}

function SettingsSchemaEntry() {
	return (
		<Demo
			summary="OPERATOR surface — a schema-driven settings preview. Gated behind @fraym/ui/agent-surfaces, never the curated root barrel, preserving the chat-core vs operator-layer boundary."
			importPath="@fraym/ui/agent-surfaces"
			stage="stretch"
		>
			<SettingsSchemaPreview sections={SETTINGS_SECTIONS} settings={{ density: "comfortable" }} />
		</Demo>
	);
}
// Connections manager demo. Uses the real `useProviderLogin` hook against a mock
// resource driver whose `login()` simulates the full OAuth flow (auth URL → paste
// code → success), so the marketplace + connect wizard are exercised end-to-end
// offline. Types are derived from the exported hook to avoid a direct @fraym/driver dep.
type DemoResourceDriver = NonNullable<Parameters<typeof useProviderLogin>[0]>;
type DemoLoginCallbacks = Parameters<DemoResourceDriver["login"]>[2];
type DemoWorkspace = Parameters<DemoResourceDriver["login"]>[0];
type DemoResourceSnapshot = Awaited<ReturnType<DemoResourceDriver["login"]>>;
type DemoProvider = DemoResourceSnapshot["providers"][number];

const DEMO_WORKSPACE = { workspaceId: "showcase-demo", path: "showcase-demo" } satisfies DemoWorkspace;
const demoDelay = (ms: number, signal?: AbortSignal) =>
	new Promise<void>((resolve, reject) => {
		if (signal?.aborted) {
			reject(new DOMException("aborted", "AbortError"));
			return;
		}
		let timer: ReturnType<typeof setTimeout>;
		const onAbort = () => {
			clearTimeout(timer);
			reject(new DOMException("aborted", "AbortError"));
		};
		timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		signal?.addEventListener("abort", onAbort, { once: true });
	});

const DEMO_CONNECTION_PROVIDERS: readonly DemoProvider[] = [
	{
		id: "aurora",
		name: "Aurora Cloud",
		hasAuth: true,
		authType: "oauth",
		authSource: "oauth",
		oauthSupported: true,
		apiKeySetupSupported: true,
	},
	{
		id: "nova",
		name: "Nova API",
		hasAuth: true,
		authType: "api_key",
		authSource: "auth_file",
		oauthSupported: false,
		apiKeySetupSupported: true,
	},
	{
		id: "quill",
		name: "Quill Studio",
		hasAuth: false,
		authType: "oauth",
		authSource: "none",
		oauthSupported: true,
		apiKeySetupSupported: false,
	},
	{
		id: "lumen",
		name: "Lumen Cloud",
		hasAuth: false,
		authType: "oauth",
		authSource: "none",
		oauthSupported: true,
		apiKeySetupSupported: true,
	},
	{
		id: "orbit",
		name: "Orbit Gateway",
		hasAuth: false,
		authType: "api_key",
		authSource: "none",
		oauthSupported: false,
		apiKeySetupSupported: true,
	},
	{
		id: "forge",
		name: "Forge Compute",
		hasAuth: false,
		authType: "api_key",
		authSource: "none",
		oauthSupported: false,
		apiKeySetupSupported: true,
	},
	{
		id: "sable",
		name: "Sable Cloud",
		hasAuth: true,
		authType: "api_key",
		authSource: "env",
		oauthSupported: false,
		apiKeySetupSupported: true,
	},
	{
		id: "local",
		name: "Local Lab",
		hasAuth: true,
		authType: "none",
		authSource: "none",
		oauthSupported: false,
		apiKeySetupSupported: false,
	},
	{
		id: "cedar",
		name: "Cedar AI",
		hasAuth: false,
		authType: "api_key",
		authSource: "none",
		oauthSupported: false,
		apiKeySetupSupported: true,
	},
	{
		id: "solace",
		name: "Solace API",
		hasAuth: false,
		authType: "api_key",
		authSource: "none",
		oauthSupported: false,
		apiKeySetupSupported: true,
	},
];

function setProviderAuth(
	snapshot: DemoResourceSnapshot,
	id: string,
	patch: Partial<DemoProvider>,
): DemoResourceSnapshot {
	return {
		...snapshot,
		providers: snapshot.providers.map(provider => (provider.id === id ? { ...provider, ...patch } : provider)),
	};
}

function ConnectionsManagerEntry() {
	const [snapshot, setSnapshot] = useState<DemoResourceSnapshot>(() => ({
		...ENGINE_SETTINGS_RESOURCE_FIXTURE,
		providers: DEMO_CONNECTION_PROVIDERS,
	}));
	const snapshotRef = useRef(snapshot);
	snapshotRef.current = snapshot;

	const driver = useMemo(
		() =>
			({
				login: async (_workspace: DemoWorkspace, providerId: string, callbacks: DemoLoginCallbacks) => {
					await callbacks.onProgress?.("Opening your browser…");
					await demoDelay(500, callbacks.signal);
					await callbacks.onAuth({
						url: "https://example.test/device/ABCD-1234",
						instructions: "Approve access in the opened tab, then enter the code shown there.",
					});
					await demoDelay(1100, callbacks.signal);
					const code = await callbacks.onPrompt({
						message: "Enter the code shown after you approve",
						placeholder: "ABCD-1234",
					});
					await callbacks.onProgress?.(`Verifying ${code || "code"}…`);
					await demoDelay(600, callbacks.signal);
					return setProviderAuth(snapshotRef.current, providerId, { hasAuth: true, authSource: "oauth" });
				},
			}) as unknown as DemoResourceDriver,
		[],
	);

	const login = useProviderLogin(driver, DEMO_WORKSPACE, { onSnapshot: setSnapshot });

	return (
		<Demo
			summary="The full Connections manager: a provider marketplace (Connected / Popular / searchable grid) with logo-backed provider tiles, plus the OAuth connect wizard wired to the real useProviderLogin hook against a mock driver that simulates the flow. API-key + disconnect update the fixture in place."
			importPath="@fraym/ui/pages"
			stage="stretch"
			clip={false}
		>
			<div className="h-[680px] w-full overflow-hidden rounded-xl border border-fr-border-soft">
				<ConnectionsManager
					providers={snapshot.providers}
					login={login}
					onRefresh={async () => {
						await demoDelay(1500);
					}}
					onSubmitApiKey={(id, _apiKey) =>
						setSnapshot(current => setProviderAuth(current, id, { hasAuth: true, authSource: "auth_file" }))
					}
					onDisconnect={id =>
						setSnapshot(current => setProviderAuth(current, id, { hasAuth: false, authSource: "none" }))
					}
				/>
			</div>
		</Demo>
	);
}

const settingsLayoutDocs: EntryDocs = {
	import: 'import { SettingsPage, type SettingsNavItem } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// SettingsPage is the two-column settings shell: a 248px nav sidebar on the",
			"// left and a content pane on the right. Plug in any settings pane as children.",
			'// Root <div data-slot="settings-page"> with responsive grid layout.',
			"<SettingsPage",
			"  navItems={navItems}       // SettingsNavItem[]: { id, label, icon }",
			'  activePane="appearance"   // currently selected pane id',
			"  onPaneChange={setPane}    // nav click handler",
			"  onBack={goBack}           // back button (rendered in compact sidebar)",
			">",
			"  <SettingsSub>Appearance</SettingsSub>",
			"  <SettingsTitle>Theme</SettingsTitle>",
			"  <AppearancePane theme={theme} accent={accent} onThemeChange={setTheme} onAccentChange={setAccent} />",
			"</SettingsPage>",
			"",
			"// SettingsPage provides the shell. Real settings use SettingsSub / SettingsTitle",
			"// for the branded heading hierarchy, then plug in a *Pane component as the body.",
		].join("\n"),
	),
	examples: [
		{
			label: "Settings shell",
			code: JSON.stringify(
				"<SettingsPage navItems={NAV} activePane={active} onPaneChange={setActive} onBack={goBack}>\n  <AppearancePane theme={theme} accent={accent} onThemeChange={setTheme} onAccentChange={setAccent} />\n</SettingsPage>",
			),
		},
	],
	api: [
		{
			name: "navItems",
			type: "readonly SettingsNavItem[]",
			required: true,
			description: "Sidebar navigation items: { id, label, icon }.",
		},
		{
			name: "activePane",
			type: "string",
			required: true,
			description: "Currently selected pane id; matched against navItems[].id.",
		},
		{ name: "onPaneChange", type: "(id: string) => void", required: true, description: "Nav click handler." },
		{ name: "onBack", type: "() => void", required: true, description: "Back button handler." },
		{
			name: "children",
			type: "ReactNode",
			required: true,
			description: "The active settings pane content. Use SettingsSub / SettingsTitle for the heading hierarchy.",
		},
	],
};

const settingsModelRoutingDocs: EntryDocs = {
	import: 'import { EngineModelPane, EngineConfigPane } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"<EngineModelPane snapshot={snapshot} loading={false} error={null} />",
			'<EngineConfigPane pane="routing" configCatalog={catalog} configSnapshot={snapshot} onUpdate={handleUpdate} />',
			"// EngineModelPane: top-level model + routing overview (provider status, model list, default model).",
			"// EngineConfigPane: per-pane curated config (routing rules, provider keys, model caps).",
		].join("\n"),
	),
	examples: [
		{ label: "Model pane", code: JSON.stringify("<EngineModelPane snapshot={ENGINE_SETTINGS_MODEL_SNAPSHOT} />") },
		{
			label: "Routing config",
			code: JSON.stringify(
				'<EngineConfigPane pane="routing" configCatalog={ENGINE_CURATED_CONFIG_PANES} configSnapshot={snapshot} onUpdate={setSnapshot} />',
			),
		},
	],
	api: [
		{
			name: "EngineModelPane.snapshot",
			type: "EngineModelSnapshot",
			required: true,
			description: "Driver snapshot: { providers, modelList, defaultModel, ... }.",
		},
		{
			name: "EngineModelPane.loading",
			type: "boolean",
			default: "false",
			description: "Shows shimmer skeleton when true.",
		},
		{ name: "EngineModelPane.error", type: "string | null", description: "Error banner." },
		{
			name: "EngineConfigPane.pane",
			type: "EngineCuratedConfigPaneId",
			required: true,
			description: "Which curated config pane to render (e.g. 'routing', 'provider').",
		},
		{
			name: "EngineConfigPane.configCatalog",
			type: "EngineCuratedConfigPanes",
			required: true,
			description: "Catalog of curated config pane definitions.",
		},
		{
			name: "EngineConfigPane.configSnapshot",
			type: "object",
			required: true,
			description: "Current config values keyed by pane section.",
		},
		{
			name: "EngineConfigPane.onUpdate",
			type: "(update: Partial<...>) => void",
			required: true,
			description: "Write handler for config changes.",
		},
	],
};

const settingsConnectionsDocs: EntryDocs = {
	import: 'import { EngineConnectionsPane } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"<EngineConnectionsPane snapshot={snapshot} loading={false} error={null} />",
			"// Renders a list of configured engine provider connections with status,",
			"// health checks, and quick actions (connect, disconnect, test).",
			'<div data-slot="engine-connections-pane">',
		].join("\n"),
	),
	examples: [
		{
			label: "Connections pane",
			code: JSON.stringify("<EngineConnectionsPane snapshot={ENGINE_SETTINGS_CONNECTIONS_SNAPSHOT} />"),
		},
	],
	api: [
		{
			name: "snapshot",
			type: "EngineConnectionsSnapshot",
			required: true,
			description: "Driver snapshot: { providers: ProviderConnection[] } with status + capabilities per provider.",
		},
		{ name: "loading", type: "boolean", default: "false", description: "Shimmer skeleton." },
		{ name: "error", type: "string | null", description: "Error banner." },
	],
};

const settingsConnectionsManagerDocs: EntryDocs = {
	import: 'import { ConnectionsManager } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"<ConnectionsManager providers={providers} loading={false} error={null} onConnect={handleConnect} onDisconnect={handleDisconnect} onRefresh={handleRefresh} />",
			"// Full connections manager: provider marketplace cards with search, filtering,",
			"// and the connect-provider wizard for OAuth/key-based auth flows.",
			'<div data-slot="connections-manager">',
		].join("\n"),
	),
	examples: [
		{
			label: "Connections manager",
			code: JSON.stringify(
				"<ConnectionsManager providers={DEMO_CONNECTION_PROVIDERS} loading={false} onConnect={handleConnect} onDisconnect={handleDisconnect} onRefresh={handleRefresh} />",
			),
		},
	],
	api: [
		{
			name: "providers",
			type: "readonly ProviderConnection[]",
			required: true,
			description: "Provider list from the driver snapshot.",
		},
		{ name: "loading", type: "boolean", default: "false", description: "Shimmer skeleton for the provider grid." },
		{ name: "error", type: "string | null", description: "Error banner." },
		{
			name: "onConnect",
			type: "(providerId: string) => void",
			description: "Called to initiate the connect-provider wizard.",
		},
		{ name: "onDisconnect", type: "(providerId: string) => void", description: "Called to disconnect a provider." },
		{ name: "onRefresh", type: "() => void", description: "Refresh handler for the provider list." },
	],
};

const settingsSchemaRendererDocs: EntryDocs = {
	import: 'import { EngineConfigPane, ENGINE_CURATED_CONFIG_PANES } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// The curated config panes rendered as a full settings subsection.",
			'<EngineConfigPane pane="routing" configCatalog={ENGINE_CURATED_CONFIG_PANES} configSnapshot={snapshot} onUpdate={handleUpdate} />',
			"// ENGINE_CURATED_CONFIG_PANES is a catalog of schema-driven config panes:",
			"// each pane has sections of { label, schema, values } rendered as form controls.",
		].join("\n"),
	),
	examples: [
		{
			label: "Schema-driven pane",
			code: JSON.stringify(
				'<EngineConfigPane pane="routing" configCatalog={ENGINE_CURATED_CONFIG_PANES} configSnapshot={snapshot} onUpdate={setSnapshot} />',
			),
		},
	],
	api: [
		{ name: "pane", type: "EngineCuratedConfigPaneId", required: true, description: "Which curated pane to render." },
		{
			name: "configCatalog",
			type: "EngineCuratedConfigPanes",
			required: true,
			description: "Catalog imported from ENGINE_CURATED_CONFIG_PANES.",
		},
		{
			name: "configSnapshot",
			type: "Record<string, any>",
			required: true,
			description: "Current config for all pane sections.",
		},
		{
			name: "onUpdate",
			type: "(update: Partial<...>) => void",
			required: true,
			description: "Config write handler.",
		},
	],
};

const appearanceDocs: EntryDocs = {
	import: 'import { AppearancePane } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"<AppearancePane theme={theme} accent={accent} onThemeChange={setTheme} onAccentChange={setAccent} />",
			"// Theme picker (system / dark / light / dim) + accent color preset grid.",
			"// Uses the real useTheme() hook from @fraym/ui in the kitchen sink.",
		].join("\n"),
	),
	examples: [
		{
			label: "Appearance pane",
			code: JSON.stringify(
				'<AppearancePane theme="dark" accent="indigo" onThemeChange={setTheme} onAccentChange={setAccent} />',
			),
		},
	],
	api: [
		{
			name: "theme",
			type: "ThemeMode",
			required: true,
			description: 'Current theme: "system" | "dark" | "light" | "dim".',
		},
		{
			name: "accent",
			type: "AccentPreset",
			required: true,
			description: "Current accent preset name (e.g. 'indigo', 'emerald').",
		},
		{
			name: "onThemeChange",
			type: "(theme: ThemeMode) => void",
			required: true,
			description: "Called when user picks a theme.",
		},
		{
			name: "onAccentChange",
			type: "(accent: AccentPreset) => void",
			required: true,
			description: "Called when user picks an accent.",
		},
	],
};

const profileDocs: EntryDocs = {
	import: 'import { ProfilePane } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			'<ProfilePane name="Avery Lane" handle="@averylane" plan="Pro" stats={stats} cells={activityCells} />',
			"// User profile + activity summary: name, handle, plan badge, stats grid,",
			"// and a 52x7 GitHub-style activity heatmap via `cells`.",
		].join("\n"),
	),
	examples: [
		{
			label: "Profile pane",
			code: JSON.stringify(
				'<ProfilePane name="Avery Lane" handle="@averylane" plan="Pro" stats={PROFILE_DEMO_STATS} cells={PROFILE_DEMO_CELLS} />',
			),
		},
	],
	api: [
		{ name: "name", type: "string", default: '"Avery Lane"', description: "Display name." },
		{ name: "handle", type: "string", default: '"@averylane"', description: "User handle / username." },
		{ name: "plan", type: "string", default: '"Pro"', description: "Plan badge label (e.g. 'Pro', 'Free')." },
		{
			name: "stats",
			type: "readonly { label, value }[]",
			description: "Stat cards row (e.g. workspaces, sessions, tokens).",
		},
		{
			name: "cells",
			type: "readonly { count, level }[]",
			description: "52x7 grid of activity cells; level 0-4 drives fill color.",
		},
	],
};

const shortcutsDocs: EntryDocs = {
	import: 'import { ShortcutsPane } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"<ShortcutsPane />",
			"// Renders a zero-config keyboard-shortcuts reference table.",
			"// All shortcuts are hard-coded; no props. The component pulls shortcuts",
			"// from a baked-in list (cmd palette, new session, search, etc.).",
		].join("\n"),
	),
	examples: [{ label: "Shortcuts table", code: JSON.stringify("<ShortcutsPane />") }],
	api: [
		{
			name: "(no props)",
			type: "—",
			description: "ShortcutsPane is zero-config; it renders a fixed shortcuts reference table.",
		},
	],
};

const generalDocs: EntryDocs = {
	import: 'import { GeneralPane } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			'<GeneralPane toolDefaultOpen="none" onToolDefaultOpenChange={setToolOpen} />',
			"// General preferences: startup behavior, tool-card expansion policy, theme,",
		].join("\n"),
	),
	examples: [
		{
			label: "General pane",
			code: JSON.stringify('<GeneralPane toolDefaultOpen="none" onToolDefaultOpenChange={setToolOpen} />'),
		},
	],
	api: [
		{
			name: "toolDefaultOpen",
			type: "ToolDefaultOpen",
			default: '"none"',
			description: 'Tool-card expansion policy: "none" | "auto" | "all".',
		},
		{
			name: "onToolDefaultOpenChange",
			type: "(value: ToolDefaultOpen) => void",
			description: "Called when the user changes the policy.",
		},
	],
};

const pluginsDocs: EntryDocs = {
	import: 'import { PluginsPage, type PluginDef } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"<PluginsPage plugins={plugins} filters={filters} installed={installed} onToggle={handleToggle} onSettings={openSettings} />",
			"// Plugin marketplace card grid with filter tabs, install/uninstall toggle,",
			"// and a per-plugin settings affordance.",
			'<div data-slot="plugins-page">',
		].join("\n"),
	),
	examples: [
		{
			label: "Plugins page",
			code: JSON.stringify(
				'<PluginsPage plugins={PLUGINS} filters={["All", "Productivity", "Developer Tools", "Communication"]} installed={[]} onToggle={handleToggle} onSettings={openSettings} />',
			),
		},
	],
	api: [
		{
			name: "plugins",
			type: "readonly PluginDef[]",
			required: true,
			description: "Plugin definitions: { id, name, description, category, icon, installed }.",
		},
		{
			name: "filters",
			type: "readonly string[]",
			default: '["All", "Productivity", "Developer Tools", "Communication"]',
			description: "Filter tab labels.",
		},
		{ name: "installed", type: "readonly string[]", description: "List of installed plugin ids." },
		{ name: "onToggle", type: "(pluginId: string) => void", description: "Called to install/uninstall a plugin." },
		{
			name: "onSettings",
			type: "(pluginId: string) => void",
			description: "Called to open plugin-specific settings.",
		},
	],
};

const settingsSchemaDocs: EntryDocs = {
	import: 'import { SettingsPage, SettingsSub, SettingsTitle } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// The SettingsPage shell with SettingsSub / SettingsTitle provides the",
			'// labeled heading hierarchy. This is the "operator" view — it documents how',
			"// settings pages compose from the shell + sub/title helpers.",
			"<SettingsPage navItems={NAV} activePane={active} onPaneChange={setPane} onBack={goBack}>",
			"  <SettingsSub>Engine</SettingsSub>",
			"  <SettingsTitle>Model selection</SettingsTitle>",
			"  {/* any *Pane or custom content */}",
			"</SettingsPage>",
		].join("\n"),
	),
	examples: [
		{
			label: "Shell skeleton",
			code: JSON.stringify(
				'<SettingsPage navItems={NAV} activePane="engine" onPaneChange={setPane} onBack={goBack}>\n  <SettingsSub>Engine</SettingsSub>\n  <SettingsTitle>Model selection</SettingsTitle>\n  <EngineModelPane snapshot={snapshot} />\n</SettingsPage>',
			),
		},
	],
	api: [
		{
			name: "SettingsPage",
			type: "{ navItems, activePane, onPaneChange, onBack, children }",
			description: "Two-column settings shell (nav sidebar + content).",
		},
		{ name: "SettingsSub", type: "children: ReactNode", description: "Small-caps muted label above SettingsTitle." },
		{ name: "SettingsTitle", type: "children: ReactNode", description: "Page-level heading." },
	],
};
function AgentArchitectureEntry() {
	return (
		<Demo
			summary="One screen, two React Flow graphs from the reusable Fraym flow-graph nodes: the external agent loop (LoopEngineeringGraph) above the harness (a radial GraphCanvas of skills, memory, and protocols). Both ride @xyflow/react with the shared chrome, animated icons, atmosphere, and a fullscreen toggle — full-page."
			importPath="@fraym/ui/pages"
			stage="stretch"
		>
			<AgentArchitecturePage />
		</Demo>
	);
}

const agentArchitectureDocs: EntryDocs = {
	import: 'import { AgentArchitecturePage } from "@fraym/ui";',
	anatomy: `// One screen, two React Flow graphs. The external loop is
// <LoopEngineeringGraph>; the harness is a radial <GraphCanvas>.
<AgentArchitecturePage />`,
	examples: [
		{
			label: "Compose two engines on one screen",
			code: "<Diagram edges={LOOP_EDGES}>…</Diagram>\n<Constellation model={HARNESS} height={620} />",
		},
		{
			label: "Animated icons across both",
			code: '<DiagramSub id="think" hub head="Think" icon="brain" />  // orthogonal\n{ id: "memory", icon: "brain", satellites: [...] }       // radial',
		},
	],
	api: [
		{
			name: "AgentArchitecturePage",
			type: "{ className? }",
			description:
				"Self-contained showcase composing a Diagram (the loop) and a Constellation (the harness) under one token palette.",
		},
	],
};

export const pagesEntries: readonly ShowcaseEntry[] = [
	{
		id: "agent-architecture",
		name: "Agent architecture",
		Component: AgentArchitectureEntry,
		docs: agentArchitectureDocs,
	},
	{ id: "settings-layout", name: "Settings page", Component: SettingsLayoutEntry, docs: settingsLayoutDocs },
	{
		id: "settings-model-routing",
		name: "Settings - Model and Routing",
		Component: EngineModelRoutingEntry,
		docs: settingsModelRoutingDocs,
	},
	{
		id: "settings-connections",
		name: "Settings - Connections",
		Component: EngineConnectionsEntry,
		docs: settingsConnectionsDocs,
	},
	{
		id: "settings-connections-manager",
		name: "Settings - Connections manager",
		Component: ConnectionsManagerEntry,
		docs: settingsConnectionsManagerDocs,
	},
	{
		id: "settings-schema-renderer",
		name: "Settings - Schema Renderer",
		Component: EngineSchemaRendererEntry,
		docs: settingsSchemaRendererDocs,
	},
	{ id: "appearance", name: "Settings - Appearance", Component: AppearanceEntry, docs: appearanceDocs },
	{ id: "profile", name: "Settings - Profile", Component: ProfileEntry, docs: profileDocs },
	{ id: "shortcuts", name: "Settings - Shortcuts", Component: ShortcutsEntry, docs: shortcutsDocs },
	{ id: "general", name: "Settings - General", Component: GeneralEntry, docs: generalDocs },
	{ id: "plugins", name: "Plugins", Component: PluginsEntry, docs: pluginsDocs },
	{
		id: "settings-schema",
		name: "Settings schema - operator",
		Component: SettingsSchemaEntry,
		docs: settingsSchemaDocs,
	},
];

