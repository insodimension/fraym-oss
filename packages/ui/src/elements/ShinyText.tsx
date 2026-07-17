import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

import { useReducedMotion } from "./MediaQueries";
import { classNames } from "./utils";

export interface ShinyTextProps { children: ReactNode; className?: string; disabled?: boolean; speed?: number; color?: string; shineColor?: string; spread?: number; direction?: "left" | "right" }

export function ShinyText({ children, className, disabled = false, speed = 5, color = "currentColor", shineColor = "color-mix(in srgb, currentColor, #ffffff 70%)", spread = 120, direction = "left" }: ShinyTextProps) {
  const text = useRef<HTMLSpanElement | null>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const element = text.current;
    if (!element || disabled || reducedMotion) return;
    const positions = direction === "left" ? ["150% 50%", "-50% 50%"] : ["-50% 50%", "150% 50%"];
    const animation = element.animate([{ backgroundPosition: positions[0] }, { backgroundPosition: positions[1] }], { duration: Math.max(0.1, speed) * 1000, iterations: Number.POSITIVE_INFINITY, easing: "linear" });
    return () => animation.cancel();
  }, [direction, disabled, reducedMotion, speed]);
  const style: CSSProperties = { backgroundImage: `linear-gradient(${spread}deg, ${color} 0% 35%, ${shineColor} 50%, ${color} 65% 100%)`, backgroundPosition: "150% 50%", backgroundSize: "200% auto" };
  return <span className={classNames("fraym-shiny-text", className)} data-slot="shiny-text" ref={text} style={style}>{children}</span>;
}
