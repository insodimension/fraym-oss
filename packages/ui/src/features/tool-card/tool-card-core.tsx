import type { IconSpec } from "@fraym/config";
import { useEffect, useRef, useState } from "react";
import { CollapseRegion } from "../../elements/collapse-region";
import { Shimmer } from "../../elements/shimmer";
import { Icon, type IconName, toolIconNode } from "../../icons";
import { cn } from "../../lib/cn";
import { type FraymDensity, resolveDensity } from "../surface-kit";
import { useToolDisplaySettings } from "./tool-display-settings";

// Tool head label tone: one perceptual step below `--fr-text` (~50% toward it from the
// muted `--fr-text-2`) so the verb + path read clearly brighter than the stat/reasoning
// tier (`--fr-text-3`) without going full white. Blended off existing text tokens — no new
// palette entry. Plain template-literal (not `cn`) so twMerge can't mis-group it vs `text-fr-md`.
const TOOL_LABEL_COLOR = "text-[color-mix(in_oklab,var(--fr-text-2),var(--fr-text)_50%)]";

export type ToolKind =
	| "read"
	| "write"
	| "edit"
	| "command"
	| "grep"
	| "skill"
	| "mcp"
	| "web"
	| "todo"
	| "task"
	| "json"
	| "realm"
	| "lsp"
	| "debug"
	| "web_search"
	| "github"
	| "calc"
	| "ask"
	| "resolve"
	| "irc"
	| "checkpoint"
	| "recall"
	| "retain"
	| "rewind"
	| "reflect"
	| "report_tool_issue"
	| "goal";
/** Body geometry variant. `"term"` maps to the prototype's `.tool-body.term` bordered surface card. */
export type ToolBodyVariant = "default" | "term";

/** Tool lifecycle status → head indicator (pulsing dot / ✓ / ✕ / warn dot). Defaults from `success`. */
export type ToolStatus = "pending" | "success" | "error" | "warn";

// Mirrors the prototype KIND map (blocks.jsx). The icon-color class reproduces the proto's
// parent selectors `.tool.skill .t-ic{color:var(--accent)}`, `.tool.search .t-ic{color:var(--blue)}`,
// `.tool.mcp .t-ic{color:var(--add)}`. `grep`/`web` share the `search` (blue) treatment.
export interface KindConfig {
	icon: IconName;
	iconColor: string;
	/** Render the icon as a filled solid shape (no stroke). Used for logo-style icons like the GitHub Octocat. */
	filled?: boolean | undefined;
	/** Override the SVG viewBox (default "0 0 24 24"). Used for icons designed in a different coordinate space. */
	viewBox?: string | undefined;
	/** Override the default icon size for this kind. Default varies by density. */
	iconSize?: number | undefined;
}
const KIND_CONFIG: Record<ToolKind, KindConfig> = {
	read: { icon: "file", iconColor: "text-fr-text-3" },
	edit: { icon: "diff", iconColor: "text-fr-text-3" },
	write: { icon: "filePlus", iconColor: "text-fr-add" },
	command: { icon: "termBox", iconColor: "text-fr-text-3" },
	grep: { icon: "search", iconColor: "text-fr-blue" },
	skill: { icon: "book", iconColor: "text-fr-iris" },
	mcp: { icon: "shield", iconColor: "text-fr-add" },
	web: { icon: "globe", iconColor: "text-fr-blue" },
	todo: { icon: "list", iconColor: "text-fr-accent" },
	task: { icon: "grid", iconColor: "text-fr-accent" },
	json: { icon: "db", iconColor: "text-fr-blue" },
	realm: { icon: "shield", iconColor: "text-fr-add" },
	lsp: { icon: "code", iconColor: "text-fr-accent" },
	debug: { icon: "bolt", iconColor: "text-fr-accent" },
	web_search: { icon: "globe", iconColor: "text-fr-blue" },
	irc: { icon: "bot", iconColor: "text-fr-accent" },
	calc: { icon: "plus", iconColor: "text-fr-accent" },
	ask: { icon: "chat", iconColor: "text-fr-accent" },
	checkpoint: { icon: "clock", iconColor: "text-fr-accent" },
	recall: { icon: "history", iconColor: "text-fr-blue" },
	retain: { icon: "archive", iconColor: "text-fr-accent" },
	rewind: { icon: "back", iconColor: "text-fr-warn" },
	reflect: { icon: "eye", iconColor: "text-fr-accent" },
	report_tool_issue: { icon: "bolt", iconColor: "text-fr-del" },
	resolve: { icon: "check", iconColor: "text-fr-add" },
	goal: { icon: "pin", iconColor: "text-fr-accent" },
	github: { icon: "markGithub", iconColor: "text-fr-text", filled: true, iconSize: 26, viewBox: "0 0 16 16" },
};

/** Per-kind icon config, for surfaces that draw a tool's glyph OUTSIDE a card
 *  chassis (capability chips, pills) — same source the card headers read, so
 *  a tool never has two different faces. */
export function toolKindConfig(kind: ToolKind): KindConfig {
	return KIND_CONFIG[kind];
}

// Head status indicator (pulsing dot / warn dot / ✕ / ✓). Glyph marks carry `leading-none`.
function statusMark(status: ToolStatus) {
	if (status === "pending")
		return (
			<span
				data-slot="tool-activity"
				className="size-[7px] shrink-0 self-center animate-[fr-breathe_1.6s_infinite] rounded-full bg-fr-accent"
			/>
		);
	if (status === "warn") return <span className="size-[7px] shrink-0 self-center rounded-full bg-fr-warn" />;
	if (status === "error") return <span className="leading-none text-fr-del">✕</span>;
	return <span className="leading-none text-fr-add">✓</span>;
}

// Spacious-only status pill (proto `.tool-status` modifiers): tone classes + short label.
function statusPillClass(status: ToolStatus): string {
	if (status === "error") return "bg-fr-del-bg text-fr-del";
	if (status === "warn") return "bg-[rgba(224,177,91,0.15)] text-fr-warn";
	if (status === "pending") return "bg-fr-surface-3 text-fr-text-2";
	return "bg-fr-add-bg text-fr-add";
}

function statusPillLabel(status: ToolStatus): string {
	if (status === "error") return "failed";
	if (status === "warn") return "trunc";
	if (status === "pending") return "…";
	return "ok";
}

export interface ToolCardProps {
	readonly kind?: ToolKind | undefined;
	/** Per-call icon override (from the tool-icon policy); wins over the kind's default icon. */
	readonly icon?: IconSpec | undefined;
	/** Renderer-supplied head icon node; wins over `icon`/kind. */
	readonly headIcon?: React.ReactNode | undefined;
	/** Full custom head (replaces the compact strip) — e.g. the rich animated skill
	 *  header. The card still adds the status pill + caret + collapsible body. */
	readonly header?: React.ReactNode | undefined;
	readonly label: React.ReactNode;
	/** Pills rendered between the label and the stat, vertically centered with the row. */
	readonly badges?: React.ReactNode | undefined;
	readonly stat?: string | undefined;
	readonly success?: boolean | undefined;
	/** Lifecycle status for the head indicator; overrides `success` when set. */
	readonly status?: ToolStatus | undefined;
	readonly children?: React.ReactNode | undefined;
	/** Selects the open-body geometry. Pair with `ToolBodyTerm` and set `"term"`. */
	readonly bodyVariant?: ToolBodyVariant | undefined;
	readonly defaultOpen?: boolean | undefined;
	readonly density?: FraymDensity | undefined;
	readonly className?: string | undefined;
}

interface ToolCardRenderModel {
	readonly kind: ToolKind;
	readonly icon?: IconSpec | undefined;
	readonly headIcon?: React.ReactNode | undefined;
	readonly header?: React.ReactNode | undefined;
	readonly label: React.ReactNode;
	readonly badges?: React.ReactNode | undefined;
	readonly stat?: string | undefined;
	readonly children?: React.ReactNode | undefined;
	readonly bodyVariant: ToolBodyVariant;
	readonly className?: string | undefined;
	readonly density: FraymDensity;
	readonly d: ReturnType<typeof resolveDensity>;
	readonly config: (typeof KIND_CONFIG)[ToolKind];
	readonly open: boolean;
	readonly caret: React.ReactNode;
	readonly mark: React.ReactNode;
	readonly resolvedStatus: ToolStatus;
	readonly toggleOpen: () => void;
}

export function ToolCard({
	kind = "read",
	icon,
	headIcon,
	header,
	label,
	badges,
	stat,
	success = true,
	status,
	children,
	bodyVariant = "default",
	defaultOpen = false,
	className,
	density: densityProp,
}: ToolCardProps) {
	const settings = useToolDisplaySettings();
	const density = densityProp ?? settings.density ?? "comfortable";
	const [open, setOpen] = useState(defaultOpen);
	const userToggledRef = useRef(false);
	const config = KIND_CONFIG[kind];
	const d = resolveDensity(density);
	const resolvedStatus: ToolStatus = status ?? (success ? "success" : "error");

	// Follow the ambient auto-expand default in BOTH directions when it changes,
	// unless the user manually toggled THIS card (which pins its state).
	useEffect(() => {
		if (!userToggledRef.current) setOpen(defaultOpen);
	}, [defaultOpen]);

	const caret = children ? (
		<span className={cn("flex shrink-0 text-fr-text-3 transition-transform duration-150", open && "rotate-90")}>
			<Icon name="caretR" size={d.isSpacious ? 14 : d.isCompact ? 10 : 12} strokeWidth={2.2} />
		</span>
	) : null;
	const mark = statusMark(resolvedStatus);
	const toggleOpen = () => {
		userToggledRef.current = true;
		setOpen(o => !o);
	};
	const model: ToolCardRenderModel = {
		kind,
		icon,
		headIcon,
		header,
		label,
		badges,
		stat,
		children,
		bodyVariant,
		className,
		density,
		d,
		config,
		open,
		caret,
		mark,
		resolvedStatus,
		toggleOpen,
	};

	if (model.header && !d.isCompact) return <RichHeaderToolCard model={model} />;
	if (d.isSpacious) return <SpaciousToolCard model={model} />;
	if (d.isCompact) return <CompactToolCard model={model} />;
	return <ComfortableToolCard model={model} />;
}

const RICH_HEADER_STATUS_WORD: Record<ToolStatus, string> = {
	success: "Loaded",
	pending: "Loading…",
	error: "Failed",
	warn: "Check",
};

// A rich, bigger head (skills; comfortable/spacious only — compact falls back to the
// normal strip). The renderer-supplied `header` replaces the compact head; header +
// body read as ONE continuous card — the open header keeps a bottom divider and the
// framed body is stripped of its top border/rounding so they fuse. The card owns the
// status word ("Loaded"/…) + caret.
function RichHeaderToolCard({ model }: { readonly model: ToolCardRenderModel }) {
	const openWithBody = model.open && Boolean(model.children);
	return (
		<div
			data-slot="tool-card"
			data-kind={model.kind}
			data-density={model.density}
			data-tool-status={model.resolvedStatus}
			className={cn("my-[3px] animate-[fr-rise_0.25s_ease]", model.className)}
		>
			<button
				type="button"
				onClick={model.toggleOpen}
				className={cn(
					"flex w-full items-center gap-3 border border-fr-border-soft bg-fr-surface px-3 py-2.5 text-left transition-colors duration-[120ms] hover:bg-fr-surface-2",
					openWithBody ? "rounded-t-[12px]" : "rounded-[12px]",
				)}
			>
				{model.header}
				<span
					className={cn(
						"shrink-0 rounded-[6px] px-2 py-0.5 text-fr-2xs font-semibold uppercase tracking-fr-label",
						statusPillClass(model.resolvedStatus),
					)}
				>
					{RICH_HEADER_STATUS_WORD[model.resolvedStatus]}
				</span>
				{model.caret}
			</button>
			{model.children && (
				<CollapseRegion open={model.open} durationMs={180}>
					{/* Fuse the framed body to the header: strip its top border/rounding/margin. */}
					<div className="[&>*]:mt-0 [&>*]:rounded-t-none [&>*]:border-t-0">{model.children}</div>
				</CollapseRegion>
			)}
		</div>
	);
}

// While a tool is running, its head label shimmers via the shared `Shimmer` sweep (the
// same element the working-tail uses). `text-[length:inherit]` keeps the header's own
// font-size — Shimmer's standalone `text-fr-base` default would otherwise resize the label.
function ToolHeadLabel({ model }: { readonly model: ToolCardRenderModel }) {
	if (model.resolvedStatus !== "pending") return <>{model.label}</>;
	return <Shimmer className="text-[length:inherit]">{model.label}</Shimmer>;
}

// Resolve the head icon: a policy override (`model.icon`) wins when it maps to a known
// icon (color mark or mono glyph); otherwise fall back to the kind's default `Icon`.
// Shared by all three density headers so the override + fallback stay in lockstep.
function ToolHeadIcon({ model, size }: { readonly model: ToolCardRenderModel; readonly size: number }) {
	if (model.headIcon) return <>{model.headIcon}</>;
	const override = model.icon ? toolIconNode(model.icon, size) : null;
	if (override) return <>{override}</>;
	return (
		<Icon
			name={model.config.icon}
			size={size}
			{...(model.config.filled === undefined ? {} : { filled: model.config.filled })}
			{...(model.config.viewBox === undefined ? {} : { viewBox: model.config.viewBox })}
			strokeWidth={1.9}
		/>
	);
}

function SpaciousToolHeader({ model }: { readonly model: ToolCardRenderModel }) {
	return (
		<button
			type="button"
			onClick={model.toggleOpen}
			className={cn(
				"flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-[120ms] hover:bg-fr-surface-2",
				model.open && model.children && "border-b border-fr-border-soft",
			)}
		>
			<span
				data-slot="tool-card-icon"
				className={cn(
					"flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-fr-surface-2",
					model.icon?.color ?? model.config.iconColor,
				)}
			>
				<ToolHeadIcon model={model} size={model.config.iconSize ?? 18} />
			</span>
			<span className="min-w-0 flex-1">
				<span className="flex items-center gap-2">
					<span
						data-slot="tool-card-label"
						className={`min-w-0 fr-overflow text-fr-md font-medium ${TOOL_LABEL_COLOR}`}
					>
						<ToolHeadLabel model={model} />
					</span>
					{model.badges && (
						<span className="flex min-w-0 shrink items-center gap-1.5 overflow-hidden">{model.badges}</span>
					)}
				</span>
				{model.stat && <span className="mt-0.5 block font-secondary text-fr-2xs text-fr-text-3">{model.stat}</span>}
			</span>
			<span
				className={cn(
					"shrink-0 rounded-[6px] px-2 py-0.5 text-fr-2xs font-semibold uppercase tracking-fr-label",
					statusPillClass(model.resolvedStatus),
				)}
			>
				{statusPillLabel(model.resolvedStatus)}
			</span>
			{model.caret}
		</button>
	);
}

function SpaciousToolCard({ model }: { readonly model: ToolCardRenderModel }) {
	return (
		<div
			data-slot="tool-card"
			data-kind={model.kind}
			data-density={model.density}
			data-tool-status={model.resolvedStatus}
			className={cn(
				"animate-[fr-rise_0.25s_ease] overflow-hidden rounded-[12px] border border-fr-border bg-fr-surface",
				model.className,
			)}
		>
			<SpaciousToolHeader model={model} />
			{model.children && (
				<CollapseRegion open={model.open} durationMs={180}>
					<div className="px-4 py-3 font-secondary text-fr-sm leading-[1.85] text-fr-text-2">{model.children}</div>
				</CollapseRegion>
			)}
		</div>
	);
}

function CompactToolBody({ model }: { readonly model: ToolCardRenderModel }) {
	if (!model.children) return null;
	return (
		<CollapseRegion open={model.open} durationMs={180}>
			<div
				className={cn(
					// Same gutter convention as comfortable (`ml` = icon center − 1): the size-3
					// head icon centers at 6px, so the body rail at 5..6px dissects it. Content
					// pads to 18px (= 12px icon + gap-1.5) to sit on the head label's column.
					"mb-1 ml-[5px] font-secondary text-fr-2xs leading-[1.6] text-fr-text-2",
					model.bodyVariant === "term"
						? "border-l border-fr-border bg-fr-surface py-1 pr-2.5 pl-3"
						: "border-l border-fr-border py-0.5 pl-3",
				)}
			>
				{model.children}
			</div>
		</CollapseRegion>
	);
}

function CompactToolCard({ model }: { readonly model: ToolCardRenderModel }) {
	return (
		<div
			data-slot="tool-card"
			data-kind={model.kind}
			data-density={model.density}
			data-tool-status={model.resolvedStatus}
			className={cn("animate-[fr-rise_0.2s_ease]", model.className)}
		>
			<button
				type="button"
				onClick={model.toggleOpen}
				className="flex w-full items-center gap-1.5 py-[3px] text-left text-fr-xs text-fr-text-3 transition-colors hover:text-fr-text-2"
			>
				<span
					data-slot="tool-card-icon"
					className={cn(
						"flex size-3 shrink-0 items-center justify-center",
						model.icon?.color ?? model.config.iconColor,
					)}
				>
					<ToolHeadIcon model={model} size={11} />
				</span>
				<span data-slot="tool-card-label" className={`min-w-0 fr-overflow ${TOOL_LABEL_COLOR}`}>
					<ToolHeadLabel model={model} />
				</span>
				{model.badges && (
					<span className="flex min-w-0 shrink items-center gap-1.5 overflow-hidden">{model.badges}</span>
				)}
				{model.stat && (
					<span className="ml-auto flex shrink-0 items-center gap-1 font-secondary text-fr-2xs leading-none text-fr-text-3">
						{model.mark}
						{model.stat}
					</span>
				)}
				{model.caret}
			</button>
			<CompactToolBody model={model} />
		</div>
	);
}

function ComfortableToolHeader({ model }: { readonly model: ToolCardRenderModel }) {
	return (
		<button
			type="button"
			onClick={model.toggleOpen}
			className={cn(
				"inline-flex max-w-full items-center gap-2 rounded-[7px] bg-fr-surface px-[9px] py-1 pl-[7px] text-fr-sm text-fr-text-3 transition-colors duration-[120ms]",
				"hover:bg-fr-surface-2 hover:text-fr-text-2",
				model.open && "bg-fr-surface-2 text-fr-text-2",
			)}
		>
			<span
				data-slot="tool-card-icon"
				className={cn(
					"flex size-[14px] shrink-0 items-center justify-center",
					model.icon?.color ?? model.config.iconColor,
				)}
			>
				<ToolHeadIcon model={model} size={13} />
			</span>
			<span className="flex min-w-0 items-center gap-2">
				<span data-slot="tool-card-label" className={`fr-overflow ${TOOL_LABEL_COLOR}`}>
					<ToolHeadLabel model={model} />
				</span>
				{model.badges && (
					<span className="flex min-w-0 shrink items-center gap-1.5 overflow-hidden">{model.badges}</span>
				)}
				{model.stat && (
					<span className="flex shrink-0 items-center gap-[5px] font-secondary text-fr-2xs leading-none text-fr-text-3">
						{model.mark}
						{model.stat}
					</span>
				)}
			</span>
			{model.caret}
		</button>
	);
}

function ComfortableToolCard({ model }: { readonly model: ToolCardRenderModel }) {
	const bodyClassName = cn(
		"font-secondary text-fr-xs leading-[1.7] text-fr-text-2",
		model.bodyVariant === "term"
			? "ml-[13px] mt-1 mb-[7px] rounded-[9px] border border-fr-border-soft bg-fr-surface px-3 py-[9px]"
			: "ml-[13px] mt-0.5 mb-1.5 border-l border-fr-border py-1.5 pl-[15px]",
	);
	return (
		<div
			data-slot="tool-card"
			data-kind={model.kind}
			data-density={model.density}
			data-tool-status={model.resolvedStatus}
			className={cn("my-[3px] animate-[fr-rise_0.25s_ease]", model.className)}
		>
			<ComfortableToolHeader model={model} />
			{model.children && (
				<CollapseRegion open={model.open} durationMs={180}>
					<div className={bodyClassName}>{model.children}</div>
				</CollapseRegion>
			)}
		</div>
	);
}

export interface ToolBodyFilesProps {
	readonly rows: readonly (readonly [string, string])[];
}

export function ToolBodyFiles({ rows }: ToolBodyFilesProps) {
	// Proto `.tool-body .file-row{display:flex;gap:10px;color:var(--text-2)}`,
	// `.file-row .path{color:#cdb8f5 / light #6b4bb5}` (the --fr-code-path token carries both),
	// `.file-row .n{margin-left:auto;color:var(--text-3)}`.
	return (
		<>
			{rows.map(([path, detail], i) => (
				<div key={i} className="flex gap-2.5 text-fr-text-2">
					<span style={{ color: "var(--fr-code-path)" }}>{path}</span>
					<span className="ml-auto text-fr-text-3">{detail}</span>
				</div>
			))}
		</>
	);
}

/** Colored segment kinds in a terminal line. `prompt`/`pass`/`fail` are the proto
 * `.term` colors; `warn`/`info`/`magenta`/`dim` extend them so the ANSI parser can map
 * the 8 SGR colors. Anything else renders plain (inherits the body color). */
export type TermSegmentKind = "prompt" | "pass" | "fail" | "plain" | "warn" | "info" | "magenta" | "dim";

export interface ToolBodyTermProps {
	/** Each line is a flat list of interleaved `[kind, text, kind, text, …]` pairs (proto `TermLine` shape). */
	readonly lines: readonly (readonly string[])[];
}

// Renders the proto `.term` line segments. The bordered surface-card geometry of
// `.tool-body.term` is owned by `ToolCard` (pass `bodyVariant="term"`), matching the proto
// where `.term` is a modifier on the single `.tool-body` element — no nested wrapper.
export function ToolBodyTerm({ lines }: ToolBodyTermProps) {
	return (
		<>
			{lines.map((segments, i) => (
				<div key={i}>
					{Array.from({ length: Math.floor(segments.length / 2) }, (_, j) => {
						const cls = segments[j * 2] as TermSegmentKind;
						const text = segments[j * 2 + 1]!;
						// Proto `.term .prompt/.pass/.fail` are the only colored segments;
						// `plain` / anything else inherits the body color (`--text-2`).
						return (
							<span
								key={j}
								className={cn(
									cls === "prompt" && "text-fr-accent",
									cls === "pass" && "text-fr-add",
									cls === "fail" && "text-fr-del",
									cls === "warn" && "text-fr-warn",
									cls === "info" && "text-fr-blue",
									cls === "magenta" && "text-fr-iris",
									cls === "dim" && "text-fr-text-3",
								)}
							>
								{text}
							</span>
						);
					})}
				</div>
			))}
		</>
	);
}
