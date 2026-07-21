import {
	Nebula,
	Smiley,
	WispPreview,
	type AvatarMode,
	type AvatarState,
} from "@fraym-ai/vibr";
import { useControls } from "../../showcase/controls";
import { Cell, Demo } from "../../showcase/demo";
import type { EntryDocs } from "../../showcase/docs";
import type { ShowcaseEntry } from "../../showcase/types";

const STATES: readonly AvatarState[] = ["idle", "thinking", "typing"];
const MODES: readonly AvatarMode[] = ["", "think", "search", "read", "run", "edit", "skill", "mcp"];

function VibrEntry() {
	const { values, panel } = useControls({
		state: {
			kind: "select",
			label: "state",
			options: STATES,
			default: "idle",
		},
		mode: {
			kind: "select",
			label: "mode",
			options: MODES,
			default: "",
		},
		energy: {
			kind: "number",
			label: "energy",
			default: 0.5,
			min: 0,
			max: 1,
			step: 0.05,
		},
	});
	const state = values.state as AvatarState;
	const mode = values.mode as AvatarMode;

	return (
		<Demo
			summary="Animated presence surfaces driven by the shared session state, activity mode, and energy signals."
			importPath="@fraym-ai/vibr"
			controls={panel}
		>
			<div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
				<Cell label="Nebula presence">
					<div className="flex h-24 items-center justify-center">
						<Nebula
							className="[--disp:64px]"
							energy={values.energy}
							mode={mode}
							state={state}
						/>
					</div>
				</Cell>
				<Cell label="Smiley presence">
					<div className="flex h-24 items-center justify-center">
						<Smiley
							className="scale-[2.5]"
							energy={values.energy}
							mode={mode}
							state={state}
						/>
					</div>
				</Cell>
				<Cell label="Smiley wisp">
					<WispPreview
						energy={values.energy}
						height={96}
						mode={mode}
						preset="smiley"
						state={state}
						width={160}
					/>
				</Cell>
			</div>
		</Demo>
	);
}

const vibrDocs: EntryDocs = {
	import: 'import { Nebula, Smiley, WispPreview } from "@fraym-ai/vibr";',
	anatomy: JSON.stringify(
		[
			'<Nebula state="thinking" mode="search" energy={0.5} />',
			'<Smiley state="thinking" mode="run" energy={0.8} />',
			'<WispPreview preset="smiley" state="typing" energy={0.5} />',
		].join("\n"),
	),
	examples: [
		{
			label: "Nebula presence",
			code: JSON.stringify('<Nebula state="thinking" mode="search" energy={0.5} />'),
		},
		{
			label: "Smiley presence",
			code: JSON.stringify('<Smiley state="thinking" mode="run" energy={0.8} />'),
		},
		{
			label: "Smiley stream wisp",
			code: JSON.stringify('<WispPreview preset="smiley" state="typing" energy={0.5} />'),
		},
	],
	api: [
		{
			name: "state",
			type: '"idle" | "thinking" | "typing"',
			default: '"idle"',
			description: "Current session activity state.",
		},
		{
			name: "mode",
			type: '"" | "think" | "search" | "read" | "run" | "edit" | "skill" | "mcp"',
			default: '""',
			description: "Current activity intent used to select the expression and palette.",
		},
		{
			name: "energy",
			type: "number",
			default: "0",
			description: "Normalized activity intensity from 0 to 1.",
		},
	],
};

export const vibrEntries: readonly ShowcaseEntry[] = [
	{ id: "vibr-presence", name: "Vibr Presence", Component: VibrEntry, docs: vibrDocs },
];
