import type { DocProp } from "../showcase/docs";

// A dark, token-tinted panel that hosts one background layer. The layers paint
// additive light over a transparent canvas, so the box keeps `bg-fr-bg` and the
// effect re-tints when the kitchen-sink header switches theme.
export const STAGE = "relative h-[360px] w-full overflow-hidden rounded-xl border border-fr-border bg-fr-bg";

// className / fps / renderScale are provided by the shared ShaderBackground host
// and documented identically on every background.
export const SHARED_HOST_PROPS: readonly DocProp[] = [
	{
		name: "className",
		type: "string",
		description: "Passed to the absolutely-positioned canvas. Mount inside a `relative overflow-hidden` ancestor.",
	},
	{
		name: "fps",
		type: "number",
		default: "30",
		description: "Frame cap on the shared ShaderBackground host.",
	},
	{
		name: "renderScale",
		type: "number",
		description: "Backing-store downsample (heavy shaders render smaller, then upscale).",
	},
];

// The optional pointer-follow prop some shader backgrounds expose. Append after
// SHARED_HOST_PROPS so the host props stay in a consistent order.
export const FOLLOW_MOUSE_HOST_PROP: DocProp = {
	name: "followMouse",
	type: "boolean",
	default: "false",
	description: "React to the pointer via the host's smoothed mouse uniform.",
};

