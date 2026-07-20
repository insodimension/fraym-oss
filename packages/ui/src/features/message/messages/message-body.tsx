// MessageBody — renders an agent message's blocks with the single Thread rhythm.
//
// Prose blocks (text / image / anything non-trace) sit at the `--fr-thread-beat`
// gap — the agent's "speech", evenly spaced. Runs of consecutive work-trace
// blocks (reasoning + tool) collapse into one `<TraceGroup>` at the tight
// `--fr-thread-trace` gap, so a think→tool→think run reads as one stream. Within
// a trace run, adjacent coalescable reads still merge into a "Read N files" card
// via `coalesceReadGroups`. ALL spacing is flex `gap`; `[&>*]:my-0` zeroes any
// block's intrinsic margin. See `docs/design/14-thread-architecture.md`.

import { Fragment, type ReactNode, useEffect, useRef } from "react";
import { cn } from "../../../lib/cn";
import { DEFAULT_MESSAGE_BLOCK_RENDERERS } from "../../../registries/default-renderers";
import {
	type MessageBlockContext,
	type MessageBlockRendererMap,
	useMessageBlockRenderers,
} from "../../../registries/message-block-registry";
import { useSettings } from "../../../settings/use-settings";
import { TraceGroup } from "../../thread/trace-group";
import { WorkedForGroup } from "../../thread/worked-for-group";
import { useToolDisplaySettings } from "../../tool-card/tool-display-settings";
import { coalesceReadGroups } from "../../tool-card/tools/read-group";
import { coalesceToolGroups } from "../../tool-card/tools/tool-group-model";
import type { MessageBlock, MessageData } from "../message";

/** Block types that form the agent's "work trace" and group tightly when adjacent. */
const TRACE_TYPES: ReadonlySet<string> = new Set(["reasoning", "tool"]);

/**
 * Find where the trailing answer starts. The answer is the final run of
 * consecutive text blocks — everything before it is "work" that goes into the
 * "Worked for Xs" disclosure. Returns `blocks.length` when there is no trailing
 * text (all work, no answer) and `0` when there is no work (all text).
 */
function answerStartIndex(blocks: readonly MessageBlock[]): number {
	for (let i = blocks.length - 1; i >= 0; i--) {
		const type = blocks[i]?.type;
		// The per-response usage footer trails its answer; skip it when locating the answer boundary.
		if (type === "tokenUsage") continue;
		if (type !== "text") return i + 1;
	}
	return 0;
}

function hasVisibleText(blocks: readonly MessageBlock[]): boolean {
	return blocks.some(block => block.type === "text" && String(block.text ?? "").trim().length > 0);
}

/**
 * Render the "Worked for Xs" disclosure: fold the work trace behind one openable summary
 * and keep the trailing answer visible below. Returns `null` (caller falls back to the
 * partition layout) when there is no work to fold or no visible answer yet.
 *
 * `coalesce` MUST be the read-merge coalescer, NOT the broad consecutive-tool grouping —
 * the disclosure IS the grouping, so re-coalescing the folded work into a nested collapsed
 * tool-group would double-fold it and hide the tool cards behind a second collapse.
 */
function renderWorkedBody(
	blocks: readonly MessageBlock[],
	message: MessageData,
	renderBlock: ResolvedBlockRenderer,
	animateEntry: boolean,
	coalesce: Coalesce,
): ReactNode[] | null {
	const split = answerStartIndex(blocks);
	const work = blocks.slice(0, split);
	const answer = blocks.slice(split);
	// No work to fold, or no visible trailing answer yet (still in tool/reasoning
	// phase): render the normal live stream. The Codex-style disclosure appears
	// only once the answer starts streaming, then the answer stays visible below it.
	if (split === 0 || !hasVisibleText(answer)) return null;
	const nodes: ReactNode[] = [
		<WorkedForGroup
			key="worked-for"
			count={work.length}
			startedAt={message.turnStartedAt}
			durationMs={message.turnDurationMs}
			animateEntry={animateEntry}
		>
			{coalesce(work, renderBlock)}
		</WorkedForGroup>,
		<div
			key="worked-for-divider"
			aria-hidden="true"
			data-slot="worked-for-divider"
			className="h-px bg-fr-border-soft"
		/>,
	];
	// Render the answer directly with the SAME `p${index}` key shape the partition
	// layout uses for these absolute indices — NOT a `coalesce` pass (the answer is by
	// construction pure prose with no trace/tool blocks, so read-group merging is a
	// no-op here anyway). Matching keys means settling from live→worked REUSES the
	// in-progress answer's React identity instead of remounting it: a key mismatch
	// here used to tear down and recreate the streaming text block at the exact moment
	// the turn settled, replaying its mount/entrance animation right after the
	// WorkedForGroup fold — the reported "streams in, collapses, then streams again".
	answer.forEach((block, i) => {
		const index = split + i;
		nodes.push(<Fragment key={`p${index}`}>{renderBlock(block, index)}</Fragment>);
	});
	return nodes;
}

export type BodyEntry = { readonly block: MessageBlock; readonly index: number };
export type BodyItem =
	| { readonly kind: "prose"; readonly block: MessageBlock; readonly index: number }
	| { readonly kind: "trace"; readonly entries: readonly BodyEntry[] };

/** Partition blocks into prose singles and runs of consecutive trace blocks, keeping
 *  original indices. A per-response `tokenUsage` footer (kept only when `showTokenUsage`)
 *  sandwiched inside a work trace is glue, not a beat-spaced prose break — absorbing it
 *  keeps the run (and its tool grouping) intact instead of severing the burst at every
 *  footer. A footer with no open run (e.g. trailing the answer) still falls through to prose. */
export function partitionBlocks(blocks: readonly MessageBlock[]): BodyItem[] {
	const items: BodyItem[] = [];
	let run: BodyEntry[] = [];
	const flush = () => {
		if (run.length > 0) {
			items.push({ kind: "trace", entries: run });
			run = [];
		}
	};
	blocks.forEach((block, index) => {
		if (TRACE_TYPES.has(block.type) || (block.type === "tokenUsage" && run.length > 0)) {
			run.push({ block, index });
		} else {
			flush();
			items.push({ kind: "prose", block, index });
		}
	});
	flush();
	return items;
}

export type ResolvedBlockRenderer = (block: MessageBlock, index: number) => ReactNode;

/** Coalesces a block run into rendered nodes — read-group merge, or the broader tool grouping. */
export type Coalesce = (blocks: readonly MessageBlock[], renderBlock: ResolvedBlockRenderer) => ReactNode[];

/**
 * Hook returning the block resolver used by both `MessageBody` and the user
 * bubble: explicit `components[type]` → block registry → default renderers.
 */
export function useResolvedBlockRenderer(
	message: MessageData,
	isLast?: boolean,
	isStreaming?: boolean,
	components?: MessageBlockRendererMap,
): ResolvedBlockRenderer {
	const registry = useMessageBlockRenderers();
	return (block, index) => {
		const ctx: MessageBlockContext = { index, message, isLast, isStreaming };
		const override = components?.[block.type];
		if (override) return override(block, ctx);
		const fromRegistry = registry[block.type];
		if (fromRegistry) return fromRegistry(block, ctx);
		const fallback = DEFAULT_MESSAGE_BLOCK_RENDERERS[block.type];
		return fallback ? fallback(block, ctx) : null;
	};
}

export interface MessageBodyProps {
	readonly message: MessageData;
	readonly isLast?: boolean;
	readonly isStreaming?: boolean;
	readonly components?: MessageBlockRendererMap;
	readonly className?: string;
}

export function MessageBody({ message, isLast, isStreaming, components, className }: MessageBodyProps) {
	const renderBlock = useResolvedBlockRenderer(message, isLast, isStreaming, components);
	const live = Boolean(isStreaming && isLast);
	// Track the live→settled transition so the worked-fold SWOOPS (animates the fold)
	// exactly when a turn just finished — not when a settled turn is loaded from history
	// or a reopened session. The in-place settle stamp re-renders this same MessageBody
	// instance (stable message id), so the ref survives the transition; a fresh mount
	// (history/reopen) has wasLive === live → justSettled false → mounts pre-folded.
	const wasLiveRef = useRef(live);
	const justSettled = wasLiveRef.current && !live;
	useEffect(() => {
		wasLiveRef.current = live;
	});
	const { config } = useSettings();
	// Per-response token-usage footers ride the journal as `tokenUsage` blocks; the display
	// setting gates rendering. Filtering before layout keeps worked-collapse identical when off.
	const blocks = config.showTokenUsage ? message.blocks : message.blocks.filter(block => block.type !== "tokenUsage");
	// Read-merge only (consecutive same-target reads → one "Read N files" card; everything
	// else renders as its own card). This is the inner coalescing for the "Worked for Xs"
	// fold: that disclosure ALREADY groups the whole work trace, so re-coalescing the folded
	// work into a nested collapsed tool-group is a redundant double-fold — expanding the
	// disclosure would reveal an "N tools" group instead of the actual tool cards (the 0.5.24
	// regression, once interstitial-footer run-glue finally let those bursts group).
	const toolSettings = useToolDisplaySettings();
	const readCoalesce: Coalesce = (b, render) => coalesceReadGroups(b, render);
	// Broad consecutive-tool grouping (default on) for the UN-folded partition / live-stream
	// path: collapses a run of consecutive tool calls into one nested group card; sub-threshold
	// runs fall through to the read-merge. Off → read-merge only. When reasoning is HIDDEN
	// (`!showReasoning`) it folds into a group as glue so a burst the model interleaved with
	// thinking still coalesces; when reasoning is VISIBLE it stays a run separator.
	const coalesce: Coalesce = toolSettings.groupConsecutiveTools
		? (b, render) =>
				coalesceToolGroups(b, render, {
					threshold: toolSettings.groupThreshold,
					glueReasoning: !config.showReasoning,
				})
		: readCoalesce;

	// Codex-style "Worked for Xs" collapse — fold the work trace into a disclosure
	// and keep the answer visible. Falls back to partition when there's no trace.
	if (message.collapse === "worked") {
		const workedBody = renderWorkedBody(blocks, message, renderBlock, justSettled, readCoalesce);
		if (workedBody) {
			return (
				<div
					data-slot="message-body"
					className={cn("flex min-w-0 flex-col gap-[var(--fr-thread-beat)] [&>*]:my-0", className)}
				>
					{workedBody}
				</div>
			);
		}
	}

	const items = partitionBlocks(blocks);

	return (
		<div
			data-slot="message-body"
			className={cn("flex min-w-0 flex-col gap-[var(--fr-thread-beat)] [&>*]:my-0", className)}
		>
			{items.map(item => {
				if (item.kind === "prose") {
					return <Fragment key={`p${item.index}`}>{renderBlock(item.block, item.index)}</Fragment>;
				}
				const entries = item.entries;
				return (
					<TraceGroup key={`t${entries[0]?.index}`}>
						{coalesce(
							entries.map(e => e.block),
							(block, localIndex) =>
								renderBlock(block as MessageBlock, entries[localIndex]?.index ?? localIndex),
						)}
					</TraceGroup>
				);
			})}
		</div>
	);
}
