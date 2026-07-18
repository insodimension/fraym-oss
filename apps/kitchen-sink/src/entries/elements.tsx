import {
	Badge,
	type BadgeProps,
	Button,
	type ButtonProps,
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	Checkbox,
	Code,
	CompactionSplit,
	DiagramTag,
	type DiagramTagProps,
	Field,
	Icon,
	IconButton,
	Input,
	type InputProps,
	Kbd,
	Label,
	MermaidDiagram,
	type MessageAction,
	MessageActions,
	MessageUsage,
	Radio,
	ScrollArea,
	Select,
	type SelectProps,
	Separator,
	Shimmer,
	Skeleton,
	SkeletonGroup,
	SkeletonText,
	Slider,
	type SliderStep,
	Spinner,
	type SpinnerKind,
	type SpinnerState,
	StreamingMarkdown,
	Switch,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Textarea,
	type TextareaProps,
	ThinkingDots,
	Toggle,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@fraym/ui";
import { useEffect, useRef, useState } from "react";
import { useControls } from "../showcase/controls";
import { Demo, Note } from "../showcase/demo";
import type { EntryDocs } from "../showcase/docs";
import { type ShowcaseEntry, withGroup } from "../showcase/types";
import { borderEffectsEntries } from "./border-effects-entry";
import { chromaGridEntries } from "./chroma-grid-entry";
import { interactiveBitsEntries } from "./interactive-bits-entry";
import { liquidGlassEntries } from "./liquid-glass-entry";
import { textShineEntries } from "./text-shine-entry";

function ButtonEntry() {
	const { values, panel } = useControls({
		variant: {
			kind: "select",
			label: "variant",
			options: ["default", "outline", "ghost", "destructive", "link"],
			default: "default",
		},
		size: { kind: "select", label: "size", options: ["default", "sm", "lg", "icon"], default: "default" },
		label: { kind: "text", label: "label", default: "Commit changes" },
		disabled: { kind: "boolean", label: "disabled", default: false },
		loading: { kind: "boolean", label: "loading", default: false },
	});
	return (
		<Demo
			summary="The primary action primitive. Pixel-matched to the prototype .btn family with CVA variants and sizes; forwards all native button props and merges className last."
			importPath="@fraym/ui/elements/button"
			controls={panel}
		>
			<Button
				variant={values.variant as ButtonProps["variant"]}
					size={values.size as ButtonProps["size"]}
					disabled={values.disabled}
					loading={values.loading}
					{...(values.loading ? { loadingText: "Working…" } : {})}
			>
				{values.size === "icon" ? <Icon name="plus" size={16} /> : values.label}
			</Button>
		</Demo>
	);
}

function IconButtonEntry() {
	const { values, panel } = useControls({
		toggled: { kind: "boolean", label: "toggled", default: false },
		icon: { kind: "select", label: "icon", options: ["panel", "diff", "search", "bell", "gear"], default: "panel" },
	});
	return (
		<Demo
			summary="A 32×32 square icon affordance for top bars and toolbars. The toggled state lights it with the accent-dim fill + accent-line border."
			importPath="@fraym/ui/elements/icon-button"
			controls={panel}
		>
			<IconButton toggled={values.toggled}>
				<Icon name={values.icon as never} size={16} />
			</IconButton>
		</Demo>
	);
}

function BadgeEntry() {
	const { values, panel } = useControls({
		tone: {
			kind: "select",
			label: "tone",
			options: ["accent", "add", "blue", "warn", "mute", "del"],
			default: "accent",
		},
		label: { kind: "text", label: "label", default: "running" },
	});
	const tones = ["accent", "add", "blue", "warn", "mute", "del"] as const;
	return (
		<Demo
			summary="A compact mono status pill. Six semantic tones map onto the token palette (accent/add/blue/warn/mute/del)."
			importPath="@fraym/ui/elements/badge"
			controls={panel}
			stage="start"
		>
			<Badge tone={values.tone as BadgeProps["tone"]}>{values.label}</Badge>
			<Note>all tones</Note>
			<div className="flex flex-wrap gap-2">
				{tones.map(t => (
					<Badge key={t} tone={t}>
						{t}
					</Badge>
				))}
			</div>
		</Demo>
	);
}

function InputEntry() {
	const { values, panel } = useControls({
		variant: { kind: "select", label: "variant", options: ["default", "ghost", "underline"], default: "default" },
		size: { kind: "select", label: "size", options: ["sm", "default", "lg"], default: "default" },
		state: { kind: "select", label: "state", options: ["none", "valid", "warning", "invalid"], default: "none" },
		placeholder: { kind: "text", label: "placeholder", default: "Type here…" },
		disabled: { kind: "boolean", label: "disabled", default: false },
	});
	const dataState = values.state === "none" ? undefined : values.state;
	return (
		<Demo
			summary="A single-line text field with variants, sizes, validation states, and type adaptations. Forwards all native input props. Number spinners are hidden globally via theme.css."
			importPath="@fraym/ui/elements/input"
			controls={panel}
			stage="stretch"
		>
			<div className="flex max-w-sm flex-col gap-5">
				<Input
					variant={values.variant as InputProps["variant"]}
					size={values.size as InputProps["size"]}
					placeholder={values.placeholder}
					disabled={values.disabled}
					data-state={dataState}
				/>
				<Field label="Email address" helper="We never share your email.">
					<Input type="email" placeholder="you@example.com" />
				</Field>
				<Field label="Amount" {...(values.state === "invalid" ? { error: "Must be between 1 and 100" } : {})}>
					<Input type="number" min={1} max={100} placeholder="0" />
				</Field>
				<Field label="Password" required helper="At least 8 characters">
					<Input type="password" placeholder="••••••••" />
				</Field>
			</div>
		</Demo>
	);
}

function SelectEntry() {
	const { values, panel } = useControls({
		variant: { kind: "select", label: "variant", options: ["default", "ghost"], default: "default" },
		size: { kind: "select", label: "size", options: ["sm", "default", "lg"], default: "default" },
		disabled: { kind: "boolean", label: "disabled", default: false },
	});
	return (
		<Demo
			summary="A styled native <select>. Keeps the OS-native popup and chevron, so it behaves like a real form control; pass options as data or render <option> children."
			importPath="@fraym/ui/elements/select"
			controls={panel}
			stage="stretch"
		>
			<div className="flex max-w-sm flex-col gap-5">
				<Select
					variant={values.variant as SelectProps["variant"]}
					size={values.size as SelectProps["size"]}
					disabled={values.disabled}
					defaultValue="atlas"
					options={[
						{ value: "atlas", label: "atlas Sonnet" },
						{ value: "gpt", label: "GPT-5" },
						{ value: "gemini", label: "Gemini Pro" },
						{ value: "local", label: "Local (disabled)", disabled: true },
					]}
				/>
				<Field label="Model" helper="Rendered from option children instead of data.">
					<Select defaultValue="b">
						<option value="a">Option A</option>
						<option value="b">Option B</option>
						<option value="c">Option C</option>
					</Select>
				</Field>
			</div>
		</Demo>
	);
}

function TextareaEntry() {
	const { values, panel } = useControls({
		variant: { kind: "select", label: "variant", options: ["default", "ghost"], default: "default" },
		resize: { kind: "select", label: "resize", options: ["none", "vertical", "both"], default: "none" },
		state: { kind: "select", label: "state", options: ["none", "valid", "warning", "invalid"], default: "none" },
		placeholder: { kind: "text", label: "placeholder", default: "Reply, or type / for commands…" },
		rows: { kind: "number", label: "rows", default: 3, min: 1, max: 10 },
		disabled: { kind: "boolean", label: "disabled", default: false },
	});
	const dataState = values.state === "none" ? undefined : values.state;
	return (
		<Demo
			summary="Multiline text field with variants, resize modes, and validation states. Forwards native textarea props."
			importPath="@fraym/ui/elements/textarea"
			controls={panel}
			stage="stretch"
		>
			<div className="flex max-w-md flex-col gap-5">
				<Textarea
					variant={values.variant as TextareaProps["variant"]}
					resize={values.resize as TextareaProps["resize"]}
					placeholder={values.placeholder}
					rows={values.rows}
					disabled={values.disabled}
					data-state={dataState}
				/>
				<Field label="System prompt" helper="Shown to the model before each turn">
					<Textarea variant="ghost" placeholder="You are a helpful assistant…" rows={4} />
				</Field>
			</div>
		</Demo>
	);
}

function FieldEntry() {
	const { values, panel } = useControls({
		label: { kind: "text", label: "label", default: "Email address" },
		helper: { kind: "text", label: "helper", default: "We never share your email." },
		warning: { kind: "text", label: "warning", default: "" },
		error: { kind: "text", label: "error", default: "" },
		required: { kind: "boolean", label: "required", default: false },
		disabled: { kind: "boolean", label: "disabled", default: false },
	});
	return (
		<Demo
			summary="Composes a Label, a control, and a message line with automatic ARIA wiring. Clones its child to inject id, aria-describedby, aria-invalid, and data-state. Message precedence: error → warning → helper."
			importPath="@fraym/ui/elements/field"
			controls={panel}
			stage="start"
		>
			<Field
				{...(values.label ? { label: values.label } : {})}
				{...(values.helper ? { helper: values.helper } : {})}
				{...(values.warning ? { warning: values.warning } : {})}
				{...(values.error ? { error: values.error } : {})}
				required={values.required}
				className="w-[320px]"
			>
				<Input type="email" placeholder="you@example.com" disabled={values.disabled} />
			</Field>
		</Demo>
	);
}

function LabelEntry() {
	return (
		<Demo
			summary="Standalone form label primitive (text-fr-sm font-medium). Use htmlFor to associate it with a control, or let Field wire it automatically."
			importPath="@fraym/ui/elements/label"
			stage="start"
		>
			<div className="flex w-[320px] flex-col gap-1.5">
				<Label htmlFor="demo-api-key">API key</Label>
				<Input id="demo-api-key" placeholder="sk-…" />
			</div>
		</Demo>
	);
}

function SwitchEntry() {
	const { values, panel } = useControls({
		checked: { kind: "boolean", label: "checked", default: true },
		disabled: { kind: "boolean", label: "disabled", default: false },
	});
	const [checked, setChecked] = useState(values.checked);
	useEffect(() => setChecked(values.checked), [values.checked]);
	return (
		<Demo
			summary="A Radix-backed on/off switch with controlled checked + onCheckedChange. Use for settings rows."
			importPath="@fraym/ui/elements/switch"
			controls={panel}
		>
			<Switch checked={checked} onCheckedChange={setChecked} disabled={values.disabled} />
		</Demo>
	);
}

function CheckboxEntry() {
	const { values, panel } = useControls({
		checked: { kind: "boolean", label: "checked", default: true },
		decorative: { kind: "boolean", label: "decorative", default: false },
		disabled: { kind: "boolean", label: "disabled", default: false },
	});
	const [checked, setChecked] = useState(values.checked);
	useEffect(() => setChecked(values.checked), [values.checked]);
	return (
		<Demo
			summary="A Radix-backed square checkbox (the box analogue of Switch): controlled checked + onCheckedChange, accent fill when checked. Used read-only in the ask tool's answer card."
			importPath="@fraym/ui/elements/checkbox"
			controls={panel}
		>
			<label className="flex items-center gap-3">
				<Checkbox
					checked={checked}
					onCheckedChange={value => setChecked(value === true)}
					decorative={values.decorative}
					disabled={values.disabled}
				/>
				<span className="font-secondary text-fr-sm text-fr-text-2">Enable feature</span>
			</label>
		</Demo>
	);
}

function RadioEntry() {
	const { values, panel } = useControls({
		checked: { kind: "boolean", label: "checked", default: true },
		decorative: { kind: "boolean", label: "decorative", default: false },
		disabled: { kind: "boolean", label: "disabled", default: false },
	});
	const [checked, setChecked] = useState(values.checked);
	useEffect(() => setChecked(values.checked), [values.checked]);
	return (
		<Demo
			summary="A Radix-backed radio button (the circle analogue of Checkbox): controlled checked + onCheckedChange, accent fill when selected. Used read-only in the ask tool's answer card."
			importPath="@fraym/ui/elements/radio"
			controls={panel}
		>
			<label className="flex items-center gap-3">
				<Radio
					checked={checked}
					onCheckedChange={setChecked}
					decorative={values.decorative}
					disabled={values.disabled}
				/>
				<span className="font-secondary text-fr-sm text-fr-text-2">Select option</span>
			</label>
		</Demo>
	);
}

function ToggleEntry() {
	const { values, panel } = useControls({
		checked: { kind: "boolean", label: "checked", default: false },
		disabled: { kind: "boolean", label: "disabled", default: false },
	});
	const [checked, setChecked] = useState(values.checked);
	useEffect(() => setChecked(values.checked), [values.checked]);
	return (
		<Demo
			summary="The prototype's pill toggle (role=switch). Lighter-weight than Switch; used inline in settings panes."
			importPath="@fraym/ui/elements/toggle"
			controls={panel}
		>
			<Toggle checked={checked} onCheckedChange={setChecked} disabled={values.disabled} />
		</Demo>
	);
}

function TabsEntry() {
	const { values, panel } = useControls({
		variant: { kind: "select", label: "variant", options: ["segmented", "dock"], default: "segmented" },
	});
	return (
		<Demo
			summary="One Tabs primitive, two looks: segmented (rail mode-tabs) and dock (panel tabs). Variant is set once on <Tabs> and inherited by list + triggers via context."
			importPath="@fraym/ui/elements/tabs"
			controls={panel}
			stage="stretch"
		>
			<Tabs variant={values.variant as "segmented" | "dock"} defaultValue="chat" className="max-w-md">
				<TabsList className={values.variant === "segmented" ? "w-full" : undefined}>
					<TabsTrigger value="chat">
						<Icon name="chat" size={13} />
						Chat
					</TabsTrigger>
					<TabsTrigger value="design">
						<Icon name="grid" size={13} />
						Design
					</TabsTrigger>
					<TabsTrigger value="code">
						<Icon name="code" size={13} />
						Code
					</TabsTrigger>
				</TabsList>
				<TabsContent value="chat">
					<Card>
						<CardContent>
							<p className="text-sm text-fr-text-2">The agent thread lives here</p>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="design">
					<Card>
						<CardContent>
							<p className="text-sm text-fr-text-2">Visual editing surface</p>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="code">
					<Card>
						<CardContent>
							<p className="font-secondary text-xs text-fr-text-3">src/index.ts</p>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</Demo>
	);
}

function TooltipEntry() {
	return (
		<Demo
			summary="Radix tooltip styled with the cx tokens. Wrap your app in <TooltipProvider> once; compose Trigger + Content per use."
			importPath="@fraym/ui/elements/tooltip"
		>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline">Hover me</Button>
				</TooltipTrigger>
				<TooltipContent>Tooltips use Radix + the cx tokens</TooltipContent>
			</Tooltip>
		</Demo>
	);
}

function CardEntry() {
	return (
		<Demo
			summary="A surface container with optional Header / Content / Footer slots. The neutral building block for dock panels and grouped content."
			importPath="@fraym/ui/elements/card"
			stage="stretch"
		>
			<Card className="max-w-sm">
				<CardHeader>Working tree · 2 files</CardHeader>
				<CardContent>
					<p className="font-secondary text-xs text-fr-text-2">src/middleware/auth.ts</p>
				</CardContent>
				<CardFooter>
					<Button size="sm">Commit</Button>
				</CardFooter>
			</Card>
		</Demo>
	);
}

function KbdEntry() {
	return (
		<Demo
			summary="A keyboard-shortcut badge. Renders a mono keycap; compose multiple for chords."
			importPath="@fraym/ui/elements/kbd"
		>
			<div className="flex gap-1.5">
				<Kbd>⌘K</Kbd>
				<Kbd>⇧⌘P</Kbd>
			</div>
		</Demo>
	);
}

function SeparatorEntry() {
	const { values, panel } = useControls({
		orientation: { kind: "select", label: "orientation", options: ["horizontal", "vertical"], default: "horizontal" },
	});
	const vertical = values.orientation === "vertical";
	return (
		<Demo
			summary="A 1px divider in either orientation, on the soft border token."
			importPath="@fraym/ui/elements/separator"
			controls={panel}
		>
			{vertical ? (
				<div className="flex h-6 items-center gap-3">
					<span className="text-xs text-fr-text-2">A</span>
					<Separator orientation="vertical" />
					<span className="text-xs text-fr-text-2">B</span>
				</div>
			) : (
				<div className="w-64">
					<Separator />
				</div>
			)}
		</Demo>
	);
}

function ScrollAreaEntry() {
	return (
		<Demo
			summary="A Radix scroll viewport with a styled, overlay scrollbar. Use to bound long content (session list, dock panels)."
			importPath="@fraym/ui/elements/scroll-area"
			stage="stretch"
		>
			<ScrollArea className="h-40 max-w-sm rounded-lg border border-fr-border-soft">
				<div className="flex flex-col gap-2 p-3">
					{Array.from({ length: 20 }, (_, i) => (
						<div key={i} className="rounded-md bg-fr-surface px-3 py-2 text-fr-base text-fr-text-2">
							Row {i + 1}
						</div>
					))}
				</div>
			</ScrollArea>
		</Demo>
	);
}

function ShimmerEntry() {
	const { values, panel } = useControls({
		text: { kind: "text", label: "text", default: "Searching the codebase…" },
		active: { kind: "boolean", label: "active", default: true },
	});
	return (
		<Demo
			summary="The animated working-status text. When active, sweeps a gradient across the label; otherwise renders flat. Driver-fed in app via useWorkingStatus()."
			importPath="@fraym/ui/elements/shimmer"
			controls={panel}
		>
			<Shimmer active={values.active}>{values.text}</Shimmer>
		</Demo>
	);
}

function SkeletonEntry() {
	return (
		<Demo
			summary="Block / text / circle loading placeholders. Reuse the fr-shimmer-sweep keyframe + surface tokens; SkeletonGroup adds role=status + aria-busy; freezes under reduced motion."
			importPath="@fraym/ui/elements/skeleton"
		>
			<div className="flex w-full max-w-[440px] flex-col gap-7">
				<div className="flex items-center gap-4">
					<Skeleton circle w={40} h={40} />
					<Skeleton w={140} h={14} />
					<Skeleton w={72} h={14} rounded="full" />
				</div>
				<SkeletonText lines={4} lineHeight={11} />
				<SkeletonGroup label="Opening session…" className="flex gap-3">
					<Skeleton circle w={28} h={28} className="shrink-0" />
					<div className="min-w-0 flex-1">
						<Skeleton w={110} h={11} rounded="sm" className="mb-2.5" />
						<SkeletonText lines={3} lineHeight={10} gap={7} lastWidth="46%" />
					</div>
				</SkeletonGroup>
			</div>
		</Demo>
	);
}

function ThinkingDotsEntry() {
	const { values, panel } = useControls({
		label: { kind: "text", label: "label", default: "Thinking" },
		shimmer: { kind: "boolean", label: "shimmer label", default: false },
	});
	return (
		<Demo
			summary="A labeled 'thinking' indicator: the bouncing-dots loader (Spinner kind='bounce') + a label with a trailing ellipsis. Reconciled with the loader family — the dots are the shared Spinner bounce kind and the label can ride Shimmer; no animation re-rolled here."
			importPath="@fraym/ui/elements/thinking-dots"
			controls={panel}
		>
			<ThinkingDots label={values.label} shimmer={values.shimmer as boolean} />
		</Demo>
	);
}

function CompactionSplitEntry() {
	const { values, panel } = useControls({
		auto: { kind: "boolean", label: "auto (compacting copy)", default: true },
		tokens: { kind: "number", label: "tokens (k)", default: 62, min: 0, max: 500 },
	});
	return (
		<Demo
			summary="The context-compaction divider rendered inline in the thread. It has two distinct states: an animated 'compacting' shimmer on soft lines, and a settled 'Compacted from N tokens' label on accent lines — both shown below."
			importPath="@fraym/ui/elements/compaction-split"
			controls={panel}
			stage="center"
		>
			<div className="flex w-full max-w-xl flex-col gap-2">
				<CompactionSplit variant="compacting" auto={values.auto} />
				<CompactionSplit variant="done" tokens={values.tokens * 1000} />
			</div>
		</Demo>
	);
}

function CodeEntry() {
	return (
		<Demo
			summary="Inline monospace code — the <code> chip used in prose and diagram labels."
			importPath="@fraym/ui/elements/code"
		>
			<p className="text-fr-md text-fr-text-2">
				Call <Code>createAgentSession()</Code>, then map <Code>AgentEvent</Code> to the driver.
			</p>
		</Demo>
	);
}

const SAMPLE_MARKDOWN = [
	"## Streaming markdown",
	"",
	"Fraym renders agent replies through **streamdown** — incomplete-markdown tolerant, so there's *no* flash of broken syntax as tokens arrive.",
	"",
	"- Bullet lists with `inline code`",
	"- GitHub-flavored **tables** and [links](https://streamdown.ai)",
	"- Shiki-highlighted fenced code",
	"",
	"```ts",
	"export function rateLimit(key: string, max = 5) {",
	"  const hits = buckets.get(key) ?? [];",
	"  return { ok: hits.length < max };",
	"}",
	"```",
	"",
	"> Blockquotes, headings, and lists all map onto Fraym tokens.",
	"",
	"| Renderer       | Streaming-safe |",
	"| -------------- | -------------- |",
	"| react-markdown | no             |",
	"| streamdown     | yes            |",
	"",
].join("\n");

function StreamingMarkdownEntry() {
	const { values, panel } = useControls({
		animate: { kind: "boolean", label: "animate reveal", default: true },
		speed: { kind: "number", label: "chars / tick", default: 5, min: 1, max: 40, step: 1 },
	});
	const [streamed, setStreamed] = useState(SAMPLE_MARKDOWN);
	const [running, setRunning] = useState(false);
	const timer = useRef<ReturnType<typeof setInterval> | null>(null);

	const replay = () => {
		if (timer.current) clearInterval(timer.current);
		setRunning(true);
		setStreamed("");
		let i = 0;
		timer.current = setInterval(() => {
			i += values.speed + Math.floor(Math.random() * values.speed);
			if (i >= SAMPLE_MARKDOWN.length) {
				setStreamed(SAMPLE_MARKDOWN);
				setRunning(false);
				if (timer.current) clearInterval(timer.current);
				timer.current = null;
				return;
			}
			setStreamed(SAMPLE_MARKDOWN.slice(0, i));
		}, 40);
	};

	useEffect(() => () => clearInterval(timer.current ?? undefined), []);

	return (
		<Demo
			summary="The agent prose surface: streamdown (incomplete-markdown tolerant) + Shiki highlighting, with streamdown's native fade-in reveal. Hit Replay to watch markdown stream in token-by-token — fenced code and tables never flash broken mid-stream."
			importPath="@fraym/ui/elements/streaming-markdown"
			controls={panel}
			stage="stretch"
		>
			<div className="flex w-full max-w-2xl flex-col gap-3">
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={replay} disabled={running}>
						<Icon name="spark" size={13} />
						{running ? "Streaming…" : "Replay streaming"}
					</Button>
					<span className="font-secondary text-fr-2xs text-fr-text-3">{running ? "live" : "complete"}</span>
				</div>
				<div className="rounded-xl border border-fr-border-soft bg-fr-surface p-4">
					<StreamingMarkdown text={streamed} animate={values.animate && running} />
				</div>
			</div>
		</Demo>
	);
}

function DiagramTagEntry() {
	const { values, panel } = useControls({
		tone: {
			kind: "select",
			label: "tone",
			options: ["accent", "iris", "blue", "green", "warn", "muted"],
			default: "accent",
		},
		text: { kind: "text", label: "text", default: "commands ↓" },
	});
	return (
		<Demo
			summary="Inline monospace kicker that precedes a title inside architecture diagrams — a small tonal label like `commands ↓`, `make`, or a step number."
			importPath="@fraym/ui/elements/diagram-tag"
			controls={panel}
			stage="start"
		>
			<div className="font-secondary text-fr-base text-fr-text">
				<DiagramTag {...(values.tone ? { tone: values.tone as NonNullable<DiagramTagProps["tone"]> } : {})}>
					{values.text}
				</DiagramTag>
				Build pipeline
			</div>
		</Demo>
	);
}

const SPINNER_KINDS = ["circular", "dots", "bars", "signal", "orbit", "bounce"] as const;
const SPINNER_STATES = ["running", "idle", "success", "error"] as const;

function SpinnerEntry() {
	const { values, panel } = useControls({
		kind: { kind: "select", label: "kind", options: SPINNER_KINDS, default: "circular" },
		state: { kind: "select", label: "state", options: SPINNER_STATES, default: "running" },
		size: { kind: "select", label: "size", options: ["xs", "sm", "md", "lg"], default: "md" },
		gallery: { kind: "boolean", label: "show all kinds", default: true },
	});
	const kind = values.kind as SpinnerKind;
	const state = values.state as SpinnerState;
	const size = values.size as "xs" | "sm" | "md" | "lg";
	return (
		<Demo
			summary="The loader category: pick a `kind` (circular ring, dots matrix, equalizer bars, signal, orbiting dot) the way you'd pick a @fraym/vibr avatar or wisp preset, and a `state` (running / idle / success ✓ / error ✗). Inherits currentColor — the dots kind owns the semantic palette. Powers Button loading and the Labor illusion."
			importPath="@fraym/ui/elements/spinner"
			controls={panel}
		>
			<div className="flex flex-col items-center gap-7 text-fr-accent">
				<div className="scale-[2.4]">
					<Spinner kind={kind} state={state} size={size} label="Loading" />
				</div>
				{values.gallery && (
					<div className="grid grid-cols-6 gap-5">
						{SPINNER_KINDS.map(k => (
							<div key={k} className="flex flex-col items-center gap-2">
								<span className="flex h-6 items-center justify-center">
									<Spinner kind={k} state={state} size="md" />
								</span>
								<span className="text-fr-2xs text-fr-text-3">{k}</span>
							</div>
						))}
					</div>
				)}
			</div>
		</Demo>
	);
}

const EFFORT_STEPS: SliderStep[] = [
	{ value: "off", label: "Off" },
	{ value: "minimal", label: "Minimal" },
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
	{ value: "xhigh", label: "X-High" },
];

function SteppedSliderEntry() {
	const { values, panel } = useControls({
		ends: { kind: "boolean", label: "end labels", default: true },
		muted: { kind: "boolean", label: "muted", default: false },
		disabled: { kind: "boolean", label: "disabled", default: false },
	});
	const [value, setValue] = useState("medium");
	const current = EFFORT_STEPS.find(step => step.value === value)?.label ?? "—";
	return (
		<Demo
			summary="A discrete (stepped) slider for an ordered scale: a track, a dot per step, and a knob at the active step, with optional end captions. Click anywhere (snaps to the nearest step), drag the knob, or use arrow / Home / End keys. Token-only — the consumer owns any value readout or adjacent mode toggle."
			importPath="@fraym/ui"
			controls={panel}
		>
			<div className="w-64">
				<div className="mb-1.5 flex items-center justify-between">
					<span className="text-fr-2xs uppercase tracking-wide text-fr-text-3">Reasoning effort</span>
					<span
						className={`font-secondary text-fr-xs font-medium ${values.muted ? "text-fr-text-3" : "text-fr-accent"}`}
					>
						{values.muted ? "Auto" : current}
					</span>
				</div>
				<Slider
					steps={EFFORT_STEPS}
					value={value}
					onValueChange={setValue}
					{...(values.ends ? { startLabel: "Faster", endLabel: "Smarter" } : {})}
					muted={values.muted}
					disabled={values.disabled}
					aria-label="Reasoning effort"
				/>
			</div>
		</Demo>
	);
}

function SliderEntry() {
	const { values, panel } = useControls({
		min: { kind: "number", label: "min", default: 0, min: 0, max: 50, step: 1 },
		max: { kind: "number", label: "max", default: 100, min: 50, max: 200, step: 1 },
		step: { kind: "number", label: "step", default: 1, min: 0.01, max: 10, step: 0.01 },
		disabled: { kind: "boolean", label: "disabled", default: false },
	});
	const [value, setValue] = useState(40);
	return (
		<Demo
			summary="A continuous fill-bar slider: the whole row is the track, a token-tinted fill grows to the value, and you drag anywhere on it (no thumb to hunt for). The optional inline label + right-aligned readout give the customize-row layout; the fill eases on external/keyboard changes and tracks the pointer instantly while dragging. Keyboard: arrows step, PageUp / PageDown jump, Home / End clamp."
			importPath="@fraym/ui"
			controls={panel}
		>
			<div className="w-72">
				<Slider
					label="Intensity"
					value={value}
					onValueChange={setValue}
					min={values.min}
					max={values.max}
					step={values.step}
					disabled={values.disabled}
				/>
			</div>
		</Demo>
	);
}

const MERMAID_SAMPLES = {
	flowchart: [
		"flowchart LR",
		"  A[User] --> B{Driver}",
		"  B -->|patch| C[UI State]",
		"  B -->|tool| D[Executor]",
		"  D --> C",
	].join("\n"),
	sequence: [
		"sequenceDiagram",
		"  UI->>Driver: send(action)",
		"  Driver-->>UI: state patch",
		"  Driver->>Executor: run tool",
		"  Executor-->>Driver: result",
	].join("\n"),
	state: [
		"stateDiagram-v2",
		"  [*] --> Idle",
		"  Idle --> Running: start",
		"  Running --> Idle: done",
		"  Running --> Error: fail",
	].join("\n"),
} satisfies Record<string, string>;

function MermaidDiagramEntry() {
	const { values, panel } = useControls({
		diagram: { kind: "select", label: "diagram", options: ["flowchart", "sequence", "state"], default: "flowchart" },
	});
	return (
		<Demo
			summary="Renders a Mermaid diagram from source with a Fraym-aligned base theme (legible nodes/edges over the chat surface) and an expand-to-lightbox affordance. Dynamically imports mermaid at runtime."
			importPath="@fraym/ui/elements/mermaid-diagram"
			controls={panel}
			stage="stretch"
		>
			<div className="w-full max-w-2xl rounded-xl border border-fr-border-soft bg-fr-surface p-4">
				<MermaidDiagram code={MERMAID_SAMPLES[values.diagram as keyof typeof MERMAID_SAMPLES]} />
			</div>
		</Demo>
	);
}

const MESSAGE_ACTION_PRESETS: Record<string, readonly MessageAction[]> = {
	agent: [
		{ id: "copy", icon: "copy", label: "Copy", onClick: () => undefined },
		{ id: "copied", icon: "check", label: "Copy", activeLabel: "Copied", active: true, onClick: () => undefined },
	],
	user: [{ id: "copy", icon: "copy", label: "Copy", onClick: () => undefined }],
};

function MessageActionsEntry() {
	const { values, panel } = useControls({
		align: { kind: "select", label: "align", options: ["start", "end"], default: "start" },
		preset: { kind: "select", label: "actions", options: ["agent", "user"], default: "agent" },
		time: { kind: "boolean", label: "timestamp", default: true },
	});
	return (
		<Demo
			summary="The hover-revealed row under a chat message: a compact set of icon affordances plus a short local timestamp. The Thread feeds the action list (Copy today) and gates the hover/focus reveal; `align` flows actions→time (agent) or time→actions (user, under the right bubble)."
			importPath="@fraym/ui/elements/message-actions"
			controls={panel}
		>
			<MessageActions
				actions={MESSAGE_ACTION_PRESETS[values.preset as keyof typeof MESSAGE_ACTION_PRESETS] ?? []}
				{...(values.time ? { timestamp: new Date().toISOString() } : {})}
				align={values.align as "start" | "end"}
			/>
		</Demo>
	);
}

function MessageUsageEntry() {
	const { values, panel } = useControls({
		input: { kind: "number", label: "input", default: 1800, min: 0, max: 200000, step: 100 },
		output: { kind: "number", label: "output", default: 170, min: 0, max: 50000, step: 10 },
		cacheRead: { kind: "number", label: "cacheRead", default: 52000, min: 0, max: 500000, step: 1000 },
		cacheWrite: { kind: "number", label: "cacheWrite", default: 200, min: 0, max: 50000, step: 100 },
	});
	return (
		<Demo
			summary="The per-turn token readout shown at the end of an agent turn, mirroring the Fraym console footer: ⤵ input (incl. cache-writes) · ⤴ output · cache (read, shown only when non-zero). Always-on + dim; the Thread gates it on the `showTokenUsage` display setting. Data rides the shared journal/transcript contract."
			importPath="@fraym/ui/elements/message-usage"
			controls={panel}
		>
			<MessageUsage
				usage={{
					input: values.input,
					output: values.output,
					cacheRead: values.cacheRead,
					cacheWrite: values.cacheWrite,
				}}
			/>
		</Demo>
	);
}

const buttonDocs: EntryDocs = {
	import: 'import { Button } from "@fraym/ui";',
	anatomy: `<Button variant="default" size="default">
  Commit changes
</Button>`,
	examples: [
		{
			label: "Variants",
			code: `<div className="flex gap-2">
  <Button>Default</Button>
  <Button variant="outline">Outline</Button>
  <Button variant="ghost">Ghost</Button>
  <Button variant="destructive">Delete</Button>
  <Button variant="link">Link</Button>
</div>`,
		},
		{
			label: "Sizes",
			code: `<div className="flex items-center gap-2">
  <Button size="sm">Small</Button>
  <Button>Default</Button>
  <Button size="lg">Large</Button>
  <Button size="icon"><Icon name="plus" size={16} /></Button>
</div>`,
		},
		{
			label: "Polymorphic (asChild)",
			code: `<Button asChild>
  <a href="/settings">Settings</a>
</Button>`,
		},
		{
			label: "Disabled state",
			code: `<Button disabled>Processing...</Button>`,
		},
	],
	api: [
		{
			name: "variant",
			type: '"default" | "outline" | "ghost" | "destructive" | "link"',
			default: '"default"',
			description: "Visual style of the button.",
		},
		{
			name: "size",
			type: '"default" | "sm" | "lg" | "icon"',
			default: '"default"',
			description: "Padding and text size scale.",
		},
		{
			name: "asChild",
			type: "boolean",
			default: "false",
			description: "Merge props onto the child element instead of rendering a native <button>.",
		},
		{
			name: "className",
			type: "string",
			description: "Additional Tailwind classes, merged last.",
		},
		{
			name: "...props",
			type: "React.ComponentProps<'button'>",
			description: "All native button attributes (onClick, disabled, type, etc.).",
		},
	],
};
const iconButtonDocs: EntryDocs = {
	import: 'import { IconButton } from "@fraym/ui";',
	anatomy: `<IconButton>
  <Icon name="panel" size={16} />
</IconButton>`,
	examples: [
		{
			label: "Basic",
			code: `<IconButton>
  <Icon name="search" size={16} />
</IconButton>`,
		},
		{
			label: "Toggled",
			code: `<IconButton toggled>
  <Icon name="panel" size={16} />
</IconButton>`,
		},
		{
			label: "Polymorphic (asChild)",
			code: `<IconButton asChild>
  <a href="/settings">
    <Icon name="gear" size={16} />
  </a>
</IconButton>`,
		},
		{
			label: "Disabled",
			code: `<IconButton disabled>
  <Icon name="bell" size={16} />
</IconButton>`,
		},
	],
	api: [
		{
			name: "variant",
			type: '"chrome" | "accent" | "surface"',
			default: '"chrome"',
			description: "Visual language: chrome (toolbar, default), accent (filled action), or surface (filled muted).",
		},
		{
			name: "toggled",
			type: "boolean",
			default: "false",
			description: "Lights the button with accent-dim fill + accent-line border for active/toolbar state.",
		},
		{
			name: "asChild",
			type: "boolean",
			default: "false",
			description: "Merge props onto the child element instead of rendering a native <button>.",
		},
		{
			name: "className",
			type: "string",
			description: "Additional Tailwind classes, merged last.",
		},
		{
			name: "...props",
			type: "React.ComponentProps<'button'>",
			description: "All native button attributes (onClick, disabled, aria-label, etc.).",
		},
	],
};
const messageActionsDocs: EntryDocs = {
	import: 'import { MessageActions, type MessageAction } from "@fraym/ui";',
	anatomy: `<MessageActions
  actions={[{ id: "copy", icon: "copy", label: "Copy", onClick }]}
  timestamp={message.timestamp}
  align="start"
/>`,
	examples: [
		{
			label: "Agent row (actions → time)",
			code: `<MessageActions
  actions={[{ id: "copy", icon: "copy", label: "Copy", onClick }]}
  timestamp={iso}
  align="start"
/>`,
		},
		{
			label: "User row (time → actions)",
			code: `<MessageActions actions={[copyAction]} timestamp={iso} align="end" />`,
		},
		{
			label: "Confirmed copy state",
			code: `{ id: "copy", icon: "check", label: "Copy", activeLabel: "Copied", active: true, onClick }`,
		},
	],
	api: [
		{
			name: "actions",
			type: "readonly MessageAction[]",
			description:
				"Icon affordances rendered in order; each is { id, icon, label, onClick, activeLabel?, active?, disabled? }.",
		},
		{
			name: "timestamp",
			type: "string",
			description:
				"ISO timestamp rendered as a short local time (e.g. 2:42 PM). Omitted/unparseable → no time chip.",
		},
		{
			name: "align",
			type: '"start" | "end"',
			default: '"start"',
			description:
				"Row flow: start leads with actions (agent), end leads with the time (user, under the right bubble).",
		},
		{
			name: "className",
			type: "string",
			description:
				"Merged onto the row (data-slot='message-actions'); the Thread passes the hover/focus reveal classes.",
		},
	],
};
const messageUsageDocs: EntryDocs = {
	import: 'import { MessageUsage } from "@fraym/ui";',
	anatomy: "<MessageUsage usage={message.usage} />",
	examples: [
		{
			label: "Agent turn footer",
			code: "<MessageUsage usage={{ input: 1800, output: 170, cacheRead: 52000, cacheWrite: 200 }} />",
		},
		{
			label: "No cache reads (chip omitted)",
			code: "<MessageUsage usage={{ input: 400, output: 30, cacheRead: 0, cacheWrite: 0 }} />",
		},
	],
	api: [
		{
			name: "usage",
			type: "TurnUsage",
			required: true,
			description:
				"Summed per-turn token usage { input, output, cacheRead, cacheWrite }. Input renders folded with cacheWrite; cache (read) shows only when > 0.",
		},
		{
			name: "className",
			type: "string",
			description: "Merged onto the row (data-slot='message-usage'); the Thread passes spacing.",
		},
	],
};
const badgeDocs: EntryDocs = {
	import: 'import { Badge } from "@fraym/ui";',
	anatomy: `<Badge tone="accent" variant="solid">
  running
</Badge>`,
	examples: [
		{
			label: "Solid (filled)",
			code: `<div className="flex flex-wrap gap-2">
  <Badge tone="accent">accent</Badge>
  <Badge tone="add">add</Badge>
  <Badge tone="blue">blue</Badge>
  <Badge tone="warn">warn</Badge>
  <Badge tone="mute">mute</Badge>
  <Badge tone="del">del</Badge>
</div>`,
		},
		{
			label: "Soft (tinted)",
			code: `<div className="flex flex-wrap gap-2">
  <Badge variant="soft" tone="accent">accent</Badge>
  <Badge variant="soft" tone="add">add</Badge>
  <Badge variant="soft" tone="blue">blue</Badge>
  <Badge variant="soft" tone="warn">warn</Badge>
  <Badge variant="soft" tone="mute">mute</Badge>
  <Badge variant="soft" tone="del">del</Badge>
</div>`,
		},
		{
			label: "Outline (bordered)",
			code: `<div className="flex flex-wrap gap-2">
  <Badge variant="outline" tone="accent">accent</Badge>
  <Badge variant="outline" tone="add">add</Badge>
  <Badge variant="outline" tone="blue">blue</Badge>
  <Badge variant="outline" tone="warn">warn</Badge>
  <Badge variant="outline" tone="mute">mute</Badge>
  <Badge variant="outline" tone="del">del</Badge>
</div>`,
		},
		{
			label: "Code (mono bordered)",
			code: `<div className="flex flex-wrap gap-2">
  <Badge variant="code" tone="accent">:50-100</Badge>
  <Badge variant="code" tone="add">+12 lines</Badge>
  <Badge variant="code" tone="blue">model</Badge>
  <Badge variant="code" tone="warn">deprecated</Badge>
  <Badge variant="code" tone="mute">draft</Badge>
  <Badge variant="code" tone="del">removed</Badge>
</div>`,
		},
		{
			label: "Polymorphic (asChild)",
			code: `<Badge asChild>
  <a href="/settings">settings</a>
</Badge>`,
		},
	],
	api: [
		{
			name: "tone",
			type: '"accent" | "add" | "blue" | "warn" | "mute" | "del"',
			default: '"accent"',
			description: "Semantic color mapping onto the token palette.",
		},
		{
			name: "variant",
			type: '"solid" | "soft" | "outline" | "code"',
			default: '"solid"',
			description:
				"Solid = filled color + ink text. Soft = tinted bg + colored text. Outline = bordered + colored text. Code = bordered mono chip.",
		},
		{
			name: "asChild",
			type: "boolean",
			default: "false",
			description: "Merge props onto the child element instead of rendering a native <span>.",
		},
		{
			name: "className",
			type: "string",
			description: "Additional Tailwind classes, merged last.",
		},
		{
			name: "...props",
			type: "React.ComponentProps<'span'>",
			description: "All native span attributes.",
		},
	],
};

const inputDocs: EntryDocs = {
	import: 'import { Input, Field, Label } from "@fraym/ui";',
	anatomy: `<Field label="Email" helper="We never share it.">\n  <Input type="email" />\n</Field>`,
	examples: [
		{ label: "Default", code: `<Input placeholder="Search models…" />` },
		{ label: "Ghost", code: `<Input variant="ghost" placeholder="Transparent background" />` },
		{ label: "Underline", code: `<Input variant="underline" placeholder="Minimal style" />` },
		{ label: "Small", code: `<Input size="sm" placeholder="Compact field" />` },
		{ label: "Large", code: `<Input size="lg" placeholder="Prominent field" />` },
		{ label: "Valid state", code: `<Input data-state="valid" value="ok" readOnly />` },
		{ label: "Warning state", code: `<Input data-state="warning" value="maybe" readOnly />` },
		{ label: "Invalid state", code: `<Input data-state="invalid" value="bad" readOnly />` },
		{ label: "Number (no spinners)", code: `<Input type="number" placeholder="0" />` },
		{
			label: "Field composition",
			code: `<Field label="API key" error="Required" helper="Never leaves your machine">\n  <Input type="password" />\n</Field>`,
		},
		{ label: "Disabled", code: `<Input disabled placeholder="Unavailable" />` },
	],
	api: [
		{
			name: "variant",
			type: '"default" | "ghost" | "underline"',
			default: '"default"',
			description: "Visual style variant.",
		},
		{ name: "size", type: '"sm" | "default" | "lg"', default: '"default"', description: "Input size." },
		{
			name: "data-state",
			type: '"valid" | "warning" | "invalid"',
			description: "Validation state applied as a border color.",
		},
		{ name: "className", type: "string", description: "Additional classes merged via cn()." },
		{ name: "disabled", type: "boolean", description: "Disables interaction and lowers opacity." },
		{ name: "placeholder", type: "string", description: "Placeholder text shown when empty." },
		{
			name: "...",
			type: "Omit<React.ComponentProps<'input'>, 'size'>",
			description: "Forwards all native input attributes except size (reserved for the visual size prop).",
		},
	],
};

const selectDocs: EntryDocs = {
	import: 'import { Select, Field } from "@fraym/ui";',
	anatomy: `<Select value={value} onChange={e => set(e.target.value)} options={[\n  { value: "a", label: "Option A" },\n]} />`,
	examples: [
		{
			label: "From data",
			code: `<Select\n  value={model}\n  onChange={e => setModel(e.target.value)}\n  options={[{ value: "atlas", label: "atlas" }, { value: "gpt", label: "GPT-5" }]}\n/>`,
		},
		{
			label: "From children",
			code: `<Select defaultValue="b">\n  <option value="a">Option A</option>\n  <option value="b">Option B</option>\n</Select>`,
		},
		{ label: "Ghost", code: `<Select variant="ghost" options={opts} />` },
		{ label: "Small", code: `<Select size="sm" options={opts} />` },
		{ label: "Disabled option", code: `<Select options={[{ value: "x", label: "Soon", disabled: true }]} />` },
		{
			label: "Field composition",
			code: `<Field label="Model">\n  <Select options={opts} />\n</Field>`,
		},
		{ label: "Disabled", code: `<Select disabled options={opts} />` },
	],
	api: [
		{
			name: "options",
			type: "readonly { value: string; label: string; disabled?: boolean }[]",
			description: "Convenience data source; renders <option> children. Falls back to children.",
		},
		{ name: "variant", type: '"default" | "ghost"', default: '"default"', description: "Visual style variant." },
		{ name: "size", type: '"sm" | "default" | "lg"', default: '"default"', description: "Control size." },
		{ name: "className", type: "string", description: "Additional classes merged via cn()." },
		{ name: "disabled", type: "boolean", description: "Disables interaction and lowers opacity." },
		{
			name: "...",
			type: "Omit<React.ComponentProps<'select'>, 'size'>",
			description: "Forwards all native select attributes except size (reserved for the visual size prop).",
		},
	],
};

const textareaDocs: EntryDocs = {
	import: 'import { Textarea, Field } from "@fraym/ui";',
	anatomy: `<Field label="System prompt" helper="Shown before each turn">\n  <Textarea rows={4} />\n</Field>`,
	examples: [
		{ label: "Default", code: `<Textarea placeholder="Type here…" rows={3} />` },
		{ label: "Ghost", code: `<Textarea variant="ghost" placeholder="Transparent background" rows={3} />` },
		{ label: "Resize vertical", code: `<Textarea resize="vertical" placeholder="Drag to resize" rows={3} />` },
		{ label: "Valid state", code: `<Textarea data-state="valid" value="Looks good" readOnly rows={2} />` },
		{ label: "Warning state", code: `<Textarea data-state="warning" value="Maybe review" readOnly rows={2} />` },
		{ label: "Invalid state", code: `<Textarea data-state="invalid" value="Error here" readOnly rows={2} />` },
		{ label: "Disabled", code: `<Textarea disabled placeholder="Unavailable" rows={3} />` },
	],
	api: [
		{ name: "variant", type: '"default" | "ghost"', default: '"default"', description: "Visual style variant." },
		{ name: "resize", type: '"none" | "vertical" | "both"', default: '"none"', description: "Resize behavior." },
		{
			name: "data-state",
			type: '"valid" | "warning" | "invalid"',
			description: "Validation state applied as a border color.",
		},
		{ name: "className", type: "string", description: "Additional classes merged via cn()." },
		{ name: "disabled", type: "boolean", description: "Disables interaction and lowers opacity." },
		{ name: "placeholder", type: "string", description: "Placeholder text shown when empty." },
		{
			name: "...",
			type: "React.ComponentProps<'textarea'>",
			description: "Forwards all native textarea attributes (rows, cols, autoFocus, etc.).",
		},
	],
};

const fieldDocs: EntryDocs = {
	import: 'import { Field, Input } from "@fraym/ui";',
	anatomy: `<Field label="Email" helper="We never share it." required>
  <Input type="email" />
</Field>`,
	examples: [
		{
			label: "Helper text",
			code: `<Field label="Display name" helper="Shown on your public profile.">
  <Input placeholder="Ada Lovelace" />
</Field>`,
		},
		{
			label: "Error state",
			code: `<Field label="Email" error="That email is already taken.">
  <Input type="email" defaultValue="taken@example.com" />
</Field>`,
		},
		{
			label: "Warning state",
			code: `<Field label="Budget" warning="Approaching your monthly cap.">
  <Input type="number" defaultValue={950} />
</Field>`,
		},
		{
			label: "Required",
			code: `<Field label="API key" required helper="Never leaves your machine.">
  <Input type="password" />
</Field>`,
		},
	],
	api: [
		{
			name: "label",
			type: "string",
			description: "Label text rendered above the control via <Label>, wired with htmlFor.",
		},
		{
			name: "helper",
			type: "string",
			description: "Neutral helper text. Shown only when no error or warning is set.",
		},
		{
			name: "error",
			type: "string",
			description:
				'Error text (del tone). Takes precedence over warning/helper; sets data-state="invalid" and aria-invalid on the control.',
		},
		{
			name: "warning",
			type: "string",
			description: 'Warning text (warn tone). Shown when no error; sets data-state="warning" on the control.',
		},
		{
			name: "required",
			type: "boolean",
			default: "false",
			description: "Renders a del-tone asterisk after the label.",
		},
		{
			name: "children",
			type: "ReactElement",
			required: true,
			description:
				"The form control (Input, Textarea, etc.). Cloned to inject id, aria-describedby, aria-invalid, and data-state.",
		},
		{
			name: "className",
			type: "string",
			description: "Additional classes merged onto the field's flex-column root.",
		},
	],
};

const labelDocs: EntryDocs = {
	import: 'import { Label } from "@fraym/ui";',
	anatomy: `<Label htmlFor="email">Email address</Label>`,
	examples: [
		{
			label: "Associated with a control",
			code: `<Label htmlFor="email">Email address</Label>
<Input id="email" type="email" />`,
		},
		{
			label: "Wrapping a control",
			code: `<Label className="flex items-center gap-2">
  <Checkbox />
  Remember me
</Label>`,
		},
	],
	api: [
		{
			name: "htmlFor",
			type: "string",
			description: "Associates the label with a control by its id (native <label for>).",
		},
		{ name: "children", type: "React.ReactNode", description: "Label content." },
		{
			name: "className",
			type: "string",
			description: "Additional classes merged via cn(); base is text-fr-sm font-medium text-fr-text.",
		},
		{
			name: "...props",
			type: "React.ComponentProps<'label'>",
			description: "Forwards all native label attributes.",
		},
	],
};
const cardDocs: EntryDocs = {
	import: 'import { Card, CardHeader, CardContent, CardFooter } from "@fraym/ui";',
	anatomy: `<Card>
  <CardHeader>Working tree</CardHeader>
  <CardContent>
    <p>2 files changed</p>
  </CardContent>
  <CardFooter>
    <Button size="sm">Commit</Button>
  </CardFooter>
</Card>`,
	examples: [
		{
			label: "Panel card",
			code: `<Card className="max-w-sm">
  <CardHeader>Session</CardHeader>
  <CardContent>
    <p className="text-fr-sm text-fr-text-2">Agent thread summary</p>
  </CardContent>
</Card>`,
		},
		{
			label: "Header / content / footer",
			code: `<Card className="max-w-sm">
  <CardHeader>Working tree · 2 files</CardHeader>
  <CardContent>
    <p className="font-secondary text-fr-xs text-fr-text-2">src/middleware/auth.ts</p>
  </CardContent>
  <CardFooter>
    <Button size="sm">Commit</Button>
  </CardFooter>
</Card>`,
		},
		{
			label: "Content-only group",
			code: `<Card>
  <CardContent>
    <div className="flex items-center justify-between gap-3">
      <span className="text-fr-sm text-fr-text">Build status</span>
      <Badge tone="add">passing</Badge>
    </div>
  </CardContent>
</Card>`,
		},
		{
			label: "Custom width",
			code: `<Card className="w-full max-w-lg">
  <CardHeader>Dock panel</CardHeader>
  <CardContent>
    <p className="text-fr-sm text-fr-text-2">Cards use a fixed rounded-[9px] shell.</p>
  </CardContent>
</Card>`,
		},
	],
	api: [
		{
			name: "className",
			type: "string",
			description: "Additional classes merged via cn() on Card, CardHeader, CardContent, or CardFooter.",
		},
		{
			name: "children",
			type: "React.ReactNode",
			description: "Slot content. CardHeader uses fr-eyebrow styling; Card uses rounded-[9px] geometry.",
		},
		{
			name: "...props",
			type: "React.ComponentProps<'div'>",
			description: "Each exported Card slot forwards native div attributes and React 19 refs to its root div.",
		},
	],
};

const tabsDocs: EntryDocs = {
	import: 'import { Tabs, TabsList, TabsTrigger, TabsContent } from "@fraym/ui";',
	anatomy: `<Tabs variant="segmented" defaultValue="chat">
  <TabsList>
    <TabsTrigger value="chat">Chat</TabsTrigger>
    <TabsTrigger value="code">Code</TabsTrigger>
  </TabsList>
  <TabsContent value="chat">Chat panel</TabsContent>
  <TabsContent value="code">Code panel</TabsContent>
</Tabs>`,
	examples: [
		{
			label: "Segmented tabs",
			code: `<Tabs variant="segmented" defaultValue="chat" className="max-w-md">
  <TabsList className="w-full">
    <TabsTrigger value="chat">Chat</TabsTrigger>
    <TabsTrigger value="design">Design</TabsTrigger>
    <TabsTrigger value="code">Code</TabsTrigger>
  </TabsList>
  <TabsContent value="chat">Agent thread</TabsContent>
  <TabsContent value="design">Canvas</TabsContent>
  <TabsContent value="code">Source view</TabsContent>
</Tabs>`,
		},
		{
			label: "Dock tabs",
			code: `<Tabs variant="dock" defaultValue="preview">
  <TabsList>
    <TabsTrigger value="preview">Preview</TabsTrigger>
    <TabsTrigger value="logs">Logs</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="preview">Preview panel</TabsContent>
  <TabsContent value="logs">Logs panel</TabsContent>
  <TabsContent value="settings">Settings panel</TabsContent>
</Tabs>`,
		},
		{
			label: "Controlled value",
			code: `<Tabs value={tab} onValueChange={setTab} variant="segmented">
  <TabsList className="w-full">
    <TabsTrigger value="local">Local</TabsTrigger>
    <TabsTrigger value="remote">Remote</TabsTrigger>
  </TabsList>
  <TabsContent value="local">Local session</TabsContent>
  <TabsContent value="remote">Remote session</TabsContent>
</Tabs>`,
		},
		{
			label: "Disabled trigger",
			code: `<Tabs defaultValue="ready" variant="dock">
  <TabsList>
    <TabsTrigger value="ready">Ready</TabsTrigger>
    <TabsTrigger value="queued" disabled>Queued</TabsTrigger>
  </TabsList>
  <TabsContent value="ready">Ready now</TabsContent>
  <TabsContent value="queued">Queued later</TabsContent>
</Tabs>`,
		},
	],
	api: [
		{
			name: "variant",
			type: '"segmented" | "dock"',
			default: '"segmented"',
			description: "Visual style set once on Tabs and inherited by TabsList and TabsTrigger through context.",
		},
		{
			name: "value",
			type: "string",
			description: "Controlled active tab value on Tabs.",
		},
		{
			name: "defaultValue",
			type: "string",
			description: "Initial active tab value for uncontrolled Tabs.",
		},
		{
			name: "onValueChange",
			type: "(value: string) => void",
			description: "Called when the active tab changes.",
		},
		{
			name: "orientation",
			type: '"horizontal" | "vertical"',
			default: '"horizontal"',
			description: "Radix Tabs orientation forwarded to Tabs.Root.",
		},
		{
			name: "activationMode",
			type: '"automatic" | "manual"',
			default: '"automatic"',
			description: "Whether focusing a trigger activates it automatically or requires manual activation.",
		},
		{
			name: "loop",
			type: "boolean",
			default: "true",
			description: "TabsList keyboard navigation wraps at the ends.",
		},
		{
			name: "value (TabsTrigger)",
			type: "string",
			required: true,
			description: "Tab value activated by this trigger.",
		},
		{
			name: "value (TabsContent)",
			type: "string",
			required: true,
			description: "Tab value that shows this content panel.",
		},
		{
			name: "disabled",
			type: "boolean",
			default: "false",
			description: "Disables a TabsTrigger.",
		},
		{
			name: "className",
			type: "string",
			description: "Additional classes merged via cn() on Tabs, TabsList, TabsTrigger, or TabsContent.",
		},
		{
			name: "...props",
			type: "React.ComponentProps<typeof RadixTabs.Root/List/Trigger/Content>",
			description: "Each Tabs part forwards the matching Radix Tabs primitive props and React 19 refs.",
		},
	],
};

const scrollAreaDocs: EntryDocs = {
	import: 'import { ScrollArea } from "@fraym/ui";',
	anatomy: `<ScrollArea className="h-40 rounded-lg border border-fr-border-soft">
  <div className="p-3">Scrollable content</div>
</ScrollArea>`,
	examples: [
		{
			label: "Bounded list",
			code: `<ScrollArea className="h-40 max-w-sm rounded-lg border border-fr-border-soft">
  <div className="flex flex-col gap-2 p-3">
    {items.map(item => (
      <div key={item.id} className="rounded-md bg-fr-surface px-3 py-2 text-fr-sm text-fr-text-2">
        {item.label}
      </div>
    ))}
  </div>
</ScrollArea>`,
		},
		{
			label: "Always visible scrollbar",
			code: `<ScrollArea type="always" className="h-32 rounded-lg border border-fr-border-soft">
  <div className="space-y-2 p-3">
    <p>Long content</p>
    <p>More content</p>
    <p>Even more content</p>
  </div>
</ScrollArea>`,
		},
		{
			label: "Hover scrollbar",
			code: `<ScrollArea type="hover" scrollHideDelay={300} className="h-36 rounded-lg border border-fr-border-soft">
  <div className="p-3 text-fr-sm text-fr-text-2">Hover to reveal the styled Radix scrollbar.</div>
</ScrollArea>`,
		},
		{
			label: "Horizontal content",
			code: `<ScrollArea className="w-72 rounded-lg border border-fr-border-soft">
  <div className="flex w-max gap-2 p-3">
    {columns.map(column => (
      <Card key={column.id} className="w-40">
        <CardContent>{column.title}</CardContent>
      </Card>
    ))}
  </div>
</ScrollArea>`,
		},
	],
	api: [
		{
			name: "type",
			type: '"auto" | "always" | "scroll" | "hover"',
			default: '"hover"',
			description: "Radix scrollbar visibility behavior.",
		},
		{
			name: "scrollHideDelay",
			type: "number",
			default: "600",
			description: "Milliseconds before hover scrollbars hide after interaction.",
		},
		{
			name: "dir",
			type: '"ltr" | "rtl"',
			description: "Text direction forwarded to Radix ScrollArea.Root.",
		},
		{
			name: "className",
			type: "string",
			description: "Additional classes merged onto the ScrollArea root via cn().",
		},
		{
			name: "children",
			type: "React.ReactNode",
			description: "Content rendered inside the full-size Radix viewport.",
		},
		{
			name: "...props",
			type: "React.ComponentProps<typeof RadixScrollArea.Root>",
			description: "Forwards Radix ScrollArea.Root props, native div attributes, and React 19 refs.",
		},
	],
};

const separatorDocs: EntryDocs = {
	import: 'import { Separator } from "@fraym/ui";',
	anatomy: `<Separator orientation="horizontal" />`,
	examples: [
		{
			label: "Horizontal",
			code: `<div className="w-64">
  <Separator />
</div>`,
		},
		{
			label: "Vertical",
			code: `<div className="flex h-6 items-center gap-3">
  <span className="text-fr-xs text-fr-text-2">A</span>
  <Separator orientation="vertical" />
  <span className="text-fr-xs text-fr-text-2">B</span>
</div>`,
		},
		{
			label: "Card sections",
			code: `<Card className="max-w-sm">
  <CardContent>Summary</CardContent>
  <Separator />
  <CardContent>Details</CardContent>
</Card>`,
		},
		{
			label: "Toolbar divider",
			code: `<div className="flex h-8 items-center gap-2">
  <IconButton aria-label="Search"><Icon name="search" size={16} /></IconButton>
  <Separator orientation="vertical" />
  <IconButton aria-label="Settings"><Icon name="gear" size={16} /></IconButton>
</div>`,
		},
	],
	api: [
		{
			name: "orientation",
			type: '"horizontal" | "vertical"',
			default: '"horizontal"',
			description: "Divider direction. Horizontal renders h-px w-full; vertical renders h-full w-px.",
		},
		{
			name: "className",
			type: "string",
			description: "Additional classes merged onto the separator root via cn().",
		},
		{
			name: "...props",
			type: "React.ComponentProps<'div'>",
			description: "Forwards native div attributes and React 19 refs. role is set to separator by default.",
		},
	],
};

const tooltipDocs: EntryDocs = {
	import: 'import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@fraym/ui";',
	anatomy: `<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline">Hover me</Button>
    </TooltipTrigger>
    <TooltipContent>
      Tooltips use Radix + Fraym tokens
    </TooltipContent>
  </Tooltip>
</TooltipProvider>`,
	examples: [
		{
			label: "Basic",
			code: `<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline">Hover me</Button>
    </TooltipTrigger>
    <TooltipContent>Tooltips use Radix + Fraym tokens</TooltipContent>
  </Tooltip>
</TooltipProvider>`,
		},
		{
			label: "Controlled",
			code: `<TooltipProvider delayDuration={150}>
  <Tooltip open={open} onOpenChange={setOpen}>
    <TooltipTrigger asChild>
      <Button variant="ghost">Details</Button>
    </TooltipTrigger>
    <TooltipContent side="right">Pinned from controlled state</TooltipContent>
  </Tooltip>
</TooltipProvider>`,
		},
		{
			label: "Positioning",
			code: `<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline">Top aligned</Button>
    </TooltipTrigger>
    <TooltipContent side="top" align="start" sideOffset={8}>
      Uses Radix side / align props with Fraym motion classes
    </TooltipContent>
  </Tooltip>
</TooltipProvider>`,
		},
		{
			label: "App root provider",
			code: `<TooltipProvider delayDuration={300} skipDelayDuration={100}>
  <App />
</TooltipProvider>`,
		},
	],
	api: [
		{
			name: "TooltipProvider.children",
			type: "React.ReactNode",
			description: "Application subtree that can use Tooltip instances. Mount once near the app root.",
		},
		{
			name: "TooltipProvider.delayDuration",
			type: "number",
			default: "700",
			description: "Milliseconds before a tooltip opens after pointer hover.",
		},
		{
			name: "TooltipProvider.skipDelayDuration",
			type: "number",
			default: "300",
			description: "Time window where moving between triggers skips the normal open delay.",
		},
		{
			name: "TooltipProvider.disableHoverableContent",
			type: "boolean",
			description: "When true, content closes when the pointer leaves the trigger instead of remaining hoverable.",
		},
		{
			name: "Tooltip.children",
			type: "React.ReactNode",
			description: "A TooltipTrigger and TooltipContent pair.",
		},
		{
			name: "Tooltip.open",
			type: "boolean",
			description: "Controlled open state.",
		},
		{
			name: "Tooltip.defaultOpen",
			type: "boolean",
			description: "Initial uncontrolled open state.",
		},
		{
			name: "Tooltip.onOpenChange",
			type: "(open: boolean) => void",
			description: "Called when Radix requests an open-state change.",
		},
		{
			name: "Tooltip.delayDuration",
			type: "number",
			description: "Per-tooltip override for the provider hover delay.",
		},
		{
			name: "Tooltip.disableHoverableContent",
			type: "boolean",
			description: "Per-tooltip override for hoverable content behavior.",
		},
		{
			name: "TooltipTrigger.asChild",
			type: "boolean",
			default: "false",
			description:
				"Merge trigger behavior and data-slot onto the child element instead of rendering the default trigger node.",
		},
		{
			name: "TooltipTrigger.children",
			type: "React.ReactNode",
			description: "Interactive element that opens the tooltip on hover/focus.",
		},
		{
			name: "TooltipTrigger...props",
			type: "React.ComponentProps<typeof RadixTooltip.Trigger>",
			description: "All Radix trigger props and native trigger attributes.",
		},
		{
			name: "TooltipContent.children",
			type: "React.ReactNode",
			description: "Tooltip body text or lightweight inline content.",
		},
		{
			name: "TooltipContent.sideOffset",
			type: "number",
			default: "4",
			description: "Distance in pixels between trigger and content.",
		},
		{
			name: "TooltipContent.side",
			type: '"top" | "right" | "bottom" | "left"',
			description: "Preferred side. Side also drives the slide-in animation class.",
		},
		{
			name: "TooltipContent.align",
			type: '"start" | "center" | "end"',
			description: "Preferred alignment on the chosen side.",
		},
		{
			name: "TooltipContent.className",
			type: "string",
			description:
				"Additional classes merged after the tokenized surface, border, text, shadow, and animation classes.",
		},
		{
			name: "TooltipContent...props",
			type: "React.ComponentProps<typeof RadixTooltip.Content>",
			description: "All Radix content positioning, collision, portal lifecycle, and DOM props.",
		},
	],
};

const shimmerDocs: EntryDocs = {
	import: 'import { Shimmer } from "@fraym/ui";',
	anatomy: `<Shimmer active>
  Searching the codebase…
</Shimmer>`,
	examples: [
		{
			label: "Active status",
			code: `<Shimmer>Searching the codebase…</Shimmer>`,
		},
		{
			label: "Paused / inactive",
			code: `<Shimmer active={false}>Waiting for input</Shimmer>`,
		},
		{
			label: "Inline with status copy",
			code: `<div className="flex items-center gap-2 text-fr-base">
  <span className="text-fr-text-2">Agent</span>
  <Shimmer>Thinking…</Shimmer>
</div>`,
		},
		{
			label: "Custom text scale",
			code: `<Shimmer className="text-lg tracking-fr-tight">
  Preparing patch
</Shimmer>`,
		},
	],
	api: [
		{
			name: "active",
			type: "boolean",
			default: "true",
			description: "Enables the animated token-gradient sweep. When false, renders flat muted text.",
		},
		{
			name: "children",
			type: "React.ReactNode",
			description: "Status label rendered inside the span.",
		},
		{
			name: "className",
			type: "string",
			description: "Additional classes merged after the base text and active/inactive styling.",
		},
		{
			name: "...props",
			type: "React.ComponentProps<'span'>",
			description: "All native span attributes.",
		},
	],
};

const skeletonDocs: EntryDocs = {
	import: 'import { Skeleton, SkeletonText, SkeletonGroup } from "@fraym/ui";',
	anatomy: `<SkeletonGroup label="Opening session…" className="flex gap-3">
  <Skeleton circle w={40} h={40} />
  <div className="min-w-0 flex-1">
    <Skeleton w={140} h={14} />
    <SkeletonText lines={3} lineHeight={10} gap={8} lastWidth="60%" />
  </div>
</SkeletonGroup>`,
	examples: [
		{
			label: "Block placeholders",
			code: `<div className="flex items-center gap-4">
  <Skeleton circle w={40} h={40} />
  <Skeleton w={140} h={14} />
  <Skeleton w={72} h={14} rounded="full" />
</div>`,
		},
		{
			label: "Text loading",
			code: `<SkeletonText lines={4} lineHeight={11} gap={8} lastWidth="46%" />`,
		},
		{
			label: "Accessible group",
			code: `<SkeletonGroup label="Opening session…" className="flex gap-3">
  <Skeleton circle w={28} h={28} className="shrink-0" />
  <div className="min-w-0 flex-1">
    <Skeleton w={110} h={11} rounded="sm" className="mb-2.5" />
    <SkeletonText lines={3} lineHeight={10} gap={7} lastWidth="46%" />
  </div>
</SkeletonGroup>`,
		},
		{
			label: "Custom measurements",
			code: `<div className="grid gap-3">
  <Skeleton w="100%" h={96} rounded="lg" />
  <Skeleton w="35%" h={10} rounded="sm" />
</div>`,
		},
	],
	api: [
		{
			name: "Skeleton.w",
			type: "number | string",
			description: "Width of the placeholder. Numbers are converted to px; strings are used as CSS lengths.",
		},
		{
			name: "Skeleton.h",
			type: "number | string",
			description: "Height of the placeholder. Numbers are converted to px; strings are used as CSS lengths.",
		},
		{
			name: "Skeleton.rounded",
			type: '"sm" | "md" | "lg" | "full"',
			default: '"md"',
			description: "Corner radius tier. Ignored when circle is true.",
		},
		{
			name: "Skeleton.circle",
			type: "boolean",
			default: "false",
			description: "Renders a fully rounded placeholder for avatars and icons.",
		},
		{
			name: "Skeleton.className",
			type: "string",
			description: "Additional classes merged after the token-gradient sweep and radius class.",
		},
		{
			name: "Skeleton.style",
			type: "React.CSSProperties",
			description: "Inline style merged after generated width and height values.",
		},
		{
			name: "Skeleton...props",
			type: "React.ComponentProps<'div'>",
			description:
				"All native div attributes. The block renders aria-hidden because SkeletonGroup announces loading state.",
		},
		{
			name: "SkeletonText.lines",
			type: "number",
			default: "3",
			description: "Number of text placeholder lines. Values below 1 are clamped to one rendered line.",
		},
		{
			name: "SkeletonText.lineHeight",
			type: "number | string",
			default: "10",
			description: "Height of each text line. Numbers are converted to px; strings are used as CSS lengths.",
		},
		{
			name: "SkeletonText.gap",
			type: "number | string",
			default: "8",
			description: "Vertical gap between lines. Numbers are converted to px; strings are used as CSS lengths.",
		},
		{
			name: "SkeletonText.lastWidth",
			type: "number | string",
			default: '"60%"',
			description: "Width of the final line when rendering multiple lines, creating a ragged text edge.",
		},
		{
			name: "SkeletonText.className",
			type: "string",
			description: "Additional classes merged onto the flex column wrapper.",
		},
		{
			name: "SkeletonText.style",
			type: "React.CSSProperties",
			description: "Inline style merged after the generated gap value.",
		},
		{
			name: "SkeletonText...props",
			type: "Omit<React.ComponentProps<'div'>, 'children'>",
			description: "All native div attributes except children; SkeletonText generates its own line placeholders.",
		},
		{
			name: "SkeletonGroup.label",
			type: "string",
			default: '"Loading…"',
			description: "Screen-reader label announced from the role=status wrapper while aria-busy is true.",
		},
		{
			name: "SkeletonGroup.children",
			type: "React.ReactNode",
			description: "Skeleton and layout nodes that make up the loading preview.",
		},
		{
			name: "SkeletonGroup.className",
			type: "string",
			description: "Classes applied to the status wrapper for layout.",
		},
		{
			name: "SkeletonGroup...props",
			type: "React.ComponentProps<'div'>",
			description: "All native div attributes. The wrapper sets role=status and aria-busy=true.",
		},
	],
};

const codeDocs: EntryDocs = {
	import: 'import { Code } from "@fraym/ui";',
	anatomy: `<p>
  Call <Code>createAgentSession()</Code> before streaming events.
</p>`,
	examples: [
		{
			label: "Inline API",
			code: `<p className="text-fr-md text-fr-text-2">
  Call <Code>createAgentSession()</Code>, then map <Code>AgentEvent</Code> to the driver.
</p>`,
		},
		{
			label: "Command prose",
			code: `<p className="text-fr-md text-fr-text-2">
  Run <Code>bun dev</Code> from the workspace root.
</p>`,
		},
		{
			label: "With native attributes",
			code: `<Code title="TypeScript symbol">SessionState</Code>`,
		},
	],
	api: [
		{
			name: "children",
			type: "React.ReactNode",
			description: "Inline code content rendered inside the native code element.",
		},
		{
			name: "className",
			type: "string",
			description: "Additional classes merged via cn(); use sparingly to preserve inline-code token styling.",
		},
		{
			name: "...",
			type: "React.ComponentProps<'code'>",
			description: "Forwards all native code attributes, including title, aria-* and data-* attributes.",
		},
	],
};

const kbdDocs: EntryDocs = {
	import: 'import { Kbd } from "@fraym/ui";',
	anatomy: `<div className="flex gap-1.5">
  <Kbd>⌘K</Kbd>
  <Kbd>⇧⌘P</Kbd>
</div>`,
	examples: [
		{
			label: "Shortcut",
			code: `<div className="flex gap-1.5">
  <Kbd>⌘K</Kbd>
  <Kbd>⇧⌘P</Kbd>
</div>`,
		},
		{
			label: "Chord",
			code: `<div className="flex items-center gap-1 text-fr-text-2">
  <Kbd>Ctrl</Kbd>
  <span>+</span>
  <Kbd>Enter</Kbd>
</div>`,
		},
		{
			label: "Adapts to context",
			code: `<Button>
  Open palette <Kbd className="ml-2">⌘K</Kbd>
</Button>`,
		},
	],
	api: [
		{
			name: "children",
			type: "React.ReactNode",
			description: "Key label or shortcut text rendered inside the native kbd element.",
		},
		{
			name: "className",
			type: "string",
			description:
				"Additional classes merged via cn(); border and text use currentColor so the keycap inherits surrounding color.",
		},
		{
			name: "...",
			type: "React.ComponentProps<'kbd'>",
			description: "Forwards all native kbd attributes, including title, aria-* and data-* attributes.",
		},
	],
};

const toggleDocs: EntryDocs = {
	import: 'import { Toggle } from "@fraym/ui";',
	anatomy: `<Toggle checked={enabled} onCheckedChange={setEnabled} />`,
	examples: [
		{
			label: "Controlled state",
			code: `<Toggle checked={enabled} onCheckedChange={setEnabled} />`,
		},
		{
			label: "Settings row",
			code: `<div className="flex w-64 items-center justify-between gap-3">
  <span className="font-secondary text-fr-sm text-fr-text-2">Auto-apply patches</span>
  <Toggle checked={autoApply} onCheckedChange={setAutoApply} aria-label="Auto-apply patches" />
</div>`,
		},
		{
			label: "Disabled",
			code: `<Toggle checked={false} disabled aria-label="Unavailable setting" />`,
		},
	],
	api: [
		{
			name: "checked",
			type: "boolean",
			default: "false",
			description:
				"Controlled on/off state. Sets role=switch, aria-checked, data-state, track color, and thumb position.",
		},
		{
			name: "onCheckedChange",
			type: "(checked: boolean) => void",
			description: "Fired with the next checked value when the toggle is pressed.",
		},
		{
			name: "className",
			type: "string",
			description: "Additional classes merged onto the fixed 22×38px switch button.",
		},
		{
			name: "disabled",
			type: "boolean",
			description: "Native button disabled state.",
		},
		{
			name: "...props",
			type: "Omit<React.ComponentProps<'button'>, 'children'>",
			description: "All native button attributes except children. The component always renders its internal thumb.",
		},
	],
};

const switchDocs: EntryDocs = {
	import: 'import { Switch } from "@fraym/ui";',
	anatomy: `<Switch checked={enabled} onCheckedChange={setEnabled} />`,
	examples: [
		{
			label: "Controlled",
			code: `<Switch checked={enabled} onCheckedChange={setEnabled} />`,
		},
		{
			label: "Uncontrolled default",
			code: `<Switch defaultChecked aria-label="Enable telemetry" />`,
		},
		{
			label: "Settings row",
			code: `<label className="flex items-center gap-3">
  <Switch checked={enabled} onCheckedChange={setEnabled} />
  <span className="font-secondary text-fr-sm text-fr-text-2">Enable telemetry</span>
</label>`,
		},
	],
	api: [
		{
			name: "checked",
			type: "boolean",
			description: "Controlled checked state from Radix Switch Root.",
		},
		{
			name: "defaultChecked",
			type: "boolean",
			description: "Initial uncontrolled checked state.",
		},
		{
			name: "onCheckedChange",
			type: "(checked: boolean) => void",
			description: "Called when the checked state changes.",
		},
		{
			name: "disabled",
			type: "boolean",
			description: "Disables interaction and lowers opacity.",
		},
		{
			name: "required",
			type: "boolean",
			description: "Marks the underlying form control as required.",
		},
		{
			name: "name",
			type: "string",
			description: "Form field name forwarded to Radix Switch Root.",
		},
		{
			name: "value",
			type: "string",
			description: "Form value submitted when checked.",
		},
		{
			name: "className",
			type: "string",
			description: "Additional classes merged onto the 22×38px switch track.",
		},
		{
			name: "...props",
			type: "React.ComponentProps<typeof RadixSwitch.Root>",
			description: "All Radix Switch Root props and native button attributes.",
		},
	],
};

const checkboxDocs: EntryDocs = {
	import: 'import { Checkbox } from "@fraym/ui";',
	anatomy: `<Checkbox checked={checked} onCheckedChange={value => setChecked(value === true)} />`,
	examples: [
		{
			label: "Controlled",
			code: `<Checkbox checked={checked} onCheckedChange={value => setChecked(value === true)} />`,
		},
		{
			label: "With label",
			code: `<label className="flex items-center gap-3">
  <Checkbox checked={checked} onCheckedChange={value => setChecked(value === true)} />
  <span className="font-secondary text-fr-sm text-fr-text-2">Enable feature</span>
</label>`,
		},
		{
			label: "Decorative read-only",
			code: `<Checkbox checked decorative aria-label="Completed" />`,
		},
	],
	api: [
		{
			name: "decorative",
			type: "boolean",
			default: "false",
			description: "Renders as a read-only visual indicator: removes pointer events and forces tabIndex to -1.",
		},
		{
			name: "checked",
			type: "boolean | 'indeterminate'",
			description: "Controlled checked state from Radix Checkbox Root.",
		},
		{
			name: "defaultChecked",
			type: "boolean | 'indeterminate'",
			description: "Initial uncontrolled checked state.",
		},
		{
			name: "onCheckedChange",
			type: "(checked: boolean | 'indeterminate') => void",
			description: "Called when the checked state changes.",
		},
		{
			name: "disabled",
			type: "boolean",
			description: "Disables interaction and lowers opacity.",
		},
		{
			name: "required",
			type: "boolean",
			description: "Marks the underlying form control as required.",
		},
		{
			name: "name",
			type: "string",
			description: "Form field name forwarded to Radix Checkbox Root.",
		},
		{
			name: "value",
			type: "string",
			description: "Form value submitted when checked.",
		},
		{
			name: "tabIndex",
			type: "number",
			description: "Tab order for the root. Ignored when decorative is true.",
		},
		{
			name: "className",
			type: "string",
			description: "Additional classes merged onto the checkbox root.",
		},
		{
			name: "...props",
			type: "React.ComponentProps<typeof RadixCheckbox.Root>",
			description: "All Radix Checkbox Root props and native button attributes.",
		},
	],
};

const radioDocs: EntryDocs = {
	import: 'import { Radio } from "@fraym/ui";',
	anatomy: `<Radio checked={selected} onCheckedChange={setSelected} />`,
	examples: [
		{
			label: "Controlled",
			code: `<Radio checked={selected} onCheckedChange={setSelected} />`,
		},
		{
			label: "With label",
			code: `<label className="flex items-center gap-3">
  <Radio checked={selected} onCheckedChange={setSelected} />
  <span className="font-secondary text-fr-sm text-fr-text-2">Select option</span>
</label>`,
		},
		{
			label: "Decorative read-only",
			code: `<Radio checked decorative aria-label="Selected option" />`,
		},
	],
	api: [
		{
			name: "checked",
			type: "boolean",
			default: "false",
			description: "Controlled checked state. Drives aria-checked, data-state, the accent fill, and the inner dot.",
		},
		{
			name: "onCheckedChange",
			type: "(checked: boolean) => void",
			description: "Fired with the next checked value when the radio is toggled. Not called when decorative.",
		},
		{
			name: "decorative",
			type: "boolean",
			default: "false",
			description:
				"Renders an inert, full-opacity indicator for read-only displays: removes pointer events, drops the click handler, and forces tabIndex to -1. Mirrors Checkbox's decorative behavior.",
		},
		{
			name: "disabled",
			type: "boolean",
			description: "Native button disabled state (cursor-not-allowed + 50% opacity).",
		},
		{
			name: "className",
			type: "string",
			description: "Additional classes merged onto the size-4 circular button.",
		},
		{
			name: "...props",
			type: "Omit<React.ComponentProps<'button'>, 'type' | 'onChange'>",
			description: "All native button attributes except type (fixed to 'button') and onChange.",
		},
	],
};

const thinkingDotsDocs: EntryDocs = {
	import: 'import { ThinkingDots } from "@fraym/ui";',
	anatomy: `<ThinkingDots label="Working" />`,
	examples: [
		{
			label: "Default label",
			code: `<ThinkingDots />`,
		},
		{
			label: "Custom label",
			code: `<ThinkingDots label="Thinking" />`,
		},
		{
			label: "Shimmering label",
			code: `<ThinkingDots label="Thinking" shimmer />`,
		},
		{
			label: "Composed spacing",
			code: `<div className="mt-1 mb-3 ml-[31px]">
  <ThinkingDots label="Reading files" />
</div>`,
		},
	],
	api: [
		{
			name: "label",
			type: "string",
			default: '"Working"',
			description: "Text rendered before the ellipsis next to the three animated accent dots.",
		},
		{
			name: "shimmer",
			type: "boolean",
			default: "false",
			description: "Shimmer the label text via Shimmer (the wait reads as alive, not stalled).",
		},
		{
			name: "className",
			type: "string",
			description:
				"Additional Tailwind classes merged onto the root span. Use this or a wrapper for composed spacing.",
		},
		{
			name: "...props",
			type: "React.ComponentProps<'span'>",
			description: "Forwards all native span attributes.",
		},
	],
};

const compactionSplitDocs: EntryDocs = {
	import: 'import { CompactionSplit } from "@fraym/ui";',
	anatomy: `<CompactionSplit variant="compacting" auto />`,
	examples: [
		{
			label: "Compacting",
			code: `<CompactionSplit variant="compacting" />`,
		},
		{
			label: "Automatic compacting",
			code: `<CompactionSplit variant="compacting" auto />`,
		},
		{
			label: "Done",
			code: `<CompactionSplit variant="done" freed={62} />`,
		},
	],
	api: [
		{
			name: "variant",
			type: '"compacting" | "done"',
			default: '"compacting"',
			description:
				"Controls the divider state: animated shimmer while compacting, settled token-savings label when done.",
		},
		{
			name: "auto",
			type: "boolean",
			default: "false",
			description: "When compacting, switches the label to the automatic-compaction copy.",
		},
		{
			name: "freed",
			type: "number",
			description: "Approximate thousands of tokens freed, shown only in the done state.",
		},
		{
			name: "className",
			type: "string",
			description:
				"Additional Tailwind classes merged onto the root div. Consumers own margins and horizontal insets.",
		},
		{
			name: "...props",
			type: "React.ComponentProps<'div'>",
			description: "Forwards all native div attributes.",
		},
	],
};

const diagramTagDocs: EntryDocs = {
	import: 'import { DiagramTag } from "@fraym/ui";',
	anatomy: `<DiagramTag tone="accent">commands ↓</DiagramTag>`,
	examples: [
		{
			label: "Tones",
			code: `<DiagramTag tone="accent">make</DiagramTag>
<DiagramTag tone="blue">build ↓</DiagramTag>
<DiagramTag tone="green">ok</DiagramTag>`,
		},
		{
			label: "Inline kicker before a title",
			code: `<h4>
  <DiagramTag tone="iris">01</DiagramTag>
  Parse the request
</h4>`,
		},
	],
	api: [
		{
			name: "tone",
			type: '"accent" | "iris" | "blue" | "green" | "warn" | "muted"',
			default: '"accent"',
			description: "Color tone resolved from the architecture accent tokens.",
		},
		{ name: "children", type: "React.ReactNode", description: "The kicker label content." },
		{ name: "className", type: "string", description: "Additional classes merged onto the inline span." },
		{ name: "...props", type: "React.ComponentProps<'span'>", description: "Forwards all native span attributes." },
	],
};

const mermaidDiagramDocs: EntryDocs = {
	import: 'import { MermaidDiagram } from "@fraym/ui";',
	anatomy: `<MermaidDiagram code={diagramSource} />`,
	examples: [
		{
			label: "Flowchart",
			code: `<MermaidDiagram code={["flowchart LR", "  A[User] --> B{Driver}", "  B --> C[UI]"].join("\\n")} />`,
		},
		{
			label: "Sequence",
			code: `<MermaidDiagram code={["sequenceDiagram", "  UI->>Driver: send", "  Driver-->>UI: patch"].join("\\n")} />`,
		},
	],
	api: [
		{
			name: "code",
			type: "string",
			required: true,
			description:
				"Mermaid source. Re-renders whenever it changes; shows an inline error message on invalid syntax.",
		},
		{ name: "className", type: "string", description: "Additional classes merged onto the diagram container." },
	],
};

const streamingMarkdownDocs: EntryDocs = {
	import: 'import { StreamingMarkdown } from "@fraym/ui";',
	anatomy: `<StreamingMarkdown text={message.text} animate={message.isStreaming} />`,
	examples: [
		{
			label: "Static prose",
			code: `<StreamingMarkdown
  text={"## Summary\\n\\nFraym renders **markdown** with token-themed prose and \`inline code\`."}
/>`,
		},
		{
			label: "Live streaming reveal",
			code: `<StreamingMarkdown text={streamedText} animate={isStreaming} />`,
		},
		{
			label: "Code line numbers",
			code: `<StreamingMarkdown
  lineNumbers
  text={["\`\`\`ts", "export const ok = true;", "\`\`\`"].join("\\n")}
/>`,
		},
	],
	api: [
		{
			name: "text",
			type: "string",
			required: true,
			description:
				"Raw accumulated markdown source. Complete mermaid fences are split out and rendered with MermaidDiagram.",
		},
		{
			name: "animate",
			type: "boolean",
			default: "false",
			description:
				"Enables Streamdown's native animated token reveal. Pass true only for the actively streaming message.",
		},
		{
			name: "lineNumbers",
			type: "boolean",
			default: "false",
			description: "Shows a Streamdown line-number gutter for fenced code blocks.",
		},
		{
			name: "className",
			type: "string",
			description: "Additional classes merged onto the streaming markdown root.",
		},
	],
};
const spinnerDocs: EntryDocs = {
	import: 'import { Spinner, type SpinnerKind, type SpinnerState } from "@fraym/ui";',
	anatomy: `<Spinner kind="dots" state="running" size="md" />`,
	examples: [
		{
			label: "Kinds",
			code: `<Spinner kind="circular" />\n<Spinner kind="dots" />\n<Spinner kind="bars" />\n<Spinner kind="signal" />\n<Spinner kind="orbit" />\n<Spinner kind="bounce" />`,
		},
		{
			label: "States",
			code: `<Spinner state="running" />\n<Spinner state="idle" />\n<Spinner state="success" />\n<Spinner state="error" />`,
		},
		{ label: "Accent color", code: `<Spinner className="text-fr-accent" />` },
		{ label: "Announced (a11y)", code: `<Spinner label="Loading models" />` },
		{ label: "Inside a button", code: `<Button loading loadingText="Saving…">Save</Button>` },
	],
	api: [
		{
			name: "kind",
			type: '"circular" | "dots" | "bars" | "signal" | "orbit" | "bounce"',
			default: '"circular"',
			description: "The loader animation. Each is a distinct affordance, like a vibr avatar / wisp preset.",
		},
		{
			name: "state",
			type: '"running" | "idle" | "success" | "error"',
			default: '"running"',
			description: "Lifecycle: running (animating), idle (static + dimmed), success (✓), error (✗).",
		},
		{
			name: "size",
			type: '"xs" | "sm" | "md" | "lg"',
			default: '"sm"',
			description: "Diameter preset (12/14/18/24px).",
		},
		{ name: "label", type: "string", description: "Screen-reader label; omit to render decorative (aria-hidden)." },
		{ name: "className", type: "string", description: "Classes merged via cn(); color via text-* (currentColor)." },
	],
};
const sliderDocs: EntryDocs = {
	import: 'import { Slider } from "@fraym/ui";',
	anatomy: '<Slider label="Intensity" value={value} onValueChange={setValue} min={0} max={2} step={0.05} />',
	examples: [
		{ label: "Basic range", code: "<Slider value={value} onValueChange={setValue} min={0} max={100} />" },
		{
			label: "Customize row (label + readout)",
			code: '<Slider label="Speed" value={value} onValueChange={setValue} min={0} max={3} step={0.1} />',
		},
		{
			label: "Formatted readout",
			code: '<Slider label="Blend" value={value} onValueChange={setValue} min={0} max={1} step={0.01} formatValue={v => `${Math.round(v * 100)}%`} />',
		},
	],
	api: [
		{
			name: "value",
			type: "number",
			required: true,
			description: "Current value; clamped to [min, max] and snapped to step.",
		},
		{
			name: "onValueChange",
			type: "(value: number) => void",
			required: true,
			description: "Fired on drag and keyboard change.",
		},
		{ name: "min / max", type: "number", description: "Scale bounds. Default 0 / 100." },
		{ name: "step", type: "number", description: "Snap granularity. Default 1." },
		{ name: "label", type: "string", description: "Inline caption rendered left, inside the track." },
		{
			name: "formatValue",
			type: "(value: number) => string",
			description: "Formats the right-aligned readout. Default String at the step's precision.",
		},
		{ name: "disabled", type: "boolean", description: "Dims the row and ignores input." },
	],
};
const steppedSliderDocs: EntryDocs = {
	import: 'import { Slider, type SliderStep } from "@fraym/ui";',
	anatomy: '<Slider steps={steps} value={value} onValueChange={setValue} startLabel="Faster" endLabel="Smarter" />',
	examples: [
		{
			label: "Ordered scale",
			code: [
				"const steps = [",
				'  { value: "off", label: "Off" },',
				'  { value: "low", label: "Low" },',
				'  { value: "medium", label: "Medium" },',
				'  { value: "high", label: "High" },',
				"];",
				"<Slider steps={steps} value={value} onValueChange={setValue} />",
			].join("\n"),
		},
		{
			label: "With end captions",
			code: '<Slider steps={steps} value={value} onValueChange={setValue} startLabel="Faster" endLabel="Smarter" />',
		},
		{
			label: "Muted (external mode active)",
			code: "<Slider steps={steps} value={value} onValueChange={setValue} muted />",
		},
	],
	api: [
		{
			name: "steps",
			type: "readonly SliderStep[]",
			required: true,
			description: "Ordered steps low → high; each { value, label }. Rendered left → right.",
		},
		{
			name: "value",
			type: "string",
			description: "Selected step value. Omit to render no knob (e.g. an external mode owns the state).",
		},
		{
			name: "onValueChange",
			type: "(value: string) => void",
			required: true,
			description: "Fires with the picked step value on click, drag, or keyboard.",
		},
		{ name: "startLabel", type: "string", description: 'Caption under the low (left) end, e.g. "Faster".' },
		{ name: "endLabel", type: "string", description: 'Caption under the high (right) end, e.g. "Smarter".' },
		{
			name: "muted",
			type: "boolean",
			default: "false",
			description: "Dim the track and hide the knob when an external mode supersedes the scale.",
		},
		{ name: "disabled", type: "boolean", default: "false", description: "Disable interaction." },
		{ name: "aria-label", type: "string", description: "Accessible name for the slider widget." },
		{ name: "className", type: "string", description: "Classes merged via cn() onto the root." },
	],
};
export const elementsEntries: readonly ShowcaseEntry[] = [
	...withGroup("Actions", [
		{ id: "button", name: "Button", Component: ButtonEntry, docs: buttonDocs },
		{ id: "icon-button", name: "IconButton", Component: IconButtonEntry, docs: iconButtonDocs },
		{ id: "toggle", name: "Toggle", Component: ToggleEntry, docs: toggleDocs },
		{ id: "message-actions", name: "MessageActions", Component: MessageActionsEntry, docs: messageActionsDocs },
		{ id: "message-usage", name: "MessageUsage", Component: MessageUsageEntry, docs: messageUsageDocs },
	]),
	...withGroup("Inputs", [
		{ id: "input", name: "Input", Component: InputEntry, docs: inputDocs },
		{ id: "textarea", name: "Textarea", Component: TextareaEntry, docs: textareaDocs },
		{ id: "select", name: "Select", Component: SelectEntry, docs: selectDocs },
		{ id: "field", name: "Field", Component: FieldEntry, docs: fieldDocs },
		{ id: "label", name: "Label", Component: LabelEntry, docs: labelDocs },
		{ id: "switch", name: "Switch", Component: SwitchEntry, docs: switchDocs },
		{ id: "checkbox", name: "Checkbox", Component: CheckboxEntry, docs: checkboxDocs },
		{ id: "radio", name: "Radio", Component: RadioEntry, docs: radioDocs },
		{ id: "stepped-slider", name: "Slider (stepped)", Component: SteppedSliderEntry, docs: steppedSliderDocs },
		{ id: "slider", name: "Slider", Component: SliderEntry, docs: sliderDocs },
	]),
	...withGroup("Containers", [
		{ id: "card", name: "Card", Component: CardEntry, docs: cardDocs },
		{ id: "tabs", name: "Tabs", Component: TabsEntry, docs: tabsDocs },
		{ id: "scroll-area", name: "ScrollArea", Component: ScrollAreaEntry, docs: scrollAreaDocs },
		{ id: "separator", name: "Separator", Component: SeparatorEntry, docs: separatorDocs },
	]),
	...withGroup("Content & prose", [
		{ id: "badge", name: "Badge", Component: BadgeEntry, docs: badgeDocs },
		{ id: "code", name: "Code", Component: CodeEntry, docs: codeDocs },
		{ id: "kbd", name: "Kbd", Component: KbdEntry, docs: kbdDocs },
		{ id: "diagram-tag", name: "DiagramTag", Component: DiagramTagEntry, docs: diagramTagDocs },
		{
			id: "streaming-markdown",
			name: "StreamingMarkdown",
			Component: StreamingMarkdownEntry,
			docs: streamingMarkdownDocs,
		},
		{ id: "mermaid-diagram", name: "MermaidDiagram", Component: MermaidDiagramEntry, docs: mermaidDiagramDocs },
		...textShineEntries,
	]),
	...withGroup("Feedback & motion", [
		{ id: "tooltip", name: "Tooltip", Component: TooltipEntry, docs: tooltipDocs },
		{ id: "shimmer", name: "Shimmer", Component: ShimmerEntry, docs: shimmerDocs },
		{ id: "skeleton", name: "Skeleton", Component: SkeletonEntry, docs: skeletonDocs },
		{ id: "thinking-dots", name: "ThinkingDots", Component: ThinkingDotsEntry, docs: thinkingDotsDocs },
		{ id: "compaction-split", name: "CompactionSplit", Component: CompactionSplitEntry, docs: compactionSplitDocs },
		{ id: "spinner", name: "Spinner", Component: SpinnerEntry, docs: spinnerDocs },
		...chromaGridEntries,
		...borderEffectsEntries,
		...interactiveBitsEntries,
	]),
	...withGroup("Material", liquidGlassEntries),
];
