export const FRAYM_SHELL_COMMAND_EVENT = "fraym:shell-command";

export const FRAYM_NAVIGATION_STATE_EVENT = "fraym:navigation-state";

export interface FraymNavigationState {
	readonly canGoBack: boolean;
	readonly canGoForward: boolean;
}

export const FRAYM_SHELL_COMMANDS = [
	"new-session",
	"new-worktree-session",
	"refresh-sessions",
	"search-sessions",
	"open-command-palette",
	"open-settings",
	"open-settings-general",
	"open-settings-appearance",
	"open-settings-keyboard",
	"open-mcp-menu",
	"show-app",
	"go-back",
	"go-forward",
	"mode-chat",
	"mode-studio",
	"mode-code",
	"toggle-sidebar",
	"toggle-rail-compact",
	"toggle-dock",
	"open-dock-plan",
	"open-dock-diff",
	"open-dock-terminal",
	"open-dock-files",
	"open-dock-tasks",
	"compact-session",
	"cancel-run",
] as const;

export type FraymShellCommand = (typeof FRAYM_SHELL_COMMANDS)[number];

const COMMAND_SET: ReadonlySet<string> = new Set(FRAYM_SHELL_COMMANDS);

export function isFraymShellCommand(value: unknown): value is FraymShellCommand {
	return typeof value === "string" && COMMAND_SET.has(value);
}

export function dispatchFraymShellCommand(target: EventTarget, command: FraymShellCommand): boolean {
	return target.dispatchEvent(new CustomEvent(FRAYM_SHELL_COMMAND_EVENT, { detail: command }));
}

export function dispatchFraymNavigationState(target: EventTarget, state: FraymNavigationState): boolean {
	return target.dispatchEvent(new CustomEvent(FRAYM_NAVIGATION_STATE_EVENT, { detail: state }));
}
