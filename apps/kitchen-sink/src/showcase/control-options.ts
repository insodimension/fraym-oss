// Shared control-knob option lists for showcase entries. These mirror the
// `@fraym/ui` surface unions so a single source drives every entry's
// `useControls` select options (and the inline casts stay type-checked).

import type { ComposerControlTone, FraymDensity, FraymSurfacePlacement } from "@fraym/ui";

export const DENSITY_OPTIONS = ["compact", "comfortable", "spacious"] as const satisfies readonly FraymDensity[];

export const SURFACE_PLACEMENT_OPTIONS = [
	"inline",
	"dock",
	"modal",
	"bottom",
	"hidden",
] as const satisfies readonly FraymSurfacePlacement[];

// Active-work strip lives along the bottom edge and never opens as a modal.
export const STRIP_PLACEMENT_OPTIONS = [
	"bottom",
	"inline",
	"dock",
	"hidden",
] as const satisfies readonly FraymSurfacePlacement[];

export const CONTROL_TONE_OPTIONS = [
	"default",
	"accent",
	"add",
	"warn",
	"del",
	"blue",
] as const satisfies readonly ComposerControlTone[];

export const CONTROL_TONE_WITH_MUTE_OPTIONS = [
	"accent",
	"add",
	"blue",
	"warn",
	"mute",
	"del",
] as const satisfies readonly (ComposerControlTone | "mute")[];

