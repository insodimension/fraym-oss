import { Fragment, useMemo } from "react";
import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";
import { type FraymDensity, type FraymSurfaceConfig, resolveDensity, toneClass } from "../surface-kit";

export interface StatusSegment {
	readonly id: string;
	readonly label: string;
	readonly value?: string;
	readonly icon?: IconName;
	readonly tone?: "default" | "accent" | "add" | "warn" | "del" | "blue";
	readonly active?: boolean;
	readonly hidden?: boolean;
}

export interface StatusBarProps {
	readonly segments: readonly StatusSegment[];
	readonly settings?: FraymSurfaceConfig;
	readonly onSegmentClick?: (id: string) => void;
	readonly className?: string;
}

interface StatusBarRendererProps {
	readonly className?: string;
	readonly density: FraymDensity;
	readonly onSegmentClick?: (id: string) => void;
	readonly segments: readonly StatusSegment[];
}

interface StatusSegmentButtonProps {
	readonly onSegmentClick?: (id: string) => void;
	readonly segment: StatusSegment;
}

type StatusLayout = "compact" | "comfortable" | "spacious";

const STATUS_BAR_RENDERERS = {
	compact: CompactStatusBar,
	comfortable: ComfortableStatusBar,
	spacious: SpaciousStatusBar,
};

export function StatusBar({ segments, settings, onSegmentClick, className }: StatusBarProps) {
	const density = statusDensity(settings);
	const visibleSegments = useMemo(() => visibleStatusSegments(segments), [segments]);

	if (statusHidden(settings)) return null;
	const Renderer = STATUS_BAR_RENDERERS[resolveStatusLayout(density)];
	return (
		<Renderer segments={visibleSegments} density={density} onSegmentClick={onSegmentClick} className={className} />
	);
}

function statusDensity(settings?: FraymSurfaceConfig): FraymDensity {
	return settings?.density ?? "comfortable";
}

function visibleStatusSegments(segments: readonly StatusSegment[]) {
	return segments.filter(visibleStatusSegment);
}

function visibleStatusSegment(segment: StatusSegment) {
	return !segment.hidden;
}

function statusHidden(settings?: FraymSurfaceConfig) {
	return settings?.visible === false || settings?.placement === "hidden";
}

function resolveStatusLayout(density: FraymDensity): StatusLayout {
	const d = resolveDensity(density);
	if (d.isCompact) return "compact";
	if (d.isSpacious) return "spacious";
	return "comfortable";
}

function SpaciousStatusBar({ segments, density, onSegmentClick, className }: StatusBarRendererProps) {
	return (
		<div
			data-slot="status-bar"
			data-density={density}
			className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4", className)}
		>
			{segments.map(segment => (
				<SpaciousStatusSegment key={segment.id} segment={segment} onSegmentClick={onSegmentClick} />
			))}
		</div>
	);
}

function SpaciousStatusSegment({ segment, onSegmentClick }: StatusSegmentButtonProps) {
	return (
		<button
			type="button"
			data-slot="status-segment"
			data-active={activeAttr(segment.active)}
			onClick={() => onSegmentClick?.(segment.id)}
			className={spaciousSegmentClass(segment, onSegmentClick)}
		>
			<span className="fr-eyebrow flex items-center gap-1.5">
				<StatusSegmentIcon icon={segment.icon} size={12} className="shrink-0" />
				{segment.label}
			</span>
			<SpaciousStatusValue segment={segment} />
		</button>
	);
}

function spaciousSegmentClass(segment: StatusSegment, onSegmentClick: StatusSegmentButtonProps["onSegmentClick"]) {
	return cn(
		"flex flex-col gap-1.5 rounded-[10px] border bg-fr-surface p-3 text-left transition-colors duration-[120ms]",
		activeTileClass(segment.active),
		clickableClass(onSegmentClick, "hover:border-fr-accent-line"),
	);
}

function activeTileClass(active?: boolean) {
	if (active) return "border-fr-accent-line bg-fr-accent-dim";
	return "border-fr-border-soft";
}

function SpaciousStatusValue({ segment }: { readonly segment: StatusSegment }) {
	return (
		<span className={cn("fr-overflow font-secondary text-fr-md font-semibold", valueToneClass(segment))}>
			{segment.value ?? "-"}
		</span>
	);
}

function CompactStatusBar({ segments, density, onSegmentClick, className }: StatusBarRendererProps) {
	return (
		<div
			data-slot="status-bar"
			data-density={density}
			className={cn(
				"flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1 rounded-[8px] border border-fr-border-soft bg-fr-surface px-2.5 py-1 font-secondary text-fr-2xs",
				className,
			)}
		>
			{segments.map((segment, index) => (
				<Fragment key={segment.id}>
					{index > 0 && <CompactDivider />}
					<CompactStatusSegment segment={segment} onSegmentClick={onSegmentClick} />
				</Fragment>
			))}
		</div>
	);
}

function CompactDivider() {
	return (
		<span className="select-none text-fr-text-3/50" aria-hidden>
			|
		</span>
	);
}

function CompactStatusSegment({ segment, onSegmentClick }: StatusSegmentButtonProps) {
	return (
		<button
			type="button"
			data-slot="status-segment"
			data-active={activeAttr(segment.active)}
			onClick={() => onSegmentClick?.(segment.id)}
			className={cn(
				"inline-flex items-center gap-1 leading-none text-fr-text-2",
				clickableClass(onSegmentClick, "hover:text-fr-text"),
			)}
		>
			<StatusSegmentIcon icon={segment.icon} size={11} className={cn("shrink-0", toneClass(segment.tone))} />
			<span>{segment.label}</span>
			<CompactStatusValue segment={segment} />
		</button>
	);
}

function CompactStatusValue({ segment }: { readonly segment: StatusSegment }) {
	if (!segment.value) return null;
	return <span className={cn("font-semibold", toneClass(segment.tone))}>{segment.value}</span>;
}

function ComfortableStatusBar({ segments, density, onSegmentClick, className }: StatusBarRendererProps) {
	return (
		<div
			data-slot="status-bar"
			data-density={density}
			className={cn(
				"flex min-h-9 flex-wrap items-center gap-1.5 rounded-[10px] border border-fr-border-soft bg-fr-surface px-2 py-1.5",
				className,
			)}
		>
			{segments.map(segment => (
				<ComfortableStatusSegment key={segment.id} segment={segment} onSegmentClick={onSegmentClick} />
			))}
		</div>
	);
}

function ComfortableStatusSegment({ segment, onSegmentClick }: StatusSegmentButtonProps) {
	return (
		<button
			type="button"
			data-slot="status-segment"
			data-active={activeAttr(segment.active)}
			className={cn(
				"inline-flex min-h-6 items-center gap-1.5 rounded-[8px] px-2 py-1 text-fr-sm leading-none transition-colors duration-[120ms]",
				toneClass(segment.tone, segment.active),
				clickableClass(onSegmentClick, "hover:bg-fr-surface-2 hover:text-fr-text"),
			)}
			onClick={() => onSegmentClick?.(segment.id)}
		>
			<StatusSegmentIcon icon={segment.icon} size={13} className="shrink-0" />
			<span className="leading-none">
				{segment.label}
				<ComfortableStatusValue value={segment.value} />
			</span>
		</button>
	);
}

function ComfortableStatusValue({ value }: { readonly value?: string }) {
	if (!value) return null;
	return <span className="ml-1.5 font-secondary text-fr-2xs text-fr-text-3">{value}</span>;
}

function StatusSegmentIcon({
	className,
	icon,
	size,
}: {
	readonly className?: string;
	readonly icon?: IconName;
	readonly size: number;
}) {
	if (!icon) return null;
	return <Icon name={icon} size={size} className={className} />;
}

function activeAttr(active?: boolean) {
	return active ? "true" : "false";
}

function clickableClass(onSegmentClick: StatusSegmentButtonProps["onSegmentClick"], className: string) {
	if (onSegmentClick) return className;
	return undefined;
}

function valueToneClass(segment: StatusSegment) {
	if (segment.value) return toneClass(segment.tone);
	return "text-fr-text-3";
}
