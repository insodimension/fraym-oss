import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

import { useReducedMotion } from "./MediaQueries";
import { classNames } from "./utils";

export interface GradientTextProps { children: ReactNode; className?: string; colors?: readonly string[]; speed?: number; showBorder?: boolean; disabled?: boolean }
const defaultColors = ["var(--fraym-color-accent)", "var(--fraym-color-iris)", "var(--fraym-color-info)"] as const;

export function GradientText({ children, className, colors = defaultColors, speed = 8, showBorder = false, disabled = false }: GradientTextProps) {
  const text = useRef<HTMLSpanElement | null>(null);
  const rim = useRef<HTMLSpanElement | null>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (disabled || reducedMotion) return;
    const animations = [text.current, rim.current].filter((element): element is HTMLSpanElement => element !== null).map((element) => element.animate([{ backgroundPosition: "0% 50%" }, { backgroundPosition: "100% 50%" }], { duration: Math.max(0.1, speed) * 1000, iterations: Number.POSITIVE_INFINITY, direction: "alternate", easing: "ease-in-out" }));
    return () => animations.forEach((animation) => animation.cancel());
  }, [disabled, reducedMotion, showBorder, speed]);
  const stops = colors.length ? [...colors, colors[0]].join(", ") : "currentColor, currentColor";
  const gradient: CSSProperties = { backgroundImage: `linear-gradient(to right, ${stops})`, backgroundPosition: "0% 50%", backgroundSize: "300% 100%" };
  return <span className={classNames("fraym-gradient-text", showBorder && "fraym-gradient-text--bordered", className)} data-slot="gradient-text">{showBorder ? <span aria-hidden="true" className="fraym-gradient-text__rim" ref={rim} style={gradient}><span /></span> : null}<span className="fraym-gradient-text__content" ref={text} style={gradient}>{children}</span></span>;
}
