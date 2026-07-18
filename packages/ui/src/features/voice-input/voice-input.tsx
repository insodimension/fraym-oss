import type { VoiceEngine } from "./voice-engine";

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

// The built-in dictation mic is an engine-backed, product-only surface kept out
// of the open kit; the composer renders nothing for it here.
export function VoiceInput(_props: VoiceInputProps): null {
	return null;
}
