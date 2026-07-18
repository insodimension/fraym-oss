import { useRef, useState } from "react";
import {
  AgentSetup, BottomSheet, Button, Collapsible, CommandTagProvider, ConfirmDialog, DiffBlock, DockSplit,
  FormSheet, InputGroup, InstallProgress, MarketplaceFilterPills, Menu, MenuBar, MenuItem,
  MessageBlockProvider, OAuthPopup, PageHeader, SelectorMenu, SessionLink, SurfaceRendererProvider,
  ToolCall, ToolRendererProvider, WaitingForApp, groupBlocks, resolveSurfaceRegistration,
  useCommandTagResolver, useMessageBlockRenderer, useSurfaceRendererMap,
  type MessageBlock, type MessageData, type OAuthController, type SurfaceRenderInput,
} from "@fraym/ui";
import { elementEntry, type Entry } from "../entry";

function DiffBlockDemo() { return <DiffBlock added={2} deleted={1} path="src/registry.ts" lines={[{ kind: "ctx", lineNo: "12", code: "export function resolve(name) {" }, { kind: "del", lineNo: "13", code: "  return renderers[name];" }, { kind: "add", lineNo: "13", code: "  return renderers[normalize(name)];" }, { kind: "add", lineNo: "14", code: "}" }]} />; }
function CollapsibleDemo() { const [open, setOpen] = useState(true); return <Collapsible count={3} onToggle={() => setOpen(value => !value)} open={open} title="Renderer details"><p>Exact, normalized, then fallback resolution.</p></Collapsible>; }
function MenuDemo() { return <div style={{ height: 120 }}><MenuBar><Menu id="file" label="File"><MenuItem>New session</MenuItem><MenuItem>Export transcript</MenuItem></Menu><Menu id="view" label="View"><MenuItem>Toggle dock</MenuItem></Menu></MenuBar></div>; }
function ConfirmDialogDemo() { const [open, setOpen] = useState(false); return <><Button onClick={() => setOpen(true)} variant="danger">Delete session</Button>{open ? <ConfirmDialog description="This cannot be undone." intent="danger" onClose={() => setOpen(false)} onConfirm={() => setOpen(false)} title="Delete this session?" /> : null}</>; }
function PageHeaderDemo() { return <PageHeader eyebrow="Renderer contract" lede="Composable registries keep host behavior replaceable without forking the thread." title="One rendering boundary." />; }
function FilterPillsDemo() { const [active, setActive] = useState("all"); return <MarketplaceFilterPills active={active} filters={[{ id: "all", label: "All" }, { id: "ready", label: "Ready" }, { id: "blocked", label: "Blocked" }]} onChange={setActive} />; }
function InputGroupDemo() { const [value, setValue] = useState(""); return <InputGroup leading="⌕" placeholder="Search renderers" trailing={value ? <button onClick={() => setValue("")} type="button">Clear</button> : null} value={value} onChange={event => setValue(event.currentTarget.value)} />; }
const selectorCategories = [{ id: "files", label: "Files", items: ["read", "write", "edit"] }, { id: "work", label: "Work", items: ["bash", "task", "todo"] }] as const;
function SelectorMenuDemo() { const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const [selected, setSelected] = useState("read"); return <div className="sink-demo-stack"><Button onClick={() => setOpen(true)} variant="secondary">Renderer: {selected}</Button>{open ? <SelectorMenu anchorRect={null} categories={selectorCategories} getItemId={item => item} onClose={() => setOpen(false)} onPick={item => { setSelected(item); setOpen(false); }} onQueryChange={setQuery} query={query} renderItem={(item, active, pick) => <button aria-pressed={active} className="sink-selector-row" onClick={pick} type="button">{item}</button>} selectedId={selected} sheetTitle="Choose renderer" style={{ left: 24, top: 120 }} /> : null}</div>; }
function BottomSheetDemo() { const [open, setOpen] = useState(false); return <><Button onClick={() => setOpen(true)} variant="secondary">Open mobile sheet</Button>{open ? <BottomSheet footer={<Button onClick={() => setOpen(false)}>Done</Button>} onClose={() => setOpen(false)} title="Choose an action"><button className="sink-selector-row" type="button">Run tool</button><button className="sink-selector-row" type="button">Inspect output</button></BottomSheet> : null}</>; }
function DockSplitDemo() { const [status, setStatus] = useState("Ready"); return <div className="sink-demo-row"><DockSplit label="Live context" onCaret={() => setStatus("Menu requested")} onToggle={() => setStatus("Dock toggled")} /><span className="sink-demo-feedback">{status}</span></div>; }

const demoCall = { id: "call-demo", name: "read", status: "succeeded" as const, input: { path: "packages/ui/src/index.ts" }, output: { content: "export * from './registries';" } };
function ToolRegistryDemo() { return <ToolRendererProvider renderers={{ read: call => ({ label: "Inspect", stat: "1 line", kind: "read", body: <pre>{String((call.output as { content: string }).content)}</pre> }) }}><ToolCall call={demoCall} defaultExpanded /></ToolRendererProvider>; }
const customMessage: MessageData = { id: "message-demo", role: "agent", blocks: [{ type: "custom", text: "Registry override rendered." }] };
function MessageRendererProbe({ block }: { block: MessageBlock }) { const render = useMessageBlockRenderer(block.type); return <>{render?.(block, { index: 0, message: customMessage, isLast: true })}</>; }
function MessageRegistryDemo() { const grouped = groupBlocks([{ type: "reasoning" }, { type: "tool" }]); return <MessageBlockProvider renderers={{ custom: block => <div className="sink-loaded-panel">{String(block.text)}</div> }}><div className="sink-demo-stack"><MessageRendererProbe block={customMessage.blocks[0]!} /><span className="sink-demo-feedback">Grouped runs: {grouped.length}</span></div></MessageBlockProvider>; }
function SurfaceRendererProbe({ input }: { input: SurfaceRenderInput }) { const registration = resolveSurfaceRegistration(useSurfaceRendererMap(), input.channel === "hostUi" ? `hostUi:${input.request.kind}` : `msg:${input.customType}`); return <>{registration.render(input, { respond: () => undefined })}</>; }
function SurfaceRegistryDemo() { return <SurfaceRendererProvider renderers={{ "msg:preview": input => <div className="sink-loaded-panel">{input.channel === "message" ? input.text : null}</div> }}><SurfaceRendererProbe input={{ channel: "message", customType: "preview", text: "Custom docked surface" }} /></SurfaceRendererProvider>; }
function CommandTagProbe() { const resolve = useCommandTagResolver(); const display = resolve("/review"); return <div className="sink-demo-row"><code>/review</code><span>→</span><strong>{display?.label}</strong></div>; }
function CommandTagRegistryDemo() { return <CommandTagProvider recipes={[{ id: "review", name: "Review changes" }]}><CommandTagProbe /></CommandTagProvider>; }

function AgentSetupDemo() { return <AgentSetup pluginName="Repository provider" requirementLabel="Account authorization" />; }
function FormSheetDemo() { const ref = useRef<HTMLFormElement | null>(null); return <FormSheet fields={[{ id: "token", label: "Access token", secret: true, placeholder: "token…", help: "Stored by the host application." }]} formRef={ref} onSubmit={() => undefined} />; }
function InstallProgressDemo() { const [installing, setInstalling] = useState(false); return <div className="sink-demo-stack"><InstallProgress command="example-cli" installing={installing} /><Button onClick={() => setInstalling(value => !value)} size="sm" variant="secondary">Toggle progress</Button></div>; }
function WaitingForAppDemo() { return <WaitingForApp appName="Companion service" checking={false} />; }
const oauth: OAuthController = { status: "awaiting-auth", authInfo: { url: "https://example.com/authorize" }, submitInput: () => undefined };
function OAuthPopupDemo() { return <OAuthPopup oauth={oauth} provider="Example" />; }

const entry = elementEntry((title) => `Compose ${title} inside a host surface.`);

export const rendererContractEntries: readonly Entry[] = [
  entry("diff-block", "DiffBlock", "content", "Compact file diff with line gutters and semantic add/delete treatment.", DiffBlockDemo, `<DiffBlock path="src/file.ts" added={2} lines={lines} />`),
  entry("collapsible", "Collapsible", "layout", "Controlled disclosure with count, leading content, and independent actions.", CollapsibleDemo, `<Collapsible title="Details" open={open} onToggle={toggle}>…</Collapsible>`),
  entry("menu", "Menu", "actions", "Coordinated menubar dropdowns with outside-click and Escape dismissal.", MenuDemo, `<MenuBar><Menu label="File"><MenuItem>New</MenuItem></Menu></MenuBar>`, "MenuBar, Menu, MenuItem"),
  entry("confirm-dialog", "ConfirmDialog", "feedback", "Modal confirmation flow with default and destructive intent.", ConfirmDialogDemo, `<ConfirmDialog title="Delete?" intent="danger" onConfirm={remove} onClose={close} />`),
  entry("page-header", "PageHeader", "layout", "Responsive section heading with optional label, lede, and actions.", PageHeaderDemo, `<PageHeader eyebrow="Contract" title="Renderer registry" lede="Composable boundaries." />`),
  entry("filter-pills", "MarketplaceFilterPills", "inputs", "Mutually exclusive filter row with radio semantics.", FilterPillsDemo, `<MarketplaceFilterPills filters={filters} active={active} onChange={setActive} />`),
  entry("input-group", "InputGroup", "inputs", "Single input frame with leading and trailing control slots.", InputGroupDemo, `<InputGroup leading={<SearchIcon />} placeholder="Search" />`),
  entry("selector-menu", "SelectorMenu", "inputs", "Categorized searchable picker with desktop flyout and mobile sheet modes.", SelectorMenuDemo, `<SelectorMenu categories={categories} renderItem={renderItem} {...state} />`),
  entry("bottom-sheet", "BottomSheet", "layout", "Phone-width decision surface with drag and scrim dismissal.", BottomSheetDemo, `<BottomSheet title="Choose" onClose={close}>…</BottomSheet>`),
  entry("dock-split", "DockSplit", "actions", "Segmented dock toggle and caret menu control.", DockSplitDemo, `<DockSplit label="Live context" onToggle={toggle} onCaret={openMenu} />`),
  entry("tool-renderer-registry", "ToolRendererRegistry", "content", "Rich tool rendering contract with normalized lookup and fallback resolution.", ToolRegistryDemo, `<ToolRendererProvider renderers={renderers}><ToolCall call={call} /></ToolRendererProvider>`, "ToolRendererProvider, ToolCall"),
  entry("message-block-registry", "MessageBlockRegistry", "content", "Extensible message blocks plus adjacent reasoning/tool grouping.", MessageRegistryDemo, `<MessageBlockProvider renderers={blocks}>…</MessageBlockProvider>`),
  entry("surface-renderer-registry", "SurfaceRendererRegistry", "content", "Host request and custom message surfaces with modal or docked placement.", SurfaceRegistryDemo, `<SurfaceRendererProvider renderers={surfaces}>…</SurfaceRendererProvider>`),
  entry("command-tag-registry", "CommandTagRegistry", "content", "Recipe and skill command token display resolution.", CommandTagRegistryDemo, `<CommandTagProvider recipes={recipes}>…</CommandTagProvider>`),
  entry("agent-setup", "AgentSetup", "feedback", "Conversation-led setup hint for requirements without an automated fix.", AgentSetupDemo, `<AgentSetup pluginName="Provider" requirementLabel="Authorization" />`),
  entry("form-sheet", "FormSheet", "inputs", "Manifest-driven credential form with secret reveal.", FormSheetDemo, `<FormSheet fields={fields} formRef={formRef} onSubmit={submit} />`),
  entry("install-progress", "InstallProgress", "feedback", "Idle, active, and failed dependency-install states.", InstallProgressDemo, `<InstallProgress command="example-cli" installing={installing} />`),
  entry("waiting-for-app", "WaitingForApp", "feedback", "Liveness check state for a required companion application.", WaitingForAppDemo, `<WaitingForApp appName="Companion service" checking={checking} />`),
  entry("oauth-popup", "OAuthPopup", "feedback", "Browser authorization progress with link and manual-code fallback.", OAuthPopupDemo, `<OAuthPopup provider="Example" oauth={controller} />`),
];
