import { Button, ClickSpark, GradualBlur, Magnet, NoiseOverlay } from "@fraym-ai/ui";
import { useControls } from "../showcase/controls";
import { Demo } from "../showcase/demo";
import type { EntryDocs } from "../showcase/docs";
import type { ShowcaseEntry } from "../showcase/types";

type SparkEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out";
type BlurPosition = "top" | "bottom" | "left" | "right";
type BlurCurve = "linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out";
type BlurTarget = "parent" | "page";

// Copy behind GradualBlur so the progressive fade has content to defocus.
const PARAGRAPHS = [
	"Progressive blur ramps across one edge so content dissolves instead of clipping hard against the container.",
	"Each stacked layer masks a narrow window and adds a little more backdrop blur than the one before it.",
	"Overlapping those windows produces a single continuous gradient of focus toward the chosen edge.",
	"Because it is pure CSS backdrop-filter, it blurs whatever sits behind it and reads on light and dark alike.",
	"There is no motion at all, so reduced-motion preferences never affect the band.",
	"Scroll or resize the panel and the fade holds its shape against the edge you picked.",
] as const;

function ClickSparkEntry() {
	const { values, panel } = useControls({
		sparkColor: { kind: "color", label: "Spark color", default: "var(--fr-accent)" },
		sparkCount: { kind: "number", label: "Spark count", default: 8, min: 3, max: 24, step: 1 },
		sparkRadius: { kind: "number", label: "Radius", default: 15, min: 5, max: 60, step: 1 },
		sparkSize: { kind: "number", label: "Spark size", default: 10, min: 2, max: 30, step: 1 },
		duration: { kind: "number", label: "Duration (ms)", default: 400, min: 150, max: 1200, step: 50 },
		extraScale: { kind: "number", label: "Extra scale", default: 1, min: 0.5, max: 3, step: 0.1 },
		easing: {
			kind: "select",
			label: "Easing",
			options: ["linear", "ease-in", "ease-out", "ease-in-out"],
			default: "ease-out",
		},
	});
	return (
		<Demo
			summary="Click anywhere in the panel: a ring of short accent strokes bursts from the hit point and eases outward. A pointer-events-none canvas overlays the children, so a wrapped button still clicks through. The rAF loop self-idles the instant the last spark fades."
			importPath="@fraym-ai/ui"
			controls={panel}
			stage="stretch"
		>
			<ClickSpark
				sparkColor={values.sparkColor}
				sparkCount={values.sparkCount}
				sparkRadius={values.sparkRadius}
				sparkSize={values.sparkSize}
				duration={values.duration}
				extraScale={values.extraScale}
				easing={values.easing as SparkEasing}
			>
				<div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-fr-border-soft bg-fr-surface text-center">
					<p className="text-fr-sm text-fr-text-2">Click anywhere in this panel</p>
					<Button>Or click the button</Button>
				</div>
			</ClickSpark>
		</Demo>
	);
}

const clickSparkDocs: EntryDocs = {
	import: 'import { ClickSpark } from "@fraym-ai/ui";',
	anatomy: `<ClickSpark sparkColor="var(--fr-accent)">
  <button>Click me</button>
</ClickSpark>`,
	examples: [
		{ label: "Default", code: "<ClickSpark>{content}</ClickSpark>" },
		{
			label: "Denser, slower burst",
			code: "<ClickSpark sparkCount={14} sparkRadius={28} duration={700}>{content}</ClickSpark>",
		},
	],
	api: [
		{
			name: "sparkColor",
			type: "string",
			default: '"var(--fr-accent)"',
			description: "Stroke color per spark; var(--fr-*) tokens resolve at click time.",
		},
		{ name: "sparkSize", type: "number", default: "10", description: "Initial length of each spark line in px." },
		{
			name: "sparkRadius",
			type: "number",
			default: "15",
			description: "How far sparks travel from the hit point in px.",
		},
		{
			name: "sparkCount",
			type: "number",
			default: "8",
			description: "Sparks per burst, spread evenly around a circle.",
		},
		{ name: "duration", type: "number", default: "400", description: "Burst lifetime in ms." },
		{
			name: "easing",
			type: '"linear" | "ease-in" | "ease-out" | "ease-in-out"',
			default: '"ease-out"',
			description: "Flight easing curve.",
		},
		{ name: "extraScale", type: "number", default: "1", description: "Extra multiplier on travel distance." },
	],
};

function MagnetEntry() {
	const { values, panel } = useControls({
		padding: { kind: "number", label: "Padding", default: 100, min: 0, max: 240, step: 10 },
		magnetStrength: { kind: "number", label: "Strength", default: 2, min: 1, max: 8, step: 0.5 },
		damping: { kind: "number", label: "Damping", default: 0.2, min: 0.05, max: 0.5, step: 0.05 },
		disabled: { kind: "boolean", label: "Disabled", default: false },
	});
	return (
		<Demo
			summary="Move the pointer near the pill: it drifts toward the cursor inside a padded activation zone, then eases back to rest. rAF exponential smoothing writes transform directly, with zero React state per frame. Inert under reduced motion and on touch."
			importPath="@fraym-ai/ui"
			controls={panel}
		>
			<Magnet
				padding={values.padding}
				magnetStrength={values.magnetStrength}
				damping={values.damping}
				disabled={values.disabled}
			>
				<div className="rounded-full border border-fr-border bg-fr-surface px-6 py-3 text-fr-sm font-medium text-fr-text">
					Hover near me
				</div>
			</Magnet>
		</Demo>
	);
}

const magnetDocs: EntryDocs = {
	import: 'import { Magnet } from "@fraym-ai/ui";',
	anatomy: `<Magnet padding={100} magnetStrength={2}>
  <button>Hover near me</button>
</Magnet>`,
	examples: [
		{ label: "Default", code: "<Magnet>{content}</Magnet>" },
		{
			label: "Strong pull, snappier follow",
			code: "<Magnet magnetStrength={1.4} damping={0.3} padding={160}>{content}</Magnet>",
		},
	],
	api: [
		{
			name: "padding",
			type: "number",
			default: "100",
			description: "Activation zone padding around the element in px.",
		},
		{
			name: "disabled",
			type: "boolean",
			default: "false",
			description: "Turn the effect off; children stay at rest.",
		},
		{ name: "magnetStrength", type: "number", default: "2", description: "Pull divisor: higher is a subtler drift." },
		{
			name: "damping",
			type: "number",
			default: "0.2",
			description: "Follow smoothing per frame (higher is snappier).",
		},
		{ name: "innerClassName", type: "string", description: "Class for the inner, transformed element." },
	],
};

function GradualBlurEntry() {
	const { values, panel } = useControls({
		position: { kind: "select", label: "Position", options: ["top", "bottom", "left", "right"], default: "bottom" },
		strength: { kind: "number", label: "Strength", default: 2, min: 0.5, max: 6, step: 0.5 },
		height: { kind: "text", label: "Band size", default: "6rem" },
		divCount: { kind: "number", label: "Layers", default: 5, min: 2, max: 12, step: 1 },
		curve: {
			kind: "select",
			label: "Curve",
			options: ["linear", "bezier", "ease-in", "ease-out", "ease-in-out"],
			default: "linear",
		},
		exponential: { kind: "boolean", label: "Exponential", default: false },
		opacity: { kind: "number", label: "Opacity", default: 1, min: 0.2, max: 1, step: 0.1 },
		zIndex: { kind: "number", label: "Z index", default: 1000, min: 0, max: 2000, step: 100 },
		target: { kind: "select", label: "Target", options: ["parent", "page"], default: "parent" },
	});
	return (
		<Demo
			summary="A stack of masked backdrop-filter layers ramps blur across one edge, so content fades softly out of focus under a header, footer, or side band. Pure static CSS with no motion. Mount it inside a positioned, clipped container that has content behind it."
			importPath="@fraym-ai/ui"
			controls={panel}
			stage="stretch"
		>
			<div className="relative h-[260px] overflow-hidden rounded-xl border border-fr-border-soft bg-fr-bg p-5">
				<div className="flex flex-col gap-3">
					{PARAGRAPHS.map(line => (
						<p key={line} className="text-fr-sm leading-relaxed text-fr-text-2">
							{line}
						</p>
					))}
				</div>
				<GradualBlur
					position={values.position as BlurPosition}
					strength={values.strength}
					height={values.height}
					divCount={values.divCount}
					curve={values.curve as BlurCurve}
					exponential={values.exponential}
					opacity={values.opacity}
					zIndex={values.zIndex}
					target={values.target as BlurTarget}
				/>
			</div>
		</Demo>
	);
}

const gradualBlurDocs: EntryDocs = {
	import: 'import { GradualBlur } from "@fraym-ai/ui";',
	anatomy: `<div className="relative overflow-hidden">
  {content}
  <GradualBlur position="bottom" strength={2} />
</div>`,
	examples: [
		{ label: "Footer fade", code: '<GradualBlur position="bottom" height="8rem" />' },
		{ label: "Intense exponential ramp", code: "<GradualBlur strength={4} divCount={8} exponential />" },
	],
	api: [
		{
			name: "position",
			type: '"top" | "bottom" | "left" | "right"',
			default: '"bottom"',
			description: "Which edge the blur band hugs.",
		},
		{ name: "strength", type: "number", default: "2", description: "Blur intensity multiplier." },
		{
			name: "height",
			type: "string",
			default: '"6rem"',
			description: "Band size (any CSS length): height for top/bottom, width for left/right.",
		},
		{
			name: "divCount",
			type: "number",
			default: "5",
			description: "Number of stacked blur layers; more is a smoother ramp.",
		},
		{
			name: "exponential",
			type: "boolean",
			default: "false",
			description: "Ramp blur exponentially instead of linearly.",
		},
		{
			name: "curve",
			type: '"linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out"',
			default: '"linear"',
			description: "Progress-shaping curve across the layers.",
		},
		{ name: "opacity", type: "number", default: "1", description: "Layer opacity (0..1)." },
		{
			name: "target",
			type: '"parent" | "page"',
			default: '"parent"',
			description: "Stacking context; page pins the band to the viewport.",
		},
		{ name: "zIndex", type: "number", default: "1000", description: "Base z-index for the band." },
	],
};

function NoiseOverlayEntry() {
	const { values, panel } = useControls({
		patternAlpha: { kind: "number", label: "Alpha", default: 15, min: 2, max: 60, step: 1 },
		patternRefreshInterval: { kind: "number", label: "Refresh interval", default: 2, min: 1, max: 12, step: 1 },
		patternSize: { kind: "number", label: "Texture size", default: 1024, min: 128, max: 1024, step: 64 },
	});
	return (
		<Demo
			summary="A low-alpha field of random grayscale pixels refreshes every few frames and stretches to fill the parent, adding a subtle film grain over any surface. pointer-events-none and a low default alpha keep it gentle on light backgrounds. Under reduced motion it paints one static frame."
			importPath="@fraym-ai/ui"
			controls={panel}
			stage="stretch"
		>
			<div className="relative h-[220px] w-full overflow-hidden rounded-xl border border-fr-border-soft">
				<div
					className="absolute inset-0"
					style={{ background: "linear-gradient(135deg, var(--fr-surface), var(--fr-bg))" }}
				/>
				<div className="absolute inset-0 flex items-center justify-center">
					<span className="text-fr-lg font-semibold text-fr-text">Film grain overlay</span>
				</div>
				<NoiseOverlay
					patternAlpha={values.patternAlpha}
					patternRefreshInterval={values.patternRefreshInterval}
					patternSize={values.patternSize}
				/>
			</div>
		</Demo>
	);
}

const noiseOverlayDocs: EntryDocs = {
	import: 'import { NoiseOverlay } from "@fraym-ai/ui";',
	anatomy: `<div className="relative overflow-hidden">
  {content}
  <NoiseOverlay patternAlpha={15} />
</div>`,
	examples: [
		{ label: "Default", code: "<NoiseOverlay />" },
		{ label: "Calmer, coarser grain", code: "<NoiseOverlay patternRefreshInterval={6} patternSize={512} />" },
	],
	api: [
		{
			name: "patternSize",
			type: "number",
			default: "1024",
			description: "Grain texture resolution in px per side; CSS-scaled to fill the parent.",
		},
		{
			name: "patternRefreshInterval",
			type: "number",
			default: "2",
			description: "Frames between grain refreshes; higher is calmer.",
		},
		{
			name: "patternAlpha",
			type: "number",
			default: "15",
			description: "Per-grain alpha (0..255); keep low so it stays subtle on light surfaces.",
		},
	],
};

export const interactiveBitsEntries: readonly ShowcaseEntry[] = [
	{ id: "click-spark", name: "ClickSpark", Component: ClickSparkEntry, docs: clickSparkDocs },
	{ id: "magnet", name: "Magnet", Component: MagnetEntry, docs: magnetDocs },
	{ id: "gradual-blur", name: "GradualBlur", Component: GradualBlurEntry, docs: gradualBlurDocs },
	{ id: "noise-overlay", name: "NoiseOverlay", Component: NoiseOverlayEntry, docs: noiseOverlayDocs },
];
