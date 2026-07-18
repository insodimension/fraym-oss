import { createToolGroupDemoDriver, TOOL_GROUP_CALLS, TOOL_GROUP_DEMO_SESSION_REF } from "@fraym/fixtures";
import { type ActiveToolCall, ToolDisplaySettingsProvider, ToolGroupCard, ToolRender } from "@fraym/ui";
import type { ControlsSchema } from "../../showcase/controls";
import { Demo, Note } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import { useToolConfig } from "../../showcase/tool-config";
import { toolPreviewControl } from "../../showcase/tool-preview";
import type { ShowcaseEntry } from "../../showcase/types";

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic tool grouping — a run of consecutive tool calls coalesces into ONE
// nested `ToolGroupCard` instead of a wall of cards. Collapsed, the group mirrors
// the LATEST call's head (its icon / label / stat) + a `N tools` count and a `✕ K`
// aggregate mark when something inside failed; opening the group stacks every call
// as its own card, each independently openable. Children render through the same
// production `ToolRender` path, so a grouped child is identical to a standalone one.
//
// The standalone preview shows BOTH surfaces side by side (grouped vs. today's
// wall); the Demo Dock replays the same probe burst in a live thread with grouping
// enabled (`threadSettings.groupConsecutiveTools`), exactly the production path.
//
// Axes (control knobs):
//   COUNT     how many consecutive calls in the run (3 · 6 · 9 · 12)
//   FAILURE   include the failed `bp_inspect` call (surfaces the `✕` aggregate)
//   VIEW      collapsed · comfortable · compact · spacious (group + child disclosure)
// ─────────────────────────────────────────────────────────────────────────────

type View = "collapsed" | "comfortable" | "compact" | "spacious";
type Density = Exclude<View, "collapsed">;

const COUNTS = ["3", "6", "9", "12"] as const;

const TOOL_GROUP_CONFIG: ControlsSchema = {
	count: { kind: "select", label: "count", options: COUNTS, default: "12" },
	failure: { kind: "boolean", label: "include failure", default: true },
	// `scope: "display"` → shared with the Demo Dock (collapse + density).
	view: toolPreviewControl("collapsed"),
};

function configValue<T extends string>(values: Record<string, unknown>, key: string, fallback: T): T {
	const value = values[key];
	return typeof value === "string" ? (value as T) : fallback;
}

/** Slice the probe burst to `count`; when failure is off, heal the failed call to success. */
function buildToolGroupCalls(count: number, failure: boolean): ActiveToolCall[] {
	const sliced = TOOL_GROUP_CALLS.slice(0, count);
	const specs = failure
		? sliced
		: sliced.map(call =>
				call.status === "error"
					? { ...call, status: "success" as const, output: { content: [{ type: "text", text: "ok" }] } }
					: call,
			);
	return specs.map(spec => spec as unknown as ActiveToolCall);
}

function ToolGroupEntry() {
	const { values, panel } = useToolConfig();
	const view = configValue<View>(values, "view", "collapsed");
	const count = Number.parseInt(configValue(values, "count", "12"), 10);
	const failure = values.failure !== false;
	const open = view !== "collapsed";
	const density: Density = view === "collapsed" ? "comfortable" : view;
	const calls = buildToolGroupCalls(count, failure);

	return (
		<Demo
			summary="A run of consecutive tool calls coalesces into ONE ToolGroupCard. Collapsed, it mirrors the latest call's head + a `N tools` count (and `✕ K` when something failed inside); open it to stack every call as its own independently-openable card — children use the same production renderer. The same component the thread will use; the Demo Dock replays the burst live with grouping enabled."
			importPath="@fraym/ui (ToolGroupCard)"
			controls={panel}
			stage="stretch"
		>
			{/* Keying the provider by view remounts the subtree so the group/children
			    re-apply defaultOpen (ToolCard's defaultOpen is initial-state-only). The
			    group opens at the chosen density while children stay closed — you open
			    each in turn. */}
			<ToolDisplaySettingsProvider key={view} settings={{ defaultOpen: "none", density }}>
				<div className="flex w-full max-w-2xl flex-col gap-7">
					<div className="flex flex-col gap-2">
						<Note>with grouping · {calls.length} calls → 1 card</Note>
						<ToolGroupCard calls={calls} defaultOpen={open} />
					</div>
					<div className="flex flex-col gap-2">
						<Note>without grouping · {calls.length} cards (today)</Note>
						<div className="flex flex-col gap-[3px]">
							{calls.map(call => (
								<ToolRender key={call.callId} call={call} />
							))}
						</div>
					</div>
				</div>
			</ToolDisplaySettingsProvider>
		</Demo>
	);
}

const toolGroupDocs: EntryDocs = {
	import: 'import { ToolGroupCard, coalesceToolGroups } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// In the thread, MessageBody coalesces consecutive tool blocks when the",
			"// `groupConsecutiveTools` display setting is on (default off):",
			"coalesceToolGroups(blocks, renderBlock, { threshold: 2 })",
			"//   run of >= threshold consecutive tool calls  -> one <ToolGroupCard>",
			"//   shorter runs / non-tool blocks              -> coalesceReadGroups (unchanged)",
			"",
			"// Standalone, hand it the ordered run:",
			"<ToolGroupCard calls={calls} defaultOpen={false} />",
			"//   collapsed -> latest call's head + `N tools` + `✕ K` aggregate mark",
			"//   open      -> a stack of <ToolRender> children, each independently openable",
		].join("\n"),
	),
	examples: [
		{ label: "Collapse a 12-call probe burst", code: JSON.stringify("<ToolGroupCard calls={burst} />") },
		{
			label: "Enable grouping in a thread",
			code: JSON.stringify("<ToolDisplaySettingsProvider settings={{ groupConsecutiveTools: true }}>"),
		},
	],
	api: [
		{
			name: "calls",
			type: "readonly ActiveToolCall[]",
			required: true,
			description: "The consecutive run. The LAST call is shown collapsed; failures anywhere surface as `✕ K`.",
		},
		{
			name: "renderChild",
			type: "(call, index) => ReactNode",
			description: "How each child renders when open. Defaults to the production `<ToolRender>`.",
		},
		{
			name: "defaultOpen",
			type: "boolean",
			description: "Explicit group-stack disclosure; otherwise resolved from `ToolDisplaySettings.defaultOpen`.",
		},
		{
			name: "groupConsecutiveTools / groupThreshold",
			type: "ToolDisplaySettings",
			description:
				"Thread-level switch (default off) + minimum run length (default 2) that drives MessageBody grouping.",
		},
	],
};

export const toolGroupEntries: readonly ShowcaseEntry[] = [
	{
		id: "tool-group",
		name: "Tool Group",
		Component: ToolGroupEntry,
		config: TOOL_GROUP_CONFIG,
		docs: toolGroupDocs,
		demo: {
			createDriver: createToolGroupDemoDriver,
			sessionRef: TOOL_GROUP_DEMO_SESSION_REF,
			title: "tool grouping · live conversation",
			threadSettings: { groupConsecutiveTools: true, groupThreshold: 2 },
		},
	},
];
