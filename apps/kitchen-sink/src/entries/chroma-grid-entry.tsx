import { ChromaGrid } from "@fraym/ui";
import { useControls } from "../showcase/controls";
import { Demo } from "../showcase/demo";
import type { EntryDocs } from "../showcase/docs";
import type { ShowcaseEntry } from "../showcase/types";

// Colorful demo tiles so the desaturation window is unmistakable.
const TILES = [
	"linear-gradient(145deg, #4f46e5, #101014)",
	"linear-gradient(210deg, #10b981, #101014)",
	"linear-gradient(165deg, #f59e0b, #101014)",
	"linear-gradient(195deg, #ef4444, #101014)",
	"linear-gradient(225deg, #8b5cf6, #101014)",
	"linear-gradient(135deg, #06b6d4, #101014)",
] as const;

function ChromaGridEntry() {
	const { values, panel } = useControls({
		radius: { kind: "number", label: "Radius", default: 320, min: 120, max: 640, step: 20 },
		damping: { kind: "number", label: "Damping", default: 0.14, min: 0.04, max: 0.4, step: 0.02 },
		grayscale: { kind: "number", label: "Grayscale", default: 0.9, min: 0, max: 1, step: 0.05 },
		brightness: { kind: "number", label: "Brightness", default: 0.82, min: 0.5, max: 1, step: 0.02 },
	});
	return (
		<Demo
			summary="Chroma follows the cursor: the wrapped grid rests desaturated and color blooms in a smoothed window around the pointer (two masked backdrop-filter layers). A wrapper, not a card system: hand it any grid. Hover-capable pointers only, so touch never sticks gray."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<ChromaGrid
				radius={values.radius}
				damping={values.damping}
				grayscale={values.grayscale}
				brightness={values.brightness}
			>
				<div className="grid grid-cols-3 gap-3">
					{TILES.map(gradient => (
						<div
							key={gradient}
							className="flex h-[140px] items-end rounded-xl border border-fr-border-soft p-3"
							style={{ background: gradient }}
						>
							<span className="text-fr-xs font-medium text-white/90">Tile</span>
						</div>
					))}
				</div>
			</ChromaGrid>
		</Demo>
	);
}

const chromaGridDocs: EntryDocs = {
	import: 'import { ChromaGrid } from "@fraym/ui";',
	anatomy: `<ChromaGrid radius={320}>
  <div className="grid grid-cols-3 gap-3">{cards}</div>
</ChromaGrid>`,
	examples: [
		{
			label: "Default",
			code: `<ChromaGrid>{grid}</ChromaGrid>`,
		},
		{
			label: "Wider window, gentler rest state",
			code: `<ChromaGrid radius={420} grayscale={0.7} brightness={0.9}>{grid}</ChromaGrid>`,
		},
	],
	api: [
		{ name: "radius", type: "number", default: "320", description: "Chroma window radius in px." },
		{
			name: "damping",
			type: "number",
			default: "0.14",
			description: "Cursor follow smoothing per frame (higher = snappier).",
		},
		{
			name: "grayscale",
			type: "number",
			default: "0.9",
			description: "Rest/outside desaturation (0 none .. 1 full).",
		},
		{
			name: "brightness",
			type: "number",
			default: "0.82",
			description: "Rest/outside dimming (1 none .. lower = darker).",
		},
	],
};

export const chromaGridEntries: readonly ShowcaseEntry[] = [
	{ id: "chroma-grid", name: "ChromaGrid", Component: ChromaGridEntry, docs: chromaGridDocs },
];
