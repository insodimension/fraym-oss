import { LightningBackground, LiquidChromeBackground } from "@fraym/ui";
import { useControls } from "../showcase/controls";
import { Demo } from "../showcase/demo";
import type { EntryDocs } from "../showcase/docs";
import type { ShowcaseEntry } from "../showcase/types";
import { SHARED_HOST_PROPS, STAGE } from "./background-shared";

function LightningEntry() {
	const { values, panel } = useControls({
		color: { kind: "color", label: "Color", default: "var(--fr-accent)" },
		speed: { kind: "number", label: "Speed", default: 1, min: 0, max: 3, step: 0.1 },
		intensity: { kind: "number", label: "Intensity", default: 1, min: 0, max: 2, step: 0.05 },
		size: { kind: "number", label: "Size", default: 1, min: 0.2, max: 4, step: 0.1 },
		xOffset: { kind: "number", label: "Seam offset", default: 0, min: -1, max: 1, step: 0.02 },
	});
	return (
		<Demo
			summary="A forked bolt of light: an fbm-warped seam that flares to a bright core and flickers frame to frame. Rides the shared ShaderBackground host and emits additive light over a transparent canvas, so it reads on bg-fr-bg under any theme and tints from the accent token."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<LightningBackground
					color={values.color}
					speed={values.speed}
					intensity={values.intensity}
					size={values.size}
					xOffset={values.xOffset}
				/>
			</div>
		</Demo>
	);
}

function LiquidChromeEntry() {
	const { values, panel } = useControls({
		color: { kind: "color", label: "Color", default: "var(--fr-accent)" },
		speed: { kind: "number", label: "Speed", default: 0.2, min: 0, max: 2, step: 0.05 },
		amplitude: { kind: "number", label: "Amplitude", default: 0.3, min: 0, max: 1, step: 0.02 },
		frequencyX: { kind: "number", label: "Frequency X", default: 3, min: 1, max: 8, step: 0.5 },
		frequencyY: { kind: "number", label: "Frequency Y", default: 3, min: 1, max: 8, step: 0.5 },
		intensity: { kind: "number", label: "Intensity", default: 1, min: 0, max: 2, step: 0.05 },
		followMouse: { kind: "boolean", label: "Interactive", default: false },
	});
	return (
		<Demo
			summary="A flowing metallic sheen: an iterated cosine-warp field crossed by bright reflective veins. The origin filled an opaque silver field; here the sheen is additive light over a transparent canvas that tints from the accent token, so it reads on bg-fr-bg under any theme. Pointer interaction is off by default."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<LiquidChromeBackground
					color={values.color}
					speed={values.speed}
					amplitude={values.amplitude}
					frequencyX={values.frequencyX}
					frequencyY={values.frequencyY}
					intensity={values.intensity}
					followMouse={values.followMouse}
				/>
			</div>
		</Demo>
	);
}

const lightningDocs: EntryDocs = {
	import: 'import { LightningBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <LightningBackground speed={1} intensity={1} size={1} />
</div>`,
	examples: [
		{
			label: "Default (accent bolt)",
			code: `<LightningBackground />`,
		},
		{
			label: "Fast, frayed iris bolt off-center",
			code: `<LightningBackground
  color="var(--fr-iris)"
  speed={1.8}
  size={2.2}
  xOffset={0.4}
/>`,
		},
	],
	api: [
		{
			name: "color",
			type: "string",
			default: "accent token",
			description: "Bolt color. CSS colors, tokens welcome.",
		},
		{
			name: "xOffset",
			type: "number",
			default: "0",
			description: "Horizontal seam offset in aspect-corrected units (0 centered).",
		},
		{ name: "speed", type: "number", default: "1", description: "Flicker and warp animation speed." },
		{ name: "intensity", type: "number", default: "1", description: "Overall light intensity of the bolt." },
		{
			name: "size",
			type: "number",
			default: "1",
			description: "fbm warp scale: higher frays the bolt into finer filaments.",
		},
		...SHARED_HOST_PROPS,
	],
};

const liquidChromeDocs: EntryDocs = {
	import: 'import { LiquidChromeBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <LiquidChromeBackground speed={0.2} amplitude={0.3} />
</div>`,
	examples: [
		{
			label: "Default (accent-tinted chrome)",
			code: `<LiquidChromeBackground />`,
		},
		{
			label: "Denser veins that follow the pointer",
			code: `<LiquidChromeBackground
  color="var(--fr-iris)"
  amplitude={0.5}
  frequencyX={5}
  frequencyY={5}
  followMouse
/>`,
		},
	],
	api: [
		{
			name: "color",
			type: "string",
			default: "accent token",
			description: "Metal tint. CSS colors, tokens welcome.",
		},
		{ name: "speed", type: "number", default: "0.2", description: "Flow and shimmer speed." },
		{
			name: "amplitude",
			type: "number",
			default: "0.3",
			description: "Warp strength: how far each cosine octave displaces the field.",
		},
		{
			name: "frequencyX",
			type: "number",
			default: "3",
			description: "Horizontal warp frequency (vein density across x).",
		},
		{
			name: "frequencyY",
			type: "number",
			default: "3",
			description: "Vertical warp frequency (vein density across y).",
		},
		{ name: "intensity", type: "number", default: "1", description: "Overall light intensity of the sheen." },
		{
			name: "followMouse",
			type: "boolean",
			default: "false",
			description: "React to the pointer: warp phase follows it and a ripple trails it.",
		},
		...SHARED_HOST_PROPS,
	],
};

export const lightningChromeEntries: readonly ShowcaseEntry[] = [
	{ id: "lightning", name: "LightningBackground", Component: LightningEntry, docs: lightningDocs },
	{ id: "liquid-chrome", name: "LiquidChromeBackground", Component: LiquidChromeEntry, docs: liquidChromeDocs },
];
