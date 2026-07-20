import { createContext, Fragment, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FileTypeIcon } from "../../elements/file-type-icon";
import { IconButton } from "../../elements/icon-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../elements/tooltip";
import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";
import { ImageLightbox } from "../message/messages/image-block";
import type { VoiceEngine } from "../voice-input/voice-engine";
import { VoiceInput } from "../voice-input/voice-input";
import { ComposerTips } from "./composer-tips";
import { MentionEditor, type MentionEditorHandle, type PositionedImagePillData } from "./mention-editor";
import { ModelHotkeyToast, useModelHotkeys } from "./model-hotkeys";
import { resolveSlashEntrySpec, SlashEntryGlyph, useSlashEntryLayers, useSlashEntrySpec } from "./slash-entry-icon";

export interface SlashCommandSubcommand {
	readonly name: string;
	readonly description?: string;
	/** Usage hint shown dim after the name, e.g. `<objective>`. */
	readonly usage?: string;
}

export interface SlashCommandOption {
	readonly label: string;
	readonly value: string;
	readonly description?: string;
	/** Raw completion kind from the engine (e.g. command | skill | prompt | extension | file). */
	readonly kind?: string;
	/** Dim usage hint rendered after the row name (e.g. `<name> <url>`) — argument rows only. */
	readonly hint?: string;
	/** Static free-text ghost hint for the committed command (engine `input.hint`, e.g. `[focus instructions]`). */
	readonly inputHint?: string;
	/** Declarative subcommands offered as argument completions once the command is committed
	 *  (e.g. `/fast` → on | off | status). TUI subcommand-dropdown parity. */
	readonly subcommands?: readonly SlashCommandSubcommand[];
	/** Engine-advertised icon for this entry (skill frontmatter / command def) — the
	 *  wire layer of the slash-entry policy. A bare glyph name or a data-URI asset. */
	readonly icon?: string;
}

/** One dynamic argument completion row (TUI `AutocompleteItem` parity). `value` is the FULL
 *  replacement for the command's argument text — the engine computes it with the current
 *  prefix baked in (`replaceLastToken` semantics), so applying a row never does token math. */
export interface ArgumentCompletion {
	readonly label: string;
	readonly value: string;
	readonly description?: string;
	/** Dim usage hint after the label, e.g. `<selector>`. */
	readonly hint?: string;
}

/** Fetches dynamic argument completions for a committed command (extension flags like
 *  `/sidequest --mode …` — TUI `getArgumentCompletions` parity, served over the engine's
 *  completions lane). `argsPrefix` is the argument text before the caret, command excluded. */
export type ArgumentCompletionSource = (
	commandValue: string,
	argsPrefix: string,
	signal: AbortSignal,
) => Promise<readonly ArgumentCompletion[]>;

/** Fetches `@`-mention file/path completions for the query typed after `@` (the
 *  text before the caret, `@` excluded). Resolves to options the menu renders with
 *  `kind: "file"`. When the composer gets no source, `@` does nothing; `signal`
 *  aborts a stale fetch when the query changes. Mirrors the Engine TUI `@` file search. */
export type FileCompletionSource = (query: string, signal: AbortSignal) => Promise<readonly SlashCommandOption[]>;

/** The active `@`-mention token ending at the caret. `start` indexes the `@`. */
export interface ActiveMention {
	readonly query: string;
	readonly start: number;
	readonly end: number;
}

// Detect the `@`-mention token ending at `cursor`: the `@` must start the text or
// follow whitespace (so `user@host` never triggers), and the token carries no
// whitespace/`@`. Returns null when no mention is active at the caret.
export function activeMentionQuery(value: string, cursor: number): ActiveMention | null {
	const end = Math.max(0, Math.min(cursor, value.length));
	const match = /(?:^|\s)@([^\s@]*)$/.exec(value.slice(0, end));
	if (!match) return null;
	const query = match[1] ?? "";
	return { query, start: end - query.length - 1, end };
}

const SLASH_KIND_GROUP: Record<string, string> = {
	skill: "Skills",
	extension: "Extensions",
	file: "Files",
	mention: "Mentions",
};

function slashGroupLabel(option: SlashCommandOption): string | undefined {
	return option.kind ? SLASH_KIND_GROUP[option.kind] : undefined;
}

// The leading "/" is implied by the slash menu (the user already typed it), so
// show the bare command name — e.g. "/skill:foo" → "skill:foo".
function displayLabel(option: SlashCommandOption): string {
	return option.label.replace(/^\/+/, "");
}

// Keep grouped kinds (e.g. skills) contiguous so a single section header reads
// cleanly; stable sort preserves the engine's match ranking within each group.
function orderByGroup(items: readonly SlashCommandOption[]): readonly SlashCommandOption[] {
	if (!items.some(item => slashGroupLabel(item) !== undefined)) return items;
	return [...items].sort((a, b) => (slashGroupLabel(a) ? 1 : 0) - (slashGroupLabel(b) ? 1 : 0));
}

// Marker kind for an argument (subcommand) completion row — distinct from a
// command-name row so the menu can icon/label it as a drill-in option.
const COMMAND_ARG_KIND = "command-arg";

// Client-side argument completions for a committed command, mirroring the TUI's
// `buildArgumentCompletions`: filter the command's declarative subcommands by the
// typed arg prefix. Once the args carry a space we are past the subcommand token,
// so the menu closes (free-form trailing args, like the TUI). The option `value`
// is the bare subcommand name; the apply path reattaches the command prefix.
function argumentCompletions(command: SlashCommandOption, args: string): readonly SlashCommandOption[] {
	const subs = command.subcommands;
	if (!subs || subs.length === 0 || args.includes(" ")) return [];
	const lower = args.toLowerCase();
	return subs
		.filter(sub => sub.name.toLowerCase().startsWith(lower))
		.map(sub => ({
			label: sub.name,
			value: sub.name,
			...(sub.description ? { description: sub.description } : {}),
			...(sub.usage ? { hint: sub.usage } : {}),
			kind: COMMAND_ARG_KIND,
		}));
}

/** A compose-time image pasted/dropped into the composer, pending send. `data` is RAW
 *  base64 (no `data:` prefix); preview + transport both derive from it. */
export interface ComposerImageAttachment {
	readonly id: string;
	readonly name: string;
	readonly mimeType: string;
	readonly data: string;
	/** Char offset of this image's zero-width pill, persisted with unsent session drafts. */
	readonly inlineOffset?: number;
}

/** A text blob held as a removable chip instead of being dumped inline — either a large plain-text
 *  paste OR a dropped/attached non-image FILE read as text. Keeps the field readable and skips the
 *  contenteditable insert path (a big `execCommand("insertText")` is pathologically slow in
 *  Chromium — the paste lag). Its `text` folds into the message on submit. When `name` is set the
 *  chip is a file attachment (filename + type/size); otherwise a pasted-text chip that "Show in
 *  text field" expands back inline. */
export interface ComposerPasteAttachment {
	readonly id: string;
	readonly text: string;
	/** Filename — set when this chip is a dropped/attached file (vs. a plain paste). */
	readonly name?: string;
	/** File MIME type when known (file chips only). */
	readonly mimeType?: string;
	/** Original file size in bytes (file chips only) — shown in the chip. */
	readonly sizeBytes?: number;
	/** The embedded text was capped (large file); a note is appended on fold. */
	readonly truncated?: boolean;
	/** Binary file whose bytes can't ride the wire — folds a short note instead of content. */
	readonly binary?: boolean;
}

// A plain-text paste turns into a chip (instead of inline text) once it crosses either bound:
// large enough that inline editing is awkward and the contenteditable insert path gets slow.
// Tuned to leave ordinary multi-line snippets inline.
const LARGE_PASTE_MIN_CHARS = 1500;
const LARGE_PASTE_MIN_LINES = 18;

/** Whether a plain-text paste is large enough to become a chip rather than inline text. */
export function isLargePaste(text: string): boolean {
	if (text.length >= LARGE_PASTE_MIN_CHARS) return true;
	let lines = 1;
	for (let i = 0; i < text.length; i += 1) if (text.charCodeAt(i) === 10) lines += 1;
	return lines >= LARGE_PASTE_MIN_LINES;
}

/** One-line, whitespace-collapsed preview of a pasted blob for the chip label. */
export function pastePreview(text: string): string {
	const collapsed = text.slice(0, 200).replace(/\s+/g, " ").trim();
	return collapsed.length > 48 ? `${collapsed.slice(0, 48)}…` : collapsed;
}

/** Fold pasted-text chips into the outgoing message: typed text first, then each pasted blob
 *  (blank-line separated). Either side may be empty (paste-only or text-only send). */
export function combineMessage(value: string, pasted: string): string {
	if (!pasted) return value;
	if (!value.trim()) return pasted;
	return `${value}\n\n${pasted}`;
}

/** A pipeline pinned to the composer (Studio): renders as a leading pill (icon +
 *  title) the same way a committed slash command does, marking that the next
 *  send runs through this pipeline. `onRemove` clears the pin. */
export interface ComposerPipelineTag {
	readonly id: string;
	readonly title: string;
	readonly icon: IconName;
	/** Composer ghost text while this pipeline is pinned — the pipeline's example
	 *  brief as a HINT (placeholder), never typed-for-you content. */
	readonly placeholder?: string;
	readonly onRemove?: () => void;
}

/** A seeded CONTEXT pinned to the composer (the loop-agent dock): a leading badge
 *  pill (icon + label) that says WHAT this thread is for — "New loop", "Editing
 *  <name>" — carried as a first-class UI component instead of priming the message
 *  box with text. Mirrors {@link ComposerPipelineTag}; `onRemove` clears it. */
export interface ComposerContextTag {
	readonly label: string;
	readonly icon: IconName;
	readonly onRemove?: () => void;
}

// ── Dropped / attached file support ─────────────────────────────────────────
// A dropped or picked NON-image file rides as a removable text chip: text files embed their
// (capped) content, binary files a short note (their bytes can't cross the ACP text/image wire).
// The cap keeps a giant file from flooding the message + context window.
const MAX_FILE_TEXT_CHARS = 200_000;
const FILE_SNIFF_BYTES = 65_536;

/** True when the file is an image we embed as a base64 image attachment (vs. a text/file chip). */
export function isImageFile(file: File): boolean {
	return file.type.startsWith("image/");
}

/** Pull ALL files out of a clipboard or drop payload (images AND other files). */
export function filesFromTransfer(data: DataTransfer | null): File[] {
	if (!data) return [];
	const fromItems = Array.from(data.items).flatMap(item => {
		if (item.kind !== "file") return [];
		const file = item.getAsFile();
		return file ? [file] : [];
	});
	if (fromItems.length > 0) return fromItems;
	// Some browsers surface dropped files via `.files` rather than `.items`.
	return Array.from(data.files);
}

/** Heuristic binary sniff: a NUL byte, or too many UTF-8 replacement chars, in the head window. */
function looksBinary(bytes: Uint8Array): boolean {
	const n = Math.min(bytes.length, FILE_SNIFF_BYTES);
	for (let i = 0; i < n; i += 1) if (bytes[i] === 0) return true;
	if (n === 0) return false;
	const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, n));
	let replacements = 0;
	for (let i = 0; i < text.length; i += 1) if (text.charCodeAt(i) === 0xfffd) replacements += 1;
	return text.length > 0 && replacements / text.length > 0.02;
}

/** Read a NON-image file into a {@link ComposerPasteAttachment}: text files embed their (capped)
 *  content; binary files embed only a short note (folded on submit). */
export async function readFileAttachment(file: File, id: string): Promise<ComposerPasteAttachment> {
	const name = attachmentName(file);
	const mimeType = file.type || undefined;
	const bytes = new Uint8Array(await file.arrayBuffer());
	if (looksBinary(bytes)) return { id, name, text: "", mimeType, sizeBytes: file.size, binary: true };
	let text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
	const truncated = text.length > MAX_FILE_TEXT_CHARS;
	if (truncated) text = text.slice(0, MAX_FILE_TEXT_CHARS);
	return { id, name, text, mimeType, sizeBytes: file.size, ...(truncated ? { truncated: true } : {}) };
}

/** Longest run of backticks in `text` — so a code fence can be made strictly longer (never split
 *  by content that itself contains backticks). */
function longestBacktickRun(text: string): number {
	let max = 0;
	let run = 0;
	for (let i = 0; i < text.length; i += 1) {
		if (text.charCodeAt(i) === 96) {
			run += 1;
			if (run > max) max = run;
		} else {
			run = 0;
		}
	}
	return max;
}

/** Fold one chip into the outgoing message. Plain pasted text carries a
 * length-delimited marker so the durable user-message renderer can collapse it
 * without duplicating the content or relying on an escapable closing tag. */
export function foldPasteAttachment(attachment: ComposerPasteAttachment): string {
	if (!attachment.name) return `[[fraym-paste:${attachment.text.length}]]\n${attachment.text}`;
	const sizeLabel =
		typeof attachment.sizeBytes === "number" ? ` · ${Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB` : "";
	if (attachment.binary) {
		return `[Attached file "${attachment.name}" (${attachment.mimeType ?? "binary"}${sizeLabel}) — binary content not embedded]`;
	}
	const fence = "`".repeat(Math.max(3, longestBacktickRun(attachment.text) + 1));
	const truncatedNote = attachment.truncated
		? `\n… [truncated to ${Math.round(MAX_FILE_TEXT_CHARS / 1000)}k chars]`
		: "";
	return `Attached file \`${attachment.name}\`:\n${fence}\n${attachment.text}${truncatedNote}\n${fence}`;
}

/** Options for the composer's built-in dictation mic (see `ComposerProps.voice`). */
export interface ComposerVoiceOptions {
	/** Capture engine override (Web Speech by default; scripted for demos/tests). */
	readonly engine?: VoiceEngine;
	/** BCP-47 recognition language (defaults to the browser language). */
	readonly lang?: string;
	/** Auto-insert after this much silence (ms). 0 disables. Default 2600. */
	readonly silenceMs?: number;
	/** Host hook as dictation starts/stops (e.g. swap the placeholder). */
	readonly onListeningChange?: (listening: boolean) => void;
}

/** Host-provided default capture engine for every composer's built-in mic —
 *  the shell sets this to the ENGINE-backed VoiceEngine (Engine on-device STT
 *  over the `_fraym/stt/*` lane) when the connected engine supports it; null
 *  falls back to the component's Web Speech default. A per-composer
 *  `voice.engine` override always wins. */
export const ComposerVoiceEngineContext = createContext<VoiceEngine | null>(null);

export interface ComposerProps {
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly onSubmit: (value: string, attachments: readonly ComposerImageAttachment[]) => void;
	readonly onSlash?: () => void;
	readonly onStop?: () => void;
	readonly streaming?: boolean;
	readonly placeholder?: string;
	readonly disabled?: boolean;
	readonly slashCommands?: readonly SlashCommandOption[];
	/** Controlled image attachments. When provided (with `onAttachmentsChange`), the
	 *  composer is attachment-controlled — used to persist attachments per session. */
	readonly attachments?: readonly ComposerImageAttachment[];
	readonly onAttachmentsChange?: (attachments: readonly ComposerImageAttachment[]) => void;
	readonly leftSlot?: React.ReactNode;
	/** A pipeline pinned to this composer (Studio): shows a leading pipeline pill
	 *  (icon + title). Absent → no pill. */
	readonly pipelineTag?: ComposerPipelineTag | null;
	/** A seeded context pinned to this composer (loop-agent dock): a leading badge
	 *  pill marking the thread's purpose. Absent → no pill. */
	readonly contextTag?: ComposerContextTag | null;
	/** Skills pre-armed on this thread, shown as small chips beside the context
	 *  badge (e.g. the autonomy skill on a loop-authoring thread). */
	readonly primedSkills?: readonly string[];
	readonly rightSlot?: React.ReactNode;
	/** Built-in dictation mic (<VoiceInput>) in the actions row — ON by default.
	 *  It renders nothing where the browser can't capture (no Web Speech API, e.g.
	 *  desktop webviews until the engine-backed VoiceEngine lands), and hides the
	 *  `rightSlot` chrome while listening so the pill reclaims the row. `false`
	 *  removes it; an options object overrides engine/lang/silence. */
	readonly voice?: false | ComposerVoiceOptions;
	readonly topSlot?: React.ReactNode;
	readonly footerSlot?: React.ReactNode;
	/** Show a dim, rotating tip line beneath the composer box (TUI welcome-tip parity). */
	readonly showTips?: boolean;
	readonly className?: string;
	/** Powers the `@`-mention file search dropdown (TUI parity). Omit to disable `@`. */
	readonly fileCompletionSource?: FileCompletionSource;
	/** Powers the dynamic argument dropdown for a committed command (extension flags like
	 *  `/sidequest --mode …` — TUI `getArgumentCompletions` parity). Omit to keep only the
	 *  declarative subcommand stage. */
	readonly argumentCompletionSource?: ArgumentCompletionSource;
	/** Controlled pasted-text chips. With `onPasteAttachmentsChange`, the composer is
	 *  paste-controlled (e.g. per-session persistence); omit both to manage them internally. */
	readonly pasteAttachments?: readonly ComposerPasteAttachment[];
	readonly onPasteAttachmentsChange?: (attachments: readonly ComposerPasteAttachment[]) => void;
}

function isSlashCompletionText(value: string): boolean {
	return value.startsWith("/");
}

function applySlashCommand(option: SlashCommandOption, onChange: (value: string) => void, focus: () => void) {
	const inserted = option.value.endsWith(" ") ? option.value : `${option.value} `;
	onChange(inserted);
	focus();
}

// Display name kept on the attachment for the transcript/lightbox; pasted clipboard
// images usually have no `name`, so fall back to a generic label.
function attachmentName(file: File): string {
	return file.name || "pasted image";
}

// Read an image File into a base64 attachment, stripping the `data:<mime>;base64,` prefix
// so `data` is the raw payload the ACP image content block / transcript expects. The `id`
// is supplied by the caller so the attachment and its inline editor pill share one identity.
export function readImageAttachment(file: File, id: string): Promise<ComposerImageAttachment> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error ?? new Error("attachment read failed"));
		reader.onload = () => {
			const result = typeof reader.result === "string" ? reader.result : "";
			const comma = result.indexOf(",");
			resolve({
				id,
				name: attachmentName(file),
				mimeType: file.type || "image/png",
				data: comma >= 0 ? result.slice(comma + 1) : result,
			});
		};
		reader.readAsDataURL(file);
	});
}

// Pull image files out of a clipboard or drop payload, ignoring non-image content.
export function imageFilesFromTransfer(data: DataTransfer | null): File[] {
	if (!data) return [];
	const fromItems = Array.from(data.items).flatMap(item => {
		if (item.kind !== "file" || !item.type.startsWith("image/")) return [];
		const file = item.getAsFile();
		return file ? [file] : [];
	});
	if (fromItems.length > 0) return fromItems;
	// Some browsers surface dropped files via `.files` rather than `.items`.
	return Array.from(data.files).filter(file => file.type.startsWith("image/"));
}

/** Extract `data:image/*` srcs from pasted HTML — e.g. copying a transcript message with images
 *  (native Ctrl+C puts the thumbnail's data-URL `<img>` in `text/html`). Only data-URL images are
 *  taken; remote `http(s)` srcs are left to the normal text paste (no cross-origin fetch). */
export function imageDataUrlsFromHtml(html: string): readonly string[] {
	if (!html) return [];
	const urls: string[] = [];
	const re = /<img\b[^>]*?\bsrc\s*=\s*(["'])(data:image\/[^"']+)\1/gi;
	for (let match = re.exec(html); match !== null; match = re.exec(html)) {
		if (match[2]) urls.push(match[2]);
	}
	return urls;
}

/** Parse a base64 `data:` image URL into a composer attachment (raw base64, no prefix), or null. */
export function attachmentFromDataUrl(url: string, id: string): ComposerImageAttachment | null {
	const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is.exec(url);
	const mimeType = match?.[1];
	const data = match?.[2];
	if (!mimeType || !data) return null;
	return { id, name: "pasted image", mimeType, data };
}

/** Drop standalone "Image N" pill labels from pasted text — those images now ride as attachments,
 *  so leaving the literal labels in the text would double them up. */
export function stripPastedImageLabels(text: string): string {
	return text
		.split("\n")
		.filter(line => !/^\s*Image \d+\s*$/.test(line))
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

interface ComposerKeyContext {
	readonly activeOption: number;
	readonly completionKey: string | null;
	readonly disabled: boolean;
	readonly matches: readonly SlashCommandOption[];
	readonly menuOpen: boolean;
	readonly onSlash?: () => void;
	readonly slashCommands?: readonly SlashCommandOption[];
	readonly setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
	readonly setDismissedQuery: React.Dispatch<React.SetStateAction<string | null>>;
	readonly submitValue: () => void;
	readonly applyActive: (option: SlashCommandOption) => void;
	readonly value: string;
	/** Text visible in the editor (args only while a command is committed). */
	readonly displayValue: string;
	/** Pop the last committed unit (chip → sub → command). Wired when a command is committed. */
	readonly popCommitted?: () => void;
	readonly streaming: boolean;
	readonly onStop?: () => void;
}

function handleComposerKeyDown(e: React.KeyboardEvent<HTMLDivElement>, context: ComposerKeyContext) {
	if (context.disabled) return;
	if (e.nativeEvent.isComposing) return;
	if (context.menuOpen) {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			context.setActiveIndex(i => (i + 1) % context.matches.length);
			return;
		}
		if (e.key === "ArrowUp") {
			e.preventDefault();
			context.setActiveIndex(i => (i - 1 + context.matches.length) % context.matches.length);
			return;
		}
		if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
			e.preventDefault();
			const selected = context.matches[context.activeOption];
			if (selected) context.applyActive(selected);
			return;
		}
		if (e.key === "Escape") {
			e.preventDefault();
			context.setDismissedQuery(context.completionKey);
			return;
		}
	}
	if (e.key === "Escape" && context.streaming && context.onStop) {
		e.preventDefault();
		context.onStop();
		return;
	}
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		context.submitValue();
		return;
	}
	if (e.key === "Backspace" && context.displayValue === "" && context.popCommitted) {
		e.preventDefault();
		context.popCommitted();
		return;
	}
	if (e.key === "/" && context.value === "" && context.onSlash && context.slashCommands === undefined) {
		e.preventDefault();
		context.onSlash();
	}
}

interface SlashCommandOptionRowProps {
	readonly command: SlashCommandOption;
	readonly index: number;
	readonly activeOption: number;
	readonly group?: string;
	readonly showHeader: boolean;
	readonly onHover: (index: number) => void;
	readonly onPick: (option: SlashCommandOption) => void;
}

function SlashCommandOptionRow({
	command,
	index,
	activeOption,
	group,
	showHeader,
	onHover,
	onPick,
}: SlashCommandOptionRowProps) {
	const spec = useSlashEntrySpec(command);
	const row = (
		<button
			type="button"
			role="option"
			aria-selected={index === activeOption}
			data-active={index === activeOption || undefined}
			onMouseEnter={() => onHover(index)}
			onMouseDown={e => e.preventDefault()}
			onClick={() => onPick(command)}
			className={cn(
				"flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition-colors",
				index === activeOption ? "bg-fr-surface-2" : "hover:bg-fr-surface-2",
			)}
		>
			{command.kind === "file" ? (
				<FileTypeIcon
					path={command.description ?? command.label}
					isDirectory={command.label.endsWith("/")}
					size={15}
				/>
			) : (
				<SlashEntryGlyph spec={spec} kind={command.kind} size={15} />
			)}
			<span
				data-slot="composer-slash-name"
				className="shrink-0 whitespace-nowrap font-secondary text-sm text-fr-text"
			>
				{spec?.label ?? displayLabel(command)}
			</span>
			{command.hint && (
				<span className="max-w-[240px] shrink-0 fr-overflow font-secondary text-sm text-fr-text-3 opacity-70">
					{command.hint}
				</span>
			)}
			{command.description && (
				<span className="min-w-0 flex-1 fr-overflow text-sm text-fr-text-3">{command.description}</span>
			)}
		</button>
	);
	return (
		<Fragment>
			{showHeader && <div className="fr-eyebrow px-2.5 pt-2 pb-1 text-fr-text-3">{group}</div>}
			{command.description ? (
				<Tooltip>
					<TooltipTrigger asChild>{row}</TooltipTrigger>
					<TooltipContent side="right" align="center" className="max-w-[320px]">
						{command.description}
					</TooltipContent>
				</Tooltip>
			) : (
				row
			)}
		</Fragment>
	);
}

/** The committed-command pill's glyph — resolves the same slash-entry policy as the
 *  menu row so the pill matches the picked option. Inherits the pill's accent tint
 *  unless the policy sets a color. */
function CommittedCommandGlyph({ command }: { readonly command: SlashCommandOption }) {
	const spec = useSlashEntrySpec(command);
	return <SlashEntryGlyph spec={spec} kind={command.kind} size={12} className="opacity-80" fallbackColor="" />;
}

interface SlashCommandMenuProps {
	readonly matches: readonly SlashCommandOption[];
	readonly activeOption: number;
	readonly onHover: (index: number) => void;
	readonly onPick: (option: SlashCommandOption) => void;
	readonly menuDataSlot?: string;
	readonly menuAriaLabel?: string;
	/** Breadcrumb segments above the rows (e.g. `/mcp ›`) — argument stages only. */
	readonly crumb?: readonly string[];
	/** Dim stage label after the breadcrumb (e.g. "subcommand", "options"). */
	readonly stageLabel?: string;
}

function SlashCommandMenu({
	matches,
	activeOption,
	onHover,
	onPick,
	menuDataSlot = "composer-slash-menu",
	menuAriaLabel = "Slash commands",
	crumb,
	stageLabel,
}: SlashCommandMenuProps) {
	return (
		<div
			data-slot={menuDataSlot}
			role="listbox"
			aria-label={menuAriaLabel}
			className="absolute inset-x-0 bottom-full z-30 mb-2 max-h-[320px] overflow-y-auto rounded-[14px] border border-fr-border bg-fr-surface p-1.5 shadow-[0_16px_44px_-12px_rgba(0,0,0,0.55)]"
		>
			{crumb && crumb.length > 0 && (
				<div data-slot="composer-menu-crumb" className="flex items-center gap-1 px-2.5 pt-1.5 pb-1">
					{crumb.map(part => (
						<Fragment key={part}>
							<span className="font-secondary text-fr-xs font-medium text-fr-accent">{part}</span>
							<Icon name="caretR" size={11} className="text-fr-text-3" />
						</Fragment>
					))}
					{stageLabel && <span className="fr-eyebrow text-fr-text-3">{stageLabel}</span>}
				</div>
			)}
			<TooltipProvider delayDuration={350} disableHoverableContent>
				{matches.map((command, index) => {
					const group = slashGroupLabel(command);
					const previous = index > 0 ? matches[index - 1] : undefined;
					const showHeader =
						group !== undefined && (previous === undefined || slashGroupLabel(previous) !== group);
					return (
						<SlashCommandOptionRow
							key={`${command.value}:${command.label}`}
							command={command}
							index={index}
							activeOption={activeOption}
							group={group}
							showHeader={showHeader}
							onHover={onHover}
							onPick={onPick}
						/>
					);
				})}
			</TooltipProvider>
		</div>
	);
}

interface ComposerActionsProps {
	readonly disabled: boolean;
	readonly leftSlot?: React.ReactNode;
	readonly onStop?: () => void;
	readonly onSubmit: () => void;
	readonly rightSlot?: React.ReactNode;
	readonly voiceSlot?: React.ReactNode;
	readonly voiceListening?: boolean;
	readonly streaming: boolean;
	readonly value: string;
	readonly hasAttachments: boolean;
	readonly onAttach?: () => void;
}

function ComposerActions({
	disabled,
	hasAttachments,
	leftSlot,
	onAttach,
	onStop,
	onSubmit,
	rightSlot,
	voiceSlot,
	voiceListening,
	streaming,
	value,
}: ComposerActionsProps) {
	return (
		<div className="flex items-center gap-2 px-2.5 pb-[9px] pt-2">
			{onAttach && (
				<IconButton
					variant="chrome"
					aria-label="Attach files"
					title="Attach files"
					disabled={disabled}
					onClick={onAttach}
				>
					<Icon name="plus" size={16} strokeWidth={1.8} />
				</IconButton>
			)}
			{leftSlot}
			<span className="flex-1" />
			{!voiceListening && rightSlot}
			{voiceSlot}
			{streaming ? (
				<>
					{(value.trim() || hasAttachments) && (
						<IconButton variant="accent" aria-label="Queue message" title="Queue message" onClick={onSubmit}>
							<Icon name="send" size={16} strokeWidth={2} />
						</IconButton>
					)}
					<IconButton variant="surface" aria-label="Stop response" onClick={onStop} title="Stop">
						<span className="block size-2.5 rounded-[2px] bg-current" />
					</IconButton>
				</>
			) : (
				<IconButton
					variant="accent"
					aria-label="Send message"
					disabled={disabled || (!value.trim() && !hasAttachments)}
					onClick={onSubmit}
				>
					<Icon name="send" size={16} strokeWidth={2} />
				</IconButton>
			)}
		</div>
	);
}

interface ComposerFieldProps {
	readonly activeOption: number;
	readonly disabled: boolean;
	readonly footerSlot?: React.ReactNode;
	readonly leftSlot?: React.ReactNode;
	readonly matches: readonly SlashCommandOption[];
	readonly menuOpen: boolean;
	readonly onApplyOption: (option: SlashCommandOption) => void;
	readonly onHoverOption: (index: number) => void;
	readonly onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
	readonly onStop?: () => void;
	readonly onSubmit: () => void;
	readonly onEditorChange: (
		value: string,
		caret: number,
		imagePills: readonly { readonly id: string; readonly offset: number }[],
	) => void;
	readonly onCaretChange: (caret: number) => void;
	readonly placeholder: string;
	readonly rightSlot?: React.ReactNode;
	readonly voiceSlot?: React.ReactNode;
	readonly voiceListening: boolean;
	readonly streaming: boolean;
	readonly editorRef: React.Ref<MentionEditorHandle>;
	readonly value: string;
	readonly displayValue: string;
	readonly committed: CommittedCommand | null;
	readonly onRemoveCommand: () => void;
	readonly onRemoveChip: (index: number) => void;
	readonly pipelineTag?: ComposerPipelineTag | null;
	readonly contextTag?: ComposerContextTag | null;
	readonly primedSkills?: readonly string[];
	readonly attachments: readonly ComposerImageAttachment[];
	readonly pasteAttachments: readonly ComposerPasteAttachment[];
	readonly onRemovePasteAttachment: (id: string) => void;
	readonly onExpandPasteAttachment: (id: string) => void;
	readonly onPaste: (e: React.ClipboardEvent<HTMLDivElement>) => void;
	readonly onDrop: (e: React.DragEvent) => void;
	readonly onAttachFiles: (files: File[]) => void;
	readonly onRemoveAttachment: (id: string) => void;
	readonly onImagePillRemoved: (id: string) => void;
	readonly menuDataSlot?: string;
	readonly menuAriaLabel?: string;
	readonly menuCrumb?: readonly string[];
	readonly menuStageLabel?: string;
}

interface ComposerSlashState {
	readonly activeOption: number;
	readonly completionKey: string | null;
	readonly matches: readonly SlashCommandOption[];
	readonly menuOpen: boolean;
	readonly setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
	readonly setDismissedQuery: React.Dispatch<React.SetStateAction<string | null>>;
}

// Shared gating for the three completion menus (slash / argument / mention): reset the
// highlighted row when the completion key changes, dismiss-per-query, and clamp the active
// index to the current match count. `key` is null when no menu is active.
function useMenuGating(
	key: string | null,
	matches: readonly SlashCommandOption[],
): Pick<ComposerSlashState, "activeOption" | "menuOpen" | "setActiveIndex" | "setDismissedQuery"> {
	const [activeIndex, setActiveIndex] = useState(0);
	const [dismissedQuery, setDismissedQuery] = useState<string | null>(null);
	const [trackedKey, setTrackedKey] = useState<string | null>(key);

	if (trackedKey !== key) {
		setTrackedKey(key);
		setActiveIndex(0);
	}

	const menuOpen = key !== null && dismissedQuery !== key && matches.length > 0;
	const activeOption = menuOpen ? Math.min(activeIndex, matches.length - 1) : -1;
	return { activeOption, menuOpen, setActiveIndex, setDismissedQuery };
}

function useComposerSlashState(
	value: string,
	slashCommands: readonly SlashCommandOption[] | undefined,
): ComposerSlashState {
	const completionKey = isSlashCompletionText(value) ? value : null;
	const layers = useSlashEntryLayers();
	const matches = useMemo(
		() =>
			orderByGroup((slashCommands ?? []).filter(option => resolveSlashEntrySpec(option, layers)?.hidden !== true)),
		[slashCommands, layers],
	);
	const gating = useMenuGating(completionKey, matches);
	return { ...gating, completionKey, matches };
}

// Argument (subcommand) completion state for a COMMITTED command, mirroring the
// slash menu's gating (dismiss-per-query + clamped index). Matches are derived
// client-side from the command's declarative subcommands (TUI parity), so there
// is no fetch — the menu reacts instantly as the args are typed.
function useComposerArgState(
	committed: { readonly command: SlashCommandOption; readonly args: string } | null,
): ComposerSlashState {
	const matches = committed ? argumentCompletions(committed.command, committed.args) : [];
	const completionKey = committed && matches.length > 0 ? `${committed.command.value} ${committed.args}` : null;
	const gating = useMenuGating(completionKey, matches);
	return { ...gating, completionKey, matches };
}

// Dynamic argument completion state for a committed command — extension flags and
// anything else the engine's completions lane offers (TUI `getArgumentCompletions`
// parity). Mirrors the mention hook: debounce-fetch keyed on the literal args prefix,
// aborting stale queries; rows arrive as FULL args replacements (see ArgumentCompletion).
function useComposerDynamicArgState(
	commandValue: string | null,
	argsPrefix: string | null,
	source: ArgumentCompletionSource | undefined,
): ComposerSlashState {
	const enabled = commandValue !== null && argsPrefix !== null && source !== undefined;
	const queryKey = enabled ? `${commandValue} ${argsPrefix}` : null;
	const [matches, setMatches] = useState<readonly SlashCommandOption[]>([]);
	const gating = useMenuGating(queryKey, matches);

	useEffect(() => {
		if (!source || commandValue === null || argsPrefix === null) {
			setMatches(previous => (previous.length === 0 ? previous : []));
			return;
		}
		let active = true;
		const controller = new AbortController();
		const handle = setTimeout(() => {
			void source(commandValue, argsPrefix, controller.signal)
				.then(items => {
					if (!active || controller.signal.aborted) return;
					setMatches(
						items.map(item => ({
							label: item.label,
							value: item.value,
							...(item.description ? { description: item.description } : {}),
							...(item.hint ? { hint: item.hint } : {}),
							kind: COMMAND_ARG_KIND,
						})),
					);
				})
				.catch(() => {
					if (active) setMatches(previous => (previous.length === 0 ? previous : []));
				});
		}, 80);
		return () => {
			active = false;
			controller.abort();
			clearTimeout(handle);
		};
	}, [source, commandValue, argsPrefix]);

	return { ...gating, matches, completionKey: queryKey };
}

interface ComposerMentionState {
	readonly activeOption: number;
	readonly menuOpen: boolean;
	readonly matches: readonly SlashCommandOption[];
	readonly mention: ActiveMention | null;
	readonly queryKey: string | null;
	readonly setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
	readonly setDismissedQuery: React.Dispatch<React.SetStateAction<string | null>>;
}

// Cursor-anchored `@`-mention completion state: detect the active mention at the
// caret, debounce-fetch matches through `source` (aborting stale queries), and gate
// the menu the same way the slash menu does (dismiss-per-query + clamped index).
function useComposerMentionState(
	value: string,
	cursor: number,
	source: FileCompletionSource | undefined,
	enabled: boolean,
): ComposerMentionState {
	const mention = enabled && source ? activeMentionQuery(value, cursor) : null;
	const query = mention?.query ?? null;
	const queryKey = mention ? `@${mention.query}` : null;
	const [matches, setMatches] = useState<readonly SlashCommandOption[]>([]);
	const gating = useMenuGating(queryKey, matches);

	// Debounce-fetch keyed on the literal query (re-fetch when it changes), aborting
	// the prior request so a slow earlier query can't overwrite a newer result.
	useEffect(() => {
		if (!source || query === null) {
			setMatches(previous => (previous.length === 0 ? previous : []));
			return;
		}
		let active = true;
		const controller = new AbortController();
		const handle = setTimeout(() => {
			void source(query, controller.signal)
				.then(items => {
					if (active && !controller.signal.aborted) setMatches(items);
				})
				.catch(() => {
					if (active) setMatches(previous => (previous.length === 0 ? previous : []));
				});
		}, 80);
		return () => {
			active = false;
			controller.abort();
			clearTimeout(handle);
		};
	}, [source, query]);

	return { ...gating, matches, mention, queryKey };
}

function ComposerField({
	activeOption,
	attachments,
	pasteAttachments,
	onRemovePasteAttachment,
	onExpandPasteAttachment,
	disabled,
	footerSlot,
	leftSlot,
	matches,
	menuOpen,
	onApplyOption,
	onHoverOption,
	onKeyDown,
	onPaste,
	onDrop,
	onAttachFiles,
	onRemoveAttachment,
	onImagePillRemoved,
	onStop,
	onSubmit,
	onEditorChange,
	placeholder,
	rightSlot,
	voiceSlot,
	voiceListening,
	streaming,
	editorRef,
	value,
	committed,
	displayValue,
	onRemoveCommand,
	onRemoveChip,
	menuDataSlot,
	menuAriaLabel,
	menuCrumb,
	menuStageLabel,
	onCaretChange,
	pipelineTag,
	contextTag,
	primedSkills,
}: ComposerFieldProps) {
	// Click-to-zoom parity with transcript images: the attachment thumbnail opens the
	// shared lightbox; the corner ✕ removes. (Removing on whole-chip click hid the image
	// and blocked viewing it.)
	const [zoomed, setZoomed] = useState<ComposerImageAttachment | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const imagePills = useMemo<readonly PositionedImagePillData[]>(
		() =>
			attachments.flatMap((attachment, index) =>
				typeof attachment.inlineOffset === "number"
					? [{ id: attachment.id, number: index + 1, offset: attachment.inlineOffset }]
					: [],
			),
		[attachments],
	);

	return (
		<div
			data-slot="composer-field"
			className={cn(
				"relative mx-auto max-w-[780px] rounded-[14px] border border-fr-border bg-fr-surface transition-[border-color] duration-150",
				"focus-within:border-fr-accent-line",
			)}
			onDrop={onDrop}
			onDragOver={e => {
				// Mark image drags droppable; the default dragover handler blocks the drop event.
				if (e.dataTransfer.types.includes("Files")) e.preventDefault();
			}}
		>
			{menuOpen && (
				<SlashCommandMenu
					matches={matches}
					activeOption={activeOption}
					onHover={onHoverOption}
					onPick={onApplyOption}
					menuDataSlot={menuDataSlot}
					menuAriaLabel={menuAriaLabel}
					crumb={menuCrumb}
					stageLabel={menuStageLabel}
				/>
			)}
			{pasteAttachments.length > 0 && (
				<div data-slot="composer-paste-attachments" className="flex flex-wrap gap-2 px-3.5 pt-3">
					{pasteAttachments.map((att, index) => (
						<PasteAttachmentChip
							key={att.id}
							attachment={att}
							index={index}
							onExpand={() => onExpandPasteAttachment(att.id)}
							onRemove={() => onRemovePasteAttachment(att.id)}
						/>
					))}
				</div>
			)}
			{attachments.length > 0 && (
				<div data-slot="composer-attachments" className="flex flex-wrap gap-2 px-3.5 pt-3">
					{attachments.map((att, index) => (
						<div
							key={att.id}
							data-slot="composer-attachment"
							className="group relative size-14 shrink-0 overflow-hidden rounded-[7px] border border-fr-border bg-fr-surface-2"
						>
							<button
								type="button"
								onClick={() => setZoomed(att)}
								title={`Open image ${index + 1}`}
								aria-label={`Open image ${index + 1}`}
								className="block size-full cursor-zoom-in transition-opacity hover:opacity-90"
							>
								<img
									src={`data:${att.mimeType};base64,${att.data}`}
									alt={`image ${index + 1}`}
									className="size-full object-cover"
								/>
							</button>
							<button
								type="button"
								onClick={() => onRemoveAttachment(att.id)}
								title={`Remove image ${index + 1}`}
								aria-label={`Remove image ${index + 1}`}
								className="absolute top-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-fr-bg/80 text-fr-text-2 opacity-0 transition-opacity group-hover:opacity-100 hover:text-fr-text"
							>
								<Icon name="x" size={11} strokeWidth={2.5} />
							</button>
						</div>
					))}
				</div>
			)}
			<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3.5 pt-[13px] pb-1">
				{pipelineTag && (
					<span
						data-slot="composer-pipeline-pill"
						className="group/pipeline inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-fr-accent-line bg-fr-accent-dim py-1 pr-2 pl-1 font-secondary text-[0.95em] font-medium text-fr-accent"
					>
						<span
							aria-hidden
							className="grid size-5 shrink-0 place-items-center rounded-[7px] text-fr-accent-ink [background:var(--fr-accent-grad)]"
						>
							<Icon name={pipelineTag.icon} size={13} strokeWidth={2} />
						</span>
						<span className="max-w-[200px] fr-overflow">{pipelineTag.title}</span>
						{pipelineTag.onRemove && (
							<button
								type="button"
								onClick={pipelineTag.onRemove}
								aria-label={`Remove ${pipelineTag.title}`}
								title={`Remove ${pipelineTag.title}`}
								className="grid size-4 shrink-0 place-items-center rounded-full text-fr-accent/70 opacity-0 transition-opacity hover:text-fr-text group-hover/pipeline:opacity-100"
							>
								<Icon name="x" size={11} strokeWidth={2.5} />
							</button>
						)}
					</span>
				)}
				{contextTag && (
					<span
						data-slot="composer-context-pill"
						className="group/context inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-fr-accent-line bg-fr-accent-dim py-1 pr-2 pl-1 font-secondary text-[0.95em] font-medium text-fr-accent"
					>
						<span
							aria-hidden
							className="grid size-5 shrink-0 place-items-center rounded-[7px] text-fr-accent-ink [background:var(--fr-accent-grad)]"
						>
							<Icon name={contextTag.icon} size={13} strokeWidth={2} />
						</span>
						<span className="max-w-[200px] fr-overflow">{contextTag.label}</span>
						{contextTag.onRemove && (
							<button
								type="button"
								onClick={contextTag.onRemove}
								aria-label={`Remove ${contextTag.label}`}
								title={`Remove ${contextTag.label}`}
								className="grid size-4 shrink-0 place-items-center rounded-full text-fr-accent/70 opacity-0 transition-opacity hover:text-fr-text group-hover/context:opacity-100"
							>
								<Icon name="x" size={11} strokeWidth={2.5} />
							</button>
						)}
					</span>
				)}
				{primedSkills?.map(skill => (
					<span
						key={skill}
						data-slot="composer-skill-chip"
						className="inline-flex shrink-0 items-center gap-1 rounded-[6px] border border-fr-border bg-fr-surface-2 py-0.5 pr-1.5 pl-1 font-secondary text-[0.85em] text-fr-text-2"
						title={`Skill: ${skill}`}
					>
						<Icon name="spark" size={11} className="shrink-0 opacity-70" />
						<span className="max-w-[120px] fr-overflow">{skill}</span>
					</span>
				))}
				{committed && (
					<span
						data-slot="composer-command-pill"
						className="group/cmd inline-flex shrink-0 items-center gap-1 rounded-[6px] bg-fr-accent-dim py-0.5 pr-1 pl-1.5 font-secondary text-[0.85em] font-medium text-fr-accent"
					>
						<CommittedCommandGlyph command={committed.command} />
						<span className="max-w-[160px] fr-overflow">{committed.command.label}</span>
						{committed.sub && (
							<span data-slot="composer-command-sub" className="inline-flex items-center gap-1">
								<Icon name="caretR" size={11} className="opacity-60" />
								<span className="max-w-[120px] fr-overflow">{committed.sub.name}</span>
							</span>
						)}
						<button
							type="button"
							onClick={onRemoveCommand}
							aria-label={`Remove ${committed.command.label}`}
							title={`Remove ${committed.command.label}`}
							className="grid size-3.5 shrink-0 place-items-center rounded-full text-fr-accent/70 opacity-0 transition-opacity hover:text-fr-text group-hover/cmd:opacity-100"
						>
							<Icon name="x" size={10} strokeWidth={2.5} />
						</button>
					</span>
				)}
				{committed?.chips.map((chip, index) => (
					<span
						key={`${chip.flag}:${chip.start}`}
						data-slot="composer-arg-chip"
						className="group/chip inline-flex shrink-0 items-center gap-1 rounded-[6px] border border-fr-border bg-fr-surface-2 py-0.5 pr-1 pl-1.5 font-secondary text-[0.85em] text-fr-text-2"
					>
						<span className="opacity-70">{chip.flag.replace(/^--/, "")}</span>
						{chip.value !== undefined && <span className="font-medium text-fr-text">{chip.value}</span>}
						<button
							type="button"
							onClick={() => onRemoveChip(index)}
							aria-label={`Remove ${chip.flag}`}
							title={`Remove ${chip.flag}`}
							className="grid size-3.5 shrink-0 place-items-center rounded-full opacity-40 transition-opacity hover:opacity-100 group-hover/chip:opacity-70"
						>
							<Icon name="x" size={10} strokeWidth={2.5} />
						</button>
					</span>
				))}
				<MentionEditor
					className="min-w-[7rem]"
					handleRef={editorRef}
					value={displayValue}
					imagePills={imagePills}
					placeholder={placeholder}
					disabled={disabled}
					onChange={onEditorChange}
					onCaretChange={onCaretChange}
					onKeyDown={onKeyDown}
					onPaste={onPaste}
					onImagePillRemoved={onImagePillRemoved}
				/>
			</div>
			<input
				ref={fileInputRef}
				type="file"
				multiple
				className="hidden"
				tabIndex={-1}
				onChange={e => {
					onAttachFiles(Array.from(e.currentTarget.files ?? []));
					e.currentTarget.value = "";
				}}
			/>
			<ComposerActions
				disabled={disabled}
				hasAttachments={attachments.length > 0 || pasteAttachments.length > 0}
				leftSlot={leftSlot}
				onAttach={() => fileInputRef.current?.click()}
				onStop={onStop}
				onSubmit={onSubmit}
				rightSlot={rightSlot}
				voiceSlot={voiceSlot}
				voiceListening={voiceListening}
				streaming={streaming}
				value={value}
			/>
			{footerSlot && <div className="border-t border-fr-border-soft px-2.5 py-2">{footerSlot}</div>}
			{zoomed && (
				<ImageLightbox
					src={`data:${zoomed.mimeType};base64,${zoomed.data}`}
					alt={zoomed.name}
					onClose={() => setZoomed(null)}
				/>
			)}
		</div>
	);
}

interface PasteAttachmentChipProps {
	readonly attachment: ComposerPasteAttachment;
	readonly index: number;
	readonly onExpand: () => void;
	readonly onRemove: () => void;
}

// The collapsed "pasted text" chip (Codex parity): a clipped one-line preview the user can
// expand back into the field ("Show in text field") or discard (✕). The blob rides in the
// attachment, never the contenteditable — so a huge paste neither lags nor floods the field.
function PasteAttachmentChip({ attachment, index, onExpand, onRemove }: PasteAttachmentChipProps) {
	const isFile = !!attachment.name;
	const sizeLabel =
		typeof attachment.sizeBytes === "number"
			? `${Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB`
			: undefined;
	const subtext = isFile
		? attachment.binary
			? "Binary — not embedded"
			: [attachment.mimeType, sizeLabel, attachment.truncated ? "truncated" : undefined]
					.filter(Boolean)
					.join(" · ") || "Attached file"
		: "Show in text field";
	const label = isFile ? (attachment.name ?? "file") : pastePreview(attachment.text);
	const removeLabel = isFile ? `Remove file ${attachment.name}` : `Remove pasted text ${index + 1}`;
	return (
		<div
			data-slot={isFile ? "composer-file-attachment" : "composer-paste-attachment"}
			className="group relative max-w-[260px] rounded-[10px] border border-fr-border bg-fr-surface-2"
		>
			<button
				type="button"
				onClick={isFile ? undefined : onExpand}
				disabled={isFile}
				title={isFile ? (attachment.name ?? "Attached file") : "Show in text field"}
				className={cn("flex w-full items-start gap-2 py-2 pr-6 pl-2 text-left", isFile && "cursor-default")}
			>
				<span className="grid size-7 shrink-0 place-items-center rounded-[7px] bg-fr-bg text-fr-text-2">
					<Icon name="file" size={15} />
				</span>
				<span className="flex min-w-0 flex-col gap-0.5">
					<span className="fr-overflow font-secondary text-fr-xs text-fr-text">{label}</span>
					<span className="inline-flex items-center gap-0.5 font-secondary text-fr-2xs text-fr-text-3 transition-colors group-hover:text-fr-text-2">
						{subtext}
						{!isFile && <Icon name="caretR" size={11} />}
					</span>
				</span>
			</button>
			<button
				type="button"
				onClick={onRemove}
				title={isFile ? "Remove file" : "Remove pasted text"}
				aria-label={removeLabel}
				className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-fr-bg/80 text-fr-text-2 opacity-0 transition-opacity group-hover:opacity-100 hover:text-fr-text"
			>
				<Icon name="x" size={11} strokeWidth={2.5} />
			</button>
		</div>
	);
}

/**
 * If `value` begins with a *known* slash command followed by a space (the command is
 * committed, not still being typed), split it into the command + trailing args — the
 * field then renders the command as a removable pill and the textarea holds only the
 * args. Returns null while the name is still being typed (let the menu drive) or when
 * the leading token isn't a known command (plain text).
 */
export function splitLeadingCommand(
	value: string,
	commands: readonly SlashCommandOption[] | undefined,
): { readonly command: SlashCommandOption; readonly args: string } | null {
	if (!commands || !value.startsWith("/")) return null;
	const spaceIndex = value.indexOf(" ");
	if (spaceIndex < 0) return null;
	const command = commands.find(option => option.value === value.slice(0, spaceIndex));
	return command ? { command, args: value.slice(spaceIndex + 1) } : null;
}

/** A committed `--flag` (optionally `--flag value` / `--flag=value`) rendered as a chip.
 *  `start`/`end` span the chip's token(s) in the FULL composer value, for removal surgery. */
export interface CommittedChip {
	readonly flag: string;
	readonly value?: string;
	readonly start: number;
	readonly end: number;
}

/** The staged decomposition of a committed command value: compound pill (command [+ sub]),
 *  flag chips, and the free-text remainder the editor holds. Derived from the value STRING —
 *  the string stays the single source of truth (drafts, echo, submit are all unchanged). */
export interface CommittedCommand {
	readonly command: SlashCommandOption;
	readonly sub: SlashCommandSubcommand | null;
	/** Span of the sub token in the full value, when `sub` is set. */
	readonly subSpan: { readonly start: number; readonly end: number } | null;
	readonly chips: readonly CommittedChip[];
	/** Committed prefix of the full value; the editor holds `rest` (= value minus prefix). */
	readonly prefix: string;
	readonly rest: string;
}

/**
 * Decompose a committed command value into pill segments + chips + editor rest.
 *
 * Grammar (left to right, each unit must be COMPLETE — followed by a space — to leave
 * the editor): `/cmd [sub] [--flag | --flag=v | --flag v]* rest…`. The subcommand only
 * matches the command's declarative `subcommands`; a bare `--flag` absorbs the next
 * token as its value only when `valueFlags` says the flag takes one (learned from the
 * completion row that inserted it — cosmetic grouping only, the string never changes).
 * Scanning stops at the first non-flag or still-being-typed token: that's free text.
 */
export function parseCommittedCommand(
	value: string,
	commands: readonly SlashCommandOption[] | undefined,
	valueFlags?: ReadonlySet<string>,
): CommittedCommand | null {
	const base = splitLeadingCommand(value, commands);
	if (!base) return null;
	const argsStart = value.length - base.args.length;
	const args = base.args;
	const tokenAt = (from: number): { readonly text: string; readonly start: number; readonly end: number } | null => {
		const match = /^\s*(\S+)/.exec(args.slice(from));
		if (!match?.[1]) return null;
		const start = from + match[0].length - match[1].length;
		return { text: match[1], start, end: start + match[1].length };
	};
	// A unit is committed once a space follows it; the trailing token is still being typed.
	const isCommitted = (end: number) => end < args.length && args[end] === " ";

	let scan = 0;
	let sub: SlashCommandSubcommand | null = null;
	let subSpan: { start: number; end: number } | null = null;
	if (base.command.subcommands?.length) {
		const token = tokenAt(0);
		if (token && isCommitted(token.end)) {
			const match = base.command.subcommands.find(s => s.name === token.text);
			if (match) {
				sub = match;
				subSpan = { start: argsStart + token.start, end: argsStart + token.end };
				scan = token.end + 1;
			}
		}
	}

	const chips: CommittedChip[] = [];
	for (;;) {
		const token = tokenAt(scan);
		if (!token?.text.startsWith("--") || !isCommitted(token.end)) break;
		const eq = token.text.indexOf("=");
		if (eq > 1) {
			chips.push({
				flag: token.text.slice(0, eq),
				value: token.text.slice(eq + 1),
				start: argsStart + token.start,
				end: argsStart + token.end,
			});
			scan = token.end + 1;
			continue;
		}
		if (valueFlags?.has(token.text)) {
			const valueToken = tokenAt(token.end + 1);
			if (valueToken && !valueToken.text.startsWith("-") && isCommitted(valueToken.end)) {
				chips.push({
					flag: token.text,
					value: valueToken.text,
					start: argsStart + token.start,
					end: argsStart + valueToken.end,
				});
				scan = valueToken.end + 1;
				continue;
			}
			break; // the value is still being typed — the pair stays in the editor
		}
		chips.push({ flag: token.text, start: argsStart + token.start, end: argsStart + token.end });
		scan = token.end + 1;
	}

	const lastChip = chips.at(-1);
	const prefixEnd = lastChip ? lastChip.end + 1 : sub ? argsStart + scan : argsStart;
	return {
		command: base.command,
		sub,
		subSpan,
		chips,
		prefix: value.slice(0, prefixEnd),
		rest: value.slice(prefixEnd),
	};
}

/** Remove a token span from the value, eating one adjacent separator space so the
 *  remaining parts don't grow double spaces. */
export function removeValueSpan(value: string, start: number, end: number): string {
	let from = start;
	let to = end;
	if (value[to] === " ") to += 1;
	else if (value[from - 1] === " ") from -= 1;
	return value.slice(0, from) + value.slice(to);
}

function useComposerFieldProps(props: ComposerProps): ComposerFieldProps {
	const {
		value,
		onChange,
		onSubmit,
		onSlash,
		onStop,
		streaming = false,
		placeholder = "Reply, or type / for commands...",
		disabled = false,
		slashCommands,
		fileCompletionSource,
		argumentCompletionSource,
		leftSlot,
		rightSlot,
		footerSlot,
		attachments: controlledAttachments,
		onAttachmentsChange,
		pasteAttachments: controlledPasteAttachments,
		onPasteAttachmentsChange,
		pipelineTag,
		contextTag,
		primedSkills,
		voice,
	} = props;
	const editorRef = useRef<MentionEditorHandle>(null);
	const contextVoiceEngine = useContext(ComposerVoiceEngineContext);
	const [cursor, setCursor] = useState(0);
	const [voiceListening, setVoiceListening] = useState(false);
	const [internalAttachments, setInternalAttachments] = useState<readonly ComposerImageAttachment[]>([]);
	const attachments = controlledAttachments ?? internalAttachments;
	// One mutator for both modes: controlled (parent owns the list, e.g. per-session
	// persistence) and uncontrolled (internal state). Used by add/remove/clear below.
	const applyAttachments = (
		next: (prev: readonly ComposerImageAttachment[]) => readonly ComposerImageAttachment[],
	) => {
		if (onAttachmentsChange) onAttachmentsChange(next(attachments));
		else setInternalAttachments(next);
	};
	const syncAttachmentOffsets = (positions: readonly { readonly id: string; readonly offset: number }[]) => {
		if (positions.length === 0 || attachments.length === 0) return;
		const offsetById = new Map(positions.map(position => [position.id, position.offset]));
		let changed = false;
		const next = attachments.map(attachment => {
			const inlineOffset = offsetById.get(attachment.id);
			if (inlineOffset === undefined || inlineOffset === attachment.inlineOffset) return attachment;
			changed = true;
			return { ...attachment, inlineOffset };
		});
		if (changed) applyAttachments(() => next);
	};
	const [internalPasteAttachments, setInternalPasteAttachments] = useState<readonly ComposerPasteAttachment[]>([]);
	const pasteAttachments = controlledPasteAttachments ?? internalPasteAttachments;
	const applyPasteAttachments = (
		next: (prev: readonly ComposerPasteAttachment[]) => readonly ComposerPasteAttachment[],
	) => {
		if (onPasteAttachmentsChange) onPasteAttachmentsChange(next(pasteAttachments));
		else setInternalPasteAttachments(next);
	};
	// A large plain-text paste becomes a removable chip instead of inline text (see onPaste).
	const addPasteAttachment = (text: string) => {
		applyPasteAttachments(prev => [...prev, { id: crypto.randomUUID(), text }]);
	};
	// Value-taking flags learned from applied completion rows (e.g. `--mode worktree` →
	// `--mode` takes a value), keyed per command. Cosmetic chip grouping only — the value
	// string is never rewritten, so a lost memory (draft restore) just degrades the view
	// to bare-flag chips + text. See parseCommittedCommand.
	const valueFlagsRef = useRef(new Map<string, Set<string>>());
	const committedCommand = parseCommittedCommand(
		value,
		slashCommands,
		valueFlagsRef.current.get(splitLeadingCommand(value, slashCommands)?.command.value ?? ""),
	);
	const displayValue = committedCommand ? committedCommand.rest : value;
	const slashState = useComposerSlashState(committedCommand ? "" : value, slashCommands);
	// `@`-mention search runs against the visible text (args when a command is
	// committed) at the caret; it takes precedence over the leading-slash menu when
	// an `@` token is active (the two are mutually exclusive in practice).
	const mentionState = useComposerMentionState(displayValue, cursor, fileCompletionSource, !disabled);
	// Declarative argument (subcommand) stage — `/fast ` → on|off|status. Owns the menu
	// until the subcommand commits into the pill; derived client-side, no fetch.
	const declarativeStage =
		committedCommand !== null && (committedCommand.command.subcommands?.length ?? 0) > 0 && !committedCommand.sub;
	const argState = useComposerArgState(
		declarativeStage && committedCommand ? { command: committedCommand.command, args: committedCommand.rest } : null,
	);
	// Dynamic argument stage (extension flags etc.) — engine-served rows, active once the
	// declarative stage is done (sub committed or none declared). The args prefix spans
	// everything after the command up to the caret, chips included, so the engine sees the
	// same text the TUI would.
	const dynamicEligible = committedCommand !== null && !declarativeStage && !disabled;
	const dynamicArgsPrefix = dynamicEligible
		? committedCommand.prefix.slice(committedCommand.command.value.length + 1) +
			committedCommand.rest.slice(0, cursor)
		: null;
	const dynamicState = useComposerDynamicArgState(
		dynamicEligible ? committedCommand.command.value : null,
		dynamicArgsPrefix,
		argumentCompletionSource,
	);

	// Paste/drop: insert an atomic inline pill at the caret for EACH image (so the user
	// sees where it landed), then batch-add the matching attachments (one applyAttachments
	// call avoids the controlled-mode stale-closure race for multi-file pastes). The pill
	// and attachment share an id, so removal stays in lockstep.
	const addImageFiles = (files: readonly File[]) => {
		if (files.length === 0) return;
		const base = attachments.length;
		const pending = files.map((file, index) => {
			const id = crypto.randomUUID();
			editorRef.current?.insertImagePill({ id, number: base + index + 1 });
			const inlineOffset = editorRef.current?.imagePillOffsets().find(position => position.id === id)?.offset;
			return readImageAttachment(file, id).then(attachment =>
				inlineOffset === undefined ? attachment : { ...attachment, inlineOffset },
			);
		});
		void Promise.all(pending).then(added => applyAttachments(prev => [...prev, ...added]));
	};
	// Paste path for a copied transcript message: its image(s) arrive as data-URL `<img>` in
	// `text/html`. Mirror addImageFiles — a pill per image at the caret + the matching attachment.
	const addImageDataUrls = (urls: readonly string[]) => {
		const base = attachments.length;
		const added: ComposerImageAttachment[] = [];
		for (const url of urls) {
			const id = crypto.randomUUID();
			const attachment = attachmentFromDataUrl(url, id);
			if (!attachment) continue;
			editorRef.current?.insertImagePill({ id, number: base + added.length + 1 });
			added.push(attachment);
		}
		if (added.length > 0) {
			const offsetById = new Map(
				(editorRef.current?.imagePillOffsets() ?? []).map(position => [position.id, position.offset]),
			);
			applyAttachments(prev => [
				...prev,
				...added.map(attachment => {
					const inlineOffset = offsetById.get(attachment.id);
					return inlineOffset === undefined ? attachment : { ...attachment, inlineOffset };
				}),
			]);
		}
	};
	// Non-image files (dropped or picked) ride as removable file chips (text embedded, binary noted),
	// folded into the message on submit. One applyPasteAttachments call avoids the controlled-mode
	// stale-closure race for multi-file drops (same reasoning as addImageFiles).
	const addFileAttachments = (files: readonly File[]) => {
		if (files.length === 0) return;
		void Promise.all(files.map(file => readFileAttachment(file, crypto.randomUUID()))).then(added =>
			applyPasteAttachments(prev => [...prev, ...added]),
		);
	};
	// Drop / attach-button entry point: images become inline base64 attachments (with caret pills),
	// every other file becomes a folded file chip.
	const addFiles = (files: readonly File[]) => {
		const images = files.filter(isImageFile);
		const others = files.filter(file => !isImageFile(file));
		if (images.length > 0) addImageFiles(images);
		if (others.length > 0) addFileAttachments(others);
	};
	const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
		const files = imageFilesFromTransfer(e.clipboardData);
		if (files.length > 0) {
			e.preventDefault(); // otherwise the image also lands as a file-path / blob text paste
			addImageFiles(files);
			return;
		}
		// No image FILES (OS screenshot) — but a copied transcript message carries its image(s) as
		// data-URL `<img>` in text/html. Extract + attach them, then paste the text minus the now-
		// redundant "Image N" pill labels. Without this the image is dropped and only the text lands.
		const dataUrls = imageDataUrlsFromHtml(e.clipboardData.getData("text/html"));
		if (dataUrls.length === 0) {
			// No images at all — a large plain-text blob becomes a chip (kept out of the editor so it
			// neither lags the contenteditable nor floods the field); small pastes fall through to the
			// editor's default inline insert.
			const pasted = e.clipboardData.getData("text/plain");
			if (isLargePaste(pasted)) {
				e.preventDefault();
				addPasteAttachment(pasted);
			}
			return;
		}
		e.preventDefault();
		addImageDataUrls(dataUrls);
		const text = stripPastedImageLabels(e.clipboardData.getData("text/plain"));
		if (text) editorRef.current?.insertText(text);
	};
	const onDrop = (e: React.DragEvent) => {
		const files = filesFromTransfer(e.dataTransfer);
		if (files.length === 0) return; // not a file drag (e.g. a pane-rearrange drag) — let it bubble
		e.preventDefault();
		addFiles(files);
	};
	// Tray ✕: drop the attachment AND its inline pill together.
	const onRemoveAttachment = (id: string) => {
		editorRef.current?.removeImagePill(id);
		applyAttachments(prev => prev.filter(att => att.id !== id));
	};
	// In-editor pill deletion (Backspace/Delete on the pill): drop the mirrored attachment.
	const onImagePillRemoved = (id: string) => applyAttachments(prev => prev.filter(att => att.id !== id));
	// Keep every inline pill's `Image N` in step with the tray order as images are added/removed.
	useEffect(() => {
		editorRef.current?.syncImagePillLabels(attachments.map(att => att.id));
	}, [attachments]);
	// "Show in text field": fold the blob back into the editor (same ordering as submit) and
	// drop the chip. This is a deliberate one-off, so the big inline render cost is acceptable.
	const onExpandPasteAttachment = (id: string) => {
		const attachment = pasteAttachments.find(p => p.id === id);
		if (!attachment) return;
		onChange(combineMessage(value, attachment.text));
		applyPasteAttachments(prev => prev.filter(p => p.id !== id));
		editorRef.current?.focus();
	};
	const onRemovePasteAttachment = (id: string) => applyPasteAttachments(prev => prev.filter(p => p.id !== id));

	// Send when there's text OR at least one image; clear the pending attachments on submit
	// (the text draft is cleared by the parent's useComposerDraft on a successful send).
	const submitValue = () => {
		const pasted = pasteAttachments.map(foldPasteAttachment).join("\n\n");
		let messageText = combineMessage(value, pasted);
		if (!messageText.trim() && attachments.length === 0) return;
		// Write [Image #N] markers into the text at each pill's spot (matches the TUI) so image
		// order lives IN THE TEXT — the engine stores it verbatim, so positions survive the echo
		// + reload (no hoisting to the end). Insert descending so earlier offsets don't shift.
		const numberById = new Map(attachments.map((a, i) => [a.id, i + 1]));
		const marks = (editorRef.current?.imagePillOffsets() ?? [])
			.map(o => ({ offset: o.offset, n: numberById.get(o.id) }))
			.filter((x): x is { offset: number; n: number } => typeof x.n === "number")
			.sort((a, b) => b.offset - a.offset);
		for (const x of marks) {
			const at = Math.max(0, Math.min(messageText.length, x.offset));
			messageText = `${messageText.slice(0, at)}[Image #${x.n}]${messageText.slice(at)}`;
		}
		onSubmit(messageText, attachments);
		applyAttachments(() => []);
		applyPasteAttachments(() => []);
	};
	const focusEditor = () => editorRef.current?.focus();
	const applySlash = (option: SlashCommandOption) => applySlashCommand(option, onChange, focusEditor);
	// Picked mentions become atomic inline pills the editor inserts imperatively at the
	// live caret — a string round-trip can't tell a committed pill from typed `@text`.
	const applyMentionOption = (option: SlashCommandOption) => {
		editorRef.current?.insertMention({
			value: option.value,
			label: option.label,
			path: option.description ?? option.value,
			isDirectory: option.label.endsWith("/"),
		});
	};
	// A picked declarative argument re-assembles the full `/cmd <sub> ` text (trailing
	// space → the subcommand commits into the pill segment). The committed-command pill
	// re-derives from the leading token, so it survives.
	const applyArg = (option: SlashCommandOption) => {
		if (!committedCommand) return;
		onChange(`${committedCommand.command.value} ${option.value} `);
		focusEditor();
	};
	// A picked dynamic argument row carries the FULL replacement for the args text up to
	// the caret (engine `replaceLastToken` semantics — the same slice we queried with);
	// text after the caret is preserved, like the TUI. When the row completes a
	// `--flag value` pair at its tail, remember the flag as value-taking so
	// parseCommittedCommand groups the pair into one chip (cosmetic only — the string is
	// exactly what the row said).
	const applyDynamicArg = (option: SlashCommandOption) => {
		if (!committedCommand) return;
		const tokens = option.value.split(/\s+/).filter(Boolean);
		const last = tokens.at(-1);
		const beforeLast = tokens.at(-2);
		if (last && beforeLast?.startsWith("--") && !beforeLast.includes("=") && !last.startsWith("-")) {
			const key = committedCommand.command.value;
			const flags = valueFlagsRef.current.get(key) ?? new Set<string>();
			flags.add(beforeLast);
			valueFlagsRef.current.set(key, flags);
		}
		const tail = committedCommand.rest.slice(cursor);
		let replaced = `${committedCommand.command.value} ${option.value}`;
		if (!tail && !replaced.endsWith(" ")) replaced = `${replaced} `;
		onChange(`${replaced}${tail}`);
		focusEditor();
	};
	const onRemoveCommand = () => {
		onChange(committedCommand ? committedCommand.rest : "");
		focusEditor();
	};
	const onRemoveChip = (index: number) => {
		const chip = committedCommand?.chips[index];
		if (!chip) return;
		onChange(removeValueSpan(value, chip.start, chip.end));
		focusEditor();
	};
	// Backspace on an empty editor un-commits the last staged unit: chip → sub → command.
	const popCommitted = () => {
		if (!committedCommand) return;
		const lastChip = committedCommand.chips.at(-1);
		if (lastChip) {
			onChange(removeValueSpan(value, lastChip.start, lastChip.end));
		} else if (committedCommand.subSpan) {
			onChange(removeValueSpan(value, committedCommand.subSpan.start, committedCommand.subSpan.end));
		} else {
			onChange(committedCommand.rest);
		}
		focusEditor();
	};

	// Unify the four completion menus onto one render/nav path. Precedence: an active
	// `@`-mention wins; else the declarative subcommand stage; else the dynamic argument
	// stage; else the leading-slash command menu. (Slash is fed "" while committed, and
	// the two argument stages are mutually exclusive by construction.)
	const mentionActive = mentionState.menuOpen;
	const argActive = !mentionActive && argState.menuOpen;
	const dynamicActive = !mentionActive && !argActive && dynamicState.menuOpen;
	const active = mentionActive ? mentionState : argActive ? argState : dynamicActive ? dynamicState : slashState;
	const activeOption = active.activeOption;
	const matches = active.matches;
	const menuOpen = mentionActive || argActive || dynamicActive || slashState.menuOpen;
	const completionKey = mentionActive
		? mentionState.queryKey
		: argActive
			? argState.completionKey
			: dynamicActive
				? dynamicState.completionKey
				: slashState.completionKey;
	const setActiveIndex = active.setActiveIndex;
	const setDismissedQuery = active.setDismissedQuery;
	const applyActive = mentionActive
		? applyMentionOption
		: argActive
			? applyArg
			: dynamicActive
				? applyDynamicArg
				: applySlash;

	// Ghost placeholder while a command is committed and the editor is empty: the
	// committed subcommand's usage, else the command's static input hint, else the
	// subcommand names while the declarative stage is open (TUI inline-hint parity).
	const committedPlaceholder = committedCommand
		? (committedCommand.sub?.usage ??
			committedCommand.command.inputHint ??
			(declarativeStage ? (committedCommand.command.subcommands ?? []).map(sub => sub.name).join(" | ") : ""))
		: placeholder;

	return {
		activeOption,
		attachments,
		pasteAttachments,
		onExpandPasteAttachment,
		onRemovePasteAttachment,
		disabled,
		footerSlot,
		leftSlot,
		matches,
		menuOpen,
		menuDataSlot: mentionActive
			? "composer-mention-menu"
			: argActive || dynamicActive
				? "composer-arg-menu"
				: "composer-slash-menu",
		menuAriaLabel: mentionActive
			? "File mentions"
			: argActive || dynamicActive
				? "Command arguments"
				: "Slash commands",
		menuCrumb:
			(argActive || dynamicActive) && committedCommand
				? [committedCommand.command.value, ...(committedCommand.sub ? [committedCommand.sub.name] : [])]
				: undefined,
		menuStageLabel: argActive ? "subcommand" : dynamicActive ? "options" : undefined,
		onApplyOption: applyActive,
		onHoverOption: setActiveIndex,
		editorRef,
		onCaretChange: setCursor,
		onEditorChange: (next, caret, imagePills) => {
			setCursor(caret);
			onChange(committedCommand ? `${committedCommand.prefix}${next}` : next);
			syncAttachmentOffsets(imagePills);
		},
		onKeyDown: e =>
			handleComposerKeyDown(e, {
				activeOption,
				completionKey,
				disabled,
				matches,
				menuOpen,
				onSlash,
				slashCommands,
				setActiveIndex,
				setDismissedQuery,
				submitValue,
				applyActive,
				value,
				displayValue,
				popCommitted: committedCommand ? popCommitted : undefined,
				streaming,
				onStop,
			}),
		onPaste,
		onDrop,
		onAttachFiles: addFiles,
		onRemoveAttachment,
		onImagePillRemoved,
		onStop,
		onSubmit: submitValue,
		placeholder: committedPlaceholder,
		rightSlot,
		voiceSlot:
			voice === false ? null : (
				<VoiceInput
					engine={voice?.engine ?? contextVoiceEngine ?? undefined}
					lang={voice?.lang}
					silenceMs={voice?.silenceMs}
					disabled={disabled}
					hideWhenUnsupported
					onListeningChange={listening => {
						setVoiceListening(listening);
						voice?.onListeningChange?.(listening);
					}}
					onTranscript={text => {
						// Caret-precise insertion through the editor (keeps pills intact);
						// trailing space so typing flows on after the dictation.
						editorRef.current?.insertText(`${text} `);
						editorRef.current?.focus();
					}}
				/>
			),
		voiceListening,
		streaming,
		value,
		displayValue,
		committed: committedCommand,
		onRemoveCommand,
		onRemoveChip,
		pipelineTag,
		contextTag,
		primedSkills,
	};
}

export function Composer(props: ComposerProps) {
	const { topSlot, showTips = false, className } = props;
	const fieldProps = useComposerFieldProps(props);
	// TUI-parity model hotkeys (Ctrl+P role cycle · Alt+T team swap) live at the
	// composer root so they work whenever a session surface is on screen.
	const modelHotkeyFeedback = useModelHotkeys();

	// `relative z-[2]` lifts the composer above the roaming stream wisp (z-[1]) — the
	// opaque `bg-fr-bg` then clips it — while staying below the split inactive-pane
	// dim (z-10) and every modal.
	return (
		<div data-slot="composer" className={cn("relative z-[2] flex-none bg-fr-bg px-7 pb-[18px] pt-2", className)}>
			<ModelHotkeyToast feedback={modelHotkeyFeedback} />
			{topSlot && <div className="mx-auto max-w-[780px]">{topSlot}</div>}
			<ComposerField {...fieldProps} />
			{showTips && <ComposerTips className="mx-auto mt-2.5 max-w-[780px] px-2" />}
		</div>
	);
}

export interface ComposerChipProps extends React.ComponentProps<"button"> {
	readonly tone?: "default" | "warn" | "add" | "del";
	readonly dot?: boolean;
}

export function ComposerChip({ tone = "default", dot, children, className, ...props }: ComposerChipProps) {
	return (
		<button
			type="button"
			data-slot="composer-chip"
			className={cn(
				"inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap rounded-[8px] border border-transparent px-[9px] py-[5px] text-xs transition-colors duration-[120ms]",
				"hover:bg-fr-surface-2 hover:text-fr-text",
				tone === "default" && "text-fr-text-2",
				tone === "warn" && "text-fr-warn",
				tone === "add" && "text-fr-add",
				tone === "del" && "text-fr-del",
				className,
			)}
			{...props}
		>
			{dot && (
				<span
					className={cn(
						"size-1.5 shrink-0 rounded-full",
						tone === "warn" && "bg-fr-warn",
						tone === "add" && "bg-fr-add",
						tone === "del" && "bg-fr-del",
						tone === "default" && "bg-fr-text-3",
					)}
				/>
			)}
			<span className="min-w-0 fr-overflow">{children}</span>
			<Icon name="caretD" size={11} strokeWidth={2} className="shrink-0 opacity-60" />
		</button>
	);
}

export interface ContextRadialProps {
	readonly percent: number;
	readonly onClick?: React.MouseEventHandler;
	readonly className?: string;
}

export function ContextRadial({ percent, onClick, className }: ContextRadialProps) {
	const r = 7.4;
	const c = 2 * Math.PI * r;
	const p = Math.max(0, Math.min(100, percent));
	const dash = (c * p) / 100;
	const tone = p >= 85 ? "var(--fr-del)" : p >= 65 ? "var(--fr-warn)" : "var(--fr-accent)";

	return (
		<button
			type="button"
			aria-label={`Context window, ${p}% used`}
			data-slot="context-radial"
			className={cn(
				"flex size-[30px] shrink-0 items-center justify-center rounded-[8px] text-fr-text-3 transition-colors duration-[120ms] hover:bg-fr-surface-2",
				className,
			)}
			onClick={onClick}
			title={`Context window · ${p}% used`}
		>
			<svg width="19" height="19" viewBox="0 0 19 19">
				<circle cx="9.5" cy="9.5" r={r} fill="none" stroke="var(--fr-surface-3)" strokeWidth="2.3" />
				<circle
					cx="9.5"
					cy="9.5"
					r={r}
					fill="none"
					stroke={tone}
					strokeWidth="2.3"
					strokeLinecap="round"
					strokeDasharray={`${dash} ${c}`}
					transform="rotate(-90 9.5 9.5)"
					className="transition-[stroke-dasharray] duration-300 ease"
				/>
			</svg>
		</button>
	);
}
