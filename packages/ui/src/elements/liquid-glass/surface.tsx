import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef } from "react";
import { classNames } from "../utils";
import { useLiquidGlassField } from "./context";
import { LiquidGlassRenderer } from "./renderer";
import { type LiquidGlassSettings, type LiquidGlassVariant, resolveLiquidGlassSettings } from "./settings";

const padding = 14;
export interface LiquidGlassSurfaceProps { readonly variant?: LiquidGlassVariant; readonly settings?: Partial<LiquidGlassSettings>; readonly radius?: number; readonly className?: string; readonly style?: CSSProperties; readonly children?: ReactNode }
export function LiquidGlassSurface({ variant = "frosted", settings, radius = 16, className, style, children }: LiquidGlassSurfaceProps) {
  const field = useLiquidGlassField(); const rootRef = useRef<HTMLDivElement | null>(null); const canvasRef = useRef<HTMLCanvasElement | null>(null); const rendererRef = useRef<LiquidGlassRenderer | null>(null);
  const fieldSource = field?.source;
  const fieldAnimating = field?.animating ?? false;
  const settingsKey = settings ? JSON.stringify(settings) : "";
  const merged = useMemo(() => resolveLiquidGlassSettings(variant, { radius, ...settings }), [variant, radius, settingsKey]);
  useEffect(() => {
    const root = rootRef.current; const canvas = canvasRef.current; if (!root || !canvas || !fieldSource) return;
    let renderer: LiquidGlassRenderer; try { renderer = new LiquidGlassRenderer(canvas, fieldSource, merged); } catch { return; }
    rendererRef.current = renderer;
    const resize = () => { const width = root.clientWidth; const height = root.clientHeight; if (!width || !height) return; renderer.resize(width + padding * 2, height + padding * 2); renderer.setSettings({ ...merged, lensWidth: width, lensHeight: height, radius: Math.min(merged.radius, height / 2) }); renderer.setGeometry(width / 2 + padding, height / 2 + padding, 0, false); };
    const observer = new ResizeObserver(resize); observer.observe(root); resize();
    return () => { observer.disconnect(); renderer.dispose(); rendererRef.current = null; };
  }, [fieldSource, merged]);
  useEffect(() => rendererRef.current?.setAnimating(fieldAnimating), [fieldAnimating]);
  return <div className={classNames("fraym-liquid-glass__surface", className)} data-slot="liquid-glass-surface" ref={rootRef} style={{ borderRadius: radius, ...style }}>{field ? <canvas aria-hidden="true" className="fraym-liquid-glass__lens" ref={canvasRef} style={{ left: -padding, top: -padding }} /> : null}{children}</div>;
}
