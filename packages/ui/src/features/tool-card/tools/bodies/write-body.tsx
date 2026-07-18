// Write-tool body surface — the content preview for the `write` renderer.
// The adapter that maps an ActiveToolCall → these props lives in the renderer
// registry (`renderWrite` in default-renderers.tsx). See docs/design/tools/write.md.
//
// Write shows the NEW file content as a line-numbered, syntax-highlighted preview
// (reusing ReadCodeBody) — NOT a diff: the tool captures no prior content, so there
// is nothing to diff against. The content rides a per-card capped scroll window that
// reserves the scrollbar gutter (no content shift) and follows the tail while
// streaming, mirroring the TUI's last-N-lines write preview window.

import { useEffect, useRef } from "react";
import { ReadCodeBody } from "./read-body";

export interface WriteContentBodyProps {
	/** The full new file content (what `renderWrite` reads from input/partial output). */
	readonly text: string;
	/** Shiki language id (from the path extension). */
	readonly language: string;
	/** Cap (px) for this content's scroll window. Omit for no cap. */
	readonly maxHeight?: number | undefined;
	/** Auto-scroll to the tail as content grows (streaming). */
	readonly followTail?: boolean | undefined;
	/** Show the line-number gutter. Default true. */
	readonly lineNumbers?: boolean | undefined;
}

export function WriteContentBody({ text, language, maxHeight, followTail, lineNumbers = true }: WriteContentBodyProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-scroll to the tail as content grows.
	useEffect(() => {
		if (followTail && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
	}, [followTail, text]);

	if (!text) {
		return <div className="font-secondary text-fr-xs text-fr-text-3">No content.</div>;
	}
	return (
		<div
			ref={scrollRef}
			className="overflow-auto"
			style={maxHeight != null ? { maxHeight, scrollbarGutter: "stable" } : undefined}
		>
			<ReadCodeBody text={text} language={language} lineNumbers={lineNumbers} />
		</div>
	);
}
