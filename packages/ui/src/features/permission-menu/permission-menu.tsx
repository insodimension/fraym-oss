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

export interface PermissionMenuProps {
	readonly permissions: readonly PermissionDef[];
	readonly selected: string;
	readonly onSelect: (id: string) => void;
	readonly onClose: () => void;
	/** Trigger rect to anchor against (preferred). Falls back to `style`. */
	readonly anchorRect?: DOMRect | null;
	readonly place?: Placement;
	readonly style?: React.CSSProperties;
	readonly className?: string;
}

/** The mode rows themselves — shared between the desktop popover and the phone sheet. */
function PermissionRows({
	permissions,
	selected,
	onSelect,
	onClose,
}: Pick<PermissionMenuProps, "permissions" | "selected" | "onSelect" | "onClose">) {
	return (
		<>
			{permissions.map(p => {
				const on = selected === p.id;
				const choose = () => {
					onSelect(p.id);
					onClose();
				};
				return (
					// .mitem — flex, gap 10px, padding 9px 10px, radius 8px, hover surface-2
					<div
						key={p.id}
						role="menuitemradio"
						aria-checked={on}
						tabIndex={0}
						className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-[9px] hover:bg-fr-surface-2"
						onClick={choose}
						onKeyDown={e => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								choose();
							}
						}}
					>
						<Icon
							name={p.icon}
							size={16}
							strokeWidth={1.8}
							className="flex-none"
							style={{ color: `var(--fr-${p.tone})` }}
						/>
						<div>
							{/* .mname — 13px / 500 */}
							<div className="text-fr-base font-medium">{p.label}</div>
							{/* .msub — mono 10.5px text-3 */}
							<div className="font-secondary text-fr-2xs text-fr-text-3">{p.desc}</div>
						</div>
						{/* .check — margin-left auto, accent, 15px, opacity toggled by .on */}
						<Icon
							name="check"
							size={15}
							strokeWidth={2.4}
							className={cn("ml-auto text-fr-accent", on ? "opacity-100" : "opacity-0")}
						/>
					</div>
				);
			})}
		</>
	);
}

export function PermissionMenu({
	permissions,
	selected,
	onSelect,
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
				<PermissionRows permissions={permissions} selected={selected} onSelect={onSelect} onClose={onClose} />
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
				<PermissionRows permissions={permissions} selected={selected} onSelect={onSelect} onClose={onClose} />
			</div>
		</BodyPortal>
	);
}
