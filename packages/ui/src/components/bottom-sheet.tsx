import { useCallback, useEffect, useRef, useState } from "react";
import { Scrim } from "../elements/popover";
import { BodyPortal } from "../lib/body-portal";
import { cn } from "../lib/cn";
import { prefersReducedMotion } from "../lib/motion";

// BottomSheet — the phone-width stand-in for anchored popovers/menus.
//
// Desktop pickers (ModelPicker's SelectorMenu, PermissionMenu) anchor to their
// trigger and drill sideways into hover flyouts; on a phone that produces tiny
// rows and unreachable targets. At ≤760px the same content renders inside this
// sheet instead: full-width, docked to the bottom edge (thumb zone), one
// decision surface at a time, drag-down or scrim-tap to dismiss.

/** The shell-wide phone breakpoint — matches the rail-drawer/composer rules in theme.css. */
export const PHONE_WIDTH_QUERY = "(max-width: 760px)";

/** Live phone-width boolean. Initial state is matchMedia-aware so a picker
 * opened on a phone never flashes its desktop popover for one frame. */
export function useIsPhoneWidth(): boolean {
	const [matches, setMatches] = useState(
		() => typeof window !== "undefined" && window.matchMedia(PHONE_WIDTH_QUERY).matches,
	);
	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) return;
		const mql = window.matchMedia(PHONE_WIDTH_QUERY);
		const onChange = () => setMatches(mql.matches);
		onChange();
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, []);
	return matches;
}

/** Dismiss when the sheet is dragged down more than this fraction of its height... */
const DISMISS_FRACTION = 0.33;
/** ...or flicked faster than this (px/ms), whichever comes first. */
const DISMISS_VELOCITY = 0.55;
/** Exit animation duration (ms) — must match `.fr-sheet-leave` in theme.css. */
const EXIT_MS = 180;

export interface BottomSheetProps {
	readonly onClose: () => void;
	/** Optional eyebrow title row rendered under the grab handle. */
	readonly title?: React.ReactNode;
	readonly children: React.ReactNode;
	/** Fixed footer pinned below the scrollable body (e.g. the effort picker). */
	readonly footer?: React.ReactNode;
	readonly className?: string;
	/** Accessible name when `title` is not a plain string. */
	readonly ariaLabel?: string;
}

export function BottomSheet({ onClose, title, children, footer, className, ariaLabel }: BottomSheetProps) {
	const panelRef = useRef<HTMLDivElement | null>(null);
	const [leaving, setLeaving] = useState(false);
	const drag = useRef<{ startY: number; startT: number; lastY: number; lastT: number; active: boolean }>({
		startY: 0,
		startT: 0,
		lastY: 0,
		lastT: 0,
		active: false,
	});

	// Animated dismissal: slide out, then unmount. Reduced motion closes instantly.
	const close = useCallback(() => {
		if (prefersReducedMotion()) {
			onClose();
			return;
		}
		setLeaving(true);
		window.setTimeout(onClose, EXIT_MS);
	}, [onClose]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key !== "Escape" || e.isComposing) return;
			e.preventDefault();
			close();
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [close]);

	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		drag.current = { startY: e.clientY, startT: e.timeStamp, lastY: e.clientY, lastT: e.timeStamp, active: true };
		e.currentTarget.setPointerCapture(e.pointerId);
	};

	const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!drag.current.active || !panelRef.current) return;
		const dy = Math.max(0, e.clientY - drag.current.startY);
		drag.current.lastY = e.clientY;
		drag.current.lastT = e.timeStamp;
		panelRef.current.style.transform = `translateY(${dy}px)`;
		panelRef.current.style.transition = "none";
	};

	const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!drag.current.active || !panelRef.current) return;
		drag.current.active = false;
		const panel = panelRef.current;
		const dy = Math.max(0, e.clientY - drag.current.startY);
		const dt = Math.max(1, e.timeStamp - drag.current.startT);
		const velocity = dy / dt;
		if (dy > panel.offsetHeight * DISMISS_FRACTION || velocity > DISMISS_VELOCITY) {
			// Momentum handoff: keep sliding from the released position.
			panel.style.transition = `transform ${EXIT_MS}ms ease-in`;
			panel.style.transform = "translateY(100%)";
			window.setTimeout(onClose, EXIT_MS);
		} else {
			panel.style.transition = "transform 160ms ease-out";
			panel.style.transform = "";
		}
	};

	return (
		<BodyPortal>
			<Scrim dim onClick={close} className="z-40" />
			<div
				ref={panelRef}
				data-slot="bottom-sheet"
				role="dialog"
				aria-modal="true"
				aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
				className={cn(
					"fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-[16px] border-t border-x border-fr-border bg-fr-surface shadow-[0_-18px_60px_rgba(0,0,0,0.5)]",
					"pb-[max(10px,env(safe-area-inset-bottom))]",
					leaving ? "fr-sheet-leave" : "fr-sheet-enter",
					className,
				)}
			>
				{/* Grab region — handle + title both drag; body content scrolls freely. */}
				<div
					data-slot="sheet-grab"
					className="flex-none cursor-grab touch-none select-none active:cursor-grabbing"
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerEnd}
					onPointerCancel={onPointerEnd}
				>
					<div className="mx-auto mt-2.5 mb-1 h-1 w-9 rounded-full bg-fr-border" aria-hidden />
					{title != null && <div className="px-4 pt-1 pb-1.5 fr-eyebrow">{title}</div>}
				</div>
				<div data-slot="sheet-body" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pt-0.5">
					{children}
				</div>
				{footer != null && (
					<div data-slot="sheet-footer" className="flex-none border-t border-fr-border-soft px-2 pt-1.5">
						{footer}
					</div>
				)}
			</div>
		</BodyPortal>
	);
}
