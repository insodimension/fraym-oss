import { useCallback, useState } from "react";
import type { ComposerImageAttachment } from "./composer-core";

/** Result of a composer submit: `false` keeps the draft, anything else clears it. */
export type ComposerSubmitResult = boolean | Promise<boolean>;
/** Submit handler signature shared by every composer surface. */
export type ComposerSubmit = (value: string, attachments?: readonly ComposerImageAttachment[]) => ComposerSubmitResult;

export interface ComposerDraft {
	/** Live text to bind to the `Composer` `value`. */
	readonly value: string;
	/** Forward to `Composer` `onChange` — updates the draft and the shared value. */
	readonly onChange: (value: string) => void;
	/** Forward to `Composer` `onSubmit` — submits, then clears on success. */
	readonly onSubmit: (value: string, attachments?: readonly ComposerImageAttachment[]) => void;
	/** Imperatively clear the draft (and the shared value). */
	readonly clear: () => void;
}

/**
 * Local-draft glue for a `Composer`.
 *
 * The shell keeps the "committed" composer text outside React render state (a
 * ref whose setter does NOT trigger a re-render, so keystrokes stay cheap). A
 * `Composer` bound straight to that value would never repaint — you couldn't
 * type. This hook owns a local draft that reflects keystrokes immediately,
 * forwards every change to the shared `onComposerChange`, re-syncs when the
 * external value changes for another reason (session switch, programmatic
 * reset), and clears on a successful submit.
 *
 * Both the docked composer and the start-surface composer consume it so their
 * text handling cannot drift — that divergence is exactly what once froze the
 * start-surface field.
 *
 * @param committed - the shared/committed composer value owned by the shell.
 * @param onCommit - persists each change back to the shell (the ref setter).
 * @param onSubmit - submit handler; clears the draft on a resolved / non-`false` result.
 */
export function useComposerDraft(
	committed: string,
	onCommit: (value: string) => void,
	onSubmit: ComposerSubmit,
): ComposerDraft {
	const [draft, setDraft] = useState(committed);
	const [tracked, setTracked] = useState(committed);
	// Adjust state during render (the React-endorsed pattern) when `committed`
	// changes externally — not as a result of local typing.
	if (tracked !== committed) {
		setTracked(committed);
		setDraft(committed);
	}
	const onChange = useCallback(
		(value: string) => {
			setDraft(value);
			onCommit(value);
		},
		[onCommit],
	);
	const clear = useCallback(() => {
		setDraft("");
		onCommit("");
	}, [onCommit]);
	const submit = useCallback(
		(value: string, attachments?: readonly ComposerImageAttachment[]) => {
			const result = onSubmit(value, attachments);
			if (result instanceof Promise) {
				void result.then(accepted => {
					if (accepted !== false) clear();
				});
				return;
			}
			if (result !== false) clear();
		},
		[clear, onSubmit],
	);
	return { value: draft, onChange, onSubmit: submit, clear };
}
