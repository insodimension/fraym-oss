// Bridges a driver `select` host-UI request to the presentational AskPicker
// library component. This is the ONE adapter both surfaces use (the docked live
// picker in `ConnectedSelectDialog` and the modal `HostUiDialog`), so there is no
// bespoke picker UI anywhere — only AskPicker.
//
// Inline "Other": AskPicker's free-text row submits the typed text, which we send
// as the select answer directly. Engine's `ask` accepts any value as the answer (its
// `else` branch), so this avoids the separate `ui.editor` follow-up entirely — no
// 2-step, no deadlock.

import type { HostUiRequest as DriverHostUiRequest, HostUiResponse, HostUiSelectOption } from "@fraym-ai/driver";
import { useEffect, useState } from "react";
import { AskPicker, type AskPickerOption } from "../../components/ask-picker";
import { AskFieldControl, readDialogField } from "./ask-field-control";

export type SelectHostUiRequest = Extract<DriverHostUiRequest, { kind: "select" }>;
export type InputHostUiRequest = Extract<DriverHostUiRequest, { kind: "input" }>;

// Engine bakes this into the recommended option's label (single-select).
const RECOMMENDED_SUFFIX = " (Recommended)";

function optionLabel(option: string | HostUiSelectOption): string {
	return typeof option === "string" ? option : option.label;
}

function optionDescription(option: string | HostUiSelectOption): string | undefined {
	return typeof option === "string" ? undefined : option.description;
}

// Engine's freeform row (tools/ask.ts `OTHER_OPTION = "Other (type your own)"`). It may
// arrive as a trailing action (markableCount conveyed) OR inline among the options (the
// ACP elicitation path drops markableCount). Either way it must render as the inline
// free-text row, never a button — clicking the button triggers Engine's separate `editor`
// popup, whereas typing in place submits the answer directly (Engine accepts any value).
function isOtherOption(label: string): boolean {
	return /type your own/i.test(label) || /^other$/i.test(label.trim());
}

/**
 * A stable mount key for legacy checkbox-marked `ui.select` requests. Engine
 * re-emits the same checkbox question as a fresh request id on every toggle, so
 * the key follows the question identity (title + option set) instead of the
 * changing request id/checked indices.
 */
export function hostUiInstanceKey(request: DriverHostUiRequest): string {
	if (request.kind === "select" && request.selectionMarker === "checkbox") {
		return `select-multi\u0000${request.title}\u0000${request.options.map(optionLabel).join("\u0000")}`;
	}
	return request.requestId;
}

/** Rich option rows Engine rides on `_meta["fraym/dialog"].options` — enum
 * elicitations flatten options to bare labels, so descriptions only survive
 * the wire here. Keyed by (suffixed) label; missing/malformed meta = empty. */
function dialogMetaDescriptions(request: SelectHostUiRequest): ReadonlyMap<string, string> {
	const dialog = request.meta?.["fraym/dialog"];
	const rows = dialog && typeof dialog === "object" ? (dialog as Record<string, unknown>).options : undefined;
	if (!Array.isArray(rows)) return new Map();
	const byLabel = new Map<string, string>();
	for (const raw of rows) {
		if (!raw || typeof raw !== "object") continue;
		const { label, description } = raw as Record<string, unknown>;
		if (typeof label === "string" && typeof description === "string" && description) byLabel.set(label, description);
	}
	return byLabel;
}

/** Engine appends multi-question progress to the prompt as a trailing " (N/M)",
 * and its legacy per-toggle checkbox loop prefixes "(N selected) ". Strip both
 * so the card renders the bare question (the picker shows its own count). */
function splitTitleProgress(title: string): { readonly title: string; readonly progress?: string } {
	const match = title.match(/^(.*?)\s*\((\d+\/\d+)\)\s*$/);
	const bare = (match?.[1] ?? title).replace(/^\(\d+ selected\)\s*/, "");
	return match ? { title: bare, progress: match[2] } : { title: bare };
}

export interface SelectRequestPickerProps {
	readonly request: SelectHostUiRequest;
	readonly onRespond: (response: HostUiResponse) => void;
	readonly className?: string;
}
// ── Unsubmitted-pick persistence ─────────────────────────────────────────────
// A multi question's checkbox state is CLIENT-LOCAL until Continue — a refresh
// or remount used to reset it. Persist it per question identity (localStorage;
// request ids change across replays, the question doesn't), restore on mount,
// clear once the question is actually answered/cancelled (navigation keeps it:
// Back then Forward returns to the same half-finished state).
const PICKS_PREFIX = "fraym.ask.picks:";
const PICKS_TTL_MS = 24 * 60 * 60 * 1000;

function pickStorage(): Storage | null {
	try {
		return typeof localStorage === "undefined" ? null : localStorage;
	} catch {
		return null;
	}
}

function picksKey(request: SelectHostUiRequest): string {
	return `${PICKS_PREFIX}${request.title}\u0000${request.options.map(optionLabel).join("\u0000")}`;
}

function loadStoredPicks(key: string): ReadonlySet<number> | null {
	const storage = pickStorage();
	if (!storage) return null;
	try {
		const raw = storage.getItem(key);
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object" || !("t" in parsed) || !("picks" in parsed)) return null;
		if (typeof parsed.t !== "number" || Date.now() - parsed.t > PICKS_TTL_MS) {
			storage.removeItem(key);
			return null;
		}
		if (!Array.isArray(parsed.picks)) return null;
		return new Set(parsed.picks.filter((index): index is number => Number.isInteger(index)));
	} catch {
		return null;
	}
}

function saveStoredPicks(key: string, picks: ReadonlySet<number>): void {
	const storage = pickStorage();
	if (!storage) return;
	try {
		if (picks.size === 0) storage.removeItem(key);
		else storage.setItem(key, JSON.stringify({ t: Date.now(), picks: [...picks] }));
		// Lazy prune: drop expired siblings so abandoned questions don't accrete.
		const now = Date.now();
		for (let i = storage.length - 1; i >= 0; i--) {
			const siblingKey = storage.key(i);
			if (!siblingKey?.startsWith(PICKS_PREFIX) || siblingKey === key) continue;
			const raw = storage.getItem(siblingKey);
			if (!raw) continue;
			try {
				const parsed: unknown = JSON.parse(raw);
				const fresh =
					parsed && typeof parsed === "object" && "t" in parsed && typeof parsed.t === "number"
						? now - parsed.t <= PICKS_TTL_MS
						: false;
				if (!fresh) storage.removeItem(siblingKey);
			} catch {
				storage.removeItem(siblingKey);
			}
		}
	} catch {
		// Quota/serialization issues never break answering.
	}
}

function clearStoredPicks(key: string): void {
	try {
		pickStorage()?.removeItem(key);
	} catch {
		// Best effort.
	}
}

/**
 * Dispatcher: a toggle field (fork's typed-field extension, delivered as a
 * Yes/No `select`) renders the native Switch via {@link AskFieldControl}; every
 * other select renders the option list. Split so neither path runs the other's
 * hooks — a request never switches shape mid-life, but the instance can be
 * reused across requests.
 */
export function SelectRequestPicker({ request, onRespond, className }: SelectRequestPickerProps) {
	const field = readDialogField(request.meta);
	if (field?.type === "toggle") {
		const { title, progress } = splitTitleProgress(request.title);
		const on = optionLabel(request.options[0] ?? "Yes");
		const off = optionLabel(request.options[1] ?? "No");
		// Default: explicit boolean wins; else the engine's initialIndex (0 = on).
		const defaultOn = typeof field.default === "boolean" ? field.default : request.initialIndex === 0;
		return (
			<AskFieldControl
				question={title}
				progress={progress}
				field={{ ...field, default: defaultOn }}
				toggleSubmit={{ on, off }}
				onSubmit={value => onRespond({ requestId: request.requestId, value })}
				onCancel={() => onRespond({ requestId: request.requestId, cancelled: true })}
				className={className}
			/>
		);
	}
	return <SelectOptionsPicker request={request} onRespond={onRespond} className={className} />;
}

function SelectOptionsPicker({ request, onRespond, className }: SelectRequestPickerProps) {
	const singleSubmitMultiple = request.allowMultiple === true;
	const legacyCheckbox = !singleSubmitMultiple && request.selectionMarker === "checkbox";
	const markableCount = request.markableCount ?? request.options.length;
	const markable = request.options.slice(0, markableCount);
	const choices = singleSubmitMultiple ? markable : request.options;
	const trailing = singleSubmitMultiple ? request.options.slice(markableCount).map(optionLabel) : [];

	// Restore order: half-finished LOCAL picks (survives refresh/remount — the
	// strictly newest user intent) > the engine's previous-answer checkedIndices
	// (a re-visited, previously SUBMITTED question) > empty.
	const storageKey = picksKey(request);
	const [checked, setChecked] = useState<ReadonlySet<number>>(
		() => loadStoredPicks(storageKey) ?? new Set(request.checkedIndices ?? []),
	);
	useEffect(() => {
		setChecked(loadStoredPicks(storageKey) ?? new Set(request.checkedIndices ?? []));
	}, [storageKey, request.checkedIndices]);

	const otherIndex = singleSubmitMultiple ? -1 : choices.findIndex(option => isOtherOption(optionLabel(option)));
	const displayChoices = otherIndex >= 0 ? choices.filter((_, index) => index !== otherIndex) : choices;
	const allowOther = otherIndex >= 0 || trailing.some(isOtherOption);
	const rawLabels = displayChoices.map(optionLabel);
	const metaDescriptions = dialogMetaDescriptions(request);

	// `legacyCheckbox` marks Engine's per-toggle loop (one response per toggle);
	// `singleSubmitMultiple` is the modern one-shot checkbox form. Both render
	// checkboxes; a plain single-select never does.
	const multiple = singleSubmitMultiple || legacyCheckbox;
	// The engine's checkedIndices on a SINGLE-select re-visit mark the previous
	// answer — render it as the selected row (filled radio), not just a cursor.
	const previousAnswer = new Set(request.checkedIndices ?? []);
	const options: AskPickerOption[] = displayChoices.map((option, index) => {
		const raw = optionLabel(option);
		const recommended = raw.endsWith(RECOMMENDED_SUFFIX);
		return {
			label: recommended ? raw.slice(0, -RECOMMENDED_SUFFIX.length) : raw,
			description: optionDescription(option) ?? metaDescriptions.get(raw),
			recommended,
			checked: multiple && index < markableCount ? checked.has(index) : previousAnswer.has(index) || undefined,
		};
	});

	const { title, progress } = splitTitleProgress(request.title);

	// Answer + drop this question's stored picks — a resolved question keeps no
	// half-finished state. Navigation (back/forward) intentionally does NOT clear.
	const respondAndClear = (response: HostUiResponse) => {
		clearStoredPicks(storageKey);
		onRespond(response);
	};
	const toggle = (index: number) =>
		setChecked(prev => {
			const next = new Set(prev);
			if (next.has(index)) next.delete(index);
			else next.add(index);
			saveStoredPicks(storageKey, next);
			return next;
		});
	const choose = (index: number) => {
		if (singleSubmitMultiple) {
			toggle(index);
			return;
		}
		if (legacyCheckbox && index < markableCount) toggle(index);
		respondAndClear({ requestId: request.requestId, value: rawLabels[index] ?? "" });
	};

	return (
		<AskPicker
			key={hostUiInstanceKey(request)}
			question={title}
			progress={progress}
			options={options}
			multiple={singleSubmitMultiple}
			allowOther={allowOther}
			canBack={request.canNavigateBack}
			canForward={request.canNavigateForward}
			initialCursor={request.initialIndex}
			onChoose={choose}
			onSubmitOther={text => respondAndClear({ requestId: request.requestId, value: text })}
			onDone={() =>
				respondAndClear({
					requestId: request.requestId,
					values: rawLabels.filter((_, index) => checked.has(index)),
				})
			}
			onBack={() => onRespond({ requestId: request.requestId, navigate: "back" })}
			onForward={() => onRespond({ requestId: request.requestId, navigate: "forward" })}
			onCancel={() => respondAndClear({ requestId: request.requestId, cancelled: true })}
			className={className}
		/>
	);
}

export type { PermissionHostUiRequest } from "./permission-approval-card";

export type ConfirmHostUiRequest = Extract<DriverHostUiRequest, { kind: "confirm" }>;

export interface ConfirmRequestPickerProps {
	readonly request: ConfirmHostUiRequest;
	readonly onRespond: (response: HostUiResponse) => void;
	readonly className?: string;
}

/**
 * Bridges a `confirm` prompt to AskPicker as Confirm/Cancel choices.
 * `defaultValue` marks the recommended row; Esc cancels.
 */
export function ConfirmRequestPicker({ request, onRespond, className }: ConfirmRequestPickerProps) {
	const options: AskPickerOption[] = [
		{ label: "Confirm", recommended: request.defaultValue === true },
		{ label: "Cancel", recommended: request.defaultValue === false },
	];
	return (
		<AskPicker
			key={request.requestId}
			question={request.message || request.title}
			options={options}
			onChoose={index => onRespond({ requestId: request.requestId, confirmed: index === 0 })}
			onCancel={() => onRespond({ requestId: request.requestId, cancelled: true })}
			className={className}
		/>
	);
}

export interface InputRequestCardProps {
	readonly request: InputHostUiRequest;
	readonly onRespond: (response: HostUiResponse) => void;
	readonly className?: string;
}

/**
 * Docked `input` elicitation — the ask tool's text/number/slider questions (and
 * any plain input request) render INLINE above the composer with the same card
 * anatomy as the select picker: typed `field` meta gets its native control, a
 * bare input degrades to a text field. Every question type shares ONE surface —
 * never a popup.
 */
export function InputRequestCard({ request, onRespond, className }: InputRequestCardProps) {
	const { title, progress } = splitTitleProgress(request.title);
	const field = readDialogField(request.meta) ?? {
		type: "text" as const,
		...(request.placeholder ? { placeholder: request.placeholder } : {}),
	};
	return (
		<AskFieldControl
			key={request.requestId}
			question={title}
			progress={progress}
			field={field}
			initialValue={request.initialValue}
			onSubmit={value => onRespond({ requestId: request.requestId, value })}
			onCancel={() => onRespond({ requestId: request.requestId, cancelled: true })}
			className={className}
		/>
	);
}
