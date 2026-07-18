import { GradientText, ShinyText } from "@fraym/ui";
import { useControls } from "../showcase/controls";
import { Demo } from "../showcase/demo";
import type { EntryDocs } from "../showcase/docs";
import type { ShowcaseEntry } from "../showcase/types";

function ShinyTextEntry() {
	const { values, panel } = useControls({
		text: { kind: "text", label: "Text", default: "Ship it with a little shine" },
		color: { kind: "color", label: "Text color", default: "currentColor" },
		shineColor: { kind: "color", label: "Shine color", default: "color-mix(in srgb, currentColor, #ffffff 70%)" },
		speed: { kind: "number", label: "Speed (s)", default: 5, min: 1, max: 12, step: 0.5 },
		spread: { kind: "number", label: "Spread (deg)", default: 120, min: 0, max: 180, step: 10 },
		direction: { kind: "select", label: "Direction", options: ["left", "right"], default: "left" },
		disabled: { kind: "boolean", label: "Disabled", default: false },
	});
	const direction = values.direction === "right" ? "right" : "left";
	return (
		<Demo
			summary="A specular highlight sweeps across the text: the letters are painted with a gradient whose bright middle stop slides through them (background-clip:text, animated with the Web Animations API). The base color tracks the theme text token, so it reads on light and dark alike, and the shine defaults to a white-leaning mix that keeps contrast on light surfaces."
			importPath="@fraym/ui"
			controls={panel}
			stage="center"
		>
			<ShinyText
				className="text-4xl font-semibold tracking-tight"
				color={values.color}
				speed={values.speed}
				spread={values.spread}
				shineColor={values.shineColor}
				direction={direction}
				disabled={values.disabled}
			>
				{values.text}
			</ShinyText>
		</Demo>
	);
}

function GradientTextEntry() {
	const { values, panel } = useControls({
		text: { kind: "text", label: "Text", default: "Gradient in motion" },
		speed: { kind: "number", label: "Speed (s)", default: 8, min: 2, max: 20, step: 1 },
		colors: {
			kind: "text",
			label: "Colors (comma-separated)",
			default: "var(--fr-accent), var(--fr-iris), var(--fr-blue)",
		},
		showBorder: { kind: "boolean", label: "Show border", default: false },
		disabled: { kind: "boolean", label: "Disabled", default: false },
	});
	const colors = values.colors
		.split(",")
		.map(color => color.trim())
		.filter(Boolean);
	return (
		<Demo
			summary="Text filled with a multi-stop gradient that flows back and forth. The stops lay out to the right (first color duplicated for a seamless loop) over a 300% background, and the position eases side to side via the Web Animations API. Colors default to the Fraym brand tokens; an optional animated pill rim shares the same flow."
			importPath="@fraym/ui"
			controls={panel}
			stage="center"
		>
			<GradientText
				className="text-4xl font-semibold tracking-tight"
				colors={colors.length > 0 ? colors : undefined}
				speed={values.speed}
				showBorder={values.showBorder}
				disabled={values.disabled}
			>
				{values.text}
			</GradientText>
		</Demo>
	);
}

const shinyTextDocs: EntryDocs = {
	import: 'import { ShinyText } from "@fraym/ui";',
	anatomy: `<ShinyText speed={5}>Ship it with a little shine</ShinyText>`,
	examples: [
		{
			label: "Default (theme-native sheen)",
			code: `<ShinyText>Ship it with a little shine</ShinyText>`,
		},
		{
			label: "Slower, wider band, sweeping right",
			code: `<ShinyText speed={8} spread={160} direction="right">Loading</ShinyText>`,
		},
		{
			label: "Custom base and shine",
			code: `<ShinyText color="var(--fr-text-2)" shineColor="var(--fr-accent)">Featured</ShinyText>`,
		},
	],
	api: [
		{
			name: "children",
			type: "ReactNode",
			required: true,
			description: "The inline text the sheen travels through.",
		},
		{
			name: "disabled",
			type: "boolean",
			default: "false",
			description: "Park the sheen off-screen and never animate.",
		},
		{ name: "speed", type: "number", default: "5", description: "Seconds for one full sweep edge to edge." },
		{
			name: "color",
			type: "string",
			default: '"currentColor"',
			description: "Resting text color (the gradient base). Tracks the theme text token by default.",
		},
		{
			name: "shineColor",
			type: "string",
			default: "white-leaning color-mix of currentColor",
			description: "The moving highlight color; the default keeps contrast on light and dark.",
		},
		{ name: "spread", type: "number", default: "120", description: "Gradient angle in degrees; tilts the band." },
		{
			name: "direction",
			type: '"left" | "right"',
			default: '"left"',
			description: "Sweep direction across the text.",
		},
		{ name: "className", type: "string", description: "Extra classes (size, weight, tracking)." },
	],
};

const gradientTextDocs: EntryDocs = {
	import: 'import { GradientText } from "@fraym/ui";',
	anatomy: `<GradientText speed={8} showBorder>
  Gradient in motion
</GradientText>`,
	examples: [
		{
			label: "Default (brand ramp)",
			code: `<GradientText>Gradient in motion</GradientText>`,
		},
		{
			label: "With an animated pill rim",
			code: `<GradientText showBorder>New</GradientText>`,
		},
		{
			label: "Custom colors, faster flow",
			code: `<GradientText colors={["#ff8a00", "#e52e71", "#ff8a00"]} speed={5}>Sale</GradientText>`,
		},
	],
	api: [
		{
			name: "children",
			type: "ReactNode",
			required: true,
			description: "The inline content filled with the gradient.",
		},
		{
			name: "colors",
			type: "readonly string[]",
			default: "[--fr-accent, --fr-iris, --fr-blue]",
			description: "Gradient stops, left to right (first is auto-duplicated for a seamless loop).",
		},
		{
			name: "speed",
			type: "number",
			default: "8",
			description: "Seconds for one flow sweep (eases back and forth).",
		},
		{ name: "showBorder", type: "boolean", default: "false", description: "Draw an animated gradient pill rim." },
		{ name: "disabled", type: "boolean", default: "false", description: "Freeze the gradient and never animate." },
		{ name: "className", type: "string", description: "Extra classes (size, weight, tracking)." },
	],
};

export const textShineEntries: readonly ShowcaseEntry[] = [
	{ id: "shiny-text", name: "ShinyText", Component: ShinyTextEntry, docs: shinyTextDocs },
	{ id: "gradient-text", name: "GradientText", Component: GradientTextEntry, docs: gradientTextDocs },
];
