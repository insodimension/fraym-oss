import { useEffect, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

import { classNames } from "./utils";

export type Placement = "below" | "above" | "below-right" | "above-right";

export function popoverStyle(anchorRect: DOMRect | null | undefined, place: Placement = "below", width = 240): CSSProperties {
  if (!anchorRect || typeof window === "undefined") return { width };
  const gap = 8;
  const above = place.includes("above") || (window.innerHeight - anchorRect.bottom < 360 && anchorRect.top > window.innerHeight - anchorRect.bottom);
  const left = place.includes("right") ? anchorRect.right - width : anchorRect.left;
  return { width, left: Math.max(8, Math.min(left, window.innerWidth - width - 8)), ...(above ? { bottom: window.innerHeight - anchorRect.top + gap, maxHeight: Math.max(160, anchorRect.top - gap) } : { top: anchorRect.bottom + gap, maxHeight: Math.max(160, window.innerHeight - anchorRect.bottom - gap) }) };
}

export interface ScrimProps extends HTMLAttributes<HTMLDivElement> { dim?: boolean }
export function Scrim({ dim = false, className, ...props }: ScrimProps) { return <div {...props} className={classNames("fraym-scrim", dim && "fraym-scrim--dim", className)} data-slot="scrim" />; }

export interface ModalProps extends HTMLAttributes<HTMLDivElement> { onClose: () => void; placement?: "center" | "upper"; closeOnEscape?: boolean }
export function Modal({ onClose, placement = "center", closeOnEscape = true, className, children, ...props }: ModalProps) {
  useEffect(() => { if (!closeOnEscape) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.isComposing) onClose(); }; document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [closeOnEscape, onClose]);
  return <><Scrim dim onClick={onClose} /><div {...props} aria-modal="true" className={classNames("fraym-modal", `fraym-modal--${placement}`, className)} data-slot="modal" role="dialog">{children}</div></>;
}

export interface PopoverPanelProps extends HTMLAttributes<HTMLDivElement> { width?: number; anchorRect?: DOMRect | null; place?: Placement }
export function PopoverPanel({ width = 240, anchorRect, place = "below", className, style, ...props }: PopoverPanelProps) { return <div {...props} className={classNames("fraym-popover", className)} data-slot="popover-panel" style={{ ...popoverStyle(anchorRect, place, width), ...style }} />; }
export function PopoverHeading({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div {...props} className={classNames("fraym-popover__heading", className)} data-slot="popover-heading" />; }
export function PopoverDivider({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div {...props} className={classNames("fraym-popover__divider", className)} data-slot="popover-divider" />; }

export interface PopoverRowProps extends HTMLAttributes<HTMLDivElement> { icon?: ReactNode; label: string; value?: string; valueAccent?: boolean; kbd?: string; chevron?: boolean; selected?: boolean }
export function PopoverRow({ icon, label, value, valueAccent, kbd, chevron, selected, className, ...props }: PopoverRowProps) {
  return <div {...props} className={classNames("fraym-popover__row", className)} data-slot="popover-row" role={props.onClick ? "button" : undefined} tabIndex={props.onClick ? 0 : undefined}>{icon ? <span className="fraym-popover__icon">{icon}</span> : null}<span>{label}</span>{value ? <span className={classNames("fraym-popover__value", valueAccent && "is-accent")}>{value}</span> : null}{kbd ? <span className="fraym-popover__kbd">{kbd}</span> : null}{chevron ? <span aria-hidden="true" className="fraym-popover__tail">›</span> : null}{selected ? <span aria-hidden="true" className="fraym-popover__tail is-selected">✓</span> : null}</div>;
}
