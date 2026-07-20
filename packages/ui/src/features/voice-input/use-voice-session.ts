// useVoiceSession — the headless capture layer shared by every <VoiceInput*>
// design. Owns exactly what the designs must NOT differ on:
//
//   - engine session lifecycle (start / stop / cancel, unmount safety)
//   - transcript state + the settled/fresh split for commit-pop styling
//   - elapsed timer, silence countdown → auto-commit
//   - the 60fps rAF loop with exponential level smoothing (fast attack,
//     slow decay) — designs subscribe via `onFrame` to paint their canvas
//   - Enter-commits / Esc-cancels key handling
//   - the error/denied/unsupported message copy (identical across designs)
//
// The VISUALS — idle button, listening surface, transcript chrome — are the
// design's job. See voice-input.tsx (aurora), voice-input-ferro.tsx,
// voice-input-halo.tsx, voice-input-inkline.tsx.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	createWebSpeechEngine,
	type VoiceEngine,
	type VoicePhase,
	type VoiceSession,
	type VoiceTranscript,
} from "./voice-engine";

// ── Color helpers — canvas needs concrete rgb, tokens arrive as hex/rgb. ──

export interface Rgb {
	readonly r: number;
	readonly g: number;
	readonly b: number;
}

export function parseColor(value: string): Rgb | null {
	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
	if (hex?.[1]) {
		let s = hex[1];
		if (s.length === 3) s = s.replace(/./g, c => c + c);
		const n = Number.parseInt(s, 16);
		return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
	}
	const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(value.trim());
	if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
	return null;
}

/** Mix `a` toward `b` by t (0..1) → css rgb() string with optional alpha. */
export function mix(a: Rgb, b: Rgb, t: number, alpha = 1): string {
	const r = Math.round(a.r + (b.r - a.r) * t);
	const g = Math.round(a.g + (b.g - a.g) * t);
	const bl = Math.round(a.b + (b.b - a.b) * t);
	return alpha >= 1 ? `rgb(${r} ${g} ${bl})` : `rgb(${r} ${g} ${bl} / ${alpha})`;
}

export const WHITE: Rgb = { r: 255, g: 255, b: 255 };
export const BLACK: Rgb = { r: 10, g: 12, b: 16 };
export const FALLBACK_ACCENT: Rgb = { r: 122, g: 96, b: 193 };

/** Resolve the live accent pair from computed styles (canvas can't read vars). */
export function resolveAccents(el: Element | null): { accent: Rgb; accent2: Rgb } {
	const styles = el ? getComputedStyle(el) : null;
	const accent = parseColor(styles?.getPropertyValue("--fr-accent") ?? "") ?? FALLBACK_ACCENT;
	const accent2 = parseColor(styles?.getPropertyValue("--fr-accent-2") ?? "") ?? accent;
	return { accent, accent2 };
}

/** The identical error copy every design renders. Null when there is none. */
export function voiceErrorMessage(phase: VoicePhase, detail?: string): string | null {
	if (phase === "denied") return "Microphone access was denied — allow it in the browser's site settings.";
	if (phase === "unsupported") return "Voice input isn't supported in this browser.";
	if (phase === "error") return `Voice input failed${detail ? `: ${detail}` : ""}.`;
	return null;
}

export function formatVoiceTimer(elapsedS: number): string {
	return `${Math.floor(elapsedS / 60)}:${String(elapsedS % 60).padStart(2, "0")}`;
}

/** One animation-loop tick, ~60Hz while listening. */
export interface VoiceFrame {
	/** performance.now() timestamp. */
	readonly now: number;
	/** Seconds since listening started. */
	readonly t: number;
	/** Raw engine level 0..1. */
	readonly raw: number;
	/** Exponentially smoothed level (fast attack, slow decay). */
	readonly smoothed: number;
	/** Silence-countdown progress 0..1 (0 while voice is live). */
	readonly silenceFrac: number;
}

export interface UseVoiceSessionOptions {
	readonly onTranscript: (text: string) => void;
	readonly engine?: VoiceEngine;
	readonly lang?: string;
	/** Auto-commit after this much silence (ms). 0 disables. Default 2600. */
	readonly silenceMs?: number;
	readonly onListeningChange?: (listening: boolean) => void;
	readonly disabled?: boolean;
	/** Per-frame paint callback while listening — always the latest closure. */
	readonly onFrame?: (frame: VoiceFrame) => void;
}

export interface VoiceSessionHandle {
	readonly phase: VoicePhase;
	readonly phaseDetail?: string;
	/** requesting || listening. */
	readonly active: boolean;
	readonly transcript: VoiceTranscript;
	/** finalText split: the settled head vs the freshly-committed tail. */
	readonly settledFinal: string;
	readonly freshFinal: string;
	readonly elapsedS: number;
	/** Silence-countdown progress 0..1 (state — re-renders while counting). */
	readonly silenceFrac: number;
	readonly supported: boolean;
	readonly start: () => void;
	readonly finish: (commit: boolean) => void;
	/** Enter commits, Esc cancels — attach to the active surface wrapper. */
	readonly onKeyDown: (event: React.KeyboardEvent) => void;
}

export function useVoiceSession({
	onTranscript,
	engine,
	lang,
	silenceMs = 2600,
	onListeningChange,
	disabled,
	onFrame,
}: UseVoiceSessionOptions): VoiceSessionHandle {
	const defaultEngine = useMemo(() => engine ?? createWebSpeechEngine(), [engine]);
	const [state, setState] = useState<{ phase: VoicePhase; detail?: string }>({ phase: "idle" });
	const [transcript, setTranscript] = useState<VoiceTranscript>({ finalText: "", interimText: "" });
	const [elapsedS, setElapsedS] = useState(0);
	const [silenceFrac, setSilenceFrac] = useState(0);

	const sessionRef = useRef<VoiceSession | null>(null);
	const transcriptRef = useRef(transcript);
	transcriptRef.current = transcript;
	const levelRef = useRef(0);
	const smoothLevelRef = useRef(0);
	const lastVoiceAtRef = useRef(0);
	const commitRef = useRef<(commit: boolean) => void>(() => {});
	// Tail of finalText committed by the LAST recognition event — rendered in a
	// keyed span so each commit pops in (accent → text color).
	const prevFinalRef = useRef("");
	const onFrameRef = useRef(onFrame);
	onFrameRef.current = onFrame;

	const finish = useCallback(
		(commit: boolean) => {
			const session = sessionRef.current;
			sessionRef.current = null;
			if (commit) session?.stop();
			else session?.cancel();
			const text = `${transcriptRef.current.finalText} ${transcriptRef.current.interimText}`.trim();
			if (commit && text) onTranscript(text);
			setState({ phase: "idle" });
			setTranscript({ finalText: "", interimText: "" });
			setElapsedS(0);
			setSilenceFrac(0);
			smoothLevelRef.current = 0;
			prevFinalRef.current = "";
			onListeningChange?.(false);
		},
		[onTranscript, onListeningChange],
	);
	commitRef.current = finish;

	const start = useCallback(() => {
		if (sessionRef.current || disabled) return;
		if (!defaultEngine.supported) {
			setState({ phase: "unsupported" });
			return;
		}
		lastVoiceAtRef.current = performance.now();
		const session = defaultEngine.start(
			{
				onPhase: (phase, detail) => {
					setState({ phase, detail });
					if (phase === "denied" || phase === "error") {
						sessionRef.current?.cancel();
						sessionRef.current = null;
						onListeningChange?.(false);
					}
				},
				onTranscript: next => {
					prevFinalRef.current = transcriptRef.current.finalText;
					setTranscript(next);
					lastVoiceAtRef.current = performance.now();
				},
				onLevel: level => {
					levelRef.current = level;
					if (level > 0.12) lastVoiceAtRef.current = performance.now();
				},
				onEnd: () => commitRef.current(true),
			},
			lang,
		);
		if (!session) {
			setState({ phase: "unsupported" });
			return;
		}
		sessionRef.current = session;
		onListeningChange?.(true);
	}, [defaultEngine, disabled, lang, onListeningChange]);

	// Unmount safety — never leave a mic open.
	useEffect(() => () => sessionRef.current?.cancel(), []);

	// Listening loop: smooth the level, advance the timer, run the silence
	// countdown, and hand the frame to the design's painter.
	useEffect(() => {
		if (state.phase !== "listening") return;
		const startedAt = performance.now();
		let rafId = 0;
		const frame = () => {
			const now = performance.now();
			const t = (now - startedAt) / 1000;
			setElapsedS(Math.floor(t));
			// Exponential smoothing keeps motion organic (fast attack, slow decay).
			const raw = levelRef.current;
			const prev = smoothLevelRef.current;
			const smoothed = raw > prev ? prev + (raw - prev) * 0.55 : prev + (raw - prev) * 0.12;
			smoothLevelRef.current = smoothed;
			// Silence countdown → auto-commit.
			let frac = 0;
			if (silenceMs > 0) {
				const quietFor = now - lastVoiceAtRef.current;
				const hasText = !!(transcriptRef.current.finalText || transcriptRef.current.interimText);
				frac = hasText ? Math.min(1, quietFor / silenceMs) : 0;
				setSilenceFrac(frac);
				if (frac >= 1) {
					commitRef.current(true);
					return;
				}
			}
			onFrameRef.current?.({ now, t, raw, smoothed, silenceFrac: frac });
			rafId = requestAnimationFrame(frame);
		};
		rafId = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(rafId);
	}, [state.phase, silenceMs]);

	const onKeyDown = useCallback((event: React.KeyboardEvent) => {
		if (event.key === "Escape") {
			event.preventDefault();
			commitRef.current(false);
		} else if (event.key === "Enter") {
			event.preventDefault();
			commitRef.current(true);
		}
	}, []);

	// Split the final text into the settled head and the freshly-committed tail.
	const settledFinal = transcript.finalText.startsWith(prevFinalRef.current) ? prevFinalRef.current : "";
	const freshFinal = transcript.finalText.slice(settledFinal.length);

	return {
		phase: state.phase,
		phaseDetail: state.detail,
		active: state.phase === "listening" || state.phase === "requesting",
		transcript,
		settledFinal,
		freshFinal,
		elapsedS,
		silenceFrac,
		supported: defaultEngine.supported,
		start,
		finish,
		onKeyDown,
	};
}
