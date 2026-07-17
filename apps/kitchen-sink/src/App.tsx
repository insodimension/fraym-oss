import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Badge, Button, Code, ScrollArea, Separator, Textarea } from "@fraym/ui";

import {
  elementSubgroups,
  entryGroups,
  initialKnobValues,
  type ElementSubgroup,
  type Entry,
  type EntryGroup,
  type Knob,
  type KnobValue,
} from "./entry";
import { entries } from "./entries";
import { clampDockWidth, DemoDock } from "./DemoDock";

type ThemePreference = "dark" | "light" | "system";
type ResolvedTheme = Exclude<ThemePreference, "system">;
type Accent = "violet" | "coral" | "blue" | "green" | "amber" | "mono";

const groupLabels: Record<EntryGroup, string> = { tokens: "Tokens", elements: "Elements", tools: "Tools", features: "Features" };
const subgroupLabels: Record<ElementSubgroup, string> = { actions: "Actions", inputs: "Inputs", feedback: "Feedback", layout: "Layout", content: "Content" };
const accents: readonly Accent[] = ["violet", "coral", "blue", "green", "amber", "mono"];

function currentHash(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.slice(1);
  return entries.some((entry) => entry.id === hash) ? hash : null;
}

function CopyButton({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  return <Button className={className} size="sm" variant="ghost" onClick={copy}>{copied ? "Copied" : label}</Button>;
}

function ThemeControls({ accent, onAccent, onTheme, theme }: { accent: Accent; onAccent: (accent: Accent) => void; onTheme: (theme: ThemePreference) => void; theme: ThemePreference }) {
  return (
    <div className="sink-theme-tools">
      <div aria-label="Theme" className="sink-segmented" role="group">
        {(["dark", "light", "system"] as const).map((option) => (
          <Button aria-pressed={theme === option} data-theme-option={option} key={option} size="sm" variant="ghost" onClick={() => onTheme(option)}>{option}</Button>
        ))}
      </div>
      <Separator orientation="vertical" />
      <div aria-label="Accent color" className="sink-accents" role="group">
        {accents.map((option) => (
          <button aria-label={`${option} accent`} aria-pressed={accent === option} className={`sink-accent sink-accent--${option}`} data-accent-option={option} key={option} onClick={() => onAccent(option)} type="button" />
        ))}
      </div>
    </div>
  );
}

function Catalog({ activeId, onHome, onSelect, query, setQuery }: { activeId: string | null; onHome: () => void; onSelect: (id: string) => void; query: string; setQuery: (query: string) => void }) {
  const filtered = entries.filter((entry) => `${entry.title} ${entry.description} ${entry.subgroup ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const groupEntries = (group: EntryGroup) => filtered.filter((entry) => entry.group === group);

  return (
    <aside className="sink-sidebar">
      <div className="sink-search-field">
        <label htmlFor="catalog-search">Search components</label>
        <Textarea id="catalog-search" placeholder="Search the catalog" rows={1} value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
        {query ? <Button className="sink-search-clear" size="sm" variant="ghost" onClick={() => setQuery("")}>Clear</Button> : null}
      </div>
      <ScrollArea className="sink-sidebar__scroll">
        <nav aria-label="Component catalog" className="sink-nav-groups">
          <Button aria-current={activeId === null ? "page" : undefined} className="sink-nav-item sink-nav-home" size="sm" variant="ghost" onClick={onHome}>Introduction</Button>
          {entryGroups.map((group) => {
            const matches = groupEntries(group);
            if (matches.length === 0) return null;
            return (
              <section className="sink-nav-group" key={group}>
                <div className="sink-nav-group__heading"><h2>{groupLabels[group]}</h2><span>{matches.length}</span></div>
                {group === "elements" ? elementSubgroups.map((subgroup) => {
                  const subgroupEntries = matches.filter((entry) => entry.subgroup === subgroup);
                  if (subgroupEntries.length === 0) return null;
                  return <div className="sink-nav-subgroup" key={subgroup}>
                    <div className="sink-nav-subgroup__label"><span>{subgroupLabels[subgroup]}</span><span>{subgroupEntries.length}</span></div>
                    {subgroupEntries.map((entry) => <NavEntry active={activeId === entry.id} entry={entry} key={entry.id} onSelect={onSelect} />)}
                  </div>;
                }) : matches.map((entry) => <NavEntry active={activeId === entry.id} entry={entry} key={entry.id} onSelect={onSelect} />)}
              </section>
            );
          })}
          {filtered.length === 0 ? <p className="sink-nav-empty">No entries match &quot;{query}&quot;.</p> : null}
        </nav>
      </ScrollArea>
    </aside>
  );
}

function NavEntry({ active, entry, onSelect }: { active: boolean; entry: Entry; onSelect: (id: string) => void }) {
  return <Button aria-current={active ? "page" : undefined} className="sink-nav-item" data-entry-id={entry.id} size="sm" variant="ghost" onClick={() => onSelect(entry.id)}>{entry.title}</Button>;
}

function Landing({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="sink-landing">
      <section className="sink-intro-hero">
        <Badge tone="accent">Open source React UI for coding agents</Badge>
        <h1>Build the agent surface your product deserves.</h1>
        <p>Fraym gives agentic products a typed, composable interface for streaming conversations, tools, and approvals.</p>
        <div className="sink-demo-row"><Button variant="primary" onClick={() => onSelect("button")}>Explore elements</Button><Button variant="ghost" onClick={() => onSelect("streaming-thread")}>Watch the thread</Button></div>
      </section>
      <section className="sink-driver-story">
        <div><span className="sink-section-label">The driver pattern</span><h2>One event contract. Any harness.</h2></div>
        <div><p><Code>@fraym/driver</Code> describes a session as typed events. Your agent runtime emits them, and Fraym turns that stream into a first-class interface without coupling the UI to one vendor.</p><Code block language="ts">{`harness events -> @fraym/driver -> @fraym/ui`}</Code></div>
      </section>
      <section className="sink-inside">
        <div><span>{entries.length}</span><p>documented entries</p></div>
        <div><span>{elementSubgroups.length}</span><p>element families</p></div>
        <div><span>1</span><p>typed driver contract</p></div>
      </section>
    </div>
  );
}

function KnobControl({ knob, onChange, value }: { knob: Knob; onChange: (value: KnobValue) => void; value: KnobValue }) {
  if (knob.kind === "pick") {
    return <div className="sink-knob" data-knob-prop={knob.prop}><span className="sink-knob__label">{knob.label}</span><div className="sink-pick" role="group" aria-label={knob.label}>{knob.options.map((option) => <Button aria-pressed={value === option} data-knob-option={option} key={option} size="sm" variant="ghost" onClick={() => onChange(option)}>{option}</Button>)}</div></div>;
  }
  if (knob.kind === "toggle") {
    return <div className="sink-knob sink-knob--toggle" data-knob-prop={knob.prop}><span className="sink-knob__label">{knob.label}</span><Button aria-pressed={value === true} role="switch" size="sm" variant="secondary" onClick={() => onChange(value !== true)}>{value === true ? "On" : "Off"}</Button></div>;
  }
  if (knob.kind === "number") {
    return <label className="sink-knob" data-knob-prop={knob.prop}><span className="sink-knob__label">{knob.label}</span><input className="sink-control-input" max={knob.max} min={knob.min} step={knob.step} type="number" value={typeof value === "number" ? value : knob.defaultValue} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} /></label>;
  }
  return <label className="sink-knob" data-knob-prop={knob.prop}><span className="sink-knob__label">{knob.label}</span><Textarea className="sink-control-text" rows={1} value={typeof value === "string" ? value : knob.defaultValue} onChange={(event) => onChange(event.currentTarget.value)} /></label>;
}

function EntryPage({ entry }: { entry: Entry }) {
  const [values, setValues] = useState<Record<string, KnobValue>>(() => initialKnobValues(entry.knobs));
  const [dockOpen, setDockOpen] = useState(true);
  const [dockWidth, setDockWidth] = useState(() => {
    if (typeof window === "undefined") return 380;
    const stored = Number(window.localStorage.getItem("fraym:sink:dock-width"));
    return clampDockWidth(Number.isFinite(stored) && stored > 0 ? stored : 380);
  });
  useEffect(() => setValues(initialKnobValues(entry.knobs)), [entry]);
  useEffect(() => window.localStorage.setItem("fraym:sink:dock-width", String(dockWidth)), [dockWidth]);
  const Demo = entry.Demo;
  const generatedCode = entry.code(values);
  const update = (prop: string, value: KnobValue) => setValues((current) => ({ ...current, [prop]: value }));

  const shellStyle = { "--sink-dock-current-width": `${dockWidth}px` } as CSSProperties;

  return (
    <div className="sink-entry-shell" data-dock-open={dockOpen} style={shellStyle}>
    <article className="sink-entry">
      <header className="sink-entry-hero">
        <span className="sink-entry-tier">{entry.tier}</span>
        <h1>{entry.title}</h1>
        <p>{entry.description}</p>
        <div className="sink-entry-hero__actions">
          <div className="sink-import-chip"><Code>{entry.importCode}</Code><CopyButton label="Copy" value={entry.importCode} /></div>
          <Button aria-expanded={dockOpen} data-dock-toggle size="sm" variant="ghost" onClick={() => setDockOpen((value) => !value)}>{dockOpen ? "Hide live context" : "Show live context"}</Button>
        </div>
      </header>
      <section className="sink-lab" aria-label={`${entry.title} playground`}>
        <div className="sink-stage"><div className="sink-stage__canvas"><Demo values={values} /></div><div className="sink-stage__code"><span>Generated usage</span><CopyButton label="Copy code" value={generatedCode} /><Code block language="tsx">{generatedCode}</Code></div></div>
        <aside className="sink-config"><div className="sink-config__header"><div><span>Configure</span><strong>Props</strong></div><Button size="sm" variant="ghost" onClick={() => setValues(initialKnobValues(entry.knobs))}>Reset</Button></div><Separator />
          <div className="sink-config__controls">{entry.knobs.length ? entry.knobs.map((knob) => <KnobControl knob={knob} key={knob.prop} value={values[knob.prop] ?? knob.defaultValue} onChange={(value) => update(knob.prop, value)} />) : <p className="sink-config-empty">This entry responds to the global theme and accent controls.</p>}</div>
        </aside>
      </section>
      <section className="sink-docs">
        <div className="sink-docs__intro"><span className="sink-section-label">Reference</span><h2>Use {entry.title}.</h2><p>Copy a starting point, then compose it with the rest of the Fraym surface.</p></div>
        <section className="sink-doc-block"><div className="sink-doc-block__heading"><h3>Import</h3><CopyButton label="Copy import" value={entry.importCode} /></div><Code block language="tsx">{entry.importCode}</Code></section>
        <section className="sink-doc-block"><div className="sink-doc-block__heading"><h3>Examples</h3></div><div className="sink-example-list">{entry.examples.map((example) => <article className="sink-doc-example" key={example.title}><div><h4>{example.title}</h4><p>{example.description}</p></div><div><CopyButton label="Copy" value={example.code} /><Code block language="tsx">{example.code}</Code></div></article>)}</div></section>
        <section className="sink-doc-block"><div className="sink-doc-block__heading"><h3>Props</h3></div><div className="sink-props-wrap"><table className="sink-props"><thead><tr><th>Name</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody>{entry.props.map((prop) => <tr key={prop.name}><td><Code>{prop.name}</Code></td><td><Code>{prop.type}</Code></td><td>{prop.defaultValue}</td><td>{prop.description}</td></tr>)}</tbody></table></div></section>
      </section>
    </article>
      {dockOpen ? <DemoDock entry={entry} onClose={() => setDockOpen(false)} onWidthChange={setDockWidth} values={values} width={dockWidth} /> : null}
    </div>
  );
}

export function App() {
  const [selectedId, setSelectedId] = useState<string | null>(currentHash);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  const [accent, setAccent] = useState<Accent>("violet");
  const selected = useMemo(() => entries.find((entry) => entry.id === selectedId) ?? null, [selectedId]);
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const sync = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? "light" : "dark");
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.fraymTheme = resolvedTheme;
    root.dataset.fraymAccent = accent;
    return () => {
      delete root.dataset.fraymTheme;
      delete root.dataset.fraymAccent;
    };
  }, [accent, resolvedTheme]);

  const navigate = (id: string | null) => {
    setSelectedId(id);
    window.history.replaceState(null, "", id ? `#${id}` : window.location.pathname);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="sink-site">
      <header className="sink-topbar"><Button className="sink-brand" variant="ghost" onClick={() => navigate(null)}><span className="sink-brand-mark">F</span><span><strong>Fraym</strong><small>Component system</small></span></Button><ThemeControls accent={accent} onAccent={setAccent} onTheme={setTheme} theme={theme} /></header>
      <Catalog activeId={selectedId} onHome={() => navigate(null)} onSelect={(id) => navigate(id)} query={query} setQuery={setQuery} />
      <main className="sink-main">{selected ? <EntryPage entry={selected} key={selected.id} /> : <Landing onSelect={(id) => navigate(id)} />}</main>
    </div>
  );
}
