"use client";

import type {
	BreakCardFn,
	BreakTextFn,
	GlyphRect,
	SceneryLabel,
	SceneryRect,
	WispPresetId,
	WispTarget,
} from "@fraym-ai/vibr";
import { Wisp } from "@fraym-ai/vibr";
import { useEffect, useRef } from "react";
import { useSession, useVibr } from "../../hooks/use-session";
import { pickWispPriority } from "./wisp-target";

/**
 * StreamWisp — the session-aware adapter for vibr's physics Wisp.
 *
 * Measures WHERE the wisp should be each animation frame (viewport
 * coords) and writes it into a target ref that `<Wisp>` consumes —
 * zero React re-renders in the hot path. All physics (stretch, jiggle,
 * fall, impact) is derived inside vibr from how this target moves:
 *
 *  1. live streaming text  → exact caret after the last revealed char
 *     (the paced reveal from useSmoothText makes this glide per-frame)
 *  2. running tool card    → top-left of the card (a DOWNWARD jump from
 *     the text caret → vibr detects the drop → fall + splash impact)
 *  3. otherwise            → the anchor element (presence home spot)
 */

/** Page elements the wisp presets may treat as TERRAIN (fight inside a
 *  tool card, hang off its edge, knock letters out of its title…).
 *  Re-measured on a throttle — geometry only, vibr never touches the DOM. */
const SCENERY_SELECTOR = "[data-tool-status], [data-slot='code-block']";
/** Scenery is re-measured at most this often (ms). */
const SCENERY_INTERVAL = 120;
/** Only rects within this vertical band of the target count as terrain. */
const SCENERY_BAND = 320;
/** Cap — the nearest N rects win. */
const SCENERY_MAX = 6;
/** Max text lines measured per rect — the fight only needs nearby fodder. */
const SCENERY_LABEL_MAX = 16;

const SCENERY_LABEL_PAD_X = 48;
const SCENERY_LABEL_PAD_TOP = 96;
const SCENERY_LABEL_PAD_BOTTOM = 32;
const DAMAGE_HEAL_MS = 6000;
const FINISHED_TOOL_GRACE_MS = 4000;
const DAMAGE_MAX_HOLES = 24;
const DAMAGE_MAX_BANDS = 8;

let labelNodes = new Map<string, Text>();
const labelIds = new WeakMap<Text, string>();
let labelIdSeq = 0;
let rectNodes = new Map<string, Element>();
let rectIdSeq = 0;

interface HoleState {
	holes: { x: number; y: number; w: number; h: number }[];
	bands: { x: number; y: number }[][];
	timer: number;
}
const holeStates = new Map<HTMLElement, HoleState>();

/** Nearest non-inline ancestor — clip-path is unreliable on inline boxes. */
function blockAncestor(node: Text): HTMLElement | null {
	let el = node.parentElement;
	while (el && window.getComputedStyle(el).display === "inline") el = el.parentElement;
	return el;
}

/** Rebuild `el`'s clip-path with an even-odd polygon so damage can be style-only and React-safe. */
function applyGlyphHoles(el: HTMLElement, st: HoleState): void {
	const b = el.getBoundingClientRect();
	const W = b.width;
	const H = b.height;
	const pts: string[] = [`0 0`, `${W}px 0`, `${W}px ${H}px`, `0 ${H}px`, `0 0`];
	for (const h of st.holes) {
		const x1 = h.x;
		const y1 = h.y;
		const x2 = h.x + h.w;
		const y2 = h.y + h.h;
		pts.push(`${x1}px ${y1}px`, `${x2}px ${y1}px`, `${x2}px ${y2}px`, `${x1}px ${y2}px`, `${x1}px ${y1}px`, `0 0`);
	}
	for (const band of st.bands) {
		const first = band[0];
		if (!first) continue;
		for (const p of band) pts.push(`${p.x}px ${p.y}px`);
		pts.push(`${first.x}px ${first.y}px`, `0 0`);
	}
	el.style.clipPath = `polygon(evenodd, ${pts.join(", ")})`;
}

/** Host hook for style-only glyph damage; returns the exact glyph box for debris. */
const breakPageGlyph: BreakTextFn = (labelId, index) => {
	const node = labelNodes.get(labelId);
	if (!node) return undefined;
	if (!node.isConnected) return undefined;
	const len = node.textContent?.length ?? 0;
	if (index < 0 || index >= len) return undefined;
	const el = blockAncestor(node);
	if (!el) return undefined;
	const range = document.createRange();
	range.setStart(node, index);
	range.setEnd(node, index + 1);
	const r = range.getBoundingClientRect();
	if (r.width === 0 || r.height === 0) return undefined;
	const b = el.getBoundingClientRect();
	const hole = { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
	let st = holeStates.get(el);
	// Already punched out — nothing left of this glyph to launch.
	if (st?.holes.some(h => Math.abs(h.x - hole.x) < 0.5 && Math.abs(h.y - hole.y) < 0.5)) return undefined;
	if (st) {
		clearTimeout(st.timer);
	} else {
		st = { holes: [], bands: [], timer: 0 };
		holeStates.set(el, st);
	}
	st.holes.push(hole);
	if (st.holes.length > DAMAGE_MAX_HOLES) st.holes.splice(0, st.holes.length - DAMAGE_MAX_HOLES);
	applyGlyphHoles(el, st);
	st.timer = window.setTimeout(() => {
		el.style.clipPath = "";
		holeStates.delete(el);
	}, DAMAGE_HEAL_MS);
	const out: GlyphRect = { x: r.left, y: r.top, w: r.width, h: r.height };
	return out;
};

/** Host hook for style-only card fissures. */
const breakPageCrack: BreakCardFn = (rectId, x1, y1, x2, y2) => {
	const el = rectNodes.get(rectId);
	if (!(el instanceof HTMLElement) || !el.isConnected) return false;
	const b = el.getBoundingClientRect();
	const a = Math.atan2(y2 - y1, x2 - x1);
	const nx = -Math.sin(a);
	const ny = Math.cos(a);
	const segs = 7;
	const spine: { x: number; y: number }[] = [];
	for (let i = 0; i <= segs; i++) {
		const u = i / segs;
		const j = i === 0 || i === segs ? 0 : (Math.random() - 0.5) * 6;
		spine.push({ x: x1 - b.left + (x2 - x1) * u + nx * j, y: y1 - b.top + (y2 - y1) * u + ny * j });
	}
	const w = 1.2;
	const band = [
		...spine.map(p => ({ x: p.x + nx * w, y: p.y + ny * w })),
		...[...spine].reverse().map(p => ({ x: p.x - nx * w, y: p.y - ny * w })),
	];
	let st = holeStates.get(el);
	if (st) {
		clearTimeout(st.timer);
	} else {
		st = { holes: [], bands: [], timer: 0 };
		holeStates.set(el, st);
	}
	st.bands.push(band);
	if (st.bands.length > DAMAGE_MAX_BANDS) st.bands.splice(0, st.bands.length - DAMAGE_MAX_BANDS);
	applyGlyphHoles(el, st);
	st.timer = window.setTimeout(() => {
		el.style.clipPath = "";
		holeStates.delete(el);
	}, DAMAGE_HEAL_MS);
	return true;
};

/** Measure visible single-line text runs inside a scenery element. */
function measureLabels(el: Element, registry: Map<string, Text>): readonly SceneryLabel[] | undefined {
	const labels: SceneryLabel[] = [];
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	const range = document.createRange();
	while (labels.length < SCENERY_LABEL_MAX) {
		const node = walker.nextNode();
		if (!node) break;
		const text = node.textContent?.trim();
		if (!text || text.length < 2) continue;
		range.selectNodeContents(node);
		const r = range.getBoundingClientRect();
		// Single visible lines only — wrapped paragraphs measure tall.
		if (r.width < 12 || r.height < 6 || r.height > 28) continue;
		const parent = node.parentElement;
		const px = parent ? Number.parseFloat(window.getComputedStyle(parent).fontSize) || 12 : 12;
		const textNode = node as Text;
		let id = labelIds.get(textNode);
		if (!id) {
			id = String(++labelIdSeq);
			labelIds.set(textNode, id);
		}
		registry.set(id, textNode);
		labels.push({ id, text: textNode.textContent ?? text, x: r.left, y: r.top + r.height / 2, px });
	}
	return labels.length > 0 ? labels : undefined;
}

/** Measure visible terrain rects near the target, nearest-first. */
function measureScenery(target: WispTarget): SceneryRect[] {
	const candidates: { el: Element; rect: DOMRect; distance: number; near: boolean }[] = [];
	for (const el of document.querySelectorAll(SCENERY_SELECTOR)) {
		const rect = el.getBoundingClientRect();
		if (rect.width < 24 || rect.height < 12) continue;
		if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
		if (Math.abs(rect.top - target.y) > SCENERY_BAND) continue;
		const near =
			target.y >= rect.top - SCENERY_LABEL_PAD_TOP &&
			target.y <= rect.bottom + SCENERY_LABEL_PAD_BOTTOM &&
			target.x >= rect.left - SCENERY_LABEL_PAD_X &&
			target.x <= rect.right + SCENERY_LABEL_PAD_X;
		candidates.push({ el, rect, distance: Math.abs(rect.y - target.y), near });
	}
	candidates.sort((a, b) => a.distance - b.distance);
	const registry = new Map<string, Text>();
	const rects = new Map<string, Element>();
	const found: SceneryRect[] = [];
	for (const c of candidates.slice(0, SCENERY_MAX)) {
		const id = `r${rectIdSeq++}`;
		rects.set(id, c.el);
		found.push({
			id,
			x: c.rect.left,
			y: c.rect.top,
			w: c.rect.width,
			h: c.rect.height,
			kind: c.el.hasAttribute("data-tool-status") ? "card" : "block",
			labels: c.near ? measureLabels(c.el, registry) : undefined,
		});
	}
	labelNodes = registry;
	rectNodes = rects;
	return found;
}

export interface StreamWispProps {
	/** The wisp's home position when nothing is streaming. */
	readonly anchorRef: React.RefObject<HTMLElement | null>;
	/** Vibr renderer preset. Default `"smiley"`. */
	readonly preset?: WispPresetId;
}

/** Deepest last non-whitespace text node under `root` (walks lastChild spine with backtrack). */
function lastTextNode(root: Node): Text | null {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
		acceptNode: node => (/\S/.test(node.nodeValue ?? "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
	});
	let last: Text | null = null;
	for (let n = walker.nextNode(); n; n = walker.nextNode()) {
		last = n as Text;
	}
	return last;
}

/** Viewport position just after the final character of the live revealed text. */
function measureLiveCaret(): WispTarget | null {
	const blocks = document.querySelectorAll(".fr-live-text");
	const live = blocks[blocks.length - 1];
	if (!live) return null;
	const node = lastTextNode(live);
	if (!node || node.length === 0) return null;
	const range = document.createRange();
	range.setStart(node, Math.max(0, node.length - 1));
	range.setEnd(node, node.length);
	const rects = range.getClientRects();
	const rect = rects[rects.length - 1];
	if (!rect || (rect.width === 0 && rect.height === 0)) return null;
	return { x: rect.right + 6, y: rect.top + rect.height / 2 };
}

/** Top-left landing spot on the active (in-flight) tool card. Cards expose
 *  their VISUAL status ("pending" while running — the "…" pill) via
 *  `data-tool-status` on the tool-card chassis. */
function measureRunningTool(): { readonly target: WispTarget; readonly el: Element } | null {
	// Last match = newest running card; the wisp dives where the user's eye goes.
	const cards = document.querySelectorAll("[data-tool-status='pending']");
	const card = cards[cards.length - 1];
	if (!card) return null;
	const rect = card.getBoundingClientRect();
	if (rect.width === 0 && rect.height === 0) return null;
	return { target: { x: rect.left + 18, y: rect.top + 16 }, el: card };
}

function clearDamage(): void {
	for (const [el, st] of holeStates) {
		clearTimeout(st.timer);
		el.style.clipPath = "";
	}
	holeStates.clear();
	labelNodes = new Map();
	rectNodes = new Map();
}

export function StreamWisp({ anchorRef, preset = "smiley" }: StreamWispProps) {
	const session = useSession();
	const vibr = useVibr();

	const targetRef = useRef<WispTarget | null>(null);
	const sceneryRef = useRef<readonly SceneryRect[]>([]);

	// Session facts readable from the measurement loop without restarting it.
	const live = useRef({ isStreaming: false, hasRunningTool: false });
	live.current = {
		isStreaming: session.isStreaming,
		hasRunningTool: session.activeTools.some(t => t.status === "running"),
	};

	useEffect(() => {
		let raf = 0;
		let running = true;
		// Staleness ledger: a caret that hasn't advanced since the wisp last
		// rode a tool card is OLD text — never send the wisp back UP to it.
		// Reading order only moves forward; the caret revalidates the moment
		// new text actually moves it.
		let lastCaretX = 0;
		let lastCaretY = 0;
		let caretMovedAt = 0;
		let toolRiddenAt = -1;
		// Forward-only flow: the y + element of the tool the wisp last rode, so it
		// never flies back UP to a caret above it once that tool finishes.
		let toolRiddenY = Number.NEGATIVE_INFINITY;
		let toolRiddenEl: Element | null = null;
		// Terrain measurement is throttled — but a scroll shifts the whole
		// world, so it forces an immediate re-measure next tick.
		let sceneryAt = 0;
		let sceneryDirty = true;
		const markDirty = (): void => {
			sceneryDirty = true;
		};
		window.addEventListener("scroll", markDirty, { passive: true, capture: true });
		window.addEventListener("resize", markDirty);
		// While the wisp rides a running tool card, tag that card so CSS can fade out
		// its own icon + pending shimmer (the wisp visually replaces them) and animate
		// them back when the wisp flies away. DOM write only — zero React re-renders,
		// matching the rest of this hot loop.
		let riddenEl: Element | null = null;
		const setRiddenCard = (el: Element | null): void => {
			if (riddenEl === el) return;
			riddenEl?.removeAttribute("data-wisp-riding");
			el?.setAttribute("data-wisp-riding", "");
			riddenEl = el;
		};

		const measureAnchor = (): WispTarget | null => {
			const el = anchorRef.current;
			if (!el) return null;
			const rect = el.getBoundingClientRect();
			if (rect.width === 0 && rect.height === 0) return null;
			return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
		};

		// The trailing edge of the tool the wisp just rode — its resting spot for a
		// grace window after the tool finishes, so it lingers at the END of the tool
		// rather than springing home or flying back up to earlier text.
		const measureFinishedTool = (): WispTarget | null => {
			const card = toolRiddenEl;
			if (!card?.isConnected) return null;
			// Measure the tool's HEADER pill (content-width), not the full-width chassis
			// row, so the wisp rests at the END of the tool itself — not the line's edge.
			const head = card.firstElementChild ?? card;
			const rect = head.getBoundingClientRect();
			if (rect.width === 0 && rect.height === 0) return null;
			return { x: rect.right - 8, y: rect.top + rect.height / 2 };
		};

		const recordCaret = (caret: WispTarget | null, now: number): boolean => {
			if (caret && (Math.abs(caret.x - lastCaretX) > 1 || Math.abs(caret.y - lastCaretY) > 1)) {
				lastCaretX = caret.x;
				lastCaretY = caret.y;
				caretMovedAt = now;
			}
			return caret != null && caretMovedAt > toolRiddenAt;
		};

		const priorityTarget = (
			caret: WispTarget | null,
			caretFresh: boolean,
			isStreaming: boolean,
			hasRunningTool: boolean,
			now: number,
		): { priority: WispTarget | null; tool: WispTarget | null; toolEl: Element | null } => {
			const draining = document.querySelector(".fr-live-draining") != null;
			const running = hasRunningTool ? measureRunningTool() : null;
			const tool = running?.target ?? null;
			const finished =
				!tool && isStreaming && now - toolRiddenAt < FINISHED_TOOL_GRACE_MS ? measureFinishedTool() : null;
			return {
				priority: pickWispPriority({ caret, caretFresh, draining, tool, finished, toolRiddenY, isStreaming }),
				tool,
				toolEl: running?.el ?? null,
			};
		};


		const updateScenery = (next: WispTarget | null, now: number): void => {
			if (next && (sceneryDirty || now - sceneryAt > SCENERY_INTERVAL)) {
				sceneryAt = now;
				sceneryDirty = false;
				sceneryRef.current = measureScenery(next);
			} else if (!next && sceneryRef.current.length > 0) {
				sceneryRef.current = [];
			}
		};

		const tick = (): void => {
			if (!running) return;
			raf = requestAnimationFrame(tick);
			const now = performance.now();
			const { isStreaming, hasRunningTool } = live.current;
			if (!isStreaming) {
				toolRiddenY = Number.NEGATIVE_INFINITY;
				toolRiddenEl = null;
			}
			const caret = measureLiveCaret();
			const caretFresh = recordCaret(caret, now);
			const targets = priorityTarget(caret, caretFresh, isStreaming, hasRunningTool, now);
			const next = targets.priority ?? measureAnchor();
			const ridingTool = next != null && next === targets.tool;
			if (ridingTool) {
				toolRiddenAt = now;
				toolRiddenY = targets.tool?.y ?? toolRiddenY;
				toolRiddenEl = targets.toolEl;
			}
			setRiddenCard(ridingTool ? targets.toolEl : null);
			targetRef.current = next;
			updateScenery(next, now);
		};

		raf = requestAnimationFrame(tick);
		return () => {
			running = false;
			cancelAnimationFrame(raf);
			window.removeEventListener("scroll", markDirty, { capture: true });
			window.removeEventListener("resize", markDirty);
			setRiddenCard(null);
			clearDamage();
		};
	}, [anchorRef, preset]);

	// The wisp is a full-viewport fixed canvas; default z is 60 (over everything).
	// In the thread it must sit ABOVE the in-flow conversation but BELOW the
	// composer (z-[2]) so it never paints over the input — pin it to z-[1].
	return (
		<Wisp
			preset={preset}
			targetRef={targetRef}
			sceneryRef={sceneryRef}
			breakText={breakPageGlyph}
			breakCard={breakPageCrack}
			state={vibr.state}
			mode={vibr.mode}
			energy={vibr.energy}
			zIndex={1}
		/>
	);
}

export { StreamWisp as StreamCursor };
export type StreamCursorProps = StreamWispProps;
