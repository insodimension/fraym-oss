import {
	AuroraBackground,
	FloatingLinesBackground,
	GalaxyBackground,
	LightPillarBackground,
	type LightPillarQuality,
	LightRaysBackground,
	type LightRaysOrigin,
	PrismBackground,
	SideRaysBackground,
	type SideRaysOrigin,
	SoftAuroraBackground,
} from "@fraym/ui";
import { useControls } from "../showcase/controls";
import { Demo } from "../showcase/demo";
import type { EntryDocs } from "../showcase/docs";
import type { ShowcaseEntry } from "../showcase/types";
import { SHARED_HOST_PROPS, STAGE } from "./background-shared";

const LIGHT_RAYS_ORIGINS: readonly LightRaysOrigin[] = [
	"top-center",
	"top-left",
	"top-right",
	"left",
	"right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
];

const SIDE_RAYS_ORIGINS: readonly SideRaysOrigin[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

const PILLAR_QUALITIES: readonly LightPillarQuality[] = ["low", "medium", "high"];

const PRISM_ANIMATIONS: readonly ("rotate" | "3drotate")[] = ["rotate", "3drotate"];

function AuroraEntry() {
	const { values, panel } = useControls({
		colorStop0: { kind: "color", label: "Color stop 1", default: "var(--fr-accent)" },
		colorStop1: { kind: "color", label: "Color stop 2", default: "var(--fr-iris)" },
		colorStop2: { kind: "color", label: "Color stop 3", default: "var(--fr-accent)" },
		amplitude: { kind: "number", label: "Amplitude", default: 1, min: 0, max: 2, step: 0.05 },
		blend: { kind: "number", label: "Blend", default: 0.5, min: 0, max: 1, step: 0.02 },
		speed: { kind: "number", label: "Speed", default: 1, min: 0, max: 3, step: 0.1 },
		intensity: { kind: "number", label: "Intensity", default: 1, min: 0, max: 2, step: 0.05 },
	});
	return (
		<Demo
			summary="The classic aurora curtain: a simplex-noise ridge of light sweeping a three-stop color ramp. Rides the shared ShaderBackground host and paints additive light over a transparent canvas, so it reads on bg-fr-bg under any theme."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<AuroraBackground
					colorStops={[values.colorStop0, values.colorStop1, values.colorStop2]}
					amplitude={values.amplitude}
					blend={values.blend}
					speed={values.speed}
					intensity={values.intensity}
				/>
			</div>
		</Demo>
	);
}

function SoftAuroraEntry() {
	const { values, panel } = useControls({
		color1: { kind: "color", label: "Color 1", default: "var(--fr-text)" },
		color2: { kind: "color", label: "Color 2", default: "var(--fr-accent)" },
		speed: { kind: "number", label: "Speed", default: 0.6, min: 0, max: 2, step: 0.05 },
		scale: { kind: "number", label: "Scale", default: 1.5, min: 0.5, max: 4, step: 0.1 },
		brightness: { kind: "number", label: "Brightness", default: 1, min: 0, max: 2, step: 0.05 },
		noiseFrequency: { kind: "number", label: "Noise frequency", default: 2.5, min: 0.5, max: 6, step: 0.1 },
		noiseAmplitude: { kind: "number", label: "Noise amplitude", default: 1, min: 0, max: 3, step: 0.05 },
		bandHeight: { kind: "number", label: "Band height", default: 0.5, min: 0, max: 1, step: 0.02 },
		bandSpread: { kind: "number", label: "Band spread", default: 1, min: 0.2, max: 3, step: 0.05 },
		octaveDecay: { kind: "number", label: "Octave decay", default: 0.1, min: 0, max: 1, step: 0.02 },
		layerOffset: { kind: "number", label: "Layer offset", default: 0, min: 0, max: 5, step: 0.1 },
		colorSpeed: { kind: "number", label: "Shimmer speed", default: 1, min: 0, max: 3, step: 0.05 },
		followMouse: { kind: "boolean", label: "Interactive", default: false },
		mouseInfluence: { kind: "number", label: "Pointer influence", default: 0.25, min: 0, max: 1, step: 0.02 },
	});
	return (
		<Demo
			summary="Two drifting perlin light bands with cosine-gradient shimmer, gentler than the aurora curtain. Both colors default to Fraym tokens, and additive light over transparency reads on light and dark surfaces alike."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<SoftAuroraBackground
					color1={values.color1}
					color2={values.color2}
					speed={values.speed}
					scale={values.scale}
					brightness={values.brightness}
					noiseFrequency={values.noiseFrequency}
					noiseAmplitude={values.noiseAmplitude}
					bandHeight={values.bandHeight}
					bandSpread={values.bandSpread}
					octaveDecay={values.octaveDecay}
					layerOffset={values.layerOffset}
					colorSpeed={values.colorSpeed}
					followMouse={values.followMouse}
					mouseInfluence={values.mouseInfluence}
				/>
			</div>
		</Demo>
	);
}

function LightRaysEntry() {
	const { values, panel } = useControls({
		raysColor: { kind: "color", label: "Ray color", default: "var(--fr-accent)" },
		raysSpeed: { kind: "number", label: "Speed", default: 1, min: 0, max: 3, step: 0.1 },
		lightSpread: { kind: "number", label: "Spread", default: 1, min: 0.1, max: 3, step: 0.05 },
		rayLength: { kind: "number", label: "Length", default: 2, min: 0.5, max: 4, step: 0.1 },
		fadeDistance: { kind: "number", label: "Fade distance", default: 1, min: 0, max: 3, step: 0.05 },
		saturation: { kind: "number", label: "Saturation", default: 1, min: 0, max: 1, step: 0.02 },
		noiseAmount: { kind: "number", label: "Grain", default: 0, min: 0, max: 1, step: 0.02 },
		distortion: { kind: "number", label: "Distortion", default: 0, min: 0, max: 1, step: 0.02 },
		intensity: { kind: "number", label: "Intensity", default: 1, min: 0, max: 2, step: 0.05 },
		pulsating: { kind: "boolean", label: "Pulsating", default: false },
		followMouse: { kind: "boolean", label: "Interactive", default: false },
		mouseInfluence: { kind: "number", label: "Pointer influence", default: 0.1, min: 0, max: 1, step: 0.02 },
		raysOrigin: { kind: "select", label: "Origin", options: LIGHT_RAYS_ORIGINS, default: "top-center" },
	});
	return (
		<Demo
			summary="Volumetric god rays fanning from an edge anchor. The origin, cone width, reach, and speed are live; a slow breathing signal is optional. The anchor lives in the shader, so resizes never desync the origin."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<LightRaysBackground
					raysColor={values.raysColor}
					raysSpeed={values.raysSpeed}
					lightSpread={values.lightSpread}
					rayLength={values.rayLength}
					fadeDistance={values.fadeDistance}
					saturation={values.saturation}
					noiseAmount={values.noiseAmount}
					distortion={values.distortion}
					intensity={values.intensity}
					pulsating={values.pulsating}
					followMouse={values.followMouse}
					mouseInfluence={values.mouseInfluence}
					raysOrigin={values.raysOrigin as LightRaysOrigin}
				/>
			</div>
		</Demo>
	);
}

function SideRaysEntry() {
	const { values, panel } = useControls({
		rayColor1: { kind: "color", label: "Ray color 1", default: "var(--fr-accent)" },
		rayColor2: { kind: "color", label: "Ray color 2", default: "var(--fr-iris)" },
		speed: { kind: "number", label: "Speed", default: 2.5, min: 0, max: 6, step: 0.1 },
		intensity: { kind: "number", label: "Intensity", default: 2, min: 0, max: 4, step: 0.05 },
		spread: { kind: "number", label: "Spread", default: 2, min: 0.5, max: 5, step: 0.1 },
		tilt: { kind: "number", label: "Tilt", default: 0, min: 0, max: 360, step: 1 },
		saturation: { kind: "number", label: "Saturation", default: 1.5, min: 0, max: 3, step: 0.05 },
		blend: { kind: "number", label: "Color blend", default: 0.75, min: 0, max: 1, step: 0.02 },
		falloff: { kind: "number", label: "Falloff", default: 1.6, min: 0, max: 4, step: 0.05 },
		opacity: { kind: "number", label: "Opacity", default: 1, min: 0, max: 1, step: 0.02 },
		origin: { kind: "select", label: "Origin", options: SIDE_RAYS_ORIGINS, default: "top-right" },
	});
	return (
		<Demo
			summary="Twin-hued volumetric rays fanning in from a screen corner. Two token colors blend across the fan; pick the emitting corner and widen the spread. The corner choice is mirrored in the shader, so nothing desyncs on resize."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<SideRaysBackground
					rayColor1={values.rayColor1}
					rayColor2={values.rayColor2}
					speed={values.speed}
					intensity={values.intensity}
					spread={values.spread}
					tilt={values.tilt}
					saturation={values.saturation}
					blend={values.blend}
					falloff={values.falloff}
					opacity={values.opacity}
					origin={values.origin as SideRaysOrigin}
				/>
			</div>
		</Demo>
	);
}

function LightPillarEntry() {
	const { values, panel } = useControls({
		topColor: { kind: "color", label: "Top color", default: "var(--fr-iris)" },
		bottomColor: { kind: "color", label: "Bottom color", default: "var(--fr-accent)" },
		intensity: { kind: "number", label: "Intensity", default: 1, min: 0, max: 2, step: 0.05 },
		rotationSpeed: { kind: "number", label: "Rotation speed", default: 0.3, min: 0, max: 2, step: 0.05 },
		glowAmount: { kind: "number", label: "Glow", default: 0.005, min: 0, max: 0.05, step: 0.001 },
		pillarWidth: { kind: "number", label: "Pillar width", default: 3, min: 0.5, max: 6, step: 0.1 },
		pillarHeight: { kind: "number", label: "Pillar height", default: 0.4, min: 0, max: 1, step: 0.02 },
		noiseIntensity: { kind: "number", label: "Noise", default: 0.5, min: 0, max: 1, step: 0.02 },
		pillarRotation: { kind: "number", label: "Pillar rotation", default: 0, min: 0, max: 360, step: 1 },
		followMouse: { kind: "boolean", label: "Interactive", default: false },
		quality: { kind: "select", label: "Quality", options: PILLAR_QUALITIES, default: "high" },
	});
	return (
		<Demo
			summary="A raymarched volumetric light column, slowly churning. Quality bakes the raymarch iteration counts as GLSL constants, so changing it recompiles the shader on the host; the top and base colors default to iris and accent tokens and accept any CSS color."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<LightPillarBackground
					topColor={values.topColor}
					bottomColor={values.bottomColor}
					intensity={values.intensity}
					rotationSpeed={values.rotationSpeed}
					glowAmount={values.glowAmount}
					pillarWidth={values.pillarWidth}
					pillarHeight={values.pillarHeight}
					noiseIntensity={values.noiseIntensity}
					pillarRotation={values.pillarRotation}
					followMouse={values.followMouse}
					quality={values.quality as LightPillarQuality}
				/>
			</div>
		</Demo>
	);
}

function FloatingLinesEntry() {
	const { values, panel } = useControls({
		colorStop0: { kind: "color", label: "Color stop 1", default: "var(--fr-accent)" },
		colorStop1: { kind: "color", label: "Color stop 2", default: "var(--fr-iris)" },
		colorStop2: { kind: "color", label: "Color stop 3", default: "var(--fr-accent)" },
		lineCount: { kind: "number", label: "Line count", default: 6, min: 1, max: 12, step: 1 },
		lineDistance: { kind: "number", label: "Spacing", default: 5, min: 1, max: 12, step: 0.5 },
		amplitude: { kind: "number", label: "Amplitude", default: 1, min: 0, max: 3, step: 0.05 },
		thickness: { kind: "number", label: "Thickness", default: 1, min: 0, max: 3, step: 0.05 },
		animationSpeed: { kind: "number", label: "Speed", default: 1, min: 0, max: 3, step: 0.1 },
		intensity: { kind: "number", label: "Intensity", default: 1, min: 0, max: 2, step: 0.05 },
		followMouse: { kind: "boolean", label: "Interactive", default: false },
		bendRadius: { kind: "number", label: "Bend radius", default: 5, min: 1, max: 12, step: 0.5 },
		bendStrength: { kind: "number", label: "Bend strength", default: -0.5, min: -2, max: 2, step: 0.05 },
		parallaxStrength: { kind: "number", label: "Parallax", default: 0.2, min: 0, max: 1, step: 0.02 },
	});
	return (
		<Demo
			summary="Three bands of drifting, undulating light lines that spiral out. Line count, spacing, amplitude, and speed are live; the lines ride a three-stop accent gradient over a transparent canvas."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<FloatingLinesBackground
					colorStops={[values.colorStop0, values.colorStop1, values.colorStop2]}
					lineCount={values.lineCount}
					lineDistance={values.lineDistance}
					amplitude={values.amplitude}
					thickness={values.thickness}
					animationSpeed={values.animationSpeed}
					intensity={values.intensity}
					followMouse={values.followMouse}
					bendRadius={values.bendRadius}
					bendStrength={values.bendStrength}
					parallaxStrength={values.parallaxStrength}
				/>
			</div>
		</Demo>
	);
}

function GalaxyEntry() {
	const { values, panel } = useControls({
		color: { kind: "color", label: "Star color", default: "var(--fr-accent)" },
		density: { kind: "number", label: "Density", default: 1, min: 0.2, max: 3, step: 0.05 },
		starSpeed: { kind: "number", label: "Star drift", default: 0.5, min: 0, max: 2, step: 0.05 },
		speed: { kind: "number", label: "Twinkle speed", default: 1, min: 0, max: 3, step: 0.05 },
		hueShift: { kind: "number", label: "Hue shift", default: 140, min: 0, max: 360, step: 1 },
		saturation: { kind: "number", label: "Saturation", default: 0, min: 0, max: 1, step: 0.02 },
		glowIntensity: { kind: "number", label: "Glow", default: 0.3, min: 0, max: 1, step: 0.02 },
		twinkleIntensity: { kind: "number", label: "Twinkle", default: 0.3, min: 0, max: 1, step: 0.02 },
		rotationSpeed: { kind: "number", label: "Rotation", default: 0.1, min: 0, max: 1, step: 0.02 },
		autoCenterRepulsion: { kind: "number", label: "Center repulsion", default: 0, min: 0, max: 5, step: 0.05 },
		intensity: { kind: "number", label: "Intensity", default: 1, min: 0, max: 2, step: 0.05 },
		followMouse: { kind: "boolean", label: "Interactive", default: false },
		mouseRepulsion: { kind: "boolean", label: "Repel from pointer", default: true },
		repulsionStrength: { kind: "number", label: "Repulsion strength", default: 2, min: 0, max: 5, step: 0.05 },
	});
	return (
		<Demo
			summary="A drifting, twinkling star field with layered parallax depth. Density, glow, twinkle, and rotation are live; stars take the accent tint wholesale at saturation 0, so the field re-tints with the theme."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<GalaxyBackground
					color={values.color}
					density={values.density}
					starSpeed={values.starSpeed}
					speed={values.speed}
					hueShift={values.hueShift}
					saturation={values.saturation}
					glowIntensity={values.glowIntensity}
					twinkleIntensity={values.twinkleIntensity}
					rotationSpeed={values.rotationSpeed}
					autoCenterRepulsion={values.autoCenterRepulsion}
					intensity={values.intensity}
					followMouse={values.followMouse}
					mouseRepulsion={values.mouseRepulsion}
					repulsionStrength={values.repulsionStrength}
				/>
			</div>
		</Demo>
	);
}

function PrismEntry() {
	const { values, panel } = useControls({
		height: { kind: "number", label: "Height", default: 3.5, min: 0.5, max: 8, step: 0.1 },
		baseWidth: { kind: "number", label: "Base width", default: 5.5, min: 0.5, max: 10, step: 0.1 },
		scale: { kind: "number", label: "Scale", default: 3.6, min: 1, max: 6, step: 0.1 },
		glow: { kind: "number", label: "Glow", default: 1, min: 0, max: 3, step: 0.05 },
		bloom: { kind: "number", label: "Bloom", default: 1, min: 0, max: 3, step: 0.05 },
		noise: { kind: "number", label: "Grain", default: 0.3, min: 0, max: 1, step: 0.02 },
		hueShift: { kind: "number", label: "Hue shift", default: 0, min: 0, max: 6.28, step: 0.05 },
		colorFrequency: { kind: "number", label: "Dispersion", default: 1, min: 0.2, max: 3, step: 0.05 },
		timeScale: { kind: "number", label: "Speed", default: 0.5, min: 0, max: 2, step: 0.05 },
		animationType: { kind: "select", label: "Animation", options: PRISM_ANIMATIONS, default: "rotate" },
	});
	return (
		<Demo
			summary="A glass prism refracting spectral light, a 100-step raymarched octahedron on a fullscreen triangle. Tune the glow, bloom, and dispersion, and pick a gentle base wobble or a full tumble."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<PrismBackground
					height={values.height}
					baseWidth={values.baseWidth}
					scale={values.scale}
					glow={values.glow}
					bloom={values.bloom}
					noise={values.noise}
					hueShift={values.hueShift}
					colorFrequency={values.colorFrequency}
					timeScale={values.timeScale}
					animationType={values.animationType as "rotate" | "3drotate"}
				/>
			</div>
		</Demo>
	);
}

const auroraDocs: EntryDocs = {
	import: 'import { AuroraBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <AuroraBackground amplitude={1} blend={0.5} speed={1} />
</div>`,
	examples: [
		{
			label: "Default (token ramp)",
			code: `<div className="relative overflow-hidden">
  <AuroraBackground />
</div>`,
		},
		{
			label: "Custom ramp + tall ridge",
			code: `<AuroraBackground
  colorStops={["var(--fr-iris)", "var(--fr-accent)", "var(--fr-iris)"]}
  amplitude={1.6}
  speed={1.4}
/>`,
		},
	],
	api: [
		{
			name: "colorStops",
			type: "[string, string, string]",
			default: "[accent, iris, accent]",
			description: "Three ramp stops, left to right. CSS colors, tokens welcome.",
		},
		{ name: "amplitude", type: "number", default: "1", description: "Ridge height multiplier." },
		{
			name: "blend",
			type: "number",
			default: "0.5",
			description: "Edge softness of the curtain (0 hard .. 1 soft).",
		},
		{ name: "speed", type: "number", default: "1", description: "Animation speed multiplier." },
		{ name: "intensity", type: "number", default: "1", description: "Overall light intensity." },
		...SHARED_HOST_PROPS,
	],
};

const softAuroraDocs: EntryDocs = {
	import: 'import { SoftAuroraBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <SoftAuroraBackground speed={0.6} scale={1.5} />
</div>`,
	examples: [
		{
			label: "Default (soft white + accent)",
			code: `<SoftAuroraBackground />`,
		},
		{
			label: "Low band, wide glow",
			code: `<SoftAuroraBackground bandHeight={0.3} bandSpread={2} brightness={1.3} />`,
		},
	],
	api: [
		{ name: "color1", type: "string", default: "text token", description: "First band color." },
		{ name: "color2", type: "string", default: "accent token", description: "Second band color." },
		{ name: "speed", type: "number", default: "0.6", description: "Animation speed." },
		{ name: "scale", type: "number", default: "1.5", description: "Noise field zoom." },
		{ name: "brightness", type: "number", default: "1", description: "Overall brightness." },
		{
			name: "bandHeight",
			type: "number",
			default: "0.5",
			description: "Vertical band position (0 bottom .. 1 top).",
		},
		{ name: "bandSpread", type: "number", default: "1", description: "Band thickness / glow spread." },
		...SHARED_HOST_PROPS,
	],
};

const lightRaysDocs: EntryDocs = {
	import: 'import { LightRaysBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <LightRaysBackground raysOrigin="top-center" lightSpread={1} rayLength={2} />
</div>`,
	examples: [
		{
			label: "Default (top-center fan)",
			code: `<LightRaysBackground />`,
		},
		{
			label: "Left edge, pulsating",
			code: `<LightRaysBackground raysOrigin="left" pulsating rayLength={3} raysSpeed={1.5} />`,
		},
	],
	api: [
		{
			name: "raysOrigin",
			type: "LightRaysOrigin",
			default: '"top-center"',
			description: "Edge the light pours from (8 anchors).",
		},
		{ name: "raysColor", type: "string", default: "accent token", description: "Ray color." },
		{ name: "lightSpread", type: "number", default: "1", description: "Cone width (higher = wider)." },
		{ name: "rayLength", type: "number", default: "2", description: "Reach as a fraction of the viewport." },
		{ name: "raysSpeed", type: "number", default: "1", description: "Animation speed." },
		{ name: "pulsating", type: "boolean", default: "false", description: "Slow breathing signal." },
		{ name: "intensity", type: "number", default: "1", description: "Overall light intensity." },
		...SHARED_HOST_PROPS,
	],
};

const sideRaysDocs: EntryDocs = {
	import: 'import { SideRaysBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <SideRaysBackground origin="top-right" spread={2} />
</div>`,
	examples: [
		{
			label: "Default (top-right corner)",
			code: `<SideRaysBackground />`,
		},
		{
			label: "Bottom-left, wide + punchy",
			code: `<SideRaysBackground origin="bottom-left" spread={3.5} intensity={3} />`,
		},
	],
	api: [
		{ name: "origin", type: "SideRaysOrigin", default: '"top-right"', description: "Corner the rays sweep from." },
		{ name: "rayColor1", type: "string", default: "accent token", description: "Primary ray color." },
		{ name: "rayColor2", type: "string", default: "iris token", description: "Secondary ray color." },
		{ name: "spread", type: "number", default: "2", description: "Angular spread of the ray fan (higher = wider)." },
		{ name: "speed", type: "number", default: "2.5", description: "Animation speed." },
		{ name: "intensity", type: "number", default: "2", description: "Overall light intensity." },
		{ name: "blend", type: "number", default: "0.75", description: "Mix between the two ray colors (0 .. 1)." },
		...SHARED_HOST_PROPS,
	],
};

const lightPillarDocs: EntryDocs = {
	import: 'import { LightPillarBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <LightPillarBackground quality="high" rotationSpeed={0.3} />
</div>`,
	examples: [
		{
			label: "Default (high quality)",
			code: `<LightPillarBackground />`,
		},
		{
			label: "Cheaper + fatter column",
			code: `<LightPillarBackground quality="medium" pillarWidth={4.5} glowAmount={0.02} />`,
		},
	],
	api: [
		{ name: "topColor", type: "string", default: "iris token", description: "Color at the top of the pillar." },
		{ name: "bottomColor", type: "string", default: "accent token", description: "Color at the base of the pillar." },
		{
			name: "quality",
			type: '"low" | "medium" | "high"',
			default: '"high"',
			description: "Raymarch iteration budget; changing it recompiles the shader.",
		},
		{ name: "rotationSpeed", type: "number", default: "0.3", description: "Rotation and internal churn speed." },
		{ name: "glowAmount", type: "number", default: "0.005", description: "Glow bloom strength." },
		{ name: "pillarWidth", type: "number", default: "3", description: "Pillar radius (wider = fatter column)." },
		{ name: "intensity", type: "number", default: "1", description: "Overall light intensity." },
		...SHARED_HOST_PROPS,
	],
};

const floatingLinesDocs: EntryDocs = {
	import: 'import { FloatingLinesBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <FloatingLinesBackground lineCount={6} amplitude={1} />
</div>`,
	examples: [
		{
			label: "Default (six lines per band)",
			code: `<FloatingLinesBackground />`,
		},
		{
			label: "Dense, fast weave",
			code: `<FloatingLinesBackground lineCount={10} lineDistance={3} animationSpeed={1.8} />`,
		},
	],
	api: [
		{
			name: "colorStops",
			type: "[string, string, string]",
			default: "[accent, iris, accent]",
			description: "Line gradient, left to right across each band.",
		},
		{ name: "lineCount", type: "number", default: "6", description: "Lines per band." },
		{ name: "lineDistance", type: "number", default: "5", description: "Spacing between adjacent lines." },
		{ name: "amplitude", type: "number", default: "1", description: "Wave amplitude multiplier." },
		{ name: "animationSpeed", type: "number", default: "1", description: "Animation speed multiplier." },
		{ name: "intensity", type: "number", default: "1", description: "Overall light intensity." },
		...SHARED_HOST_PROPS,
	],
};

const galaxyDocs: EntryDocs = {
	import: 'import { GalaxyBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <GalaxyBackground density={1} glowIntensity={0.3} />
</div>`,
	examples: [
		{
			label: "Default (accent-tinted mono stars)",
			code: `<GalaxyBackground />`,
		},
		{
			label: "Dense, hue-shifted swirl",
			code: `<GalaxyBackground density={2} saturation={0.8} rotationSpeed={0.4} />`,
		},
	],
	api: [
		{ name: "color", type: "string", default: "accent token", description: "Star tint." },
		{ name: "density", type: "number", default: "1", description: "Star field density." },
		{ name: "glowIntensity", type: "number", default: "0.3", description: "Star glow radius and flare intensity." },
		{
			name: "twinkleIntensity",
			type: "number",
			default: "0.3",
			description: "Twinkle strength (0 steady .. 1 full).",
		},
		{ name: "rotationSpeed", type: "number", default: "0.1", description: "Auto-rotation speed of the whole field." },
		{ name: "starSpeed", type: "number", default: "0.5", description: "Star drift speed through the layers." },
		{
			name: "saturation",
			type: "number",
			default: "0",
			description: "Per-star color saturation (0 tinted mono .. 1 full hue).",
		},
		{ name: "intensity", type: "number", default: "1", description: "Overall light intensity." },
		...SHARED_HOST_PROPS,
	],
};

const prismDocs: EntryDocs = {
	import: 'import { PrismBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <PrismBackground animationType="rotate" glow={1} />
</div>`,
	examples: [
		{
			label: "Default (gentle wobble)",
			code: `<PrismBackground />`,
		},
		{
			label: "Full tumble, brighter bloom",
			code: `<PrismBackground animationType="3drotate" bloom={1.8} glow={1.6} />`,
		},
	],
	api: [
		{
			name: "animationType",
			type: '"rotate" | "3drotate"',
			default: '"rotate"',
			description: "Gentle base wobble or a full tumble.",
		},
		{ name: "glow", type: "number", default: "1", description: "Beam glow multiplier." },
		{ name: "bloom", type: "number", default: "1", description: "Bloom multiplier." },
		{ name: "timeScale", type: "number", default: "0.5", description: "Animation speed (0 freezes)." },
		{ name: "colorFrequency", type: "number", default: "1", description: "Spectral banding frequency (dispersion)." },
		{ name: "scale", type: "number", default: "3.6", description: "Scene zoom: larger = closer prism." },
		{
			name: "renderScale",
			type: "number",
			default: "0.75",
			description:
				"Backing-store downsample; the raymarch is heavy and the glow is soft, so upscaling is invisible.",
		},
	],
};

export const backgroundsEntries: readonly ShowcaseEntry[] = [
	{ id: "aurora", name: "AuroraBackground", Component: AuroraEntry, docs: auroraDocs },
	{ id: "soft-aurora", name: "SoftAuroraBackground", Component: SoftAuroraEntry, docs: softAuroraDocs },
	{ id: "light-rays", name: "LightRaysBackground", Component: LightRaysEntry, docs: lightRaysDocs },
	{ id: "side-rays", name: "SideRaysBackground", Component: SideRaysEntry, docs: sideRaysDocs },
	{ id: "light-pillar", name: "LightPillarBackground", Component: LightPillarEntry, docs: lightPillarDocs },
	{ id: "floating-lines", name: "FloatingLinesBackground", Component: FloatingLinesEntry, docs: floatingLinesDocs },
	{ id: "galaxy", name: "GalaxyBackground", Component: GalaxyEntry, docs: galaxyDocs },
	{ id: "prism", name: "PrismBackground", Component: PrismEntry, docs: prismDocs },
];
