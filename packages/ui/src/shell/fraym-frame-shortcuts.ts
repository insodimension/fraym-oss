import { useEffect } from "react";

interface FraymFrameShortcutActions {
	readonly onCloseMenu: () => void;
	readonly onOpenPalette: () => void;
	readonly onOpenSettings: () => void;
	readonly onNewSession?: () => void;
}

type ShortcutAction = Pick<FraymFrameShortcutActions, "onOpenPalette" | "onOpenSettings" | "onNewSession">;
type ShortcutId = keyof ShortcutAction;

const MOD_SHORTCUTS: Readonly<Record<string, ShortcutId>> = {
	k: "onOpenPalette",
	",": "onOpenSettings",
	n: "onNewSession",
};

function modShortcut(event: KeyboardEvent): ShortcutId | undefined {
	if (!event.metaKey && !event.ctrlKey) return undefined;
	return MOD_SHORTCUTS[event.key.toLowerCase()];
}

function runShortcut(action: ShortcutId, actions: ShortcutAction) {
	actions[action]?.();
}

export function useFraymFrameShortcuts({
	onCloseMenu,
	onOpenPalette,
	onOpenSettings,
	onNewSession,
}: FraymFrameShortcutActions) {
	useEffect(() => {
		const actions = { onOpenPalette, onOpenSettings, onNewSession };
		const handler = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onCloseMenu();
				return;
			}
			const action = modShortcut(event);
			if (!action) return;
			event.preventDefault();
			runShortcut(action, actions);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onCloseMenu, onNewSession, onOpenPalette, onOpenSettings]);
}
