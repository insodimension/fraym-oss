// Registry-driven tool rendering.
//
// `ToolRender` is the presentational bridge: given a tool call, it picks the
// body from the ToolRendererRegistry and frames it in the shared `ToolCard`
// chassis (header / status / collapsible body). `ConnectedToolStream` wires the
// live `useToolStream()` feed through it — the pluggable replacement for a
// hardcoded tool timeline.

import { resolveToolIcon } from "@fraym/config";
import { type ReactNode, useMemo } from "react";
import type { ActiveToolCall } from "../../../hooks/session-types";
import { useToolStream } from "../../../hooks/use-tool-stream";
import { Icon } from "../../../icons";
import { cn } from "../../../lib/cn";
import {
	isToolView,
	normalizeToolName,
	type ToolRenderer,
	type ToolView,
	useToolRenderer,
} from "../../../registries/tool-renderer-registry";
import type { FraymDensity } from "../../surface-kit";
import { ToolCard, type ToolCardProps, type ToolKind, toolKindConfig } from "../tool-card";
import { resolveToolDefaultOpen, type ToolDisplaySettings, useToolDisplaySettings } from "../tool-display-settings";

const TOOL_KIND_MATCHERS: readonly (readonly [RegExp, ToolKind])[] = [
	[/\//, "realm"],
	[/__/, "mcp"],
	[/(bash|shell|command|run|exec|eval|terminal|ssh)/, "command"],
	[/(search|grep|glob|find)/, "grep"],
	[/(read|open|cat|view)/, "read"],
	[/(web|fetch|browser|http)/, "web"],
	[/todo/, "todo"],
	[/(task|agent)/, "task"],
	[/skill/, "skill"],
];

/** Best-effort tool-name → card icon kind. */
export function toolKindForName(toolName: string): ToolKind {
	const searchable = `${toolName}\n${normalizeToolName(toolName)}`;
	return TOOL_KIND_MATCHERS.find(([pattern]) => pattern.test(searchable))?.[1] ?? "json";
}
/** A tool's face outside a card: the SAME glyph its tool-card header shows
 *  (kind-matched icon + kind color), for chips, pills, and menus. */
export function ToolGlyph({ name, size = 14 }: { readonly name: string; readonly size?: number }) {
	const config = toolKindConfig(toolKindForName(name));
	return (
		<Icon
			name={config.icon}
			size={size}
			{...(config.filled === undefined ? {} : { filled: config.filled })}
			{...(config.viewBox === undefined ? {} : { viewBox: config.viewBox })}
			className={cn("shrink-0", config.iconColor)}
		/>
	);
}

const STATUS_STAT_LABELS: Partial<Record<ActiveToolCall["status"], string>> = {
	error: "failed",
	success: "done",
};

function statLabel(status: ActiveToolCall["status"]): string | undefined {
	return STATUS_STAT_LABELS[status];
}

/** Map a raw call status to the card's ToolStatus for the GENERIC fallback (no
 *  ToolView). A running call resolves to `pending` so its head label shimmers,
 *  matching every bespoke renderer; bespoke views still override via `view.status`. */
function fallbackToolStatus(status: ActiveToolCall["status"]): ToolView["status"] {
	return status === "running" ? "pending" : status === "error" ? "error" : "success";
}

export interface ToolRenderProps {
	readonly call: ActiveToolCall;
	/** Override the registry-resolved renderer for this call. */
	readonly renderer?: ToolRenderer | undefined;
	readonly defaultOpen?: boolean | undefined;
	/** Card density (head/body geometry): comfortable · compact · spacious. */
	readonly density?: FraymDensity | undefined;
	readonly className?: string | undefined;
}

interface ToolRenderModel {
	readonly props: Omit<ToolCardProps, "children" | "className">;
	readonly body: ReactNode;
}

function renderToolCall(renderer: ToolRenderer | undefined, call: ActiveToolCall): ReturnType<ToolRenderer> {
	return renderer?.(call) ?? null;
}

function toolResultView(result: ReturnType<ToolRenderer>): { view: ToolView | null; body: ReactNode } {
	const view = isToolView(result) ? result : null;
	return { view, body: view ? view.body : (result as ReactNode) };
}

function fallbackToolCardProps(
	call: ActiveToolCall,
	settings: Required<ToolDisplaySettings>,
	defaultOpen: boolean | undefined,
	density: FraymDensity | undefined,
): ToolRenderModel["props"] {
	return {
		kind: toolKindForName(call.toolName),
		// Policy icon override (UE/MCP tools); inherited by toolViewCardProps via the `...fallback` spread.
		icon: resolveToolIcon(settings.iconPolicy, call.toolName) ?? undefined,
		label: call.displayName ?? call.toolName,
		status: fallbackToolStatus(call.status),
		stat: call.status === "running" ? "running…" : statLabel(call.status),
		defaultOpen: resolveToolDefaultOpen(call.status, settings, defaultOpen),
		density: density ?? settings.density,
	};
}

function toolViewCardProps(
	call: ActiveToolCall,
	settings: Required<ToolDisplaySettings>,
	view: ToolView,
	defaultOpen: boolean | undefined,
	density: FraymDensity | undefined,
	fallback: ToolRenderModel["props"],
): ToolRenderModel["props"] {
	return {
		...fallback,
		kind: view.kind,
		headIcon: view.headIcon,
		header: view.header,
		label: view.label,
		badges: view.badges,
		status: view.status,
		stat: view.stat ?? fallback.stat,
		bodyVariant: view.bodyVariant,
		defaultOpen: resolveToolDefaultOpen(call.status, settings, view.defaultOpen ?? defaultOpen),
		density: density ?? settings.density,
	};
}

function toolRenderModel(
	call: ActiveToolCall,
	result: ReturnType<ToolRenderer>,
	settings: Required<ToolDisplaySettings>,
	defaultOpen: boolean | undefined,
	density: FraymDensity | undefined,
): ToolRenderModel {
	const { view, body } = toolResultView(result);
	const fallback = fallbackToolCardProps(call, settings, defaultOpen, density);
	return { props: view ? toolViewCardProps(call, settings, view, defaultOpen, density, fallback) : fallback, body };
}

/** Render one tool call: registry body inside the `ToolCard` chassis. */
export function ToolRender({ call, renderer, defaultOpen, density, className }: ToolRenderProps) {
	const registryRenderer = useToolRenderer(call.toolName);
	const toolDisplaySettings = useToolDisplaySettings();
	const resolved = renderer ?? registryRenderer;
	// Memoize on call identity so the renderer (e.g. edit's diff parse) only re-runs
	// when the call actually changes — the reducer preserves identity on no-op updates.
	const result = useMemo(() => renderToolCall(resolved, call), [resolved, call]);
	// A renderer may drive the head via a `ToolView`; otherwise the result is the bare body.
	const model = toolRenderModel(call, result, toolDisplaySettings, defaultOpen, density);
	return (
		<ToolCard {...model.props} className={className}>
			{model.body}
		</ToolCard>
	);
}

export interface ConnectedToolStreamProps {
	readonly className?: string | undefined;
	readonly emptyState?: React.ReactNode | undefined;
}

/** Live tool calls from the session driver, each rendered via the registry. */
export function ConnectedToolStream({ className, emptyState }: ConnectedToolStreamProps) {
	const tools = useToolStream();
	if (tools.length === 0) return emptyState ? emptyState : null;
	return (
		<div data-slot="tool-stream" className={className}>
			{tools.map(call => (
				<ToolRender key={call.callId} call={call} />
			))}
		</div>
	);
}
