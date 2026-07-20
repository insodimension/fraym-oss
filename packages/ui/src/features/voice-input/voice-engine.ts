// Voice-input engine contract — the pluggable capture layer behind <VoiceInput>.
//
// Two implementations ship:
//   - createWebSpeechEngine(): the real thing — Web Speech API recognition
//     (interim + final results) fused with a getUserMedia AnalyserNode for
//     true voice amplitude. Chrome/Edge/Safari; feature-detected.
//   - createScriptedEngine(): a deterministic playback engine for demos,
//     tests, and headless environments — no mic, no permissions, same events.
//
// The component consumes ONLY this interface, so hosts can swap in an
// engine backed by whisper.cpp / a native bridge later without UI changes.

/** Lifecycle phase of a capture session. */
export type VoicePhase = "idle" | "requesting" | "listening" | "denied" | "unsupported" | "error";

/** One transcript snapshot: committed text + the still-mutating interim tail. */
export interface VoiceTranscript {
	/** Finalized text — stable, never rewritten. */
	readonly finalText: string;
	/** Low-confidence tail still being recognized; replaced on every event. */
	readonly interimText: string;
}

/** Events the engine pushes while a session runs. */
export interface VoiceSessionEvents {
	/** Phase transitions (requesting → listening, denied, error…). */
	readonly onPhase: (phase: VoicePhase, detail?: string) => void;
	/** Live transcript updates (interim + final). */
	readonly onTranscript: (transcript: VoiceTranscript) => void;
	/** Voice amplitude 0..1, ~60Hz while listening — drives the waveform. */
	readonly onLevel: (level: number) => void;
	/** Recognition ended on its own (silence timeout upstream, tab hidden…). */
	readonly onEnd: () => void;
}

/** A running capture session. `stop` finalizes; `cancel` discards. */
export interface VoiceSession {
	readonly stop: () => void;
	readonly cancel: () => void;
}

/** The pluggable capture layer behind <VoiceInput>. */
export interface VoiceEngine {
	/** False when the environment can never capture (no API / no mic). */
	readonly supported: boolean;
	/** Begin a capture session. Returns null when unsupported. */
	readonly start: (events: VoiceSessionEvents, lang?: string) => VoiceSession | null;
}

// ---------------------------------------------------------------------------
// Web Speech engine — the real microphone path.
// ---------------------------------------------------------------------------

/** Minimal structural type for the (still-prefixed) SpeechRecognition API. */
interface SpeechRecognitionLike {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	onresult: ((event: SpeechRecognitionEventLike) => void) | null;
	onerror: ((event: { error?: string }) => void) | null;
	onend: (() => void) | null;
	start(): void;
	stop(): void;
	abort(): void;
}

interface SpeechRecognitionEventLike {
	readonly resultIndex: number;
	readonly results: ArrayLike<{ readonly isFinal: boolean; 0: { readonly transcript: string } }>;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function speechRecognitionCtor(): SpeechRecognitionCtor | null {
	if (typeof window === "undefined") return null;
	const w = window as unknown as Record<string, unknown>;
	return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionCtor | null;
}

/** Real microphone engine: Web Speech recognition + AnalyserNode amplitude. */
export function createWebSpeechEngine(): VoiceEngine {
	const Ctor = speechRecognitionCtor();
	const supported = Ctor !== null && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
	return {
		supported,
		start(events, lang) {
			if (!Ctor) return null;
			let finalText = "";
			let disposed = false;
			let stream: MediaStream | null = null;
			let audioCtx: AudioContext | null = null;
			let rafId = 0;

			const recognition = new Ctor();
			recognition.lang = lang ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");
			recognition.continuous = true;
			recognition.interimResults = true;
			recognition.onresult = event => {
				let interim = "";
				for (let i = event.resultIndex; i < event.results.length; i++) {
					const result = event.results[i];
					if (!result) continue;
					const text = result[0]?.transcript ?? "";
					if (result.isFinal) finalText += text;
					else interim += text;
				}
				events.onTranscript({ finalText, interimText: interim });
			};
			recognition.onerror = event => {
				if (disposed) return;
				if (event.error === "not-allowed" || event.error === "service-not-allowed") {
					events.onPhase("denied", event.error);
				} else if (event.error !== "aborted" && event.error !== "no-speech") {
					events.onPhase("error", event.error);
				}
			};
			recognition.onend = () => {
				if (!disposed) events.onEnd();
			};

			const teardown = () => {
				disposed = true;
				cancelAnimationFrame(rafId);
				recognition.onresult = null;
				recognition.onerror = null;
				recognition.onend = null;
				for (const track of stream?.getTracks() ?? []) track.stop();
				stream = null;
				void audioCtx?.close().catch(() => {});
				audioCtx = null;
			};

			events.onPhase("requesting");
			void (async () => {
				try {
					stream = await navigator.mediaDevices.getUserMedia({ audio: true });
				} catch {
					if (!disposed) events.onPhase("denied");
					teardown();
					return;
				}
				if (disposed) {
					teardown();
					return;
				}
				// Amplitude loop — time-domain RMS from an AnalyserNode, mapped to 0..1.
				audioCtx = new AudioContext();
				const source = audioCtx.createMediaStreamSource(stream);
				const analyser = audioCtx.createAnalyser();
				analyser.fftSize = 512;
				source.connect(analyser);
				const samples = new Float32Array(analyser.fftSize);
				const tick = () => {
					if (disposed) return;
					analyser.getFloatTimeDomainData(samples);
					let sum = 0;
					for (let i = 0; i < samples.length; i++) {
						const s = samples[i] ?? 0;
						sum += s * s;
					}
					// RMS of speech sits ~0.02–0.3; scale into a lively 0..1.
					events.onLevel(Math.min(1, Math.sqrt(sum / samples.length) * 4.5));
					rafId = requestAnimationFrame(tick);
				};
				rafId = requestAnimationFrame(tick);
				try {
					recognition.start();
					events.onPhase("listening");
				} catch (error) {
					events.onPhase("error", error instanceof Error ? error.message : String(error));
					teardown();
				}
			})();

			return {
				stop() {
					try {
						recognition.stop();
					} catch {
						/* already stopped */
					}
					teardown();
				},
				cancel() {
					try {
						recognition.abort();
					} catch {
						/* already stopped */
					}
					teardown();
				},
			};
		},
	};
}

// ---------------------------------------------------------------------------
// Scripted engine — deterministic playback for demos and tests.
// ---------------------------------------------------------------------------

/** One scripted utterance step: words arrive as interim, then commit. */
export interface ScriptedPhrase {
	/** The full phrase, revealed word by word as interim then finalized. */
	readonly text: string;
	/** Pause before this phrase starts (ms). */
	readonly leadInMs?: number;
}

export interface ScriptedEngineOptions {
	readonly phrases: readonly ScriptedPhrase[];
	/** Delay between interim words (ms). Default 130. */
	readonly wordMs?: number;
	/** Loop the script until stopped. Default false. */
	readonly loop?: boolean;
}

/** Demo/test engine: replays a word timeline with a synthesized voice level. */
export function createScriptedEngine(options: ScriptedEngineOptions): VoiceEngine {
	return {
		supported: true,
		start(events) {
			let disposed = false;
			let rafId = 0;
			const timers = new Set<ReturnType<typeof setTimeout>>();
			const wordMs = options.wordMs ?? 130;
			let finalText = "";
			// Synthesized "speech" level: layered sines with word-attack envelopes.
			let speaking = false;
			const t0 = performance.now();
			const levelTick = () => {
				if (disposed) return;
				const t = (performance.now() - t0) / 1000;
				// Speech-shaped level: ~4Hz syllable envelope (sharp attack, soft decay)
				// under a slower phrase swell, plus consonant flutter — so the waveform
				// reads as bursts and valleys, not a uniform carpet.
				const syllable = Math.max(0, Math.sin(t * Math.PI * 4.2)) ** 1.6;
				const phrase = 0.55 + 0.45 * Math.sin(t * 1.1 + Math.sin(t * 0.7) * 1.8);
				const flutter = 0.12 * Math.abs(Math.sin(t * 27.3)) * syllable;
				const level = speaking
					? 0.12 + 0.78 * syllable * phrase + flutter
					: 0.03 + 0.02 * Math.abs(Math.sin(t * 5.1));
				events.onLevel(Math.max(0, Math.min(1, level)));
				rafId = requestAnimationFrame(levelTick);
			};
			const after = (ms: number, fn: () => void) => {
				const id = setTimeout(() => {
					timers.delete(id);
					if (!disposed) fn();
				}, ms);
				timers.add(id);
			};

			const playPhrase = (phraseIndex: number) => {
				const phrase = options.phrases[phraseIndex];
				if (!phrase) {
					if (options.loop) {
						finalText = "";
						events.onTranscript({ finalText: "", interimText: "" });
						after(900, () => playPhrase(0));
					} else {
						events.onEnd();
					}
					return;
				}
				const words = phrase.text.split(/\s+/).filter(Boolean);
				after(phrase.leadInMs ?? 350, () => {
					speaking = true;
					const emitWord = (wordIndex: number) => {
						if (wordIndex > words.length) return;
						if (wordIndex === words.length) {
							// Commit the phrase: interim collapses into final.
							finalText = finalText ? `${finalText} ${phrase.text}` : phrase.text;
							speaking = false;
							events.onTranscript({ finalText, interimText: "" });
							after(240, () => playPhrase(phraseIndex + 1));
							return;
						}
						events.onTranscript({
							finalText,
							interimText: words.slice(0, wordIndex + 1).join(" "),
						});
						// Slight jitter so the rhythm feels human, not metronomic.
						after(wordMs + (wordIndex % 3) * 40, () => emitWord(wordIndex + 1));
					};
					emitWord(0);
				});
			};

			events.onPhase("requesting");
			after(420, () => {
				events.onPhase("listening");
				rafId = requestAnimationFrame(levelTick);
				playPhrase(0);
			});

			const teardown = () => {
				disposed = true;
				cancelAnimationFrame(rafId);
				for (const id of timers) clearTimeout(id);
				timers.clear();
			};
			return { stop: teardown, cancel: teardown };
		},
	};
}
