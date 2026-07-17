import type { ComponentProps } from "react";
import { classNames } from "../utils";
import type { LiquidGlassSettings, LiquidGlassVariant } from "./settings";
import { LiquidGlassSurface } from "./surface";

export interface LiquidGlassButtonProps extends ComponentProps<"button"> { readonly variant?: LiquidGlassVariant; readonly settings?: Partial<LiquidGlassSettings>; readonly radius?: number }
export function LiquidGlassButton({ variant = "dome", settings, radius = 12, className, children, style, ...props }: LiquidGlassButtonProps) {
  return <button className={classNames("fraym-liquid-glass__button", className)} data-slot="liquid-glass-button" style={{ borderRadius: radius, ...style }} {...props}><LiquidGlassSurface className="fraym-liquid-glass__button-lens" radius={radius} variant={variant} {...(settings ? { settings } : {})} /><span>{children}</span></button>;
}
