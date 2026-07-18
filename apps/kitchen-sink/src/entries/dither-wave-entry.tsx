import { DitherBackground, RippleGridBackground, ThreadsBackground } from "@fraym/ui";
import { useControls } from "../showcase/controls";
import { Demo } from "../showcase/demo";
import type { EntryDocs } from "../showcase/docs";
import type { ShowcaseEntry } from "../showcase/types";
import { FOLLOW_MOUSE_HOST_PROP, SHARED_HOST_PROPS, STAGE } from "./background-shared";

function DitherEntry() {
	const { values, panel } = useControls({
		color: { kind: "color", label: "Color", default: "var(--fr-accent)" },
		waveSpeed: { kind: "number", label: "Wave speed", default: 0.05, min: 0, max: 0.3, step: 0.005 },
		waveFrequency: { kind: "number", label: "Wave frequency", default: 3, min: 1, max: 6, step: 0.25 },
		waveAmplitude: { kind: "number", label: "Wave amplitude", default: 0.3, min: 0, max: 1, step: 0.02 },
		colorNum: { kind: "number", label: "Shades", default: 4, min: 2, max: 10, step: 1 },
		pixelSize: { kind: "number", label: "Pixel size", default: 2, min: 1, max: 8, step: 1 },
		intensity: { kind: "number", label: "Intensity", default: 1, min: 0, max: 2, step: 0.05 },
		followMouse: { kind: "boolean", label: "Interactive", default: false },
		mouseRadius: { kind: "number", label: "Mouse radius", default: 1, min: 0, max: 3, step: 0.05 },
	});
	return (
		<Demo
			summary="A slow, domain-warped Perlin wave field in a retro ordered-dither look: chunky pixelization plus a 4x4 Bayer threshold quantized to a few shades. The quantized shade is coverage of the accent tint over transparency, so the dithered field reads on any theme."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<DitherBackground
					color={values.color}
					waveSpeed={values.waveSpeed}
					waveFrequency={values.waveFrequency}
					waveAmplitude={values.waveAmplitude}
					colorNum={values.colorNum}
					pixelSize={values.pixelSize}
					intensity={values.intensity}
					followMouse={values.followMouse}
					mouseRadius={values.mouseRadius}
				/>
			</div>
		</Demo>
	);
}

function RippleGridEntry() {
	const { values, panel } = useControls({
		gridColor: { kind: "color", label: "Grid color", default: "var(--fr-accent)" },
		rippleIntensity: { kind: "number", label: "Ripple", default: 0.05, min: 0, max: 0.3, step: 0.005 },
		gridSize: { kind: "number", label: "Grid size", default: 10, min: 2, max: 30, step: 1 },
		gridThickness: { kind: "number", label: "Line sharpness", default: 15, min: 1, max: 40, step: 0.5 },
		fadeDistance: { kind: "number", label: "Fade distance", default: 1.5, min: 0, max: 5, step: 0.05 },
		vignetteStrength: { kind: "number", label: "Vignette", default: 2, min: 0, max: 5, step: 0.05 },
		glowIntensity: { kind: "number", label: "Glow", default: 0.1, min: 0, max: 1, step: 0.01 },
		opacity: { kind: "number", label: "Opacity", default: 1, min: 0, max: 1, step: 0.02 },
		gridRotation: { kind: "number", label: "Rotation", default: 0, min: 0, max: 360, step: 1 },
		rainbow: { kind: "boolean", label: "Rainbow", default: false },
		followMouse: { kind: "boolean", label: "Interactive", default: false },
		mouseRadius: { kind: "number", label: "Mouse radius", default: 1, min: 0, max: 3, step: 0.05 },
	});
	return (
		<Demo
			summary="A perspective grid of glowing lines breathing with a radial sine ripple from the center. Line color, ripple, grid size, and opacity are live; the accent-tinted lines fade through a distance falloff and a corner vignette, so it reads on light and dark."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<RippleGridBackground
					gridColor={values.gridColor}
					rippleIntensity={values.rippleIntensity}
					gridSize={values.gridSize}
					gridThickness={values.gridThickness}
					fadeDistance={values.fadeDistance}
					vignetteStrength={values.vignetteStrength}
					glowIntensity={values.glowIntensity}
					opacity={values.opacity}
					gridRotation={values.gridRotation}
					rainbow={values.rainbow}
					followMouse={values.followMouse}
					mouseRadius={values.mouseRadius}
				/>
			</div>
		</Demo>
	);
}

function ThreadsEntry() {
	const { values, panel } = useControls({
		color: { kind: "color", label: "Color", default: "var(--fr-accent)" },
		amplitude: { kind: "number", label: "Amplitude", default: 1, min: 0, max: 3, step: 0.05 },
		distance: { kind: "number", label: "Fan-out", default: 0, min: 0, max: 1, step: 0.02 },
		intensity: { kind: "number", label: "Intensity", default: 1, min: 0, max: 2, step: 0.05 },
		followMouse: { kind: "boolean", label: "Interactive", default: false },
	});
	return (
		<Demo
			summary="A bundle of soft, drifting light filaments fanning across the surface, each warped by its own Perlin slice. Amplitude and fan-out spread are live; the filaments take the accent tint and paint as additive light, so empty space stays clear on any theme."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<ThreadsBackground
					color={values.color}
					amplitude={values.amplitude}
					distance={values.distance}
					intensity={values.intensity}
					followMouse={values.followMouse}
				/>
			</div>
		</Demo>
	);
}

const ditherDocs: EntryDocs = {
	import: 'import { DitherBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <DitherBackground colorNum={4} pixelSize={2} />
</div>`,
	examples: [
		{
			label: "Default (accent, 4 shades)",
			code: `<DitherBackground />`,
		},
		{
			label: "Chunky low-color retro",
			code: `<DitherBackground pixelSize={4} colorNum={3} waveSpeed={0.1} />`,
		},
	],
	api: [
		{ name: "color", type: "string", default: "accent token", description: "Wave tint." },
		{ name: "waveSpeed", type: "number", default: "0.05", description: "Wave scroll speed." },
		{ name: "waveFrequency", type: "number", default: "3", description: "Base wave frequency (fbm lacunarity)." },
		{
			name: "waveAmplitude",
			type: "number",
			default: "0.3",
			description: "Per-octave amplitude falloff of the wave detail.",
		},
		{ name: "colorNum", type: "number", default: "4", description: "Number of quantized shades in the dither." },
		{ name: "pixelSize", type: "number", default: "2", description: "Pixel block size in device pixels." },
		{ name: "intensity", type: "number", default: "1", description: "Overall light intensity." },
		{ name: "mouseRadius", type: "number", default: "1", description: "Pointer dent radius when following." },
		...SHARED_HOST_PROPS,
		FOLLOW_MOUSE_HOST_PROP,
	],
};

const rippleGridDocs: EntryDocs = {
	import: 'import { RippleGridBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <RippleGridBackground gridSize={10} rippleIntensity={0.05} />
</div>`,
	examples: [
		{
			label: "Default (accent grid)",
			code: `<RippleGridBackground />`,
		},
		{
			label: "Fine rainbow grid",
			code: `<RippleGridBackground rainbow gridSize={20} rippleIntensity={0.1} />`,
		},
	],
	api: [
		{
			name: "gridColor",
			type: "string",
			default: "accent token",
			description: "Grid line tint (ignored when rainbow).",
		},
		{
			name: "rainbow",
			type: "boolean",
			default: "false",
			description: "Cycle the grid through a hue sweep instead of gridColor.",
		},
		{ name: "rippleIntensity", type: "number", default: "0.05", description: "Radial ripple displacement strength." },
		{
			name: "gridSize",
			type: "number",
			default: "10",
			description: "Number of grid cells across (higher = finer grid).",
		},
		{
			name: "gridThickness",
			type: "number",
			default: "15",
			description: "Line sharpness (higher = thinner, crisper lines).",
		},
		{
			name: "fadeDistance",
			type: "number",
			default: "1.5",
			description: "Distance falloff exponent from the center.",
		},
		{ name: "vignetteStrength", type: "number", default: "2", description: "Corner vignette strength." },
		{
			name: "glowIntensity",
			type: "number",
			default: "0.1",
			description: "Extra soft glow around the lines (0 off).",
		},
		{ name: "opacity", type: "number", default: "1", description: "Overall opacity multiplier." },
		{ name: "gridRotation", type: "number", default: "0", description: "Grid rotation in degrees." },
		{ name: "mouseRadius", type: "number", default: "1", description: "Pointer influence radius when following." },
		...SHARED_HOST_PROPS,
		FOLLOW_MOUSE_HOST_PROP,
	],
};

const threadsDocs: EntryDocs = {
	import: 'import { ThreadsBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <ThreadsBackground amplitude={1} distance={0} />
</div>`,
	examples: [
		{
			label: "Default (accent filaments)",
			code: `<ThreadsBackground />`,
		},
		{
			label: "Wide, wavy fan",
			code: `<ThreadsBackground amplitude={2} distance={0.6} color="var(--fr-iris)" />`,
		},
	],
	api: [
		{ name: "color", type: "string", default: "accent token", description: "Thread tint." },
		{ name: "amplitude", type: "number", default: "1", description: "Noise-driven waviness of each filament." },
		{
			name: "distance",
			type: "number",
			default: "0",
			description: "Vertical fan-out spread between the filaments (0 tight .. 1 wide).",
		},
		{ name: "intensity", type: "number", default: "1", description: "Overall light intensity." },
		...SHARED_HOST_PROPS,
		FOLLOW_MOUSE_HOST_PROP,
	],
};

export const ditherWaveEntries: readonly ShowcaseEntry[] = [
	{ id: "dither", name: "DitherBackground", Component: DitherEntry, docs: ditherDocs },
	{ id: "ripple-grid", name: "RippleGridBackground", Component: RippleGridEntry, docs: rippleGridDocs },
	{ id: "threads", name: "ThreadsBackground", Component: ThreadsEntry, docs: threadsDocs },
];
