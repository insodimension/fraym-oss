import type { HostUiRequest, HostUiResponse } from "@fraym-ai/driver";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { DEFAULT_SURFACE_RENDERERS, renderFallback } from "./default-surface-renderers";

export type SurfaceRenderInput = { readonly channel: "hostUi"; readonly request: HostUiRequest } | { readonly channel: "message"; readonly customType: string; readonly payload?: unknown; readonly text?: string };
export interface SurfaceRenderContext { readonly respond: (response: HostUiResponse) => void }
export type SurfaceRenderer = (input: SurfaceRenderInput, context: SurfaceRenderContext) => ReactNode;
export type SurfacePlacement = "modal" | "docked";
export interface SurfaceRegistration { readonly render: SurfaceRenderer; readonly placement?: SurfacePlacement }
export type SurfaceRendererEntry = SurfaceRenderer | SurfaceRegistration;
export type SurfaceRendererMap = Readonly<Record<string, SurfaceRendererEntry>>;
export interface ResolvedSurfaceRegistration { readonly render: SurfaceRenderer; readonly placement: SurfacePlacement }
export const SURFACE_FALLBACK_KEY = "*";
export function surfaceKey(input: SurfaceRenderInput) { return input.channel === "hostUi" ? `hostUi:${input.request.kind}` : `msg:${input.customType}`; }
const empty: SurfaceRendererMap = Object.freeze({});
const SurfaceContext = createContext<SurfaceRendererMap | null>(null);
export interface SurfaceRendererProviderProps { readonly renderers: SurfaceRendererMap; readonly replace?: boolean; readonly children: ReactNode }
export function SurfaceRendererProvider({ renderers, replace = false, children }: SurfaceRendererProviderProps) { const parent = useContext(SurfaceContext); const value = useMemo<SurfaceRendererMap>(() => replace || !parent ? renderers : { ...parent, ...renderers }, [parent, renderers, replace]); return <SurfaceContext.Provider value={value}>{children}</SurfaceContext.Provider>; }
export function useSurfaceRendererMap() { return useContext(SurfaceContext) ?? empty; }
function normalized(entry: SurfaceRendererEntry): ResolvedSurfaceRegistration { return typeof entry === "function" ? { render: entry, placement: "modal" } : { render: entry.render, placement: entry.placement ?? "modal" }; }
const fallback: ResolvedSurfaceRegistration = { render: renderFallback, placement: "modal" };
export function resolveSurfaceRegistration(map: SurfaceRendererMap, key: string): ResolvedSurfaceRegistration { const entry = map[key] ?? map[SURFACE_FALLBACK_KEY] ?? DEFAULT_SURFACE_RENDERERS[key]; return entry ? normalized(entry) : fallback; }
