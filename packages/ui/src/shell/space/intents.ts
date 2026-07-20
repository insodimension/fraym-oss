import type { ShellRoute, SpaceId, SurfaceId } from "./space-state";

/** The ONLY mutation of shell navigation state: a typed message an
 *  implementation emits; the executor is the single writer (doc 44 §5).
 *
 *  Step ① carries exactly the intents with a live consumer — the navigation
 *  subset collapsing the retired View/PersonalView/StudioView enums. Later
 *  steps extend the union as each new intent gains a real consumer
 *  (dock.open/close · split · pane.* · session.submit): the
 *  decorative-declaration law (doc 44 §13) forbids declaring them early. */
export type ShellIntent =
	/** Mint the space's unit of work (session · run · thread) and land on the
	 *  session surface. Session creation itself is the caller's side effect —
	 *  the executor owns only where navigation goes. */
	| { readonly t: "create" }
	/** Mount a workspace surface when the active space permits it. */
	| { readonly t: "mount"; readonly surface: SurfaceId }
	| { readonly t: "door"; readonly route: Exclude<ShellRoute, "app">; readonly pane?: string }
	/** Leave a door's route takeover back to the workspace. */
	| { readonly t: "door.close" }
	/** Switch the active space and preserve each space's selected surface. */
	| { readonly t: "space.switch"; readonly space: SpaceId };
