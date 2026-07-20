// Implementations for the driver's non-text message blocks.
//
// These render reasoning (`thinkingDelta`), engine notices (`notice`), provider
// retries (`retry`), file mentions, and the "chain of thought" grouping that
// coalesces adjacent reasoning/tool blocks (see `groupBlocks`). Each is a plain
// styled composite; they register into the MessageBlockRegistry.

import { memo, useEffect, useRef, useState } from "react";
import { Shimmer } from "../../../elements/shimmer";
import { StreamingMarkdown } from "../../../elements/streaming-markdown";
import { Icon } from "../../../icons";
import { cn } from "../../../lib/cn";
import type { FraymDensity } from "../../surface-kit";
import { useToolDisplaySettings } from "../../tool-card/tool-display-settings";

const LEVEL_TONE: Record<string, { text: string; bar: string }> = {
	info: { text: "text-fr-blue", bar: "bg-fr-blue" },
	warning: { text: "text-fr-warn", bar: "bg-fr-warn" },
	error: { text: "text-fr-del", bar: "bg-fr-del" },
};
const DEFAULT_OPEN_REASONING_DEFER_MS = 6000;

// --- ReasoningBlock ---------------------------------------------------------

export interface ReasoningBlockProps {
	readonly text: string;
	readonly summary?: string;
	readonly defaultOpen?: boolean;
	/** Open-body density. Falls back to the ambient tool-display density (the channel a
	 *  thread / demo dock drives), so reasoning honors the same collapse + density knob
	 *  (collapsed · comfortable · compact · spacious) as every tool card. */
	readonly density?: FraymDensity;
	/** True while this block is the live edge (streaming · last block of the last message),
	 *  i.e. reasoning is actively growing now. Shimmers the summary as the inline "thinking
	 *  now" cue. The global vibr/verber tail is left untouched. */
	readonly live?: boolean;
	readonly className?: string;
}

// Vertical rhythm for the DISCLOSURE densities (comfortable · spacious). The horizontal
// gutter (pl-[7px] + size-[14px] icon box + gap-2 + ml-[13px] body guide) stays FIXED so
// the spark + summary keep aligning with the tool icon + label down the thread; only the
// row padding, body spacing, and glyph/caret sizes scale. (compact is bare — see below.)
const REASONING_RHYTHM: Record<
	FraymDensity,
	{ outer: string; row: string; spark: number; caret: number; body: string; text: string }
> = {
	compact: {
		outer: "my-[2px]",
		row: "py-0.5",
		spark: 12,
		caret: 10,
		body: "mt-0.5 mb-1 py-1 leading-[1.55]",
		text: "text-fr-sm",
	},
	comfortable: {
		outer: "my-[3px]",
		row: "py-1",
		spark: 13,
		caret: 11,
		body: "mt-0.5 mb-1.5 py-1.5 leading-[1.7]",
		text: "text-fr-md",
	},
	spacious: {
		outer: "my-[5px]",
		row: "py-1.5",
		spark: 14,
		caret: 13,
		body: "mt-1 mb-2.5 py-2.5 leading-[1.9]",
		text: "text-fr-lg",
	},
};

type ReasoningRhythm = (typeof REASONING_RHYTHM)[FraymDensity];

interface ReasoningDisplayState {
	readonly mode: FraymDensity;
	readonly rhythm: ReasoningRhythm;
	readonly open: boolean;
	readonly bodyReady: boolean;
	readonly toggleOpen: () => void;
}

function useReasoningDisplayState(
	defaultOpen?: boolean,
	density?: FraymDensity,
	live?: boolean,
): ReasoningDisplayState {
	const settings = useToolDisplaySettings();
	const mode = density ?? settings.density;
	const effectiveOpen = defaultOpen ?? settings.defaultOpen !== "none";
	const [open, setOpen] = useState(effectiveOpen);
	const [bodyReady, setBodyReady] = useState(!effectiveOpen);
	const userToggledRef = useRef(false);

	// Follow the ambient auto-expand default in both directions (mirrors ToolCard):
	// flipping Auto-expand to "none" collapses reasoning live, otherwise it opens —
	// unless the user toggled this block, which pins its state.
	useEffect(() => {
		if (!userToggledRef.current) setOpen(effectiveOpen);
	}, [effectiveOpen]);
	useEffect(() => {
		if (!open) return;
		if (!effectiveOpen || userToggledRef.current || live) {
			setBodyReady(true);
			return;
		}
		setBodyReady(false);
		const timer = window.setTimeout(() => setBodyReady(true), DEFAULT_OPEN_REASONING_DEFER_MS);
		return () => window.clearTimeout(timer);
	}, [effectiveOpen, live, open]);

	const toggleOpen = () => {
		userToggledRef.current = true;
		setBodyReady(true);
		setOpen(o => !o);
	};

	return {
		mode,
		rhythm: REASONING_RHYTHM[mode],
		open,
		bodyReady,
		toggleOpen,
	};
}

function CompactReasoningBlock({ text, className }: { readonly text: string; readonly className?: string }) {
	return (
		<div data-slot="reasoning-block" data-density="compact" className={cn("my-[2px] pl-[7px]", className)}>
			<StreamingMarkdown text={text} className="text-fr-sm text-fr-text-3 [&_p]:mb-[6px]" />
		</div>
	);
}

function ReasoningDisclosureButton({
	label,
	live,
	display,
}: {
	readonly label: string;
	readonly live?: boolean;
	readonly display: ReasoningDisplayState;
}) {
	const { rhythm, open, toggleOpen } = display;
	return (
		<button
			type="button"
			onClick={toggleOpen}
			className={cn(
				"inline-flex max-w-full items-center gap-2 rounded-[7px] pr-[9px] pl-[7px] text-fr-text-3 transition-colors duration-[120ms] hover:bg-fr-surface hover:text-fr-text-2",
				rhythm.row,
				rhythm.text,
			)}
		>
			<span className="flex size-[14px] shrink-0 items-center justify-center text-fr-text-3">
				<Icon name="spark" size={rhythm.spark} strokeWidth={1.9} />
			</span>
			{live ? (
				<Shimmer className={cn("fr-overflow font-normal", rhythm.text)}>{label}</Shimmer>
			) : (
				<span className="fr-overflow">{label}</span>
			)}
			<Icon
				name="caretR"
				size={rhythm.caret}
				strokeWidth={2.2}
				className={cn("shrink-0 transition-transform", open && "rotate-90")}
			/>
		</button>
	);
}

function ReasoningDisclosureBody({
	text,
	display,
}: {
	readonly text: string;
	readonly display: ReasoningDisplayState;
}) {
	return (
		<div className={cn("ml-[13px] border-l border-fr-border pl-[15px]", display.rhythm.body)}>
			<StreamingMarkdown text={text} className={cn(display.rhythm.text, "text-fr-text-3")} />
		</div>
	);
}

function ReasoningDisclosure({
	text,
	label,
	live,
	display,
	className,
}: {
	readonly text: string;
	readonly label: string;
	readonly live?: boolean;
	readonly display: ReasoningDisplayState;
	readonly className?: string;
}) {
	return (
		<div data-slot="reasoning-block" data-density={display.mode} className={cn(display.rhythm.outer, className)}>
			<ReasoningDisclosureButton label={label} live={live} display={display} />
			{display.open && display.bodyReady && <ReasoningDisclosureBody text={text} display={display} />}
		</div>
	);
}

function reasoningBlockPropsEqual(prev: ReasoningBlockProps, next: ReasoningBlockProps): boolean {
	return (
		prev.text === next.text &&
		prev.summary === next.summary &&
		prev.defaultOpen === next.defaultOpen &&
		prev.density === next.density &&
		prev.live === next.live &&
		prev.className === next.className
	);
}

export const ReasoningBlock = memo(function ReasoningBlock({
	text,
	summary,
	defaultOpen,
	density,
	live,
	className,
}: ReasoningBlockProps) {
	// Reasoning is a message block, NOT a ToolCard — but it shares the tool gutter and the
	// same display channel: when `density`/`defaultOpen` aren't passed explicitly, read the
	// ambient ToolDisplaySettings (collapsed → closed; otherwise open) so a thread or the
	// demo dock collapses/sets reasoning density exactly as it does for tool cards.
	const display = useReasoningDisplayState(defaultOpen, density, live);
	// Label matches the tail's working verb ("Thinking"), so the inline reasoning and the
	// presence tail speak the same word.
	const label = summary ?? "Thinking";
	// Mirror ToolCard: re-open (never auto-close) when the ambient auto-expand flips on,
	// unless the user toggled this block — keeps reasoning in sync with the shared
	// Settings → Tools → Auto-expand control without slamming an open block shut.
	// No streamdown fade: it tags every token `[data-sd-animate]` and fades them with
	// `--sd-delay:0`, so a multi-token update reveals all its lines AT ONCE — an impossible
	// "parallel" stream for sequential reasoning. The only reveal is the text growing (real
	// thinkingDelta tokens, or the demo's deltas). Render the current text plainly.

	// COMPACT — the TUI treatment (engine assistant-message thinking render): the raw trace
	// inline + muted, NO card / disclosure / gutter rail. On surface-kit's density
	// ladder compact === "console" (no chrome), so reasoning shows the direct reason here.
	// `useState` above stays called unconditionally (hooks rules) — this branch ignores it.
	if (display.mode === "compact") {
		return <CompactReasoningBlock text={text} className={className} />;
	}
	return <ReasoningDisclosure text={text} label={label} live={live} display={display} className={className} />;
}, reasoningBlockPropsEqual);

// --- NoticeCard -------------------------------------------------------------

export interface NoticeCardProps {
	readonly level?: "info" | "warning" | "error";
	readonly message: string;
	readonly source?: string;
	readonly className?: string;
}

export function NoticeCard({ level = "info", message, source, className }: NoticeCardProps) {
	const tone = LEVEL_TONE[level] ?? LEVEL_TONE.info!;
	return (
		<div
			data-slot="notice-card"
			className={cn(
				"my-1.5 flex gap-2.5 overflow-hidden rounded-[8px] border border-fr-border-soft bg-fr-surface px-3 py-2 text-fr-sm",
				className,
			)}
		>
			<span className={cn("mt-0.5 w-0.5 shrink-0 self-stretch rounded-full", tone.bar)} />
			<div className="min-w-0">
				{source && <div className={cn("text-fr-xs font-medium", tone.text)}>{source}</div>}
				<div className="text-fr-text-2">{message}</div>
			</div>
		</div>
	);
}

// --- RetryNotice ------------------------------------------------------------

export interface RetryNoticeProps {
	readonly phase: "started" | "succeeded" | "failed" | "fallback";
	readonly attempt?: number;
	readonly maxAttempts?: number;
	readonly fromModel?: string;
	readonly toModel?: string;
	readonly message?: string;
	readonly className?: string;
}

function fallbackRetryLabel(fromModel?: string, toModel?: string): string {
	return fromModel && toModel ? `Falling back ${fromModel} -> ${toModel}` : "Falling back";
}

function startedRetryLabel(attempt?: number, maxAttempts?: number): string {
	if (!attempt) return "Retrying...";
	return `Retrying (attempt ${attempt}${maxAttempts ? `/${maxAttempts}` : ""})...`;
}

function retryLabel({ phase, attempt, maxAttempts, fromModel, toModel, message }: RetryNoticeProps): string {
	if (message) return message;
	if (phase === "fallback") return fallbackRetryLabel(fromModel, toModel);
	if (phase === "started") return startedRetryLabel(attempt, maxAttempts);
	return phase === "succeeded" ? "Retry succeeded" : "Retry failed";
}

function retryTone(phase: RetryNoticeProps["phase"]): string {
	if (phase === "failed") return "text-fr-del";
	if (phase === "succeeded") return "text-fr-add";
	return "text-fr-warn";
}

function retryDotClass(phase: RetryNoticeProps["phase"]): string {
	if (phase === "failed") return "bg-fr-del";
	if (phase === "succeeded") return "bg-fr-add";
	return "bg-fr-warn";
}

export function RetryNotice({ phase, attempt, maxAttempts, fromModel, toModel, message, className }: RetryNoticeProps) {
	const label = retryLabel({ phase, attempt, maxAttempts, fromModel, toModel, message, className });
	const tone = retryTone(phase);
	return (
		<div
			data-slot="retry-notice"
			className={cn("my-1 inline-flex items-center gap-1.5 font-secondary text-fr-xs text-fr-text-3", className)}
		>
			<span className={cn("size-1.5 rounded-full", retryDotClass(phase))} />
			<span className={tone}>{label}</span>
		</div>
	);
}

// --- FileMentionCard --------------------------------------------------------

export interface FileMentionCardProps {
	readonly path: string;
	readonly detail?: string;
	readonly onOpen?: () => void;
	readonly className?: string;
}

export function FileMentionCard({ path, detail, onOpen, className }: FileMentionCardProps) {
	const Tag = onOpen ? "button" : "span";
	return (
		<Tag
			data-slot="file-mention-card"
			{...(onOpen ? { type: "button" as const, onClick: onOpen } : {})}
			className={cn(
				"my-0.5 inline-flex max-w-full items-center gap-1.5 rounded-[6px] border border-fr-border-soft bg-fr-surface px-2 py-1 font-secondary text-fr-xs text-fr-text-2",
				onOpen && "transition-colors hover:bg-fr-surface-2 hover:text-fr-text",
				className,
			)}
		>
			<Icon name="file" size={12} strokeWidth={1.8} className="shrink-0 text-fr-text-3" />
			<span className="fr-overflow" style={{ color: "var(--fr-code-path)" }}>
				{path}
			</span>
			{detail && <span className="shrink-0 text-fr-text-3">{detail}</span>}
		</Tag>
	);
}

// --- ChainOfThoughtGroup ----------------------------------------------------

export interface ChainOfThoughtGroupProps {
	readonly children: React.ReactNode;
	readonly count?: number;
	readonly label?: string;
	readonly defaultOpen?: boolean;
	readonly className?: string;
}

export function ChainOfThoughtGroup({
	children,
	count,
	label,
	defaultOpen = true,
	className,
}: ChainOfThoughtGroupProps) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div
			data-slot="chain-of-thought"
			className={cn("my-1.5 overflow-hidden rounded-[8px] border border-fr-border-soft bg-fr-surface/40", className)}
		>
			<button
				type="button"
				onClick={() => setOpen(o => !o)}
				className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-fr-sm text-fr-text-3 transition-colors hover:text-fr-text-2"
			>
				<Icon name="list" size={12} strokeWidth={1.8} className="text-fr-text-3" />
				<span>{label ?? "Chain of thought"}</span>
				{count !== undefined && <span className="text-fr-text-3">({count})</span>}
				<Icon
					name="caretR"
					size={11}
					strokeWidth={2.2}
					className={cn("ml-auto transition-transform", open && "rotate-90")}
				/>
			</button>
			{open && <div className="border-t border-fr-border-soft px-2.5 py-1.5">{children}</div>}
		</div>
	);
}
