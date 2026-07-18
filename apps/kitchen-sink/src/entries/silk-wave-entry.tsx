import { IridescenceBackground, PlasmaBackground, SilkBackground } from "@fraym/ui";
import { useControls } from "../showcase/controls";
import { Demo } from "../showcase/demo";
import type { EntryDocs } from "../showcase/docs";
import type { ShowcaseEntry } from "../showcase/types";
import { SHARED_HOST_PROPS, STAGE } from "./background-shared";

const PLASMA_DIRECTIONS: readonly string[] = ["forward", "reverse", "pingpong"];

function SilkEntry() {
	const { values, panel } = useControls({
		color: { kind: "color", label: "Color", default: "var(--fr-accent)" },
		speed: { kind: "number", label: "Speed", default: 5, min: 0, max: 12, step: 0.25 },
		scale: { kind: "number", label: "Scale", default: 1, min: 0.2, max: 4, step: 0.05 },
		rotation: { kind: "number", label: "Rotation", default: 0, min: 0, max: 6.28, step: 0.02 },
		noiseIntensity: { kind: "number", label: "Noise", default: 1.5, min: 0, max: 5, step: 0.1 },
		intensity: { kind: "number", label: "Intensity", default: 1, min: 0, max: 2, step: 0.05 },
	});
	return (
		<Demo
			summary="A slow woven sheen of light rippling across the surface, like brushed silk catching the light. The weave value drives the tint's coverage over a transparent canvas, so it layers on bg-fr-bg under any theme."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<SilkBackground
					color={values.color}
					speed={values.speed}
					scale={values.scale}
					rotation={values.rotation}
					noiseIntensity={values.noiseIntensity}
					intensity={values.intensity}
				/>
			</div>
		</Demo>
	);
}

function IridescenceEntry() {
	const { values, panel } = useControls({
		color: { kind: "color", label: "Color", default: "var(--fr-accent)" },
		speed: { kind: "number", label: "Speed", default: 1, min: 0, max: 4, step: 0.05 },
		amplitude: { kind: "number", label: "Amplitude", default: 0.1, min: 0, max: 0.5, step: 0.01 },
		intensity: { kind: "number", label: "Intensity", default: 1, min: 0, max: 2, step: 0.05 },
		mouseReact: { kind: "boolean", label: "Mouse react", default: false },
	});
	return (
		<Demo
			summary="An oily shimmer of interfering waves, like light on a soap film. Bright interference bands paint additive light and dark bands stay transparent, so it reads on light and dark. Turn on mouse react for a subtle parallax."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<IridescenceBackground
					color={values.color}
					speed={values.speed}
					amplitude={values.amplitude}
					intensity={values.intensity}
					mouseReact={values.mouseReact}
				/>
			</div>
		</Demo>
	);
}

function PlasmaEntry() {
	const { values, panel } = useControls({
		color: { kind: "color", label: "Color", default: "var(--fr-accent)" },
		speed: { kind: "number", label: "Speed", default: 1, min: 0, max: 4, step: 0.05 },
		scale: { kind: "number", label: "Scale", default: 1, min: 0.5, max: 3, step: 0.05 },
		opacity: { kind: "number", label: "Opacity", default: 1, min: 0, max: 1, step: 0.02 },
		mouseInteractive: { kind: "boolean", label: "Interactive", default: false },
		direction: { kind: "select", label: "Direction", options: PLASMA_DIRECTIONS, default: "forward" },
	});
	return (
		<Demo
			summary="A churning volumetric plasma cloud, a 60-step raymarch on a fullscreen triangle. Its own luminance drives the alpha, so the cloud layers over bg-fr-bg on any theme; it downsamples by default because the march is heavy."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<PlasmaBackground
					color={values.color}
					speed={values.speed}
					scale={values.scale}
					opacity={values.opacity}
					mouseInteractive={values.mouseInteractive}
					direction={values.direction as "forward" | "reverse" | "pingpong"}
				/>
			</div>
		</Demo>
	);
}

const silkDocs: EntryDocs = {
	import: 'import { SilkBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <SilkBackground speed={5} scale={1} />
</div>`,
	examples: [
		{
			label: "Default (accent sheen)",
			code: `<div className="relative overflow-hidden">
  <SilkBackground />
</div>`,
		},
		{
			label: "Slow, tighter weave",
			code: `<SilkBackground color="var(--fr-iris)" speed={2} scale={2} noiseIntensity={0.5} />`,
		},
	],
	api: [
		{ name: "color", type: "string", default: "accent token", description: "Silk tint. CSS color, tokens welcome." },
		{ name: "speed", type: "number", default: "5", description: "Weave animation speed." },
		{
			name: "scale",
			type: "number",
			default: "1",
			description: "Weave tiling scale (applied twice, as in the origin).",
		},
		{ name: "rotation", type: "number", default: "0", description: "Static rotation of the weave in radians." },
		{
			name: "noiseIntensity",
			type: "number",
			default: "1.5",
			description: "Per-pixel grain subtracted from the weave (0 clean .. up).",
		},
		{ name: "intensity", type: "number", default: "1", description: "Overall light coverage." },
		...SHARED_HOST_PROPS,
	],
};

const iridescenceDocs: EntryDocs = {
	import: 'import { IridescenceBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <IridescenceBackground speed={1} amplitude={0.1} />
</div>`,
	examples: [
		{
			label: "Default (accent shimmer)",
			code: `<IridescenceBackground />`,
		},
		{
			label: "Full-spectrum, pointer-reactive",
			code: `<IridescenceBackground color="#ffffff" mouseReact amplitude={0.2} />`,
		},
	],
	api: [
		{
			name: "color",
			type: "string",
			default: "accent token",
			description: 'Shimmer tint. Pass "#ffffff" to restore the full-spectrum look.',
		},
		{ name: "speed", type: "number", default: "1", description: "Wave animation speed." },
		{ name: "amplitude", type: "number", default: "0.1", description: "Pointer parallax strength when following." },
		{
			name: "mouseReact",
			type: "boolean",
			default: "false",
			description: "React to the pointer. Off by default (backdrops).",
		},
		{ name: "intensity", type: "number", default: "1", description: "Overall light intensity." },
		...SHARED_HOST_PROPS,
	],
};

const plasmaDocs: EntryDocs = {
	import: 'import { PlasmaBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <PlasmaBackground speed={1} direction="forward" />
</div>`,
	examples: [
		{
			label: "Default (accent plasma)",
			code: `<PlasmaBackground />`,
		},
		{
			label: "Raw multi-hue, back-and-forth",
			code: `<PlasmaBackground color="" direction="pingpong" scale={1.4} />`,
		},
	],
	api: [
		{
			name: "color",
			type: "string",
			default: "accent token",
			description: 'Plasma tint. Pass "" to keep the raw multi-hue plasma.',
		},
		{ name: "speed", type: "number", default: "1", description: "Flow speed." },
		{
			name: "direction",
			type: '"forward" | "reverse" | "pingpong"',
			default: '"forward"',
			description: "Flow direction: forward, reverse, or a smooth back-and-forth.",
		},
		{ name: "scale", type: "number", default: "1", description: "Zoom of the plasma field (larger = closer)." },
		{ name: "opacity", type: "number", default: "1", description: "Overall opacity / light coverage." },
		{
			name: "mouseInteractive",
			type: "boolean",
			default: "false",
			description: "React to the pointer with a subtle parallax warp. Off by default (backdrops).",
		},
		{
			name: "renderScale",
			type: "number",
			default: "0.7",
			description:
				"Backing-store downsample; the 60-step raymarch is heavy and the field is soft, so upscaling is invisible.",
		},
		{
			name: "className",
			type: "string",
			description: "Passed to the absolutely-positioned canvas. Mount inside a `relative overflow-hidden` ancestor.",
		},
		{ name: "fps", type: "number", default: "30", description: "Frame cap on the shared ShaderBackground host." },
	],
};

export const silkWaveEntries: readonly ShowcaseEntry[] = [
	{ id: "silk", name: "SilkBackground", Component: SilkEntry, docs: silkDocs },
	{ id: "iridescence", name: "IridescenceBackground", Component: IridescenceEntry, docs: iridescenceDocs },
	{ id: "plasma", name: "PlasmaBackground", Component: PlasmaEntry, docs: plasmaDocs },
];
