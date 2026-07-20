// Engine-backed VoiceEngine — dictation through Engine's on-device STT.
//
// The browser owns only the MICROPHONE: getUserMedia + a 16 kHz AudioContext
// pump raw s16le PCM chunks over the driver's `_fraym/stt/*` lane into the
// engine's warm speech worker (the same one behind the TUI's hold-Space
// push-to-talk). Partial/segment transcripts push back over the event lane.
// No Web Speech API involved — this is what makes dictation work in desktop
// webviews and keeps audio fully local (browser → local engine → on-device
// model; nothing leaves the machine).
//
// Level events are computed client-side from chunk RMS (same 0..1 scale as
// the Web Speech engine's AnalyserNode loop) so the waveform stays live even
// while the engine is still warming the model.

import type { SpeechToTextEvents, SpeechToTextHandle } from "@fraym/driver";
import { errorMessageText } from "../../hooks/session-error";
import type { VoiceEngine, VoiceSessionEvents, VoiceTranscript } from "./voice-engine";

/** The slice of a SessionDriver this engine needs (the STT capability). */
export interface EngineSttBridge {
	readonly startSpeechToText: (events: SpeechToTextEvents, lang?: string) => Promise<SpeechToTextHandle>;
}

/** Samples per pushed chunk at 16 kHz — 4096 ≈ 256 ms of audio. */
const CHUNK_SAMPLES = 4096;

/** Join finalized segments + the volatile tail into one transcript snapshot. */
function transcriptOf(finals: readonly string[], interim: string): VoiceTranscript {
	return { finalText: finals.join(" "), interimText: interim };
}

/**
 * A VoiceEngine whose recognition runs in the ENGINE (Engine on-device STT).
 * `bridge` is any SessionDriver exposing `startSpeechToText` — callers gate on
 * the capability's presence before constructing this.
 */
export function createEngineVoiceEngine(bridge: EngineSttBridge): VoiceEngine {
	const supported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
	return {
		supported,
		start(events: VoiceSessionEvents, lang?: string) {
			let disposed = false;
			let stream: MediaStream | null = null;
			let audioCtx: AudioContext | null = null;
			let handle: SpeechToTextHandle | null = null;
			const finals: string[] = [];
			let interim = "";

			const teardown = () => {
				disposed = true;
				for (const track of stream?.getTracks() ?? []) track.stop();
				stream = null;
				void audioCtx?.close().catch(() => {});
				audioCtx = null;
			};

			events.onPhase("requesting");
			void (async () => {
				// Mic first — permission is the likeliest failure and the user is
				// waiting on the prompt; the engine stream opens while they read it.
				try {
					stream = await navigator.mediaDevices.getUserMedia({
						audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
					});
				} catch {
					if (!disposed) events.onPhase("denied");
					teardown();
					return;
				}
				if (disposed) {
					teardown();
					return;
				}
				try {
					handle = await bridge.startSpeechToText(
						{
							onReady: () => {
								if (!disposed) events.onPhase("listening");
							},
							onProgress: progress => {
								// First use downloads the speech model — keep the pill in
								// "requesting" with an honest detail line.
								if (disposed) return;
								const percent = typeof progress.percent === "number" ? ` ${Math.round(progress.percent)}%` : "";
								events.onPhase("requesting", `downloading speech model${percent}`);
							},
							onPartial: text => {
								if (disposed) return;
								interim = text;
								events.onTranscript(transcriptOf(finals, interim));
							},
							onSegment: text => {
								if (disposed) return;
								if (text) finals.push(text);
								interim = "";
								events.onTranscript(transcriptOf(finals, interim));
							},
							onError: message => {
								if (disposed) return;
								events.onPhase("error", message);
								teardown();
							},
						},
						lang,
					);
				} catch (error) {
					if (!disposed) events.onPhase("error", errorMessageText(error));
					teardown();
					return;
				}
				if (disposed) {
					handle.cancel();
					teardown();
					return;
				}
				// 16 kHz mono capture pump. A fixed-rate AudioContext resamples the
				// mic for us; the processor hands ~256 ms Float32 frames that become
				// s16le chunks on the wire. (ScriptProcessor is deprecated but is the
				// one capture path every Chromium/WebKit webview ships without a
				// worklet-module URL, which a library cannot assume it can host.)
				audioCtx = new AudioContext({ sampleRate: 16_000 });
				const source = audioCtx.createMediaStreamSource(stream);
				const processor = audioCtx.createScriptProcessor(CHUNK_SAMPLES, 1, 1);
				processor.onaudioprocess = event => {
					if (disposed || !handle) return;
					const samples = event.inputBuffer.getChannelData(0);
					// RMS → the same lively 0..1 scale the Web Speech engine emits.
					let sum = 0;
					const pcm = new Int16Array(samples.length);
					for (let i = 0; i < samples.length; i++) {
						const s = samples[i] ?? 0;
						sum += s * s;
						pcm[i] = Math.max(-32768, Math.min(32767, Math.round(s * 32768)));
					}
					events.onLevel(Math.min(1, Math.sqrt(sum / samples.length) * 4.5));
					handle.sendAudio(pcm);
				};
				source.connect(processor);
				processor.connect(audioCtx.destination);
			})();

			return {
				stop() {
					// The component commits finals + interim synchronously; the engine's
					// final flush result is redundant here — release it in background.
					const active = handle;
					handle = null;
					teardown();
					if (active) void active.stop().catch(() => {});
				},
				cancel() {
					const active = handle;
					handle = null;
					teardown();
					active?.cancel();
				},
			};
		},
	};
}
