// Dynamic tool grouping — a run of ≥N *consecutive* tool calls coalesces into one
// "group" card so a long burst of chatter (e.g. many MCP / editor probes) reads as a
// single line instead of a wall of cards. The collapsed group head MIRRORS the latest
// call (its icon / label / badges / stat), plus a `N tools` count + an aggregate health
// mark; opening the group reveals every call as its own card, each independently
// openable. The children render through the SAME tool path as standalone cards, so a
// grouped card is visually identical to an ungrouped one.
//
// This generalizes the read-only `coalesceReadGroups` precedent: read merges only
// same-target reads into a "Read N files" summary; this merges ANY consecutive run of
// tool calls into a nested stack — EXCEPT skills / sub-agent delegations (kind "skill"),
// which render standalone so a deliberate hand-off is never buried behind an "N tools"
// head. The two compose — sub-threshold runs still fall through to `coalesceReadGroups`,
// so short read bursts keep their summary card.

import { type IconSpec, resolveToolIcon, type ToolIconPolicy } from "@fraym-ai/config";
import { Fragment, type ReactNode, useMemo } from "react";
import { Badge } from "../../../elements/badge";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { describeTool, type ToolKindId } from "../../../registries/describe-tool";
import {
	isToolView,
	resolveToolRenderer,
	type ToolRendererMap,
	useToolRendererMap,
} from "../../../registries/tool-renderer-registry";
import { ToolCard, type ToolKind, type ToolStatus } from "../tool-card";
import { resolveToolDefaultOpen, useToolDisplaySettings } from "../tool-display-settings";
import { coalesceReadGroups } from "./read-group-model";
import { ToolRender, toolKindForName } from "./tool-render";

type BlockLike = { readonly type: string; readonly [key: string]: unknown };

/**
 * Minimum consecutive-call run length before a burst collapses into a group. Set to
 * 2 so the SECOND consecutive tool folds straight into the group head instead of
 * first rendering as a standalone card that then collapses (the streaming "flash").
 */
export const DEFAULT_TOOL_GROUP_THRESHOLD = 2;

function isToolCall(v: unknown): v is ActiveToolCall {
	return typeof v === "object" && v !== null && typeof (v as { callId?: unknown }).callId === "string";
}

/** Semantic tool kinds that NEVER fold into a consecutive-tool group. A skill load or
 *  sub-agent delegation (`skill` / `task` / `agent` / `workflow` → describe-tool kind
 *  "skill") is a deliberate hand-off, not the interchangeable probe chatter grouping is
 *  meant to collapse — burying one behind an "N tools" head hides the delegation. Such a
 *  call renders standalone and breaks any surrounding run, like visible prose. */
const UNGROUPABLE_KINDS: ReadonlySet<ToolKindId> = new Set<ToolKindId>(["skill"]);

function isUngroupableCall(call: ActiveToolCall): boolean {
	return UNGROUPABLE_KINDS.has(describeTool(call.toolName, call.input).kind);
}

interface GroupHead {
	readonly kind: ToolKind;
	readonly icon?: IconSpec;
	readonly label: ReactNode;
	readonly badges?: ReactNode;
	readonly stat?: string;
}

/**
 * Derive the head of one call exactly as a standalone tool card would: resolve its
 * registered renderer, read the `ToolView` head fields when present, else fall back to
 * the tool name + kind. Mirrors `DefaultToolBlock`'s head derivation so the group head
 * is faithful to the latest tool.
 */
function deriveHead(call: ActiveToolCall, iconPolicy: ToolIconPolicy, renderers: ToolRendererMap): GroupHead {
	const renderer = resolveToolRenderer(renderers, call.toolName);
	const result = renderer?.(call) ?? null;
	const view = isToolView(result) ? result : null;
	const icon = resolveToolIcon(iconPolicy, call.toolName) ?? undefined;
	if (view) {
		return {
			kind: view.kind ?? toolKindForName(call.toolName),
			icon,
			label: view.label ?? call.displayName ?? call.toolName,
			badges: view.badges,
			stat: view.stat,
		};
	}
	return { kind: toolKindForName(call.toolName), icon, label: call.displayName ?? call.toolName };
}

export interface ToolGroupCardProps {
	/** The ordered run of consecutive calls (≥2). The LAST is the "latest" shown collapsed. */
	readonly calls: readonly ActiveToolCall[];
	/** Renders one child call as its own card. Defaults to the production `<ToolRender>`. */
	readonly renderChild?: (call: ActiveToolCall, index: number) => ReactNode;
	/** Explicit group-stack disclosure; otherwise resolved from display settings. */
	readonly defaultOpen?: boolean;
	readonly className?: string;
}

/**
 * A nested tool card: collapsed it shows the latest call's head + a `N tools` count
 * (and a `✕ K` mark when any call failed); open it stacks every call as its own
 * independently-openable card — the same `ToolCard` chassis a standalone card uses.
 */
export function ToolGroupCard({ calls, renderChild, defaultOpen, className }: ToolGroupCardProps) {
	const settings = useToolDisplaySettings();
	const renderers = useToolRendererMap();
	const latest = calls[calls.length - 1];
	const head = useMemo(
		() => (latest ? deriveHead(latest, settings.iconPolicy, renderers) : null),
		[latest, settings.iconPolicy, renderers],
	);
	if (!latest || !head) return null;

	const failed = calls.reduce((n, c) => n + (c.status === "error" ? 1 : 0), 0);
	const running = calls.some(c => c.status === "running");
	// Aggregate health drives the head dot (a failure inside is the strongest signal),
	// while the label/icon identity stays the latest tool.
	const groupStatus: ToolStatus = failed > 0 ? "error" : running ? "pending" : "success";
	// Live streaming must be VISIBLE (TUI parity, same contract as the edit/write
	// live-typing force): while any call inside is running, the group opens so the
	// child's own streaming reveal (edit live-typing, bash tail-follow) is mounted —
	// a collapsed group unmounts its children, which was exactly the "stuck at
	// running…, nothing streams" report. Completion hands control back to the
	// user's defaultOpen policy; an explicit prop or manual toggle always wins.
	const open = resolveToolDefaultOpen(
		running ? "running" : "success",
		settings,
		defaultOpen ?? (running || undefined),
	);

	const groupBadges = (
		<>
			<Badge variant="code" tone="mute">
				{calls.length} tools
			</Badge>
			{failed > 0 && (
				<Badge variant="code" tone="del">
					✕ {failed}
				</Badge>
			)}
			{head.badges}
		</>
	);

	const render = renderChild ?? ((call: ActiveToolCall) => <ToolRender call={call} />);

	return (
		<ToolCard
			kind={head.kind}
			icon={head.icon}
			label={head.label}
			badges={groupBadges}
			stat={head.stat}
			status={groupStatus}
			density={settings.density}
			defaultOpen={open}
			className={className}
		>
			<div data-slot="tool-group-stack" className="flex flex-col gap-[var(--fr-thread-trace)]">
				{calls.map((call, i) => (
					<Fragment key={call.callId ?? i}>{render(call, i)}</Fragment>
				))}
			</div>
		</ToolCard>
	);
}

export interface CoalesceToolGroupsOptions {
	/** Minimum consecutive-call run length before grouping (default `DEFAULT_TOOL_GROUP_THRESHOLD`). */
	readonly threshold?: number;
	/** Treat `reasoning` blocks as run-glue too (fold hidden thinking into a tool group).
	 *  Set when reasoning is HIDDEN (`!showReasoning`) so a burst the model interleaved with
	 *  thinking still groups; leave false when reasoning is VISIBLE so it stays a separator. */
	readonly glueReasoning?: boolean;
}

/**
 * Render `blocks`, coalescing each run of ≥`threshold` consecutive tool calls into one
 * `ToolGroupCard`. A per-response `tokenUsage` footer interleaved BETWEEN tools (the
 * journal writes one above each response's tools when `showTokenUsage` is on) is treated
 * as run-glue, not a run-breaker, so a sequential burst still reaches the threshold —
 * interstitial footers fold into the group; a trailing footer (after the last tool) stays
 * outside. Sub-threshold runs (and all non-tool blocks) fall through to `coalesceReadGroups`,
 * preserving the existing read-summary behavior. Returns keyed nodes ready to drop into
 * the message body.
 */
export function coalesceToolGroups(
	blocks: readonly BlockLike[],
	renderBlock: (block: BlockLike, index: number) => ReactNode,
	opts?: CoalesceToolGroupsOptions,
): ReactNode[] {
	const threshold = Math.max(2, opts?.threshold ?? DEFAULT_TOOL_GROUP_THRESHOLD);
	const glueReasoning = opts?.glueReasoning ?? false;
	const out: ReactNode[] = [];
	let i = 0;
	const blockCall = (b: BlockLike): ActiveToolCall | undefined => {
		const call = b.type === "tool" ? (b as { call?: unknown }).call : undefined;
		return isToolCall(call) ? call : undefined;
	};
	// A skill / sub-agent delegation renders standalone: it never folds into a group and
	// breaks any surrounding run, so the hand-off stays legible instead of hidden behind an
	// "N tools" head. Only groupable tool blocks drive run detection + the group count.
	const groupableCall = (b: BlockLike): ActiveToolCall | undefined => {
		const call = blockCall(b);
		return call && !isUngroupableCall(call) ? call : undefined;
	};
	while (i < blocks.length) {
		const block = blocks[i] as BlockLike;
		if (groupableCall(block)) {
			const start = i;
			// A run is a maximal sequence of consecutive tool calls. Two kinds of
			// interstitial block are run-GLUE, not run-breakers (else a sequential burst
			// never reaches the threshold and grouping silently never fires):
			//   • per-response `tokenUsage` footers (journal-inserted when `showTokenUsage`);
			//   • `reasoning` blocks — but ONLY when reasoning is HIDDEN (`glueReasoning`,
			//     i.e. `!showReasoning`): hidden thinking between tools would otherwise
			//     fragment a visually-adjacent burst into singles. When reasoning is VISIBLE
			//     it stays a run-BREAKER so the user keeps seeing it between the tools.
			// Only GROUPABLE tool blocks count toward the run + the `N tools` count; glue folds
			// away (like the usage footer). Visible `text` commentary and skill/sub-agent calls
			// (see `groupableCall`) BREAK the run, so narrated steps and hand-offs stay separate.
			// Trailing glue (after the last tool) stays outside.
			const toolBlocks: BlockLike[] = [];
			const toolIndices: number[] = [];
			let lastToolEnd = i;
			while (i < blocks.length) {
				const b = blocks[i] as BlockLike;
				if (groupableCall(b)) {
					toolBlocks.push(b);
					toolIndices.push(i);
					i++;
					lastToolEnd = i;
				} else if (b.type === "tokenUsage" || (glueReasoning && b.type === "reasoning")) {
					i++;
				} else {
					break;
				}
			}
			i = lastToolEnd;
			if (toolBlocks.length >= threshold) {
				const calls = toolBlocks.map(b => blockCall(b) as ActiveToolCall);
				out.push(
					<ToolGroupCard
						key={`tool-group-${calls[0]?.callId ?? start}`}
						calls={calls}
						renderChild={(_call, k) => renderBlock(toolBlocks[k] as BlockLike, toolIndices[k] ?? start + k)}
					/>,
				);
			} else {
				// Short burst: keep read coalescing + per-tool cards over the original
				// slice (interstitial footers preserved), indices preserved.
				const slice = blocks.slice(start, lastToolEnd);
				for (const node of coalesceReadGroups(slice, (b, k) => renderBlock(b, start + k))) {
					out.push(node);
				}
			}
		} else {
			out.push(<Fragment key={`b${i}`}>{renderBlock(block, i)}</Fragment>);
			i++;
		}
	}
	return out;
}
