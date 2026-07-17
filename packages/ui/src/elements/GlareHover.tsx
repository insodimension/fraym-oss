import { type CSSProperties, type ReactNode, useState } from "react";

import { classNames } from "./utils";

export interface GlareHoverProps { children: ReactNode; className?: string; glareColor?: string; glareOpacity?: number; glareAngle?: number; glareSize?: number; transitionDuration?: number; playOnce?: boolean; borderRadius?: number }

export function GlareHover({ children, className, glareColor = "color-mix(in srgb, var(--fraym-color-text) 60%, #ffffff)", glareOpacity = 0.5, glareAngle = -45, glareSize = 250, transitionDuration = 650, playOnce = false, borderRadius = 16 }: GlareHoverProps) {
  const [hovered, setHovered] = useState(false);
  const band = `color-mix(in srgb, ${glareColor} ${Math.round(Math.max(0, Math.min(1, glareOpacity)) * 100)}%, transparent)`;
  const style: CSSProperties = { backgroundImage: `linear-gradient(${glareAngle}deg, transparent 60%, ${band} 70%, transparent 80% 100%)`, backgroundPosition: hovered ? "100% 100%" : "-100% -100%", backgroundRepeat: "no-repeat", backgroundSize: `${glareSize}% ${glareSize}%`, transition: playOnce && !hovered ? "none" : `background-position ${transitionDuration}ms ease` };
  return <div className={classNames("fraym-glare-hover", className)} data-slot="glare-hover" style={{ borderRadius }} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>{children}<span aria-hidden="true" className="fraym-glare-hover__layer" style={style} /></div>;
}
