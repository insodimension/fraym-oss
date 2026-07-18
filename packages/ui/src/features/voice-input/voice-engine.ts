// Minimal capture-engine surface. The full engine-backed dictation engine is a
// product-only surface kept out of the open kit; this type only satisfies the
// composer's optional voice plumbing (the built-in mic renders nothing here).
export interface VoiceEngine {
	/** False when the environment can never capture (no API / no mic). */
	readonly supported: boolean;
}
