import { Badge } from "../../elements/badge";
import { Icon, type IconName } from "../../icons";
import { cn } from "../../lib/cn";
import { Composer, ComposerChip, type ComposerImageAttachment, ContextRadial } from "../composer";
import { type ModePillItem, ModePills } from "../mode-pills";
import {
	type ComposerControlTone,
	type FraymDensity,
	type FraymSurfaceConfig,
	resolveDensity,
	toneClass,
} from "../surface-kit";

export interface ComposerControl {
	readonly id: string;
	readonly label: string;
	readonly icon?: IconName;
	readonly tone?: ComposerControlTone;
	readonly active?: boolean;
	readonly disabled?: boolean;
	readonly hidden?: boolean;
}

export interface ComposerQueueItem {
	readonly id: string;
	readonly label: string;
	readonly detail?: string;
	readonly tone?: ComposerControlTone;
}

export interface ComposerAttachmentItem {
	readonly id: string;
	readonly name: string;
	readonly detail?: string;
	readonly kind?: "file" | "image" | "directory" | "url";
}

export interface ComposerCockpitSettings extends FraymSurfaceConfig {
	readonly showToolbar?: boolean;
	readonly showQueue?: boolean;
	readonly showAttachments?: boolean;
	readonly showContext?: boolean;
	readonly sendBehavior?: "send" | "steer" | "follow-up" | "continue";
}

export interface ComposerCockpitProps {
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly onSubmit: (value: string, attachments: readonly ComposerImageAttachment[]) => void;
	readonly onStop?: () => void;
	readonly onControl?: (id: string) => void;
	readonly onPermissionClick?: (e: React.MouseEvent) => void;
	readonly onModelClick?: (e: React.MouseEvent) => void;
	readonly onContextClick?: (e: React.MouseEvent) => void;
	readonly onModeClick?: (e: React.MouseEvent) => void;
	readonly onRemoveQueueItem?: (id: string) => void;
	readonly onRemoveAttachment?: (id: string) => void;
	readonly streaming?: boolean;
	/** Disable composing/sending — e.g. a superseded source session after
	 *  handoff. The engine guard is the safety backstop; this is pure UX. */
	readonly disabled?: boolean;
	readonly placeholder?: string;
	readonly modeLabel?: string;
	/** Active session modes (plan, goal, loop, collab, ephemeral, …) shown as a
	 *  closeable pill strip above the input. Separate from `permissionLabel`,
	 *  which is the single exclusive permission-mode policy. */
	readonly activeModes?: readonly ModePillItem[];
	readonly permissionLabel?: string;
	readonly modelLabel?: string;
	readonly contextPercent?: number;
	readonly toolbar?: readonly ComposerControl[];
	readonly sendActions?: readonly ComposerControl[];
	readonly queue?: readonly ComposerQueueItem[];
	readonly attachments?: readonly ComposerAttachmentItem[];
	readonly settings?: ComposerCockpitSettings;
	readonly className?: string;
}

type DensityInfo = ReturnType<typeof resolveDensity>;

interface CockpitViewState {
	readonly density: FraymDensity;
	readonly d: DensityInfo;
	readonly showToolbar: boolean;
	readonly showQueue: boolean;
	readonly showAttachments: boolean;
	readonly showContext: boolean;
	readonly queueStripClass: string;
	readonly queueChipClass: string;
	readonly trayClass: string;
}

function resolveBooleanSetting(value: boolean | undefined, fallback: boolean): boolean {
	return value ?? fallback;
}

function queueStripClass(d: DensityInfo): string {
	if (d.isCompact) return "gap-1.5 px-2 py-1";
	if (d.isSpacious) return "gap-2 px-4 py-3";
	return cn(d.gap, d.pad);
}

function queueChipClass(d: DensityInfo): string {
	if (d.isCompact) return "px-1.5 py-0.5 text-fr-2xs";
	if (d.isSpacious) return "px-2.5 py-1.5 text-fr-sm";
	return "px-2 py-1 text-fr-sm";
}

function trayClass(d: DensityInfo): string {
	if (d.isCompact) return "flex flex-wrap gap-1.5 px-2 py-1.5";
	if (d.isSpacious) return "grid gap-2 px-4 py-3 sm:grid-cols-2";
	return cn("grid sm:grid-cols-2", d.gap, d.pad);
}

type CockpitVisibilityState = Pick<CockpitViewState, "showToolbar" | "showQueue" | "showAttachments" | "showContext">;

type CockpitVisibilityKey = keyof CockpitVisibilityState;

const COCKPIT_VISIBILITY_DEFAULTS = {
	showToolbar: (props: ComposerCockpitProps) =>
		(props.toolbar?.length ?? 0) > 0 || (props.sendActions?.length ?? 0) > 0,
	showQueue: (props: ComposerCockpitProps) => (props.queue?.length ?? 0) > 0,
	showAttachments: (props: ComposerCockpitProps) => (props.attachments?.length ?? 0) > 0,
	showContext: (props: ComposerCockpitProps) => typeof props.contextPercent === "number",
} satisfies Record<CockpitVisibilityKey, (props: ComposerCockpitProps) => boolean>;

function resolveCockpitVisibility(props: ComposerCockpitProps): CockpitVisibilityState {
	const settings = props.settings;
	return {
		showToolbar: resolveBooleanSetting(settings?.showToolbar, COCKPIT_VISIBILITY_DEFAULTS.showToolbar(props)),
		showQueue: resolveBooleanSetting(settings?.showQueue, COCKPIT_VISIBILITY_DEFAULTS.showQueue(props)),
		showAttachments: resolveBooleanSetting(
			settings?.showAttachments,
			COCKPIT_VISIBILITY_DEFAULTS.showAttachments(props),
		),
		showContext: resolveBooleanSetting(settings?.showContext, COCKPIT_VISIBILITY_DEFAULTS.showContext(props)),
	};
}

function resolveCockpitState(props: ComposerCockpitProps): CockpitViewState {
	const density = props.settings?.density ?? "comfortable";
	const d = resolveDensity(density);
	return {
		density,
		d,
		...resolveCockpitVisibility(props),
		queueStripClass: queueStripClass(d),
		queueChipClass: queueChipClass(d),
		trayClass: trayClass(d),
	};
}

function composerControlSize(control: ComposerControl, density: FraymDensity, labelHidden?: boolean): string {
	const iconOnly = labelHidden && density === "compact" && !!control.icon;
	if (iconOnly) return "size-7 justify-center";
	if (density === "compact") return "px-2 py-1 text-fr-xs";
	if (density === "spacious") return "px-3 py-2 text-fr-base";
	return "px-2.5 py-1.5 text-fr-sm";
}

function ComposerControlButton({
	control,
	onClick,
	density,
	labelHidden,
}: {
	readonly control: ComposerControl;
	readonly onClick?: (id: string) => void;
	readonly density: FraymDensity;
	readonly labelHidden?: boolean;
}) {
	if (control.hidden) return null;
	const iconOnly = labelHidden && density === "compact" && !!control.icon;
	const size = composerControlSize(control, density, labelHidden);
	return (
		<button
			type="button"
			data-slot="composer-control"
			data-active={control.active ? "true" : "false"}
			disabled={control.disabled}
			title={control.label}
			aria-label={control.label}
			className={cn(
				"inline-flex items-center gap-1.5 rounded-[8px] border border-transparent transition-colors duration-[120ms]",
				size,
				toneClass(control.tone, control.active),
				"hover:bg-fr-surface-2 hover:text-fr-text disabled:cursor-default disabled:opacity-40",
			)}
			onClick={() => onClick?.(control.id)}
		>
			{control.icon && <Icon name={control.icon} size={density === "spacious" ? 15 : 13} />}
			{!iconOnly && <span>{control.label}</span>}
		</button>
	);
}

function ComposerToolbar({
	state,
	modeLabel,
	toolbar,
	sendActions,
	onModeClick,
	onControl,
}: {
	readonly state: CockpitViewState;
	readonly modeLabel?: string;
	readonly toolbar: readonly ComposerControl[];
	readonly sendActions: readonly ComposerControl[];
	readonly onModeClick?: (e: React.MouseEvent) => void;
	readonly onControl?: (id: string) => void;
}) {
	if (!state.showToolbar) return null;
	return (
		<div
			data-slot="composer-toolbar"
			className={cn(
				"flex flex-wrap items-center border-b border-fr-border-soft text-fr-text-2",
				state.density === "compact" ? "gap-1.5 px-2 py-1.5" : "gap-2 px-3 py-2",
			)}
		>
			<ModeChip modeLabel={modeLabel} onModeClick={onModeClick} />
			{toolbar.map(control => (
				<ComposerControlButton
					key={control.id}
					control={control}
					density={state.density}
					onClick={onControl}
					labelHidden={state.d.isCompact}
				/>
			))}
			<span className="min-w-3 flex-1" />
			{sendActions.map(control => (
				<ComposerControlButton key={control.id} control={control} density={state.density} onClick={onControl} />
			))}
		</div>
	);
}

function ModeChip({
	modeLabel,
	onModeClick,
}: {
	readonly modeLabel?: string;
	readonly onModeClick?: (e: React.MouseEvent) => void;
}) {
	if (!modeLabel) return null;
	if (!onModeClick)
		return (
			<Badge tone="accent" className="shrink-0">
				{modeLabel}
			</Badge>
		);
	return (
		<ComposerChip tone="default" className="shrink-0 text-fr-accent" onClick={onModeClick}>
			{modeLabel}
		</ComposerChip>
	);
}

function ComposerQueueStrip({
	state,
	queue,
	onRemoveQueueItem,
}: {
	readonly state: CockpitViewState;
	readonly queue: readonly ComposerQueueItem[];
	readonly onRemoveQueueItem?: (id: string) => void;
}) {
	if (!state.showQueue) return null;
	return (
		<div
			data-slot="composer-queue-strip"
			className={cn("flex flex-wrap items-center border-b border-fr-border-soft", state.queueStripClass)}
		>
			<span className="fr-eyebrow">queue</span>
			{queue.map(item => (
				<QueueChip key={item.id} item={item} state={state} onRemove={onRemoveQueueItem} />
			))}
		</div>
	);
}

function QueueChip({
	item,
	state,
	onRemove,
}: {
	readonly item: ComposerQueueItem;
	readonly state: CockpitViewState;
	readonly onRemove?: (id: string) => void;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-[8px] border border-fr-border-soft bg-fr-surface",
				state.queueChipClass,
				toneClass(item.tone),
			)}
		>
			<span>{item.label}</span>
			{item.detail && !state.d.isCompact && (
				<span className="font-secondary text-fr-2xs text-fr-text-3">{item.detail}</span>
			)}
			{onRemove && (
				<button type="button" className="text-fr-text-3 hover:text-fr-text" onClick={() => onRemove(item.id)}>
					<Icon name="x" size={state.d.isCompact ? 10 : 11} />
				</button>
			)}
		</span>
	);
}

function AttachmentIcon({
	kind,
	size = 13,
}: {
	readonly kind?: ComposerAttachmentItem["kind"];
	readonly size?: number;
}) {
	const icon: IconName = kind === "directory" ? "folder" : kind === "url" ? "link" : kind === "image" ? "eye" : "file";
	return <Icon name={icon} size={size} />;
}

function AttachmentTray({
	state,
	attachments,
	onRemoveAttachment,
}: {
	readonly state: CockpitViewState;
	readonly attachments: readonly ComposerAttachmentItem[];
	readonly onRemoveAttachment?: (id: string) => void;
}) {
	if (!state.showAttachments) return null;
	return (
		<div data-slot="composer-attachment-tray" className={cn("border-b border-fr-border-soft", state.trayClass)}>
			{attachments.map(item =>
				state.d.isCompact ? (
					<CompactAttachment key={item.id} item={item} onRemove={onRemoveAttachment} />
				) : (
					<StandardAttachment key={item.id} item={item} state={state} onRemove={onRemoveAttachment} />
				),
			)}
		</div>
	);
}

function CompactAttachment({
	item,
	onRemove,
}: {
	readonly item: ComposerAttachmentItem;
	readonly onRemove?: (id: string) => void;
}) {
	return (
		<span className="inline-flex min-w-0 max-w-[200px] items-center gap-1.5 rounded-[7px] border border-fr-border-soft bg-fr-surface px-1.5 py-0.5 text-fr-2xs">
			<span className="shrink-0 text-fr-text-3">
				<AttachmentIcon kind={item.kind} size={11} />
			</span>
			<span className="min-w-0 fr-overflow text-fr-text">{item.name}</span>
			{onRemove && <RemoveButton size={10} onClick={() => onRemove(item.id)} compact />}
		</span>
	);
}

function StandardAttachment({
	item,
	state,
	onRemove,
}: {
	readonly item: ComposerAttachmentItem;
	readonly state: CockpitViewState;
	readonly onRemove?: (id: string) => void;
}) {
	return (
		<div
			className={cn(
				"flex min-w-0 items-center gap-2 rounded-[8px] border border-fr-border-soft bg-fr-surface",
				state.d.isSpacious ? "px-3 py-2.5" : "px-2.5 py-2",
			)}
		>
			<span
				className={cn(
					"flex shrink-0 items-center justify-center rounded-md bg-fr-surface-2 text-fr-text-3",
					state.d.isSpacious ? "size-8" : "size-6",
				)}
			>
				<AttachmentIcon kind={item.kind} size={state.d.isSpacious ? 16 : 13} />
			</span>
			<span className="min-w-0 flex-1">
				<span className={cn("block fr-overflow text-fr-text", state.d.isSpacious ? "text-fr-base" : "text-fr-sm")}>
					{item.name}
				</span>
				{item.detail && (
					<span className="block fr-overflow font-secondary text-fr-2xs text-fr-text-3">{item.detail}</span>
				)}
			</span>
			{onRemove && <RemoveButton size={12} onClick={() => onRemove(item.id)} />}
		</div>
	);
}

function RemoveButton({
	size,
	compact,
	onClick,
}: {
	readonly size: number;
	readonly compact?: boolean;
	readonly onClick: () => void;
}) {
	return (
		<button
			type="button"
			className={
				compact
					? "shrink-0 text-fr-text-3 hover:text-fr-text"
					: "flex size-6 shrink-0 items-center justify-center rounded-md text-fr-text-3 hover:bg-fr-surface-2 hover:text-fr-text"
			}
			onClick={onClick}
		>
			<Icon name="x" size={size} />
		</button>
	);
}

function ComposerInputFooter({
	props,
	state,
}: {
	readonly props: ComposerCockpitProps;
	readonly state: CockpitViewState;
}) {
	return (
		<Composer
			value={props.value}
			onChange={props.onChange}
			onSubmit={props.onSubmit}
			onStop={props.onStop}
			streaming={props.streaming ?? false}
			disabled={props.disabled ?? false}
			placeholder={props.placeholder}
			className="bg-transparent px-0 pb-0 pt-0"
			leftSlot={<PermissionChip label={props.permissionLabel} onClick={props.onPermissionClick} />}
			rightSlot={
				<>
					{state.showContext && typeof props.contextPercent === "number" && (
						<ContextRadial percent={props.contextPercent} onClick={props.onContextClick} />
					)}
					{props.modelLabel && (
						<ComposerChip className="font-secondary text-fr-xs" onClick={props.onModelClick}>
							{props.modelLabel}
						</ComposerChip>
					)}
				</>
			}
		/>
	);
}

function PermissionChip({
	label,
	onClick,
}: {
	readonly label?: string;
	readonly onClick?: (e: React.MouseEvent) => void;
}) {
	if (!label) return null;
	return (
		<ComposerChip tone="warn" dot onClick={onClick}>
			{label}
		</ComposerChip>
	);
}

function ComposerModeStrip({
	state,
	modes,
}: {
	readonly state: CockpitViewState;
	readonly modes: readonly ModePillItem[];
}) {
	if (modes.length === 0) return null;
	return (
		<div
			data-slot="composer-modes"
			className={cn(
				"flex flex-wrap items-center border-t border-fr-border-soft",
				state.density === "compact" ? "gap-1.5 px-2 py-1.5" : "gap-2 px-3 py-2",
			)}
		>
			<ModePills modes={modes} />
		</div>
	);
}

export function ComposerCockpit(props: ComposerCockpitProps) {
	const state = resolveCockpitState(props);
	if (props.settings?.visible === false || props.settings?.placement === "hidden") return null;
	return (
		<div
			data-slot="composer-cockpit"
			data-density={state.density}
			data-placement={props.settings?.placement ?? "inline"}
			className={cn("rounded-[14px] border border-fr-border bg-fr-bg", props.className)}
		>
			<ComposerToolbar
				state={state}
				modeLabel={props.modeLabel}
				toolbar={props.toolbar ?? []}
				sendActions={props.sendActions ?? []}
				onModeClick={props.onModeClick}
				onControl={props.onControl}
			/>
			<ComposerQueueStrip state={state} queue={props.queue ?? []} onRemoveQueueItem={props.onRemoveQueueItem} />
			<AttachmentTray
				state={state}
				attachments={props.attachments ?? []}
				onRemoveAttachment={props.onRemoveAttachment}
			/>
			<ComposerModeStrip state={state} modes={props.activeModes ?? []} />
			<ComposerInputFooter props={props} state={state} />
		</div>
	);
}
