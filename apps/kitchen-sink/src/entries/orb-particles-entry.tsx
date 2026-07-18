import { OrbBackground, ParticlesBackground } from "@fraym/ui";
import { useControls } from "../showcase/controls";
import { Demo } from "../showcase/demo";
import type { EntryDocs } from "../showcase/docs";
import type { ShowcaseEntry } from "../showcase/types";
import { SHARED_HOST_PROPS, STAGE } from "./background-shared";

function OrbEntry() {
	const { values, panel } = useControls({
		color: { kind: "color", label: "Color", default: "var(--fr-accent)" },
		backgroundColor: { kind: "color", label: "Surface color", default: "var(--fr-bg)" },
		hueShift: { kind: "number", label: "Hue shift", default: 0, min: 0, max: 360, step: 1 },
		hoverIntensity: { kind: "number", label: "Hover wobble", default: 0.5, min: 0, max: 1, step: 0.02 },
		followMouse: { kind: "boolean", label: "Interactive", default: false },
	});
	return (
		<Demo
			summary="A glowing energy orb: a noise-perturbed ring of light with an orbiting internal flare. The palette is derived from the color token and rotated by hue shift, and the orb adapts to the surface luminance so it reads on light and dark. Turn on Follow mouse and the pointer proximity drives a soft wobble."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<OrbBackground
					color={values.color}
					backgroundColor={values.backgroundColor}
					hueShift={values.hueShift}
					hoverIntensity={values.hoverIntensity}
					followMouse={values.followMouse}
				/>
			</div>
		</Demo>
	);
}

function ParticlesEntry() {
	const { values, panel } = useControls({
		color: { kind: "color", label: "Color", default: "var(--fr-accent)" },
		density: { kind: "number", label: "Density", default: 1, min: 0.2, max: 3, step: 0.05 },
		speed: { kind: "number", label: "Speed", default: 1, min: 0, max: 3, step: 0.1 },
		size: { kind: "number", label: "Size", default: 1, min: 0.3, max: 3, step: 0.05 },
		intensity: { kind: "number", label: "Intensity", default: 1, min: 0, max: 2, step: 0.05 },
		alphaParticles: { kind: "boolean", label: "Soft dots", default: false },
		followMouse: { kind: "boolean", label: "Interactive", default: false },
	});
	return (
		<Demo
			summary="A field of soft drifting dots with parallax depth, re-authored purely in the fragment shader (no geometry, camera, or ogl). Hash-distributed particles wobble in place while depth-cycling layers give parallax and size attenuation. Dots take the accent tint; toggle Soft dots for a translucent falloff."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className={STAGE}>
				<ParticlesBackground
					color={values.color}
					density={values.density}
					speed={values.speed}
					size={values.size}
					intensity={values.intensity}
					alphaParticles={values.alphaParticles}
					followMouse={values.followMouse}
				/>
			</div>
		</Demo>
	);
}

const orbDocs: EntryDocs = {
	import: 'import { OrbBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <OrbBackground color="var(--fr-accent)" hueShift={0} />
</div>`,
	examples: [
		{
			label: "Default (accent orb)",
			code: `<div className="relative overflow-hidden">
  <OrbBackground />
</div>`,
		},
		{
			label: "Interactive iris orb",
			code: `<OrbBackground
  color="var(--fr-iris)"
  hueShift={40}
  hoverIntensity={0.8}
  followMouse
/>`,
		},
	],
	api: [
		{
			name: "color",
			type: "string",
			default: "var(--fr-accent)",
			description: "Orb tint the palette is derived from. CSS color, tokens welcome.",
		},
		{
			name: "backgroundColor",
			type: "string",
			default: "var(--fr-bg)",
			description: "Surface the orb sits over; its luminance blends the light vs dark presentation.",
		},
		{
			name: "hueShift",
			type: "number",
			default: "0",
			description: "Internal hue rotation of the derived palette, in degrees.",
		},
		{
			name: "hoverIntensity",
			type: "number",
			default: "0.5",
			description: "Pointer wobble strength when following (0 none .. 1 strong).",
		},
		{
			name: "followMouse",
			type: "boolean",
			default: "false",
			description: "React to the pointer: proximity drives the wobble. Off for backdrops.",
		},
		...SHARED_HOST_PROPS,
	],
};

const particlesDocs: EntryDocs = {
	import: 'import { ParticlesBackground } from "@fraym/ui";',
	anatomy: `<div className="relative h-[360px] overflow-hidden rounded-xl bg-fr-bg">
  <ParticlesBackground density={1} speed={1} />
</div>`,
	examples: [
		{
			label: "Default (accent dots)",
			code: `<div className="relative overflow-hidden">
  <ParticlesBackground />
</div>`,
		},
		{
			label: "Dense, soft, slow drift",
			code: `<ParticlesBackground
  color="var(--fr-iris)"
  density={2.4}
  speed={0.6}
  size={1.4}
  alphaParticles
/>`,
		},
	],
	api: [
		{
			name: "color",
			type: "string",
			default: "var(--fr-accent)",
			description: "Particle tint. CSS color, tokens welcome.",
		},
		{
			name: "density",
			type: "number",
			default: "1",
			description: "Field density; higher packs more dots per layer.",
		},
		{ name: "speed", type: "number", default: "1", description: "Drift and wobble speed." },
		{ name: "size", type: "number", default: "1", description: "Base dot radius multiplier." },
		{
			name: "alphaParticles",
			type: "boolean",
			default: "false",
			description: "Soft translucent dots (true) vs crisp bright dots (false).",
		},
		{
			name: "followMouse",
			type: "boolean",
			default: "false",
			description: "React to the pointer: the field parallaxes with it. Off for backdrops.",
		},
		{ name: "intensity", type: "number", default: "1", description: "Overall light intensity." },
		...SHARED_HOST_PROPS,
	],
};

export const orbParticlesEntries: readonly ShowcaseEntry[] = [
	{ id: "orb", name: "OrbBackground", Component: OrbEntry, docs: orbDocs },
	{ id: "particles", name: "ParticlesBackground", Component: ParticlesEntry, docs: particlesDocs },
];
