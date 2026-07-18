import { useEffect } from "react";
import { BodyPortal } from "../lib/body-portal";
import { cn } from "../lib/cn";

/** Where an anchored popover opens relative to its trigger. Ported from the
 * prototype `Pop`: `above` opens upward, `right` right-aligns to the trigger. */
export type Placement = "below" | "above" | "below-right" | "above-right";

/** Compute a `position: fixed` style anchored to a trigger's bounding rect.
 * Mirrors the prototype's `Pop`: 8px gap above/below, right/left aligned to the
 * trigger edge, clamped into the viewport with an 8px margin. */
export function popoverStyle(
	anchorRect: DOMRect | null | undefined,
	place: Placement = "below",
	width = 240,
): React.CSSProperties {
	const style: React.CSSProperties = { width };
	if (!anchorRect) return style;
	const gap = 8;
	const spaceBelow = window.innerHeight - anchorRect.bottom - gap;
	const spaceAbove = anchorRect.top - gap;
	// Flip a "below" popover upward when there isn't enough room beneath the trigger
	// (e.g. a role picker near the bottom of the viewport) and there's more room above.
	const placeAbove = place.includes("above") || (spaceBelow < 360 && spaceAbove > spaceBelow);
	if (placeAbove) {
		style.bottom = window.innerHeight - anchorRect.top + gap;
		style.maxHeight = Math.max(160, spaceAbove);
	} else {
		style.top = anchorRect.bottom + gap;
		style.maxHeight = Math.max(160, spaceBelow);
	}
	if (place.includes("right")) {
		style.left = Math.max(8, Math.min(anchorRect.right - width, window.innerWidth - width - 8));
	} else {
		style.left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - width - 8));
	}
	return style;
}

export interface ScrimProps extends React.ComponentProps<"div"> {
	readonly dim?: boolean;
}

export function Scrim({ dim = false, className, ...props }: ScrimProps) {
	return (
		<BodyPortal>
			<div
				data-slot="scrim"
				className={cn("fixed inset-0 z-40", dim && "bg-black/55 backdrop-blur-[2px]", className)}
				{...props}
			/>
		</BodyPortal>
	);
}

export interface ModalProps extends React.ComponentProps<"div"> {
	/** Called on backdrop click and (unless disabled) Escape. */
	readonly onClose: () => void;
	/** Vertical anchor of the panel: "center" (default) or "upper" (≈42%, for command palettes). */
	readonly placement?: "center" | "upper";
	/** Close when Escape is pressed. Default true. */
	readonly closeOnEscape?: boolean;
}

/** A centered modal dialog over a dimmed Scrim. The panel chrome (surface, border,
 * radius, shadow, pop-in) is shared; size and inner layout come from `className`.
 * Backdrop click and Escape both call `onClose`. */
export function Modal({
	onClose,
	placement = "center",
	closeOnEscape = true,
	className,
	children,
	...props
}: ModalProps) {
	useEffect(() => {
		if (!closeOnEscape) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key !== "Escape" || e.isComposing) return;
			e.preventDefault();
			onClose();
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [closeOnEscape, onClose]);

	return (
		<BodyPortal>
			<Scrim dim onClick={onClose} />
			<div
				data-slot="modal"
				role="dialog"
				aria-modal="true"
				className={cn(
					"fixed left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[16px] border border-fr-border bg-fr-surface shadow-[0_24px_80px_rgba(0,0,0,0.6)] animate-[fr-pop-in_0.14s_ease]",
					placement === "upper" ? "top-[42%]" : "top-1/2",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</BodyPortal>
	);
}

export interface PopoverPanelProps extends React.ComponentProps<"div"> {
	readonly width?: number;
	/** Trigger rect to anchor against. When provided, position is computed from it. */
	readonly anchorRect?: DOMRect | null;
	readonly place?: Placement;
}

export function PopoverPanel({
	width = 240,
	anchorRect,
	place = "below",
	className,
	style,
	children,
	...props
}: PopoverPanelProps) {
	const positioned = anchorRect ? { ...popoverStyle(anchorRect, place, width), ...style } : { width, ...style };
	return (
		<BodyPortal>
			<div
				data-slot="popover-panel"
				className={cn(
					"fixed z-50 rounded-[12px] border border-fr-border bg-fr-surface p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.5)] animate-[fr-pop-in_0.12s_ease]",
					className,
				)}
				style={positioned}
				{...props}
			>
				{children}
			</div>
		</BodyPortal>
	);
}

export function PopoverHeading({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="popover-heading" className={cn("px-2.5 pt-2 pb-[5px] fr-eyebrow", className)} {...props} />;
}

export function PopoverDivider({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div data-slot="popover-divider" className={cn("mx-2 my-[5px] h-px bg-fr-border-soft", className)} {...props} />
	);
}

export interface PopoverRowProps extends React.ComponentProps<"div"> {
	readonly icon?: React.ReactNode;
	readonly label: string;
	readonly value?: string;
	readonly valueAccent?: boolean;
	readonly kbd?: string;
	readonly chevron?: boolean;
	readonly selected?: boolean;
}

export function PopoverRow({
	icon,
	label,
	value,
	valueAccent,
	kbd,
	chevron,
	selected,
	className,
	onClick,
	...props
}: PopoverRowProps) {
	return (
		<div
			data-slot="popover-row"
			className={cn(
				"flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-fr-base text-fr-text hover:bg-fr-surface-2",
				className,
			)}
			onClick={onClick}
			{...props}
		>
			{icon && <span className="flex size-[15px] shrink-0 text-fr-text-2">{icon}</span>}
			<span>{label}</span>
			{value != null && (
				<span
					className={cn(
						"ml-auto flex items-center gap-[5px] font-secondary text-fr-xs text-fr-text-3",
						valueAccent && "text-fr-accent",
					)}
				>
					{value}
					{chevron && (
						<svg
							width="13"
							height="13"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="m9 6 6 6-6 6" />
						</svg>
					)}
				</span>
			)}
			{kbd && <span className="ml-auto font-secondary text-fr-2xs text-fr-text-3">{kbd}</span>}
			{chevron && value == null && (
				<span className="ml-auto text-fr-text-3">
					<svg
						width="13"
						height="13"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="m9 6 6 6-6 6" />
					</svg>
				</span>
			)}
			{selected && (
				<span className="ml-auto text-fr-accent">
					<svg
						width="13"
						height="13"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M20 6 9 17l-5-5" />
					</svg>
				</span>
			)}
		</div>
	);
}
