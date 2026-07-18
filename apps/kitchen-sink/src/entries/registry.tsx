import type { TierDef } from "../showcase/types";
import { componentsEntries } from "./components";
import { elementsEntries } from "./elements";
import { featuresEntries } from "./features";
import { guideEntries } from "./guide";
import { tokensEntries } from "./tokens";

export const TIERS: readonly TierDef[] = [
	{
		id: "guide",
		label: "Getting Started",
		intro: "Install, configure, and ship Fraym.",
		entries: guideEntries,
	},
	{
		id: "tokens",
		label: "Tokens",
		intro: "Design values — color, type, space. Knows nothing about components.",
		entries: tokensEntries,
	},
	{
		id: "elements",
		label: "Elements",
		intro: "Single-purpose building blocks; know only tokens.",
		entries: elementsEntries,
	},
	{
		id: "components",
		label: "Components",
		intro: "Domain-agnostic molecules wired from elements.",
		entries: componentsEntries,
	},
	{
		id: "features",
		label: "Features",
		intro: "Domain-aware product surfaces, most bound to the session driver.",
		entries: featuresEntries,
	},
];
