import { useEffect, useRef } from "react";

import { useReducedMotion } from "./MediaQueries";
import { classNames } from "./utils";

export interface NoiseOverlayProps { className?: string; patternSize?: number; patternRefreshInterval?: number; patternAlpha?: number }

export function NoiseOverlay({ className, patternSize = 1024, patternRefreshInterval = 2, patternAlpha = 15 }: NoiseOverlayProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const surface = canvas.current;
    const context = surface?.getContext("2d", { alpha: true });
    if (!surface || !context) return;
    const side = Math.max(1, Math.round(patternSize));
    surface.width = side; surface.height = side;
    const paint = () => {
      const image = context.createImageData(side, side);
      for (let offset = 0; offset < image.data.length; offset += 4) {
        const shade = Math.floor(Math.random() * 256);
        image.data[offset] = shade; image.data[offset + 1] = shade; image.data[offset + 2] = shade; image.data[offset + 3] = patternAlpha;
      }
      context.putImageData(image, 0, 0);
    };
    if (reducedMotion) { paint(); return; }
    let count = 0; let frame = 0; const interval = Math.max(1, Math.round(patternRefreshInterval));
    const animate = () => { if (count % interval === 0) paint(); count += 1; frame = requestAnimationFrame(animate); };
    animate(); return () => cancelAnimationFrame(frame);
  }, [patternAlpha, patternRefreshInterval, patternSize, reducedMotion]);
  return <canvas aria-hidden="true" className={classNames("fraym-noise-overlay", className)} data-slot="noise-overlay" ref={canvas} />;
}
