import type { IconName } from "../icons/paths";
import type { SettingsNavItem } from "../pages";

/** A space's id on the wire. The set is open so host applications can contribute
 * additional spaces without changing the shell's navigation type. */
export type AppMode = string;
export type MenuType = "palette" | "model" | "perm" | "context" | "mcp" | "user" | "filter" | "dock" | null;

export interface MenuState {
	readonly type: MenuType;
	readonly rect: DOMRect | null;
	/** Set when the filter menu is opened from a project group's gear: scopes the
	 *  menu (and the session list) to this project and hides the project/group-by rows. */
	readonly project?: string;
}

export type { ProjectFilterOverride, ProjectFilters, SessionFilters } from "@fraym-ai/config";

export interface FraymSettingsPanelActions {
	readonly onOpenModels?: () => void;
}

export interface FraymSettingsPanel {
	readonly id: string;
	readonly label: string;
	readonly icon: SettingsNavItem["icon"];
	readonly render: (actions?: FraymSettingsPanelActions) => React.ReactNode;
}

export type RailActionTarget = "new-session" | "settings" | "surface";

/** A rail action button. `target` is the page/handler it opens. A deployment
 *  profile supplies its own ordered list (default `DEFAULT_RAIL_ACTIONS`) to add,
 *  remove, or reroute rail actions — no hardcoded conditions in the component. */
export interface RailActionDef {
	readonly id: string;
	readonly label: string;
	readonly icon: IconName;
	readonly target: RailActionTarget;
	/** Surface id mounted by `target: "surface"`. */
	readonly surface?: string;
	readonly kbd?: string;
	readonly primary?: boolean;
	readonly disabled?: boolean;
}
