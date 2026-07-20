import type { RefObject } from "react";
import type { RailMode } from "../components/app-shell";
import { type FraymShellCommand, isFraymShellCommand } from "./commands";
import type { AppMode, MenuState } from "./types";

type StateSetter<T> = (next: T | ((current: T) => T)) => void;

interface ShellCommandProps {
	readonly onNewSession?: () => void;
	readonly onNewWorktreeSession?: () => void;
	readonly onRefreshSessions?: () => void;
}

interface ShellCommandSession {
	readonly compact: () => unknown;
	readonly cancelRun: () => unknown;
}

interface ShellCommandChrome {
	readonly openDoor: (route: "settings") => void;
	readonly leaveToWorkspace: () => void;
	readonly goBack: () => void;
	readonly goForward: () => void;
	readonly setAppMode: (mode: AppMode) => void;
	readonly setSettingsPane: (pane: string) => void;
	readonly setAllSettingsOpen: (open: boolean) => void;
	readonly setRailMode: StateSetter<RailMode>;
	readonly toggleRailCompact: () => void;
	readonly setDockOpen: StateSetter<boolean>;
	readonly setDockTab: (tab: string) => void;
}

interface ShellCommandMenu {
	readonly openPalette: () => void;
	readonly openSettings: () => void;
	readonly setMenu: (menu: MenuState) => void;
}

interface ShellCommandSearch {
	readonly setSessionSearchOpen: (open: boolean) => void;
	readonly searchInputRef: RefObject<HTMLInputElement | null>;
}

export interface ShellCommandActions {
	readonly props: ShellCommandProps;
	readonly session: ShellCommandSession | null | undefined;
	readonly chrome: ShellCommandChrome;
	readonly menu: ShellCommandMenu;
	readonly search: ShellCommandSearch;
}

type ShellCommandRunner = (command: FraymShellCommand, actions: ShellCommandActions) => boolean;

const SETTINGS_COMMAND_PANES: Partial<Record<FraymShellCommand, string>> = {
	"open-settings-general": "general",
	"open-settings-appearance": "appearance",
	"open-settings-keyboard": "keyboard",
};

const MODE_COMMANDS: Partial<Record<FraymShellCommand, AppMode>> = {
	"mode-chat": "chat",
	"mode-studio": "studio",
	"mode-code": "code",
};

const DOCK_COMMAND_TABS: Partial<Record<FraymShellCommand, string>> = {
	"open-dock-plan": "plan",
	"open-dock-diff": "ide",
	"open-dock-terminal": "terminal",
	"open-dock-files": "ide",
	"open-dock-tasks": "tasks",
};

function openSettingsPane(chrome: ShellCommandChrome, pane: string) {
	chrome.setSettingsPane(pane);
	chrome.openDoor("settings");
	chrome.setAllSettingsOpen(false);
}

function openDock(chrome: ShellCommandChrome, tab: string) {
	chrome.leaveToWorkspace();
	chrome.setAppMode("code");
	chrome.setDockOpen(true);
	chrome.setDockTab(tab);
}

function showSessionSearch(chrome: ShellCommandChrome, search: ShellCommandSearch) {
	chrome.leaveToWorkspace();
	search.setSessionSearchOpen(true);
	window.requestAnimationFrame(() => search.searchInputRef.current?.focus());
}

function runSettingsCommand(command: FraymShellCommand, chrome: ShellCommandChrome): boolean {
	const pane = SETTINGS_COMMAND_PANES[command];
	if (!pane) return false;
	openSettingsPane(chrome, pane);
	return true;
}

function runModeCommand(command: FraymShellCommand, chrome: ShellCommandChrome): boolean {
	const mode = MODE_COMMANDS[command];
	if (!mode) return false;
	chrome.leaveToWorkspace();
	chrome.setAppMode(mode);
	return true;
}

function runDockCommand(command: FraymShellCommand, chrome: ShellCommandChrome): boolean {
	const tab = DOCK_COMMAND_TABS[command];
	if (!tab) return false;
	openDock(chrome, tab);
	return true;
}

function runMenuCommand(command: FraymShellCommand, menu: ShellCommandMenu): boolean {
	if (command === "open-command-palette") menu.openPalette();
	else if (command === "open-settings") menu.openSettings();
	else if (command === "open-mcp-menu") menu.setMenu({ type: "mcp", rect: null });
	else return false;
	return true;
}

function runSessionCommand(command: FraymShellCommand, actions: ShellCommandActions): boolean {
	if (command === "new-session") actions.props.onNewSession?.();
	else if (command === "new-worktree-session") actions.props.onNewWorktreeSession?.();
	else if (command === "refresh-sessions") actions.props.onRefreshSessions?.();
	else if (command === "search-sessions") showSessionSearch(actions.chrome, actions.search);
	else if (command === "compact-session") void actions.session?.compact();
	else if (command === "cancel-run") void actions.session?.cancelRun();
	else return false;
	return true;
}

const DIRECT_SHELL_COMMANDS: Partial<Record<FraymShellCommand, (actions: ShellCommandActions) => void>> = {
	"show-app": actions => actions.chrome.leaveToWorkspace(),
	"go-back": actions => actions.chrome.goBack(),
	"go-forward": actions => actions.chrome.goForward(),
	"toggle-sidebar": actions => actions.chrome.setRailMode(mode => (mode === "hidden" ? "expanded" : "hidden")),
	"toggle-rail-compact": actions => actions.chrome.toggleRailCompact(),
	"toggle-dock": actions => {
		actions.chrome.leaveToWorkspace();
		actions.chrome.setAppMode("code");
		actions.chrome.setDockOpen(open => !open);
	},
};

function runDirectShellCommand(command: FraymShellCommand, actions: ShellCommandActions): boolean {
	const handler = DIRECT_SHELL_COMMANDS[command];
	if (!handler) return false;
	handler(actions);
	return true;
}

function runMenuShellCommand(command: FraymShellCommand, actions: ShellCommandActions): boolean {
	return runMenuCommand(command, actions.menu);
}

function runSettingsShellCommand(command: FraymShellCommand, actions: ShellCommandActions): boolean {
	return runSettingsCommand(command, actions.chrome);
}

function runModeShellCommand(command: FraymShellCommand, actions: ShellCommandActions): boolean {
	return runModeCommand(command, actions.chrome);
}

function runDockShellCommand(command: FraymShellCommand, actions: ShellCommandActions): boolean {
	return runDockCommand(command, actions.chrome);
}

const SHELL_COMMAND_RUNNERS: readonly ShellCommandRunner[] = [
	runSessionCommand,
	runMenuShellCommand,
	runSettingsShellCommand,
	runModeShellCommand,
	runDockShellCommand,
	runDirectShellCommand,
];

export function commandFromEvent(event: Event): FraymShellCommand | undefined {
	const command = (event as CustomEvent<unknown>).detail;
	return isFraymShellCommand(command) ? command : undefined;
}

export function runFraymShellCommand(command: FraymShellCommand, actions: ShellCommandActions) {
	for (const run of SHELL_COMMAND_RUNNERS) {
		if (run(command, actions)) return;
	}
}
