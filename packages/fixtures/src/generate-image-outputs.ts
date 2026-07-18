// generate_image fixtures — realistic ImageGenToolDetails-shaped output per variation.
// Uses a visible SVG landscape for the generated images so they render clearly in the card.

export type GenerateVariation = "normal" | "edit" | "no-images" | "error";

// A simple visible SVG landscape: blue sky + yellow sun + green ground
const VISIBLE_SVG_BASE64 =
	"PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAgMTIwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzRhOTBkOSIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iNDAiIHI9IjMwIiBmaWxsPSIjZmZkNzAwIi8+PHJlY3QgeT0iODAiIHdpZHRoPSIxNjAiIGhlaWdodD0iNDAiIGZpbGw9IiMyZDhhNGUiLz48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iMC4zIi8+PC9zdmc+Cg==";

// A different SVG for the second image (darker sky, rolling hill, sun on right)
const VISIBLE_SVG2_BASE64 =
	"PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAgMTIwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzJjODdmMCIvPjxjaXJjbGUgY3g9IjExMCIgY3k9IjMwIiByPSIyNSIgZmlsbD0iI2ZmZDcwMCIvPjxyZWN0IHk9IjgwIiB3aWR0aD0iMTYwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMjE2OTNmIi8+PHBhdGggZD0iTTAgODAgUTUwIDYwIDgwIDc1IFExMTAgOTAgMTYwIDcwIEwxNjAgODAgWiIgZmlsbD0iIzNhOWQ1ZSIgb3BhY2l0eT0iMC42Ii8+PC9zdmc+Cg==";

export const OUTPUT: Record<GenerateVariation, string> = {
	normal: "Generated 2 images of a mountain landscape at sunset.",
	edit: "Edited the input image by adding a dramatic sky and adjusting the lighting.",
	"no-images": "No image data returned.",
	error: "Error: No image API credentials found. Use a GPT Responses/Codex model with OpenAI credentials.",
};

export const DETAILS: Record<GenerateVariation, Record<string, unknown> | null> = {
	normal: {
		provider: "openai",
		model: "dall-e-3",
		imageCount: 2,
		imagePaths: ["/tmp/gen-img-1.svg", "/tmp/gen-img-2.svg"],
		// Single preview for the card header (same path inspect_image uses)
		imagePreview: { data: VISIBLE_SVG_BASE64, mimeType: "image/svg+xml" },
		images: [
			{ data: VISIBLE_SVG_BASE64, mimeType: "image/svg+xml" },
			{ data: VISIBLE_SVG2_BASE64, mimeType: "image/svg+xml" },
		],
		revisedPrompt:
			"A serene mountain landscape at golden hour, with snow-capped peaks reflecting in an alpine lake, surrounded by pine forests — ultra-realistic, 8K, cinematic lighting",
		responseText: "Here are two variations of the mountain landscape at sunset.",
		usage: { totalTokens: 1200 },
	},
	edit: {
		provider: "gemini",
		model: "gemini-3-pro-image-preview",
		imageCount: 1,
		imagePaths: ["/tmp/gen-img-edit.svg"],
		images: [{ data: VISIBLE_SVG_BASE64, mimeType: "image/svg+xml" }],
		responseText: "Edited the image with a dramatic sky and adjusted lighting for a more cinematic feel.",
	},
	"no-images": {
		provider: "openai",
		model: "gpt-4o",
		imageCount: 0,
		imagePaths: [],
		images: [],
		responseText: "No image data returned.",
	},
	error: null,
};

export const INPUT: Record<GenerateVariation, Record<string, unknown>> = {
	normal: {
		subject: "a mountain landscape at sunset",
		scene: "alpine lake with pine forest",
		style: "cinematic, ultra-realistic",
		aspect_ratio: "16:9",
		image_size: "1536x1024",
	},
	edit: {
		subject: "a photograph of a city skyline",
		changes: ["Add a dramatic sunset sky", "Adjust lighting for more contrast"],
		aspect_ratio: "16:9",
	},
	"no-images": {
		subject: "an abstract painting",
		style: "abstract, watercolor",
	},
	error: {
		subject: "a fantasy castle",
	},
};
