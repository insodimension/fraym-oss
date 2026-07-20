import type { ReactNode } from "react";
import { Badge } from "../../elements/badge";
import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";
import { ModeEyebrow, StatusDot } from "../density-ui";
import {
	type ComposerControlTone,
	type FraymDensity,
	type FraymSurfaceConfig,
	resolveDensity,
	toneClass,
} from "../surface-kit";

export interface CapabilityItem {
	readonly id: string;
	readonly label: ReactNode;
	readonly description?: ReactNode;
	readonly detail?: ReactNode;
	readonly icon?: IconName;
	readonly tone?: ComposerControlTone;
	readonly status?: { readonly label: string; readonly tone?: ComposerControlTone };
}

export interface CapabilityGroup {
	readonly id: string;
	readonly title?: ReactNode;
	readonly description?: ReactNode;
	readonly items: readonly CapabilityItem[];
}

export interface CapabilityListBodyProps {
	readonly groups: readonly CapabilityGroup[];
	readonly settings?: FraymSurfaceConfig;
	readonly className?: string;
}

type CapabilityDensity = ReturnType<typeof resolveDensity>;
type CapabilityLayout = "compact" | "comfortable" | "spacious";

interface CapabilityRendererProps {
	readonly className?: string;
	readonly density: FraymDensity;
	readonly groups: readonly CapabilityGroup[];
}

const CAPABILITY_RENDERERS = {
	compact: CompactCapabilityList,
	comfortable: ComfortableCapabilityList,
	spacious: SpaciousCapabilityList,
};

export function CapabilityListBody({ groups, settings, className }: CapabilityListBodyProps) {
	const density = capabilityDensity(settings);
	if (capabilityHidden(settings)) return null;

	const Renderer = CAPABILITY_RENDERERS[capabilityLayout(density)];
	return <Renderer groups={groups} density={density} className={className} />;
}

function capabilityDensity(settings?: FraymSurfaceConfig): FraymDensity {
	return settings?.density ?? "comfortable";
}

function capabilityHidden(settings?: FraymSurfaceConfig) {
	return settings?.visible === false || settings?.placement === "hidden";
}

function capabilityLayout(density: FraymDensity): CapabilityLayout {
	const d = resolveDensity(density);
	if (d.isCompact) return "compact";
	if (d.isSpacious) return "spacious";
	return "comfortable";
}

function CompactCapabilityList({ groups, density, className }: CapabilityRendererProps) {
	return (
		<div data-slot="capability-list-body" data-density={density} className={cn("flex flex-col gap-3", className)}>
			{groups.map(group => (
				<CompactCapabilityGroup key={group.id} group={group} />
			))}
		</div>
	);
}

function CompactCapabilityGroup({ group }: { readonly group: CapabilityGroup }) {
	return (
		<section className="flex flex-col gap-1">
			<CompactGroupHeading group={group} />
			<div className="divide-y divide-fr-border-soft">
				{group.items.map(item => (
					<CompactCapabilityItem key={item.id} item={item} />
				))}
			</div>
		</section>
	);
}

function CompactGroupHeading({ group }: { readonly group: CapabilityGroup }) {
	if (!group.title) return null;
	return <ModeEyebrow trailing={`${group.items.length}`}>{group.title}</ModeEyebrow>;
}

function CompactCapabilityItem({ item }: { readonly item: CapabilityItem }) {
	return (
		<div className="grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2 py-[4px]">
			<CapabilityIcon
				icon={item.icon}
				tone={item.tone}
				size={12}
				className="flex size-4 items-center justify-center rounded-[5px]"
			/>
			<span className="min-w-0 fr-overflow text-fr-xs font-medium text-fr-text-2">{item.label}</span>
			<CompactCapabilityStatus item={item} />
		</div>
	);
}

function CompactCapabilityStatus({ item }: { readonly item: CapabilityItem }) {
	if (!item.status) return null;
	return (
		<span className="flex items-center gap-1.5">
			<StatusDot tone={item.status.tone} size={6} />
			<span className="font-secondary text-fr-2xs text-fr-text-3">{item.status.label}</span>
		</span>
	);
}

function SpaciousCapabilityList({ groups, density, className }: CapabilityRendererProps) {
	const d = resolveDensity(density);
	return (
		<div data-slot="capability-list-body" data-density={density} className={cn("grid gap-4", className)}>
			{groups.map(group => (
				<SpaciousCapabilityGroup key={group.id} group={group} d={d} />
			))}
		</div>
	);
}

function SpaciousCapabilityGroup({ group, d }: { readonly group: CapabilityGroup; readonly d: CapabilityDensity }) {
	return (
		<section className="grid gap-2.5">
			<CapabilityGroupHeader group={group} d={d} spacious />
			<div className="grid gap-2 sm:grid-cols-2">
				{group.items.map(item => (
					<SpaciousCapabilityCard key={item.id} item={item} d={d} />
				))}
			</div>
		</section>
	);
}

function SpaciousCapabilityCard({ item, d }: { readonly item: CapabilityItem; readonly d: CapabilityDensity }) {
	return (
		<div className={cn("grid gap-3", d.card, d.pad)}>
			<div className="flex items-start gap-3">
				<CapabilityIcon
					icon={item.icon}
					tone={item.tone}
					size={d.icon}
					className={cn("flex shrink-0 items-center justify-center", d.tile, d.tileRadius)}
				/>
				<div className="min-w-0 flex-1">
					<div className={cn("font-display font-semibold text-fr-text", d.title)}>{item.label}</div>
					<CapabilityDescription description={item.description} spacious />
				</div>
				<CapabilityBadgeStatus item={item} />
			</div>
			<CapabilityDetail detail={item.detail} />
		</div>
	);
}

function ComfortableCapabilityList({ groups, density, className }: CapabilityRendererProps) {
	const d = resolveDensity(density);
	return (
		<div data-slot="capability-list-body" data-density={density} className={cn("grid gap-3", className)}>
			{groups.map(group => (
				<ComfortableCapabilityGroup key={group.id} group={group} d={d} />
			))}
		</div>
	);
}

function ComfortableCapabilityGroup({ group, d }: { readonly group: CapabilityGroup; readonly d: CapabilityDensity }) {
	return (
		<section className="grid gap-1.5">
			<CapabilityGroupHeader group={group} d={d} />
			<div className="grid gap-1">
				{group.items.map(item => (
					<ComfortableCapabilityRow key={item.id} item={item} d={d} />
				))}
			</div>
		</section>
	);
}

function ComfortableCapabilityRow({ item, d }: { readonly item: CapabilityItem; readonly d: CapabilityDensity }) {
	return (
		<div
			className={cn(
				"grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-2 rounded-[8px] hover:bg-fr-surface",
				d.row,
			)}
		>
			<CapabilityIcon
				icon={item.icon}
				tone={item.tone}
				size={10}
				className="mt-0.5 flex size-4 items-center justify-center rounded-[5px]"
			/>
			<div className="min-w-0">
				<div className="fr-overflow text-fr-sm font-medium text-fr-text-2">{item.label}</div>
				<CapabilityDescription description={item.description} />
				<CapabilityDetail detail={item.detail} />
			</div>
			<CapabilityBadgeStatus item={item} className="mt-0.5 self-start" />
		</div>
	);
}

function CapabilityGroupHeader({
	d,
	group,
	spacious,
}: {
	readonly d: CapabilityDensity;
	readonly group: CapabilityGroup;
	readonly spacious?: boolean;
}) {
	if (!group.title && !group.description) return null;
	return (
		<div className="min-w-0">
			<CapabilityGroupTitle d={d} title={group.title} />
			<CapabilityDescription description={group.description} spacious={spacious} />
		</div>
	);
}

function CapabilityGroupTitle({ d, title }: { readonly d: CapabilityDensity; readonly title?: ReactNode }) {
	if (!title) return null;
	return <h3 className={cn("font-display font-semibold text-fr-text", d.title)}>{title}</h3>;
}

function CapabilityDescription({
	description,
	spacious,
}: {
	readonly description?: ReactNode;
	readonly spacious?: boolean;
}) {
	if (!description) return null;
	return <p className={descriptionClass(spacious)}>{description}</p>;
}

function descriptionClass(spacious?: boolean) {
	if (spacious) return "mt-1 text-fr-sm leading-5 text-fr-text-2";
	return "text-fr-sm text-fr-text-3";
}

function CapabilityDetail({ detail }: { readonly detail?: ReactNode }) {
	if (!detail) return null;
	return <p className="font-secondary text-fr-2xs text-fr-text-3">{detail}</p>;
}

function CapabilityBadgeStatus({ className, item }: { readonly className?: string; readonly item: CapabilityItem }) {
	if (!item.status) return null;
	return (
		<Badge className={className} tone={badgeTone(item.status.tone)}>
			{item.status.label}
		</Badge>
	);
}

function badgeTone(tone?: ComposerControlTone) {
	if (tone === "default") return "mute";
	return tone;
}

function CapabilityIcon({
	className,
	icon,
	size,
	tone,
}: {
	readonly className?: string;
	readonly icon?: IconName;
	readonly size: number;
	readonly tone?: ComposerControlTone;
}) {
	return (
		<span className={cn(className, toneClass(tone, true))}>
			<Icon name={icon ?? "spark"} size={size} />
		</span>
	);
}
