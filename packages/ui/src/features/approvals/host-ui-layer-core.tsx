// HostUiLayer + HostUiDock — render host-UI requests through the surface
// renderer registry, split by the registration's `placement`:
//   - "modal" registrations (input/editor → HostUiDialog, unknown kinds →
//     FallbackSurface) render in the modal layer.
//   - "docked" registrations (the question-shaped select/permission/confirm →
//     the shared AskPicker) render in the dock above the composer.
// The chrome directives (notify/status/widget/title/editorText/reset) are not
// surfaces — other reducers consume them — so both mounts skip them. Which kind
// docks is decided by the registry (realms re-place a kind by registering it
// with a different placement), not by a hardcoded kind set.
//
// `ConnectedHostUiLayer` / `ConnectedSelectDialog` are the wired, mounted
// surfaces — mount once per session subtree; they answer through the driver.

import type { HostUiRequest as DriverHostUiRequest, HostUiResponse } from "@fraym-ai/driver";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSession } from "../../hooks/use-session";
import {
	type ResolvedSurfaceRegistration,
	resolveSurfaceRegistration,
	type SurfacePlacement,
	type SurfaceRendererMap,
	type SurfaceRenderInput,
	surfaceKey,
	useSurfaceRendererMap,
} from "../../registries/surface-renderer-registry";
import { hostUiInstanceKey } from "./select-request-picker";

/** Host-UI kinds consumed by chrome/notice reducers, never rendered as surfaces. */
const CHROME_KINDS = new Set<DriverHostUiRequest["kind"]>([
	"notify",
	"status",
	"widget",
	"title",
	"editorText",
	"reset",
]);

interface PlacedSurface {
	readonly input: Extract<SurfaceRenderInput, { channel: "hostUi" }>;
	readonly registration: ResolvedSurfaceRegistration;
}

/** First non-chrome request whose resolved registration has the given placement. */
function activeSurface(
	requests: readonly DriverHostUiRequest[],
	renderers: SurfaceRendererMap,
	placement: SurfacePlacement,
): PlacedSurface | null {
	for (const request of requests) {
		if (CHROME_KINDS.has(request.kind)) continue;
		const input = { channel: "hostUi", request } as const;
		const registration = resolveSurfaceRegistration(renderers, surfaceKey(input));
		if (registration.placement === placement) return { input, registration };
	}
	return null;
}

export interface HostUiLayerProps {
	readonly requests: readonly DriverHostUiRequest[];
	readonly onRespond: (response: HostUiResponse) => void;
	readonly renderers: SurfaceRendererMap;
}

export function HostUiLayer({ requests, onRespond, renderers }: HostUiLayerProps) {
	const active = activeSurface(requests, renderers, "modal");
	if (!active) return null;
	return <>{active.registration.render(active.input, { respond: onRespond })}</>;
}

/** Driver-wired host-UI layer: reads `hostUiRequests`, renders via the registry. */
export function ConnectedHostUiLayer() {
	const { hostUiRequests, respondToHostUiRequest } = useSession();
	const renderers = useSurfaceRendererMap();
	return (
		<HostUiLayer
			requests={hostUiRequests}
			onRespond={response => void respondToHostUiRequest(response)}
			renderers={renderers}
		/>
	);
}

/** How long an emptied dock lingers before unmounting. Multi-question `ask`
 * resolves one request and emits the next moments later — inside this window
 * the frame stays mounted and the height simply morphs to the next question
 * (the old close-then-reopen flash). Past it, the card collapses smoothly. */
const DOCK_LINGER_MS = 280;

/** Keep the dock frame mounted through brief empty gaps between requests. */
function useDockLinger(active: PlacedSurface | null): boolean {
	const [mounted, setMounted] = useState(active !== null);
	const hasActive = active !== null;
	useEffect(() => {
		if (hasActive) {
			setMounted(true);
			return;
		}
		const timer = setTimeout(() => setMounted(false), DOCK_LINGER_MS);
		return () => clearTimeout(timer);
	}, [hasActive]);
	return mounted || hasActive;
}

/** Measured-height wrapper: the outer box transitions `height` between the
 * inner content's sizes, so question→question swaps morph instead of jumping
 * and an emptied dock collapses to 0 before unmount. */
function DockHeight({ children }: { readonly children: ReactNode }) {
	const innerRef = useRef<HTMLDivElement | null>(null);
	const [height, setHeight] = useState<number | undefined>(undefined);
	// biome-ignore lint/correctness/useExhaustiveDependencies: [children === null] is an intentional re-run trigger, not a stale dep — the effect must re-fire on the null↔present transition to reset height to 0 and re-attach the ResizeObserver to the freshly mounted inner node. Its body reads only stable values (innerRef.current, setHeight), so empty deps would never re-run and would break the dock collapse/morph.
	useLayoutEffect(() => {
		const el = innerRef.current;
		if (!el) {
			setHeight(0);
			return;
		}
		// No ResizeObserver (test DOM / very old engine): fall back to auto height —
		// fully functional, just no morph animation.
		if (typeof ResizeObserver === "undefined") {
			setHeight(undefined);
			return;
		}
		setHeight(el.offsetHeight);
		const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
		observer.observe(el);
		return () => observer.disconnect();
	}, [children === null]);
	return (
		<div
			data-slot="host-ui-dock-height"
			className="overflow-hidden"
			style={height !== undefined ? { height } : undefined}
		>
			{children !== null && <div ref={innerRef}>{children}</div>}
		</div>
	);
}

/** Presentational dock: the first "docked" registration renders above the composer. */
export function HostUiDock({ requests, onRespond, renderers }: HostUiLayerProps): ReactNode {
	const active = activeSurface(requests, renderers, "docked");
	const mounted = useDockLinger(active);
	if (!mounted) return null;
	return (
		<div className="flex-none bg-fr-bg px-7 pt-2">
			<div
				data-slot="host-ui-select-dock"
				data-state={active ? "open" : "closing"}
				className="relative mx-auto max-w-[780px] rounded-[14px] border border-fr-border bg-fr-surface shadow-[0_16px_44px_-12px_rgba(0,0,0,0.45)]"
			>
				<DockHeight>
					{active ? (
						<div data-slot="host-ui-dock-swap" key={hostUiInstanceKey(active.input.request)} className="p-3">
							{active.registration.render(active.input, { respond: onRespond })}
						</div>
					) : null}
				</DockHeight>
			</div>
		</div>
	);
}

/** Docked host-UI surface — select / permission / confirm (and any registration with `placement: "docked"`) ride the same dock above the composer. */
export function ConnectedSelectDialog() {
	const { hostUiRequests, respondToHostUiRequest } = useSession();
	const renderers = useSurfaceRendererMap();
	return (
		<HostUiDock
			requests={hostUiRequests}
			onRespond={response => void respondToHostUiRequest(response)}
			renderers={renderers}
		/>
	);
}
