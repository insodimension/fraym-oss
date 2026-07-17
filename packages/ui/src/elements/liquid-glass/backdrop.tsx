import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "../MediaQueries";
import { classNames } from "../utils";
import { LiquidGlassFieldContext, type LiquidGlassFieldValue } from "./context";
import { LiquidGlassField, type LiquidGlassIntensity, type LiquidGlassTone } from "./field";
import type { LiquidGlassFieldSource } from "./renderer";

export interface LiquidGlassBackdropProps {
  readonly tone?: LiquidGlassTone; readonly intensity?: LiquidGlassIntensity;
  readonly accent?: readonly [number, number, number]; readonly animating?: boolean;
  readonly contained?: boolean; readonly className?: string; readonly children?: ReactNode;
}

export function LiquidGlassBackdrop({ tone = "dark", intensity = "bright", accent, animating, contained = false, className, children }: LiquidGlassBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fieldRef = useRef<LiquidGlassField | null>(null);
  const [source, setSource] = useState<LiquidGlassFieldSource | null>(null);
  const reducedMotion = useReducedMotion();
  const drift = animating ?? !reducedMotion;
  const accentKey = accent?.join(",") ?? "";
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const field = new LiquidGlassField(canvas, { tone, intensity, ...(accent ? { accent } : {}) }); fieldRef.current = field;
    const resize = () => field.resize(canvas.clientWidth, canvas.clientHeight);
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    setSource({ canvas, backgroundEl: canvas });
    return () => { observer.disconnect(); field.destroy(); fieldRef.current = null; };
  }, []);
  useEffect(() => { fieldRef.current?.setOptions({ tone, intensity, ...(accent ? { accent } : {}) }); }, [tone, intensity, accentKey]);
  useEffect(() => { if (drift) fieldRef.current?.start(); else fieldRef.current?.stop(); }, [drift, source]);
  const value = useMemo<LiquidGlassFieldValue | null>(() => source ? { source, animating: drift } : null, [source, drift]);
  const canvas = <canvas aria-hidden="true" className={classNames("fraym-liquid-glass__backdrop", contained ? "is-contained" : "is-background", className)} data-slot="liquid-glass-backdrop" ref={canvasRef} style={{ backgroundColor: tone === "light" ? "#e7e7ea" : intensity === "deep" ? "#050507" : "#0a0a10" }} />;
  return <LiquidGlassFieldContext.Provider value={value}>{contained ? <div className="fraym-liquid-glass__stage" data-slot="liquid-glass-stage">{canvas}{children ? <div className="fraym-liquid-glass__stage-content">{children}</div> : null}</div> : <>{canvas}{children}</>}</LiquidGlassFieldContext.Provider>;
}
