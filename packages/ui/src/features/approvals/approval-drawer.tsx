// ApprovalDrawer — web-native tool-permission gate.
//
// Better-UX-than-TUI: instead of a blocking terminal selector, a side-sheet
// shows the gated tool, the exact paths/locations it would touch, and the
// allow/deny options with keyboard focus. Answering posts a `HostUiResponse`
// back through the driver (`optionId` or `cancelled`).

import type { HostUiResponse, PermissionLocation, PermissionOption } from "@fraym/driver";
import { Button } from "../../elements/button";
import { Icon } from "../../icons";
import { cn } from "../../lib/cn";

export interface ApprovalDrawerRequest {
	readonly requestId: string;
	readonly toolName: string;
	readonly title: string;
	readonly paths?: readonly string[];
	readonly locations?: readonly PermissionLocation[];
	readonly options: readonly PermissionOption[];
}

export interface ApprovalDrawerProps {
	readonly request: ApprovalDrawerRequest;
	readonly onRespond: (response: HostUiResponse) => void;
	readonly className?: string;
}

function isReject(kind: PermissionOption["kind"]): boolean {
	return kind === "reject_once" || kind === "reject_always";
}

export function ApprovalDrawer({ request, onRespond, className }: ApprovalDrawerProps) {
	const locations = request.locations ?? request.paths?.map(path => ({ path }) as PermissionLocation) ?? [];
	return (
		<div data-slot="approval-drawer" className="fixed inset-0 z-[1000] flex justify-end">
			<button
				type="button"
				aria-label="Dismiss"
				className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
				onClick={() => onRespond({ requestId: request.requestId, cancelled: true })}
			/>
			<aside
				role="dialog"
				aria-modal={true}
				aria-label={request.title}
				className={cn(
					"relative flex h-full w-[min(420px,90vw)] flex-col border-l border-fr-border bg-fr-surface shadow-xl",
					"animate-[fr-rise_0.18s_ease]",
					className,
				)}
			>
				<header className="flex items-center gap-2 border-b border-fr-border-soft px-4 py-3">
					<span className="flex size-7 items-center justify-center rounded-md bg-fr-add-bg text-fr-add">
						<Icon name="shield" size={15} strokeWidth={1.9} />
					</span>
					<div className="min-w-0">
						<div className="fr-overflow text-fr-base font-semibold text-fr-text">{request.title}</div>
						<div className="fr-overflow font-secondary text-fr-xs text-fr-text-3">{request.toolName}</div>
					</div>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
					{locations.length > 0 && (
						<>
							<div className="mb-1.5 text-fr-xs font-medium uppercase tracking-wide text-fr-text-3">
								Affected files
							</div>
							<ul className="grid gap-1">
								{locations.map((loc, i) => (
									<li key={i} className="flex items-center gap-2 font-secondary text-fr-xs text-fr-text-2">
										<Icon name="file" size={12} strokeWidth={1.8} className="shrink-0 text-fr-text-3" />
										<span className="fr-overflow" style={{ color: "var(--fr-code-path)" }}>
											{loc.path}
										</span>
										{loc.line !== undefined && <span className="ml-auto text-fr-text-3">:{loc.line}</span>}
									</li>
								))}
							</ul>
						</>
					)}
				</div>

				<footer className="grid gap-2 border-t border-fr-border-soft px-4 py-3">
					{request.options.map(option => (
						<Button
							key={option.optionId}
							variant={isReject(option.kind) ? "outline" : "default"}
							className={cn("w-full justify-start", isReject(option.kind) && "text-fr-del")}
							onClick={() => onRespond({ requestId: request.requestId, optionId: option.optionId })}
						>
							{option.name}
						</Button>
					))}
				</footer>
			</aside>
		</div>
	);
}
