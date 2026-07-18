// AskFieldControl — native typed controls for the `ask` tool's FIELD vocabulary,
// and the generic control for any OTHER host-UI `input` request that carries no
// typed field spec at all (e.g. the `/goal` and TTSR-amend slash commands' plain
// `ui.input()` prompts — see InputRequestCard's `text` fallback).
// When an `input`/`select` host-UI request carries `_meta["example/dialog"].field`
// (the fork's typed-field extension), the plain text box / option list is
// replaced by a real control: a text input, a number input with stepper +
// min/max/step + unit suffix, the shared @fraym/ui Slider, a Switch toggle, or
// a tags chip picker.
//
// The `ask` TOOL specifically never sends `field.type: "text"` (removed from
// its schema) — and as of 2026-07-18 the engine REJECTS `options: []` too
// (free-text-only questions are banned; candidates + the automatic "Other"
// row carry custom input). The empty-options render path below survives as
// backward compat for pre-ruling engines, which may still send it. `text`
// survives here ONLY for the non-`ask` callers above, which have no
// candidate-options concept to fall back to.
//
// It is placement-agnostic and self-contained (question header + control +
// Cancel/Submit footer + Esc-to-cancel), so it drops into the modal HostUiDialog
// (text/number/slider/tags ride `input`) and the docked select surface (toggle
// rides `select`) alike.
//
// Wire contract (frozen — no protocol changes): every field answers the SAME
// shape the plain control would, i.e. `{ requestId, value: string }`. Numbers
// and slider values submit their string form; a toggle submits the raw select
// option label ("Yes"/"No") so the TUI and web paths are byte-identical.

import { useEffect, useState } from "react";
import { Badge } from "../../elements/badge";
import { Button } from "../../elements/button";
import { IconButton } from "../../elements/icon-button";
import { Input } from "../../elements/input";
import { Kbd } from "../../elements/kbd";
import { Slider } from "../../elements/slider";
import { Switch } from "../../elements/switch";
import { Icon } from "../../icons/icon";
import { cn } from "../../lib/cn";

/** The five typed controls this component can render. */
export type AskFieldType = "text" | "number" | "toggle" | "slider" | "tags";

/** Parsed `_meta["example/dialog"].field` payload — the typed-field contract. */
export interface AskField {
	readonly type: AskFieldType;
	/** Text placeholder (text / tags fields). */
	readonly placeholder?: string;
	/** Numeric bounds (number | slider). */
	readonly min?: number;
	readonly max?: number;
	readonly step?: number;
	/** Seed value: string (text), number (number/slider), boolean (toggle), comma-joined string (tags). */
	readonly default?: string | number | boolean;
	/** Display suffix rendered after the value, e.g. "px" (number | slider). */
	readonly unit?: string;
	/** Suggested chips the user can toggle (tags). */
	readonly suggestions?: readonly string[];
}

const SLIDER_DEFAULT_MIN = 0;
const SLIDER_DEFAULT_MAX = 100;
const TOGGLE_ON_DEFAULT = "Yes";
const TOGGLE_OFF_DEFAULT = "No";

/** Narrow a wire value to a finite number (accepts numeric strings). */
function toNumber(value: unknown): number | undefined {
	if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function toString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function toDefault(value: unknown): string | number | boolean | undefined {
	return typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))
		? value
		: undefined;
}

/** Decimal places implied by a step like 0.05 → 2, so a snapped value reads cleanly. */
function precisionOf(step: number): number {
	if (!Number.isFinite(step) || Math.floor(step) === step) return 0;
	const text = String(step);
	const dot = text.indexOf(".");
	return dot < 0 ? 0 : text.length - dot - 1;
}

/** Clamp to `[min, max]` (each optional) and snap to `step` from `min` (or 0). */
function clampNumber(
	value: number,
	min: number | undefined,
	max: number | undefined,
	step: number | undefined,
): number {
	let next = value;
	if (step !== undefined && step > 0) {
		const base = min ?? 0;
		next = Math.round((next - base) / step) * step + base;
	}
	if (min !== undefined) next = Math.max(min, next);
	if (max !== undefined) next = Math.min(max, next);
	return Number(next.toFixed(precisionOf(step ?? 1)));
}

/** Read + validate the typed-field payload off a request's dialog meta. */
export function readDialogField(meta: Readonly<Record<string, unknown>> | undefined): AskField | null {
	const dialog = meta?.["example/dialog"];
	const raw = dialog && typeof dialog === "object" ? (dialog as Record<string, unknown>).field : undefined;
	if (!raw || typeof raw !== "object") return null;
	const field = raw as Record<string, unknown>;
	const type = field.type;
	if (type !== "text" && type !== "number" && type !== "toggle" && type !== "slider" && type !== "tags") return null;
	const placeholder = toString(field.placeholder);
	const min = toNumber(field.min);
	const max = toNumber(field.max);
	const step = toNumber(field.step);
	const defaultValue = toDefault(field.default);
	const unit = toString(field.unit);
	const suggestions = Array.isArray(field.suggestions)
		? field.suggestions.filter((entry): entry is string => typeof entry === "string")
		: undefined;
	return {
		type,
		...(placeholder === undefined ? {} : { placeholder }),
		...(min === undefined ? {} : { min }),
		...(max === undefined ? {} : { max }),
		...(step === undefined ? {} : { step }),
		...(defaultValue === undefined ? {} : { default: defaultValue }),
		...(unit === undefined ? {} : { unit }),
		...(suggestions === undefined ? {} : { suggestions }),
	};
}

export interface AskFieldControlProps {
	readonly question: string;
	/** Multi-question progress, e.g. "2/4". */
	readonly progress?: string;
	readonly field: AskField;
	/** Seed string (e.g. the request's initialValue); overrides `field.default`. */
	readonly initialValue?: string;
	/** Toggle only: the raw labels to SUBMIT for on/off (byte-compatible with the
	 *  select contract). Defaults to "Yes"/"No". */
	readonly toggleSubmit?: { readonly on: string; readonly off: string };
	/** Answer the request — always the plain-control shape (`value: string`). */
	readonly onSubmit: (value: string) => void;
	readonly onCancel: () => void;
	readonly className?: string;
}

function FieldFooter({ onCancel, onSubmit }: { readonly onCancel: () => void; readonly onSubmit: () => void }) {
	return (
		<div className="flex items-center justify-end gap-2 px-0.5">
			<Button variant="ghost" size="sm" onClick={onCancel}>
				Cancel
				<Kbd>Esc</Kbd>
			</Button>
			<Button size="sm" onClick={onSubmit}>
				Submit
				<Kbd>⏎</Kbd>
			</Button>
		</div>
	);
}

function TextField({
	field,
	initialValue,
	onSubmit,
	onCancel,
}: {
	readonly field: AskField;
	readonly initialValue?: string;
	readonly onSubmit: (value: string) => void;
	readonly onCancel: () => void;
}) {
	const seed = initialValue ?? (field.default !== undefined ? String(field.default) : "");
	const [text, setText] = useState(seed);
	const submit = () => onSubmit(text);
	return (
		<>
			<Input
				autoFocus
				value={text}
				placeholder={field.placeholder}
				onChange={event => setText(event.target.value)}
				onKeyDown={event => {
					if (event.key === "Enter") {
						event.preventDefault();
						submit();
					}
				}}
			/>
			<FieldFooter onCancel={onCancel} onSubmit={submit} />
		</>
	);
}

function NumberField({
	field,
	initialValue,
	onSubmit,
	onCancel,
}: {
	readonly field: AskField;
	readonly initialValue?: string;
	readonly onSubmit: (value: string) => void;
	readonly onCancel: () => void;
}) {
	const { min, max } = field;
	const step = field.step && field.step > 0 ? field.step : 1;
	const seed = toNumber(initialValue) ?? toNumber(field.default) ?? min ?? 0;
	const [text, setText] = useState(() => String(clampNumber(seed, min, max, step)));
	const current = toNumber(text) ?? min ?? 0;
	const stepBy = (direction: 1 | -1) => setText(String(clampNumber(current + direction * step, min, max, step)));
	const submit = () => onSubmit(String(clampNumber(toNumber(text) ?? min ?? 0, min, max, step)));
	return (
		<>
			<div className="flex items-stretch gap-2">
				<div className="relative flex-1">
					<Input
						autoFocus
						inputMode="decimal"
						value={text}
						placeholder={field.placeholder}
						onChange={event => setText(event.target.value)}
						onBlur={() => setText(String(clampNumber(toNumber(text) ?? min ?? 0, min, max, step)))}
						onKeyDown={event => {
							if (event.key === "Enter") {
								event.preventDefault();
								submit();
							} else if (event.key === "ArrowUp") {
								event.preventDefault();
								stepBy(1);
							} else if (event.key === "ArrowDown") {
								event.preventDefault();
								stepBy(-1);
							}
						}}
						className={cn("tabular-nums", field.unit && "pr-10")}
					/>
					{field.unit && (
						<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-secondary text-fr-xs text-fr-text-3">
							{field.unit}
						</span>
					)}
				</div>
				<div className="flex flex-col gap-1">
					<IconButton
						variant="surface"
						aria-label="Increment"
						className="size-5 rounded-md"
						onClick={() => stepBy(1)}
					>
						<Icon name="plus" size={13} />
					</IconButton>
					<IconButton
						variant="surface"
						aria-label="Decrement"
						className="size-5 rounded-md"
						onClick={() => stepBy(-1)}
					>
						<Icon name="minus" size={13} />
					</IconButton>
				</div>
			</div>
			<FieldFooter onCancel={onCancel} onSubmit={submit} />
		</>
	);
}

function SliderField({
	question,
	field,
	initialValue,
	onSubmit,
	onCancel,
}: {
	readonly question: string;
	readonly field: AskField;
	readonly initialValue?: string;
	readonly onSubmit: (value: string) => void;
	readonly onCancel: () => void;
}) {
	const min = field.min ?? SLIDER_DEFAULT_MIN;
	const max = field.max ?? SLIDER_DEFAULT_MAX;
	const step = field.step && field.step > 0 ? field.step : 1;
	const seed = toNumber(initialValue) ?? toNumber(field.default) ?? min;
	const [value, setValue] = useState(() => clampNumber(seed, min, max, step));
	const format = (n: number) => (field.unit ? `${n} ${field.unit}` : String(n));
	return (
		<>
			<Slider
				value={value}
				onValueChange={setValue}
				min={min}
				max={max}
				step={step}
				aria-label={question}
				formatValue={format}
			/>
			<FieldFooter onCancel={onCancel} onSubmit={() => onSubmit(String(clampNumber(value, min, max, step)))} />
		</>
	);
}

function ToggleField({
	question,
	field,
	toggleSubmit,
	onSubmit,
	onCancel,
}: {
	readonly question: string;
	readonly field: AskField;
	readonly toggleSubmit?: { readonly on: string; readonly off: string };
	readonly onSubmit: (value: string) => void;
	readonly onCancel: () => void;
}) {
	const onValue = toggleSubmit?.on ?? TOGGLE_ON_DEFAULT;
	const offValue = toggleSubmit?.off ?? TOGGLE_OFF_DEFAULT;
	const [on, setOn] = useState(field.default === true);
	return (
		<>
			<div className="flex items-center justify-between gap-3 rounded-[10px] border border-fr-border-soft bg-fr-surface-2/40 px-3.5 py-3">
				<span className="font-primary text-fr-sm font-medium text-fr-text tabular-nums">
					{on ? onValue : offValue}
				</span>
				<Switch checked={on} onCheckedChange={setOn} aria-label={question} />
			</div>
			<FieldFooter onCancel={onCancel} onSubmit={() => onSubmit(on ? onValue : offValue)} />
		</>
	);
}

/**
 * Tags — a LIST answer: suggested chips toggle on/off, a free-entry row adds
 * the user's own (Enter or the add button), picked chips are removable. Submits
 * the picked set comma-joined, so the wire stays the plain-control `value:
 * string` shape. This is the control that replaces every "comma-separated"
 * text question.
 */
function TagsField({
	field,
	initialValue,
	onSubmit,
	onCancel,
}: {
	readonly field: AskField;
	readonly initialValue?: string;
	readonly onSubmit: (value: string) => void;
	readonly onCancel: () => void;
}) {
	const seedRaw = initialValue ?? (typeof field.default === "string" ? field.default : "");
	const [picked, setPicked] = useState<readonly string[]>(() =>
		seedRaw
			.split(",")
			.map(entry => entry.trim())
			.filter(entry => entry.length > 0),
	);
	const [draft, setDraft] = useState("");
	const toggle = (tag: string) =>
		setPicked(current => (current.includes(tag) ? current.filter(entry => entry !== tag) : [...current, tag]));
	const addDraft = () => {
		const tag = draft.trim();
		setDraft("");
		if (!tag || picked.includes(tag)) return;
		setPicked(current => [...current, tag]);
	};
	const suggestions = field.suggestions ?? [];
	const customPicked = picked.filter(tag => !suggestions.includes(tag));
	return (
		<>
			{(suggestions.length > 0 || customPicked.length > 0) && (
				<div className="flex flex-wrap gap-1.5">
					{suggestions.map(tag => {
						const on = picked.includes(tag);
						return (
							<button
								key={tag}
								type="button"
								data-slot="ask-tag"
								data-state={on ? "on" : "off"}
								onClick={() => toggle(tag)}
								className={cn(
									"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-secondary text-fr-xs transition-colors",
									on
										? "border-fr-accent-line bg-fr-accent-dim text-fr-accent"
										: "border-fr-border-soft bg-fr-surface-2/40 text-fr-text-2 hover:border-fr-border hover:text-fr-text",
								)}
							>
								<Icon name={on ? "check" : "plus"} size={11} strokeWidth={2} className="shrink-0 opacity-80" />
								{tag}
							</button>
						);
					})}
					{customPicked.map(tag => (
						<button
							key={tag}
							type="button"
							data-slot="ask-tag"
							data-state="on"
							onClick={() => toggle(tag)}
							className="inline-flex items-center gap-1.5 rounded-full border border-fr-accent-line bg-fr-accent-dim px-3 py-1 font-secondary text-fr-xs text-fr-accent"
						>
							<Icon name="x" size={11} strokeWidth={2} className="shrink-0 opacity-80" />
							{tag}
						</button>
					))}
				</div>
			)}
			<div className="flex items-center gap-2">
				<Input
					value={draft}
					placeholder={field.placeholder ?? "Add your own…"}
					onChange={event => setDraft(event.target.value)}
					onKeyDown={event => {
						if (event.key === "Enter") {
							event.preventDefault();
							addDraft();
						}
					}}
				/>
				<IconButton aria-label="Add tag" onClick={addDraft}>
					<Icon name="plus" size={14} strokeWidth={2} />
				</IconButton>
			</div>
			<FieldFooter onCancel={onCancel} onSubmit={() => onSubmit(picked.join(", "))} />
		</>
	);
}

/**
 * Render the native control for a typed `ask` field. Placement-agnostic and
 * self-contained; the caller wires `onSubmit`/`onCancel` to the host-UI response.
 */
export function AskFieldControl({
	question,
	progress,
	field,
	initialValue,
	toggleSubmit,
	onSubmit,
	onCancel,
	className,
}: AskFieldControlProps) {
	// Esc cancels — matches AskPicker / HostUiDialog. The host shells suppress
	// their own Esc handler when a field is present so this is the only one.
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onCancel();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onCancel]);

	return (
		<div data-slot="ask-field-control" data-field-type={field.type} className={cn("flex flex-col gap-3", className)}>
			<div className="flex items-center gap-2 px-0.5">
				{progress && (
					<Badge variant="soft" tone="mute">
						{progress}
					</Badge>
				)}
				<span className="font-primary text-fr-base font-semibold text-fr-text">{question}</span>
			</div>
			{field.type === "text" && (
				<TextField field={field} {...(initialValue === undefined ? {} : { initialValue })} onSubmit={onSubmit} onCancel={onCancel} />
			)}
			{field.type === "number" && (
				<NumberField field={field} {...(initialValue === undefined ? {} : { initialValue })} onSubmit={onSubmit} onCancel={onCancel} />
			)}
			{field.type === "slider" && (
				<SliderField
					question={question}
					field={field}
					{...(initialValue === undefined ? {} : { initialValue })}
					onSubmit={onSubmit}
					onCancel={onCancel}
				/>
			)}
			{field.type === "toggle" && (
				<ToggleField
					question={question}
					field={field}
					{...(toggleSubmit === undefined ? {} : { toggleSubmit })}
					onSubmit={onSubmit}
					onCancel={onCancel}
				/>
			)}
			{field.type === "tags" && (
				<TagsField field={field} {...(initialValue === undefined ? {} : { initialValue })} onSubmit={onSubmit} onCancel={onCancel} />
			)}
		</div>
	);
}
