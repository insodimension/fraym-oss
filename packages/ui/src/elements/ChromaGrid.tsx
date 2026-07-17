import { type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useRef, useState } from "react";

import { useHoverCapable } from "./MediaQueries";
import { classNames } from "./utils";

export interface ChromaGridProps {
  children: ReactNode;
  className?: string;
  radius?: number;
  damping?: number;
  grayscale?: number;
  brightness?: number;
}

const clearCenter = "radial-gradient(circle var(--chroma-radius) at var(--chroma-x) var(--chroma-y), transparent 0 15%, rgb(0 0 0 / .1) 30%, rgb(0 0 0 / .35) 60%, white 100%)";
const solidCenter = "radial-gradient(circle var(--chroma-radius) at var(--chroma-x) var(--chroma-y), white 0 15%, rgb(255 255 255 / .9) 30%, rgb(255 255 255 / .65) 60%, transparent 100%)";

export function ChromaGrid({ children, className, radius = 320, damping = 0.14, grayscale = 0.9, brightness = 0.82 }: ChromaGridProps) {
  const root = useRef<HTMLDivElement | null>(null);
  const point = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, initialized: false });
  const frame = useRef(0);
  const hoverCapable = useHoverCapable();
  const [inside, setInside] = useState(false);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const animate = () => {
    frame.current = 0;
    const element = root.current;
    if (!element) return;
    const current = point.current;
    current.x += (current.targetX - current.x) * damping;
    current.y += (current.targetY - current.y) * damping;
    element.style.setProperty("--chroma-x", `${current.x}px`);
    element.style.setProperty("--chroma-y", `${current.y}px`);
    if (Math.abs(current.targetX - current.x) > 0.5 || Math.abs(current.targetY - current.y) > 0.5) frame.current = requestAnimationFrame(animate);
  };

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = root.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const current = point.current;
    current.targetX = event.clientX - bounds.left;
    current.targetY = event.clientY - bounds.top;
    if (!current.initialized) { current.x = current.targetX; current.y = current.targetY; current.initialized = true; }
    setInside(true);
    if (!frame.current) frame.current = requestAnimationFrame(animate);
  };

  const filter = `grayscale(${grayscale}) brightness(${brightness})`;
  const variables = { "--chroma-radius": `${radius}px`, "--chroma-x": "50%", "--chroma-y": "50%" } as CSSProperties;
  const layer = { backdropFilter: filter, WebkitBackdropFilter: filter };
  return (
    <div className={classNames("fraym-chroma-grid", className)} data-slot="chroma-grid" ref={root} style={variables} onPointerLeave={hoverCapable ? () => setInside(false) : undefined} onPointerMove={hoverCapable ? move : undefined}>
      {children}
      {hoverCapable ? <><span aria-hidden="true" className="fraym-chroma-grid__layer" style={{ ...layer, maskImage: clearCenter, WebkitMaskImage: clearCenter }} /><span aria-hidden="true" className="fraym-chroma-grid__layer fraym-chroma-grid__rest" style={{ ...layer, maskImage: solidCenter, WebkitMaskImage: solidCenter, opacity: inside ? 0 : 1 }} /></> : null}
    </div>
  );
}
