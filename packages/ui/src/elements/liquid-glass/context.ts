import { createContext, useContext } from "react";
import type { LiquidGlassFieldSource } from "./renderer";

export interface LiquidGlassFieldValue { readonly source: LiquidGlassFieldSource; readonly animating: boolean }
export const LiquidGlassFieldContext = createContext<LiquidGlassFieldValue | null>(null);
export function useLiquidGlassField() { return useContext(LiquidGlassFieldContext); }
