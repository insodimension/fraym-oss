import {
	type ClipboardEvent,
	type KeyboardEvent,
	type Ref,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
} from "react";
import { createFileIconElement, createImageIconElement } from "../../elements/file-type-icon";
import { cn } from "../../lib/cn";

/**
 * A contenteditable text field that renders committed `@`-file mentions as atomic,
 * non-editable inline pills (VS Code-style) while behaving like the textarea it
 * replaced: it is a drop-in over a string `value` (the composer's display value).
 *
 * Model — the DOM is the source of truth *during editing*; the editor only
 * re-renders from `value` on an EXTERNAL change (clear on submit, slash-command
 * commit, draft restore) and never echoes its own input back, so pills survive.
 * User-picked pills are inserted imperatively at the live caret (never re-derived
 * from a half-typed string), then serialize back to their `@path` token so the
 * engine receives text. External renders stay plain except for trusted system
 * seeds such as loop-agent context, which rehydrate to the same atomic pill while
 * preserving the serialized token.
 */
export interface MentionPillData {
	/** Serialized token the pill stands in for, e.g. `@apps/desktop/DEV.md`. */
	readonly value: string;
	/** Display label, e.g. `DEV.md` (directories keep their trailing `/`). */
	readonly label: string;
	/** Path used to resolve the file-type icon. */
	readonly path: string;
	readonly isDirectory: boolean;
}

/** An inline image-attachment reference pill. Atomic + non-editable like a mention,
 *  but serializes to EMPTY: the image rides the message as a separate attachment, so
 *  the pill only marks WHERE in the text the image was inserted (icon + "Image N"). */
export interface ImagePillData {
	/** Attachment id this pill mirrors — the link the composer uses to add/remove in lockstep. */
	readonly id: string;
	/** 1-based ordinal shown as `Image N` (kept in sync with the attachment tray order). */
	readonly number: number;
}
export interface PositionedImagePillData extends ImagePillData {
	/** Char offset in the serialized editor text where this zero-width pill belongs. */
	readonly offset: number;
}
const EMPTY_IMAGE_PILLS: readonly PositionedImagePillData[] = [];

export interface MentionEditorHandle {
	/** Replace the active `@`-token at the caret with a mention pill + trailing space. */
	insertMention(pill: MentionPillData): void;
	/** Insert an atomic image-reference pill at the caret (or append when there's no caret). */
	insertImagePill(pill: ImagePillData): void;
	/** Char offset of each inline image pill (by attachment id) in the serialized value. */
	imagePillOffsets(): { readonly id: string; readonly offset: number }[];
	/** Remove the image pill mirroring attachment `id` (composer-driven, e.g. tray ✕). */
	removeImagePill(id: string): void;
	/** Renumber every image pill from the attachment order so `Image N` tracks the tray. */
	syncImagePillLabels(orderedIds: readonly string[]): void;
	/** Insert plain text at the caret (composer pastes cleaned text alongside extracted images). */
	insertText(text: string): void;
	focus(): void;
}

export interface MentionEditorProps {
	readonly value: string;
	readonly imagePills?: readonly PositionedImagePillData[];
	readonly placeholder?: string;
	readonly disabled?: boolean;
	readonly className?: string;
	readonly onChange: (
		value: string,
		caret: number,
		imagePills: readonly { readonly id: string; readonly offset: number }[],
	) => void;
	readonly onCaretChange: (caret: number) => void;
	readonly onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
	readonly onPaste?: (event: ClipboardEvent<HTMLDivElement>) => void;
	readonly handleRef?: Ref<MentionEditorHandle>;
	/** Fired when the user deletes an image pill in place (Backspace/Delete) so the
	 *  composer can drop the mirrored attachment. */
	readonly onImagePillRemoved?: (id: string) => void;
}

function isPill(node: Node): node is HTMLElement {
	return node.nodeType === 1 && (node as HTMLElement).hasAttribute("data-mention");
}

function isImagePill(node: Node): node is HTMLElement {
	return node.nodeType === 1 && (node as HTMLElement).hasAttribute("data-image-pill");
}

/** Length a node contributes to the serialized string — exactly its serialized text's
 *  length, so caret math and serialization can never drift (mention pills count their
 *  token, image pills are zero-width). */
function nodeLength(node: Node): number {
	return nodeText(node).length;
}

function nodeText(node: Node): string {
	if (node.nodeType === 3) return node.textContent ?? "";
	if (isImagePill(node)) return "";
	if (isPill(node)) return node.getAttribute("data-value") ?? "";
	if (node.nodeName === "BR") return "\n";
	return node.textContent ?? "";
}

/** Serialize the editor's flat child list to the string value (pills → `@path`). */
export function serializeEditor(root: HTMLElement): string {
	let out = "";
	for (const child of Array.from(root.childNodes)) out += nodeText(child);
	return out;
}
/** Char offsets of each inline image pill within the serialized value. Image pills are
 *  zero-width, so a pill's offset is the length of all serialized text before it. */
export function imagePillOffsets(root: HTMLElement): { readonly id: string; readonly offset: number }[] {
	const out: { id: string; offset: number }[] = [];
	let offset = 0;
	for (const child of Array.from(root.childNodes)) {
		if (isImagePill(child)) {
			const id = child.getAttribute("data-image-id");
			if (id) out.push({ id, offset });
		}
		offset += nodeText(child).length;
	}
	return out;
}

/** Caret char-offset of the current selection within `root`, or null if outside. */
export function editorCaretOffset(root: HTMLElement, selection: Selection | null): number | null {
	if (!selection || selection.rangeCount === 0) return null;
	const { anchorNode, anchorOffset } = selection;
	if (!anchorNode || !root.contains(anchorNode)) return null;
	const children = Array.from(root.childNodes);
	// Caret anchored on the root: anchorOffset is a child index.
	if (anchorNode === root) {
		let offset = 0;
		for (let i = 0; i < anchorOffset && i < children.length; i += 1) offset += nodeLength(children[i] as Node);
		return offset;
	}
	// Caret inside a (top-level) text node: sum prior siblings + local offset.
	let offset = 0;
	for (const child of children) {
		if (child === anchorNode) return offset + anchorOffset;
		if (child.contains(anchorNode)) return offset + nodeLength(child); // inside a pill → treat as after it
		offset += nodeLength(child);
	}
	return offset;
}

const LOOP_AGENT_SEED_RE = /@(?:\.fraym)\/agents\/([^/\s]+)\/agent\.md/g;

function loopAgentLabel(slug: string): string {
	try {
		return decodeURIComponent(slug);
	} catch {
		return slug;
	}
}

function appendPlainText(root: HTMLElement, value: string): void {
	const lines = value.split("\n");
	lines.forEach((line, index) => {
		if (line) root.appendChild(root.ownerDocument.createTextNode(line));
		if (index < lines.length - 1) root.appendChild(root.ownerDocument.createElement("br"));
	});
}

/** Append external text to `root`. Most text stays plain; loop-agent seeds rehydrate
 *  into atomic pills so the field shows the loop name instead of the model-facing path. */
function appendExternalText(root: HTMLElement, value: string): void {
	let lastIndex = 0;
	for (const match of value.matchAll(LOOP_AGENT_SEED_RE)) {
		const token = match[0];
		const slug = match[1];
		const index = match.index ?? 0;
		if (index > lastIndex) appendPlainText(root, value.slice(lastIndex, index));
		const pill = buildPill(root.ownerDocument, {
			value: token,
			label: loopAgentLabel(slug ?? token),
			path: token.slice(1),
			isDirectory: false,
		});
		pill.setAttribute("data-loop-agent-mention", "");
		root.appendChild(pill);
		lastIndex = index + token.length;
	}
	if (lastIndex < value.length) appendPlainText(root, value.slice(lastIndex));
}

/** Render external text plus its persisted zero-width image pills. Offsets are clamped
 *  to the live value so a stale draft can never throw or lose the attachment tray. */
function renderEditor(root: HTMLElement, value: string, imagePills: readonly PositionedImagePillData[]): void {
	root.replaceChildren();
	let textOffset = 0;
	const ordered = imagePills
		.map((pill, index) => ({ pill, index }))
		.sort((a, b) => a.pill.offset - b.pill.offset || a.index - b.index);
	for (const { pill } of ordered) {
		const offset = Math.max(textOffset, Math.min(value.length, pill.offset));
		appendExternalText(root, value.slice(textOffset, offset));
		root.appendChild(buildImagePill(root.ownerDocument, pill));
		textOffset = offset;
	}
	appendExternalText(root, value.slice(textOffset));
}

/** Place the caret at char-offset `target` within `root` (clamped).
 *
 *  Image pills are ZERO-WIDTH (they serialize to ""), so a text offset is
 *  ambiguous at a pill boundary: before-the-pill and after-the-pill are the
 *  same `target`. The caret always lands AFTER the pill(s) at the resolved
 *  offset — the insert path puts it there, and every external restore (draft,
 *  session switch-back) must agree, or the next keystroke lands BEFORE a
 *  just-pasted image. Exported for tests — the test harness has no native
 *  Selection, so the caret-resolution contract is pinned directly. */
export function setCaret(root: HTMLElement, target: number): void {
	const selection = root.ownerDocument.getSelection();
	if (!selection) return;
	const range = root.ownerDocument.createRange();
	const place = () => {
		range.collapse(true);
		selection.removeAllRanges();
		selection.addRange(range);
	};
	let remaining = Math.max(0, target);
	const children = Array.from(root.childNodes);
	for (let index = 0; index < children.length; index++) {
		const child = children[index] as Node;
		const len = nodeLength(child);
		if (remaining < len) {
			// Strictly inside this node — a text node splits, an atomic (br) is preceded.
			if (child.nodeType === 3) {
				range.setStart(child, Math.min(remaining, child.textContent?.length ?? 0));
			} else {
				range.setStartBefore(child);
			}
			place();
			return;
		}
		if (remaining === len) {
			// At this node's trailing boundary — skip forward past every zero-width
			// image pill sitting at the same text offset, then land after it.
			let anchor: Node = child;
			let next = index + 1;
			while (next < children.length && isImagePill(children[next] as Node)) {
				anchor = children[next] as Node;
				next += 1;
			}
			if (anchor === child && child.nodeType === 3) {
				range.setStart(child, Math.min(len, child.textContent?.length ?? 0));
			} else {
				range.setStartAfter(anchor);
			}
			place();
			return;
		}
		remaining -= len;
	}
	// Past the end → caret at the very end.
	range.selectNodeContents(root);
	range.collapse(false);
	selection.removeAllRanges();
	selection.addRange(range);
}

function buildPill(doc: Document, pill: MentionPillData): HTMLElement {
	const span = doc.createElement("span");
	span.setAttribute("data-mention", "");
	span.setAttribute("data-value", pill.value);
	span.setAttribute("contenteditable", "false");
	span.setAttribute("title", pill.path);
	span.className =
		"mx-px inline-flex translate-y-px items-center gap-1 rounded-[6px] bg-fr-accent-dim px-1.5 py-0.5 align-baseline font-secondary text-[0.85em] font-medium text-fr-accent";
	span.appendChild(createFileIconElement(pill.path, pill.isDirectory, 13));
	const label = doc.createElement("span");
	label.textContent = pill.label;
	span.appendChild(label);
	return span;
}

/** Replace the active `@`-token ending at the caret with a pill. Returns success. */
function insertPillAtCaret(root: HTMLElement, pill: MentionPillData): boolean {
	const doc = root.ownerDocument;
	const selection = doc.getSelection();
	if (!selection || selection.rangeCount === 0) return false;
	const node = selection.anchorNode;
	if (node === null || node.nodeType !== 3 || !root.contains(node)) return false;
	const text = node.textContent ?? "";
	const caret = selection.anchorOffset;
	const before = text.slice(0, caret);
	const match = /(?:^|\s)@([^\s@]*)$/.exec(before);
	if (!match) return false;
	const tokenStart = caret - (match[1]?.length ?? 0) - 1;
	const left = text.slice(0, tokenStart);
	const right = text.slice(caret);
	const parent = node.parentNode;
	if (!parent) return false;
	const frag = doc.createDocumentFragment();
	if (left) frag.appendChild(doc.createTextNode(left));
	frag.appendChild(buildPill(doc, pill));
	const tail = doc.createTextNode(right.startsWith(" ") ? right : ` ${right}`);
	frag.appendChild(tail);
	parent.replaceChild(frag, node);
	// Caret just after the inserted pill + its trailing space.
	const range = doc.createRange();
	range.setStart(tail, 1);
	range.collapse(true);
	selection.removeAllRanges();
	selection.addRange(range);
	return true;
}

function buildImagePill(doc: Document, pill: ImagePillData): HTMLElement {
	const span = doc.createElement("span");
	span.setAttribute("data-image-pill", "");
	span.setAttribute("data-image-id", pill.id);
	span.setAttribute("contenteditable", "false");
	// The text caret renders at this atomic element's box edge. The outer span owns
	// the inline-flow margin + a TRANSPARENT right pad; the visible chip (background,
	// rounding) lives on the inner span, so the caret lands a pad-width clear of the
	// chip instead of overlapping its rounded right corner.
	span.className = "mx-1 inline-flex translate-y-px select-none align-baseline pr-1.5";
	const chip = doc.createElement("span");
	chip.className =
		"inline-flex items-center gap-1 rounded-[6px] bg-fr-surface-2 px-1.5 py-0.5 font-secondary text-[0.85em] font-medium text-fr-text-2";
	chip.appendChild(createImageIconElement(13));
	const label = doc.createElement("span");
	label.setAttribute("data-image-label", "");
	label.textContent = `Image ${pill.number}`;
	chip.appendChild(label);
	span.appendChild(chip);
	return span;
}

/** Insert an atomic image pill at the live caret (splitting the text node), or append
 *  it to the end when there is no usable caret. Image pills add no text, so no trailing
 *  space is inserted (unlike mentions). */
function insertImagePillAtCaret(root: HTMLElement, pill: ImagePillData): void {
	const doc = root.ownerDocument;
	const el = buildImagePill(doc, pill);
	const selection = doc.getSelection?.() ?? null;
	const node = selection && selection.rangeCount > 0 ? selection.anchorNode : null;
	const placeCaretAfter = () => {
		if (!selection) return;
		const range = doc.createRange();
		range.setStartAfter(el);
		range.collapse(true);
		selection.removeAllRanges();
		selection.addRange(range);
	};
	if (node && node.nodeType === 3 && root.contains(node)) {
		const text = node.textContent ?? "";
		const caret = selection?.anchorOffset ?? text.length;
		const parent = node.parentNode;
		if (parent) {
			const frag = doc.createDocumentFragment();
			const left = text.slice(0, caret);
			const right = text.slice(caret);
			if (left) frag.appendChild(doc.createTextNode(left));
			frag.appendChild(el);
			if (right) frag.appendChild(doc.createTextNode(right));
			parent.replaceChild(frag, node);
			placeCaretAfter();
			return;
		}
	}
	if (node === root && selection) {
		root.insertBefore(el, root.childNodes[selection.anchorOffset] ?? null);
		placeCaretAfter();
		return;
	}
	root.appendChild(el);
	placeCaretAfter();
}

/** The image pill a collapsed caret would delete in `direction` (Backspace → the pill
 *  immediately before the caret; Delete → the one immediately after), or null. */
function adjacentImagePill(root: HTMLElement, direction: "back" | "forward"): HTMLElement | null {
	const selection = root.ownerDocument.getSelection?.() ?? null;
	if (!selection?.isCollapsed || selection.rangeCount === 0) return null;
	const { startContainer, startOffset } = selection.getRangeAt(0);
	if (!root.contains(startContainer)) return null;
	let neighbor: Node | null = null;
	if (startContainer === root) {
		neighbor = root.childNodes[direction === "back" ? startOffset - 1 : startOffset] ?? null;
	} else if (startContainer.nodeType === 3) {
		const text = startContainer.textContent ?? "";
		if (direction === "back" ? startOffset > 0 : startOffset < text.length) return null; // deleting a char
		neighbor = direction === "back" ? startContainer.previousSibling : startContainer.nextSibling;
	} else {
		return null;
	}
	return neighbor && isImagePill(neighbor) ? (neighbor as HTMLElement) : null;
}

export function MentionEditor({
	value,
	imagePills = EMPTY_IMAGE_PILLS,
	placeholder,
	disabled,
	className,
	onChange,
	onCaretChange,
	onKeyDown,
	onPaste,
	handleRef,
	onImagePillRemoved,
}: MentionEditorProps) {
	const ref = useRef<HTMLDivElement>(null);
	// The last string the editor itself produced — guards the external-render diff so
	// the editor never re-renders (and loses pills/caret) on its own input echo.
	const lastValue = useRef<string>("");

	const emitChange = useCallback(() => {
		const root = ref.current;
		if (!root) return;
		const next = serializeEditor(root);
		lastValue.current = next;
		onChange(
			next,
			editorCaretOffset(root, root.ownerDocument.getSelection?.() ?? null) ?? next.length,
			imagePillOffsets(root),
		);
	}, [onChange]);

	// Remove an image pill element, settle the value, and notify so the composer drops
	// the mirrored attachment. Used by both in-editor key deletion and the tray ✕.
	const removeImagePillEl = useCallback(
		(el: HTMLElement) => {
			const id = el.getAttribute("data-image-id");
			el.remove();
			emitChange();
			if (id) onImagePillRemoved?.(id);
		},
		[emitChange, onImagePillRemoved],
	);

	useImperativeHandle(
		handleRef,
		() => ({
			insertMention(pill) {
				const root = ref.current;
				if (!root) return;
				if (insertPillAtCaret(root, pill)) emitChange();
			},
			insertImagePill(pill) {
				const root = ref.current;
				if (!root) return;
				insertImagePillAtCaret(root, pill);
				emitChange();
			},
			imagePillOffsets() {
				const root = ref.current;
				return root ? imagePillOffsets(root) : [];
			},
			removeImagePill(id) {
				const root = ref.current;
				const el = root?.querySelector<HTMLElement>(`[data-image-pill][data-image-id="${id}"]`);
				if (el) {
					el.remove();
					emitChange();
				}
			},
			syncImagePillLabels(orderedIds) {
				const root = ref.current;
				if (!root) return;
				for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-image-pill]"))) {
					const index = orderedIds.indexOf(el.getAttribute("data-image-id") ?? "");
					const label = el.querySelector("[data-image-label]");
					if (label && index >= 0) label.textContent = `Image ${index + 1}`;
				}
			},
			insertText(text) {
				const root = ref.current;
				if (!root) return;
				root.focus();
				root.ownerDocument.execCommand("insertText", false, text);
				emitChange();
			},
			focus() {
				ref.current?.focus();
			},
		}),
		[emitChange],
	);

	// External render: only when text or persisted image-pill positions diverge from the live DOM.
	// Session switches can restore the same plain text with a different attachment set, so comparing
	// `value` alone is insufficient: the tray would return while its zero-width pills stayed erased.
	useEffect(() => {
		const root = ref.current;
		if (!root) return;
		const expectedPills = imagePills
			.map((pill, index) => ({ id: pill.id, offset: pill.offset, index }))
			.sort((a, b) => a.offset - b.offset || a.index - b.index);
		const currentPills = imagePillOffsets(root);
		const pillsMatch =
			currentPills.length === expectedPills.length &&
			currentPills.every(
				(pill, index) => pill.id === expectedPills[index]?.id && pill.offset === expectedPills[index]?.offset,
			);
		if (value === lastValue.current && serializeEditor(root) === value && pillsMatch) return;
		renderEditor(root, value, imagePills);
		lastValue.current = value;
		if (root.ownerDocument.activeElement === root) setCaret(root, value.length);
	}, [value, imagePills]);

	const reportCaret = () => {
		const root = ref.current;
		if (root) onCaretChange(editorCaretOffset(root, root.ownerDocument.getSelection()) ?? 0);
	};

	return (
		<div
			ref={ref}
			data-slot="mention-editor"
			role="textbox"
			aria-multiline="true"
			aria-label={placeholder}
			contentEditable={!disabled}
			suppressContentEditableWarning
			// Native text services OFF — a code-heavy prompt field wants no squiggles or
			// auto-"corrections", and on macOS WKWebView (the desktop shell) the FIRST
			// keystroke into an editable area otherwise synchronously initializes
			// NSSpellChecker / autocorrect / Writing Tools — a one-time multi-second
			// input stall. Same mitigation VS Code applies to its editor surfaces.
			spellCheck={false}
			autoCorrect="off"
			autoCapitalize="off"
			{...{ writingsuggestions: "false" }}
			data-placeholder={placeholder}
			onInput={emitChange}
			onKeyUp={reportCaret}
			onMouseUp={reportCaret}
			onKeyDown={event => {
				onKeyDown?.(event);
				if (event.defaultPrevented) return;
				const root = ref.current;
				if (root && (event.key === "Backspace" || event.key === "Delete")) {
					const pill = adjacentImagePill(root, event.key === "Backspace" ? "back" : "forward");
					if (pill) {
						event.preventDefault();
						removeImagePillEl(pill);
						return;
					}
				}
				if (event.key === "Enter" && event.shiftKey) {
					event.preventDefault();
					ref.current?.ownerDocument.execCommand("insertLineBreak");
					emitChange();
				}
			}}
			onPaste={event => {
				onPaste?.(event);
				if (event.defaultPrevented) return;
				const text = event.clipboardData.getData("text/plain");
				if (text) {
					event.preventDefault();
					ref.current?.ownerDocument.execCommand("insertText", false, text);
					emitChange();
				}
			}}
			className={cn(
				"min-h-[24px] max-h-[160px] flex-1 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-[1.5] text-fr-text outline-none",
				"empty:before:pointer-events-none empty:before:text-fr-text-3 empty:before:content-[attr(data-placeholder)]",
				className,
			)}
		/>
	);
}
