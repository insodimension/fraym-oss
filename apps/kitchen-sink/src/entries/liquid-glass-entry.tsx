import {
	LiquidGlassBackdrop,
	LiquidGlassButton,
	LiquidGlassSurface,
	type LiquidGlassVariant,
	useTheme,
} from "@fraym/ui";
import { useControls } from "../showcase/controls";
import { Demo } from "../showcase/demo";
import type { EntryDocs } from "../showcase/docs";
import type { ShowcaseEntry } from "../showcase/types";

const VARIANTS: readonly LiquidGlassVariant[] = ["clear", "frosted", "dark", "prism", "dome"];

function LiquidGlassEntry() {
	const { resolvedMode } = useTheme();
	const { values, panel } = useControls({
		variant: { kind: "select", label: "Variant", options: VARIANTS, default: "frosted" },
		refraction: { kind: "number", label: "Refraction", default: 0.6, min: 0, max: 1.2, step: 0.02 },
		chroma: { kind: "number", label: "Chromatic aberration", default: 0.05, min: 0, max: 0.2, step: 0.005 },
	});
	const variant = values.variant as LiquidGlassVariant;
	const settings = { refraction: values.refraction, chromaticAberration: values.chroma };

	return (
		<Demo
			summary="Real WebGL refraction (ported from ogtirth/liquidglass-oss). A LiquidGlassBackdrop paints a drifting monochrome field; LiquidGlassSurface / LiquidGlassButton mount WebGL lenses that bend it with chromatic aberration, fresnel + specular. This is the engine behind the Liquid Glass + Liquid Glass Lumen themes; here it runs in a self-contained stage so it shows under any theme."
			importPath="@fraym/ui"
			controls={panel}
			stage="stretch"
			clip={false}
		>
			<div className="relative h-[380px] w-full overflow-hidden rounded-xl border border-fr-border">
				<LiquidGlassBackdrop contained tone={resolvedMode}>
					<div className="relative z-10 flex h-full flex-col items-center justify-center gap-7 p-8">
						<LiquidGlassSurface
							variant={variant}
							settings={settings}
							radius={22}
							className="flex w-[280px] max-w-full flex-col gap-2 p-6"
						>
							<span className="fr-eyebrow">Liquid Glass</span>
							<span className="text-fr-lg font-semibold text-fr-text">Refractive surface</span>
							<span className="text-fr-sm text-fr-text-2">
								The lens samples and bends the ambient field behind it — not a CSS blur.
							</span>
						</LiquidGlassSurface>
						<div className="flex flex-wrap items-center justify-center gap-3">
							<LiquidGlassButton variant={variant} settings={settings}>
								Primary
							</LiquidGlassButton>
							<LiquidGlassButton variant="clear">Clear</LiquidGlassButton>
							<LiquidGlassButton variant="dome">Dome</LiquidGlassButton>
						</div>
					</div>
				</LiquidGlassBackdrop>
			</div>
		</Demo>
	);
}

const liquidGlassDocs: EntryDocs = {
	import: 'import { LiquidGlassBackdrop, LiquidGlassSurface, LiquidGlassButton } from "@fraym/ui";',
	anatomy: `<LiquidGlassBackdrop contained tone="dark">
  <LiquidGlassSurface variant="frosted" radius={22} className="p-6">
    Refractive content
  </LiquidGlassSurface>
  <LiquidGlassButton variant="dome">Primary</LiquidGlassButton>
</LiquidGlassBackdrop>`,
	examples: [
		{
			label: "App-wide (the Liquid Glass themes)",
			code: `// Mounted for you inside <Fraym/>. Selecting a Liquid Glass theme
// (deep) or Liquid Glass Lumen (bright) turns on the in-shell WebGL
// field; surfaces refract it.
<LiquidGlassRuntime />`,
		},
		{
			label: "Tune the physics",
			code: `<LiquidGlassSurface
  variant="prism"
  settings={{ refraction: 0.82, chromaticAberration: 0.18, tintStrength: 0.14 }}
/>`,
		},
	],
	api: [
		{
			name: "LiquidGlassBackdrop.tone",
			type: '"dark" | "light"',
			default: '"dark"',
			description: "Light or dark aurora field.",
		},
		{
			name: "LiquidGlassBackdrop.contained",
			type: "boolean",
			default: "false",
			description:
				"false = app-background layer (mount inside the relative-isolate shell, behind content); true = its own isolate stage with content above (scoped demos). Both render absolute inset-0.",
		},
		{
			name: "LiquidGlassBackdrop.animating",
			type: "boolean",
			default: "!prefers-reduced-motion",
			description: "Drift the field. Freezes when reduced.",
		},
		{
			name: "LiquidGlassSurface.variant",
			type: '"clear" | "frosted" | "dark" | "prism" | "dome"',
			default: '"frosted"',
			description: "Material preset (blur, refraction, chroma, depth, tint).",
		},
		{
			name: "LiquidGlassSurface.settings",
			type: "Partial<LiquidGlassSettings>",
			description: "Per-instance physics overrides merged onto the variant.",
		},
		{
			name: "LiquidGlassSurface.radius",
			type: "number",
			default: "16",
			description: "Corner radius (px) of the content box and the lens.",
		},
		{
			name: "LiquidGlassButton.variant",
			type: "LiquidGlassVariant",
			default: '"dome"',
			description: "Material preset for the button face.",
		},
	],
};

export const liquidGlassEntries: readonly ShowcaseEntry[] = [
	{ id: "liquid-glass", name: "LiquidGlass", Component: LiquidGlassEntry, docs: liquidGlassDocs },
];
