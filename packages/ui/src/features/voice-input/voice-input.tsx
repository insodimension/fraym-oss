// <VoiceInput> — the composer's dictation surface. THE design (owner-picked
// from a four-way bench; the ferrofluid/halo/inkline variants are gone).
//
// Idle: a round mic button. Pressed: it blooms into a listening pill built
// around a HERO waveform — amplitude history painted in nebula gradients
// (accent hues sweeping across the bars, blur-halo underpass, a comet
// highlight riding the newest bar). The orb core is vibr's Nebula, churning
// faster the louder you speak; a nebula haze breathes behind the pill.
// No text chrome: timer + two icon actions (✓ insert · ✕ cancel), keys on
// tooltips. The live transcript floats ABOVE the pill as a frameless glass
// caption — finalized words pop in bright, the interim tail shimmers.
// Silence auto-commits (ring countdown on ✓), Esc cancels, Enter / the orb
// commits.
//
// Capture + lifecycle live in the headless useVoiceSession hook; the engine
// is pluggable (Web Speech by default, scripted for demos/tests, an
// Engine-engine bridge later) — see voice-engine.ts / use-voice-session.ts.

import { Nebula } from "@fraym-ai/vibr";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../../icons/icon";
import { cn } from "../../lib/cn";
import {
	formatVoiceTimer,
	mix,
	type Rgb,
	resolveAccents,
	useVoiceSession,
	type VoiceFrame,
	voiceErrorMessage,
	WHITE,
} from "./use-voice-session";
import type { VoiceEngine } from "./voice-engine";
import "./voice-input.css";

export interface VoiceInputProps {
	/** Receives the final transcript on commit (never called for empty text). */
	readonly onTranscript: (text: string) => void;
	/** Capture engine; defaults to the real Web Speech engine. */
	readonly engine?: VoiceEngine;
	/** BCP-47 recognition language (defaults to the browser language). */
	readonly lang?: string;
	/** Auto-commit after this much silence (ms). 0 disables. Default 2600. */
	readonly silenceMs?: number;
	/** Notifies the host as listening starts/stops (e.g. to dim the composer). */
	readonly onListeningChange?: (listening: boolean) => void;
	readonly disabled?: boolean;
	readonly className?: string;
	/** Hide the transcript caption (host renders the text itself). */
	readonly hideTranscript?: boolean;
	/** Render NOTHING when the engine can't capture here (product surfaces),
	 *  instead of the default disabled mic button (showcase surfaces). */
	readonly hideWhenUnsupported?: boolean;
}

/** Waveform history buffer length (bars). */
const WAVE_BARS = 56;

/** Nebula churn updates per second (playbackRate tweaks, not re-paints). */
const NEBULA_ENERGY_HZ = 8;

export function VoiceInput({
	onTranscript,
	engine,
	lang,
	silenceMs = 2600,
	onListeningChange,
	disabled,
	className,
	hideTranscript,
	hideWhenUnsupported,
}: VoiceInputProps) {
	// Smoothed voice level for the Nebula's churn rate (throttled — the 60fps
	// glow/waveform ride refs + CSS vars instead of React state).
	const [nebulaEnergy, setNebulaEnergy] = useState(0);

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const pillRef = useRef<HTMLSpanElement | null>(null);
	const barsRef = useRef<number[]>([]);
	const orbRef = useRef<HTMLButtonElement | null>(null);
	const lastEnergyPushRef = useRef(0);
	const lastBarPushRef = useRef(0);
	const peakHoldRef = useRef(0);

	// Listening loop painter: the hero waveform, the level CSS vars (orb glow +
	// pill bloom), and the Nebula's churn. Timer/silence/commit live in the hook.
	const paint = useCallback((frame: VoiceFrame) => {
		const { now, t, raw, smoothed } = frame;
		const levelCss = smoothed.toFixed(3);
		orbRef.current?.style.setProperty("--voice-level", levelCss);
		pillRef.current?.style.setProperty("--voice-level", levelCss);
		// Nebula churn — throttled state so React isn't re-rendering at 60fps.
		if (now - lastEnergyPushRef.current > 1000 / NEBULA_ENERGY_HZ) {
			lastEnergyPushRef.current = now;
			setNebulaEnergy(Math.round(smoothed * 10) / 10);
		}
		// Waveform history — sampled at ~30Hz with peak-hold between samples,
		// so 56 bars ≈ 1.9s of speech and syllable peaks never alias away.
		peakHoldRef.current = Math.max(peakHoldRef.current, raw);
		const bars = barsRef.current;
		if (now - lastBarPushRef.current >= 1000 / 30) {
			lastBarPushRef.current = now;
			bars.push(peakHoldRef.current);
			peakHoldRef.current = 0;
			if (bars.length > WAVE_BARS) bars.shift();
		}
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d") ?? null;
		if (!ctx || !canvas) return;
		const dpr = window.devicePixelRatio || 1;
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
			canvas.width = w * dpr;
			canvas.height = h * dpr;
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);
		const { accent, accent2 } = resolveAccents(canvas);
		const mid = h / 2;
		// Speech envelope sampled from the history buffer: amplitude at each
		// x is the recorded level; a symmetric sin-window tapers both edges
		// so the strings pinch into silence. Left = old, right = newest.
		const n = WAVE_BARS;
		const amp = (i: number): number => {
			const idx = bars.length - n + i;
			const level = idx >= 0 ? (bars[idx] ?? 0) : 0;
			const u = i / (n - 1);
			const pinch = Math.sin(Math.PI * u) ** 0.55;
			return (0.1 + level * 0.9) * pinch * (h / 2 - 1);
		};
		// Each string gets its OWN hue pair (dim left → bright right), so the
		// braid reads as colored aurora strands, not one monochrome rope.
		const cyanish: Rgb = { r: 140, g: 205, b: 255 };
		const stringGradient = (from: string, to: string): CanvasGradient => {
			const g = ctx.createLinearGradient(0, 0, w, 0);
			g.addColorStop(0, from);
			g.addColorStop(0.7, to);
			// Tip heat follows the LIVE level: quiet = stays in hue, loud = white-hot.
			g.addColorStop(1, mix(accent, WHITE, 0.2 + smoothed * 0.65));
			return g;
		};
		// Flowing strings: phase-shifted sine filaments bounded by the speech
		// envelope. Each has its own wavelength/speed/weight/hue — together
		// they braid like aurora strands.
		const strings: readonly {
			freq: number;
			speed: number;
			width: number;
			alpha: number;
			blur: number;
			paint: CanvasGradient;
		}[] = [
			{
				freq: 1.9,
				speed: 2.6,
				width: 1.9,
				alpha: 0.95,
				blur: 10,
				paint: stringGradient(mix(accent, WHITE, 0.05, 0.5), mix(accent, WHITE, 0.35)),
			},
			{
				freq: 2.7,
				speed: -1.9,
				width: 1.4,
				alpha: 0.7,
				blur: 8,
				paint: stringGradient(mix(accent2, accent, 0.2, 0.45), mix(accent2, accent, 0.8)),
			},
			{
				freq: 3.8,
				speed: 1.3,
				width: 1.2,
				alpha: 0.7,
				blur: 7,
				paint: stringGradient(mix(accent, cyanish, 0.7, 0.4), mix(accent, cyanish, 0.85, 0.9)),
			},
			{
				freq: 5.3,
				speed: -3.2,
				width: 0.9,
				alpha: 0.38,
				blur: 5,
				paint: stringGradient(mix(accent2, WHITE, 0.05, 0.3), mix(accent2, WHITE, 0.3, 0.7)),
			},
		];
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		for (let s = 0; s < strings.length; s++) {
			const st = strings[s];
			if (!st) continue;
			ctx.beginPath();
			for (let i = 0; i < n; i++) {
				const u = i / (n - 1);
				const x = u * w;
				const envelope = amp(i);
				// Braid: sine offset by per-string phase; a slow secondary wave
				// de-synchronizes the strands so they cross and weave.
				const y =
					mid +
					Math.sin(u * Math.PI * 2 * st.freq + t * st.speed + s * 1.7) *
						envelope *
						(0.7 + 0.3 * Math.sin(u * Math.PI * 2 * 0.7 + t * 0.9 + s));
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.strokeStyle = st.paint;
			ctx.lineWidth = st.width;
			ctx.globalAlpha = st.alpha;
			ctx.shadowColor = mix(accent, WHITE, 0.2, 0.9);
			ctx.shadowBlur = st.blur;
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
		ctx.shadowBlur = 0;
		// Comet — a bright mote breathing at the newest edge.
		const cometX = w - 2;
		const glowR = 2.5 + smoothed * 5;
		const halo = ctx.createRadialGradient(cometX, mid, 0, cometX, mid, glowR * 2.6);
		halo.addColorStop(0, mix(accent, WHITE, 0.8, 0.95));
		halo.addColorStop(0.45, mix(accent, WHITE, 0.3, 0.5));
		halo.addColorStop(1, mix(accent, WHITE, 0.1, 0));
		ctx.fillStyle = halo;
		ctx.beginPath();
		ctx.arc(cometX, mid, glowR * 2.6, 0, Math.PI * 2);
		ctx.fill();
	}, []);

	const session = useVoiceSession({
		onTranscript,
		engine,
		lang,
		silenceMs,
		onListeningChange,
		disabled,
		onFrame: paint,
	});

	// Focus the orb when the pill opens so Esc/Enter work immediately; reset
	// the paint buffers + nebula for the next session.
	useEffect(() => {
		if (session.phase === "listening") {
			orbRef.current?.focus();
		} else {
			barsRef.current = [];
			peakHoldRef.current = 0;
			setNebulaEnergy(0);
		}
	}, [session.phase]);

	const errorText = voiceErrorMessage(session.phase, session.phaseDetail);

	if (!session.active) {
		if (hideWhenUnsupported && !session.supported) return null;
		return (
			<span className={cn("fr-voice", className)}>
				<button
					type="button"
					className="fr-voice-btn"
					aria-label="Dictate"
					title={session.supported ? "Dictate (voice input)" : "Voice input is not supported here"}
					disabled={disabled || !session.supported}
					onClick={session.start}
				>
					<Icon name="mic" size={15} />
				</button>
				{errorText && (
					<span className="fr-voice-note" role="alert">
						{errorText}
					</span>
				)}
			</span>
		);
	}

	const hasAnyText = !!(session.transcript.finalText || session.transcript.interimText);

	return (
		<span className={cn("fr-voice", className)} onKeyDown={session.onKeyDown}>
			{/* The mic button itself blooms into the pill, IN PLACE in the toolbar
			 * row. Hosts hide adjacent chrome (e.g. the model picker) while
			 * listening via onListeningChange — nothing floats, nothing moves. */}
			<span ref={pillRef} className="fr-voice-pill" data-phase={session.phase}>
				<button
					ref={orbRef}
					type="button"
					className="fr-voice-orb"
					data-phase={session.phase}
					aria-label="Stop and insert transcript"
					title="Stop and insert (Enter)"
					onClick={() => session.finish(true)}
				>
					{/* The living core — vibr's Nebula, churning with your voice. */}
					<Nebula className="fr-voice-nebula" state="thinking" energy={nebulaEnergy} />
					<Icon name="mic" size={14} className="fr-voice-orb-glyph" />
				</button>
				<canvas ref={canvasRef} className="fr-voice-wave" aria-hidden="true" />
				<span className="fr-voice-timer">{formatVoiceTimer(session.elapsedS)}</span>
				<button
					type="button"
					className="fr-voice-act"
					data-tone="commit"
					aria-label="Insert transcript (Enter)"
					title={session.silenceFrac > 0 ? "Inserting on silence… (Enter)" : "Insert transcript (Enter)"}
					style={
						session.silenceFrac > 0
							? {
									background: `conic-gradient(var(--fr-accent-dim) ${Math.round(session.silenceFrac * 360)}deg, transparent 0)`,
								}
							: undefined
					}
					onClick={() => session.finish(true)}
				>
					<Icon name="check" size={14} />
				</button>
				<button
					type="button"
					className="fr-voice-act"
					aria-label="Cancel dictation (Esc)"
					title="Cancel (Esc)"
					onClick={() => session.finish(false)}
				>
					<Icon name="x" size={14} />
				</button>
			</span>
			{!hideTranscript && session.phase === "listening" && hasAnyText && (
				<span className="fr-voice-transcript" aria-live="polite">
					{session.settledFinal}
					{session.freshFinal && (
						<span key={session.transcript.finalText.length} className="fr-voice-committed">
							{session.settledFinal ? " " : ""}
							{session.freshFinal.trim()}
						</span>
					)}
					{session.transcript.finalText && session.transcript.interimText ? " " : ""}
					{session.transcript.interimText && (
						<span className="fr-voice-interim">{session.transcript.interimText}</span>
					)}
					<span className="fr-voice-caret" />
				</span>
			)}
		</span>
	);
}
