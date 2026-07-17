import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Button,
  Code,
  FONT_PRESETS,
  THEME_PRESETS,
  useTheme,
  type AccentPalette,
  type ThemeMode,
} from "@fraym/ui";

import { DemoDock } from "./DemoDock";
import { clampDockWidth } from "./demo-dock-utils";
import { entries } from "./entries";
import {
  entriesForTier,
  guides,
  tierFor,
  tierIds,
  tiers,
  type TierId,
} from "./catalog";
import {
  initialKnobValues,
  type Entry,
  type Knob,
  type KnobValue,
} from "./entry";

type Route = { tier: TierId; id: string };
type AccentStyle = "solid" | "gradient";

const accents: readonly Exclude<AccentPalette, "theme">[] = [
  "violet", "coral", "blue", "green", "amber", "mono",
];
const defaultRoute: Route = { tier: "guide", id: "introduction" };

function routeExists(route: Route): boolean {
  if (route.tier === "guide") return guides.some((guide) => guide.id === route.id);
  return entriesForTier(route.tier).some((entry) => entry.id === route.id);
}

function readRoute(): Route {
  if (typeof window === "undefined") return defaultRoute;
  const [tierValue, id] = window.location.hash.slice(1).split("/");
  const tier = tierIds.find((candidate) => candidate === tierValue);
  const route = tier && id ? { tier, id } : defaultRoute;
  return routeExists(route) ? route : defaultRoute;
}

function Icon({ name }: { name: "chevron" | "close" | "moon" | "replay" | "search" | "sun" | "system" }) {
  const paths = {
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    moon: <path d="M20 15.2A8 8 0 0 1 8.8 4 8 8 0 1 0 20 15.2Z" />,
    replay: <path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6" />,
    search: <path d="m21 21-4.4-4.4M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />,
    sun: <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />,
    system: <path d="M4 5h16v11H4zM9 20h6m-3-4v4" />,
  } as const;
  return <svg aria-hidden="true" className="ks-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">{paths[name]}</svg>;
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  return <Button size="sm" variant="ghost" onClick={copy}>{copied ? "Copied" : label}</Button>;
}

function AppearanceControls() {
  const { accent, mode, preset, resolvedMode, setAccent, setMode, setPreset } = useTheme();
  const [accentStyle, setAccentStyle] = useState<AccentStyle>(() =>
    (window.localStorage.getItem("ks-accent-style") as AccentStyle | null) ?? "solid",
  );
  const [fontId, setFontId] = useState(() => window.localStorage.getItem("ks-font") ?? "plex");
  const font = FONT_PRESETS.find((option) => option.id === fontId) ?? FONT_PRESETS[0];

  useEffect(() => {
    window.localStorage.setItem("ks-accent-style", accentStyle);
    document.documentElement.dataset.accentStyle = accentStyle;
  }, [accentStyle]);
  useEffect(() => {
    window.localStorage.setItem("ks-font", fontId);
    document.documentElement.style.setProperty("--fr-font-primary", font.primary);
    document.documentElement.style.setProperty("--fr-font-mono", font.mono);
  }, [font, fontId]);

  return (
    <div className="ks-appearance">
      <div className="ks-mode" aria-label={`Color mode, ${resolvedMode} resolved`} role="group">
        {(["dark", "light", "system"] as const).map((option) => (
          <button aria-label={`${option} mode`} aria-pressed={mode === option} key={option} onClick={() => setMode(option satisfies ThemeMode)} type="button">
            <Icon name={option === "dark" ? "moon" : option === "light" ? "sun" : "system"} />
          </button>
        ))}
      </div>
      <div className="ks-swatches" aria-label="Accent color" role="group">
        {accents.map((option) => <button aria-label={`${option} accent`} aria-pressed={accent === option} className={`ks-swatch ks-swatch--${option}`} key={option} onClick={() => setAccent(option)} type="button" />)}
      </div>
      <div className="ks-mode" aria-label="Accent style" role="group">
        {(["solid", "gradient"] as const).map((option) => <button aria-pressed={accentStyle === option} className="ks-text-option" key={option} onClick={() => setAccentStyle(option)} type="button">{option}</button>)}
      </div>
      <label className="ks-select"><span>Theme</span><select aria-label="Theme preset" value={preset} onChange={(event) => setPreset(event.currentTarget.value)}><option value="fraym">Fraym</option>{THEME_PRESETS.filter((option) => option.id !== "fraym").map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
      <label className="ks-select ks-font-select"><span>Font</span><select aria-label="Font preset" value={fontId} onChange={(event) => setFontId(event.currentTarget.value)}>{FONT_PRESETS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
    </div>
  );
}

function groupAdjacent(items: readonly Entry[]): readonly { name: string; entries: readonly Entry[] }[] {
  const groups: { name: string; entries: Entry[] }[] = [];
  for (const entry of items) {
    const name = entry.tier;
    const last = groups.at(-1);
    if (last?.name === name) last.entries.push(entry);
    else groups.push({ name, entries: [entry] });
  }
  return groups;
}

function Sidebar({ route, navigate }: { route: Route; navigate: (route: Route) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<TierId>>(() => new Set(tierIds));
  const needle = query.trim().toLowerCase();
  const toggle = (tier: TierId) => setOpen((current) => {
    const next = new Set(current);
    if (next.has(tier)) next.delete(tier); else next.add(tier);
    return next;
  });

  return (
    <aside className="ks-sidebar">
      <div className="ks-search"><Icon name="search" /><input aria-label="Search showcase" placeholder="Search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery("")} type="button"><Icon name="close" /></button>}</div>
      <nav aria-label="Showcase catalog" className="ks-nav">
        {tiers.map((tier) => {
          const tierEntries = tier.id === "guide"
            ? guides.filter((guide) => guide.title.toLowerCase().includes(needle))
            : entriesForTier(tier.id).filter((entry) => `${entry.title} ${entry.description}`.toLowerCase().includes(needle));
          if (needle && tierEntries.length === 0) return null;
          const expanded = needle.length > 0 || open.has(tier.id);
          return (
            <section className="ks-nav-tier" key={tier.id}>
              <button aria-expanded={expanded} className="ks-tier-toggle" onClick={() => toggle(tier.id)} type="button"><span>{tier.label}</span><span className="ks-tier-count">{tierEntries.length}</span><span className="ks-tier-chevron" data-open={expanded}><Icon name="chevron" /></span></button>
              {expanded && <div className="ks-tier-items">
                {tier.id === "guide" ? tierEntries.map((guide) => <NavLink active={route.tier === "guide" && route.id === guide.id} key={guide.id} label={guide.title} onClick={() => navigate({ tier: "guide", id: guide.id })} />) : groupAdjacent(tierEntries as readonly Entry[]).map((group) => <div className="ks-nav-group" key={group.name}><span>{group.name}</span>{group.entries.map((entry) => <NavLink active={route.id === entry.id} key={entry.id} label={entry.title} onClick={() => navigate({ tier: tierFor(entry), id: entry.id })} />)}</div>)}
              </div>}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}

function NavLink({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button aria-current={active ? "page" : undefined} className="ks-nav-link" onClick={onClick} type="button">{label}</button>;
}

function GuidePage({ id, navigate }: { id: string; navigate: (route: Route) => void }) {
  const position = guides.findIndex((guide) => guide.id === id);
  const guide = guides[position] ?? guides[0];
  const content: Record<string, ReactNode> = {
    introduction: <><Lead>Fraym is a composable React interface system for agent sessions. It turns one typed event stream into messages, tools, approvals, and complete conversation surfaces.</Lead><GuideSection title="The driver pattern"><p>Your runtime emits framework-neutral events through <Code>@fraym/driver</Code>. The UI consumes that contract, so rendering stays independent from any one agent harness.</p><Code block language="text">runtime events → @fraym/driver → @fraym/ui</Code></GuideSection><GuideSection title="What you get"><CardGrid cards={[["Elements", "Focused primitives for streaming and interactive UI."], ["Components", "Reusable compositions for tools, dialogs, menus, and registries."], ["Features", "Complete chat, composer, approval, and metadata patterns."], ["Pages", "Full surfaces that connect the pieces."]]} /></GuideSection><GuideSection title="This site is the showcase"><p>Every public surface has a live, configurable example. Search the catalog, change the global appearance, then open Demo to see an entry inside a real replayed session.</p></GuideSection></>,
    installation: <><Lead>Install only the package boundary your application needs.</Lead><GuideSection title="UI and driver"><Code block language="sh">bun add @fraym/ui @fraym/driver</Code><p>Import the shared theme and font layers once at your application root.</p><Code block language="ts">{`import "@fraym/ui/fonts.css";\nimport "@fraym/ui/theme.css";`}</Code></GuideSection><GuideSection title="Optional packages"><p>The Config, Fixtures, Driver Test, Verber, Vibr, and Aethr entries document the smaller workspace packages and their focused responsibilities.</p></GuideSection></>,
    "quick-start": <><Lead>Wrap your application in the theme provider, then render the surface that matches your integration depth.</Lead><GuideSection title="Add the provider"><Code block language="tsx">{`import { ThemeProvider } from "@fraym/ui";\n\n<ThemeProvider>\n  <App />\n</ThemeProvider>`}</Code></GuideSection><GuideSection title="Render a session"><p>Start with <Code>SessionThread</Code> for a complete surface, or compose lower-level message and composer features when your product owns more of the surrounding layout.</p></GuideSection></>,
    drivers: <><Lead>Drivers translate a runtime into the ordered event contract consumed by Fraym surfaces.</Lead><GuideSection title="A stable seam"><p>Session lifecycle, user and assistant messages, reasoning, tools, approvals, and completion all share discriminated event shapes. Test helpers can replay the same stream without a live backend.</p></GuideSection><GuideSection title="Build against fixtures"><p>Use <Code>@fraym/fixtures</Code> and <Code>@fraym/driver-test</Code> to exercise adapters and UI states deterministically.</p></GuideSection></>,
    theming: <><Lead>The theme engine applies mode, palette, typography, motion, and semantic tokens without coupling components to raw color values.</Lead><GuideSection title="Provider state"><p>Use <Code>useTheme</Code> to switch mode, accent, motion, and theme preset. The controls in this header use that same public API.</p></GuideSection><GuideSection title="Token layers"><p>Base tokens describe intent; theme presets resolve that intent for light and dark variants. Component CSS consumes only the semantic layer.</p></GuideSection></>,
    architecture: <><Lead>Fraym separates event transport, rendering policy, reusable UI, and application composition.</Lead><GuideSection title="Package boundaries"><CardGrid cards={[["@fraym/driver", "Typed runtime and session event contract."], ["@fraym/ui", "Elements, components, features, registries, and themes."], ["Adapters", "Runtime-specific translation at the application edge."], ["Applications", "Routing, persistence, and product composition."]]} /></GuideSection><GuideSection title="Renderer registries"><p>Tool, message-block, command-tag, and surface registries keep extension policy explicit while preserving useful defaults.</p></GuideSection></>,
  };
  const previous = guides[position - 1];
  const next = guides[position + 1];
  return <article className="ks-guide"><div className="ks-guide-body">{content[guide.id]}</div><footer className="ks-guide-pagination">{previous ? <button onClick={() => navigate({ tier: "guide", id: previous.id })} type="button"><span>Previous</span><strong>{previous.title}</strong></button> : <span />}{next && <button className="ks-next" onClick={() => navigate({ tier: "guide", id: next.id })} type="button"><span>Next</span><strong>{next.title}</strong></button>}</footer></article>;
}

function Lead({ children }: { children: ReactNode }) { return <p className="ks-lead">{children}</p>; }
function GuideSection({ children, title }: { children: ReactNode; title: string }) { return <section className="ks-guide-section"><h2>{title}</h2>{children}</section>; }
function CardGrid({ cards }: { cards: readonly (readonly [string, string])[] }) { return <div className="ks-card-grid">{cards.map(([title, text]) => <article key={title}><strong>{title}</strong><p>{text}</p></article>)}</div>; }

function KnobControl({ knob, value, onChange }: { knob: Knob; value: KnobValue; onChange: (value: KnobValue) => void }) {
  if (knob.kind === "pick") return <label className="ks-control"><span>{knob.label}</span><select value={String(value)} onChange={(event) => onChange(event.currentTarget.value)}>{knob.options.map((option) => <option key={option}>{option}</option>)}</select></label>;
  if (knob.kind === "toggle") return <label className="ks-control ks-toggle-control"><span>{knob.label}</span><button aria-checked={value === true} role="switch" type="button" onClick={() => onChange(value !== true)}><span /></button></label>;
  if (knob.kind === "number") return <label className="ks-control"><span>{knob.label}</span><input max={knob.max} min={knob.min} step={knob.step} type="number" value={Number(value)} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} /></label>;
  return <label className="ks-control"><span>{knob.label}</span><input value={String(value)} onChange={(event) => onChange(event.currentTarget.value)} /></label>;
}

function EntryPage({ entry, values, setValues }: { entry: Entry; values: Record<string, KnobValue>; setValues: (values: Record<string, KnobValue>) => void }) {
  const Demo = entry.Demo;
  const generated = entry.code(values);
  return <>
    <section className="ks-demo-card">
      <div className="ks-demo-copy"><div><h2>Component</h2><p>{entry.description}</p></div><div className="ks-import"><Code>{entry.importCode}</Code><CopyButton value={entry.importCode} /></div></div>
      <div className="ks-playground"><div className="ks-preview"><Demo values={values} /></div>{entry.knobs.length > 0 && <aside className="ks-controls"><div className="ks-controls-head"><strong>Controls</strong><button onClick={() => setValues(initialKnobValues(entry.knobs))} type="button">Reset</button></div>{entry.knobs.map((knob) => <KnobControl key={knob.prop} knob={knob} value={values[knob.prop] ?? knob.defaultValue} onChange={(value) => setValues({ ...values, [knob.prop]: value })} />)}</aside>}</div>
      <div className="ks-code"><div><span>Usage</span><CopyButton label="Copy code" value={generated} /></div><Code block language="tsx">{generated}</Code></div>
    </section>
    <DocPanel entry={entry} />
  </>;
}

function DocPanel({ entry }: { entry: Entry }) {
  return <section className="ks-docs"><aside><a href="#import">Import</a><a href="#examples">Examples <span>{entry.examples.length}</span></a><a href="#api">API <span>{entry.props.length}</span></a></aside><div className="ks-doc-content"><section id="import"><h2>Import</h2><div className="ks-code-row"><Code block language="tsx">{entry.importCode}</Code><CopyButton value={entry.importCode} /></div></section><section id="examples"><h2>Examples</h2>{entry.examples.map((example) => <article className="ks-example" key={example.title}><div><h3>{example.title}</h3><p>{example.description}</p></div><div className="ks-code-row"><Code block language="tsx">{example.code}</Code><CopyButton value={example.code} /></div></article>)}</section><section id="api"><h2>API</h2><div className="ks-table-wrap"><table><thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody>{entry.props.map((prop) => <tr key={prop.name}><td><Code>{prop.name}</Code></td><td><Code>{prop.type}</Code></td><td>{prop.defaultValue}</td><td>{prop.description}</td></tr>)}</tbody></table></div></section></div></section>;
}

export function KitchenSink() {
  const [route, setRoute] = useState(readRoute);
  const [dockOpen, setDockOpen] = useState(() => window.localStorage.getItem("ks-dock-open") === "1");
  const [dockWidth, setDockWidth] = useState(() => clampDockWidth(Number(window.localStorage.getItem("ks-dock-width")) || 440));
  const entry = useMemo(() => entries.find((candidate) => candidate.id === route.id) ?? null, [route.id]);
  const [values, setValues] = useState<Record<string, KnobValue>>(() => entry ? initialKnobValues(entry.knobs) : {});

  useEffect(() => setValues(entry ? initialKnobValues(entry.knobs) : {}), [entry]);
  useEffect(() => { window.localStorage.setItem("ks-dock-open", dockOpen ? "1" : "0"); }, [dockOpen]);
  useEffect(() => { window.localStorage.setItem("ks-dock-width", String(dockWidth)); }, [dockWidth]);
  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (next: Route) => {
    setRoute(next);
    window.history.pushState(null, "", `#${next.tier}/${next.id}`);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const activeTier = tiers.find((tier) => tier.id === route.tier) ?? tiers[0]!;
  const title = route.tier === "guide" ? guides.find((guide) => guide.id === route.id)?.title ?? "Introduction" : entry?.title ?? "Introduction";

  return <div className="ks-shell" style={{ "--ks-dock-width": `${dockWidth}px` } as CSSProperties}>
    <header className="ks-header"><button className="ks-brand" onClick={() => navigate(defaultRoute)} type="button"><span className="ks-logo">F</span><strong>Fraym Kitchen Sink</strong></button><div className="ks-header-tools"><AppearanceControls /><button aria-pressed={dockOpen} className="ks-demo-toggle" disabled={!entry} onClick={() => setDockOpen((current) => !current)} type="button"><span className="ks-demo-dot" />Demo</button></div></header>
    <div className="ks-layout"><Sidebar navigate={navigate} route={route} /><main className="ks-main"><header className="ks-page-head"><span>{activeTier.label}</span><h1>{title}</h1></header>{route.tier === "guide" ? <GuidePage id={route.id} navigate={navigate} /> : entry ? <EntryPage entry={entry} setValues={setValues} values={values} /> : null}</main>{entry && dockOpen ? <DemoDock entry={entry} onClose={() => setDockOpen(false)} onWidthChange={setDockWidth} values={values} width={dockWidth} /> : null}</div>
  </div>;
}
