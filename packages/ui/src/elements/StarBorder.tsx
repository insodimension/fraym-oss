import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

import { useReducedMotion } from "./MediaQueries";
import { classNames } from "./utils";

export interface StarBorderProps { children: ReactNode; className?: string; color?: string; speed?: number; thickness?: number; borderRadius?: number }

export function StarBorder({ children, className, color = "var(--fraym-color-accent)", speed = 6, thickness = 1, borderRadius = 20 }: StarBorderProps) {
  const upper = useRef<HTMLSpanElement | null>(null);
  const lower = useRef<HTMLSpanElement | null>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) return;
    const options: KeyframeAnimationOptions = { duration: Math.max(0.1, speed) * 1000, iterations: Number.POSITIVE_INFINITY, direction: "alternate", easing: "linear" };
    const animations = [lower.current?.animate([{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(-100%)", opacity: 0 }], options), upper.current?.animate([{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(100%)", opacity: 0 }], options)].filter((animation): animation is Animation => animation !== undefined);
    return () => animations.forEach((animation) => animation.cancel());
  }, [reducedMotion, speed]);
  const bar: CSSProperties = { background: `radial-gradient(circle, ${color}, transparent 10%)` };
  return <div className={classNames("fraym-star-border", className)} data-slot="star-border" style={{ borderRadius, padding: `${thickness}px 0` }}><span aria-hidden="true" className="fraym-star-border__star fraym-star-border__star--lower" ref={lower} style={bar} /><span aria-hidden="true" className="fraym-star-border__star fraym-star-border__star--upper" ref={upper} style={bar} /><div className="fraym-star-border__content" style={{ borderRadius }}>{children}</div></div>;
}
