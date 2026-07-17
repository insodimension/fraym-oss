import { type CSSProperties, type ReactNode, useMemo } from "react";

import { classNames } from "./utils";

export type GradualBlurPosition = "top" | "bottom" | "left" | "right";
export type GradualBlurCurve = "linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out";
export type GradualBlurTarget = "parent" | "page";
export interface GradualBlurProps { className?: string; position?: GradualBlurPosition; strength?: number; height?: string; divCount?: number; exponential?: boolean; curve?: GradualBlurCurve; opacity?: number; target?: GradualBlurTarget; zIndex?: number; style?: CSSProperties }

const curves: Record<GradualBlurCurve, (value: number) => number> = {
  linear: (value) => value,
  bezier: (value) => value * value * (3 - 2 * value),
  "ease-in": (value) => value * value,
  "ease-out": (value) => 1 - (1 - value) ** 2,
  "ease-in-out": (value) => value < 0.5 ? 2 * value * value : 1 - (-2 * value + 2) ** 2 / 2,
};
const directions: Record<GradualBlurPosition, string> = { top: "to top", bottom: "to bottom", left: "to left", right: "to right" };

function edge(position: GradualBlurPosition, extent: string): CSSProperties {
  return position === "top" || position === "bottom" ? { height: extent, width: "100%", left: 0, right: 0, [position]: 0 } : { width: extent, height: "100%", top: 0, bottom: 0, [position]: 0 };
}

export function GradualBlur({ className, position = "bottom", strength = 2, height = "6rem", divCount = 5, exponential = false, curve = "linear", opacity = 1, target = "parent", zIndex = 1000, style }: GradualBlurProps) {
  const layers = useMemo<ReactNode[]>(() => {
    const count = Math.max(1, Math.round(divCount));
    return Array.from({ length: count }, (_, index) => {
      const order = index + 1;
      const progress = curves[curve](order / count);
      const blur = exponential ? 2 ** (progress * 4) * 0.0625 * strength : 0.0625 * (progress * count + 1) * strength;
      const slice = 100 / count;
      const from = Math.max(0, slice * (order - 1));
      const solid = Math.min(100, slice * order);
      const until = Math.min(100, slice * (order + 2));
      const mask = `linear-gradient(${directions[position]}, transparent ${from}%, black ${solid}%, transparent ${until}%)`;
      return <span aria-hidden="true" className="fraym-gradual-blur__layer" key={order} style={{ backdropFilter: `blur(${blur.toFixed(3)}rem)`, WebkitBackdropFilter: `blur(${blur.toFixed(3)}rem)`, maskImage: mask, WebkitMaskImage: mask, opacity }} />;
    });
  }, [curve, divCount, exponential, opacity, position, strength]);
  return <div className={classNames("fraym-gradual-blur", className)} data-slot="gradual-blur" style={{ position: target === "page" ? "fixed" : "absolute", pointerEvents: "none", zIndex: target === "page" ? zIndex + 100 : zIndex, ...edge(position, height), ...style }}><div className="fraym-gradual-blur__stack">{layers}</div></div>;
}
