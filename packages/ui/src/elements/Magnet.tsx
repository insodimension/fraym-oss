import { type ReactNode, useEffect, useRef } from "react";

import { useHoverCapable, useReducedMotion } from "./MediaQueries";
import { classNames } from "./utils";

export interface MagnetProps { children: ReactNode; className?: string; innerClassName?: string; padding?: number; disabled?: boolean; magnetStrength?: number; damping?: number }

export function Magnet({ children, className, innerClassName, padding = 100, disabled = false, magnetStrength = 2, damping = 0.2 }: MagnetProps) {
  const root = useRef<HTMLDivElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);
  const position = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const frame = useRef(0);
  const hoverCapable = useHoverCapable();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (disabled || !hoverCapable || reducedMotion) {
      cancelAnimationFrame(frame.current); frame.current = 0; position.current = { x: 0, y: 0, targetX: 0, targetY: 0 };
      if (inner.current) inner.current.style.transform = "translate3d(0, 0, 0)";
      return;
    }
    const animate = () => {
      frame.current = 0;
      const node = inner.current;
      if (!node) return;
      const current = position.current;
      current.x += (current.targetX - current.x) * damping;
      current.y += (current.targetY - current.y) * damping;
      if (Math.abs(current.targetX - current.x) < 0.1) current.x = current.targetX;
      if (Math.abs(current.targetY - current.y) < 0.1) current.y = current.targetY;
      node.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
      if (current.x !== current.targetX || current.y !== current.targetY) frame.current = requestAnimationFrame(animate);
    };
    const move = (event: MouseEvent) => {
      const node = root.current;
      if (!node) return;
      const bounds = node.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      const active = Math.abs(event.clientX - centerX) < bounds.width / 2 + padding && Math.abs(event.clientY - centerY) < bounds.height / 2 + padding;
      position.current.targetX = active ? (event.clientX - centerX) / Math.max(0.1, magnetStrength) : 0;
      position.current.targetY = active ? (event.clientY - centerY) / Math.max(0.1, magnetStrength) : 0;
      if (!frame.current) frame.current = requestAnimationFrame(animate);
    };
    window.addEventListener("mousemove", move);
    return () => { window.removeEventListener("mousemove", move); cancelAnimationFrame(frame.current); frame.current = 0; };
  }, [damping, disabled, hoverCapable, magnetStrength, padding, reducedMotion]);

  return <div className={classNames("fraym-magnet", className)} data-slot="magnet" ref={root}><div className={innerClassName} ref={inner} style={{ transform: "translate3d(0, 0, 0)", willChange: "transform" }}>{children}</div></div>;
}
