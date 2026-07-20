import { registerDockPanel, renderDockPanel, useActiveInsight } from "../features/command-dock";
import { DockContextView, DockMcpView, DockSessionView, DockToolsView, DockUsageView } from "./dock-views";

// Insight commands subscribe to the shared "Insights" dock tab by registering
// their own UI here. Adding a command = one registration line + its render-kind
// mapping in command-dock; no new tab.
registerDockPanel("usage", { tab: "insights", render: () => <DockUsageView /> });
registerDockPanel("context", { tab: "insights", render: () => <DockContextView /> });
registerDockPanel("tools", { tab: "insights", render: () => <DockToolsView /> });
registerDockPanel("session", { tab: "insights", render: () => <DockSessionView /> });
registerDockPanel("mcp", { tab: "insights", render: () => <DockMcpView /> });

/** The shared Insights dock tab: renders whichever insight command is active. */
export function DockInsights() {
	const panel = renderDockPanel(useActiveInsight(), undefined);
	if (panel) return panel;
	return (
		<div className="px-3 py-4 font-secondary text-fr-xs text-fr-text-3">
			Run /usage, /context, /tools, /session, or /mcp to fill this panel.
		</div>
	);
}
