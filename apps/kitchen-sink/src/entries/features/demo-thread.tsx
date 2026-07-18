import { createFraymDemoDriver, FRAYM_DEMO_SESSION_REF } from "@fraym/fixtures";
import { ToolDisplaySettingsProvider } from "@fraym/ui";
import { useControls } from "../../showcase/controls";
import { Demo } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import { DemoThread } from "../../showcase/thread-harness";
import type { ShowcaseEntry } from "../../showcase/types";

// End-to-end proof of the canonical render path: a scripted SessionDriver replays
// the Fraym demo, the reducer folds its events into transcript blocks, and
// ConnectedMessageThread renders text + persisted tool/diff cards through the
// registries — the same path a live engine takes. No mock-mode branch.
function DemoThreadEntry() {
	const { values, panel } = useControls({
		height: { kind: "number", label: "height", default: 620, min: 360, max: 900, step: 20 },
		showAvatar: { kind: "boolean", label: "avatar", default: true },
		toolDefaultOpen: {
			kind: "select",
			label: "tool default open",
			options: ["none", "failed", "running", "all"],
			default: "none",
		},
		density: {
			kind: "select",
			label: "density",
			options: ["compact", "comfortable", "spacious"],
			default: "comfortable",
			scope: "display",
		},
		collapseMode: {
			kind: "select",
			label: "collapse mode",
			options: ["worked", "simple"],
			default: "worked",
			scope: "display",
		},
		replayLabel: { kind: "text", label: "replay label", default: "Replay demo" },
	});

	return (
		<Demo
			summary="A scripted SessionDriver (@fraym/fixtures) replayed through the real session-driver pipeline. Finished tool and diff cards persist in the transcript after the run completes — they are part of the conversation record, not the transient live-tool set."
			importPath="@fraym/ui/features/thread"
			controls={panel}
			stage="stretch"
		>
			<ToolDisplaySettingsProvider
				settings={{
					density: values.density as "compact" | "comfortable" | "spacious",
					collapseMode: values.collapseMode as "worked" | "simple",
				}}
			>
				<DemoThread
					createDriver={createFraymDemoDriver}
					sessionRef={FRAYM_DEMO_SESSION_REF}
					height={values.height}
					showAvatar={values.showAvatar}
					toolDefaultOpen={values.toolDefaultOpen as "none" | "failed" | "running" | "all"}
					replayLabel={values.replayLabel}
				/>
			</ToolDisplaySettingsProvider>
		</Demo>
	);
}

const demoThreadDocs: EntryDocs = {
	import: 'import { SessionProvider, Thread } from "@fraym/ui";',
	anatomy: JSON.stringify(
		[
			"// The canonical render path: a scripted SessionDriver replays events,",
			"// the reducer folds them into transcript blocks, and Thread renders",
			"// text + persisted tool/diff cards through the registries.",
			"<SessionProvider driver={driver} sessionRef={sessionRef}>",
			'  <Thread showAvatar contentClassName="px-4 py-4" />',
			"</SessionProvider>",
			"",
			"// Optional: scope renderers + tool-open defaults per thread:",
			"<ToolRendererProvider renderers={customRenderers}>",
			'  <ToolDisplaySettingsProvider settings={{ defaultOpen: "auto" }}>',
			"    <SessionProvider driver={driver} sessionRef={sessionRef}>",
			"      <Thread />",
			"    </SessionProvider>",
			"  </ToolDisplaySettingsProvider>",
			"</ToolRendererProvider>",
		].join("\n"),
	),
	examples: [
		{
			label: "Replay a scripted session",
			code: JSON.stringify(
				'<SessionProvider driver={createDriver()} sessionRef={sessionRef}>\n  <Thread showAvatar contentClassName="px-4 py-4" />\n</SessionProvider>',
			),
		},
		{
			label: "Custom tool renderers per thread",
			code: JSON.stringify(
				"<ToolRendererProvider renderers={{ read: customReadRenderer }}>\n  <SessionProvider driver={driver} sessionRef={ref}>\n    <Thread />\n  </SessionProvider>\n</ToolRendererProvider>",
			),
		},
		{
			label: "Auto-expand tools",
			code: JSON.stringify(
				'<ToolDisplaySettingsProvider settings={{ defaultOpen: "auto" }}>\n  <SessionProvider driver={driver} sessionRef={ref}>\n    <Thread />\n  </SessionProvider>\n</ToolDisplaySettingsProvider>',
			),
		},
	],
	api: [
		{
			name: "SessionProvider.driver",
			type: "SessionDriver",
			required: true,
			description: "A SessionDriver instance (scripted or live) that yields transcript events the reducer consumes.",
		},
		{
			name: "SessionProvider.sessionRef",
			type: "SessionRef",
			required: true,
			description: "Unique session identifier; the reducer maps it to the session state key.",
		},
		{
			name: "Thread.showAvatar",
			type: "boolean",
			default: "true",
			description: "Show the assistant avatar beside messages.",
		},
		{
			name: "Thread.contentClassName",
			type: "string",
			description: "Extra classes for the scrollport content wrapper.",
		},
		{
			name: "ToolRendererProvider.renderers",
			type: "ToolRendererMap",
			description: "Optional per-thread tool-renderer overrides merged over DEFAULT_TOOL_RENDERERS.",
		},
		{
			name: "ToolDisplaySettingsProvider.settings",
			type: "{ defaultOpen?: ToolDefaultOpen }",
			description: 'Tool-card expansion policy per thread: "none" | "auto" | "all".',
		},
	],
};

export const demoThreadEntries: readonly ShowcaseEntry[] = [
	{ id: "driver-demo-thread", name: "Driver Demo Thread", Component: DemoThreadEntry, docs: demoThreadDocs },
];
