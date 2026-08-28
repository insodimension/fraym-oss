// The live-streaming markdown renderer, isolated so it can be code-split.
//
// `streamdown` is the heaviest dependency in the UI package and it is only needed
// while a turn is ACTIVELY streaming: settled text renders through the cheap
// `StaticMarkdownLite` parser (see `streaming-markdown.tsx`). Importing it
// statically from there put the whole stack in the chunk the app preloads at boot:
// streamdown pulls `mermaid` (3.0MB: every diagram type plus marked, katex, d3,
// dagre, js-yaml) as a hard dependency, and `@streamdown/code` pulls Shiki.
//
// Yarin renders inside Unreal's embedded CEF browser, where that is megabytes of
// parse and execute work on every dock open — before a single token has streamed.
// Keeping this module separate means the cost is paid on the first live turn
// instead, in parallel with the model's own latency.
//
// Everything streamdown-specific belongs HERE, including its stylesheet: an import
// left behind in the eager module would drag the chunk back in.

import { code } from "@streamdown/code";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";

/** Shiki highlighting plugin (github-light / github-dark), referenced once. */
const STREAMDOWN_PLUGINS = { code } as const;

export interface StreamdownLiveProps {
	readonly text: string;
	/** Streamdown's own reveal animation. */
	readonly animate?: boolean;
	readonly lineNumbers?: boolean;
}

/**
 * Default-exported so `lazy(() => import("./streamdown-live"))` needs no adapter.
 *
 * PROSE styling deliberately stays on the CALLER's wrapper: Streamdown runs its
 * `className` through a plain tailwind-merge that doesn't know the Fraym token
 * groups, and it silently dropped `text-fr-base` as conflicting with
 * `text-fr-text` — which is what inflated body font size mid-stream.
 */
export default function StreamdownLive({ text, animate = false, lineNumbers = false }: StreamdownLiveProps) {
	return (
		<Streamdown
			plugins={STREAMDOWN_PLUGINS}
			controls={false}
			lineNumbers={lineNumbers}
			animated={animate}
			isAnimating={animate}
		>
			{text}
		</Streamdown>
	);
}
