import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { LiquidGlassRuntime } from "../components/liquid-glass-runtime";
import { ToolDisplaySettingsProvider } from "../features";
import { SessionNavigationProvider } from "../hooks/session-navigation";
import { FraymFrameModel, type FraymFrameModelArgs, useFraymFrameModel } from "./fraym-frame-model";
import { FraymFrameOverlays } from "./fraym-frame-overlays";
import { FraymFrameSettingsView } from "./fraym-frame-settings";
import { FraymFrameWorkspace } from "./fraym-frame-workspace";
import { DEFAULT_SPACE_IMPLS } from "./space/impls/defaults";
import { SpaceSlotBoundary } from "./space/slot-boundary";

export interface FraymFrameProps extends FraymFrameModelArgs {}

type FrameWidthTier = "narrow" | "medium" | "wide";

function frameWidthTier(width: number): FrameWidthTier {
	if (width <= 760) return "narrow";
	if (width <= 1240) return "medium";
	return "wide";
}

function useFrameWidthTier(): { readonly ref: React.RefObject<HTMLDivElement | null>; readonly tier: FrameWidthTier } {
	const ref = useRef<HTMLDivElement | null>(null);
	const [tier, setTier] = useState<FrameWidthTier>("wide");
	useLayoutEffect(() => {
		const element = ref.current;
		if (!element || typeof ResizeObserver === "undefined") return;
		const measure = () => setTier(frameWidthTier(element.clientWidth));
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);
	return { ref, tier };
}

function FrameApp({ model }: { readonly model: FraymFrameModel }) {
	return (
		<ToolDisplaySettingsProvider settings={model.toolDisplaySettings}>
			<FraymFrameWorkspace
				{...model.workspaceProps}
				rail={
					model.workspaceOnly ? null : (
						<SpaceSlotBoundary slot="rail">
							<DEFAULT_SPACE_IMPLS.rail.component {...model.railProps} />
						</SpaceSlotBoundary>
					)
				}
			/>
			{!model.workspaceOnly && <FraymFrameOverlays {...model.overlayProps} />}
		</ToolDisplaySettingsProvider>
	);
}

function FrameRoute({ model }: { readonly model: FraymFrameModel }) {
	const { ref, tier } = useFrameWidthTier();
	return (
		<div
			ref={ref}
			data-slot="fraym-frame"
			data-frame-w={tier}
			className="relative isolate h-full min-h-0 w-full min-w-0 overflow-hidden bg-fr-bg"
		>
			<LiquidGlassRuntime />
			<FrameApp model={model} />
			{!model.workspaceOnly && model.route === "settings" ? (
				<div data-slot="fraym-route-overlay" className="absolute inset-0 z-[70] bg-fr-bg">
					<FraymFrameSettingsView {...model.settingsProps} />
				</div>
			) : null}
		</div>
	);
}

export function FraymFrame(props: FraymFrameProps) {
	const model = useFraymFrameModel(props);
	return (
		<SessionNavigationProvider openSession={props.onSessionSelect}>
			<FrameRoute model={model} />
		</SessionNavigationProvider>
	);
}
