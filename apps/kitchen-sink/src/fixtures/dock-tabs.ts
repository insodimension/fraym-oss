import type { DockTab } from "@fraym/ui";

export const DOCK_TABS_FULL: readonly DockTab[] = [
	{ id: "plan", label: "Plan", icon: "list" },
	{ id: "diff", label: "Diff", icon: "diff" },
	{ id: "terminal", label: "Terminal", icon: "terminal" },
	{ id: "files", label: "Files", icon: "folder" },
	{ id: "tasks", label: "Tasks", icon: "grid", badge: 2 },
	{ id: "preview", label: "Preview", icon: "eye" },
];

export const DOCK_TABS_PLAIN: readonly DockTab[] = [
	{ id: "plan", label: "Plan", icon: "list" },
	{ id: "diff", label: "Diff", icon: "diff" },
	{ id: "terminal", label: "Terminal", icon: "terminal" },
	{ id: "files", label: "Files", icon: "folder" },
	{ id: "tasks", label: "Tasks", icon: "grid" },
	{ id: "preview", label: "Preview", icon: "eye" },
];

export const DOCK_TABS_MINI: readonly DockTab[] = [
	{ id: "plan", label: "Plan", icon: "list" },
	{ id: "diff", label: "Diff", icon: "diff", badge: 3 },
	{ id: "preview", label: "Preview", icon: "globe" },
];

