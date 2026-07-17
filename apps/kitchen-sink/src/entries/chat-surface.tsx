import { useRef, useState, type ReactNode } from "react";
import {
  ActivityDot, ApprovalDrawer, AskFieldControl, Button, ChainOfThoughtGroup, ComposerChip,
  ComposerTips, ConfirmRequestPicker, ContextBreakdownView, ContextPopover, ContextRadial,
  GoalComposerSurface, HostUiDialog, HostUiDock, HostUiLayer, ImageBlock, InputRequestCard,
  LoopTickBadge, Message, MessageSurface, MessageThreadViewport, Meter, ModeEyebrow,
  NoticeCard, PermissionApprovalCard, PermissionMenu, ReasoningBlock, RelayMessageSurface,
  RetryNotice, SelectRequestPicker, StatusDot, ThreadMessage, ToolBodyCard, ToolBodySection,
  ToolDisplaySettingsProvider, ToolMetadataRow, ToolRender, UsageLimitComposerSurface,
  WorkedForGroup, WorkingTail, type MentionEditorHandle, MentionEditor,
} from "@fraym/ui";
import type { DemoProps, Entry } from "../entry";

const noop = () => undefined;
const userMessage = { id: "user-1", role: "user" as const, blocks: [{ type: "text", text: "Please inspect @packages/ui/src/index.ts and keep the public boundary clean." }] };
const agentMessage = { id: "agent-1", role: "agent" as const, blocks: [{ type: "reasoning", text: "I should reuse the renderer registry." }, { type: "text", text: "The shared contract is connected and ready." }] };
const toolCall = { id: "tool-1", name: "read", status: "succeeded" as const, input: { path: "packages/ui/src/index.ts" }, output: { content: "export * from './features';" } };
const selectRequest = { id: "select-1", requestId: "select-1", kind: "select" as const, title: "Choose a delivery mode", options: [{ label: "Focused (Recommended)", description: "Keep the change narrow and reviewable." }, { label: "Broad", description: "Include adjacent cleanup." }, "Other"] };
const inputRequest = { id: "input-1", requestId: "input-1", kind: "input" as const, title: "Name this branch", placeholder: "feature/chat-surface" };
const confirmRequest = { id: "confirm-1", requestId: "confirm-1", kind: "confirm" as const, title: "Apply these changes?", message: "The workspace files will be updated." };
const permissionRequest = { id: "permission-1", requestId: "permission-1", kind: "permission" as const, title: "bun test", toolName: "shell", locations: [{ path: "packages/ui" }], options: [{ optionId: "reject", name: "Reject", kind: "reject_once" as const }, { optionId: "allow", name: "Allow once", kind: "allow_once" as const }] };

function ActivityDotDemo() { return <div className="sink-demo-row">{(["working", "needs-you", "background", "attached", "failed", "ok", "off", "idle"] as const).map((state) => <span className="sink-demo-row" key={state}><ActivityDot state={state} />{state}</span>)}</div>; }
function StatusDotDemo() { return <div className="sink-demo-row"><StatusDot tone="accent" animated /><StatusDot tone="add" /><StatusDot tone="warn" /></div>; }
function MeterDemo() { return <Meter total={100} value={68} />; }
function ModeEyebrowDemo() { return <ModeEyebrow trailing="3 steps">Work trace</ModeEyebrow>; }
function ToolMetadataDemo() { return <ToolMetadataRow items={[{ id: "path", label: "path", value: "src/index.ts" }, { id: "lines", label: "lines", value: "42", tone: "accent" }]} />; }
function ToolBodyDemo() { return <ToolBodyCard toolbar={<span>Output</span>}><ToolBodySection title="Summary"><p>Renderer output is kept inside one reusable frame.</p></ToolBodySection></ToolBodyCard>; }
function ToolSettingsDemo() { return <ToolDisplaySettingsProvider settings={{ defaultOpen: "all" }}><ToolRender call={toolCall} /></ToolDisplaySettingsProvider>; }
function MessageDemo() { return <Message message={agentMessage} showAvatar showHeader />; }
function ThreadMessageDemo() { return <ThreadMessage message={userMessage} showAvatar showHeader />; }
function ViewportDemo() { return <div style={{ height: 180 }}><MessageThreadViewport footer={<WorkingTail streaming verb="Reviewing" />}>{[1,2,3].map((item) => <p key={item}>Conversation turn {item}</p>)}</MessageThreadViewport></div>; }
function WorkingTailDemo() { return <WorkingTail presence={<ActivityDot state="working" />} streaming verb="Refactoring" />; }
function WorkedForDemo() { return <WorkedForGroup count={3} defaultOpen durationMs={7_400}><p>Read files</p><p>Updated contract</p><p>Ran tests</p></WorkedForGroup>; }
function LoopTickDemo() { return <LoopTickBadge text="Iteration 3 of 8: validating" />; }
function ReasoningBlockDemo() { return <ReasoningBlock defaultOpen text="The renderer already owns tool presentation, so the thread should only compose blocks." />; }
function ChainDemo() { return <ChainOfThoughtGroup count={2}><ReasoningBlock density="compact" text="Inspect the contract." /><ReasoningBlock density="compact" text="Reuse the shared card." /></ChainOfThoughtGroup>; }
function NoticeDemo() { return <NoticeCard level="warning" message="The provider is retrying this turn." source="Runtime" />; }
function RetryDemo() { return <RetryNotice attempt={2} maxAttempts={3} phase="started" />; }
function ImageDemo() { return <ImageBlock alt="Generated color swatch" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='120'%3E%3Crect width='240' height='120' fill='%238f7bff'/%3E%3C/svg%3E" />; }
function MessageSurfaceDemo() { return <MessageSurface label="Background result" text="The indexed task completed successfully." tone="success" />; }
function RelayDemo() { return <RelayMessageSurface fields={{ kind: "relay", from: "Reviewer", to: "Builder", body: "The contract is ready for verification." }} />; }
function ComposerTipsDemo() { return <ComposerTips intervalMs={0} tips={["Drop files directly into the composer."]} />; }
function ComposerChipDemo() { return <div className="sink-demo-row"><ComposerChip tone="accent">Review mode</ComposerChip><ComposerChip dot>Workspace</ComposerChip></div>; }
function ContextRadialDemo() { return <ContextRadial percent={64} />; }
function MentionEditorDemo() { const [value, setValue] = useState("Inspect @packages/ui/src/index.ts"); const handle = useRef<MentionEditorHandle>(null); return <div className="sink-demo-stack"><MentionEditor handleRef={handle} onCaretChange={noop} onChange={(next) => setValue(next)} placeholder="Mention a file" value={value} /><Button onClick={() => handle.current?.insertMention({ value: "@README.md", label: "README.md", path: "README.md", isDirectory: false })} size="sm">Insert mention</Button></div>; }
function GoalDemo() { return <GoalComposerSurface goal={{ objective: "Ship renderer parity", status: "active", tokensUsed: 12_400, tokenBudget: 40_000 }} onClearGoal={noop} onPauseGoal={noop} />; }
function UsageLimitDemo() { return <UsageLimitComposerSurface limits={[{ provider: "Example", label: "Daily window", usedPercent: 86, status: "warning", inUse: true }]} />; }
function AskFieldDemo() { return <AskFieldControl field={{ type: "slider", min: 1, max: 10, default: 6 }} onCancel={noop} onSubmit={noop} question="How much detail?" />; }
function SelectRequestDemo() { const [answer, setAnswer] = useState("Waiting for a selection"); return <div className="sink-demo-stack"><SelectRequestPicker onRespond={(response) => setAnswer(String(response.value ?? response.values ?? "Cancelled"))} request={selectRequest} /><span className="sink-demo-feedback">{answer}</span></div>; }
function InputRequestDemo() { return <InputRequestCard onRespond={noop} request={inputRequest} />; }
function ConfirmRequestDemo() { return <ConfirmRequestPicker onRespond={noop} request={confirmRequest} />; }
function PermissionApprovalDemo() { return <PermissionApprovalCard onRespond={noop} request={permissionRequest} />; }
function HostUiDialogDemo() { const [open, setOpen] = useState(false); return <><Button onClick={() => setOpen(true)}>Open request</Button>{open ? <HostUiDialog onRespond={() => setOpen(false)} request={confirmRequest} /> : null}</>; }
function HostUiLayerDemo() { return <HostUiLayer onRespond={noop} requests={[selectRequest]} />; }
function HostUiDockDemo() { return <HostUiDock onRespond={noop} requests={[inputRequest, confirmRequest]} />; }
function ApprovalDrawerDemo() { const [open, setOpen] = useState(false); return <><Button onClick={() => setOpen(true)}>Open approval drawer</Button>{open ? <ApprovalDrawer onRespond={() => setOpen(false)} request={permissionRequest} /> : null}</>; }
const permissionDefs = [{ id: "ask", label: "Ask first", desc: "Confirm sensitive operations", icon: "◇", tone: "warn" as const }, { id: "allow", label: "Allow edits", desc: "Write within the workspace", icon: "✓", tone: "accent" as const }];
function PermissionMenuDemo() { const [open, setOpen] = useState(false); const [selected, setSelected] = useState("ask"); return <><Button onClick={() => setOpen(true)}>Permission: {selected}</Button>{open ? <PermissionMenu onClose={() => setOpen(false)} onSelect={setSelected} permissions={permissionDefs} selected={selected} style={{ left: 24, top: 120 }} /> : null}</>; }
const breakdown = [{ name: "System", k: 12.4, pct: 19, tone: "accent" as const }, { name: "Conversation", k: 31.2, pct: 49, tone: "blue" as const }, { name: "Tools", k: 8.7, pct: 14, tone: "add" as const }];
function ContextBreakdownDemo() { return <ContextBreakdownView breakdown={breakdown} max={64_000} used={52_300} />; }
function ContextPopoverDemo() { const [open, setOpen] = useState(false); return <><Button onClick={() => setOpen(true)}>Inspect context</Button>{open ? <ContextPopover breakdown={breakdown} max={64_000} onClose={() => setOpen(false)} style={{ left: 24, top: 120 }} used={52_300} /> : null}</>; }

type Demo = (props: DemoProps) => ReactNode;
function entry(id: string, title: string, description: string, Demo: Demo, names = title): Entry { return { id, title, group: "features", tier: "Chat surface", description, importCode: `import { ${names} } from "@fraym/ui"`, Demo, knobs: [], code: () => `<${title} />`, examples: [{ title: "Basic", description, code: `<${title} />` }, { title: "Composed", description: `Use ${title} inside the shared conversation surface.`, code: `<Thread><${title} /></Thread>` }], props: [{ name: "className", type: "string", defaultValue: "undefined", description: "Optional styling hook." }] }; }

export const chatSurfaceEntries: readonly Entry[] = [
  entry("activity-dot", "ActivityDot", "Shared semantic state signal for active, waiting, healthy, and failed work.", ActivityDotDemo),
  entry("status-dot", "StatusDot", "Compact density status signal with optional attention motion.", StatusDotDemo),
  entry("meter", "Meter", "Token-driven progress meter for budgets and task completion.", MeterDemo),
  entry("mode-eyebrow", "ModeEyebrow", "Dense section label with a quiet rule and trailing summary.", ModeEyebrowDemo),
  entry("tool-metadata-row", "ToolMetadataRow", "Compact typed metadata attached to renderer output.", ToolMetadataDemo),
  entry("tool-body-card", "ToolBodyCard", "Reusable frame and sections for rich tool renderer bodies.", ToolBodyDemo, "ToolBodyCard, ToolBodySection"),
  entry("tool-display-settings", "ToolDisplaySettingsProvider", "Ambient expansion and grouping policy for registry-backed tool calls.", ToolSettingsDemo, "ToolDisplaySettingsProvider, ToolRender"),
  entry("message", "Message", "Block-based user, assistant, and divider message surface.", MessageDemo),
  entry("thread-message", "ThreadMessage", "Thread-aware message composition with commands, custom surfaces, and paste disclosures.", ThreadMessageDemo),
  entry("message-thread-viewport", "MessageThreadViewport", "Streaming-aware pinned viewport with jump-to-latest behavior.", ViewportDemo),
  entry("working-tail", "WorkingTail", "Single live activity tail pinned beneath the current turn.", WorkingTailDemo),
  entry("worked-for-group", "WorkedForGroup", "Disclosure that folds a completed work trace while leaving the answer visible.", WorkedForDemo),
  entry("loop-tick-badge", "LoopTickBadge", "Compact progress badge parsed from iteration status text.", LoopTickDemo),
  entry("reasoning-block", "ReasoningBlock", "Density-aware reasoning disclosure connected to tool display settings.", ReasoningBlockDemo),
  entry("chain-of-thought-group", "ChainOfThoughtGroup", "Grouped reasoning trace with controlled disclosure.", ChainDemo),
  entry("notice-card", "NoticeCard", "Inline informational, warning, and error notice surface.", NoticeDemo),
  entry("retry-notice", "RetryNotice", "Condensed provider retry lifecycle signal.", RetryDemo),
  entry("image-block", "ImageBlock", "Inline image with bounded preview and full-screen lightbox.", ImageDemo),
  entry("message-surface", "MessageSurface", "Neutral custom-message frame used by surface renderer registrations.", MessageSurfaceDemo),
  entry("relay-message-surface", "RelayMessageSurface", "Structured cross-agent relay message without product coupling.", RelayDemo),
  entry("composer-tips", "ComposerTips", "Rotating surface-agnostic guidance below the composer.", ComposerTipsDemo),
  entry("composer-chip", "ComposerChip", "Committed command, recipe, and context chip for the composer.", ComposerChipDemo),
  entry("context-radial", "ContextRadial", "Compact context-window usage trigger.", ContextRadialDemo),
  entry("mention-editor", "MentionEditor", "Content-editable input with atomic file and image reference pills.", MentionEditorDemo),
  entry("goal-composer-surface", "GoalComposerSurface", "Persistent goal state and budget controls above the composer.", GoalDemo),
  entry("usage-limit-composer", "UsageLimitComposerSurface", "Provider-scoped usage warning above the composer.", UsageLimitDemo),
  entry("ask-field-control", "AskFieldControl", "Typed text, number, switch, slider, and tags approval control.", AskFieldDemo),
  entry("select-request-picker", "SelectRequestPicker", "Single, multiple, recommended, and free-form host selection request.", SelectRequestDemo),
  entry("input-request-card", "InputRequestCard", "Docked host input request using typed field metadata.", InputRequestDemo),
  entry("confirm-request-picker", "ConfirmRequestPicker", "Compact host confirmation request.", ConfirmRequestDemo),
  entry("permission-approval-card", "PermissionApprovalCard", "Keyboard-aware allow and reject decision card.", PermissionApprovalDemo),
  entry("host-ui-dialog", "HostUiDialog", "Modal placement for host UI requests.", HostUiDialogDemo),
  entry("host-ui-layer", "HostUiLayer", "Registry-aware dispatcher for the active host UI request.", HostUiLayerDemo),
  entry("host-ui-dock", "HostUiDock", "Inline stack for docked host UI requests.", HostUiDockDemo),
  entry("approval-drawer", "ApprovalDrawer", "Thumb-zone bottom sheet placement for mobile approvals.", ApprovalDrawerDemo),
  entry("permission-menu", "PermissionMenu", "Responsive permission-mode selector with desktop and phone placements.", PermissionMenuDemo),
  entry("context-breakdown", "ContextBreakdownView", "Detailed context allocation and plan-limit view.", ContextBreakdownDemo),
  entry("context-popover", "ContextPopover", "Anchored context-window breakdown surface.", ContextPopoverDemo),
];
