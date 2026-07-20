import { Scrim } from "../../elements/popover";
import { Toggle } from "../../elements/toggle";
import { Icon } from "../../icons";
import { BodyPortal } from "../../lib/body-portal";
import { cn } from "../../lib/cn";

export interface McpServerTool {
	readonly name: string;
	readonly description?: string;
}

export interface McpServer {
	readonly logo: string;
	readonly bg: string;
	readonly fg: string;
	readonly name: string;
	/** Transport kind (e.g. "stdio", "http") — was mis-named `tools` historically. */
	readonly transport: string;
	readonly desc: string;
	readonly on: boolean;
	/** Cached tool list (name + description) from the last successful connect.
	 *  `undefined` when this server has never been connected. */
	readonly toolList?: readonly McpServerTool[];
}

export interface McpModalProps {
	readonly servers: readonly McpServer[];
	readonly onToggle?: (name: string) => void;
	readonly onClose: () => void;
	readonly className?: string;
}

/**
 * The MCP server cards + empty state, shared by the palette modal and the
 * /mcp dock panel so both render identical rows. `onToggle` omitted → toggles
 * render read-only (disabled).
 */
export function McpServerList({
	servers,
	onToggle,
	className,
}: {
	readonly servers: readonly McpServer[];
	readonly onToggle?: (name: string) => void;
	readonly className?: string;
}) {
	return (
		<div className={className}>
			{servers.map(s => (
				<div key={s.name} className="mt-2 flex items-center gap-3 rounded-[11px] border border-fr-border-soft p-3">
					<div
						className="flex size-9 shrink-0 items-center justify-center rounded-[9px] font-secondary text-sm font-semibold"
						style={{ background: s.bg, color: s.fg }}
					>
						{s.logo}
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2 text-fr-base font-semibold">
							{s.name}
							<span className="rounded-[5px] bg-fr-surface-2 px-1.5 py-px font-secondary text-fr-2xs font-normal text-fr-text-3">
								{s.transport}
							</span>
						</div>
						<div className="mt-px text-xs text-fr-text-2">{s.desc}</div>
					</div>
					<Toggle
						checked={s.on}
						onCheckedChange={onToggle ? () => onToggle(s.name) : undefined}
						disabled={!onToggle}
						className={!onToggle ? "cursor-not-allowed opacity-55" : undefined}
					/>
				</div>
			))}
			{servers.length === 0 && (
				<div className="px-2 py-8 text-center text-fr-base text-fr-text-3">
					No MCP servers are reported by this engine yet.
				</div>
			)}
		</div>
	);
}

export function McpModal({ servers, onToggle, onClose, className }: McpModalProps) {
	return (
		<BodyPortal>
			<Scrim dim onClick={onClose} />
			<div
				data-slot="mcp-modal"
				className={cn(
					"fixed left-1/2 top-1/2 z-50 flex max-h-[82vh] w-[620px] max-w-[94vw] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-fr-border bg-fr-surface shadow-[0_30px_90px_rgba(0,0,0,0.6)] animate-[fr-pop-in_0.12s_ease]",
					className,
				)}
			>
				<div className="flex items-center gap-[11px] border-b border-fr-border-soft px-5 py-[18px]">
					<div className="flex size-[30px] items-center justify-center rounded-md bg-fr-accent-dim text-fr-accent">
						<Icon name="shield" size={16} strokeWidth={1.8} />
					</div>
					<div>
						<h2 className="font-display text-fr-lg font-semibold">MCP &amp; Plugins</h2>
						<div className="text-xs text-fr-text-3">Connect tools and data sources to Fraym</div>
					</div>
					<button type="button" className="ml-auto text-fr-text-3 hover:text-fr-text" onClick={onClose}>
						<Icon name="x" size={18} strokeWidth={2} />
					</button>
				</div>
				<McpServerList servers={servers} onToggle={onToggle} className="overflow-y-auto px-3.5 py-2.5 pb-4" />
			</div>
		</BodyPortal>
	);
}
