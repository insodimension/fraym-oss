import { createContext, type ReactNode, use } from "react";
import type { McpServer } from "../mcp-modal";

export interface DockMcpState {
	readonly servers: readonly McpServer[];
	readonly onToggle: (name: string) => void;
}

const DockMcpContext = createContext<DockMcpState | null>(null);

/**
 * Live MCP servers (engine resource snapshot) + enable/disable toggle for the
 * `/mcp` dock panel, alongside the sibling dock-data contexts (usage-state,
 * active-insight). The panel binds to engine state, never to `/mcp`'s output
 * text (LAW 2).
 */
export function DockMcpProvider({ value, children }: { readonly value: DockMcpState; readonly children: ReactNode }) {
	return <DockMcpContext.Provider value={value}>{children}</DockMcpContext.Provider>;
}

export function useDockMcp(): DockMcpState | null {
	return use(DockMcpContext);
}
