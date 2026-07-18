import { useState } from "react";
import {
  BranchName,
  Button,
  Card,
  CardContent,
  Checkbox,
  CodeBlock,
  CollapseRegion,
  CopyButton,
  ErrorBoundary,
  Field,
  FileMentionPill,
  FileMentionProvider,
  FileTypeIcon,
  Input,
  Label,
  OptimisticToggle,
  PlainCodeBlock,
  PopoverHeading,
  PopoverPanel,
  PopoverRow,
  Radio,
  RollingNumber,
  Select,
  Slider,
  StaticMarkdownLite,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toggle,
  useHoverCapable,
  useReducedMotion,
} from "@fraym/ui";

import { elementEntry, type Entry } from "../entry";

const sampleCode = `export function createSession(id: string) {
  return { id, status: "ready" };
}`;

function InputDemo() { const [value, setValue] = useState(""); return <Input aria-label="Repository path" placeholder="packages/ui" value={value} onChange={(event) => setValue(event.currentTarget.value)} />; }
function LabelDemo() { return <div className="sink-demo-stack"><Label htmlFor="label-demo">Branch name</Label><Input id="label-demo" defaultValue="feature/open-core" /></div>; }
function FieldDemo() { const [value, setValue] = useState(""); const error = value.length > 0 && value.length < 3 ? "Use at least three characters." : undefined; return <Field helper="A short public display name." label="Agent name" required {...(error ? { error } : {})}><Input value={value} onChange={(event) => setValue(event.currentTarget.value)} /></Field>; }
function CheckboxDemo() { const [checked, setChecked] = useState(true); return <Label className="sink-demo-row"><Checkbox checked={checked} onChange={(event) => setChecked(event.currentTarget.checked)} /> Include tool output</Label>; }
function RadioDemo() { const [value, setValue] = useState("balanced"); return <div aria-label="Response depth" className="sink-demo-stack" role="radiogroup">{["fast", "balanced", "deep"].map((option) => <Label className="sink-demo-row" key={option}><Radio checked={value === option} onCheckedChange={() => setValue(option)} /> {option}</Label>)}</div>; }
function SelectDemo() { const [value, setValue] = useState("typescript"); return <Select aria-label="Language" options={[{ value: "typescript", label: "TypeScript" }, { value: "rust", label: "Rust" }, { value: "python", label: "Python" }]} value={value} onChange={(event) => setValue(event.currentTarget.value)} />; }
function SliderDemo() { const [value, setValue] = useState(42); return <Slider aria-label="Context budget" formatValue={(next) => `${next}%`} label="Context budget" value={value} onValueChange={setValue} />; }
function SwitchDemo() { const [checked, setChecked] = useState(true); return <Label className="sink-demo-row"><Switch checked={checked} onCheckedChange={setChecked} /> Stream responses</Label>; }
function TabsDemo() { return <Tabs defaultValue="preview"><TabsList><TabsTrigger value="preview">Preview</TabsTrigger><TabsTrigger value="source">Source</TabsTrigger></TabsList><TabsContent value="preview">Rendered agent output</TabsContent><TabsContent value="source"><code>event.delta</code></TabsContent></Tabs>; }
function ToggleDemo() { const [checked, setChecked] = useState(false); return <Label className="sink-demo-row"><Toggle checked={checked} onCheckedChange={setChecked} /> Auto-follow output</Label>; }
function PopoverDemo() { return <PopoverPanel aria-label="Session actions" style={{ position: "relative" }}><PopoverHeading>Session</PopoverHeading><PopoverRow label="Rename" kbd="R" /><PopoverRow chevron label="Export" /><PopoverRow label="Pin" selected /></PopoverPanel>; }
function CopyButtonDemo() { return <div className="sink-demo-row"><code>npm i @fraym/ui</code><CopyButton label="Copy install command" value="npm i @fraym/ui" /></div>; }
function CodeBlockDemo() { return <CodeBlock code={sampleCode} language="ts" lineNumbers />; }
function PlainCodeBlockDemo() { return <PlainCodeBlock code={"agent.start\nagent.delta\nagent.done"} lineNumbers />; }
function StaticMarkdownLiteDemo() { return <StaticMarkdownLite text={"## Settled response\n\n- Typed events\n- Reusable renderers\n\n`packages/ui` is ready."} />; }
function CollapseRegionDemo() { const [open, setOpen] = useState(true); return <div className="sink-demo-stack"><Button size="sm" variant="secondary" onClick={() => setOpen((value) => !value)}>{open ? "Collapse" : "Expand"}</Button><CollapseRegion open={open}><Card><CardContent>Natural-height content animates without measuring.</CardContent></Card></CollapseRegion></div>; }
function Failure({ enabled }: { enabled: boolean }) { if (enabled) throw new Error("Preview renderer failed"); return <span>Preview is healthy.</span>; }
function ErrorBoundaryDemo() { const [failed, setFailed] = useState(false); return <div className="sink-demo-stack"><Button size="sm" variant="danger" onClick={() => setFailed(true)}>Simulate failure</Button><ErrorBoundary resetKeys={[failed]} fallback={({ error, reset }) => <Card><CardContent><strong>{error.message}</strong><Button size="sm" variant="secondary" onClick={() => { setFailed(false); reset(); }}>Recover</Button></CardContent></Card>}><Failure enabled={failed} /></ErrorBoundary></div>; }
function MediaQueriesDemo() { const reduced = useReducedMotion(); const hover = useHoverCapable(); return <div className="sink-demo-row"><span>Reduced motion: {reduced ? "yes" : "no"}</span><span>Precise hover: {hover ? "yes" : "no"}</span></div>; }
function RollingNumberDemo() { const [value, setValue] = useState(128); return <div className="sink-demo-row"><RollingNumber suffix=" tokens" value={value} /><Button size="sm" variant="secondary" onClick={() => setValue((current) => current + 17)}>Add 17</Button></div>; }
function OptimisticToggleDemo() { const [checked, setChecked] = useState(false); return <Label className="sink-demo-row"><OptimisticToggle checked={checked} onCheckedChange={async (next) => { await new Promise((resolve) => setTimeout(resolve, 500)); setChecked(next); }} /> Enable renderer</Label>; }
function FileTypeIconDemo() { return <div className="sink-demo-row">{["Thread.tsx", "tokens.css", "README.md", "package.json"].map((path) => <span className="sink-demo-row" key={path}><FileTypeIcon path={path} />{path}</span>)}</div>; }
function FileMentionDemo() { const [opened, setOpened] = useState("Nothing opened"); return <FileMentionProvider openFile={setOpened}><div className="sink-demo-stack"><p>Inspect <FileMentionPill fallback="packages/ui/src/index.ts" path="packages/ui/src/index.ts" /> before publishing.</p><span className="sink-demo-feedback" role="status">{opened}</span></div></FileMentionProvider>; }
function BranchNameDemo() { return <div style={{ maxWidth: 220 }}><BranchName name="feature/open-core-elements-parity" /></div>; }

const element = elementEntry((title) => `Use ${title} inside a larger agent surface.`);

export const additionalElementEntries: readonly Entry[] = [
  element("input", "Input", "inputs", "Token-driven single-line text input with native semantics.", InputDemo, `<Input aria-label="Repository path" placeholder="packages/ui" />`),
  element("label", "Label", "inputs", "Consistent accessible labeling for form controls.", LabelDemo, `<Label htmlFor="branch">Branch name</Label>`),
  element("field", "Field", "inputs", "Label, helper, warning, and error wiring around any form control.", FieldDemo, `<Field label="Agent name" helper="Public display name"><Input /></Field>`, "Field, Input"),
  element("checkbox", "Checkbox", "inputs", "Native checkbox behavior with Fraym control styling.", CheckboxDemo, `<Checkbox checked={enabled} onChange={onChange} />`),
  element("radio", "Radio", "inputs", "Keyboard-friendly discrete choice control.", RadioDemo, `<Radio checked={mode === "deep"} onCheckedChange={() => setMode("deep")} />`),
  element("select", "Select", "inputs", "Native select affordance with shared sizing and states.", SelectDemo, `<Select options={languages} value={language} onChange={onChange} />`),
  element("slider", "Slider", "inputs", "Numeric and stepped scrubber with readable inline values.", SliderDemo, `<Slider label="Context budget" value={42} onValueChange={setBudget} />`),
  element("switch", "Switch", "inputs", "Accessible binary switch for user-facing settings.", SwitchDemo, `<Switch checked={streaming} onCheckedChange={setStreaming} />`),
  element("tabs", "Tabs", "layout", "Segmented and dock variants for switching related panels.", TabsDemo, `<Tabs defaultValue="preview"><TabsList><TabsTrigger value="preview">Preview</TabsTrigger></TabsList></Tabs>`, "Tabs, TabsList, TabsTrigger, TabsContent"),
  element("toggle", "Toggle", "inputs", "Compact binary control for dense agent settings.", ToggleDemo, `<Toggle checked={follow} onCheckedChange={setFollow} />`),
  element("popover", "Popover", "layout", "Anchored surface primitives for menus and lightweight choices.", PopoverDemo, `<PopoverPanel anchorRect={triggerRect}><PopoverRow label="Rename" /></PopoverPanel>`, "PopoverPanel, PopoverHeading, PopoverRow"),
  element("copy-button", "CopyButton", "actions", "One copy affordance with consistent confirmation feedback.", CopyButtonDemo, `<CopyButton value={command} label="Copy command" />`),
  element("code-block", "CodeBlock", "content", "Highlighted code card with line numbers and shared copy behavior.", CodeBlockDemo, `<CodeBlock code={source} language="ts" lineNumbers />`),
  element("plain-code-block", "PlainCodeBlock", "content", "Fast dependency-free code rendering for logs and large output.", PlainCodeBlockDemo, `<PlainCodeBlock code={output} lineNumbers />`),
  element("static-markdown-lite", "StaticMarkdownLite", "content", "Settled Markdown renderer for low-cost history mounts.", StaticMarkdownLiteDemo, `<StaticMarkdownLite text={completedMessage} />`),
  element("collapse-region", "CollapseRegion", "layout", "Natural-height disclosure that animates in both directions.", CollapseRegionDemo, `<CollapseRegion open={expanded}>{details}</CollapseRegion>`),
  element("error-boundary", "ErrorBoundary", "feedback", "Inline recovery boundary that protects the rest of the interface.", ErrorBoundaryDemo, `<ErrorBoundary fallback={({ reset }) => <button onClick={reset}>Retry</button>}>{view}</ErrorBoundary>`),
  element("media-queries", "Media queries", "feedback", "Reactive reduced-motion and hover-capability hooks.", MediaQueriesDemo, `const reducedMotion = useReducedMotion();`, "useReducedMotion, useHoverCapable"),
  element("rolling-number", "RollingNumber", "feedback", "Odometer-style live counters with reduced-motion compatibility.", RollingNumberDemo, `<RollingNumber value={tokens} suffix=" tokens" />`),
  element("optimistic-toggle", "OptimisticToggle", "inputs", "Immediate toggle feedback while asynchronous persistence settles.", OptimisticToggleDemo, `<OptimisticToggle checked={enabled} onCheckedChange={saveEnabled} />`),
  element("file-type-icon", "FileTypeIcon", "content", "Compact file and folder identity across code surfaces.", FileTypeIconDemo, `<FileTypeIcon path="Thread.tsx" />`),
  element("file-mention", "FileMention", "content", "Host-aware inline file references with graceful plain-text fallback.", FileMentionDemo, `<FileMentionProvider openFile={openFile}><FileMentionPill path="src/index.ts" fallback="src/index.ts" /></FileMentionProvider>`, "FileMentionProvider, FileMentionPill"),
  element("branch-name", "BranchName", "content", "Tail-preserving branch display for constrained widths.", BranchNameDemo, `<BranchName name="feature/open-core-elements" />`),
];
