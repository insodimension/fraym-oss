"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useSmoothText — Codex-style streaming reveal pacing.
 *
 * Models deliver text in bursts (5–12 words per delta), which makes the
 * raw accumulated string grow in abrupt lumps. This hook drips the text
 * out character-by-character at an ADAPTIVE rate — the reveal speed is
 * proportional to the backlog, so a fat burst drains smoothly over
 * ~CATCHUP_SECONDS instead of slamming in, while a slow trickle never
 * lags behind. The result reads as one continuous, liquid stream.
 *
 * - `enabled: false` (message finished / not live) → returns the full
 *   text immediately and snaps internal progress.
 * - When the stream ends mid-reveal, the remaining backlog still drains
 *   at the paced rate (no final lurch).
 */

/** Drain the current backlog over roughly this many seconds (while live). */
const CATCHUP_SECONDS = 0.45;
/** Post-stream settle: once the block is no longer live, finish the remaining
 *  backlog within roughly this many seconds REGARDLESS of its size. The live
 *  ceiling below made a fat post-stream backlog (e.g. an 18K-char tail) take
 *  12+ seconds to drain — long enough that any rAF starvation (janky frames
 *  hitting the dt clamp, window occlusion, webview throttling) stranded the
 *  message permanently cut off mid-word (owner-hit 2026-07-16). */
const SETTLE_SECONDS = 0.3;
/** Floor: keep at least a gentle typewriter pace while backlog is tiny. */
const MIN_CHARS_PER_SEC = 30;
/** Ceiling: never reveal slower than this would imply for huge backlogs (live only). */
const MAX_CHARS_PER_SEC = 1500;
/** Stall guard: if the rAF reveal chain goes silent for longer than this while a
 *  backlog remains (frames stopped — window occlusion, webview throttling,
 *  main-thread jank), snap to the full text so the message never stays cut off
 *  mid-word. Covers BOTH the live turn and the settled drain — `445edab` guarded
 *  only the settled (`!enabled`) case, leaving a live rAF stall (frozen while
 *  "Working…" still showed) with no backstop. */
const STALL_SNAP_MS = 700;
/** How often the stall guard polls rAF liveness (a plain timer, so it keeps
 *  firing even when requestAnimationFrame does not). */
const STALL_CHECK_MS = 250;
/** Commit (setState → React render) at most every ~2 frames. Reveal PROGRESS
 *  still advances every rAF in a ref, so pacing stays exact — only the DOM
 *  commit batches. 30Hz character-batches read as the same liquid stream
 *  (film is 24Hz), while React work during streaming roughly halves — the
 *  single dominant main-thread cost on phones (measured on-device 2026-07-10:
 *  711 renders in 8s = one per frame, 62% of streaming JS time). */
const COMMIT_INTERVAL_MS = 33;

export function useSmoothText(text: string, enabled: boolean): string {
	const progressRef = useRef<number>(enabled ? 0 : text.length);
	const [revealed, setRevealed] = useState<string>(enabled ? "" : text);

	// Re-sync when the source diverges (message switch / reset): if the text
	// shrank below our progress it is a different string — snap to the end.
	if (text.length < progressRef.current) {
		progressRef.current = text.length;
	}

	useEffect(() => {
		if (!enabled && progressRef.current >= text.length) {
			progressRef.current = text.length;
			setRevealed(text);
			return;
		}

		let raf = 0;
		let last = performance.now();
		let lastCommitAt = 0;
		let committed = Math.floor(progressRef.current);
		// Last time the rAF chain actually ran; the stall guard below watches it.
		let lastTickAt = performance.now();

		const tick = (now: number): void => {
			lastTickAt = now;
			const dt = Math.min((now - last) / 1000, 0.1);
			last = now;

			const backlog = text.length - progressRef.current;
			if (backlog <= 0) {
				progressRef.current = text.length;
				setRevealed(text);
				return; // fully drained — stop until text grows again
			}

			// Live: paced with a ceiling (liquid stream). Settled: bounded-time drain —
			// no ceiling, so even a huge backlog finishes within ~SETTLE_SECONDS.
			const rate = enabled
				? Math.min(MAX_CHARS_PER_SEC, Math.max(MIN_CHARS_PER_SEC, backlog / CATCHUP_SECONDS))
				: Math.max(MIN_CHARS_PER_SEC, backlog / SETTLE_SECONDS);
			const next = Math.min(text.length, progressRef.current + rate * dt);
			progressRef.current = next;
			if (now - lastCommitAt >= COMMIT_INTERVAL_MS && Math.floor(next) > committed) {
				lastCommitAt = now;
				committed = Math.floor(next);
				setRevealed(text.slice(0, committed));
			}

			raf = requestAnimationFrame(tick);
		};

		raf = requestAnimationFrame(tick);
		// Stall guard for BOTH live and settled. If frames stop coming (occluded
		// window, throttled webview, main-thread jank on a long turn) the rAF chain
		// dies mid-reveal; with no further delta to re-arm this effect the message
		// stays cut off mid-word — while "Working…" still shows if the turn is live.
		// A plain timer keeps firing, so once rAF has gone silent past STALL_SNAP_MS
		// with a backlog pending, snap to the full text. (445edab guarded only the
		// settled `!enabled` drain; the live window had none — the recurrence.)
		const stallGuard = window.setInterval(() => {
			if (progressRef.current >= text.length) return; // nothing pending
			if (performance.now() - lastTickAt <= STALL_SNAP_MS) return; // rAF still alive
			cancelAnimationFrame(raf);
			progressRef.current = text.length;
			setRevealed(text);
		}, STALL_CHECK_MS);
		return () => {
			cancelAnimationFrame(raf);
			window.clearInterval(stallGuard);
		};
	}, [text, enabled]);

	return enabled || progressRef.current < text.length ? revealed : text;
}
