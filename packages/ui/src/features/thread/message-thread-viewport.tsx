// MessageThreadViewport — the scroll container for the conversation.
//
// Better-UX-than-TUI: smooth stick-to-bottom while streaming, a "jump to latest"
// pill when the user scrolls up, and scroll position preserved as content grows.
// The TUI can only redraw scrollback. We adopt assistant-ui's viewport pattern
// (viewport + scroll-to-bottom) but keep it a plain styled container fed by our
// surfaces — no headless slots.
//
// Virtualization note: this renders children directly (correct + simple). For
// very long threads, drop a windowing lib behind this same API later; the
// stick-to-bottom contract does not change.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";

const SHELL_RESIZING_ATTR = "data-fr-shell-resizing";
const SHELL_RESIZE_END_EVENT = "fraym:shell-resize-end";
const TOP_LOAD_THRESHOLD = 200;

export interface PinDecisionSample {
	/** Current scrollTop. */
	readonly top: number;
	/** Current scrollHeight. */
	readonly height: number;
	/** Current clientHeight (viewport height). */
	readonly clientHeight: number;
	/** scrollTop at the previous scroll sample. */
	readonly lastTop: number;
	/** scrollHeight at the previous scroll sample. */
	readonly lastHeight: number;
	/** Distance from the bottom (px) still considered pinned. */
	readonly threshold: number;
	/** Current pinned state, returned unchanged when the sample is ambiguous. */
	readonly pinned: boolean;
}

/**
 * Decide the next stick-to-bottom state from one scroll sample. Pure so the
 * spurious-unpin rules are unit-testable without a layout engine.
 *
 * Rules, in order:
 * - Near the bottom (distance ≤ threshold) → always (re-)pin.
 * - Otherwise unpin ONLY on a deliberate user scroll-UP: a scrollTop decrease
 *   while content height held steady or grew. A height SHRINK (a turn settling
 *   shorter, the working tail/wisp toggling off, a journal-replace remount, the
 *   window trimming an older turn) makes the browser CLAMP scrollTop down — not
 *   a user gesture, so it must NOT unpin. That false positive is what popped
 *   "jump to latest" right after sending while pinned.
 * - Any other sample (content grew below, layout settled) keeps the current pin.
 */
export function nextPinnedState(sample: PinDecisionSample): boolean {
	const { top, height, clientHeight, lastTop, lastHeight, threshold, pinned } = sample;
	if (height - top - clientHeight <= threshold) return true;
	const heightShrank = height < lastHeight;
	const scrolledUp = !heightShrank && top < lastTop - 1;
	return scrolledUp ? false : pinned;
}

export interface AnchorCompensationSample {
	/** Current pinned state — compensation only matters for an unpinned reader. */
	readonly pinned: boolean;
	/** The last scrollTop known to reflect a real (non-clamped) position. */
	readonly desiredTop: number;
	/** Current scrollTop, possibly already clamped by a content shrink. */
	readonly scrollTop: number;
	/** Current scrollHeight. */
	readonly scrollHeight: number;
	/** Current clientHeight (viewport height). */
	readonly clientHeight: number;
}

/**
 * Decide the scrollTop to restore (or `null` for no-op) when content shrinks BELOW
 * an unpinned reader's viewport. A collapse/settle reflow there (the "Worked for Xs"
 * fold, a tool card collapsing, a turn settling shorter) can shrink total document
 * height enough that the browser clamps scrollTop down — yanking the view even
 * though the change is off-screen. CSS `overflow-anchor` would normally cover this,
 * but Safari/WebKit (the desktop app's macOS webview) does not implement it, so this
 * restores the pre-shrink offset by hand whenever it is still a valid position in the
 * new (shorter) document. Pure so the decision is unit-testable without a layout engine.
 */
export function anchorCompensationTop(sample: AnchorCompensationSample): number | null {
	if (sample.pinned) return null;
	const maxTop = sample.scrollHeight - sample.clientHeight;
	if (sample.desiredTop > maxTop) return null;
	if (sample.scrollTop === sample.desiredTop) return null;
	return sample.desiredTop;
}

export interface MessageThreadViewportProps {
	readonly children: React.ReactNode;
	/** Tail slot — presence avatar / working shimmer pinned under the last message. */
	readonly footer?: React.ReactNode;
	/** Auto-scroll to bottom as content grows while pinned (default true). */
	readonly autoScroll?: boolean;
	/**
	 * Flips ONLY when the user sends (or queues) a message — never on agent/stream
	 * growth. On change the viewport re-arms stick-to-bottom and snaps down so the
	 * new user turn + the working tail land in view without a manual scroll.
	 */
	readonly pinKey?: string | number;
	/** Distance from bottom (px) still considered "pinned". */
	readonly threshold?: number;
	/** Older content exists above the rendered window (enables scroll-up lazy load). */
	readonly hasMoreTop?: boolean;
	/** Requested when the user scrolls near the top and `hasMoreTop` is true. */
	readonly onLoadMoreTop?: () => void;
	readonly jumpLabel?: string;
	readonly className?: string;
	readonly contentClassName?: string;
}

export function MessageThreadViewport({
	children,
	footer,
	autoScroll = true,
	pinKey,
	threshold = 80,
	hasMoreTop = false,
	onLoadMoreTop,
	jumpLabel = "Jump to latest",
	className,
	contentClassName,
}: MessageThreadViewportProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const [pinned, setPinned] = useState(true);
	const pinnedRef = useRef(pinned);
	const lastTopRef = useRef(0);
	const lastHeightRef = useRef(0);
	const pendingTopAnchorRef = useRef<number | null>(null);
	const desiredTopRef = useRef(0);

	const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
		const el = scrollRef.current;
		if (el) el.scrollTo({ top: el.scrollHeight, behavior });
	}, []);

	const handleScroll = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		const top = el.scrollTop;
		const height = el.scrollHeight;
		// Lazy-load older turns when the user scrolls near the top. Record the pre-growth
		// scrollHeight so the ResizeObserver can restore the position after content prepends
		// (no jump). Guarded by the anchor ref so it fires once per reach.
		if (hasMoreTop && onLoadMoreTop && top <= TOP_LOAD_THRESHOLD && pendingTopAnchorRef.current === null) {
			pendingTopAnchorRef.current = el.scrollHeight;
			onLoadMoreTop();
		}
		// Re-pin near the bottom; only UNPIN on a deliberate user scroll-up. The
		// height-shrink guard inside `nextPinnedState` keeps reflow-driven scrollTop
		// clamps (settling, tail toggles, journal replace, window trim) from reading
		// as a scroll-up — see that function's doc.
		const nextPinned = nextPinnedState({
			top,
			height,
			clientHeight: el.clientHeight,
			lastTop: lastTopRef.current,
			lastHeight: lastHeightRef.current,
			threshold,
			pinned: pinnedRef.current,
		});
		// Track the last TRUSTWORTHY (non-clamped) scrollTop for the shrink-compensation
		// branch below: only a sample where height held steady or grew reflects a real
		// position the user chose, never one the browser already clamped down.
		if (height >= lastHeightRef.current) desiredTopRef.current = top;
		lastHeightRef.current = height;
		lastTopRef.current = top;
		if (nextPinned !== pinnedRef.current) {
			pinnedRef.current = nextPinned;
			setPinned(nextPinned);
		}
	}, [threshold, hasMoreTop, onLoadMoreTop]);

	const pinToBottomIfNeeded = useCallback(() => {
		if (pinnedRef.current) scrollToBottom("auto");
	}, [scrollToBottom]);

	// A direct upward scroll gesture (wheel / touch-drag-down) is unambiguous user intent —
	// unpin SYNCHRONOUSLY on the gesture itself rather than waiting for the resulting
	// `scroll` event. Streaming content fires the content-growth ResizeObserver (which
	// re-pins to the bottom) many times a second; waiting for `handleScroll` to notice the
	// scrollTop delta instead leaves a window where that auto-follow snap can win the race
	// and yank the view back down out from under the gesture — the reported "fighting" scroll.
	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const unpin = () => {
			if (!pinnedRef.current) return;
			// Non-overflowing thread → an up-gesture reveals nothing; never unpin (no
			// scroll event would fire to re-pin, so the jump pill would stick — the bug).
			if (el.scrollHeight - el.clientHeight <= threshold) return;
			pinnedRef.current = false;
			setPinned(false);
		};
		const onWheel = (e: WheelEvent) => {
			if (e.deltaY < 0) unpin();
		};
		let touchY: number | null = null;
		const onTouchStart = (e: TouchEvent) => {
			touchY = e.touches[0]?.clientY ?? null;
		};
		const onTouchMove = (e: TouchEvent) => {
			const y = e.touches[0]?.clientY;
			if (y === undefined || touchY === null) return;
			// Finger moves DOWN the screen → content moves down → earlier/upper content
			// reveals → the touch equivalent of scrolling up.
			if (y - touchY > 4) unpin();
			touchY = y;
		};
		el.addEventListener("wheel", onWheel, { passive: true });
		el.addEventListener("touchstart", onTouchStart, { passive: true });
		el.addEventListener("touchmove", onTouchMove, { passive: true });
		return () => {
			el.removeEventListener("wheel", onWheel);
			el.removeEventListener("touchstart", onTouchStart);
			el.removeEventListener("touchmove", onTouchMove);
		};
	}, [threshold]);

	// Initial pin to bottom.
	useLayoutEffect(() => {
		scrollToBottom("auto");
	}, [scrollToBottom]);

	// A user just sent/queued a message. Re-arm the pin and snap to the bottom so
	// their message AND the working tail (presence + verb) come into view; the
	// streaming response then keeps following. We re-assert across the next frames
	// because a tall just-sent turn — and the journal-replace remount when the
	// stream opens — can grow or reset scrollHeight AFTER this commit, which would
	// otherwise strand the snap at the top. Deterministic: bypasses the
	// scrollTop-clamp race that spuriously unpins right after the composer clears.
	useEffect(() => {
		if (pinKey === undefined) return;
		pinnedRef.current = true;
		setPinned(true);
		scrollToBottom("auto");
		const raf = requestAnimationFrame(() => {
			pinnedRef.current = true;
			scrollToBottom("auto");
		});
		const timer = setTimeout(() => {
			pinnedRef.current = true;
			scrollToBottom("auto");
		}, 120);
		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(timer);
		};
	}, [pinKey, scrollToBottom]);

	// Keep pinned to bottom as content grows (streaming).
	useEffect(() => {
		if (!autoScroll) return;
		const content = contentRef.current;
		if (!content || typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(() => {
			if (document.documentElement.hasAttribute(SHELL_RESIZING_ATTR)) return;
			const el = scrollRef.current;
			// Content shrank so the thread no longer overflows → nothing to scroll to, so
			// force back to pinned (no `scroll` event fires on this path to do it). Without
			// this, an earlier scroll-up on a then-taller thread would strand the jump pill.
			if (el && pinnedRef.current === false && el.scrollHeight - el.clientHeight <= threshold) {
				pinnedRef.current = true;
				setPinned(true);
			}
			// Just lazy-loaded older turns above → restore the prior scroll offset so the
			// viewport stays anchored on what the user was reading (instead of jumping).
			if (el && pendingTopAnchorRef.current !== null) {
				el.scrollTop += el.scrollHeight - pendingTopAnchorRef.current;
				pendingTopAnchorRef.current = null;
				return;
			}
			// Scroll-anchor compensation: see `anchorCompensationTop`'s doc.
			if (el) {
				const restore = anchorCompensationTop({
					pinned: pinnedRef.current,
					desiredTop: desiredTopRef.current,
					scrollTop: el.scrollTop,
					scrollHeight: el.scrollHeight,
					clientHeight: el.clientHeight,
				});
				if (restore !== null) el.scrollTop = restore;
			}
			pinToBottomIfNeeded();
		});
		ro.observe(content);
		// Also watch the scroll container itself: when the composer / topSlot grows or
		// shrinks, the viewport height changes with NO content mutation. Re-pinning on that
		// keeps the latest turn glued to the bottom instead of drifting under the composer.
		const scrollEl = scrollRef.current;
		if (scrollEl) ro.observe(scrollEl);
		return () => ro.disconnect();
	}, [autoScroll, pinToBottomIfNeeded, threshold]);

	useEffect(() => {
		const onShellResizeEnd = () => {
			const el = scrollRef.current;
			if (pinnedRef.current && el) el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
		};
		window.addEventListener(SHELL_RESIZE_END_EVENT, onShellResizeEnd);
		return () => window.removeEventListener(SHELL_RESIZE_END_EVENT, onShellResizeEnd);
	}, []);

	return (
		<div data-slot="thread-viewport" className={cn("relative flex min-h-0 flex-1 flex-col", className)}>
			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", contentClassName)}
			>
				<div ref={contentRef}>
					{children}
					{footer}
				</div>
			</div>
			{!pinned && (
				<button
					type="button"
					onClick={() => scrollToBottom()}
					data-slot="jump-to-latest"
					className={cn(
						"absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full",
						"border border-fr-border bg-fr-surface-2 px-3 py-1.5 text-fr-sm text-fr-text-2 shadow-lg",
						"transition-colors hover:bg-fr-surface-3 hover:text-fr-text",
					)}
				>
					<Icon name="caretR" size={12} strokeWidth={2.2} className="rotate-90" />
					{jumpLabel}
				</button>
			)}
		</div>
	);
}
