import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge about the Fraym design tokens. Without this it can't tell
// a font-size token (`text-fr-base`) from a text-color token (`text-fr-add`) —
// it sees both as `text-*` and drops one. Registering the groups keeps a size and
// a color coexisting, the way arbitrary `text-[13px]` + `text-fr-add` used to.
const twMerge = extendTailwindMerge({
	extend: {
		classGroups: {
			"font-size": [
				{ text: ["fr-2xs", "fr-xs", "fr-sm", "fr-base", "fr-md", "fr-lg", "fr-xl", "fr-2xl", "fr-3xl"] },
			],
			"text-color": [
				{
					text: [
						"fr-text",
						"fr-text-2",
						"fr-text-3",
						"fr-accent",
						"fr-accent-2",
						"fr-accent-ink",
						"fr-add",
						"fr-del",
						"fr-warn",
						"fr-blue",
						"fr-iris",
					],
				},
			],
			tracking: [{ tracking: ["fr-tight", "fr-label", "fr-caps"] }],
			"font-family": [{ font: ["primary", "display"] }],
		},
	},
});

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
