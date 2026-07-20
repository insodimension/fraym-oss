import type { ModeState } from "@fraym/driver";
import type { IconName } from "../../icons";
import type { ModePillItem } from "./mode-pills";

/**
 * The engine's built-in "fast" serving mode id (Engine publishes it via
 * `publishModeState("fast", …)`). It is the ONE mode-state entry the shell
 * special-cases instead of rendering as a generic pill: the workspace composer
 * EXCLUDES it from `genericModes` and the model slot renders it as a bolt
 * indicator. Both sites reference this constant so the special-cased id lives in
 * one place and cannot drift out of lock-step.
 */
export const FAST_MODE_ID = "fast";

/**
 * Leading icons for well-known engine mode ids. The wire `ModeState` carries no
 * icon (the engine stays presentation-agnostic); unknown modes simply render
 * without one, so a brand-new mode still needs zero Fraym code.
 */
const MODE_ICONS: Readonly<Record<string, IconName>> = {
	loop: "refresh",
	advisor: "eye",
	plan: "list",
};

/**
 * Adapt the engine's generic `ModeState[]` (the `mode_state_changed` /
 * `modeStateChanged` wire shape — see `mode-state.ts` on the Engine side) into
 * `ModePillItem[]` for `ModePills`. This is the ONE place a brand-new engine
 * mode crosses into Fraym-specific UI callbacks; the mode itself never needs
 * bespoke Fraym code — closing a pill just resubmits its `closeCommand`,
 * identical to the user typing it.
 */
export function modeStatesToPillItems(
	modes: readonly ModeState[],
	dispatchCommand: (text: string) => void,
): ModePillItem[] {
	return modes.map(mode => ({
		id: mode.id,
		// `ModePillItem` has no dedicated status slot; fold it into the label
		// text rather than extend the pill's visual design for this channel.
		label: mode.status ? `${mode.label} — ${mode.status}` : mode.label,
		icon: MODE_ICONS[mode.id],
		tone: mode.tone,
		onClose: mode.closeable && mode.closeCommand ? () => dispatchCommand(mode.closeCommand as string) : undefined,
	}));
}
