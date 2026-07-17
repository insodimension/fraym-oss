import { useRef } from "react";
import type { NebulaVariantName } from "./engine";
import type { AethrParams, AethrState } from "./states";
import { useAethr } from "./use-aethr";
export interface AethrProps {
  state?: AethrState;
  variant?: NebulaVariantName;
  growth?: number;
  recede?: number;
  fpsCap?: number;
  renderScale?: number;
  maxPixelRatio?: number;
  params?: Partial<AethrParams>;
  className?: string;
}
export function Aethr({
  state = "idle",
  variant,
  growth = 1,
  recede = 0,
  fpsCap,
  renderScale,
  maxPixelRatio,
  params,
  className,
}: AethrProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useAethr(ref, {
    state,
    growth,
    recede,
    ...(variant ? { variant } : {}),
    ...(fpsCap ? { fpsCap } : {}),
    ...(renderScale ? { renderScale } : {}),
    ...(maxPixelRatio ? { maxPixelRatio } : {}),
    ...(params ? { params } : {}),
  });
  return (
    <canvas
      aria-hidden="true"
      className={className}
      data-slot="aethr"
      ref={ref}
    />
  );
}
