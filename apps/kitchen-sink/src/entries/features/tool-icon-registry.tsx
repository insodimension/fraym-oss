import {
	type ActiveToolCall,
	DEFAULT_TOOL_ICON_POLICY,
	type IconSpec,
	ToolCard,
	type ToolKind,
	ToolRender,
	toolIconNode,
} from "@fraym-ai/ui";
import { Demo, Note } from "../../showcase/demo";
import type { ShowcaseEntry } from "../../showcase/types";

// ─────────────────────────────────────────────────────────────────────────────
// Tool Icon Registry showcase.
//
// Proves the config-driven tool→icon policy end-to-end without a live UE editor:
//   1. KINDS    every ToolKind's built-in KIND_CONFIG icon, across the 4 statuses.
//   2. POLICY   each DEFAULT_TOOL_ICON_POLICY rule — the official Unreal logo, the
//               tinted lucide asset marks, and the mono category marks — fed to a
//               ToolCard via the per-call `icon` override.
//   3. LIVE     synthetic `mcp__ue_editor_*` wire names through the real ToolRender
//               pipeline (toolName → settings.iconPolicy → resolveToolIcon → card).
// ─────────────────────────────────────────────────────────────────────────────

const TOOL_KINDS: readonly ToolKind[] = [
	"read",
	"write",
	"edit",
	"command",
	"grep",
	"skill",
	"mcp",
	"web",
	"todo",
	"task",
	"json",
	"realm",
	"lsp",
	"debug",
	"web_search",
	"github",
	"calc",
	"ask",
	"resolve",
	"irc",
	"checkpoint",
	"recall",
	"retain",
	"rewind",
	"reflect",
	"report_tool_issue",
	"goal",
];

const STATUSES = ["pending", "success", "error", "warn"] as const;

// Synthetic UE wire names that exercise every policy branch (last one → catch-all).
const LIVE_SAMPLES: readonly string[] = [
	"mcp__ue_editor_ue_bp_compile",
	"mcp__ue_editor_ue_da_inspect",
	"mcp__ue_editor_ue_dt_add_row",
	"mcp__ue_editor_ue_uds_create",
	"mcp__ue_editor_ue_py_run",
	"mcp__ue_editor_ue_gt_register",
	"mcp__ue_editor_ue_action_create",
	"mcp__ue_editor_ue_ping",
	"mcp__ue_editor_ue_widget_open",
];

function liveCall(toolName: string, status: ActiveToolCall["status"]): ActiveToolCall {
	return { callId: `${toolName}-${status}`, toolName, status };
}

function KindsBlock() {
	return (
		<div className="grid gap-1.5">
			{TOOL_KINDS.map(kind => (
				<div key={kind} className="flex flex-wrap items-center gap-2">
					<code className="w-32 shrink-0 font-secondary text-fr-2xs text-fr-text-3">{kind}</code>
					{STATUSES.map(status => (
						<ToolCard key={status} kind={kind} status={status} stat={status} label={kind} density="compact" />
					))}
				</div>
			))}
		</div>
	);
}

function PolicyIconsBlock() {
	const rules = DEFAULT_TOOL_ICON_POLICY.rules ?? [];
	return (
		<div className="grid gap-2">
			{rules.map(rule => {
				const firstGlob = Array.isArray(rule.tool) ? rule.tool[0] : rule.tool;
				const core = firstGlob.replace(/^\*+/, "").replace(/\*+$/, "");
				const sample = `mcp__ue_editor_${core || "ue_"}tool`;
				const spec: IconSpec = { icon: rule.icon, color: rule.color };
				return (
					<div
						key={rule.icon}
						className="flex flex-wrap items-center gap-3 rounded-[10px] border border-fr-border-soft bg-fr-surface px-3 py-2"
					>
						<span className={`flex size-7 items-center justify-center ${rule.color ?? "text-fr-text-3"}`}>
							{toolIconNode(spec, 22)}
						</span>
						<code className="w-28 shrink-0 font-secondary text-fr-xs text-fr-text-2">{rule.icon}</code>
						{STATUSES.map(status => (
							<ToolCard
								key={status}
								kind="mcp"
								icon={spec}
								status={status}
								stat={status}
								label={sample}
								density="compact"
							/>
						))}
					</div>
				);
			})}
		</div>
	);
}

function LiveResolutionBlock() {
	return (
		<div className="grid gap-1">
			{LIVE_SAMPLES.map(name => (
				<ToolRender key={name} call={liveCall(name, "success")} density="comfortable" />
			))}
			<Note>state pass-through — same wire name at success · error</Note>
			<ToolRender call={liveCall("mcp__ue_editor_ue_bp_compile", "success")} density="comfortable" />
			<ToolRender call={liveCall("mcp__ue_editor_ue_bp_compile", "error")} density="comfortable" />
		</div>
	);
}

function ToolIconRegistryEntry() {
	return (
		<Demo
			summary="Config-driven tool→icon policy. UE/MCP tools resolve to specific icons — the official Unreal logo, tinted lucide marks for Blueprint / Data Asset / Data Table / Struct·Enum, and mono category marks — layered over each card's kind icon via DEFAULT_TOOL_ICON_POLICY. Non-UE tools match no rule and keep their kind icon."
			importPath="@fraym-ai/ui"
			stage="stretch"
		>
			<Note>kind icons — every ToolKind across pending · success · error · warn</Note>
			<KindsBlock />
			<Note>UE policy icons — Unreal logo + tinted lucide asset & category marks</Note>
			<PolicyIconsBlock />
			<Note>live resolution — synthetic wire names through the real ToolRender pipeline</Note>
			<LiveResolutionBlock />
		</Demo>
	);
}

export const toolIconRegistryEntries: ShowcaseEntry[] = [
	{ id: "tool-icon-registry", name: "Tool Icon Registry", Component: ToolIconRegistryEntry },
];
