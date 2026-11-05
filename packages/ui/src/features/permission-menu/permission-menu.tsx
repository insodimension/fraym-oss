import { BottomSheet, useIsPhoneWidth } from "../../components/bottom-sheet";
import { type Placement, popoverStyle, Scrim } from "../../elements/popover";
import { Icon, type IconName } from "../../icons";
import { BodyPortal } from "../../lib/body-portal";
import { cn } from "../../lib/cn";

const WIDTH = 272;

/** Tone names that map to a `--fr-<tone>` color token in theme.css. */
export type PermissionTone = "warn" | "add" | "del" | "blue" | "accent";

export interface PermissionDef {
	readonly id: string;
	readonly label: string;
	readonly desc: string;
	readonly icon: IconName;
	readonly tone: PermissionTone;
}

/**
 * A row in the permission menu that is NOT an approval mode: picking it seeds the
 * composer with {@link composerPrefill} instead of changing what the engine is
 * allowed to do.
 *
 * It exists because a host can ship a read-only way to work that the ENGINE has no
 * mode for — Yarin's `/chat`, a slash command whose skill forbids every writing
 * tool. The dropdown is where a user looks for "how much is this thing allowed to
 * do", so the option belongs here; the mechanism is a prefilled command, so it
 * never claims to be an approval mode: no radio role, no checkmark, and the chip
 * keeps naming the real mode the engine is in.
 */
export interface PermissionActionDef {
	readonly id: string;
	readonly label: string;
	readonly desc: string;
	readonly icon: IconName;
	readonly tone: PermissionTone;
	/** Composer text this row writes (e.g. `"/chat "`). */
	readonly composerPrefill: string;
}

export interface PermissionMenuProps {
	readonly permissions: readonly PermissionDef[];
	/** Non-mode rows rendered under the modes; omitted — every existing host — renders none. */
	readonly actions?: readonly PermissionActionDef[];
	readonly selected: string;
	readonly onSelect: (id: string) => void;
	/** Required when `actions` is passed: the host applies the row's prefill. */
	readonly onAction?: (action: PermissionActionDef) => void;
	readonly onClose: () => void;
	/** Trigger rect to anchor against (preferred). Falls back to `style`. */
	readonly anchorRect?: DOMRect | null;
	readonly place?: Placement;
	readonly style?: React.CSSProperties;
	readonly className?: string;
}

/** One row's markup — shared by the mode rows and the action rows. */
function MenuRow({
	icon,
	tone,
	label,
	desc,
	checked,
	onPick,
}: {
	readonly icon: IconName;
	readonly tone: PermissionTone;
	readonly label: string;
	readonly desc: string;
	/** `null` = not a mode: renders no radio semantics and no checkmark slot. */
	readonly checked: boolean | null;
	readonly onPick: () => void;
}) {
	return (
		// .mitem — flex, gap 10px, padding 9px 10px, radius 8px, hover surface-2
		<div
			role={checked === null ? "menuitem" : "menuitemradio"}
			aria-checked={checked === null ? undefined : checked}
			tabIndex={0}
			className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-[9px] hover:bg-fr-surface-2"
			onClick={onPick}
			onKeyDown={e => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onPick();
				}
			}}
		>
			<Icon name={icon} size={16} strokeWidth={1.8} className="flex-none" style={{ color: `var(--fr-${tone})` }} />
			<div>
				{/* .mname — 13px / 500 */}
				<div className="text-fr-base font-medium">{label}</div>
				{/* .msub — mono 10.5px text-3 */}
				<div className="font-secondary text-fr-2xs text-fr-text-3">{desc}</div>
			</div>
			{/* .check — margin-left auto, accent, 15px, opacity toggled by .on */}
			{checked !== null && (
				<Icon
					name="check"
					size={15}
					strokeWidth={2.4}
					className={cn("ml-auto text-fr-accent", checked ? "opacity-100" : "opacity-0")}
				/>
			)}
		</div>
	);
}

/** The rows themselves — shared between the desktop popover and the phone sheet. */
function PermissionRows({
	permissions,
	actions,
	selected,
	onSelect,
	onAction,
	onClose,
}: Pick<PermissionMenuProps, "permissions" | "actions" | "selected" | "onSelect" | "onAction" | "onClose">) {
	return (
		<>
			{permissions.map(p => (
				<MenuRow
					key={p.id}
					icon={p.icon}
					tone={p.tone}
					label={p.label}
					desc={p.desc}
					checked={selected === p.id}
					onPick={() => {
						onSelect(p.id);
						onClose();
					}}
				/>
			))}
			{actions !== undefined && actions.length > 0 && (
				<>
					<div className="mx-2.5 my-1 border-fr-border-soft border-t" />
					{actions.map(action => (
						<MenuRow
							key={action.id}
							icon={action.icon}
							tone={action.tone}
							label={action.label}
							desc={action.desc}
							checked={null}
							onPick={() => {
								onAction?.(action);
								onClose();
							}}
						/>
					))}
				</>
			)}
		</>
	);
}

export function PermissionMenu({
	permissions,
	actions,
	selected,
	onSelect,
	onAction,
	onClose,
	anchorRect,
	place = "above",
	style,
	className,
}: PermissionMenuProps) {
	const phone = useIsPhoneWidth();

	// Phone width: a bottom sheet in the thumb zone instead of a chip-anchored popover.
	if (phone) {
		return (
			<BottomSheet onClose={onClose} title="Permission mode" className={className}>
				<PermissionRows
					permissions={permissions}
					actions={actions}
					selected={selected}
					onSelect={onSelect}
					onAction={onAction}
					onClose={onClose}
				/>
			</BottomSheet>
		);
	}

	return (
		<BodyPortal>
			<Scrim onClick={onClose} />
			<div
				data-slot="permission-menu"
				className={cn(
					"fixed z-50 w-[272px] rounded-[12px] border border-fr-border bg-fr-surface p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.5)] animate-[fr-pop-in_0.12s_ease]",
					className,
				)}
				style={anchorRect ? popoverStyle(anchorRect, place, WIDTH) : style}
			>
				{/* .phead — mono 10px uppercase, letter-spacing .06em, padding 8px 10px 5px */}
				<div className="px-2.5 pt-2 pb-[5px] fr-eyebrow">Permission mode</div>
				<PermissionRows
					permissions={permissions}
					actions={actions}
					selected={selected}
					onSelect={onSelect}
					onAction={onAction}
					onClose={onClose}
				/>
			</div>
		</BodyPortal>
	);
}
