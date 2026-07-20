import { Badge } from "../../elements/badge";
import { Button } from "../../elements/button";
import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";
import { type FraymDensity, type FraymSurfaceConfig, resolveDensity } from "../surface-kit";

export interface HostUiAction {
	readonly id: string;
	readonly label: string;
	readonly variant?: "default" | "outline" | "ghost";
}

export interface HostUiRequest {
	readonly id: string;
	readonly title: string;
	readonly description?: string;
	readonly detail?: string;
	readonly tone?: "accent" | "add" | "blue" | "warn" | "mute" | "del";
	readonly icon?: IconName;
	readonly actions: readonly HostUiAction[];
}

export interface HostRequestStackProps {
	readonly requests: readonly HostUiRequest[];
	readonly settings?: FraymSurfaceConfig;
	readonly onAction?: (requestId: string, actionId: string) => void;
	readonly className?: string;
}

type HostRequestLayout = "compact" | "comfortable" | "spacious";
type HostRequestDensity = ReturnType<typeof resolveDensity>;

interface HostRequestRendererProps {
	readonly className?: string;
	readonly density: FraymDensity;
	readonly onAction?: HostRequestStackProps["onAction"];
	readonly requests: readonly HostUiRequest[];
}

interface HostRequestItemProps {
	readonly d?: HostRequestDensity;
	readonly onAction?: HostRequestStackProps["onAction"];
	readonly request: HostUiRequest;
}

const HOST_REQUEST_RENDERERS = {
	compact: CompactHostRequestStack,
	comfortable: ComfortableHostRequestStack,
	spacious: SpaciousHostRequestStack,
};

export function HostRequestStack({ requests, settings, onAction, className }: HostRequestStackProps) {
	const density = hostRequestDensity(settings);
	if (hostRequestHidden(settings, requests)) return null;

	const Renderer = HOST_REQUEST_RENDERERS[hostRequestLayout(density)];
	return <Renderer requests={requests} density={density} onAction={onAction} className={className} />;
}

function hostRequestDensity(settings?: FraymSurfaceConfig): FraymDensity {
	return settings?.density ?? "comfortable";
}

function hostRequestHidden(settings: FraymSurfaceConfig | undefined, requests: readonly HostUiRequest[]) {
	return settingsHidden(settings) || requests.length === 0;
}

function settingsHidden(settings?: FraymSurfaceConfig) {
	return settings?.visible === false || settings?.placement === "hidden";
}

function hostRequestLayout(density: FraymDensity): HostRequestLayout {
	const d = resolveDensity(density);
	if (d.isCompact) return "compact";
	if (d.isSpacious) return "spacious";
	return "comfortable";
}

function CompactHostRequestStack({ requests, density, onAction, className }: HostRequestRendererProps) {
	return (
		<div
			data-slot="host-request-stack"
			data-density={density}
			className={cn("overflow-hidden rounded-[9px] border border-fr-border-soft bg-fr-surface", className)}
		>
			<div className="divide-y divide-fr-border-soft">
				{requests.map(request => (
					<CompactHostRequest key={request.id} request={request} onAction={onAction} />
				))}
			</div>
		</div>
	);
}

function CompactHostRequest({ request, onAction }: HostRequestItemProps) {
	return (
		<section data-slot="host-request" className="flex min-w-0 items-center gap-2 px-2 py-1.5 text-fr-xs">
			<HostRequestIcon request={request} size={12} className="shrink-0 text-fr-accent" />
			<div className="min-w-0 flex-1 fr-overflow font-medium text-fr-text">{request.title}</div>
			<HostRequestBadge request={request} />
			<HostRequestActions request={request} onAction={onAction} size="compact" />
		</section>
	);
}

function SpaciousHostRequestStack({ requests, density, onAction, className }: HostRequestRendererProps) {
	const d = resolveDensity(density);
	return (
		<div data-slot="host-request-stack" data-density={density} className={cn("flex flex-col", d.gap, className)}>
			{requests.map(request => (
				<SpaciousHostRequest key={request.id} request={request} onAction={onAction} d={d} />
			))}
		</div>
	);
}

function SpaciousHostRequest({ request, onAction, d }: HostRequestItemProps & { readonly d: HostRequestDensity }) {
	return (
		<section data-slot="host-request" className={cn(d?.card, d?.pad)}>
			<div className="flex gap-4">
				<SpaciousRequestIcon request={request} d={d} />
				<div className="min-w-0 flex-1">
					<SpaciousRequestHeader request={request} d={d} />
					<HostRequestDescription request={request} spacious />
					<HostRequestDetail request={request} spacious />
				</div>
			</div>
			<HostRequestActions request={request} onAction={onAction} size="spacious" />
		</section>
	);
}

function SpaciousRequestIcon({ request, d }: { readonly d: HostRequestDensity; readonly request: HostUiRequest }) {
	return (
		<span
			className={cn(
				"flex shrink-0 items-center justify-center bg-fr-surface-2 text-fr-accent",
				d.tile,
				d.tileRadius,
			)}
		>
			<Icon name={request.icon ?? "shield"} size={d.icon} />
		</span>
	);
}

function SpaciousRequestHeader({ request, d }: { readonly d: HostRequestDensity; readonly request: HostUiRequest }) {
	return (
		<div className="flex min-w-0 items-start gap-2">
			<h3 className={cn("min-w-0 flex-1 font-display font-semibold text-fr-text", d.title)}>{request.title}</h3>
			<HostRequestBadge request={request} />
		</div>
	);
}

function ComfortableHostRequestStack({ requests, density, onAction, className }: HostRequestRendererProps) {
	const d = resolveDensity(density);
	return (
		<div data-slot="host-request-stack" data-density={density} className={cn("flex flex-col", d.gap, className)}>
			{requests.map(request => (
				<ComfortableHostRequest key={request.id} request={request} onAction={onAction} d={d} />
			))}
		</div>
	);
}

function ComfortableHostRequest({ request, onAction, d }: HostRequestItemProps) {
	return (
		<section
			data-slot="host-request"
			className={cn("rounded-[10px] border border-fr-border-soft bg-fr-surface", d?.pad)}
		>
			<div className="flex gap-3">
				<ComfortableRequestIcon request={request} />
				<div className="min-w-0 flex-1">
					<ComfortableRequestHeader request={request} d={d} />
					<HostRequestDescription request={request} />
					<HostRequestDetail request={request} />
				</div>
			</div>
			<HostRequestActions request={request} onAction={onAction} size="comfortable" />
		</section>
	);
}

function ComfortableRequestIcon({ request }: { readonly request: HostUiRequest }) {
	return (
		<span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-fr-surface-2 text-fr-accent">
			<Icon name={request.icon ?? "shield"} size={16} />
		</span>
	);
}

function ComfortableRequestHeader({
	request,
	d,
}: {
	readonly d?: HostRequestDensity;
	readonly request: HostUiRequest;
}) {
	return (
		<div className="flex items-center gap-2">
			<h3 className={cn("font-display font-semibold text-fr-text", d?.title)}>{request.title}</h3>
			<HostRequestBadge request={request} />
		</div>
	);
}

function HostRequestDescription({
	request,
	spacious,
}: {
	readonly request: HostUiRequest;
	readonly spacious?: boolean;
}) {
	if (!request.description) return null;
	return <p className={descriptionClass(spacious)}>{request.description}</p>;
}

function descriptionClass(spacious?: boolean) {
	if (spacious) return "mt-1 text-fr-base leading-5 text-fr-text-2";
	return "mt-1 text-fr-base text-fr-text-2";
}

function HostRequestDetail({ request, spacious }: { readonly request: HostUiRequest; readonly spacious?: boolean }) {
	if (!request.detail) return null;
	return <p className={detailClass(spacious)}>{request.detail}</p>;
}

function detailClass(spacious?: boolean) {
	if (spacious) {
		return cn(
			"mt-3 rounded-[10px] border border-fr-border-soft bg-fr-bg/60 px-3 py-2.5",
			"font-secondary text-fr-xs leading-[1.6] text-fr-text-2",
		);
	}
	return cn(
		"mt-2 rounded-[8px] border border-fr-border-soft bg-fr-bg/60 px-2.5 py-2",
		"font-secondary text-fr-xs text-fr-text-2",
	);
}

function HostRequestIcon({
	className,
	request,
	size,
}: {
	readonly className?: string;
	readonly request: HostUiRequest;
	readonly size: number;
}) {
	return <Icon name={request.icon ?? "shield"} size={size} className={className} />;
}

function HostRequestBadge({ request }: { readonly request: HostUiRequest }) {
	return <Badge tone={request.tone ?? "warn"}>approval</Badge>;
}

function HostRequestActions({
	onAction,
	request,
	size,
}: {
	readonly onAction?: HostRequestStackProps["onAction"];
	readonly request: HostUiRequest;
	readonly size: "compact" | "comfortable" | "spacious";
}) {
	return (
		<div className={actionsClass(size)}>
			{request.actions.map(action => (
				<HostRequestActionButton
					key={action.id}
					action={action}
					onAction={onAction}
					requestId={request.id}
					size={size}
				/>
			))}
		</div>
	);
}

function actionsClass(size: "compact" | "comfortable" | "spacious") {
	if (size === "compact") return "ml-auto flex shrink-0 items-center gap-1";
	if (size === "spacious") return "mt-4 flex flex-wrap justify-end gap-2";
	return "mt-3 flex flex-wrap justify-end gap-2";
}

function HostRequestActionButton({
	action,
	onAction,
	requestId,
	size,
}: {
	readonly action: HostUiAction;
	readonly onAction?: HostRequestStackProps["onAction"];
	readonly requestId: string;
	readonly size: "compact" | "comfortable" | "spacious";
}) {
	return (
		<Button
			size={buttonSize(size)}
			variant={buttonVariant(action, size)}
			className={buttonClass(size)}
			onClick={() => onAction?.(requestId, action.id)}
		>
			{action.label}
		</Button>
	);
}

function buttonSize(size: "compact" | "comfortable" | "spacious") {
	if (size === "spacious") return "default";
	return "sm";
}

function buttonVariant(action: HostUiAction, size: "compact" | "comfortable" | "spacious") {
	if (action.variant) return action.variant;
	if (size === "compact") return "ghost";
	return "outline";
}

function buttonClass(size: "compact" | "comfortable" | "spacious") {
	if (size === "compact") return "h-6 px-2 text-fr-xs";
	return undefined;
}
