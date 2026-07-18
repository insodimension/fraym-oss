// `ask` tool renderer — the post-ask HISTORY card (the scrollback record AFTER
// the user answered). The live interactive picker is `HostUiDialog`; this card
// must NOT try to be a picker.
//
// Head: "Ask" label (chat ToolKind) + question-count / multi badges + stat.
// Body:
//   success → every offered option with its marker (selected = filled + `text-fr-add`,
//             unselected = dim), with descriptions + Recommended badge correlated
//             from the call INPUT (`AskToolDetails` only carries plain labels), plus
//             a distinct "✎ Custom" block for free-text answers AND typed-field
//             answers (number/slider/toggle/tags) — both share the same block
//             so a field question never falls through to "No selection".
//   multi   → one block per question (divider between), reusing the option renderer.
//   pending → a plain "Waiting for your answer…" placeholder (never the picker).
//   error   → a single error line.
//
// Beats the TUI tree view (`✓ Ask 2 questions`): the full answered option list
// with descriptions, not just the picked labels. See docs/design/tools/ask.md.

import type { ReactNode } from "react";
import { Badge } from "../../../elements/badge";
import { Checkbox } from "../../../elements/checkbox";
import { Radio } from "../../../elements/radio";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { cn } from "../../../lib/cn";
import { readField, readStringField } from "../../../registries/default-renderer-utils";
import type { ToolRenderer, ToolView } from "../../../registries/tool-renderer-registry";
import { ToolBodySection } from "../tool-body-card";
import { ToolBodyTerm, type ToolStatus } from "../tool-card";

// Engine bakes this into the recommended option's label; strip it for display.
const RECOMMENDED_SUFFIX = " (Recommended)";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AskOption {
	readonly label: string;
	readonly description?: string | undefined;
}

interface AskQuestion {
	readonly id: string;
	readonly question: string;
	readonly options?: readonly AskOption[] | undefined;
	readonly multi?: boolean | undefined;
	readonly recommended?: number | undefined;
}

/** Minimal shape of a typed FIELD spec (number/slider/toggle/tags) — only what
 *  formatting the answered value needs; the rest of `AskField` is irrelevant here. */
interface AskFieldMeta {
	readonly type?: string | undefined;
	readonly unit?: string | undefined;
}

/** A typed-field answer value: number/slider -> number, toggle -> boolean,
 *  tags -> comma-joined string. */
type AskFieldValue = string | number | boolean;

interface AskResult {
	readonly id: string;
	readonly question: string;
	readonly options: readonly string[];
	readonly multi: boolean;
	readonly selectedOptions: readonly string[];
	readonly customInput?: string | undefined;
	/** Present when this question was a typed field (mutually exclusive with options). */
	readonly field?: AskFieldMeta | undefined;
	readonly value?: AskFieldValue | undefined;
}

interface AskDetails {
	/** Single question mode */
	readonly question?: string | undefined;
	readonly options?: readonly string[] | undefined;
	readonly multi?: boolean | undefined;
	readonly selectedOptions?: readonly string[] | undefined;
	readonly customInput?: string | undefined;
	/** Multi-part question mode */
	readonly results?: readonly AskResult[] | undefined;
	/** Single-question field mode (mutually exclusive with options/selectedOptions). */
	readonly field?: AskFieldMeta | undefined;
	readonly value?: AskFieldValue | undefined;
}

/**
 * Per-label metadata recovered from the call INPUT — `AskToolDetails` only
 * carries plain option labels, so descriptions and the recommended index live
 * on the input questions.
 */
interface OptionMeta {
	readonly description?: string | undefined;
	readonly recommended?: boolean | undefined;
}

// ─── Defensive parse ────────────────────────────────────────────────────────

function readBoolField(value: unknown, key: string): boolean | undefined {
	const found = readField(value, key);
	return typeof found === "boolean" ? found : undefined;
}

function readArrayField<T>(value: unknown, key: string): readonly T[] | undefined {
	const found = readField(value, key);
	return Array.isArray(found) ? (found as readonly T[]) : undefined;
}

/** Parse an `AskFieldMeta` off a result/details object — only `type`/`unit` matter for display. */
function readFieldMeta(value: unknown, key: string): AskFieldMeta | undefined {
	const found = readField(value, key);
	if (!found || typeof found !== "object") return undefined;
	const type = readStringField(found, "type");
	const unit = readStringField(found, "unit");
	return type || unit ? { type, unit } : undefined;
}

/** Parse a typed-field answer value (`string | number | boolean`); anything else is absent. */
function readFieldValue(value: unknown, key: string): AskFieldValue | undefined {
	const found = readField(value, key);
	return typeof found === "string" || typeof found === "number" || typeof found === "boolean" ? found : undefined;
}

/** Parse `details` from the tool output — handles single and multi-part shapes. */
function readAskDetails(output: unknown): AskDetails | undefined {
	const details = readField(output, "details");
	if (!details || typeof details !== "object") return undefined;
	const d = details as Record<string, unknown>;

	const question = typeof d.question === "string" ? d.question : undefined;
	const options = readArrayField<string>(d, "options");
	const multi = readBoolField(d, "multi");
	const selectedOptions = readArrayField<string>(d, "selectedOptions");
	const customInput = typeof d.customInput === "string" ? d.customInput : undefined;
	const field = readFieldMeta(d, "field");
	const value = readFieldValue(d, "value");
	const resultsRaw = readArrayField<Record<string, unknown>>(d, "results");

	let results: readonly AskResult[] | undefined;
	if (resultsRaw && resultsRaw.length > 0) {
		results = resultsRaw.map(r => ({
			id: readStringField(r, "id") ?? "",
			question: readStringField(r, "question") ?? "",
			options: (readArrayField<string>(r, "options") ?? []) as readonly string[],
			multi: readBoolField(r, "multi") ?? false,
			selectedOptions: (readArrayField<string>(r, "selectedOptions") ?? []) as readonly string[],
			customInput: readStringField(r, "customInput"),
			field: readFieldMeta(r, "field"),
			value: readFieldValue(r, "value"),
		}));
	}

	return { question, options, multi, selectedOptions, customInput, field, value, results };
}

/** Parse the input questions from the call. */
function readInputQuestions(input: unknown): readonly AskQuestion[] | undefined {
	const rawQuestions = readField(input, "questions");
	const qArr = Array.isArray(rawQuestions) ? (rawQuestions as Record<string, unknown>[]) : undefined;
	if (!qArr || qArr.length === 0) return undefined;

	return qArr.map(q => ({
		id: readStringField(q, "id") ?? "",
		question: readStringField(q, "question") ?? "",
		multi: readBoolField(q, "multi") ?? false,
		recommended: typeof q.recommended === "number" ? (q.recommended as number) : undefined,
		options: readArrayField<Record<string, unknown>>(q, "options")?.map(o => ({
			label: readStringField(o, "label") ?? "",
			description: readStringField(o, "description"),
		})),
	}));
}

// ─── label helpers ────────────────────────────────────────────────────────────

function splitRecommended(label: string): { readonly label: string; readonly recommended: boolean } {
	return label.endsWith(RECOMMENDED_SUFFIX)
		? { label: label.slice(0, -RECOMMENDED_SUFFIX.length), recommended: true }
		: { label, recommended: false };
}

/** Build a `label -> { description, recommended }` lookup from an input question. */
function buildOptionMeta(question: AskQuestion | undefined): Map<string, OptionMeta> {
	const meta = new Map<string, OptionMeta>();
	question?.options?.forEach((opt, i) => {
		meta.set(opt.label, { description: opt.description, recommended: question.recommended === i });
	});
	return meta;
}

// ─── Body components ──────────────────────────────────────────────────────────

/** Render an inline "Other"/free-text answer as a "Custom" block. */
function CustomAnswer({ value }: { value: string }) {
	return (
		<div className="mt-1.5 rounded-[6px] border border-fr-border-soft bg-fr-surface-2 px-2 py-1">
			<div className="font-secondary text-fr-2xs text-fr-accent">✎ Custom</div>
			<div className="mt-0.5 whitespace-pre-wrap font-secondary text-fr-xs text-fr-text">{value}</div>
		</div>
	);
}

/** Format a typed-field answer for display — mirrors Engine's `formatFieldValue`:
 *  toggle -> Yes/No, number/slider with a unit -> "40px", tags -> the raw
 *  comma-joined string. */
function formatFieldValue(value: AskFieldValue, field: AskFieldMeta | undefined): string {
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (typeof value === "number" && field?.unit) return `${value}${field.unit}`;
	return String(value);
}

/** Render every offered option with its marker for a single answered question. */
function AnswerOptions({
	options,
	selectedOptions,
	multi,
	customInput,
	meta,
	field,
	value,
}: {
	readonly options: readonly string[] | undefined;
	readonly selectedOptions: readonly string[] | undefined;
	readonly multi: boolean | undefined;
	readonly customInput: string | undefined;
	readonly meta: Map<string, OptionMeta>;
	/** Present when the question was a typed field (number/slider/toggle/tags)
	 *  instead of options — mutually exclusive with options/selectedOptions. */
	readonly field?: AskFieldMeta | undefined;
	readonly value?: AskFieldValue | undefined;
}): ReactNode {
	const selected = new Set(selectedOptions ?? []);
	const hasFieldAnswer = value !== undefined;
	const hasSelection = selected.size > 0 || customInput !== undefined || hasFieldAnswer;

	// Inline "Other" answers come back as selectedOptions that aren't in the
	// offered options — surface them as custom answers (like free-text input).
	const optionLabelSet = new Set<string>();
	for (const opt of options ?? []) {
		optionLabelSet.add(opt);
		optionLabelSet.add(splitRecommended(opt).label);
	}
	const customAnswers = (selectedOptions ?? []).filter(value => !optionLabelSet.has(value));

	return (
		<div className="mt-1.5 space-y-1">
			{options?.map((opt, i) => {
				const { label, recommended: suffixReco } = splitRecommended(opt);
				const isSelected = selected.has(opt) || selected.has(label);
				const m = meta.get(label) ?? meta.get(opt);
				const recommended = suffixReco || Boolean(m?.recommended);
				return (
					<div key={`${i}-${opt}`} className="flex items-start gap-2">
						{multi ? (
							<Checkbox checked={isSelected} decorative className="mt-px" />
						) : (
							<Radio checked={isSelected} decorative className="shrink-0 mt-px" />
						)}
						<div className="min-w-0 flex-1">
							<span className="flex flex-wrap items-center gap-1.5">
								<span
									className={cn(
										"font-secondary text-fr-xs",
										isSelected ? "font-medium text-fr-add" : "text-fr-text-3",
									)}
								>
									{label}
								</span>
								{recommended && (
									<Badge variant="soft" tone="mute">
										Recommended
									</Badge>
								)}
							</span>
							{m?.description && (
								<span className="mt-0.5 block font-secondary text-fr-2xs text-fr-text-4">{m.description}</span>
							)}
						</div>
					</div>
				);
			})}
			{customAnswers.map(answer => (
				<CustomAnswer key={`custom-${answer}`} value={answer} />
			))}
			{customInput !== undefined && <CustomAnswer value={customInput} />}
			{hasFieldAnswer && <CustomAnswer value={formatFieldValue(value!, field)} />}
			{!hasSelection && <div className="font-secondary text-fr-xs text-fr-text-4">No selection</div>}
		</div>
	);
}

/** Render the answered questions (success state). */
function AskResultBody({
	details,
	questions,
}: {
	readonly details: AskDetails;
	readonly questions: readonly AskQuestion[] | undefined;
}) {
	const results = details.results;
	if (results && results.length > 0) {
		const byId = new Map((questions ?? []).map(q => [q.id, q]));
		return (
			<ToolBodySection padContent>
				{results.map((r, i) => {
					const meta = buildOptionMeta(byId.get(r.id) ?? questions?.[i]);
					return (
						<div key={r.id || `q${i}`} className={i > 0 ? "mt-3 border-t border-fr-border-soft pt-3" : ""}>
							{r.id && (
								<div className="font-secondary text-fr-2xs uppercase tracking-fr-label text-fr-text-4">
									{r.id}
								</div>
							)}
							<div className="mt-0.5 font-primary text-fr-sm text-fr-text">{r.question}</div>
							<AnswerOptions
								options={r.options}
								selectedOptions={r.selectedOptions}
								multi={r.multi}
								customInput={r.customInput}
								meta={meta}
								field={r.field}
								value={r.value}
							/>
						</div>
					);
				})}
			</ToolBodySection>
		);
	}

	if (details.question) {
		const meta = buildOptionMeta(questions?.[0]);
		return (
			<ToolBodySection padContent>
				<div className="font-primary text-fr-sm text-fr-text">{details.question}</div>
				<AnswerOptions
					options={details.options}
					selectedOptions={details.selectedOptions}
					multi={details.multi}
					customInput={details.customInput}
					meta={meta}
					field={details.field}
					value={details.value}
				/>
			</ToolBodySection>
		);
	}

	return null;
}

/** Render a plain waiting placeholder (running/pending). The live picker is the
 *  `HostUiDialog` overlay — this card only records that an answer is pending. */
function AskWaitingBody({ questions }: { readonly questions: readonly AskQuestion[] | undefined }) {
	const hasQuestions = Boolean(questions && questions.length > 0);
	return (
		<ToolBodySection padContent>
			{hasQuestions && (
				<div className="space-y-0.5">
					{questions?.map((q, i) => (
						<div key={q.id || `q${i}`} className="font-primary text-fr-sm text-fr-text-2">
							{q.question}
						</div>
					))}
				</div>
			)}
			<div className={cn("font-secondary text-fr-xs text-fr-text-3", hasQuestions && "mt-1.5")}>
				Waiting for your answer{questions && questions.length > 1 ? "s" : ""}…
			</div>
		</ToolBodySection>
	);
}

// ─── Renderer ───────────────────────────────────────────────────────────────

function askStatus(callStatus: ActiveToolCall["status"]): ToolStatus {
	if (callStatus === "error") return "error";
	if (callStatus === "success") return "success";
	return "pending";
}

function askStat(status: ToolStatus): string {
	if (status === "success") return "answered";
	if (status === "error") return "failed";
	return "asking";
}

function renderAskBody(
	callStatus: ActiveToolCall["status"],
	details: AskDetails | undefined,
	questions: readonly AskQuestion[] | undefined,
): ReactNode {
	if (callStatus === "error") {
		return (
			<ToolBodySection padContent>
				<ToolBodyTerm lines={[["fail", "Error receiving answer"]]} />
			</ToolBodySection>
		);
	}
	if (callStatus === "success" && details) return <AskResultBody details={details} questions={questions} />;
	if (callStatus === "success") {
		return <div className="px-3 py-1.5 font-secondary text-fr-xs text-fr-text-3">No answer data</div>;
	}
	return <AskWaitingBody questions={questions} />;
}

function askQuestionCount(details: AskDetails | undefined, questions: readonly AskQuestion[] | undefined): number {
	return questions?.length ?? details?.results?.length ?? 0;
}

function askHasMulti(details: AskDetails | undefined, questions: readonly AskQuestion[] | undefined): boolean {
	return Boolean(details?.multi || questions?.some(q => q.multi) || details?.results?.some(r => r.multi));
}

function buildAskBadges(
	details: AskDetails | undefined,
	questions: readonly AskQuestion[] | undefined,
): ReactNode[] | undefined {
	const badges: ReactNode[] = [];
	const questionCount = askQuestionCount(details, questions);
	if (questionCount > 1) {
		badges.push(
			<Badge key="qcount" variant="code" tone="mute">
				{questionCount} questions
			</Badge>,
		);
	}
	if (askHasMulti(details, questions)) {
		badges.push(
			<Badge key="multi" variant="code" tone="mute">
				multi
			</Badge>,
		);
	}
	return badges.length > 0 ? badges : undefined;
}

const renderAsk: ToolRenderer = (call: ActiveToolCall): ToolView => {
	const input = call.input as Record<string, unknown> | undefined;
	const details = readAskDetails(call.output);
	const questions = readInputQuestions(input);
	const status = askStatus(call.status);

	return {
		label: "Ask",
		badges: buildAskBadges(details, questions),
		kind: "ask",
		status,
		stat: askStat(status),
		body: renderAskBody(call.status, details, questions),
	};
};

export { renderAsk };
