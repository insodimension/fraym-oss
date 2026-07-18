// inspect_image fixtures — realistic output with a visible image preview for the card.

export type InspectVariation = "normal" | "no-question" | "empty" | "error";

// A simple visible SVG landscape: blue sky + yellow sun + green ground
const VISIBLE_SVG_BASE64 =
	"PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAgMTIwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzRhOTBkOSIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iNDAiIHI9IjMwIiBmaWxsPSIjZmZkNzAwIi8+PHJlY3QgeT0iODAiIHdpZHRoPSIxNjAiIGhlaWdodD0iNDAiIGZpbGw9IiMyZDhhNGUiLz48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxNSIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iMC4zIi8+PC9zdmc+Cg==";

export const OUTPUT: Record<InspectVariation, string> = {
	normal: [
		"The image shows a simple landscape scene rendered as an SVG graphic. The composition includes:",
		"",
		"- A blue sky background (#4a90d9) filling the upper portion",
		"- A large golden-yellow circle (sun) positioned center-left at approximately (80, 40) with radius 30",
		"- A smaller white semi-transparent circle (cloud) at (30, 30)",
		"- A green ground area (#2d8a4e) covering the bottom third starting at y=80",
		"",
		"The overall composition is minimal and geometric, using basic shapes with flat colors.",
	].join("\n"),
	"no-question": [
		"This is a simple graphical scene with a blue sky, a yellow sun, a white cloud, and green ground.",
	].join("\n"),
	empty: "",
	error: "Error: Image file not found at path 'nonexistent.png'. Check that the file exists and is a supported format (PNG, JPEG, GIF, WEBP).",
};

export const DETAILS: Record<InspectVariation, Record<string, unknown> | null> = {
	normal: {
		model: "gpt-4o",
		imagePath: "/screenshots/landscape.svg",
		mimeType: "image/svg+xml",
		imagePreview: { data: VISIBLE_SVG_BASE64, mimeType: "image/svg+xml" },
	},
	"no-question": {
		model: "atlas-3-opus",
		imagePath: "/screenshots/landscape.svg",
		mimeType: "image/svg+xml",
		imagePreview: { data: VISIBLE_SVG_BASE64, mimeType: "image/svg+xml" },
	},
	empty: {
		model: "gpt-4o-mini",
		imagePath: "/images/empty.png",
		mimeType: "image/png",
	},
	error: null,
};

export const INPUT: Record<InspectVariation, Record<string, unknown>> = {
	normal: { path: "/screenshots/landscape.svg", question: "Describe the composition and colors in this image." },
	"no-question": { path: "/screenshots/landscape.svg", question: "" },
	empty: { path: "/images/empty.png", question: "What's in this image?" },
	error: { path: "nonexistent.png", question: "What does this show?" },
};
