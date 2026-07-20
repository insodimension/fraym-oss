import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Badge } from "../elements/badge";
import { Button } from "../elements/button";
import { IconButton } from "../elements/icon-button";
import { Input } from "../elements/input";
import { Kbd } from "../elements/kbd";
import { Icon } from "../icons";
import { cn } from "../lib/cn";

// AskPicker — the live interactive picker for the `ask` tool. Presentational
// only: it renders a question, a list of options with real radio/checkbox
// indicators (descriptions + a Recommended badge), an optional inline "Other"
// free-text row, and Back / Cancel / Continue controls, and emits semantic
// events. The feature layer wires it to the host-UI request.
//
// Interaction contract:
//   - Hover only highlights a row (never selects/commits).
//   - Single-select: click, number key (1–9), or ↑/↓ + Enter COMMITS an option
//     immediately — there is no separate confirm step, so no primary button is
//     shown (a disabled "Continue" that never enables was the old P0 trap).
//     The keyboard cursor starts on the Recommended option so a bare Enter
//     accepts the default.
//   - Multi-select: click / number / Enter TOGGLES a checkbox; the primary
//     "Continue · N" button (or Enter from anywhere once N > 0) commits the set.
//   - "Other" is an inline input; Enter (or Submit) sends the typed text.
//   - Esc cancels.

export interface AskPickerOption {
	readonly label: string;
	readonly description?: string;
	/** Show a "Recommended" badge (and seed the keyboard cursor). */
	readonly recommended?: boolean;
	/** Checkbox state (multi-select only). */
	readonly checked?: boolean;
}

export interface AskPickerProps {
	readonly question: string;
	/** Multi-question progress, e.g. "1/3". */
	readonly progress?: string;
	readonly options: readonly AskPickerOption[];
	/** Checkbox (multi) vs radio (single, default). */
	readonly multiple?: boolean;
	/** Render the inline "Other (type your own)" free-text row. */
	readonly allowOther?: boolean;
	readonly otherPlaceholder?: string;
	/** Show the Back control (multi-question, not the first question). */
	readonly canBack?: boolean;
	/** Show the Next/skip control (multi-question forward navigation —
	 *  advances keeping the question's previous answer, like the TUI's →). */
	readonly canForward?: boolean;
	/** Seed the keyboard cursor (e.g. a re-visited question's previous answer);
	 *  falls back to the Recommended option. */
	readonly initialCursor?: number;
	/** A listed option was chosen (single: commit; multi: toggle). */
	readonly onChoose: (index: number) => void;
	/** The inline "Other" free-text answer was submitted. */
	readonly onSubmitOther?: (text: string) => void;
	/** Multi-select: commit the current checkbox selection. */
	readonly onDone?: () => void;
	readonly onBack?: () => void;
	readonly onForward?: () => void;
	readonly onCancel: () => void;
	readonly className?: string;
}

/** Radio circle / checkbox square — the selection indicator that was missing
 *  from v1 (checked rows only tinted, which read as "highlighted", not
 *  "selected"). Checked fills with the accent and draws the glyph in ink. */
function SelectionMarker({ multiple, checked }: { readonly multiple: boolean; readonly checked: boolean }) {
	return (
		<span
			aria-hidden
			data-slot="ask-marker"
			data-checked={checked || undefined}
			className={cn(
				"mt-0.5 flex size-4 shrink-0 items-center justify-center border",
				"transition-[border-color,background-color,transform] duration-[var(--fr-motion-fast)] ease-[var(--fr-ease-standard)]",
				multiple ? "rounded-[5px]" : "rounded-full",
				checked
					? "scale-100 border-fr-accent bg-fr-accent text-fr-accent-ink"
					: "border-fr-border bg-fr-surface-2 group-hover:border-fr-text-3 group-hover:bg-fr-surface-3",
			)}
		>
			{multiple ? (
				<svg
					viewBox="0 0 10 10"
					className={cn(
						"size-2.5 transition-[opacity,transform] duration-[var(--fr-motion-fast)] ease-[var(--fr-ease-emphasized)]",
						checked ? "scale-100 opacity-100" : "scale-50 opacity-0",
					)}
				>
					<path
						d="M1.5 5.2 4 7.6 8.5 2.6"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.7"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			) : (
				<span
					className={cn(
						"size-1.5 rounded-full bg-current transition-[opacity,transform] duration-[var(--fr-motion-fast)] ease-[var(--fr-ease-emphasized)]",
						checked ? "scale-100 opacity-100" : "scale-50 opacity-0",
					)}
				/>
			)}
		</span>
	);
}

function NumberBadge({ n }: { readonly n: number }) {
	return (
		<span className="shrink-0 self-center rounded-[6px] border border-fr-border-soft px-1.5 py-0.5 text-center font-secondary text-fr-2xs text-fr-text-3 tabular-nums transition-colors duration-[var(--fr-motion-fast)] group-hover:border-fr-border group-hover:text-fr-text-2">
			{n}
		</span>
	);
}

export function AskPicker({
	question,
	progress,
	options,
	multiple = false,
	allowOther = false,
	otherPlaceholder = "Type your own answer here",
	canBack = false,
	canForward = false,
	initialCursor,
	onChoose,
	onSubmitOther,
	onDone,
	onBack,
	onForward,
	onCancel,
	className,
}: AskPickerProps) {
	const count = options.length;
	// Keyboard cursor for ↑/↓ + Enter. Starts on the caller's seed (a re-visited
	// question's previous answer) or the Recommended option, so a bare Enter
	// re-confirms/accepts; otherwise -1 so nothing looks selected until the user
	// navigates (hover never moves it).
	const recommendedIndex = useMemo(() => options.findIndex(option => option.recommended), [options]);
	const [cursor, setCursor] = useState(
		initialCursor !== undefined && initialCursor >= 0 && initialCursor < count ? initialCursor : recommendedIndex,
	);
	const [otherText, setOtherText] = useState("");
	const otherInputRef = useRef<HTMLInputElement | null>(null);
	// Collapse to a header-only strip so the transcript/content BEHIND the docked question stays
	// readable while deciding (the panel otherwise fully overlays it). State (cursor, typed "Other")
	// is preserved — the body is display:none'd, not unmounted — and the dock height morphs to fit.
	const [collapsed, setCollapsed] = useState(false);

	// Multi-select can only be committed once something is checked.
	const selectedCount = options.filter(option => option.checked).length;

	const submitOther = () => {
		const text = otherText.trim();
		if (text) onSubmitOther?.(text);
	};

	const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
		if (event.key === "Escape") {
			event.preventDefault();
			onCancel();
			return;
		}
		// While collapsed the body is hidden (peek mode): swallow nav/commit keys, but keep Esc.
		if (collapsed) return;
		const el = document.activeElement as HTMLElement | null;
		const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
		if (typing) return;
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setCursor(current => Math.min((current < 0 ? -1 : current) + 1, count - 1));
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setCursor(current => Math.max((current < 0 ? count : current) - 1, 0));
		} else if (event.key === "ArrowLeft" && canBack && onBack) {
			// TUI parity: ←/→ step between the questions of a multi-question ask.
			event.preventDefault();
			onBack();
		} else if (event.key === "ArrowRight" && canForward && onForward) {
			event.preventDefault();
			onForward();
		} else if (event.key === "Enter") {
			event.preventDefault();
			if (multiple) {
				// Enter commits the set (when non-empty); toggling is click/number/space.
				if (selectedCount > 0) onDone?.();
			} else if (cursor >= 0 && cursor < count) {
				onChoose(cursor);
			}
		} else if (event.key === " " && multiple && cursor >= 0 && cursor < count) {
			event.preventDefault();
			onChoose(cursor);
		} else if (/^[1-9]$/.test(event.key)) {
			const index = Number(event.key) - 1;
			if (index >= 0 && index < count) {
				event.preventDefault();
				onChoose(index);
			} else if (index === count && allowOther) {
				event.preventDefault();
				otherInputRef.current?.focus();
			}
		}
	});

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const primaryAction = multiple ? (
		<Button size="sm" disabled={selectedCount === 0} onClick={() => onDone?.()}>
			Continue
			{selectedCount > 0 && <span className="tabular-nums opacity-80">· {selectedCount}</span>}
			<Kbd>⏎</Kbd>
		</Button>
	) : allowOther && otherText.trim() ? (
		<Button size="sm" onClick={submitOther}>
			Submit
			<Kbd>⏎</Kbd>
		</Button>
	) : null;

	return (
		<div data-slot="ask-picker" className={cn("relative flex flex-col gap-3", className)}>
			<div className="flex flex-col gap-1 px-0.5 pr-9">
				<div className="flex items-center gap-2">
					{progress && (
						<Badge variant="soft" tone="mute">
							{progress}
						</Badge>
					)}
					<span className={cn("font-primary text-fr-base font-semibold text-fr-text", collapsed && "fr-overflow")}>
						{question}
					</span>
				</div>
				{multiple && !collapsed && (
					<p className="font-secondary text-fr-xs text-fr-text-3">
						Select all that apply
						{selectedCount > 0 && (
							<span className="text-fr-text-2">
								{" "}
								· <span className="tabular-nums">{selectedCount}</span> selected
							</span>
						)}
					</p>
				)}
			</div>

			{/* Discrete rounded rows with breathing room — each choice is its own
			 * surface (border + tier step on hover, accent hairline when checked or
			 * under the keyboard cursor, a soft press-down on click). The old flush
			 * divided list read as fragile: hairline dividers + alpha fills shifting
			 * under the pointer. Every state rides --fr-motion-fast/ease-standard. */}
			<div
				className={cn(
					"flex max-h-[min(46vh,360px)] flex-col gap-1.5 overflow-y-auto overflow-x-hidden pr-0.5",
					collapsed && "hidden",
				)}
			>
				{options.map((option, index) => (
					<button
						key={`${index}-${option.label}`}
						type="button"
						data-cursor={index === cursor || undefined}
						aria-pressed={multiple ? option.checked === true : undefined}
						onClick={() => onChoose(index)}
						className={cn(
							"group flex w-full items-start gap-3 rounded-[10px] border px-3.5 py-2.5 text-left",
							"transition-[background-color,border-color,transform] duration-[var(--fr-motion-fast)] ease-[var(--fr-ease-standard)]",
							option.checked
								? "border-fr-accent-line bg-fr-accent-dim/50 hover:bg-fr-accent-dim/70"
								: "border-fr-border-soft bg-fr-surface-2/40 hover:border-fr-border hover:bg-fr-surface-2",
							index === cursor && !option.checked && "border-fr-border bg-fr-surface-2",
							index === cursor && "border-fr-accent-line",
							"active:scale-[0.99]",
						)}
					>
						<SelectionMarker multiple={multiple} checked={option.checked === true} />
						<span className="min-w-0 flex-1">
							<span className="flex flex-wrap items-center gap-1.5">
								<span className="font-primary text-fr-sm font-medium text-fr-text">{option.label}</span>
								{option.recommended && (
									<Badge variant="soft" tone="accent">
										Recommended
									</Badge>
								)}
							</span>
							{option.description && (
								<span className="mt-0.5 block font-secondary text-fr-xs text-fr-text-3 transition-colors duration-[var(--fr-motion-fast)] group-hover:text-fr-text-2">
									{option.description}
								</span>
							)}
						</span>
						<NumberBadge n={index + 1} />
					</button>
				))}

				{allowOther && (
					// biome-ignore lint/a11y/noStaticElementInteractions: click is a convenience focus-forward; the input itself is the accessible control.
					<div
						className="group cursor-text rounded-[10px] border border-fr-border-soft bg-fr-surface-2/40 px-3.5 py-2.5 transition-[background-color,border-color] duration-[var(--fr-motion-fast)] ease-[var(--fr-ease-standard)] hover:border-fr-border hover:bg-fr-surface-2 focus-within:border-fr-accent-line"
						onClick={() => otherInputRef.current?.focus()}
					>
						<div className="flex items-center justify-between gap-3">
							<span className="font-primary text-fr-sm font-medium text-fr-text">Other</span>
							<NumberBadge n={count + 1} />
						</div>
						<Input
							ref={otherInputRef}
							value={otherText}
							placeholder={otherPlaceholder}
							onChange={event => setOtherText(event.target.value)}
							onKeyDown={event => {
								if (event.key === "Enter") {
									event.preventDefault();
									submitOther();
								}
							}}
							className="mt-2"
						/>
					</div>
				)}
			</div>

			<div className={cn("flex items-center justify-between gap-2 px-0.5", collapsed && "hidden")}>
				<div className="flex items-center gap-1">
					{canBack && onBack && (
						<Button variant="ghost" size="sm" onClick={onBack}>
							← Back
						</Button>
					)}
					{canForward && onForward && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onForward}
							title="Skip ahead — keeps this question's previous answer"
						>
							Next →
						</Button>
					)}
					{!multiple && !primaryAction && (
						<span className="pl-1 font-secondary text-fr-2xs text-fr-text-3">
							Click an option or press <Kbd>1</Kbd>–<Kbd>{Math.min(count, 9)}</Kbd> to answer
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" onClick={onCancel}>
						Cancel
						<Kbd>Esc</Kbd>
					</Button>
					{primaryAction}
				</div>
			</div>
			{/* Collapse toggle — rendered LAST (absolute, top-right) so the option buttons stay the
			 * leading buttons under [data-slot="ask-picker"] (index-based selection contract). */}
			<IconButton
				variant="chrome"
				aria-label={collapsed ? "Expand question" : "Collapse question to see content behind"}
				title={collapsed ? "Expand" : "Collapse"}
				onClick={() => setCollapsed(value => !value)}
				className="absolute top-0 right-0 shrink-0"
			>
				<Icon
					name="caretD"
					size={16}
					className={cn("transition-transform duration-150", !collapsed && "rotate-180")}
				/>
			</IconButton>
		</div>
	);
}
