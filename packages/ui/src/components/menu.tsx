import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { cn } from "../lib/cn";

// Menubar + dropdown menu. A horizontal strip of triggers, each opening an
// anchored dropdown of items. One menu open at a time; outside-pointerdown and
// Escape close. Defaults are pixel-matched to the desktop titlebar chrome
// (transparent triggers on a rail, fr-xs text, 214px popover) so it can replace
// the hand-rolled DesktopMenu without a visual change.

interface MenuBarContextValue {
	readonly openId: string | null;
	readonly setOpenId: (id: string | null) => void;
}

const MenuBarContext = createContext<MenuBarContextValue | null>(null);

const triggerClass =
	"inline-flex h-full items-center justify-center border-0 bg-transparent px-[9px] text-fr-xs leading-none text-fr-text-2 transition-colors duration-[120ms] hover:bg-[color-mix(in_srgb,var(--fr-surface)_62%,transparent)] hover:text-fr-text aria-expanded:bg-[color-mix(in_srgb,var(--fr-surface)_62%,transparent)] aria-expanded:text-fr-text";

const panelClass =
	"absolute left-0 top-full z-[80] min-w-[214px] rounded-[8px] border border-fr-border bg-fr-surface p-1.5 shadow-[0_18px_46px_rgba(0,0,0,0.38)]";

const itemClass =
	"flex w-full items-center justify-start gap-2 rounded-[6px] border-0 bg-transparent px-[9px] py-[7px] text-left font-primary text-fr-xs text-fr-text-2 transition-colors duration-[120ms] hover:bg-fr-surface-2 hover:text-fr-text disabled:pointer-events-none disabled:opacity-50";

export interface MenuBarProps extends React.ComponentProps<"div"> {}

/** Coordinates a row of {@link Menu}s so only one dropdown is open at a time and
 *  closes the open one on outside pointerdown or Escape. */
export function MenuBar({ className, children, ...props }: MenuBarProps) {
	const [openId, setOpenId] = useState<string | null>(null);
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!openId) return;
		const onPointerDown = (event: PointerEvent) => {
			if (!ref.current?.contains(event.target as Node)) setOpenId(null);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpenId(null);
		};
		window.addEventListener("pointerdown", onPointerDown, true);
		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("pointerdown", onPointerDown, true);
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [openId]);
	return (
		<MenuBarContext.Provider value={{ openId, setOpenId }}>
			<div ref={ref} data-slot="menubar" role="menubar" className={cn("flex items-center", className)} {...props}>
				{children}
			</div>
		</MenuBarContext.Provider>
	);
}

export interface MenuProps {
	/** Stable id for open-state coordination; auto-generated when omitted. */
	readonly id?: string;
	readonly label: React.ReactNode;
	readonly children: React.ReactNode;
	readonly triggerClassName?: string;
	readonly panelClassName?: string;
	/** Extra props spread onto the trigger button (e.g. onDoubleClick guards). */
	readonly triggerProps?: React.ComponentProps<"button">;
}

/** A single menubar entry: a trigger button plus its anchored dropdown panel.
 *  Must render inside a {@link MenuBar}. */
export function Menu({ id: idProp, label, children, triggerClassName, panelClassName, triggerProps }: MenuProps) {
	const ctx = useContext(MenuBarContext);
	const autoId = useId();
	const id = idProp ?? autoId;
	const open = ctx?.openId === id;
	return (
		<div data-slot="menu" className="relative h-full">
			<button
				type="button"
				role="menuitem"
				aria-haspopup="menu"
				aria-expanded={open}
				data-slot="menu-trigger"
				className={cn(triggerClass, triggerClassName)}
				onClick={() => ctx?.setOpenId(open ? null : id)}
				{...triggerProps}
			>
				{label}
			</button>
			{open && (
				<div role="menu" data-slot="menu-panel" className={cn(panelClass, panelClassName)}>
					{children}
				</div>
			)}
		</div>
	);
}

export interface MenuItemProps extends React.ComponentProps<"button"> {
	readonly icon?: React.ReactNode;
	/** Close the parent menu after the click handler runs (default true). */
	readonly closeOnSelect?: boolean;
}

/** A row inside a {@link Menu} dropdown. Closes the menu on select by default. */
export function MenuItem({ icon, closeOnSelect = true, className, onClick, children, ...props }: MenuItemProps) {
	const ctx = useContext(MenuBarContext);
	return (
		<button
			type="button"
			role="menuitem"
			data-slot="menu-item"
			className={cn(itemClass, className)}
			onClick={event => {
				onClick?.(event);
				if (closeOnSelect) ctx?.setOpenId(null);
			}}
			{...props}
		>
			{icon && <span className="flex size-[15px] shrink-0 items-center text-fr-text-2">{icon}</span>}
			{children}
		</button>
	);
}
