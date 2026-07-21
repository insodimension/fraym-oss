import { Card, CardContent, CardHeader, ElectricBorder, GlareHover, StarBorder } from "@fraym-ai/ui";
import { useControls } from "../showcase/controls";
import { Demo } from "../showcase/demo";
import type { EntryDocs } from "../showcase/docs";
import type { ShowcaseEntry } from "../showcase/types";

// ── GlareHover ──────────────────────────────────────────────────────────────

function GlareHoverEntry() {
	const { values, panel } = useControls({
		glareColor: { kind: "color", label: "Glare color", default: "color-mix(in srgb, var(--fr-text) 60%, #ffffff)" },
		glareOpacity: { kind: "number", label: "Glare opacity", default: 0.5, min: 0, max: 1, step: 0.05 },
		glareAngle: { kind: "number", label: "Angle", default: -45, min: -90, max: 90, step: 5 },
		glareSize: { kind: "number", label: "Glare size %", default: 250, min: 100, max: 400, step: 10 },
		transitionDuration: { kind: "number", label: "Duration (ms)", default: 650, min: 200, max: 1500, step: 50 },
		borderRadius: { kind: "number", label: "Radius (px)", default: 9, min: 0, max: 28, step: 1 },
		playOnce: { kind: "boolean", label: "Play once", default: false },
	});
	return (
		<Demo
			summary="A diagonal specular glare sweeps across the wrapped content on hover. Input-driven, so the short sweep is fine under reduced motion. The glare color defaults to a token-derived white-mix that reads on both light and dark surfaces."
			importPath="@fraym-ai/ui"
			controls={panel}
			clip={false}
		>
			<GlareHover
				className="w-[340px]"
				glareColor={values.glareColor}
				glareOpacity={values.glareOpacity}
				glareAngle={values.glareAngle}
				glareSize={values.glareSize}
				transitionDuration={values.transitionDuration}
				borderRadius={values.borderRadius}
				playOnce={values.playOnce}
			>
				<Card>
					<CardHeader>Glare Hover</CardHeader>
					<CardContent className="py-6 text-center">
						<p className="text-fr-base font-semibold text-fr-text">Hover to catch the light</p>
						<p className="mt-1 text-fr-sm text-fr-text-2">A sheen band travels across on a diagonal.</p>
					</CardContent>
				</Card>
			</GlareHover>
		</Demo>
	);
}

const glareHoverDocs: EntryDocs = {
	import: 'import { GlareHover } from "@fraym-ai/ui";',
	anatomy: `<GlareHover borderRadius={9}>
  <Card>{content}</Card>
</GlareHover>`,
	examples: [
		{ label: "Default", code: `<GlareHover>{card}</GlareHover>` },
		{ label: "Snap back on leave", code: `<GlareHover playOnce>{card}</GlareHover>` },
		{
			label: "Steeper, faster sweep",
			code: `<GlareHover glareAngle={-30} glareSize={320} transitionDuration={450}>{card}</GlareHover>`,
		},
	],
	api: [
		{
			name: "glareColor",
			type: "string",
			default: "color-mix(in srgb, var(--fr-text) 60%, #ffffff)",
			description: "Glare band color; a token-derived white-mix that reads on light and dark.",
		},
		{
			name: "glareOpacity",
			type: "number",
			default: "0.5",
			description: "Band opacity (0..1), folded into the color as its alpha.",
		},
		{ name: "glareAngle", type: "number", default: "-45", description: "Sweep angle in degrees." },
		{ name: "glareSize", type: "number", default: "250", description: "Band size as a percent of the box." },
		{ name: "transitionDuration", type: "number", default: "650", description: "Milliseconds for one sweep." },
		{
			name: "playOnce",
			type: "boolean",
			default: "false",
			description: "Sweep in on hover, snap back on leave (no reverse sweep).",
		},
		{
			name: "borderRadius",
			type: "number",
			default: "16",
			description: "Corner radius in px; clips the sweep to match the content.",
		},
	],
};

// ── StarBorder ──────────────────────────────────────────────────────────────

function StarBorderEntry() {
	const { values, panel } = useControls({
		color: { kind: "color", label: "Glow color", default: "var(--fr-accent)" },
		speed: { kind: "number", label: "Speed (s)", default: 6, min: 1, max: 12, step: 0.5 },
		thickness: { kind: "number", label: "Thickness (px)", default: 2, min: 1, max: 8, step: 1 },
		borderRadius: { kind: "number", label: "Radius (px)", default: 20, min: 4, max: 40, step: 2 },
	});
	return (
		<Demo
			summary="An orbiting star glow rides the top and bottom edges in opposite directions (two masked radial-gradient bars). Continuous motion, so under reduced motion the glow rests static on the border. The glow defaults to var(--fr-accent) so it reads on any theme."
			importPath="@fraym-ai/ui"
			controls={panel}
			clip={false}
		>
			<StarBorder
				color={values.color}
				speed={values.speed}
				thickness={values.thickness}
				borderRadius={values.borderRadius}
			>
				<div className="px-7 py-5 text-center">
					<p className="text-fr-base font-semibold text-fr-text">Star Border</p>
					<p className="mt-1 text-fr-sm text-fr-text-2">A glowing dot orbits the frame.</p>
				</div>
			</StarBorder>
		</Demo>
	);
}

const starBorderDocs: EntryDocs = {
	import: 'import { StarBorder } from "@fraym-ai/ui";',
	anatomy: `<StarBorder speed={6} thickness={2}>
  <div className="px-6 py-4">{content}</div>
</StarBorder>`,
	examples: [
		{ label: "Default", code: `<StarBorder>{content}</StarBorder>` },
		{ label: "Faster, thicker glow", code: `<StarBorder speed={3} thickness={4}>{content}</StarBorder>` },
		{ label: "Iris glow", code: `<StarBorder color="var(--fr-iris)">{content}</StarBorder>` },
	],
	api: [
		{ name: "color", type: "string", default: "var(--fr-accent)", description: "Glow color of the orbiting star." },
		{ name: "speed", type: "number", default: "6", description: "Seconds for one edge-to-edge sweep." },
		{
			name: "thickness",
			type: "number",
			default: "1",
			description: "Glow band thickness in px (the visible padding gap).",
		},
		{ name: "borderRadius", type: "number", default: "20", description: "Corner radius in px for the frame." },
	],
};

// ── ElectricBorder ──────────────────────────────────────────────────────────

function ElectricBorderEntry() {
	const { values, panel } = useControls({
		color: { kind: "color", label: "Color", default: "var(--fr-accent)" },
		speed: { kind: "number", label: "Speed", default: 1, min: 0.2, max: 4, step: 0.2 },
		chaos: { kind: "number", label: "Chaos", default: 1, min: 0.2, max: 3, step: 0.2 },
		thickness: { kind: "number", label: "Thickness (px)", default: 2, min: 1, max: 6, step: 1 },
		borderRadius: { kind: "number", label: "Radius (px)", default: 12, min: 0, max: 32, step: 1 },
	});
	return (
		<Demo
			summary="A crackling border warps around the content via an SVG turbulence + displacement filter (inline SMIL drives the flow, since filter-primitive attributes are not CSS-animatable). Continuous motion, so under reduced motion the jagged edge rests still. Color defaults to var(--fr-accent) so the halo reads on any theme."
			importPath="@fraym-ai/ui"
			controls={panel}
			clip={false}
		>
			<ElectricBorder
				color={values.color}
				speed={values.speed}
				chaos={values.chaos}
				thickness={values.thickness}
				borderRadius={values.borderRadius}
			>
				<div className="w-[300px] bg-fr-surface p-6 text-center" style={{ borderRadius: values.borderRadius }}>
					<p className="text-fr-base font-semibold text-fr-text">Electric Border</p>
					<p className="mt-1 text-fr-sm text-fr-text-2">Turbulence warps the edge into a live crackle.</p>
				</div>
			</ElectricBorder>
		</Demo>
	);
}

const electricBorderDocs: EntryDocs = {
	import: 'import { ElectricBorder } from "@fraym-ai/ui";',
	anatomy: `<ElectricBorder speed={1} chaos={1}>
  <div className="bg-fr-surface p-6">{content}</div>
</ElectricBorder>`,
	examples: [
		{ label: "Default", code: `<ElectricBorder>{content}</ElectricBorder>` },
		{ label: "Calmer, slower", code: `<ElectricBorder speed={0.5} chaos={0.4}>{content}</ElectricBorder>` },
		{ label: "Wild crackle", code: `<ElectricBorder speed={2} chaos={2} thickness={3}>{content}</ElectricBorder>` },
	],
	api: [
		{ name: "color", type: "string", default: "var(--fr-accent)", description: "Border and glow color." },
		{
			name: "speed",
			type: "number",
			default: "1",
			description: "Crackle speed multiplier (one loop is 6s / speed).",
		},
		{
			name: "chaos",
			type: "number",
			default: "1",
			description: "Displacement intensity multiplier (higher = wilder jitter).",
		},
		{ name: "thickness", type: "number", default: "2", description: "Border thickness in px." },
		{ name: "borderRadius", type: "number", default: "16", description: "Corner radius in px." },
	],
};

// ── Export ──────────────────────────────────────────────────────────────────

export const borderEffectsEntries: readonly ShowcaseEntry[] = [
	{ id: "glare-hover", name: "GlareHover", Component: GlareHoverEntry, docs: glareHoverDocs },
	{ id: "star-border", name: "StarBorder", Component: StarBorderEntry, docs: starBorderDocs },
	{ id: "electric-border", name: "ElectricBorder", Component: ElectricBorderEntry, docs: electricBorderDocs },
];
