import { CodeBlock, cn, Icon } from "@fraym-ai/ui";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";
import type { ShowcaseEntry } from "../showcase/types";

// ---------------------------------------------------------------------------
// Doc kit — layout + prose primitives for the Getting Started pages.
// Self-contained (fr- tokens only) so the docs render the same in any theme.
// The shell already draws the eyebrow (tier label) + H1; pages render the body.
// Every page gets: a measured content column, an "On this page" scroll-spy
// rail (xl+), real syntax-highlighted CodeBlocks, and prev/next footer nav.
// ---------------------------------------------------------------------------

interface TocItem {
	readonly id: string;
	readonly label: string;
}

interface GuidePageMeta {
	readonly id: string;
	readonly name: string;
	readonly toc: readonly TocItem[];
	readonly Body: ComponentType;
}

/** Scroll-spy: tracks which section heading is currently in the reading band. */
function useScrollSpy(items: readonly TocItem[]): string | null {
	const [active, setActive] = useState<string | null>(items[0]?.id ?? null);
	useEffect(() => {
		const observer = new IntersectionObserver(
			entries => {
				const hit = entries.find(entry => entry.isIntersecting);
				if (hit) setActive(hit.target.id);
			},
			{ rootMargin: "-8% 0px -75% 0px" },
		);
		for (const item of items) {
			const el = document.getElementById(item.id);
			if (el) observer.observe(el);
		}
		return () => observer.disconnect();
	}, [items]);
	return active;
}

/** TOC entries scroll programmatically — a plain `#anchor` href would clobber
 *  the showcase's `#tier/id` hash router. */
function GuideToc({ items }: { readonly items: readonly TocItem[] }) {
	const active = useScrollSpy(items);
	return (
		<nav aria-label="On this page" className="sticky top-2 hidden w-48 shrink-0 self-start xl:block">
			<div className="mb-3 fr-eyebrow">On this page</div>
			<ul className="space-y-0.5 border-l border-fr-border-soft">
				{items.map(item => (
					<li key={item.id}>
						<button
							type="button"
							onClick={() =>
								document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" })
							}
							className={cn(
								"-ml-px block w-full border-l py-1 pl-3 text-left text-fr-sm transition-colors",
								active === item.id
									? "border-fr-accent text-fr-text"
									: "border-transparent text-fr-text-3 hover:border-fr-border hover:text-fr-text-2",
							)}
						>
							{item.label}
						</button>
					</li>
				))}
			</ul>
		</nav>
	);
}

function PrevNextCard({ meta, dir }: { readonly meta: GuidePageMeta; readonly dir: "prev" | "next" }) {
	return (
		<a
			href={`#guide/${meta.id}`}
			className={cn(
				"group flex flex-col gap-1 rounded-lg border border-fr-border-soft bg-fr-surface px-4 py-3 transition-colors hover:border-fr-accent-line",
				dir === "next" && "items-end text-right",
			)}
		>
			<span className="flex items-center gap-1 text-fr-xs text-fr-text-3">
				{dir === "prev" && <Icon name="back" size={12} />}
				{dir === "prev" ? "Previous" : "Next"}
				{dir === "next" && <Icon name="arrowR" size={12} />}
			</span>
			<span className="text-fr-sm font-medium text-fr-text transition-colors group-hover:text-fr-accent">
				{meta.name}
			</span>
		</a>
	);
}

function GuidePage({ meta }: { readonly meta: GuidePageMeta }) {
	const index = PAGES.indexOf(meta);
	const prev = index > 0 ? PAGES[index - 1] : undefined;
	const next = index >= 0 && index < PAGES.length - 1 ? PAGES[index + 1] : undefined;
	return (
		<div className="flex gap-12">
			<article className="min-w-0 max-w-[72ch] flex-1">
				<meta.Body />
				{(prev || next) && (
					<footer className="mt-14 grid grid-cols-2 gap-3 border-t border-fr-border-soft pt-6">
						<div>{prev && <PrevNextCard meta={prev} dir="prev" />}</div>
						<div>{next && <PrevNextCard meta={next} dir="next" />}</div>
					</footer>
				)}
			</article>
			<GuideToc items={meta.toc} />
		</div>
	);
}

// ---------- Prose primitives ----------

function Lead({ children }: { readonly children: ReactNode }) {
	return <p className="mb-8 text-fr-base leading-relaxed text-fr-text-2">{children}</p>;
}

function Section({ id, children }: { readonly id: string; readonly children: ReactNode }) {
	return (
		<h2
			id={id}
			className="mt-12 mb-4 scroll-mt-4 border-b border-fr-border-soft pb-2 text-fr-lg font-semibold tracking-tight first:mt-0"
		>
			{children}
		</h2>
	);
}

function P({ children }: { readonly children: ReactNode }) {
	return <p className="mb-4 text-fr-sm leading-relaxed text-fr-text-2">{children}</p>;
}

function C({ children }: { readonly children: ReactNode }) {
	return (
		<code className="rounded-[4px] bg-fr-surface px-1.5 py-0.5 font-mono text-[0.85em] text-fr-text">{children}</code>
	);
}

function Code({ code, lang = "tsx" }: { readonly code: string; readonly lang?: string }) {
	return (
		<div className="mb-5">
			<CodeBlock code={code} language={lang} lineNumbers />
		</div>
	);
}

function Bullets({ children }: { readonly children: ReactNode }) {
	return <ul className="mb-4 ml-5 list-disc space-y-1.5 text-fr-sm leading-relaxed text-fr-text-2">{children}</ul>;
}

const CALLOUT_TONES = {
	tip: { label: "Tip", border: "border-l-fr-accent", text: "text-fr-accent" },
	note: { label: "Note", border: "border-l-fr-blue", text: "text-fr-blue" },
	warn: { label: "Heads up", border: "border-l-fr-warn", text: "text-fr-warn" },
} as const;

function Callout({
	tone = "note",
	title,
	children,
}: {
	readonly tone?: keyof typeof CALLOUT_TONES;
	readonly title?: string;
	readonly children: ReactNode;
}) {
	const t = CALLOUT_TONES[tone];
	return (
		<aside
			className={cn("mb-5 rounded-r-lg border border-fr-border-soft border-l-2 bg-fr-surface px-4 py-3", t.border)}
		>
			<div className={cn("mb-1 flex items-center gap-1.5 text-fr-xs font-semibold uppercase tracking-wide", t.text)}>
				<Icon name="spark" size={12} />
				{title ?? t.label}
			</div>
			<div className="text-fr-sm leading-relaxed text-fr-text-2 [&_p]:mb-0">{children}</div>
		</aside>
	);
}

function Steps({ children }: { readonly children: ReactNode }) {
	return <ol className="mb-5 space-y-0">{children}</ol>;
}

function Step({
	n,
	title,
	children,
	last,
}: {
	readonly n: number;
	readonly title: string;
	readonly children: ReactNode;
	readonly last?: boolean;
}) {
	return (
		<li className="relative flex gap-4">
			<div className="flex flex-col items-center">
				<span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-fr-border bg-fr-surface font-mono text-fr-xs text-fr-text">
					{n}
				</span>
				{!last && <span className="w-px flex-1 bg-fr-border-soft" />}
			</div>
			<div className={cn("min-w-0 flex-1", last ? "pb-1" : "pb-7")}>
				<h3 className="mb-2 pt-0.5 text-fr-base font-semibold">{title}</h3>
				{children}
			</div>
		</li>
	);
}

function Cards({ children }: { readonly children: ReactNode }) {
	return <div className="mb-5 grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Card({ href, title, desc }: { readonly href: string; readonly title: string; readonly desc: string }) {
	return (
		<a
			href={href}
			className="group flex flex-col gap-1 rounded-lg border border-fr-border-soft bg-fr-surface px-4 py-3.5 transition-colors hover:border-fr-accent-line"
		>
			<span className="flex items-center justify-between text-fr-sm font-medium text-fr-text">
				{title}
				<Icon
					name="arrowR"
					size={14}
					className="text-fr-text-3 transition-all group-hover:translate-x-0.5 group-hover:text-fr-accent"
				/>
			</span>
			<span className="text-fr-xs leading-relaxed text-fr-text-3">{desc}</span>
		</a>
	);
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

function IntroductionBody() {
	return (
		<>
			<Lead>
				Fraym is a composable React UI for AI agent apps. Hand it a <C>drivers</C> bundle and UI defaults, and you
				get the full agent cockpit — streaming messages, reasoning traces, tool cards, diffs, a command palette,
				settings, and ambient presence — themeable and engine-agnostic.
			</Lead>
			<Section id="intro-pattern">The driver pattern</Section>
			<P>
				Most chat kits hard-code one backend. Fraym separates <strong>what the UI renders</strong> (a plain,
				framework-agnostic session model) from <strong>where the data comes from</strong> (a driver you implement).
				Bring any agent engine; Fraym renders it. The UI never runs the agent loop.
			</P>
			<Code
				lang="text"
				code={`your engine ──events──▶ SessionDriver ──session model──▶ <Fraym /> renders
                 (you write this)        (data only, no React)`}
			/>
			<Section id="intro-get">What you get</Section>
			<Bullets>
				<li>Streaming markdown, reasoning/thinking traces, and a live working-status line.</li>
				<li>Tool cards with per-tool renderers (bash, edit, search, diff, browser, and 40+ more).</li>
				<li>A command palette, settings surfaces, model pickers, and the session rail.</li>
				<li>A token-based theme system: presets, material themes, accent palettes, fonts.</li>
				<li>Ambient avatars/presence and a cinematic onboarding wizard.</li>
			</Bullets>
			<Section id="intro-showcase">This site is the showcase</Section>
			<P>
				Everything below <strong>Getting Started</strong> in the left sidebar is live and interactive. Browse the{" "}
				<C>Elements</C>, <C>Components</C>, and <C>Features</C> tiers for working demos with configurable knobs,
				anatomy, examples, and an API table for each. The header controls re-theme the whole site live.
			</P>
			<Section id="intro-next">Where to next</Section>
			<Cards>
				<Card
					href="#guide/installation"
					title="Installation"
					desc="Add the package and wire the CSS — two imports."
				/>
				<Card
					href="#guide/quick-start"
					title="Quick start"
					desc="Render the cockpit against a scripted demo driver."
				/>
				<Card
					href="#guide/cli"
					title="CLI"
					desc="Filesystem discovery, diagnostics, and transactional template installs."
				/>
				<Card href="#guide/drivers" title="Drivers" desc="The data-only contract that adapts your engine." />
				<Card href="#guide/theming" title="Theming" desc="Presets, materials, accents, and runtime switching." />
			</Cards>
		</>
	);
}

function InstallationBody() {
	return (
		<>
			<Lead>
				Three steps: install the package, import two CSS files at your entry, render. No Tailwind config, no PostCSS
				setup, no theme bootstrapping.
			</Lead>
			<Section id="install-package">Install the package</Section>
			<Steps>
				<Step n={1} title="Add @fraym-ai/ui and the React peers">
					<P>
						Fraym ships as source ESM, so your bundler (Vite, Next, etc.) transpiles it like first-party code. The
						only peers are <C>react</C> and <C>react-dom</C> 19+.
					</P>
					<Code
						lang="bash"
						code={`bun add @fraym-ai/ui react react-dom
# or: npm i @fraym-ai/ui react react-dom`}
					/>
				</Step>
				<Step n={2} title="Import the CSS at your entry">
					<P>
						<C>theme.css</C> carries the entire design system — Tailwind v4 runtime, every <C>--fr-*</C> token,
						all theme presets and material layers. <C>fonts.css</C> bundles the preset webfonts (Inter, IBM Plex,
						JetBrains Mono) so the font picker works offline.
					</P>
					<Code
						code={`// main.tsx
import "@fraym-ai/ui/theme.css";
import "@fraym-ai/ui/fonts.css";`}
					/>
				</Step>
				<Step n={3} title="Render the cockpit" last>
					<P>
						That's the whole setup. Continue to <strong>Quick start</strong> for the render call.
					</P>
					<Code
						code={`import { Fraym } from "@fraym-ai/ui";

export function App() {
  return <Fraym drivers={drivers} />;
}`}
					/>
				</Step>
			</Steps>
			<Section id="install-tailwind">About Tailwind</Section>
			<P>
				You do <strong>not</strong> need Tailwind in your app to use Fraym — <C>theme.css</C> imports Tailwind v4
				and scans the library's own source internally. If your app also uses Tailwind utilities in its own code, set
				up your own Tailwind entry as usual; the two coexist (Fraym's tokens are plain CSS variables).
			</P>
			<Callout tone="note">
				<p>
					The <C>{"<Fraym>"}</C> root imports <C>theme.css</C> itself, so step 2's theme import is technically
					redundant for full-cockpit apps. Keep it anyway: it guarantees token availability when you use individual
					elements without the root, and it keeps your overrides ordered after the theme.
				</p>
			</Callout>
			<Section id="install-troubleshoot">Troubleshooting</Section>
			<Bullets>
				<li>
					<strong>Unstyled components</strong> — the theme CSS isn't loaded; check the{" "}
					<C>@fraym-ai/ui/theme.css</C> import is first in your entry.
				</li>
				<li>
					<strong>Font picker falls back to system fonts</strong> — <C>fonts.css</C> isn't imported.
				</li>
				<li>
					<strong>Bundler chokes on the package</strong> — Fraym is source ESM (<C>"main": "./src/index.ts"</C>);
					ensure your toolchain transpiles dependencies (Vite and Next do by default).
				</li>
			</Bullets>
		</>
	);
}

function QuickStartBody() {
	return (
		<>
			<Lead>
				Render the whole agent cockpit with one component. <C>{"<Fraym>"}</C> takes a <C>drivers</C> bundle — start
				with the scripted demo driver and swap in your engine later.
			</Lead>
			<Section id="qs-demo">Zero-engine demo</Section>
			<P>
				<C>@fraym-ai/fixtures</C> ships a scripted driver and demo session data — the same data that powers this
				showcase. This is a complete, runnable <C>main.tsx</C>:
			</P>
			<Code
				code={`import "@fraym-ai/ui/theme.css";
import "@fraym-ai/ui/fonts.css";

import { createFraymDemoDriver, FRAYM_DEMO_SESSION_REF } from "@fraym-ai/fixtures";
import { Fraym } from "@fraym-ai/ui";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
  <Fraym
    drivers={{ session: createFraymDemoDriver() }}
    sessionRef={FRAYM_DEMO_SESSION_REF}
  />,
);`}
			/>
			<Callout tone="tip">
				<p>
					This is exactly how <C>apps/web</C> in the Fraym repo boots — a real, replayable conversation with
					streaming, tool cards, and reasoning, no engine required.
				</p>
			</Callout>
			<Section id="qs-engine">Wire your engine</Section>
			<P>
				Replace the scripted session driver with one that adapts your engine. Richer capabilities (usage metering,
				terminals, analytics, …) attach to the same bundle — see <strong>Drivers</strong> for each slot.
			</P>
			<Code
				code={`import type { FraymDrivers } from "@fraym-ai/driver";

const drivers: FraymDrivers = {
  session: createMySessionDriver(engine), // required
  usage: myUsageDriver,                   // optional capabilities…
  terminal: myTerminalDriver,
};

<Fraym drivers={drivers} userName="Ada" productLabel="My Agent" />;`}
			/>
			<Section id="qs-props">Common props</Section>
			<Bullets>
				<li>
					<C>drivers</C> — the <C>FraymDrivers</C> bundle (session + optional capability drivers).
				</li>
				<li>
					<C>sessionRef</C> — which session to open initially.
				</li>
				<li>
					<C>workspace</C> / <C>workspaces</C> — the active workspace and the switcher list.
				</li>
				<li>
					<C>userName</C> / <C>userEmail</C> / <C>planLabel</C> / <C>productLabel</C> — profile + branding.
				</li>
				<li>
					<C>defaultAvatar</C> — presence avatar id (e.g. <C>"nebula"</C>).
				</li>
				<li>
					<C>defaultToolOpen</C> — tool-card expansion policy.
				</li>
				<li>
					<C>settingsPanels</C> — extra settings surfaces to mount in the settings page.
				</li>
				<li>
					<C>sessionCatalog</C> + <C>onSessionSelect</C> / <C>onNewSession</C> / <C>onRenameSession</C> … — wire
					the session rail to your persistence.
				</li>
			</Bullets>
		</>
	);
}

function CliBody() {
	return (
		<>
			<Lead>
				<C>@fraym-ai/cli</C> is Fraym’s filesystem-only discovery, diagnostics, and template-install surface —
				legible to both humans and agents. Commands describe the CLI, search the public catalog, diagnose a
				workspace, and install declared template files through a stable JSON contract.
			</Lead>
			<Section id="cli-purpose">What it is</Section>
			<P>
				The CLI never runs your app or imports React. It reads package metadata and public barrels off disk to
				answer four questions: <strong>what commands exist</strong> (<C>manifest</C>),{" "}
				<strong>what’s in the catalog</strong> (<C>search</C>), <strong>is this workspace healthy</strong> (
				<C>doctor</C>), and <strong>what would this template write</strong> (<C>template</C>). Responses are
				versioned and error codes are append-only, so scripts and agents can depend on the shapes.
			</P>
			<Section id="cli-install">Install &amp; invoke</Section>
			<P>
				Inside the Fraym monorepo you can run it straight from source with Bun — no build step, since the package
				ships as source ESM:
			</P>
			<Code
				lang="bash"
				code={`# From the repo root — Bun executes the source entry directly
bun packages/cli/src/cli.ts manifest
bun packages/cli/src/cli.ts search button --type element
bun packages/cli/src/cli.ts template list
bun packages/cli/src/cli.ts doctor`}
			/>
			<P>
				Installed as a dependency, the package exposes a <C>fraym</C> bin (declared in its <C>package.json</C>), so
				the same commands are available as <C>fraym &lt;command&gt;</C>:
			</P>
			<Code
				lang="bash"
				code={`fraym manifest --json
fraym search button --type element --limit 5
fraym template install support-copilot --dest ./app --json
fraym doctor --json`}
			/>
			<Callout tone="note">
				<p>
					The <C>--json</C> flag and <C>--help</C> / <C>-h</C> are global — they work on every command. Bun{" "}
					<C>&gt;=1.3.14</C> is the only runtime requirement.
				</p>
			</Callout>
			<Section id="cli-manifest">manifest</Section>
			<P>
				<C>fraym manifest</C> is the self-describing contract: it lists the CLI name and envelope version, the
				global options, every command with its arguments, options, and response type, and the full set of stable
				error codes. Agents read this first to learn the surface. Plain output is pretty-printed JSON; with{" "}
				<C>--json</C> it is wrapped in the standard success envelope.
			</P>
			<Code
				lang="json"
				code={`// fraym manifest --json
{
  "ok": true,
  "version": "1",
  "data": {
    "name": "fraym",
    "version": "1",
    "description": "Discover Fraym packages and install template files safely.",
    "globalOptions": [{ "name": "--json", "type": "boolean", "description": "…" }],
    "commands": [
      { "name": "manifest", "arguments": [], "options": [], "response": "CliEnvelope<CliManifest>" },
      { "name": "search", "response": "CliEnvelope<SearchReport>" },
      { "name": "template", "response": "CliEnvelope<TemplateList | TemplateDetail | InstallResult>" },
      { "name": "doctor", "response": "CliEnvelope<DoctorReport>" }
    ],
    "errorCodes": ["CLI_UNKNOWN_COMMAND", "CLI_INVALID_TYPE", "…"]
  }
}`}
			/>
			<Section id="cli-search">search</Section>
			<P>
				<C>fraym search &lt;query&gt;</C> ranks public catalog entries by a deterministic token score — an exact
				name match beats a name prefix, which beats a name substring, which beats a metadata hit; ties break by
				type, name, package, then source. The same query always returns the same order. Discovery is filesystem
				only: it parses barrels and metadata as text and never imports React.
			</P>
			<Bullets>
				<li>
					<C>--type &lt;type&gt;</C> — restrict to one catalog type: <C>element</C>, <C>component</C>,{" "}
					<C>feature</C>, <C>page</C>, <C>theme</C>, <C>avatar</C>, <C>wisp-preset</C>, <C>template</C>, or{" "}
					<C>app</C>.
				</li>
				<li>
					<C>--limit &lt;count&gt;</C> — cap the returned results to a positive integer; <C>total</C> still reports
					the full number of matches.
				</li>
			</Bullets>
			<Code
				lang="json"
				code={`// fraym search button --type element --limit 5 --json
{
  "ok": true,
  "version": "1",
  "data": {
    "query": "button",
    "type": "element",
    "results": [
      {
        "type": "element",
        "name": "Button",
        "package": "@fraym-ai/ui",
        "source": "src/elements/button.tsx",
        "score": 200
      }
    ],
    "total": 4
  }
}`}
			/>
			<Section id="cli-templates">template list, show &amp; install</Section>
			<P>
				Install the template package before asking the CLI to discover it. <C>fraym template list</C> reads
				manifests from a source workspace’s <C>templates/</C> directory or the root of explicitly declared installed
				dependencies. <C>template show &lt;id&gt;</C> resolves the manifest, selected files, and dependency order.
				Pass <C>--from &lt;package-dir&gt;</C> to inspect or install one unpacked package directly.
			</P>
			<Code
				lang="bash"
				code={`# Package acquisition is explicit; the OSS CLI does not fetch templates
bun add -d @fraym-ai/cli @fraym-ai/template-web-agent

fraym template list --json
fraym template show web-agent --json

# Dry-run by default: prints create / overwrite / skip actions and writes nothing
fraym template install web-agent --dest ./my-agent --json

# Apply the reviewed plan; existing files still require explicit --overwrite
fraym template install web-agent --dest ./my-agent --apply --json`}
			/>
			<Section id="cli-web-agent">web-agent reference</Section>
			<P>
				<C>@fraym-ai/template-web-agent</C> is the smallest complete Fraym application: a full-height Vite 6 + React
				19 cockpit, a canonical <C>FraymDrivers</C> bundle, and a scripted fixture session that renders immediately.
				It is a starter shell: not a model, hosted agent, backend, or private runtime.
			</P>
			<Bullets>
				<li>
					<strong>See it now:</strong> run the template source directly and open <C>http://localhost:5193/</C>.
				</li>
				<li>
					<strong>Connect one seam:</strong> replace the fixture session in <C>src/driver.ts</C>;{" "}
					<C>src/App.tsx</C> stays engine-agnostic.
				</li>
				<li>
					<strong>Ship the same shape:</strong> the installed project owns its Vite config, package manifest, theme
					imports, and responsive viewport shell.
				</li>
			</Bullets>
			<Code
				lang="bash"
				code={`# From a Fraym source checkout
bun install
bun run --cwd templates/web-agent/template dev -- --port 5193

# Open http://localhost:5193/`}
			/>
			<Callout tone="note" title="Demo session, not model access">
				<p>
					The included rate-limiting conversation is authored fixture data. It proves Fraym’s thread, tool,
					presence, rail, and composer surfaces before credentials exist; sending a message does not call a model
					until <C>src/driver.ts</C> is replaced with a real session adapter.
				</p>
			</Callout>
			<P>
				The package’s root <C>fraym.template.json</C> is also the reference manifest for public, private, and
				third-party templates:
			</P>
			<Code
				lang="json"
				code={`{
  "id": "web-agent",
  "version": "0.1.0",
  "description": "A self-contained Vite and React Fraym agent cockpit",
  "package": "@fraym-ai/template-web-agent",
  "source": "template",
  "files": ["**/*"],
  "requires": []
}`}
			/>
			<Callout tone="note" title="Transactional by default">
				<p>
					Planning is read-only. <C>--apply</C> copies files through same-directory temporary paths, journals
					creates and overwrites, and rolls the whole install back after a failure. Traversal paths and static
					symlinks that escape either source or destination are rejected. Apply assumes exclusive mutation of the
					destination tree: do not move or replace destination directories while it runs. The installer never
					executes package scripts.
				</p>
			</Callout>
			<Section id="cli-doctor">doctor</Section>
			<P>
				<C>fraym doctor</C> runs four checks against the current directory — <C>runtime</C> (Bun availability),{" "}
				<C>packages</C> (visible <C>fraym-*</C> packages), <C>catalog</C> (usable entry count), and{" "}
				<C>templates</C> (template manifest validity). Each check reports a status of <C>pass</C>, <C>warn</C>,{" "}
				<C>fail</C>, or <C>info</C>, with a <C>fix</C> hint when something needs attention.
			</P>
			<Code
				lang="json"
				code={`// fraym doctor --json
{
  "ok": true,
  "version": "1",
  "data": {
    "root": "/path/to/workspace",
    "checks": [
      { "id": "runtime", "status": "pass", "message": "Bun 1.3.14 is available." },
      { "id": "packages", "status": "pass", "message": "Visible Fraym packages: fraym-ui." },
      { "id": "catalog", "status": "pass", "message": "Catalog is usable with 128 public entries." },
      { "id": "templates", "status": "info", "message": "No template manifests were found." }
    ],
    "summary": { "pass": 3, "warn": 0, "fail": 0, "info": 1 },
    "exitCode": 0
  }
}`}
			/>
			<Callout tone="warn" title="Exit semantics">
				<p>
					<C>doctor</C> exits <C>1</C> only when a check <em>fails</em> (<C>summary.fail &gt; 0</C>) — invalid
					package or manifest metadata. Missing packages or an empty catalog are <C>warn</C>ings and still exit{" "}
					<C>0</C>. Every other command exits <C>0</C> on success and <C>1</C> on any error.
				</p>
			</Callout>
			<Section id="cli-envelope">Envelopes &amp; errors</Section>
			<P>
				Under <C>--json</C>, every response is a versioned envelope (currently version <C>"1"</C>). Success carries
				a typed <C>data</C> payload; failure carries a stable <C>error</C> with a <C>code</C>, a human{" "}
				<C>message</C>, and an optional <C>suggestion</C> and <C>details</C>:
			</P>
			<Code
				lang="json"
				code={`// success
{ "ok": true, "version": "1", "data": { /* command payload */ } }

// failure — e.g. fraym search --type widget button --json
{
  "ok": false,
  "version": "1",
  "error": {
    "code": "CLI_INVALID_TYPE",
    "message": "Unsupported catalog type: widget.",
    "suggestion": "Run fraym manifest to list supported catalog types."
  }
}`}
			/>
			<P>
				Error codes are append-only, so callers can switch on them safely: <C>CLI_UNKNOWN_COMMAND</C>,{" "}
				<C>CLI_UNKNOWN_OPTION</C>, <C>CLI_MISSING_ARGUMENT</C>, <C>CLI_INVALID_ARGUMENT</C>,{" "}
				<C>CLI_INVALID_LIMIT</C>, <C>CLI_INVALID_TYPE</C>, <C>CLI_CATALOG_UNAVAILABLE</C>,{" "}
				<C>CLI_INVALID_METADATA</C>, <C>CLI_TEMPLATE_NOT_FOUND</C>, <C>CLI_TEMPLATE_DUPLICATE_ID</C>,{" "}
				<C>CLI_TEMPLATE_COLLISION</C>, <C>CLI_TEMPLATE_PATH_ESCAPE</C>, <C>CLI_TEMPLATE_APPLY_FAILED</C>, and{" "}
				<C>CLI_INTERNAL_ERROR</C>. Without <C>--json</C>, errors print to stderr as <C>Error [CODE]: message</C> and
				the process exits <C>1</C>.
			</P>
			<Section id="cli-boundaries">Boundaries</Section>
			<P>The CLI keeps a narrow filesystem boundary. On purpose, it does not:</P>
			<Bullets>
				<li>
					<strong>Execute discovered code</strong> — catalog and template discovery read text and metadata; they
					never import React, run lifecycle scripts, or evaluate a template package.
				</li>
				<li>
					<strong>Write without an explicit apply</strong> — template installation is a dry-run unless{" "}
					<C>--apply</C> is present, and replacing existing files additionally requires <C>--overwrite</C>.
				</li>
				<li>
					<strong>Run Fraym</strong> — it is not a dev server, agent harness, or backend; it describes, diagnoses,
					and copies declared source files.
				</li>
				<li>
					<strong>Fetch or license packages</strong> — package acquisition and entitlement stay with the package
					manager or registry. The installer only consumes templates already present on disk.
				</li>
			</Bullets>
		</>
	);
}

function DriversBody() {
	return (
		<>
			<Lead>
				A driver is how Fraym stays engine-agnostic. <C>@fraym-ai/driver</C> is a <strong>data-only</strong>{" "}
				contract — plain shapes and events, no React — that a driver maps your engine onto.
			</Lead>
			<Section id="drivers-contract">The session contract</Section>
			<P>
				The session model describes a coding-agent session: workspace, messages, streaming deltas, tool calls,
				reasoning, tasks, plans, goals, and host-UI requests (approvals, pickers). Your <C>SessionDriver</C> turns
				concrete engine events into these shapes; <C>@fraym-ai/ui</C> renders them. Because the contract is
				data-only, the same driver works in web, desktop, and test environments.
			</P>
			<Section id="drivers-bundle">The drivers bundle</Section>
			<P>
				<C>{"<Fraym>"}</C> takes a <C>FraymDrivers</C> bundle. Only <C>session</C> is required; every other slot
				progressively unlocks a UI capability:
			</P>
			<Code
				code={`interface FraymDrivers {
  session: SessionDriver;        // the conversation (required)
  resources?: EngineResourceDriver; // models / files the engine exposes
  config?: EngineConfigDriver;      // engine settings surface
  fraymConfig?: FraymConfigDriver;  // persists the user's UI settings
  workspace?: WorkspaceDriver;      // workspace listing + branches
  terminal?: TerminalDriver;        // interactive terminal sessions
  analytics?: AnalyticsDriver;      // session analytics surfaces
  usage?: UsageDriver;              // usage / quota metering
}`}
			/>
			<Callout tone="tip">
				<p>
					Slots you leave out simply hide their surfaces — no usage driver, no usage page. Start with{" "}
					<C>session</C> only and grow.
				</p>
			</Callout>
			<Section id="drivers-mock">The mock driver</Section>
			<P>
				For demos and tests, <C>@fraym-ai/driver/mock</C> provides <C>createScriptedDriver(script)</C> — it replays
				authored <C>DemoScript</C> events through the real contract, so demo content exercises exactly the same code
				paths as production. <C>@fraym-ai/fixtures</C> builds on it to drive this showcase.
			</P>
			<Code
				code={`import { createScriptedDriver } from "@fraym-ai/driver/mock";

const driver = createScriptedDriver({
  snapshot,            // initial session state
  replies: [/* … */],  // scripted agent turns
});`}
			/>
		</>
	);
}

function ThemingBody() {
	return (
		<>
			<Lead>
				Fraym ships a token-based theme system — light/dark modes, full theme presets (including material themes
				with their own optics), accent palettes, fonts — all switchable at runtime. Preview everything live with
				this site's header controls.
			</Lead>
			<Section id="theming-tokens">Tokens and modes</Section>
			<P>
				Every surface, text tier, and signal color is a <C>--fr-*</C> CSS variable driven by <C>[data-theme]</C>{" "}
				(dark / light, with a system option). Components never hard-code colors, so anything you build from Fraym
				primitives re-themes for free.
			</P>
			<Section id="theming-presets">Theme presets</Section>
			<P>
				Presets re-skin the entire palette in one move — both modes each: <C>cursor</C>, <C>codex</C>, <C>linear</C>
				, <C>liquid-glass</C>, <C>aerogel</C>, <C>cassette-futurism</C>, <C>raycast</C>, <C>warp</C>, <C>minimax</C>
				, and <C>vercel</C>. The default Fraym theme applies when no preset is set.
			</P>
			<Section id="theming-materials">Material themes</Section>
			<P>
				Three presets are <strong>materials</strong>, not just palettes — they ship a scoped CSS layer with real
				optics keyed off <C>[data-theme-preset]</C>:
			</P>
			<Bullets>
				<li>
					<C>liquid-glass</C> — refractive glass: aurora backdrop, lensing blur, specular edges.
				</li>
				<li>
					<C>aerogel</C> — matte frost: frozen-smoke backdrop, frost lenses, crystalline hairlines.
				</li>
				<li>
					<C>cassette-futurism</C> — beige hardware: plastic bezels, depressing keys, indicator-lamp glow.
				</li>
			</Bullets>
			<P>
				Materials inherit the user's accent (<C>inheritAccent</C>) — the accent picker keeps working under them. The
				<C>mono</C> swatch provides the neutral silver/graphite accent that defines Liquid Glass and still pairs
				cleanly with Aerogel and Cassette Futurism.
			</P>
			<Section id="theming-accent">Accent and accent style</Section>
			<P>
				Independent of the preset: an accent palette (violet, coral, blue, green, amber, mono) and an accent style (
				<C>solid</C> or <C>gradient</C>) for primary fills.
			</P>
			<Section id="theming-runtime">Switching at runtime</Section>
			<P>
				All knobs live in the settings contract, read through <C>SettingsProvider</C> / <C>useSettings</C>:
			</P>
			<Code
				code={`import { useSettings } from "@fraym-ai/ui/settings";

const { config, update } = useSettings();
update("themePreset", "aerogel");
update("accentStyle", "gradient");`}
			/>
			<P>
				For building your own picker, <C>@fraym-ai/ui/theme/theme-presets</C> exports <C>THEME_PRESETS</C> with each
				preset's name, note, and full token sets. Settings persist through the host's <C>fraymConfig</C> driver, so
				a user's choice survives reloads.
			</P>
		</>
	);
}

function ArchitectureBody() {
	return (
		<>
			<Lead>
				<C>@fraym-ai/ui</C> is organized into five tiers. Each tier may import only from the tiers below it — a rule
				enforced in CI by <C>check-tiers</C>.
			</Lead>
			<Section id="arch-tiers">The tiers</Section>
			<Code
				lang="text"
				code={`theme (tokens)
  └ elements      single-purpose primitives  (Button, Input, Select, Badge…)
      └ components    domain-agnostic molecules  (Menu, Popover, ModelPicker…)
          └ features      agent-aware surfaces   (thread, tool cards, composer…)
              └ pages         full screens          (settings, connections…)`}
			/>
			<P>
				This is the same structure as the left sidebar: the lower tiers are drop-in anywhere, the higher tiers are
				batteries-included product surfaces. Downward-only imports keep the lower tiers safe to consume standalone.
			</P>
			<Section id="arch-packages">Packages</Section>
			<Bullets>
				<li>
					<C>@fraym-ai/ui</C> — the component library (the tiers above + shell, hooks, registries).
				</li>
				<li>
					<C>@fraym-ai/driver</C> — the data-only session contract (types, events, driver interface, mock).
				</li>
				<li>
					<C>@fraym-ai/config</C> — the typed display/surface settings contract.
				</li>
				<li>
					<C>@fraym-ai/vibr</C> — animated presence and avatars.
				</li>
				<li>
					<C>@fraym-ai/verber</C> — the agent working-status phrase resolver.
				</li>
				<li>
					<C>@fraym-ai/fixtures</C> — demo session data + scripted driver for the showcase and tests.
				</li>
			</Bullets>
			<Section id="arch-imports">Import surface</Section>
			<P>
				The root barrel <C>@fraym-ai/ui</C> exports the cockpit; tier barrels (<C>@fraym-ai/ui/elements</C>,{" "}
				<C>/components</C>, <C>/features</C>, <C>/pages</C>) and focused subpaths (<C>/settings</C>,{" "}
				<C>/theme/theme-presets</C>, <C>/icons</C>, …) let you import exactly one layer when you're composing your
				own surfaces.
			</P>
		</>
	);
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const PAGES: readonly GuidePageMeta[] = [
	{
		id: "introduction",
		name: "Introduction",
		toc: [
			{ id: "intro-pattern", label: "The driver pattern" },
			{ id: "intro-get", label: "What you get" },
			{ id: "intro-showcase", label: "This site" },
			{ id: "intro-next", label: "Where to next" },
		],
		Body: IntroductionBody,
	},
	{
		id: "installation",
		name: "Installation",
		toc: [
			{ id: "install-package", label: "Install the package" },
			{ id: "install-tailwind", label: "About Tailwind" },
			{ id: "install-troubleshoot", label: "Troubleshooting" },
		],
		Body: InstallationBody,
	},
	{
		id: "quick-start",
		name: "Quick start",
		toc: [
			{ id: "qs-demo", label: "Zero-engine demo" },
			{ id: "qs-engine", label: "Wire your engine" },
			{ id: "qs-props", label: "Common props" },
		],
		Body: QuickStartBody,
	},
	{
		id: "cli",
		name: "CLI",
		toc: [
			{ id: "cli-purpose", label: "What it is" },
			{ id: "cli-install", label: "Install & invoke" },
			{ id: "cli-manifest", label: "manifest" },
			{ id: "cli-search", label: "search" },
			{ id: "cli-templates", label: "template" },
			{ id: "cli-web-agent", label: "web-agent reference" },
			{ id: "cli-doctor", label: "doctor" },
			{ id: "cli-envelope", label: "Envelopes & errors" },
			{ id: "cli-boundaries", label: "Boundaries" },
		],
		Body: CliBody,
	},
	{
		id: "drivers",
		name: "Drivers",
		toc: [
			{ id: "drivers-contract", label: "The session contract" },
			{ id: "drivers-bundle", label: "The drivers bundle" },
			{ id: "drivers-mock", label: "The mock driver" },
		],
		Body: DriversBody,
	},
	{
		id: "theming",
		name: "Theming",
		toc: [
			{ id: "theming-tokens", label: "Tokens and modes" },
			{ id: "theming-presets", label: "Theme presets" },
			{ id: "theming-materials", label: "Material themes" },
			{ id: "theming-accent", label: "Accent" },
			{ id: "theming-runtime", label: "Runtime switching" },
		],
		Body: ThemingBody,
	},
	{
		id: "architecture",
		name: "Architecture",
		toc: [
			{ id: "arch-tiers", label: "The tiers" },
			{ id: "arch-packages", label: "Packages" },
			{ id: "arch-imports", label: "Import surface" },
		],
		Body: ArchitectureBody,
	},
];

export const guideEntries: readonly ShowcaseEntry[] = PAGES.map(meta => ({
	id: meta.id,
	name: meta.name,
	Component: () => <GuidePage meta={meta} />,
}));
