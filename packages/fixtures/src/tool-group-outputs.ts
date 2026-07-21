// Tool-group fixture data — a run of consecutive tool calls mirroring the real
// "wall of ACP cards" problem (a Forge-editor / Arc probe burst). Pure data: the
// kitchen-sink entry casts these specs to `ActiveToolCall` and feeds them to
// `ToolGroupCard` (standalone preview) + the demo driver (live thread). One call
// fails mid-run so the collapsed group can surface a hidden `✕` while the head
// still mirrors the latest tool.

import { toolResult } from "./tool-call-utils";

/** Structurally compatible with `@fraym-ai/ui`'s `ActiveToolCall` (cast at the use site). */
export interface ToolGroupCallSpec {
	readonly callId: string;
	readonly toolName: string;
	readonly displayName?: string;
	readonly input?: unknown;
	readonly status: "running" | "success" | "error";
	readonly output?: unknown;
}

const ASSET_LIST = [
	"Plugins/ArcadeCombatKit/Content/Characters",
	"  BP_ArcCharacter.uasset",
	"  BP_ArcAICharacter.uasset",
	"  DA_ArcCharacter_Base.uasset",
	"3 assets · 1 folder",
].join("\n");

const BP_INSPECT = [
	"BP_ArcCharacter  (parent: ArcCharacter)",
	"Components: ArcEquipmentComponent, ArcDamageHandlerComponent, ArcAbilitySystemComponent",
	"Variables: CombatTeam (enum), bIsAlive (bool), CharacterData (DA ref)",
].join("\n");

const DA_INSPECT = [
	"DA_ArcCharacter_Base  (UArcCharacterDataAsset)",
	"  Health: 100  ·  Stamina: 80  ·  MovesetActions: AB_LightAttack, AB_HeavyAttack",
].join("\n");

const DA_LIST_TYPES = [
	"ArcCharacterDataAsset",
	"ArcAbilitySet",
	"ArcActionsSet",
	"ArcDamageType",
	"4 DataAsset types registered",
].join("\n");

const PY_RUN = "forge.EditorLevelLibrary.get_all_level_actors() -> 12 actors\nArc subsystem: ready";

const GT_SEARCH = [
	"Arc.Damage.Physical.Slash",
	"Arc.Damage.Physical.Blunt",
	"Arc.Action.Melee.LightAttack",
	"3 gameplay tags matched 'Arc.'",
].join("\n");

const SEARCH_EMPTY = "0 matches · 0 files in Plugins/ArcadeCombatKit";

const BP_INSPECT_FAIL = "Blueprint not found: /Game/Blueprints/BP_ArcCharacterBase (did you mean BP_ArcCharacter?)";

/**
 * The full 12-call probe burst, in call order. The LAST call is a success
 * (`forge_gt_search`) so the collapsed group head mirrors a healthy latest tool while
 * the `bp_inspect` failure at index 5 still surfaces as a `✕ 1` aggregate mark.
 */
export const TOOL_GROUP_CALLS: readonly ToolGroupCallSpec[] = [
	{
		callId: "tg-1",
		toolName: "mcp__forge_editor_asset_list",
		input: { path: "/Game/Plugins/ArcadeCombatKit/Characters" },
		status: "success",
		output: toolResult(ASSET_LIST, { displayContent: { text: ASSET_LIST } }),
	},
	{
		callId: "tg-2",
		toolName: "mcp__forge_editor_asset_list",
		input: { path: "/Game/Blueprints", recursive: true },
		status: "success",
		output: toolResult(ASSET_LIST, { displayContent: { text: ASSET_LIST } }),
	},
	{
		callId: "tg-3",
		toolName: "mcp__forge_editor_asset_list",
		input: { path: "/Game/DataAssets" },
		status: "success",
		output: toolResult(ASSET_LIST, { displayContent: { text: ASSET_LIST } }),
	},
	{
		callId: "tg-4",
		toolName: "mcp__forge_editor_bp_inspect",
		input: { blueprint: "/Game/.../BP_ArcCharacter" },
		status: "success",
		output: toolResult(BP_INSPECT, { displayContent: { text: BP_INSPECT } }),
	},
	{
		callId: "tg-5",
		toolName: "mcp__forge_editor_bp_inspect",
		input: { blueprint: "/Game/Blueprints/BP_ArcCharacterBase" },
		status: "error",
		output: toolResult(BP_INSPECT_FAIL, {}, true),
	},
	{
		callId: "tg-6",
		toolName: "mcp__forge_editor_da_inspect",
		input: { asset: "/Game/.../DA_ArcCharacter_Base" },
		status: "success",
		output: toolResult(DA_INSPECT, { displayContent: { text: DA_INSPECT } }),
	},
	{
		callId: "tg-7",
		toolName: "mcp__forge_editor_da_list_types",
		input: {},
		status: "success",
		output: toolResult(DA_LIST_TYPES, { displayContent: { text: DA_LIST_TYPES } }),
	},
	{
		callId: "tg-8",
		toolName: "mcp__forge_editor_py_run",
		input: { code: "forge.EditorLevelLibrary.get_all_level_actors()" },
		status: "success",
		output: toolResult(PY_RUN, { displayContent: { text: PY_RUN } }),
	},
	{
		callId: "tg-9",
		toolName: "search",
		input: { pattern: "class ArcCharacter", paths: ["Plugins/ArcadeCombatKit"] },
		status: "success",
		output: toolResult(SEARCH_EMPTY, { matchCount: 0, fileCount: 0 }),
	},
	{
		callId: "tg-10",
		toolName: "search",
		input: { pattern: "ArcAICharacter", paths: ["Plugins/ArcadeCombatKit"] },
		status: "success",
		output: toolResult(SEARCH_EMPTY, { matchCount: 0, fileCount: 0 }),
	},
	{
		callId: "tg-11",
		toolName: "mcp__forge_editor_gt_search",
		input: { query: "Arc." },
		status: "success",
		output: toolResult(GT_SEARCH, { displayContent: { text: GT_SEARCH } }),
	},
	{
		callId: "tg-12",
		toolName: "mcp__forge_editor_gt_search",
		input: { query: "Arc.Damage" },
		status: "success",
		output: toolResult(GT_SEARCH, { displayContent: { text: GT_SEARCH } }),
	},
];
